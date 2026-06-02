import {
    HotRouterClient,
    FetchResponseLike,
} from '../src.ts/hot/HotRouterClient'
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
