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
    checkExistence(root: string): Promise<boolean>;
    uploadFile(file: AbstractFile, segIndex: number | undefined, opts: UploadOption, retryOpts?: RetryOpts): Promise<[string, Error | null]>;
    waitForReceipt(provider: ethers.JsonRpcProvider, txHash: string, opts?: RetryOpts): Promise<ethers.TransactionReceipt | null>;
    waitForLogEntry(root: string, finalityRequired: boolean, receipt?: ethers.TransactionReceipt): Promise<void>;
    processTasksInParallel(file: AbstractFile, tree: MerkleTree, tasks: UploadTask[]): Promise<(number | Error)[]>;
    segmentUpload(file: AbstractFile, tree: MerkleTree, segIndex: number, opts: UploadOption): Promise<UploadTask[] | null>;
    uploadTask(file: AbstractFile, tree: MerkleTree, uploadTask: UploadTask): Promise<number | Error>;
}
//# sourceMappingURL=Uploader.d.ts.map