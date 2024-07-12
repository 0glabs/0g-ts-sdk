import { HttpProvider } from 'open-jsonrpc-provider'
import { ShardedNode } from '../node'

export class StorageKv extends HttpProvider {
    constructor(url: string) {
        super({ url })
    }

    async getValue(): Promise<ShardedNode[]> {
        const res = await super.request({
            method: 'indexer_getNodes',
        })
        return res as ShardedNode[]
    }
}
