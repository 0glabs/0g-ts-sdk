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
