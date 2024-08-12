import fs from 'fs'
import {
    DEFAULT_SEGMENT_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_CHUNK_SIZE,
} from '../constant.js'
import { GetSplitNum, checkExist } from '../utils.js'
import { StorageNode, Segment, FileInfo } from '../node/index.js'
import { decodeBase64 } from 'ethers'
import { Hash } from '../types.js'
import { getShardConfigs } from './utils.js'
import { ShardConfig } from '../common/index.js'

export class Downloader {
    nodes: StorageNode[]
    shardConfigs: ShardConfig[]

    constructor(nodes: StorageNode[]) {
        this.nodes = nodes
        this.shardConfigs = []
    }

    // TODO: add proof check
    async downloadTask(
        root: Hash,
        size: number,
        segmentOffset: number,
        taskInd: number,
        numSegments: number,
        numChunks: number,
        proof: boolean
    ): Promise<[Uint8Array, Error | null]> {
        const segmentIndex = segmentOffset + taskInd
        const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS
        var endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS
        if (endIndex > numChunks) {
            endIndex = numChunks
        }
        let segment: Segment | null = null
        for (let i = 0; i < this.shardConfigs.length; i++) {
            let nodeIndex = (taskInd + i) % this.shardConfigs.length
            if (
                segmentIndex % this.shardConfigs[nodeIndex].numShard !=
                this.shardConfigs[nodeIndex].shardId
            ) {
                continue
            }
            // try download from current node
            segment = await this.nodes[nodeIndex].downloadSegment(
                root,
                startIndex,
                endIndex
            )

            if (segment === null) {
                continue
            }

            var segArray = decodeBase64(segment)

            if (segmentIndex == numSegments - 1) {
                const lastChunkSize = size % DEFAULT_CHUNK_SIZE
                if (lastChunkSize > 0) {
                    const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize
                    segArray = segArray.slice(0, segArray.length - paddings)
                }
            }
            return [segArray, null]
        }

        return [
            new Uint8Array(),
            new Error(
                'No storage node holds segment with index ' + segmentIndex
            ),
        ]
    }

    async downloadFileHelper(
        root: Hash,
        filePath: string,
        size: number,
        proof: boolean
    ): Promise<Error | null> {
        const shardConfigs = await getShardConfigs(this.nodes)
        if (shardConfigs == null) {
            return new Error('Failed to get shard configs')
        }

        const segmentOffset = 0
        const numChunks = GetSplitNum(size, DEFAULT_CHUNK_SIZE)
        const numSegments = GetSplitNum(size, DEFAULT_SEGMENT_SIZE)
        const numTasks = numSegments - segmentOffset

        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
            let [segArray, err] = await this.downloadTask(
                root,
                size,
                segmentOffset,
                taskInd,
                numSegments,
                numChunks,
                proof
            )
            if (err != null) {
                return err
            }
            fs.appendFileSync(filePath, segArray)
        }
        return null
    }

    async downloadFile(
        root: Hash,
        filePath: string,
        proof: boolean
    ): Promise<Error | null> {
        var [info, err] = await this.queryFile(root)
        if (err != null || info === null) {
            return new Error(err?.message)
        }
        if (!info.finalized) {
            return new Error('File not finalized')
        }

        if (checkExist(filePath)) {
            return new Error(
                'Wrong path, provide a file path which does not exist.'
            )
        }

        let shardConfigs = await getShardConfigs(this.nodes)
        if (shardConfigs === null) {
            return new Error('Failed to get shard configs')
        }
        this.shardConfigs = shardConfigs

        err = await this.downloadFileHelper(root, filePath, info.tx.size, proof)

        return err
    }

    async queryFile(root: string): Promise<[FileInfo | null, Error | null]> {
        let fileInfo: FileInfo | null = null
        for (let node of this.nodes) {
            const currInfo = await node.getFileInfo(root)
            if (currInfo === null) {
                return [null, new Error('File not found on node ' + node.url)]
            } else if (fileInfo === null) {
                fileInfo = currInfo
            }
        }

        return [fileInfo, null]
    }
}
