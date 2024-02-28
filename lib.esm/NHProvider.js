import { encodeBase64 } from "ethers";
import { HttpProvider } from "open-jsonrpc-provider";
import { DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_MAX_CHUNKS, DEFAULT_CHUNK_SIZE, } from "./constant.js";
export class NHProvider extends HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getStatus() {
        const res = await super.request({ method: 'nrhv_getStatus' });
        return res;
    }
    async uploadSegment(seg) {
        super.request({
            method: 'nrhv_uploadSegment',
            params: [seg],
        });
    }
    async downloadSegment(root, startIndex, endIndx) {
        const seg = await super.request({
            method: 'nrhv_downloadSegment',
            params: [root, startIndex, endIndx],
        });
        return seg;
    }
    async downloadSegmentWithProof(root, index) {
        const seg = await super.request({
            method: 'nrhv_downloadSegmentWithProof',
            params: [root, index],
        });
        return seg;
    }
    async getFileInfo(root) {
        const info = await super.request({
            method: 'nrhv_getFileInfo',
            params: [root],
        });
        return info;
    }
    async getFileInfoByTxSeq(txSeq) {
        const info = await super.request({
            method: 'getFileInfoByTxSeq',
            params: [txSeq],
        });
        return info;
    }
    async uploadFile(file, segIndex = 0) {
        const [tree, err] = await file.merkleTree();
        if (tree == null || err != null) {
            return err;
        }
        /*
            todo: check if file is already uploaded
            1. calculate root hash of file
            2. get file info by root hash
            3. check file is finalized
        */
        const iter = file.iterateWithOffsetAndBatch(segIndex * DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_SIZE, true);
        const numChunks = file.numChunks();
        const fileSize = file.size();
        while (true) {
            let [ok, err] = await iter.next();
            if (err) {
                return new Error('Failed to read segment');
            }
            if (!ok) {
                break;
            }
            let segment = iter.current();
            const proof = tree.proofAt(segIndex);
            const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
            let allDataUploaded = false;
            if (startIndex >= numChunks) {
                break;
            }
            else if (startIndex + segment.length / DEFAULT_CHUNK_SIZE >= numChunks) {
                const expectedLen = DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
                segment = segment.slice(0, expectedLen);
                allDataUploaded = true;
            }
            const segWithProof = {
                root: tree.rootHash(),
                data: encodeBase64(segment),
                index: segIndex,
                proof: proof,
                fileSize,
            };
            try {
                await this.uploadSegment(segWithProof); // todo check error
            }
            catch (e) {
                return e;
            }
            if (allDataUploaded) {
                break;
            }
            segIndex++;
        }
        return null;
    }
}
//# sourceMappingURL=NHProvider.js.map