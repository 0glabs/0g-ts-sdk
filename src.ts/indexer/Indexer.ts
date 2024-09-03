import { HttpProvider } from 'open-jsonrpc-provider'
import { IpLocation, ShardedNodes } from './types.js'
import { selectNodes, ShardedNode } from '../common/index.js'
import { UploadOption, Uploader, Downloader } from '../transfer/index.js'
import { StorageNode } from '../node/index.js'
import { RetryOpts } from '../types.js'
import { AbstractFile } from '../file/AbstractFile.js'
import { FixedPriceFlow } from '../contracts/flow/FixedPriceFlow.js'

export class Indexer extends HttpProvider {
    constructor(url: string) {
        super({ url })
    }

    async getShardedNodes(): Promise<ShardedNodes> {
        const res = await super.request({
            method: 'indexer_getShardedNodes',
        })
        return res as ShardedNodes
    }

    async getNodeLocations(): Promise<Map<string, IpLocation>> {
        const res = await super.request({
            method: 'indexer_getNodeLocations',
        })
        return res as Map<string, IpLocation>
    }

    async getFileLocations(rootHash: string): Promise<ShardedNode[]> {
        const res = await super.request({
            method: 'indexer_getFileLocations',
            params: [rootHash],
        })
        return res as ShardedNode[]
    }

    async newUploaderFromIndexerNodes(
        blockchain_rpc: string,
        flow: FixedPriceFlow,
        expectedReplica: number
    ): Promise<[Uploader | null, Error | null]> {
        let [clients, err] = await this.selectNodes(expectedReplica)
        if (err != null) {
            return [null, err]
        }

        console.log('Selected nodes:', clients)

        let uploader: Uploader = new Uploader(clients, blockchain_rpc, flow)
        return [uploader, null]
    }

    async selectNodes(
        expectedReplica: number
    ): Promise<[StorageNode[], Error | null]> {
        let nodes: ShardedNodes = await this.getShardedNodes()
        let [trusted, ok] = selectNodes(nodes.trusted, expectedReplica)
        if (!ok) {
            return [
                [],
                new Error(
                    'cannot select a subset from the returned nodes that meets the replication requirement'
                ),
            ]
        }
        let clients: StorageNode[] = []
        trusted.forEach((node) => {
            let sn = new StorageNode(node.url)
            clients.push(sn)
        })

        return [clients, null]
    }

    async upload(
        file: AbstractFile,
        segIndex: number = 0,
        blockchain_rpc: string,
        flow_contract: FixedPriceFlow,
        opts?: UploadOption,
        retryOpts?: RetryOpts
    ): Promise<[string, Error | null]> {
        var expectedReplica = 1
        if (opts != undefined && opts.expectedReplica != null) {
            expectedReplica = Math.max(1, opts.expectedReplica)
        }
        let [uploader, err] = await this.newUploaderFromIndexerNodes(
            blockchain_rpc,
            flow_contract,
            expectedReplica
        )
        if (err != null || uploader == null) {
            return ['', new Error('failed to create uploader')]
        }
        if (opts === undefined) {
            opts = {
                tags: '0x',
                finalityRequired: true,
                taskSize: 10,
                expectedReplica: 1,
                skipTx: false,
                fee: BigInt('0'),
            }
        }

        return await uploader.uploadFile(file, segIndex, opts, retryOpts)
    }

    async download(
        rootHash: string,
        filePath: string,
        proof: boolean
    ): Promise<Error | null> {
        let locations = await this.getFileLocations(rootHash)
        if (locations.length == 0) {
            return new Error('failed to get file locations')
        }
        let clients: StorageNode[] = []
        locations.forEach((node) => {
            let sn = new StorageNode(node.url)
            clients.push(sn)
        })
        let downloader = new Downloader(clients)
        return await downloader.downloadFile(rootHash, filePath, proof)
    }
}
