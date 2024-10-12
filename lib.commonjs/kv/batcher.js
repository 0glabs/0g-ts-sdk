"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Batcher = void 0;
const builder_js_1 = require("./builder.js");
const index_js_1 = require("../file/index.js");
const index_js_2 = require("../transfer/index.js");
class Batcher {
    streamDataBuilder;
    clients;
    flow;
    blockchainRpc;
    constructor(version, clients, flow, provider) {
        this.streamDataBuilder = new builder_js_1.StreamDataBuilder(version);
        this.clients = clients;
        this.flow = flow;
        this.blockchainRpc = provider;
    }
    async exec(opts) {
        // build stream data
        const streamData = this.streamDataBuilder.build();
        const encoded = streamData.encode();
        const data = new index_js_1.MemData(encoded);
        const uploader = new index_js_2.Uploader(this.clients, this.blockchainRpc, this.flow);
        if (opts === undefined) {
            opts = index_js_2.defaultUploadOption;
        }
        opts.tags = this.streamDataBuilder.buildTags();
        return await uploader.uploadFile(data, opts);
    }
}
exports.Batcher = Batcher;
//# sourceMappingURL=batcher.js.map