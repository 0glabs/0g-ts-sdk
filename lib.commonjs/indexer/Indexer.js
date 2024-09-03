"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Indexer = void 0;
const open_jsonrpc_provider_1 = require("open-jsonrpc-provider");
const index_js_1 = require("../common/index.js");
const index_js_2 = require("../transfer/index.js");
const index_js_3 = require("../node/index.js");
class Indexer extends open_jsonrpc_provider_1.HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getShardedNodes() {
        const res = await super.request({
            method: 'indexer_getShardedNodes',
        });
        return res;
    }
    async getNodeLocations() {
        const res = await super.request({
            method: 'indexer_getNodeLocations',
        });
        return res;
    }
    async getFileLocations(rootHash) {
        const res = await super.request({
            method: 'indexer_getFileLocations',
            params: [rootHash],
        });
        return res;
    }
    async newUploaderFromIndexerNodes(blockchain_rpc, flow, expectedReplica) {
        let [clients, err] = await this.selectNodes(expectedReplica);
        if (err != null) {
            return [null, err];
        }
        console.log('Selected nodes:', clients);
        let uploader = new index_js_2.Uploader(clients, blockchain_rpc, flow);
        return [uploader, null];
    }
    async selectNodes(expectedReplica) {
        let nodes = await this.getShardedNodes();
        let [trusted, ok] = (0, index_js_1.selectNodes)(nodes.trusted, expectedReplica);
        if (!ok) {
            return [
                [],
                new Error('cannot select a subset from the returned nodes that meets the replication requirement'),
            ];
        }
        let clients = [];
        trusted.forEach((node) => {
            let sn = new index_js_3.StorageNode(node.url);
            clients.push(sn);
        });
        return [clients, null];
    }
    async upload(file, segIndex = 0, blockchain_rpc, flow_contract, opts, retryOpts) {
        var expectedReplica = 1;
        if (opts != undefined && opts.expectedReplica != null) {
            expectedReplica = Math.max(1, opts.expectedReplica);
        }
        let [uploader, err] = await this.newUploaderFromIndexerNodes(blockchain_rpc, flow_contract, expectedReplica);
        if (err != null || uploader == null) {
            return ['', new Error('failed to create uploader')];
        }
        if (opts === undefined) {
            opts = {
                tags: '0x',
                finalityRequired: true,
                taskSize: 10,
                expectedReplica: 1,
                skipTx: false,
                fee: BigInt('0'),
            };
        }
        return await uploader.uploadFile(file, segIndex, opts, retryOpts);
    }
    async download(rootHash, filePath, proof) {
        let locations = await this.getFileLocations(rootHash);
        if (locations.length == 0) {
            return new Error('failed to get file locations');
        }
        let clients = [];
        locations.forEach((node) => {
            let sn = new index_js_3.StorageNode(node.url);
            clients.push(sn);
        });
        let downloader = new index_js_2.Downloader(clients);
        return await downloader.downloadFile(rootHash, filePath, proof);
    }
}
exports.Indexer = Indexer;
//# sourceMappingURL=Indexer.js.map