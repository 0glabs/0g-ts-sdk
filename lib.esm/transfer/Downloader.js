import fs from 'fs';
import { DEFAULT_SEGMENT_MAX_CHUNKS, DEFAULT_CHUNK_SIZE } from '../constant.js';
import { GetSplitNum, checkExist } from '../utils.js';
import { decodeBase64 } from 'ethers';
import { getShardConfigs } from './utils.js';
export class Downloader {
    nodes;
    shardConfigs;
    startSegmentIndex;
    endSegmentIndex;
    constructor(nodes) {
        this.nodes = nodes;
        this.shardConfigs = [];
        this.startSegmentIndex = 0;
        this.endSegmentIndex = 0;
    }
    async downloadFile(root, filePath, proof) {
        var [info, err] = await this.queryFile(root);
        if (err != null || info === null) {
            return new Error(err?.message);
        }
        if (!info.finalized) {
            return new Error('File not finalized');
        }
        if (checkExist(filePath)) {
            return new Error('Wrong path, provide a file path which does not exist.');
        }
        let shardConfigs = await getShardConfigs(this.nodes);
        if (shardConfigs === null) {
            return new Error('Failed to get shard configs');
        }
        this.shardConfigs = shardConfigs;
        err = await this.downloadFileHelper(filePath, info, proof);
        return err;
    }
    async queryFile(root) {
        let fileInfo = null;
        for (let node of this.nodes) {
            const currInfo = await node.getFileInfo(root, true);
            if (currInfo === null) {
                return [null, new Error('File not found on node ' + node.url)];
            }
            else if (fileInfo === null) {
                fileInfo = currInfo;
            }
        }
        return [fileInfo, null];
    }
    // TODO: add proof check
    async downloadTask(info, segmentOffset, taskInd, numChunks, proof) {
        const segmentIndex = segmentOffset + taskInd;
        const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
        var endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS;
        if (endIndex > numChunks) {
            endIndex = numChunks;
        }
        let segment = null;
        for (let i = 0; i < this.shardConfigs.length; i++) {
            let nodeIndex = (taskInd + i) % this.shardConfigs.length;
            if ((this.startSegmentIndex + segmentIndex) %
                this.shardConfigs[nodeIndex].numShard !=
                this.shardConfigs[nodeIndex].shardId) {
                continue;
            }
            // try download from current node
            segment = await this.nodes[nodeIndex].downloadSegmentByTxSeq(info.tx.seq, startIndex, endIndex);
            if (segment === null) {
                continue;
            }
            var segArray = decodeBase64(segment);
            if (this.startSegmentIndex + segmentIndex == this.endSegmentIndex) {
                const lastChunkSize = info.tx.size % DEFAULT_CHUNK_SIZE;
                if (lastChunkSize > 0) {
                    const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize;
                    segArray = segArray.slice(0, segArray.length - paddings);
                }
            }
            return [segArray, null];
        }
        return [
            new Uint8Array(),
            new Error('No storage node holds segment with index ' + segmentIndex),
        ];
    }
    async downloadFileHelper(filePath, info, proof) {
        const shardConfigs = await getShardConfigs(this.nodes);
        if (shardConfigs == null) {
            return new Error('Failed to get shard configs');
        }
        const segmentOffset = 0;
        const numChunks = GetSplitNum(info.tx.size, DEFAULT_CHUNK_SIZE);
        this.startSegmentIndex = Math.floor(info.tx.startEntryIndex / DEFAULT_SEGMENT_MAX_CHUNKS);
        this.endSegmentIndex = Math.floor((info.tx.startEntryIndex +
            GetSplitNum(info.tx.size, DEFAULT_CHUNK_SIZE) -
            1) /
            DEFAULT_SEGMENT_MAX_CHUNKS);
        const numTasks = this.endSegmentIndex - this.startSegmentIndex + 1;
        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
            let [segArray, err] = await this.downloadTask(info, segmentOffset, taskInd, numChunks, proof);
            if (err != null) {
                return err;
            }
            fs.appendFileSync(filePath, segArray);
        }
        return null;
    }
}
//# sourceMappingURL=Downloader.js.map