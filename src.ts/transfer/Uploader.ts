import {
    DEFAULT_SEGMENT_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_CHUNK_SIZE,
    TESTNET_FLOW_ADDRESS,
} from '../constant.js'
import { StorageNode, SegmentWithProof } from '../node/index.js'
import { Flow } from '../contracts/flow/Flow.js'
import { getFlowContract, WaitForReceipt } from '../utils.js'
import { RetryOpts } from '../types.js'
import { NHFile, NHMerkleTree } from '../file/index.js'
import { encodeBase64, ethers } from 'ethers'

export class Uploader {
    node: StorageNode
    provider: ethers.JsonRpcProvider
    flow: Flow
    signer: ethers.Wallet

    constructor(node: StorageNode, providerRpc: string, privateKey: string) {
        this.node = node

        this.provider = new ethers.JsonRpcProvider(providerRpc)
        this.signer = new ethers.Wallet(privateKey, this.provider)

        this.flow = getFlowContract(TESTNET_FLOW_ADDRESS, this.signer)
    }

    async uploadFile(
        file: NHFile,
        tag: ethers.BytesLike,
        segIndex: number = 0,
        opts: {} = {},
        retryOpts?: RetryOpts
    ): Promise<Error | null> {
        var [tree, err] = await file.merkleTree()
        if (err != null || tree == null || tree.rootHash() == null) {
            return err
        }

        const fileInfo = this.node.getFileInfo(tree.rootHash() as string)
        if (fileInfo != null) {
            return new Error('File already uploaded')
        }

        var [submission, err] = await file.createSubmission(tag)
        if (err != null || submission == null) {
            return err
        }

        let tx = await this.flow.submit(submission, opts)
        await tx.wait()

        let receipt = WaitForReceipt(this.provider, tx.hash, retryOpts)
        if (receipt == null) {
            return new Error('Failed to submit transaction')
        }

        return await this.uploadFileHelper(file, tree, segIndex)
    }

    async uploadFileHelper(
        file: NHFile,
        tree: NHMerkleTree,
        segIndex: number = 0
    ): Promise<Error | null> {
        const iter = file.iterateWithOffsetAndBatch(
            segIndex * DEFAULT_SEGMENT_SIZE,
            DEFAULT_SEGMENT_SIZE,
            true
        )
        const numChunks = file.numChunks()
        const fileSize = file.size()

        while (true) {
            let [ok, err] = await iter.next()
            if (err) {
                return new Error('Failed to read segment')
            }

            if (!ok) {
                break
            }

            let segment = iter.current()
            const proof = tree.proofAt(segIndex)

            const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS
            let allDataUploaded = false

            if (startIndex >= numChunks) {
                break
            } else if (
                startIndex + segment.length / DEFAULT_CHUNK_SIZE >=
                numChunks
            ) {
                const expectedLen =
                    DEFAULT_CHUNK_SIZE * (numChunks - startIndex)
                segment = segment.slice(0, expectedLen)
                allDataUploaded = true
            }

            const segWithProof: SegmentWithProof = {
                root: tree.rootHash() as string,
                data: encodeBase64(segment),
                index: segIndex,
                proof: proof,
                fileSize,
            }

            try {
                await this.node.uploadSegment(segWithProof) // todo check error
            } catch (e) {
                return e as Error
            }

            if (allDataUploaded) {
                break
            }

            segIndex++
        }

        return null
    }
}
