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
    gasPrice: bigint;
    gasLimit: bigint;
    constructor(nodes: StorageNode[], providerRpc: string, privateKey: string, flowContract: string, gasPrice?: bigint, gasLimit?: bigint);
    uploadFile(file: ZgFile, segIndex: number | undefined, opts: UploadOption, retryOpts?: RetryOpts): Promise<[string, Error | null]>;
    processTasksInParallel(file: ZgFile, tree: MerkleTree, tasks: UploadTask[]): Promise<void>;
    segmentUpload(file: ZgFile, tree: MerkleTree, segIndex: number, taskSize: number): Promise<UploadTask[] | null>;
    uploadTask(file: ZgFile, tree: MerkleTree, uploadTask: UploadTask): Promise<number | Error>;
    uploadFileHelper(file: ZgFile, tree: MerkleTree, segIndex?: number): Promise<Error | null>;
}
//# sourceMappingURL=Uploader.d.ts.map