export type HotStatus = 'cached' | 'prefetching' | 'not_cached' | 'unknown'

export interface HotUploadOption {
    // Base URL of the hot-storage router (or a same-origin proxy path). Supplied
    // by the caller so the SDK stays agnostic of hot-router topology.
    hotRouterUrl: string
    // Poll GET /file/status until the file is cached. Default false (fire-and-forget).
    waitForCached?: boolean
    // Max time to wait when waitForCached is set. Default 60000ms.
    timeoutMs?: number
    // Status poll interval when waitForCached is set. Default 3000ms.
    pollIntervalMs?: number
}

// Minimal structural view of an EIP-712-capable signer (ethers v6 Signer
// satisfies it). Kept structural so the hot client has no hard ethers import.
export interface TypedDataSignerLike {
    getAddress(): Promise<string>
    signTypedData(
        domain: { name: string; version: string; chainId: number | bigint },
        types: Record<string, Array<{ name: string; type: string }>>,
        value: Record<string, unknown>
    ): Promise<string>
}

// One per-fragment download authorization issued by the router's POST /download.
export interface HotDownloadAuth {
    // Root hash of the fragment this auth covers.
    fileHash: string
    // Max fee the router authorized for this fragment (decimal string).
    maxFee: string
    // Router-assigned auth nonce. Consumed by the node on ANY billing — an
    // auth that delivered >0 bytes is dead and must never be reused.
    nonce: number
    // Hex-encoded router signature over the routing message.
    signature: string
}

// Parsed response of the router's POST /download.
export interface HotDownloadTicket {
    // Provider address serving the file.
    provider: string
    // Base URL of the provider node to download from.
    nodeUrl: string
    // One auth per requested fragment, in request order.
    auths: HotDownloadAuth[]
}

export interface HotDownloadOption {
    // EIP-712 domain chainId for signing HotDownloadAuth. Must match the
    // chain the router verifies against.
    chainId: number | bigint
    // Max fragments downloaded in parallel. Default 4 — matches the node's
    // default per-user concurrent stream cap.
    concurrency?: number
    // Max retries per fragment (same-auth retries and fresh-auth resumes
    // combined). Default 3.
    maxRetries?: number
    // Delay before retrying transient failures (429 backoff, 401 in-flight
    // settlement, zero-byte failures). Default 500ms.
    retryDelayMs?: number
}

export interface UploadToHotResult {
    // Single-file upload result fields.
    txHash?: string
    rootHash?: string
    txSeq?: number
    // Fragmented upload result fields.
    txHashes?: string[]
    rootHashes?: string[]
    txSeqs?: number[]
    // Root hashes submitted to the hot router's /prefetch.
    prefetched: string[]
    // Aggregate hot status after prefetch (and the optional wait).
    hotStatus: HotStatus
}
