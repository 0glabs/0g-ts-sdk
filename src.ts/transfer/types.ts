import { ethers } from 'ethers'

export interface UploadTask {
    clientIndex: number
    segIndex: number
    numShard: number
}

export interface UploadOption {
    tags: ethers.BytesLike // transaction tags
    finalityRequired: boolean // wait for file finalized on uploaded nodes or not
    taskSize: number // number of segment to upload in single rpc request
    expectedReplica: number // expected number of replications
    skipTx: boolean // skip sending transaction on chain, this can set to true only if the data has already settled on chain before
}
