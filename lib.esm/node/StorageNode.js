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
    // UploadSegmentByTxSeq Call zgs_uploadSegmentByTxSeq RPC to upload a segment to the node.
    async uploadSegmentByTxSeq(seg, txSeq) {
        const res = await super.request({
            method: 'zgs_uploadSegmentByTxSeq',
            params: [seg, txSeq],
        });
        return res;
    }
    // UploadSegmentsByTxSeq Call zgs_uploadSegmentsByTxSeq RPC to upload a slice of segments to the node.
    async uploadSegmentsByTxSeq(segs, txSeq) {
        const res = await super.request({
            method: 'zgs_uploadSegmentsByTxSeq',
            params: [segs, txSeq],
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
    // DownloadSegmentByTxSeq Call zgs_downloadSegmentByTxSeq RPC to download a segment from the node.
    async downloadSegmentByTxSeq(txSeq, startIndex, endIndex) {
        const seg = await super.request({
            method: 'zgs_downloadSegmentByTxSeq',
            params: [txSeq, startIndex, endIndex],
        });
        return seg;
    }
    // DownloadSegmentWithProofByTxSeq Call zgs_downloadSegmentWithProofByTxSeq RPC to download a segment along with its merkle proof from the node.
    async downloadSegmentWithProofByTxSeq(txSeq, index) {
        const seg = await super.request({
            method: 'zgs_downloadSegmentWithProofByTxSeq',
            params: [txSeq, index],
        });
        return seg;
    }
    // GetSectorProof Call zgs_getSectorProof RPC to get the proof of a sector.
    async getSectorProof(sectorIndex, root) {
        const seg = await super.request({
            method: 'zgs_getSectorProof',
            params: [sectorIndex, root],
        });
        return seg;
    }
    async getFileInfo(root, needAvailable) {
        const info = await super.request({
            method: 'zgs_getFileInfo',
            params: [root, needAvailable],
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