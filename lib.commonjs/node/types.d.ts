import { Bytes } from "@ethersproject/bytes";
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
/**
 * StorageKV types
 */
export interface Value {
    version: number;
    data: Bytes;
    size: number;
}
export interface KeyValue {
    version: number;
    data: Bytes;
    size: number;
    key: Bytes;
}
//# sourceMappingURL=types.d.ts.map