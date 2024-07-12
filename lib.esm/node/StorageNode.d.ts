import { HttpProvider } from 'open-jsonrpc-provider';
import { FileInfo, Hash, Segment, SegmentWithProof, Status } from './types.js';
export declare class StorageNode extends HttpProvider {
    constructor(url: string);
    getStatus(): Promise<Status>;
    uploadSegment(seg: SegmentWithProof): Promise<number>;
    uploadSegments(segs: SegmentWithProof[]): Promise<number>;
    downloadSegment(root: Hash, startIndex: number, endIndx: number): Promise<Segment>;
    downloadSegmentWithProof(root: Hash, index: number): Promise<SegmentWithProof>;
    getFileInfo(root: Hash): Promise<FileInfo | null>;
    getFileInfoByTxSeq(txSeq: number): Promise<FileInfo | null>;
}
//# sourceMappingURL=StorageNode.d.ts.map