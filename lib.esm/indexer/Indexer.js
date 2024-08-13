import { HttpProvider } from 'open-jsonrpc-provider';
import { selectNodes } from '../common/index.js';
import { Uploader, Downloader } from '../transfer/index.js';
import { StorageNode } from '../node/index.js';
export class Indexer extends HttpProvider {
    blockchain_rpc;
    private_key;
    flow_contract;
    constructor(url, blockchain_rpc, private_key, flow_contract) {
        super({ url });
        this.blockchain_rpc = blockchain_rpc;
        this.private_key = private_key;
        this.flow_contract = flow_contract;
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
    async newUploaderFromIndexerNodes(expectedReplica) {
        let [clients, err] = await this.selectNodes(expectedReplica);
        if (err != null) {
            return [null, err];
        }
        let uploader = new Uploader(clients, this.blockchain_rpc, this.private_key, this.flow_contract);
        return [uploader, null];
    }
    async selectNodes(expectedReplica) {
        let nodes = await this.getShardedNodes();
        let [trusted, ok] = selectNodes(nodes.trusted, expectedReplica);
        if (!ok) {
            return [
                [],
                new Error('cannot select a subset from the returned nodes that meets the replication requirement'),
            ];
        }
        let clients = [];
        trusted.forEach((node) => {
            let sn = new StorageNode(node.url);
            clients.push(sn);
        });
        return [clients, null];
    }
    async upload(file, segIndex = 0, opts, retryOpts) {
        if (this.blockchain_rpc === undefined || this.private_key === undefined || this.flow_contract === undefined) {
            return ['', new Error('missing rpc, private key or flow contract')];
        }
        var expectedReplica = 1;
        if (opts != undefined && opts.expectedReplica != null) {
            expectedReplica = Math.max(1, opts.expectedReplica);
        }
        let [uploader, err] = await this.newUploaderFromIndexerNodes(expectedReplica);
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
            let sn = new StorageNode(node.url);
            clients.push(sn);
        });
        let downloader = new Downloader(clients);
        return await downloader.downloadFile(rootHash, filePath, proof);
    }
}
//# sourceMappingURL=Indexer.js.map