import {
    HotRouterClient,
    FetchResponseLike,
    FetchLike,
} from '../src.ts/hot/HotRouterClient'
import {
    HotBillingDegradedError,
    HotDownloadError,
    HotFeeExceededError,
    HotStreamLimitError,
} from '../src.ts/hot/errors'
import { Indexer } from '../src.ts/indexer/Indexer'

function resp(status: number, body: unknown): FetchResponseLike {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
        text: async () =>
            typeof body === 'string' ? body : JSON.stringify(body),
    }
}

describe('HotRouterClient', () => {
    test('prefetch maps 200 -> cached and 202 -> prefetching', async () => {
        const cached = new HotRouterClient('http://r', async () =>
            resp(200, { status: 'cached' })
        )
        expect(await cached.prefetch(['0x1'])).toBe('cached')

        const prefetching = new HotRouterClient('http://r', async () =>
            resp(202, { status: 'prefetching' })
        )
        expect(await prefetching.prefetch(['0x1'])).toBe('prefetching')
    })

    test('prefetch posts file_hashes to {base}/prefetch with trailing slash trimmed', async () => {
        let seenUrl = ''
        let seenBody: unknown = null
        const c = new HotRouterClient('http://r/', async (url, init) => {
            seenUrl = url
            seenBody = JSON.parse(String((init as { body: string }).body))
            return resp(202, { status: 'prefetching' })
        })
        await c.prefetch(['0xaa', '0xbb'])
        expect(seenUrl).toBe('http://r/prefetch')
        expect(seenBody).toEqual({ file_hashes: ['0xaa', '0xbb'] })
    })

    test('prefetch throws on non-2xx', async () => {
        const c = new HotRouterClient('http://r', async () => resp(500, 'boom'))
        await expect(c.prefetch(['0x1'])).rejects.toThrow(
            /prefetch failed: HTTP 500/
        )
    })

    test('fileStatus parses status and returns unknown on error', async () => {
        const ok = new HotRouterClient('http://r', async () =>
            resp(200, { status: 'not_cached' })
        )
        expect(await ok.fileStatus('0x1')).toBe('not_cached')

        const bad = new HotRouterClient('http://r', async () => resp(500, ''))
        expect(await bad.fileStatus('0x1')).toBe('unknown')
    })

    test('waitForCached resolves cached once all hashes are cached', async () => {
        let calls = 0
        const c = new HotRouterClient('http://r', async () => {
            calls++
            return resp(200, { status: calls < 3 ? 'prefetching' : 'cached' })
        })
        expect(
            await c.waitForCached(['0x1'], {
                timeoutMs: 1000,
                pollIntervalMs: 1,
            })
        ).toBe('cached')
    })

    test('waitForCached returns the last aggregate on timeout', async () => {
        const c = new HotRouterClient('http://r', async () =>
            resp(200, { status: 'prefetching' })
        )
        expect(
            await c.waitForCached(['0x1'], { timeoutMs: 20, pollIntervalMs: 5 })
        ).toBe('prefetching')
    })
})

// ─── Paid download flow ──────────────────────────────────────────────────

const USER = '0x' + '11'.repeat(20)
const OPTS = { chainId: 16601, retryDelayMs: 1 }

function makeSigner() {
    const calls: Array<{ domain: unknown; types: unknown; value: any }> = []
    return {
        calls,
        getAddress: async () => USER,
        signTypedData: async (domain: unknown, types: unknown, value: any) => {
            calls.push({ domain, types, value })
            return '0xusersig' + value.nonce
        },
    }
}

const bytes = (...ns: number[]) => new Uint8Array(ns)

// Streaming 200 response delivering `chunks` one read() at a time. If
// `failAfterChunks` is set, read() throws after that many chunks were
// delivered (simulates a mid-body connection drop).
function bytesResp(
    chunks: Uint8Array[],
    failAfterChunks?: number
): FetchResponseLike {
    let i = 0
    return {
        ok: true,
        status: 200,
        json: async () => {
            throw new Error('binary body')
        },
        text: async () => '',
        body: {
            getReader: () => ({
                read: async () => {
                    if (failAfterChunks !== undefined && i >= failAfterChunks) {
                        throw new Error('connection reset')
                    }
                    if (i >= chunks.length) return { done: true }
                    return { done: false, value: chunks[i++] }
                },
            }),
        },
    }
}

