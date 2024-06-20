import { decodeBase64, encodeBase64 } from "ethers";
import { HttpProvider } from "open-jsonrpc-provider";
import fs from 'fs';
import { DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_MAX_CHUNKS, DEFAULT_CHUNK_SIZE, } from "./constant.js";
import { GetSplitNum, checkExist } from "./utils.js";
export class NHProvider extends HttpProvider {
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
    async downloadFileHelper(root, filePath, size, proof) {
        const segmentOffset = 0;
        const numChunks = GetSplitNum(size, DEFAULT_CHUNK_SIZE);
        const numSegments = GetSplitNum(size, DEFAULT_SEGMENT_SIZE);
        const numTasks = numSegments - segmentOffset;
        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
            const segmentIndex = segmentOffset + taskInd;
            const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
            var endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS;
            if (endIndex > numChunks) {
                endIndex = numChunks;
            }
            var segment = await this.downloadSegment(root, startIndex, endIndex);
            var segArray = decodeBase64(segment);
            if (segment == null) {
                return new Error('Failed to download segment');
            }
            if (segmentIndex == numSegments - 1) {
                const lastChunkSize = size % DEFAULT_CHUNK_SIZE;
                if (lastChunkSize > 0) {
                    const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize;
                    segArray = segArray.slice(0, segArray.length - paddings);
                }
            }
            fs.appendFileSync(filePath, segArray);
        }
        return null;
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
    async downloadFile(root, filePath, proof) {
        const info = await this.getFileInfo(root);
        if (info == null) {
            return new Error('File not found');
        }
        if (!info.finalized) {
            return new Error('File not finalized');
        }
        if (checkExist(filePath)) {
            return new Error('Wrong path, provide a file path which does not exist.');
        }
        console.log('file info:', info.tx.size);
        let err = await this.downloadFileHelper(root, filePath, info.tx.size, proof);
        return err;
    }
}
//# sourceMappingURL=NHProvider.js.map