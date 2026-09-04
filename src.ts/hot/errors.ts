/**
 * Typed errors surfaced by the hot-storage paid download flow so callers can
 * branch on failure mode instead of parsing message strings.
 */

/** Base class for all hot-storage download failures. */
export class HotDownloadError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'HotDownloadError'
    }
}

/**
 * Node returned 402: the fee for the requested bytes exceeds the authorized
 * max_fee. The auth is stale — re-quote by requesting a fresh auth from the
 * router (pricing may have changed since the auth was issued).
 */
export class HotFeeExceededError extends HotDownloadError {
    constructor(message: string) {
        super(message)
        this.name = 'HotFeeExceededError'
    }
}

/**
 * Node returned 429: the per-user concurrent stream cap was hit. The client
 * backs off and retries automatically; this surfaces once the retry budget
 * is exhausted. Lower the `concurrency` option or retry later.
 */
export class HotStreamLimitError extends HotDownloadError {
    constructor(message: string) {
        super(message)
        this.name = 'HotStreamLimitError'
    }
}

/**
 * Node returned 503 "billing degraded": a node-side billing outage. The auth
 * is still valid but the node refuses to serve. Retry later or route to
 * another provider (a fresh POST /download may pick one).
 */
export class HotBillingDegradedError extends HotDownloadError {
    constructor(message: string) {
        super(message)
        this.name = 'HotBillingDegradedError'
    }
}

/**
 * Node returned 401 "nonce covered by in-flight settlement": transient — the
 * auth nonce is being settled. The client waits briefly and requests a fresh
 * auth automatically; this surfaces once the retry budget is exhausted.
 */
export class HotNonceInFlightError extends HotDownloadError {
    constructor(message: string) {
        super(message)
        this.name = 'HotNonceInFlightError'
    }
}
