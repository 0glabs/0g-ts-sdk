import { HttpProvider } from 'open-jsonrpc-provider';
export class StorageNode extends HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getStatus() {
        const res = await super.request({ method: 'zgs_getStatus' });
        return res;
    }
    async uploadSegment(seg) {
        const res = await super.request({
            method: 'zgs_uploadSegment',
            params: [seg],
        });
        return res;
    }
    async uploadSegments(segs) {
        const res = await super.request({
            method: 'zgs_uploadSegments',
            params: [segs],
        });
        return res;
    }
    async downloadSegment(root, startIndex, endIndx) {
        var seg = await super.request({
            method: 'zgs_downloadSegment',
            params: [root, startIndex, endIndx],
        });
        return seg;
    }
    async downloadSegmentWithProof(root, index) {
        const seg = await super.request({
            method: 'zgs_downloadSegmentWithProof',
            params: [root, index],
        });
        return seg;
    }
    async getFileInfo(root) {
        const info = await super.request({
            method: 'zgs_getFileInfo',
            params: [root],
        });
        return info;
    }
    async getFileInfoByTxSeq(txSeq) {
        const info = await super.request({
            method: 'zgs_getFileInfoByTxSeq',
            params: [txSeq],
        });
        return info;
    }
    async getShardConfig() {
        const config = await super.request({
            method: 'zgs_getShardConfig',
        });
        return config;
    }
}
//# sourceMappingURL=StorageNode.js.map