import {
    HotDownloadAuth,
    HotDownloadOption,
    HotDownloadTicket,
    HotStatus,
    TypedDataSignerLike,
} from './types.js'
import {
    HotBillingDegradedError,
    HotDownloadError,
    HotFeeExceededError,
    HotNonceInFlightError,
    HotStreamLimitError,
} from './errors.js'

// Structural subset of a WHATWG ReadableStream body, enough to count the
// bytes actually received before an interruption (needed for Range resumes).
export interface BodyReaderLike {
    read(): Promise<{ done: boolean; value?: Uint8Array }>
}

export interface BodyStreamLike {
    getReader(): BodyReaderLike
}

export interface FetchResponseLike {
    ok: boolean
    status: number
    json(): Promise<any>
    text(): Promise<string>
    // Optional binary accessors (real fetch Responses provide both). The
    // download flow prefers the stream so it knows the exact byte offset
    // reached when a transfer is interrupted.
    arrayBuffer?(): Promise<ArrayBuffer>
    body?: BodyStreamLike | null
}

export type FetchLike = (
    input: string,
    init?: Record<string, unknown>
) => Promise<FetchResponseLike>

export interface WaitOptions {
    timeoutMs?: number
    pollIntervalMs?: number
}

const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms))

function trimRightSlash(u: string): string {
    return u.endsWith('/') ? u.slice(0, -1) : u
}

function normalizeStatus(s: unknown): HotStatus {
    if (s === 'cached' || s === 'prefetching' || s === 'not_cached') {
        return s
    }
    return 'unknown'
}

function aggregate(statuses: HotStatus[]): HotStatus {
    if (statuses.length === 0) return 'unknown'
    if (statuses.every((s) => s === 'cached')) return 'cached'
    if (statuses.some((s) => s === 'prefetching')) return 'prefetching'
    if (statuses.some((s) => s === 'not_cached')) return 'not_cached'
    return 'unknown'
}

async function safeText(resp: { text(): Promise<string> }): Promise<string> {
    try {
        return await resp.text()
    } catch {
        return ''
    }
}

// ─── Paid download protocol constants ────────────────────────────────────

// EIP-712 domain for HotDownloadAuth. MUST match the router byte-for-byte
// (0g-hot-storage-router internal/router/eip712.go) — drift breaks signature
// recovery silently.
const EIP712_DOMAIN_NAME = '0G Storage Scan'
const EIP712_DOMAIN_VERSION = '1'

const HOT_DOWNLOAD_AUTH_TYPES: Record<
    string,
    Array<{ name: string; type: string }>
> = {
    HotDownloadAuth: [
        { name: 'user', type: 'address' },
        { name: 'fileHashes', type: 'bytes32[]' },
        { name: 'nonce', type: 'uint256' },
    ],
}

const DEFAULT_DOWNLOAD_CONCURRENCY = 4
const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY_MS = 500

function concatBytes(parts: Uint8Array[]): Uint8Array {
    let total = 0
    for (const p of parts) total += p.length
    const out = new Uint8Array(total)
    let off = 0
    for (const p of parts) {
        out.set(p, off)
        off += p.length
    }
    return out
}

// Thrown internally when a 2xx body is interrupted mid-transfer; carries the
// bytes received so far so the caller can resume with a Range header.
class BodyInterruptedError extends Error {
    readonly received: Uint8Array
    constructor(received: Uint8Array, cause: unknown) {
        super(`body interrupted after ${received.length} bytes: ${cause}`)
        this.name = 'BodyInterruptedError'
        this.received = received
    }
}

// Read a 2xx response body to completion. Prefers the stream (byte-accurate
// interruption offsets); falls back to arrayBuffer(). Throws
// BodyInterruptedError on a mid-body failure.
async function readBody(resp: FetchResponseLike): Promise<Uint8Array> {
    const body = resp.body
    if (body != null && typeof body.getReader === 'function') {
        const reader = body.getReader()
        const chunks: Uint8Array[] = []
        for (;;) {
            let r: { done: boolean; value?: Uint8Array }
            try {
                r = await reader.read()
            } catch (err) {
                throw new BodyInterruptedError(concatBytes(chunks), err)
            }
            if (r.done) return concatBytes(chunks)
            if (r.value !== undefined) chunks.push(r.value)
        }
    }
    if (typeof resp.arrayBuffer === 'function') {
        try {
            return new Uint8Array(await resp.arrayBuffer())
        } catch (err) {
            // No stream — the byte offset reached is unknown; report zero new
            // bytes received (the fragment loop still switches to a fresh
            // auth, since bytes may have been delivered and billed).
            throw new BodyInterruptedError(new Uint8Array(0), err)
        }
    }
    throw new HotDownloadError(
        'download: response exposes neither a body stream nor arrayBuffer()'
    )
}

