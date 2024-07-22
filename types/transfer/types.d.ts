import { ethers } from 'ethers';
export interface UploadTask {
    clientIndex: number;
    segIndex: number;
    numShard: number;
}
export interface UploadOption {
    tags: ethers.BytesLike;
    finalityRequired: boolean;
    taskSize: number;
}
//# sourceMappingURL=types.d.ts.map