// Mock router at http://router (GET /nonce + POST /download, new auths[]
// response shape) that forwards http://node/download GETs to `node`.
function makeRouterFetch(
    node: (
        url: URL,
        init?: Record<string, unknown>
    ) => FetchResponseLike | Promise<FetchResponseLike>
) {
    const state = {
        reqNonce: 5,
        authNonce: 100,
        posts: [] as any[],
        gets: [] as Array<{ url: URL; init?: Record<string, unknown> }>,
    }
    const fetchImpl: FetchLike = async (url, init) => {
        if (url.startsWith('http://router/nonce?')) {
            return resp(200, { nonce: state.reqNonce })
        }
        if (url === 'http://router/download') {
            const body = JSON.parse(String((init as { body: string }).body))
            state.posts.push(body)
            state.reqNonce = body.nonce
            return resp(200, {
                provider: '0xprovider',
                node_url: 'http://node',
                auths: body.file_hashes.map((h: string) => {
                    const n = state.authNonce++
                    return {
                        file_hash: h,
                        max_fee: '1000',
                        nonce: n,
                        signature: '0xrsig' + n,
                    }
                }),
            })
        }
        if (url.startsWith('http://node/download?')) {
            const u = new URL(url)
            state.gets.push({ url: u, init })
            return node(u, init)
        }
        throw new Error(`unexpected url: ${url}`)
    }
    return { fetchImpl, state }
}