// Parse and strictly validate the router's POST /download response:
// { provider, node_url, auths: [{ file_hash, max_fee, nonce, signature }] }
// with one auth per requested fragment, in request order.
function parseDownloadTicket(
    data: unknown,
    expectedCount: number
): HotDownloadTicket {
    const d = data as {
        provider?: unknown
        node_url?: unknown
        auths?: unknown
    } | null
    if (
        d == null ||
        typeof d.provider !== 'string' ||
        typeof d.node_url !== 'string' ||
        !Array.isArray(d.auths)
    ) {
        throw new HotDownloadError(
            'download: malformed router response (expected provider, node_url, auths[])'
        )
    }
    if (d.auths.length !== expectedCount) {
        throw new HotDownloadError(
            `download: router returned ${d.auths.length} auths for ${expectedCount} fragments`
        )
    }
    const auths: HotDownloadAuth[] = d.auths.map((a: unknown, i: number) => {
        const auth = a as {
            file_hash?: unknown
            max_fee?: unknown
            nonce?: unknown
            signature?: unknown
        } | null
        if (
            auth == null ||
            typeof auth.file_hash !== 'string' ||
            typeof auth.max_fee !== 'string' ||
            typeof auth.nonce !== 'number' ||
            typeof auth.signature !== 'string'
        ) {
            throw new HotDownloadError(
                `download: malformed auth at index ${i} (expected file_hash, max_fee, nonce, signature)`
            )
        }
        return {
            fileHash: auth.file_hash,
            maxFee: auth.max_fee,
            nonce: auth.nonce,
            signature: auth.signature,
        }
    })
    return { provider: d.provider, nodeUrl: d.node_url, auths }
}

// Run fn over items with at most `limit` in flight; results keep item order.
async function mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
    const results = new Array<R>(items.length)
    let next = 0
    const workerCount = Math.max(1, Math.min(limit, items.length))
    const workers = Array.from({ length: workerCount }, async () => {
        for (;;) {
            const i = next++
            if (i >= items.length) return
            results[i] = await fn(items[i], i)
        }
    })
    await Promise.all(workers)
    return results
}

/**
 * Minimal client for the hot-storage router's public read/prefetch endpoints.
 * The base URL is supplied by the caller (e.g. a same-origin proxy), so the SDK
 * stays agnostic of hot-router topology. `fetch` is injectable for testing and
 * defaults to the global fetch (present in browsers and Node 18+).
 */
export class HotRouterClient {
    private readonly baseUrl: string
    private readonly fetchImpl: FetchLike

    constructor(baseUrl: string, fetchImpl?: FetchLike) {
        this.baseUrl = trimRightSlash(baseUrl)
        const globalFetch =
            typeof globalThis !== 'undefined' &&
            typeof (globalThis as { fetch?: unknown }).fetch === 'function'
                ? ((globalThis as unknown as { fetch: FetchLike }).fetch.bind(
                      globalThis
                  ) as FetchLike)
                : undefined
        const f = fetchImpl ?? globalFetch
        if (f === undefined) {
            throw new Error(
                'HotRouterClient requires a fetch implementation (global fetch not found)'
            )
        }
        this.fetchImpl = f
    }

