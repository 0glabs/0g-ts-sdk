import { HttpProvider } from 'open-jsonrpc-provider'

import { FileInfo, Segment, SegmentWithProof, Status } from './types.js'
import { Hash } from '../types.js'
import { ShardConfig } from '../common/types.js'

export class StorageNode extends HttpProvider {
    constructor(url: string) {
        super({ url })
    }

    async getStatus(): Promise<Status> {
        const res = await super.request({ method: 'zgs_getStatus' })
        return res as Status
    }

    async uploadSegment(seg: SegmentWithProof): Promise<number> {
        const res = await super.request({
            method: 'zgs_uploadSegment',
            params: [seg],
        })
        return res as number
    }

    async uploadSegments(segs: SegmentWithProof[]): Promise<number> {
        const res = await super.request({
            method: 'zgs_uploadSegments',
            params: [segs],
        })
        return res as number
    }

    async downloadSegment(
        root: Hash,
        startIndex: number,
        endIndx: number
    ): Promise<Segment> {
        var seg = await super.request({
            method: 'zgs_downloadSegment',
            params: [root, startIndex, endIndx],
        })
        return seg as Segment
    }

    async downloadSegmentWithProof(
        root: Hash,
        index: number
    ): Promise<SegmentWithProof> {
        const seg = await super.request({
            method: 'zgs_downloadSegmentWithProof',
            params: [root, index],
        })
        return seg as SegmentWithProof
    }

    async getFileInfo(root: Hash): Promise<FileInfo | null> {
        const info = await super.request({
            method: 'zgs_getFileInfo',
            params: [root],
        })
        return info as FileInfo | null
    }

    async getFileInfoByTxSeq(txSeq: number): Promise<FileInfo | null> {
        const info = await super.request({
            method: 'zgs_getFileInfoByTxSeq',
            params: [txSeq],
        })
        return info as FileInfo | null
    }

    async getShardConfig(): Promise<ShardConfig> {
        const config = await super.request({
            method: 'zgs_getShardConfig',
        })
        return config as ShardConfig
    }
}
