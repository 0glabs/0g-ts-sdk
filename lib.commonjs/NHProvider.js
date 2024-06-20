"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NHProvider = void 0;
const tslib_1 = require("tslib");
const ethers_1 = require("ethers");
const open_jsonrpc_provider_1 = require("open-jsonrpc-provider");
const fs = tslib_1.__importStar(require("fs"));
const constant_js_1 = require("./constant.js");
const utils_js_1 = require("./utils.js");
class NHProvider extends open_jsonrpc_provider_1.HttpProvider {
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
        const seg = await super.request({
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
        const numChunks = (0, utils_js_1.GetSplitNum)(size, constant_js_1.DEFAULT_CHUNK_SIZE);
        const numSegments = (0, utils_js_1.GetSplitNum)(size, constant_js_1.DEFAULT_SEGMENT_SIZE);
        const numTasks = numSegments - segmentOffset;
        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
            const segmentIndex = segmentOffset + taskInd;
            const startIndex = segmentIndex * constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
            var endIndex = startIndex + constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
            if (endIndex > numChunks) {
                endIndex = numChunks;
            }
            var segment = await this.downloadSegment(root, startIndex, endIndex);
            if (segment == null) {
                return new Error('Failed to download segment');
            }
            if (segmentIndex == numSegments - 1) {
                const lastChunkSize = size % constant_js_1.DEFAULT_CHUNK_SIZE;
                if (lastChunkSize > 0) {
                    const paddings = constant_js_1.DEFAULT_CHUNK_SIZE - lastChunkSize;
                    segment = segment.slice(0, segment.length - paddings);
                }
            }
            fs.appendFileSync(filePath, segment);
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
        const iter = file.iterateWithOffsetAndBatch(segIndex * constant_js_1.DEFAULT_SEGMENT_SIZE, constant_js_1.DEFAULT_SEGMENT_SIZE, true);
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
            const startIndex = segIndex * constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
            let allDataUploaded = false;
            if (startIndex >= numChunks) {
                break;
            }
            else if (startIndex + segment.length / constant_js_1.DEFAULT_CHUNK_SIZE >= numChunks) {
                const expectedLen = constant_js_1.DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
                segment = segment.slice(0, expectedLen);
                allDataUploaded = true;
            }
            const segWithProof = {
                root: tree.rootHash(),
                data: (0, ethers_1.encodeBase64)(segment),
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
        if ((0, utils_js_1.checkExist)(filePath)) {
            return new Error('Wrong path, provide a file path which does not exist.');
        }
        let err = await this.downloadFileHelper(root, filePath, info.tx.size, proof);
        return err;
    }
}
exports.NHProvider = NHProvider;
//# sourceMappingURL=NHProvider.js.map