import { HttpProvider } from 'open-jsonrpc-provider'
import { IpLocation, ShardedNodes } from './types.js'
import { selectNodes, ShardedNode } from '../common/index.js'
import { UploadOption, Uploader, Downloader } from '../transfer/index.js'
import { StorageNode } from '../node/index.js'
import { RetryOpts } from '../types.js'
import { AbstractFile } from '../file/AbstractFile.js'

export class Indexer extends HttpProvider {
    blockchain_rpc: string | undefined
    private_key: string | undefined
    flow_contract: string | undefined

    constructor(
        url: string,
        blockchain_rpc?: string,
        private_key?: string,
        flow_contract?: string
    ) {
        super({ url })
        this.blockchain_rpc = blockchain_rpc
        this.private_key = private_key
        this.flow_contract = flow_contract
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
        expectedReplica: number
    ): Promise<[Uploader | null, Error | null]> {
        let [clients, err] = await this.selectNodes(expectedReplica)
        if (err != null) {
            return [null, err]
        }

        let uploader: Uploader = new Uploader(
            clients,
            this.blockchain_rpc!,
            this.private_key!,
            this.flow_contract!
        )
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
        opts?: UploadOption,
        retryOpts?: RetryOpts
    ): Promise<[string, Error | null]> {
        if (this.blockchain_rpc === undefined || this.private_key === undefined || this.flow_contract === undefined) {
            return ['', new Error('missing rpc, private key or flow contract')]
        }

        var expectedReplica = 1
        if (opts != undefined && opts.expectedReplica != null) {
            expectedReplica = Math.max(1, opts.expectedReplica)
        }
        let [uploader, err] = await this.newUploaderFromIndexerNodes(
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
