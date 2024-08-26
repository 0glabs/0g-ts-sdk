import { StreamDataBuilder } from './builder.js';
import { MemData } from '../file/index.js';
import { Uploader } from '../transfer/index.js';
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
    exec(opts) {
        // build stream data
        const streamData = this.streamDataBuilder.build();
        const encoded = streamData.encode();
        const data = new MemData(encoded);
        const uploader = new Uploader(this.clients, this.blockchainRpc, this.flow);
        opts.tags = this.streamDataBuilder.buildTags();
        uploader.uploadFile(data, 0, opts);
    }
}
//# sourceMappingURL=batcher.js.map