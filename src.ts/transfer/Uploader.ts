import {
    DEFAULT_SEGMENT_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_CHUNK_SIZE,
} from '../constant.js'
import { StorageNode, SegmentWithProof } from '../node/index.js'
import { FixedPriceFlow } from '../contracts/flow/FixedPriceFlow.js'
import { getFlowContract, getMarketContract, WaitForReceipt } from '../utils.js'
import { RetryOpts } from '../types.js'
import { MerkleTree } from '../file/index.js'
import { encodeBase64, ethers } from 'ethers'
import { calculatePrice, getShardConfigs } from './utils.js'
import { UploadOption, UploadTask } from './types.js'
import { AbstractFile } from '../file/AbstractFile.js'

export class Uploader {
    nodes: StorageNode[]
    provider: ethers.JsonRpcProvider
    flow: FixedPriceFlow
    signer: ethers.Wallet
    gasPrice: bigint
    gasLimit: bigint

    constructor(
        nodes: StorageNode[],
        providerRpc: string,
        signer: ethers.Wallet,
        flowContract: string,
        gasPrice: bigint = BigInt('0'),
        gasLimit: bigint = BigInt('0')
    ) {
        this.nodes = nodes

        this.provider = new ethers.JsonRpcProvider(providerRpc)
        this.signer = signer

        this.flow = getFlowContract(flowContract, this.signer)

        this.gasPrice = gasPrice
        this.gasLimit = gasLimit
    }

    async uploadFile(
        file: AbstractFile,
        segIndex: number = 0,
        opts: UploadOption,
        retryOpts?: RetryOpts
    ): Promise<[string, Error | null]> {
        var [tree, err] = await file.merkleTree()
        if (err != null || tree == null || tree.rootHash() == null) {
            return ['', new Error('Failed to create Merkle tree')]
        }

        const fileInfo = await this.nodes[0].getFileInfo(
            tree.rootHash() as string
        )
        if (fileInfo != null) {
            return ['', new Error('File already exists')]
        }

        var [submission, err] = await file.createSubmission(opts.tags)
        if (err != null || submission == null) {
            return ['', new Error('Failed to create submission')]
        }

        let marketAddr = await this.flow.market()
        let marketContract = getMarketContract(marketAddr, this.signer)

        let pricePerSector = await marketContract.pricePerSector()

        let fee: bigint = BigInt('0')
        if (opts.fee > 0) {
            fee = opts.fee
        } else {
            fee = calculatePrice(submission, pricePerSector)
        }

        var txOpts: { value: bigint; gasPrice?: bigint; gasLimit?: bigint } = {
            value: fee,
        }
        if (this.gasPrice > 0) {
            txOpts.gasPrice = this.gasPrice
        }
        if (this.gasLimit > 0) {
            txOpts.gasLimit = this.gasLimit
        }

        console.log('Submitting transaction with fee:', fee)

        let tx = await this.flow.submit(submission, txOpts)
        await tx.wait()

        let receipt = WaitForReceipt(this.provider, tx.hash, retryOpts)
        if (receipt == null) {
            return ['', new Error('Failed to get transaction receipt')]
        }

        const tasks = await this.segmentUpload(
            file,
            tree,
            segIndex,
            opts.taskSize
        )
        if (tasks == null) {
            return ['', new Error('Failed to get upload tasks')]
        }

        await this.processTasksInParallel(file, tree, tasks)
            .then(() => console.log('All tasks processed'))
            .catch((error) => {
                return error
            })
        // await this.uploadFileHelper(file, tree, segIndex)

        return [tx.hash, null]
    }

    // Function to process all tasks in parallel
    async processTasksInParallel(
        file: AbstractFile,
        tree: MerkleTree,
        tasks: UploadTask[]
    ): Promise<void> {
        const taskPromises = tasks.map((task) =>
            this.uploadTask(file, tree, task)
        )
        await Promise.all(taskPromises)
    }

    async segmentUpload(
        file: AbstractFile,
        tree: MerkleTree,
        segIndex: number,
        taskSize: number
    ): Promise<UploadTask[] | null> {
        const shardConfigs = await getShardConfigs(this.nodes)
        if (shardConfigs == null) {
            return null
        }
        const numSegments = file.numSegments()
        var uploadTasks: UploadTask[][] = []

        for (
            let clientIndex = 0;
            clientIndex < shardConfigs.length;
            clientIndex++
        ) {
            // skip finalized nodes
            const info = await this.nodes[clientIndex].getFileInfo(
                tree.rootHash() as string
            )
            if (info !== null && !info.finalized) {
                continue
            }

            const shardConfig = shardConfigs[clientIndex]
            var tasks: UploadTask[] = []
            var segIndex = shardConfig.shardId
            while (segIndex < numSegments) {
                tasks.push({
                    clientIndex,
                    taskSize,
                    segIndex,
                    numShard: shardConfig.numShard,
                })
                segIndex += shardConfig.numShard * taskSize
            }
            uploadTasks.push(tasks)
        }

        var tasks: UploadTask[] = []
        if (uploadTasks.length > 0) {
            uploadTasks.sort((a, b) => a.length - b.length)
            for (
                let taskIndex = 0;
                taskIndex < uploadTasks[0].length;
                taskIndex += 1
            ) {
                for (
                    let i = 0;
                    i < uploadTasks.length && taskIndex < uploadTasks[i].length;
                    i += 1
                ) {
                    tasks.push(uploadTasks[i][taskIndex])
                }
            }
        }
        return tasks
    }

    async uploadTask(
        file: AbstractFile,
        tree: MerkleTree,
        uploadTask: UploadTask
    ) {
        const numChunks = file.numChunks()

        let segIndex = uploadTask.segIndex
        let startSegIndex = segIndex
        let allDataUploaded = false
        var segments: SegmentWithProof[] = []
        for (let i = 0; i < uploadTask.taskSize; i += 1) {
            startSegIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS
            if (startSegIndex >= numChunks) {
                break
            }

            const iter = file.iterateWithOffsetAndBatch(
                segIndex * DEFAULT_SEGMENT_SIZE,
                DEFAULT_SEGMENT_SIZE,
                true
            )

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
                fileSize: file.size(),
            }

            segments.push(segWithProof)
            if (allDataUploaded) {
                break
            }

            segIndex += uploadTask.numShard
        }

        try {
            return await this.nodes[uploadTask.clientIndex].uploadSegments(
                segments
            )
        } catch (e) {
            return e as Error
        }
    }

    async uploadFileHelper(
        file: AbstractFile,
        tree: MerkleTree,
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
                await this.nodes[0].uploadSegment(segWithProof) // todo check error
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