describe('HotRouterClient paid download', () => {
    test('requestDownload signs EIP-712 and parses the exact new response shape', async () => {
        const { fetchImpl, state } = makeRouterFetch(() => {
            throw new Error('node must not be hit')
        })
        const signer = makeSigner()
        const c = new HotRouterClient('http://router', fetchImpl)

        const ticket = await c.requestDownload(signer, ['0xaa', '0xbb'], OPTS)

        // Exact POST /download body: fresh nonce = GET /nonce result + 1.
        expect(state.posts).toEqual([
            {
                user: USER,
                file_hashes: ['0xaa', '0xbb'],
                nonce: 6,
                signature: '0xusersig6',
            },
        ])
        // Exact EIP-712 payload.
        expect(signer.calls).toEqual([
            {
                domain: {
                    name: '0G Storage Scan',
                    version: '1',
                    chainId: 16601,
                },
                types: {
                    HotDownloadAuth: [
                        { name: 'user', type: 'address' },
                        { name: 'fileHashes', type: 'bytes32[]' },
                        { name: 'nonce', type: 'uint256' },
                    ],
                },
                value: { user: USER, fileHashes: ['0xaa', '0xbb'], nonce: 6 },
            },
        ])
        // Exact parsed ticket: one auth per fragment, in request order.
        expect(ticket).toEqual({
            provider: '0xprovider',
            nodeUrl: 'http://node',
            auths: [
                {
                    fileHash: '0xaa',
                    maxFee: '1000',
                    nonce: 100,
                    signature: '0xrsig100',
                },
                {
                    fileHash: '0xbb',
                    maxFee: '1000',
                    nonce: 101,
                    signature: '0xrsig101',
                },
            ],
        })
    })

    test('requestDownload rejects the old flat response shape and auth count mismatches', async () => {
        const signer = makeSigner()
        const oldShape = async (url: string) =>
            url.includes('/nonce')
                ? resp(200, { nonce: 1 })
                : resp(200, {
                      node_url: 'http://node',
                      provider: '0xprovider',
                      file_hashes: ['0xaa'],
                      max_fee: '1000',
                      nonce: 100,
                      signature: '0xrsig',
                  })
        await expect(
            new HotRouterClient('http://router', oldShape).requestDownload(
                signer,
                ['0xaa'],
                OPTS
            )
        ).rejects.toThrow(/malformed router response/)

        const wrongCount = async (url: string) =>
            url.includes('/nonce')
                ? resp(200, { nonce: 1 })
                : resp(200, {
                      provider: '0xprovider',
                      node_url: 'http://node',
                      auths: [
                          {
                              file_hash: '0xaa',
                              max_fee: '1',
                              nonce: 1,
                              signature: '0xs',
                          },
                      ],
                  })
        await expect(
            new HotRouterClient('http://router', wrongCount).requestDownload(
                signer,
                ['0xaa', '0xbb'],
                OPTS
            )
        ).rejects.toThrow(/returned 1 auths for 2 fragments/)
    })

    test('download uses each fragment auth on its node GET and assembles bytes in request order', async () => {
        const { fetchImpl, state } = makeRouterFetch(async (u) => {
            if (u.searchParams.get('file_hash') === '0xaa') {
                // Finish the first fragment last to prove in-order assembly.
                await new Promise((r) => setTimeout(r, 20))
                return bytesResp([bytes(1, 2)])
            }
            return bytesResp([bytes(3), bytes(4)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)

        const data = await c.download(makeSigner(), ['0xaa', '0xbb'], OPTS)

        expect(Array.from(data)).toEqual([1, 2, 3, 4])
        expect(state.posts).toHaveLength(1)
        expect(state.gets).toHaveLength(2)
        const paramsFor = (hash: string) => {
            const g = state.gets.find(
                (g) => g.url.searchParams.get('file_hash') === hash
            )
            expect(g).toBeDefined()
            return Object.fromEntries(g!.url.searchParams.entries())
        }
        // Each GET carries exactly its own fragment's auth.
        expect(paramsFor('0xaa')).toEqual({
            user: USER,
            file_hash: '0xaa',
            node_url: 'http://node',
            max_fee: '1000',
            nonce: '100',
            signature: '0xrsig100',
        })
        expect(paramsFor('0xbb')).toEqual({
            user: USER,
            file_hash: '0xbb',
            node_url: 'http://node',
            max_fee: '1000',
            nonce: '101',
            signature: '0xrsig101',
        })
    })

    test('download caps concurrent fragment streams at the concurrency option', async () => {
        let inflight = 0
        let maxInflight = 0
        const { fetchImpl } = makeRouterFetch(async () => {
            inflight++
            maxInflight = Math.max(maxInflight, inflight)
            await new Promise((r) => setTimeout(r, 5))
            inflight--
            return bytesResp([bytes(9)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)

        const hashes = ['0x01', '0x02', '0x03', '0x04', '0x05']
        const data = await c.download(makeSigner(), hashes, {
            ...OPTS,
            concurrency: 2,
        })

        expect(data.length).toBe(5)
        expect(maxInflight).toBeLessThanOrEqual(2)
    })

    test('mid-body failure resumes with a fresh single-fragment auth and Range from the received offset', async () => {
        let call = 0
        const { fetchImpl, state } = makeRouterFetch(() => {
            call++
            return call === 1
                ? bytesResp([bytes(1, 2, 3), bytes(4, 5, 6, 7, 8)], 1)
                : bytesResp([bytes(4, 5, 6, 7, 8)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)

        const data = await c.download(makeSigner(), ['0xaa'], OPTS)

        expect(Array.from(data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
        // A second POST /download was issued for just the interrupted
        // fragment, with a fresh request nonce.
        expect(state.posts).toHaveLength(2)
        expect(state.posts[1]).toEqual({
            user: USER,
            file_hashes: ['0xaa'],
            nonce: 7,
            signature: '0xusersig7',
        })
        expect(state.gets).toHaveLength(2)
        // First GET: original auth, no Range.
        expect(state.gets[0].url.searchParams.get('nonce')).toBe('100')
        expect(state.gets[0].init).toEqual({})
        // Second GET: FRESH auth (nonce 101), resuming at byte 3.
        expect(state.gets[1].url.searchParams.get('nonce')).toBe('101')
        expect(state.gets[1].url.searchParams.get('signature')).toBe(
            '0xrsig101'
        )
        expect(state.gets[1].init).toEqual({
            headers: { Range: 'bytes=3-' },
        })
    })

    test('zero-byte failure (connect error) retries the SAME auth with no new POST /download', async () => {
        let call = 0
        const { fetchImpl, state } = makeRouterFetch(() => {
            call++
            if (call === 1) throw new Error('ECONNREFUSED')
            return bytesResp([bytes(7, 8)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)

        const data = await c.download(makeSigner(), ['0xaa'], OPTS)

        expect(Array.from(data)).toEqual([7, 8])
        expect(state.posts).toHaveLength(1)
        expect(state.gets).toHaveLength(2)
        // Identical URL both times: same nonce, same signature, no Range.
        expect(state.gets[0].url.toString()).toBe(state.gets[1].url.toString())
        expect(state.gets[1].url.searchParams.get('nonce')).toBe('100')
        expect(state.gets[1].init).toEqual({})
    })

    test('pre-body 5xx retries the SAME auth', async () => {
        let call = 0
        const { fetchImpl, state } = makeRouterFetch(() => {
            call++
            if (call === 1) return resp(500, 'boom')
            return bytesResp([bytes(1)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)
        const data = await c.download(makeSigner(), ['0xaa'], OPTS)
        expect(Array.from(data)).toEqual([1])
        expect(state.posts).toHaveLength(1)
        expect(state.gets[0].url.toString()).toBe(state.gets[1].url.toString())
    })

    test('402 surfaces as HotFeeExceededError without retrying', async () => {
        const { fetchImpl, state } = makeRouterFetch(() =>
            resp(402, 'fee exceeds authorized max_fee')
        )
        const c = new HotRouterClient('http://router', fetchImpl)
        await expect(
            c.download(makeSigner(), ['0xaa'], OPTS)
        ).rejects.toBeInstanceOf(HotFeeExceededError)
        expect(state.gets).toHaveLength(1)
    })

    test('429 backs off and retries the same auth, then surfaces HotStreamLimitError when exhausted', async () => {
        // Retry-then-success.
        let call = 0
        const ok = makeRouterFetch(() => {
            call++
            if (call === 1) return resp(429, 'too many concurrent streams')
            return bytesResp([bytes(5)])
        })
        const c1 = new HotRouterClient('http://router', ok.fetchImpl)
        const data = await c1.download(makeSigner(), ['0xaa'], OPTS)
        expect(Array.from(data)).toEqual([5])
        expect(ok.state.posts).toHaveLength(1)
        expect(ok.state.gets[0].url.toString()).toBe(
            ok.state.gets[1].url.toString()
        )

        // Exhaustion.
        const always = makeRouterFetch(() =>
            resp(429, 'too many concurrent streams')
        )
        const c2 = new HotRouterClient('http://router', always.fetchImpl)
        await expect(
            c2.download(makeSigner(), ['0xaa'], { ...OPTS, maxRetries: 1 })
        ).rejects.toBeInstanceOf(HotStreamLimitError)
        expect(always.state.gets).toHaveLength(2)
    })

    test('503 "billing degraded" surfaces as HotBillingDegradedError without retrying', async () => {
        const { fetchImpl, state } = makeRouterFetch(() =>
            resp(503, 'billing degraded')
        )
        const c = new HotRouterClient('http://router', fetchImpl)
        await expect(
            c.download(makeSigner(), ['0xaa'], OPTS)
        ).rejects.toBeInstanceOf(HotBillingDegradedError)
        expect(state.gets).toHaveLength(1)
    })

    test('401 "nonce covered by in-flight settlement" waits and retries with a fresh auth', async () => {
        let call = 0
        const { fetchImpl, state } = makeRouterFetch(() => {
            call++
            if (call === 1) {
                return resp(401, 'nonce covered by in-flight settlement')
            }
            return bytesResp([bytes(6)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)

        const data = await c.download(makeSigner(), ['0xaa'], OPTS)

        expect(Array.from(data)).toEqual([6])
        // Fresh auth requested; second GET carries the new nonce, no Range
        // (zero bytes were delivered).
        expect(state.posts).toHaveLength(2)
        expect(state.posts[1].file_hashes).toEqual(['0xaa'])
        expect(state.gets[0].url.searchParams.get('nonce')).toBe('100')
        expect(state.gets[1].url.searchParams.get('nonce')).toBe('101')
        expect(state.gets[1].init).toEqual({})
    })

    test('401 "nonce already served" resumes under a fresh auth', async () => {
        let call = 0
        const { fetchImpl, state } = makeRouterFetch(() => {
            call++
            if (call === 1) {
                return resp(401, 'nonce already served')
            }
            return bytesResp([bytes(6)])
        })
        const c = new HotRouterClient('http://router', fetchImpl)

        const data = await c.download(makeSigner(), ['0xaa'], OPTS)

        expect(Array.from(data)).toEqual([6])
        // The consumed auth is abandoned: a fresh single-fragment auth is
        // requested and the retry carries its new nonce.
        expect(state.posts).toHaveLength(2)
        expect(state.posts[1].file_hashes).toEqual(['0xaa'])
        expect(state.gets[0].url.searchParams.get('nonce')).toBe('100')
        expect(state.gets[1].url.searchParams.get('nonce')).toBe('101')
    })

    test('retry budget bounds mid-body resume attempts', async () => {
        const { fetchImpl, state } = makeRouterFetch(() =>
            // Always deliver one chunk then drop the connection.
            bytesResp([bytes(1), bytes(2)], 1)
        )
        const c = new HotRouterClient('http://router', fetchImpl)
        await expect(
            c.download(makeSigner(), ['0xaa'], { ...OPTS, maxRetries: 2 })
        ).rejects.toThrow(HotDownloadError)
        // Initial attempt + 2 retries.
        expect(state.gets).toHaveLength(3)
        // Offsets advanced by one delivered byte per attempt.
        expect(state.gets[1].init).toEqual({ headers: { Range: 'bytes=1-' } })
        expect(state.gets[2].init).toEqual({ headers: { Range: 'bytes=2-' } })
    })
})

describe('Indexer.uploadToHot', () => {
    const fakeFile = {} as never
    const fakeSigner = {} as never

    afterEach(() => {
        delete (global as { fetch?: unknown }).fetch
    })

    test('uploads then prefetches; returns hotStatus and the prefetched hash', async () => {
        const indexer = new Indexer('http://indexer')
        jest.spyOn(indexer, 'upload').mockResolvedValue([
            { txHash: '0xtx', rootHash: '0xroot', txSeq: 7 },
            null,
        ])
        const seen: string[] = []
        ;(global as { fetch?: unknown }).fetch = jest.fn(
            async (url: string) => {
                seen.push(url)
                return resp(202, { status: 'prefetching' })
            }
        )

        const [res, err] = await indexer.uploadToHot(
            fakeFile,
            'http://rpc',
            fakeSigner,
            { hotRouterUrl: 'http://hot' }
        )
        expect(err).toBeNull()
        expect(res.rootHash).toBe('0xroot')
        expect(res.prefetched).toEqual(['0xroot'])
        expect(res.hotStatus).toBe('prefetching')
        expect(seen[0]).toBe('http://hot/prefetch')
    })

    test('prefetch failure is soft: upload still succeeds with hotStatus unknown', async () => {
        const indexer = new Indexer('http://indexer')
        jest.spyOn(indexer, 'upload').mockResolvedValue([
            { txHash: '0xtx', rootHash: '0xroot', txSeq: 7 },
            null,
        ])
        ;(global as { fetch?: unknown }).fetch = jest.fn(async () => {
            throw new Error('network down')
        })

        const [res, err] = await indexer.uploadToHot(
            fakeFile,
            'http://rpc',
            fakeSigner,
            { hotRouterUrl: 'http://hot' }
        )
        expect(err).toBeNull()
        expect(res.rootHash).toBe('0xroot')
        expect(res.hotStatus).toBe('unknown')
    })

    test('upload error short-circuits without calling prefetch', async () => {
        const indexer = new Indexer('http://indexer')
        jest.spyOn(indexer, 'upload').mockResolvedValue([
            { txHash: '', rootHash: '', txSeq: 0 },
            new Error('upload failed'),
        ])
        const fetchMock = jest.fn()
        ;(global as { fetch?: unknown }).fetch = fetchMock

        const [res, err] = await indexer.uploadToHot(
            fakeFile,
            'http://rpc',
            fakeSigner,
            { hotRouterUrl: 'http://hot' }
        )
        expect(err).not.toBeNull()
        expect(res.hotStatus).toBe('unknown')
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
