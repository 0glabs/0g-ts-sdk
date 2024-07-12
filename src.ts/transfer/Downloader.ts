import fs from 'fs'
import {
    DEFAULT_SEGMENT_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_CHUNK_SIZE,
} from '../constant.js'
import { GetSplitNum, checkExist } from '../utils.js'
import { StorageNode, Segment } from '../node/index.js'
import { decodeBase64 } from 'ethers'
import { Hash } from '../types.js'

export class Downloader {
    node: StorageNode

    constructor(node: StorageNode) {
        this.node = node
    }

    async downloadFileHelper(
        root: Hash,
        filePath: string,
        size: number,
        proof: boolean
    ): Promise<Error | null> {
        const segmentOffset = 0
        const numChunks = GetSplitNum(size, DEFAULT_CHUNK_SIZE)
        const numSegments = GetSplitNum(size, DEFAULT_SEGMENT_SIZE)
        const numTasks = numSegments - segmentOffset

        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
            const segmentIndex = segmentOffset + taskInd
            const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS
            var endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS
            if (endIndex > numChunks) {
                endIndex = numChunks
            }

            var segment: Segment = await this.node.downloadSegment(
                root,
                startIndex,
                endIndex
            )
            var segArray = decodeBase64(segment)

            if (segment == null) {
                return new Error('Failed to download segment')
            }

            if (segmentIndex == numSegments - 1) {
                const lastChunkSize = size % DEFAULT_CHUNK_SIZE
                if (lastChunkSize > 0) {
                    const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize
                    segArray = segArray.slice(0, segArray.length - paddings)
                }
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
        const info = await this.node.getFileInfo(root)
        if (info == null) {
            return new Error('File not found')
        }
        if (!info.finalized) {
            return new Error('File not finalized')
        }

        if (checkExist(filePath)) {
            return new Error(
                'Wrong path, provide a file path which does not exist.'
            )
        }

        let err = await this.downloadFileHelper(
            root,
            filePath,
            info.tx.size,
            proof
        )

        return err
    }
}
