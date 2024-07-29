import { HttpProvider } from 'open-jsonrpc-provider';
import { FileInfo, Segment, SegmentWithProof, Status } from './types.js';
import { Hash } from '../types.js';
import { ShardConfig } from '../common/types.js';
export declare class StorageNode extends HttpProvider {
    constructor(url: string);
    getStatus(): Promise<Status>;
    uploadSegment(seg: SegmentWithProof): Promise<number>;
    uploadSegments(segs: SegmentWithProof[]): Promise<number>;
    downloadSegment(root: Hash, startIndex: number, endIndx: number): Promise<Segment>;
    downloadSegmentWithProof(root: Hash, index: number): Promise<SegmentWithProof>;
    getFileInfo(root: Hash): Promise<FileInfo | null>;
    getFileInfoByTxSeq(txSeq: number): Promise<FileInfo | null>;
    getShardConfig(): Promise<ShardConfig>;
}
//# sourceMappingURL=StorageNode.d.ts.map