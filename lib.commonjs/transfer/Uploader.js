"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uploader = void 0;
const constant_js_1 = require("../constant.js");
const utils_js_1 = require("../utils.js");
const ethers_1 = require("ethers");
class Uploader {
    node;
    provider;
    flow;
    signer;
    constructor(node, providerRpc, privateKey) {
        this.node = node;
        this.provider = new ethers_1.ethers.JsonRpcProvider(providerRpc);
        this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.flow = (0, utils_js_1.getFlowContract)(constant_js_1.TESTNET_FLOW_ADDRESS, this.signer);
    }
    async uploadFile(file, tag, segIndex = 0, opts = {}, retryOpts) {
        var [tree, err] = await file.merkleTree();
        if (err != null || tree == null || tree.rootHash() == null) {
            return err;
        }
        const fileInfo = await this.node.getFileInfo(tree.rootHash());
        console.log('fileInfo', fileInfo);
        if (fileInfo != null) {
            return new Error('File already uploaded');
        }
        var [submission, err] = await file.createSubmission(tag);
        if (err != null || submission == null) {
            return err;
        }
        let tx = await this.flow.submit(submission, opts);
        await tx.wait();
        let receipt = (0, utils_js_1.WaitForReceipt)(this.provider, tx.hash, retryOpts);
        if (receipt == null) {
            return new Error('Failed to submit transaction');
        }
        return await this.uploadFileHelper(file, tree, segIndex);
    }
    async uploadFileHelper(file, tree, segIndex = 0) {
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
            else if (startIndex + segment.length / constant_js_1.DEFAULT_CHUNK_SIZE >=
                numChunks) {
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