import { StreamDataBuilder } from './builder.js'
import { FixedPriceFlow } from '../contracts/flow/index.js'
import { StorageNode } from '../node/index.js'
import { MemData } from '../file/index.js'
import { Uploader, UploadOption } from '../transfer/index.js'

export class Batcher {
    streamDataBuilder: StreamDataBuilder
    clients: StorageNode[]
    flow: FixedPriceFlow
    blockchainRpc: string

    constructor(
        version: bigint,
        clients: StorageNode[],
        flow: FixedPriceFlow,
        provider: string
    ) {
        this.streamDataBuilder = new StreamDataBuilder(version)
        this.clients = clients
        this.flow = flow
        this.blockchainRpc = provider
    }

    public exec(opts: UploadOption) {
        // build stream data
        const streamData = this.streamDataBuilder.build()
        const encoded = streamData.encode()
        const data = new MemData(encoded)

        const uploader = new Uploader(
            this.clients,
            this.blockchainRpc,
            this.flow
        )

        opts.tags = this.streamDataBuilder.buildTags()
        uploader.uploadFile(data, 0, opts)
    }
}
