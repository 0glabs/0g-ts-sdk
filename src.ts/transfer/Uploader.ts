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
import { getShardConfig } from './utils.js'
import { UploadOption, UploadTask } from './types.js'

export class Uploader {
    nodes: StorageNode[]
    provider: ethers.JsonRpcProvider
    flow: Flow
    signer: ethers.Wallet
    opts: UploadOption

    constructor(
        nodes: StorageNode[],
        providerRpc: string,
        privateKey: string,
        opts?: UploadOption
    ) {
        this.nodes = nodes

        this.provider = new ethers.JsonRpcProvider(providerRpc)
        this.signer = new ethers.Wallet(privateKey, this.provider)

        this.flow = getFlowContract(TESTNET_FLOW_ADDRESS, this.signer)
        this.opts = opts || {
            tags: '0x',
            finalityRequired: true,
            taskSize: 10,
        }
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

        const fileInfo = await this.nodes[0].getFileInfo(
            tree.rootHash() as string
        )
        console.log('fileInfo', fileInfo)
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
        
        const tasks = await this.segmentUpload(file, tree, segIndex)
        if (tasks == null) {
            return new Error('Failed to get upload tasks')
        }

        this.processTasksInParallel(file, tree, tasks)
        .then(() => console.log('All tasks processed'))
        .catch(error => {return error});

        return null;
    }

    // Function to process all tasks in parallel
    async processTasksInParallel(file: NHFile, tree: NHMerkleTree, tasks: UploadTask[]): Promise<void> {
        const taskPromises = tasks.map(task => this.uploadTask(file, tree, task));
        await Promise.all(taskPromises);
    }

    async segmentUpload(file: NHFile, tree: NHMerkleTree, segIndex: number): Promise<UploadTask[] | null> {
        const shardConfigs = await getShardConfig(this.nodes)
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
                    segIndex,
                    numShard: shardConfig.numShard,
                })
                segIndex += shardConfig.numShard * this.opts.taskSize
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

    async uploadTask(file: NHFile, tree: NHMerkleTree, uploadTask: UploadTask) {
        const numChunks = file.numChunks()

        let segIndex = uploadTask.segIndex
        let startSegIndex = segIndex
        let allDataUploaded = false
        var segments: SegmentWithProof[] = []
        for (let i = 0; i < this.opts.taskSize; i += 1) {
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
            return await this.nodes[uploadTask.clientIndex].uploadSegments(segments)
        } catch (e) {
            return e as Error
        }
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
