import { HttpProvider } from 'open-jsonrpc-provider'

import {
    FileInfo,
    FlowProof,
    Segment,
    SegmentWithProof,
    Status,
} from './types.js'
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

    // UploadSegmentByTxSeq Call zgs_uploadSegmentByTxSeq RPC to upload a segment to the node.
    async uploadSegmentByTxSeq(
        seg: SegmentWithProof,
        txSeq: number
    ): Promise<number> {
        const res = await super.request({
            method: 'zgs_uploadSegmentByTxSeq',
            params: [seg, txSeq],
        })
        return res as number
    }

    // UploadSegmentsByTxSeq Call zgs_uploadSegmentsByTxSeq RPC to upload a slice of segments to the node.
    async uploadSegmentsByTxSeq(
        segs: SegmentWithProof[],
        txSeq: number
    ): Promise<number> {
        const res = await super.request({
            method: 'zgs_uploadSegmentsByTxSeq',
            params: [segs, txSeq],
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
    // DownloadSegmentByTxSeq Call zgs_downloadSegmentByTxSeq RPC to download a segment from the node.
    async downloadSegmentByTxSeq(
        txSeq: number,
        startIndex: number,
        endIndex: number
    ): Promise<Segment> {
        const seg = await super.request({
            method: 'zgs_downloadSegmentByTxSeq',
            params: [txSeq, startIndex, endIndex],
        })
        return seg as Segment
    }

    // DownloadSegmentWithProofByTxSeq Call zgs_downloadSegmentWithProofByTxSeq RPC to download a segment along with its merkle proof from the node.
    async downloadSegmentWithProofByTxSeq(
        txSeq: number,
        index: number
    ): Promise<SegmentWithProof> {
        const seg = await super.request({
            method: 'zgs_downloadSegmentWithProofByTxSeq',
            params: [txSeq, index],
        })
        return seg as SegmentWithProof
    }

    // GetSectorProof Call zgs_getSectorProof RPC to get the proof of a sector.
    async getSectorProof(sectorIndex: number, root: Hash): Promise<FlowProof> {
        const seg = await super.request({
            method: 'zgs_getSectorProof',
            params: [sectorIndex, root],
        })
        return seg as FlowProof
    }

    async getFileInfo(
        root: Hash,
        needAvailable: boolean
    ): Promise<FileInfo | null> {
        const info = await super.request({
            method: 'zgs_getFileInfo',
            params: [root, needAvailable],
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
