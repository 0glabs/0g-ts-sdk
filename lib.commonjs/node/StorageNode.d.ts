import { HttpProvider } from 'open-jsonrpc-provider';
import { FileInfo, FlowProof, Segment, SegmentWithProof, Status } from './types.js';
import { Hash } from '../types.js';
import { ShardConfig } from '../common/types.js';
export declare class StorageNode extends HttpProvider {
    constructor(url: string);
    getStatus(): Promise<Status>;
    uploadSegment(seg: SegmentWithProof): Promise<number>;
    uploadSegments(segs: SegmentWithProof[]): Promise<number>;
    uploadSegmentByTxSeq(seg: SegmentWithProof, txSeq: number): Promise<number>;
    uploadSegmentsByTxSeq(segs: SegmentWithProof[], txSeq: number): Promise<number>;
    downloadSegment(root: Hash, startIndex: number, endIndx: number): Promise<Segment>;
    downloadSegmentWithProof(root: Hash, index: number): Promise<SegmentWithProof>;
    downloadSegmentByTxSeq(txSeq: number, startIndex: number, endIndex: number): Promise<Segment>;
    downloadSegmentWithProofByTxSeq(txSeq: number, index: number): Promise<SegmentWithProof>;
    getSectorProof(sectorIndex: number, root: Hash): Promise<FlowProof>;
    getFileInfo(root: Hash, needAvailable: boolean): Promise<FileInfo | null>;
    getFileInfoByTxSeq(txSeq: number): Promise<FileInfo | null>;
    getShardConfig(): Promise<ShardConfig>;
}
//# sourceMappingURL=StorageNode.d.ts.map