    /**
     * Trigger a prefetch of the given root hashes. Returns the aggregate status
     * reported by the router (200 => cached, 202 => prefetching). Throws on a
     * non-2xx response.
     */
    async prefetch(rootHashes: string[]): Promise<HotStatus> {
        const resp = await this.fetchImpl(`${this.baseUrl}/prefetch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file_hashes: rootHashes }),
        })
        if (!resp.ok) {
            const body = await safeText(resp)
            throw new Error(`prefetch failed: HTTP ${resp.status} ${body}`)
        }
        const data = await resp.json()
        return normalizeStatus(data?.status)
    }

    /** Current hot-cache status of a single root hash. */
    async fileStatus(rootHash: string): Promise<HotStatus> {
        const resp = await this.fetchImpl(
            `${this.baseUrl}/file/status?hash=${encodeURIComponent(rootHash)}`
        )
        if (!resp.ok) {
            return 'unknown'
        }
        const data = await resp.json()
        return normalizeStatus(data?.status)
    }

    /**
     * Poll until every root hash is 'cached' or the timeout elapses. Returns
     * 'cached' when all reach cached, otherwise the last aggregate status.
     */
    async waitForCached(
        rootHashes: string[],
        opts?: WaitOptions
    ): Promise<HotStatus> {
        const timeoutMs = opts?.timeoutMs ?? 60_000
        const pollIntervalMs = opts?.pollIntervalMs ?? 3_000
        const deadline = Date.now() + timeoutMs
        for (;;) {
            const statuses = await Promise.all(
                rootHashes.map((h) => this.fileStatus(h))
            )
            const agg = aggregate(statuses)
            if (agg === 'cached') {
                return 'cached'
            }
            if (Date.now() >= deadline) {
                return agg
            }
            await sleep(pollIntervalMs)
        }
    }

    // ─── Paid download flow ───────────────────────────────────────────────

    /**
     * Current request nonce of `user` on the router (GET /nonce). The next
     * POST /download must use a strictly greater nonce.
     */
    async getNonce(user: string): Promise<number> {
        const resp = await this.fetchImpl(
            `${this.baseUrl}/nonce?user=${encodeURIComponent(user)}`
        )
        if (!resp.ok) {
            const body = await safeText(resp)
            throw new HotDownloadError(
                `nonce failed: HTTP ${resp.status} ${body}`
            )
        }
        const data = await resp.json()
        if (typeof data?.nonce !== 'number') {
            throw new HotDownloadError('nonce: malformed router response')
        }
        return data.nonce
    }

    /**
     * Request per-fragment download authorizations from the router.
     *
     * Fetches a fresh request nonce (GET /nonce), signs an EIP-712
     * HotDownloadAuth{user, fileHashes, nonce} with `signer`, and POSTs
     * /download. Returns the provider, node URL, and one auth per fragment
     * (in request order).
     */
    async requestDownload(
        signer: TypedDataSignerLike,
        rootHashes: string[],
        opts: HotDownloadOption
    ): Promise<HotDownloadTicket> {
        const user = await signer.getAddress()
        const nonce = (await this.getNonce(user)) + 1
        const signature = await signer.signTypedData(
            {
                name: EIP712_DOMAIN_NAME,
                version: EIP712_DOMAIN_VERSION,
                chainId: opts.chainId,
            },
            HOT_DOWNLOAD_AUTH_TYPES,
            { user, fileHashes: rootHashes, nonce }
        )
        const resp = await this.fetchImpl(`${this.baseUrl}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user,
                file_hashes: rootHashes,
                nonce,
                signature,
            }),
        })
        if (!resp.ok) {
            const body = await safeText(resp)
            throw new HotDownloadError(
                `download auth failed: HTTP ${resp.status} ${body}`
            )
        }
        return parseDownloadTicket(await resp.json(), rootHashes.length)
    }

    /**
     * Download the given fragments through the paid hot-storage path and
     * return their bytes concatenated in request order.
     *
     * One POST /download fetches all fragment auths; fragments are then
     * downloaded from the provider node concurrently (`opts.concurrency`,
     * default 4 — the node's default per-user stream cap).
     *
     * Billing-aware retry per fragment (bounded by `opts.maxRetries`):
     * - A zero-byte failure (connect error, non-2xx before any body) leaves
     *   the auth valid — the same auth is retried.
     * - An interrupted 2xx body may already be billed and the auth nonce
     *   consumed — a FRESH auth is requested for just that fragment and the
     *   transfer resumes with `Range: bytes=<received>-`.
     * - 402 surfaces as HotFeeExceededError, 503 "billing degraded" as
     *   HotBillingDegradedError; 429 backs off and retries (then surfaces as
     *   HotStreamLimitError), 401 "nonce covered by in-flight settlement"
     *   waits and re-auths (then surfaces as HotNonceInFlightError).
     */
    async download(
        signer: TypedDataSignerLike,
        rootHashes: string[],
        opts: HotDownloadOption
    ): Promise<Uint8Array> {
        if (rootHashes.length === 0) {
            return new Uint8Array(0)
        }
        const user = await signer.getAddress()
        const ticket = await this.requestDownload(signer, rootHashes, opts)
        const concurrency = opts.concurrency ?? DEFAULT_DOWNLOAD_CONCURRENCY
        const fragments = await mapWithConcurrency(
            ticket.auths,
            concurrency,
            (auth) =>
                this.downloadFragment(signer, user, ticket.nodeUrl, auth, opts)
        )
        return concatBytes(fragments)
    }

    // URL of the provider node's GET /download for one fragment auth.
    private nodeDownloadUrl(
        nodeUrl: string,
        user: string,
        auth: HotDownloadAuth
    ): string {
        const q = new URLSearchParams({
            user,
            file_hash: auth.fileHash,
            node_url: nodeUrl,
            max_fee: auth.maxFee,
            nonce: String(auth.nonce),
            signature: auth.signature,
        })
        return `${trimRightSlash(nodeUrl)}/download?${q.toString()}`
    }

    // Download a single fragment with billing-aware retries (see download()).
    private async downloadFragment(
        signer: TypedDataSignerLike,
        user: string,
        nodeUrl: string,
        auth: HotDownloadAuth,
        opts: HotDownloadOption
    ): Promise<Uint8Array> {
        const fragment = auth.fileHash
        const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
        const retryDelayMs = opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS
        const parts: Uint8Array[] = []
        let offset = 0
        let retries = 0

        const spend = (err: HotDownloadError): Promise<void> => {
            retries++
            if (retries > maxRetries) throw err
            return sleep(retryDelayMs)
        }
        // The auth nonce may be consumed — get a fresh single-fragment auth
        // (and possibly a different provider node) from the router.
        const freshAuth = async (): Promise<void> => {
            const t = await this.requestDownload(signer, [fragment], opts)
            nodeUrl = t.nodeUrl
            auth = t.auths[0]
        }

        for (;;) {
            const init: Record<string, unknown> =
                offset > 0 ? { headers: { Range: `bytes=${offset}-` } } : {}
            let resp: FetchResponseLike
            try {
                resp = await this.fetchImpl(
                    this.nodeDownloadUrl(nodeUrl, user, auth),
                    init
                )
            } catch (err) {
                // Connect error: zero bytes delivered, auth still valid.
                await spend(
                    new HotDownloadError(
                        `download fragment ${fragment} failed after ${retries} retries: ${err}`
                    )
                )
                continue
            }

            if (!resp.ok) {
                const body = await safeText(resp)
                if (resp.status === 402) {
                    throw new HotFeeExceededError(
                        `download fragment ${fragment}: fee exceeds authorized max_fee ${auth.maxFee} — re-quote required (HTTP 402 ${body})`
                    )
                }
                if (resp.status === 503 && body.includes('billing degraded')) {
                    throw new HotBillingDegradedError(
                        `download fragment ${fragment}: node billing degraded — retry later or use another provider (HTTP 503)`
                    )
                }
                if (resp.status === 429) {
                    // Per-user concurrent stream cap: back off, same auth.
                    await spend(
                        new HotStreamLimitError(
                            `download fragment ${fragment}: concurrent stream cap hit, retries exhausted (HTTP 429)`
                        )
                    )
                    continue
                }
                if (
                    resp.status === 401 &&
                    body.includes('nonce covered by in-flight settlement')
                ) {
                    // Transient: wait briefly, then use a fresh auth.
                    await spend(
                        new HotNonceInFlightError(
                            `download fragment ${fragment}: nonce covered by in-flight settlement, retries exhausted (HTTP 401)`
                        )
                    )
                    await freshAuth()
                    continue
                }
                if (
                    resp.status === 401 &&
                    (body.includes('nonce already served') ||
                        body.includes('nonce already settled'))
                ) {
                    // The node billed a previous attempt (bytes can be queued
                    // server-side before our side observes a failure): this
                    // auth is consumed. Resume under a fresh auth.
                    await spend(
                        new HotDownloadError(
                            `download fragment ${fragment}: auth nonce consumed, retries exhausted (HTTP 401 ${body})`
                        )
                    )
                    await freshAuth()
                    continue
                }
                // Other pre-body failure: zero bytes delivered, auth valid.
                await spend(
                    new HotDownloadError(
                        `download fragment ${fragment} failed: HTTP ${resp.status} ${body}`
                    )
                )
                continue
            }

            try {
                parts.push(await readBody(resp))
                return concatBytes(parts)
            } catch (err) {
                // Interrupted 2xx body: delivered bytes are billed and the
                // auth nonce consumed — never reuse this auth. Record what
                // arrived and resume from the new offset with a fresh auth.
                if (err instanceof BodyInterruptedError) {
                    if (err.received.length > 0) {
                        parts.push(err.received)
                        offset += err.received.length
                    }
                    retries++
                    if (retries > maxRetries) {
                        throw new HotDownloadError(
                            `download fragment ${fragment} interrupted at byte ${offset}, retries exhausted: ${err.message}`
                        )
                    }
                    await freshAuth()
                    continue
                }
                throw err
            }
        }
    }
}
