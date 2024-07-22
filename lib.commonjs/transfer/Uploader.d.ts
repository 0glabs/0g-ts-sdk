import { StorageNode } from '../node/index.js';
import { Flow } from '../contracts/flow/Flow.js';
import { RetryOpts } from '../types.js';
import { ZgFile, MerkleTree } from '../file/index.js';
import { ethers } from 'ethers';
import { UploadOption, UploadTask } from './types.js';
export declare class Uploader {
    nodes: StorageNode[];
    provider: ethers.JsonRpcProvider;
    flow: Flow;
    signer: ethers.Wallet;
    opts: UploadOption;
    constructor(nodes: StorageNode[], providerRpc: string, privateKey: string, opts?: UploadOption);
    uploadFile(file: ZgFile, tag: ethers.BytesLike, segIndex?: number, opts?: {}, retryOpts?: RetryOpts): Promise<[string | null, Error | null]>;
    processTasksInParallel(file: ZgFile, tree: MerkleTree, tasks: UploadTask[]): Promise<void>;
    segmentUpload(file: ZgFile, tree: MerkleTree, segIndex: number): Promise<UploadTask[] | null>;
    uploadTask(file: ZgFile, tree: MerkleTree, uploadTask: UploadTask): Promise<number | Error>;
    uploadFileHelper(file: ZgFile, tree: MerkleTree, segIndex?: number): Promise<Error | null>;
}
//# sourceMappingURL=Uploader.d.ts.map