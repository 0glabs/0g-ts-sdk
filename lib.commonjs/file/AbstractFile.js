"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractFile = void 0;
const MerkleTree_js_1 = require("./MerkleTree.js");
const constant_js_1 = require("../constant.js");
const utils_js_1 = require("./utils.js");
class AbstractFile {
    fileSize = 0;
    // constructor() {}
    // split a segment into chunks and compute the root hash
    static segmentRoot(segment, emptyChunksPadded = 0) {
        const tree = new MerkleTree_js_1.MerkleTree();
        const dataLength = segment.length;
        for (let offset = 0; offset < dataLength; offset += constant_js_1.DEFAULT_CHUNK_SIZE) {
            const chunk = segment.subarray(offset, offset + constant_js_1.DEFAULT_CHUNK_SIZE);
            tree.addLeaf(chunk);
        }
        if (emptyChunksPadded > 0) {
            for (let i = 0; i < emptyChunksPadded; i++) {
                tree.addLeafByHash(constant_js_1.EMPTY_CHUNK_HASH);
            }
        }
        tree.build();
        if (tree.root !== null) {
            return tree.rootHash();
        }
        return constant_js_1.ZERO_HASH; // TODO check this
    }
    size() {
        return this.fileSize;
    }
    iterate(flowPadding) {
        return this.iterateWithOffsetAndBatch(0, constant_js_1.DEFAULT_SEGMENT_SIZE, flowPadding);
    }
    async merkleTree() {
        const iter = this.iterate(true);
        const tree = new MerkleTree_js_1.MerkleTree();
        while (true) {
            let [ok, err] = await iter.next();
            if (err != null) {
                return [null, err];
            }
            if (!ok) {
                break;
            }
            const current = iter.current();
            const segRoot = AbstractFile.segmentRoot(current);
            tree.addLeafByHash(segRoot);
        }
        return [tree.build(), null];
    }
    numChunks() {
        return (0, utils_js_1.numSplits)(this.size(), constant_js_1.DEFAULT_CHUNK_SIZE);
    }
    numSegments() {
        return (0, utils_js_1.numSplits)(this.size(), constant_js_1.DEFAULT_SEGMENT_SIZE);
    }
    async createSubmission(tags) {
        const submission = {
            length: this.size(),
            tags: tags,
            nodes: [],
        };
        const nodes = this.splitNodes();
        let offset = 0;
        for (let chunks of nodes) {
            let [node, err] = await this.createNode(offset, chunks);
            if (err != null) {
                return [null, err];
            }
            submission.nodes.push(node);
            offset += chunks * constant_js_1.DEFAULT_CHUNK_SIZE;
        }
        return [submission, null];
    }
    splitNodes() {
        let nodes = [];
        let chunks = this.numChunks();
        let [paddedChunks, chunksNextPow2] = (0, utils_js_1.computePaddedSize)(chunks);
        let nextChunkSize = chunksNextPow2;
        while (paddedChunks > 0) {
            if (paddedChunks >= nextChunkSize) {
                paddedChunks -= nextChunkSize;
                nodes.push(nextChunkSize);
            }
            nextChunkSize /= 2;
        }
        return nodes;
    }
    async createNode(offset, chunks) {
        let batch = chunks;
        if (chunks > constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS) {
            batch = constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
        }
        return this.createSegmentNode(offset, constant_js_1.DEFAULT_CHUNK_SIZE * batch, constant_js_1.DEFAULT_CHUNK_SIZE * chunks);
    }
    async createSegmentNode(offset, batch, size) {
        const iter = this.iterateWithOffsetAndBatch(offset, batch, true);
        const tree = new MerkleTree_js_1.MerkleTree();
        for (let i = 0; i < size;) {
            let [ok, err] = await iter.next();
            if (err != null) {
                return [null, err];
            }
            if (!ok) {
                break;
            }
            const current = iter.current();
            const segRoot = AbstractFile.segmentRoot(current);
            tree.addLeafByHash(segRoot);
            i += current.length;
        }
        tree.build();
        const numChunks = size / constant_js_1.DEFAULT_CHUNK_SIZE;
        const height = Math.log2(numChunks);
        const node = {
            height: height,
            root: tree.rootHash(),
        };
        return [node, null];
    }
}
exports.AbstractFile = AbstractFile;
//# sourceMappingURL=AbstractFile.js.map