import { StorageNode } from '../node/index.js';
import { Flow } from '../contracts/flow/Flow.js';
import { RetryOpts } from '../types.js';
import { NHFile, NHMerkleTree } from '../file/index.js';
import { ethers } from 'ethers';
export declare class Uploader {
    node: StorageNode;
    provider: ethers.JsonRpcProvider;
    flow: Flow;
    signer: ethers.Wallet;
    constructor(node: StorageNode, providerRpc: string, privateKey: string);
    uploadFile(file: NHFile, tag: ethers.BytesLike, segIndex?: number, opts?: {}, retryOpts?: RetryOpts): Promise<Error | null>;
    uploadFileHelper(file: NHFile, tree: NHMerkleTree, segIndex?: number): Promise<Error | null>;
}
//# sourceMappingURL=Uploader.d.ts.map