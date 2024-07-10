"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uploader = void 0;
const constant_js_1 = require("../constant.js");
const ethers_1 = require("ethers");
class Uploader {
    node;
    constructor(node) {
        this.node = node;
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
                await this.node.uploadSegment(segWithProof); // todo check error
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
exports.Uploader = Uploader;
//# sourceMappingURL=Uploader.js.map