import { ethers } from 'ethers';
export interface UploadTask {
    clientIndex: number;
    taskSize: number;
    segIndex: number;
    numShard: number;
}
export interface UploadOption {
    tags: ethers.BytesLike;
    finalityRequired: boolean;
    taskSize: number;
    expectedReplica: number;
    skipTx: boolean;
    fee: bigint;
}
//# sourceMappingURL=types.d.ts.map