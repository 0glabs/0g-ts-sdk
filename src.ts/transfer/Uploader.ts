import {
    DEFAULT_SEGMENT_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_CHUNK_SIZE,
} from '../constant.js'
import { StorageNode, SegmentWithProof } from '../node/index.js'
import { FixedPriceFlow } from '../contracts/flow/FixedPriceFlow.js'
import { delay, getMarketContract } from '../utils.js'
import { RetryOpts } from '../types.js'
import { MerkleTree } from '../file/index.js'
import { encodeBase64, ethers } from 'ethers'
import { calculatePrice, getShardConfigs } from './utils.js'
import { UploadOption, UploadTask } from './types.js'
import { AbstractFile } from '../file/AbstractFile.js'
import { checkReplica } from '../common/index.js'

export class Uploader {
    nodes: StorageNode[]
    provider: ethers.JsonRpcProvider
    flow: FixedPriceFlow
    gasPrice: bigint
    gasLimit: bigint

    constructor(
        nodes: StorageNode[],
        providerRpc: string,
        flow: FixedPriceFlow,
        gasPrice: bigint = BigInt('0'),
        gasLimit: bigint = BigInt('0')
    ) {
        this.nodes = nodes

        this.provider = new ethers.JsonRpcProvider(providerRpc)

        this.flow = flow

        this.gasPrice = gasPrice
        this.gasLimit = gasLimit
    }

    async checkExistence(root: string): Promise<boolean> {
        for (let client of this.nodes) {
            let info = await client.getFileInfo(root)
            if (info !== null && info.finalized) {
                return true
            }
        }

        return false
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

        console.log(
            'Data prepared to upload',
            'root=' + tree.rootHash(),
            'size=' + file.size(),
            'numSegments=' + file.numSegments(),
            'numChunks=' + file.numChunks()
        )

        const exist = await this.checkExistence(tree.rootHash() as string)
        if (exist) {
            return ['', new Error('Data already exists')]
        }

        var [submission, err] = await file.createSubmission(opts.tags)
        if (err !== null || submission === null) {
            return ['', new Error('Failed to create submission')]
        }

        let marketAddr = await this.flow.market()
        let marketContract = getMarketContract(marketAddr, this.provider)

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

        console.log('Submitting transaction with storage fee:', fee)

        let tx = await this.flow.submit(submission, txOpts)
        await tx.wait()

        let receipt = await this.waitForReceipt(
            this.provider,
            tx.hash,
            retryOpts
        )
        if (receipt === null) {
            return ['', new Error('Failed to get transaction receipt')]
        }

        console.log('Transaction hash:', tx.hash)

        await this.waitForLogEntry(tree.rootHash() as string, false, receipt)

        const tasks = await this.segmentUpload(file, tree, segIndex, opts)
        if (tasks === null) {
            return ['', new Error('Failed to get upload tasks')]
        }

        console.log(
            'Processing tasks in parallel with ',
            tasks.length,
            ' tasks...'
        )

        err = await this.processTasksInParallel(file, tree, tasks)
            .then(() => console.log('All tasks processed'))
            .catch((error) => {
                return error
            })
        // await this.uploadFileHelper(file, tree, segIndex)

        if (err !== null) {
            return ['', err]
        }

        return [tx.hash, null]
    }

    async waitForReceipt(
        provider: ethers.JsonRpcProvider,
        txHash: string,
        opts?: RetryOpts
    ): Promise<ethers.TransactionReceipt | null> {
        var receipt: ethers.TransactionReceipt | null = null

        if (opts === undefined) {
            opts = { Retries: 10, Interval: 5 }
        }

        let nTries = 0

        while (nTries < opts.Retries) {
            receipt = await provider.getTransactionReceipt(txHash)
            if (receipt !== null && receipt.status == 1) {
                return receipt
            }
            await delay(opts.Interval * 1000)
            nTries++
        }

        return null
    }

