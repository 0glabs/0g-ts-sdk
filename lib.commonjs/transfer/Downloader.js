"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Downloader = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const constant_js_1 = require("../constant.js");
const utils_js_1 = require("../utils.js");
const ethers_1 = require("ethers");
class Downloader {
    node;
    constructor(node) {
        this.node = node;
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
            var segment = await this.node.downloadSegment(root, startIndex, endIndex);
            var segArray = (0, ethers_1.decodeBase64)(segment);
            if (segment == null) {
                return new Error('Failed to download segment');
            }
            if (segmentIndex == numSegments - 1) {
                const lastChunkSize = size % constant_js_1.DEFAULT_CHUNK_SIZE;
                if (lastChunkSize > 0) {
                    const paddings = constant_js_1.DEFAULT_CHUNK_SIZE - lastChunkSize;
                    segArray = segArray.slice(0, segArray.length - paddings);
                }
            }
            fs_1.default.appendFileSync(filePath, segArray);
        }
        return null;
    }
    async downloadFile(root, filePath, proof) {
        const info = await this.node.getFileInfo(root);
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
exports.Downloader = Downloader;
//# sourceMappingURL=Downloader.js.map