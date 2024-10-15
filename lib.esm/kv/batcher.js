import { StreamDataBuilder } from './builder.js';
import { MemData } from '../file/index.js';
import { defaultUploadOption, Uploader, } from '../transfer/index.js';
export class Batcher {
    streamDataBuilder;
    clients;
    flow;
    blockchainRpc;
    constructor(version, clients, flow, provider) {
        this.streamDataBuilder = new StreamDataBuilder(version);
        this.clients = clients;
        this.flow = flow;
        this.blockchainRpc = provider;
    }
    async exec(opts) {
        // build stream data
        const streamData = this.streamDataBuilder.build();
        const encoded = streamData.encode();
        const data = new MemData(encoded);
        const uploader = new Uploader(this.clients, this.blockchainRpc, this.flow);
        if (opts === undefined) {
            opts = defaultUploadOption;
        }
        opts.tags = this.streamDataBuilder.buildTags();
        return await uploader.uploadFile(data, opts);
    }
}
//# sourceMappingURL=batcher.js.map