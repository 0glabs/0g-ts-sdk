import { HotStatus } from './types.js'

export interface FetchResponseLike {
    ok: boolean
    status: number
    json(): Promise<any>
    text(): Promise<string>
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
}
