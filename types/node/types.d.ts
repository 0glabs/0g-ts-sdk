import { Bytes } from '@ethersproject/bytes';
import { Base64, Hash } from '../types';
export type Segment = Base64;
export type MerkleNode = [number, Hash];
interface NetworkProtocolVersion {
    major: number;
    minor: number;
    build: number;
}
interface NetworkIdentity {
    chainId: number;
    flowAddress: string;
    p2pProtocolVersion: NetworkProtocolVersion;
}
export interface Status {
    connectedPeers: number;
    logSyncHeight: number;
    logSyncBlock: Hash;
    nextTxSeq: number;
    networkIdentity: NetworkIdentity;
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
    data: Base64;
    size: number;
}
export interface KeyValue {
    version: number;
    data: Base64;
    size: number;
    key: Bytes;
}
export interface FlowProof {
    lemma: Hash[];
    path: boolean[];
}
export {};
//# sourceMappingURL=types.d.ts.map