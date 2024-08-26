import { StorageNode } from '../node/index.js';
import { FixedPriceFlow } from '../contracts/flow/FixedPriceFlow.js';
import { RetryOpts } from '../types.js';
import { MerkleTree } from '../file/index.js';
import { ethers } from 'ethers';
import { UploadOption, UploadTask } from './types.js';
import { AbstractFile } from '../file/AbstractFile.js';
export declare class Uploader {
    nodes: StorageNode[];
    provider: ethers.JsonRpcProvider;
    flow: FixedPriceFlow;
    gasPrice: bigint;
    gasLimit: bigint;
    constructor(nodes: StorageNode[], providerRpc: string, flow: FixedPriceFlow, gasPrice?: bigint, gasLimit?: bigint);
    uploadFile(file: AbstractFile, segIndex: number | undefined, opts: UploadOption, retryOpts?: RetryOpts): Promise<[string, Error | null]>;
    processTasksInParallel(file: AbstractFile, tree: MerkleTree, tasks: UploadTask[]): Promise<void>;
    segmentUpload(file: AbstractFile, tree: MerkleTree, segIndex: number, taskSize: number): Promise<UploadTask[] | null>;
    uploadTask(file: AbstractFile, tree: MerkleTree, uploadTask: UploadTask): Promise<number | Error>;
    uploadFileHelper(file: AbstractFile, tree: MerkleTree, segIndex?: number): Promise<Error | null>;
}
//# sourceMappingURL=Uploader.d.ts.map