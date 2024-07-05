import { Bytes } from "@ethersproject/bytes";
import { HttpProvider } from "open-jsonrpc-provider";
import { AbstractFile } from "./file/AbstractFile.js";
export type Hash = string;
export type Base64 = string;
export type Segment = Base64;
export type MerkleNode = [number, Hash];
export interface Status {
    connectedPeers: number;
}
export interface FileProof {
    lemma: Hash[];
    path: boolean[];
}
export interface SegmentWithProof {
    root: Hash;
    data: Base64;
    index: number;
    proof: FileProof;
    fileSize: number;
}
export interface Transaction {
    streamIds: BigInt[];
    data: Bytes;
    dataMerkleRoot: Hash;
    merkleNodes: MerkleNode[];
    startEntryIndex: number;
    size: number;
    seq: number;
}
export interface FileInfo {
    tx: Transaction;
    finalized: boolean;
    isCached: boolean;
    uploadedSegNum: number;
}
export interface Metadata {
    root: Hash;
    fileSize: number;
    offsite: number;
}
export declare class NHProvider extends HttpProvider {
    constructor(url: string);
    getStatus(): Promise<Status>;
    uploadSegment(seg: SegmentWithProof): Promise<number>;
    uploadSegments(segs: SegmentWithProof[]): Promise<number>;
    downloadSegment(root: Hash, startIndex: number, endIndx: number): Promise<Segment>;
    downloadSegmentWithProof(root: Hash, index: number): Promise<SegmentWithProof>;
    getFileInfo(root: Hash): Promise<FileInfo | null>;
    getFileInfoByTxSeq(txSeq: number): Promise<FileInfo | null>;
    downloadFileHelper(root: Hash, filePath: string, size: number, proof: boolean): Promise<Error | null>;
    uploadFile(file: AbstractFile, segIndex?: number): Promise<Error | null>;
    downloadFile(root: Hash, filePath: string, proof: boolean): Promise<Error | null>;
}
//# sourceMappingURL=NHProvider.d.ts.map