    async waitForLogEntry(
        root: string,
        finalityRequired: boolean,
        receipt?: ethers.TransactionReceipt
    ): Promise<void> {
        console.log('Wait for log entry on storage node')

        while (true) {
            await delay(1000)

            let ok = true
            for (let client of this.nodes) {
                let info = await client.getFileInfo(root)
                if (info === null) {
                    let logMsg = 'Log entry is unavailable yet'
                    if (receipt !== undefined) {
                        let status = await client.getStatus()
                        if (status !== null) {
                            const logSyncHeight = status.logSyncHeight
                            const txBlock = receipt.blockNumber
                            logMsg = `Log entry is unavailable yet, txBlock=${txBlock}, zgsNodeSyncHeight=${logSyncHeight}`
                        }
                    }
                    console.log(logMsg)
                    ok = false
                    break
                }

                if (finalityRequired && !info.finalized) {
                    console.log('Log entry is available, but not finalized yet')
                    ok = false
                    break
                }
            }

            if (ok) {
                break
            }
        }
    }

    // Function to process all tasks in parallel
    async processTasksInParallel(
        file: AbstractFile,
        tree: MerkleTree,
        tasks: UploadTask[]
    ): Promise<(number | Error)[]> {
        const taskPromises = tasks.map((task) =>
            this.uploadTask(file, tree, task)
        )
        return await Promise.all(taskPromises)
    }

    async segmentUpload(
        file: AbstractFile,
        tree: MerkleTree,
        segIndex: number,
        opts: UploadOption
    ): Promise<UploadTask[] | null> {
        const shardConfigs = await getShardConfigs(this.nodes)
        if (shardConfigs === null) {
            console.log('Failed to get shard configs')
            return null
        }

        if (!checkReplica(shardConfigs, opts.expectedReplica)) {
            console.log('Not enough replicas')
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
            if (info !== null && info.finalized) {
                continue
            }

            const shardConfig = shardConfigs[clientIndex]
            var tasks: UploadTask[] = []
            var segIndex = shardConfig.shardId
            while (segIndex < numSegments) {
                tasks.push({
                    clientIndex,
                    taskSize: opts.taskSize,
                    segIndex,
                    numShard: shardConfig.numShard,
                })
                segIndex += shardConfig.numShard * opts.taskSize
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
    ): Promise<number | Error> {
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

        let res = await this.nodes[uploadTask.clientIndex].uploadSegments(
            segments
        )

        if (res === null) {
            return new Error('Failed to upload segments')
        }

        return res
    }

    // async uploadFileHelper(
    //     file: AbstractFile,
    //     tree: MerkleTree,
    //     segIndex: number = 0
    // ): Promise<Error | null> {
    //     const iter = file.iterateWithOffsetAndBatch(
    //         segIndex * DEFAULT_SEGMENT_SIZE,
    //         DEFAULT_SEGMENT_SIZE,
    //         true
    //     )
    //     const numChunks = file.numChunks()
    //     const fileSize = file.size()

    //     while (true) {
    //         let [ok, err] = await iter.next()
    //         if (err) {
    //             return new Error('Failed to read segment')
    //         }

    //         if (!ok) {
    //             break
    //         }

    //         let segment = iter.current()
    //         const proof = tree.proofAt(segIndex)

    //         const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS
    //         let allDataUploaded = false

    //         if (startIndex >= numChunks) {
    //             break
    //         } else if (
    //             startIndex + segment.length / DEFAULT_CHUNK_SIZE >=
    //             numChunks
    //         ) {
    //             const expectedLen =
    //                 DEFAULT_CHUNK_SIZE * (numChunks - startIndex)
    //             segment = segment.slice(0, expectedLen)
    //             allDataUploaded = true
    //         }

    //         const segWithProof: SegmentWithProof = {
    //             root: tree.rootHash() as string,
    //             data: encodeBase64(segment),
    //             index: segIndex,
    //             proof: proof,
    //             fileSize,
    //         }

    //         try {
    //             await this.nodes[0].uploadSegment(segWithProof) // todo check error
    //         } catch (e) {
    //             return e as Error
    //         }

    //         if (allDataUploaded) {
    //             break
    //         }

    //         segIndex++
    //     }

    //     return null
    // }
}
