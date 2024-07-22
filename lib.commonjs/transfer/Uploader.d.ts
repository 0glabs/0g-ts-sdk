import { StorageNode } from '../node/index.js';
import { Flow } from '../contracts/flow/Flow.js';
import { RetryOpts } from '../types.js';
import { NHFile, NHMerkleTree } from '../file/index.js';
import { ethers } from 'ethers';
import { UploadOption, UploadTask } from './types.js';
export declare class Uploader {
    nodes: StorageNode[];
    provider: ethers.JsonRpcProvider;
    flow: Flow;
    signer: ethers.Wallet;
    opts: UploadOption;
    constructor(nodes: StorageNode[], providerRpc: string, privateKey: string, opts?: UploadOption);
    uploadFile(file: NHFile, tag: ethers.BytesLike, segIndex?: number, opts?: {}, retryOpts?: RetryOpts): Promise<[string | null, Error | null]>;
    processTasksInParallel(file: NHFile, tree: NHMerkleTree, tasks: UploadTask[]): Promise<void>;
    segmentUpload(file: NHFile, tree: NHMerkleTree, segIndex: number): Promise<UploadTask[] | null>;
    uploadTask(file: NHFile, tree: NHMerkleTree, uploadTask: UploadTask): Promise<number | Error>;
    uploadFileHelper(file: NHFile, tree: NHMerkleTree, segIndex?: number): Promise<Error | null>;
}
//# sourceMappingURL=Uploader.d.ts.map