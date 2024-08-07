"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Uploader = void 0;
const constant_js_1 = require("../constant.js");
const utils_js_1 = require("../utils.js");
const ethers_1 = require("ethers");
const utils_js_2 = require("./utils.js");
class Uploader {
    nodes;
    provider;
    flow;
    signer;
    gasPrice;
    gasLimit;
    constructor(nodes, providerRpc, privateKey, flowContract, gasPrice = BigInt('0'), gasLimit = BigInt('0')) {
        this.nodes = nodes;
        this.provider = new ethers_1.ethers.JsonRpcProvider(providerRpc);
        this.signer = new ethers_1.ethers.Wallet(privateKey, this.provider);
        this.flow = (0, utils_js_1.getFlowContract)(flowContract, this.signer);
        this.gasPrice = gasPrice;
        this.gasLimit = gasLimit;
    }
    async uploadFile(file, segIndex = 0, opts, retryOpts) {
        var [tree, err] = await file.merkleTree();
        if (err != null || tree == null || tree.rootHash() == null) {
            return ['', new Error('Failed to create Merkle tree')];
        }
        const fileInfo = await this.nodes[0].getFileInfo(tree.rootHash());
        if (fileInfo != null) {
            return ['', new Error('File already exists')];
        }
        var [submission, err] = await file.createSubmission(opts.tags);
        if (err != null || submission == null) {
            return ['', new Error('Failed to create submission')];
        }
        let marketAddr = await this.flow.market();
        let marketContract = (0, utils_js_1.getMarketContract)(marketAddr, this.signer);
        let pricePerSector = await marketContract.pricePerSector();
        let fee = BigInt('0');
        if (opts.fee > 0) {
            fee = opts.fee;
        }
        else {
            fee = (0, utils_js_2.calculatePrice)(submission, pricePerSector);
        }
        var txOpts = { value: fee };
        if (this.gasPrice > 0) {
            txOpts.gasPrice = this.gasPrice;
        }
        if (this.gasLimit > 0) {
            txOpts.gasLimit = this.gasLimit;
        }
        console.log('Submitting transaction with fee:', fee);
        let tx = await this.flow.submit(submission, txOpts);
        await tx.wait();
        let receipt = (0, utils_js_1.WaitForReceipt)(this.provider, tx.hash, retryOpts);
        if (receipt == null) {
            return ['', new Error('Failed to get transaction receipt')];
        }
        const tasks = await this.segmentUpload(file, tree, segIndex, opts.taskSize);
        if (tasks == null) {
            return ['', new Error('Failed to get upload tasks')];
        }
        // await this.processTasksInParallel(file, tree, tasks)
        // .then(() => console.log('All tasks processed'))
        // .catch(error => {return error});
        await this.uploadFileHelper(file, tree, segIndex);
        return [tx.hash, null];
    }
    // Function to process all tasks in parallel
    async processTasksInParallel(file, tree, tasks) {
        const taskPromises = tasks.map(task => this.uploadTask(file, tree, task));
        await Promise.all(taskPromises);
    }
    async segmentUpload(file, tree, segIndex, taskSize) {
        const shardConfigs = await (0, utils_js_2.getShardConfigs)(this.nodes);
        if (shardConfigs == null) {
            return null;
        }
        const numSegments = file.numSegments();
        var uploadTasks = [];
        for (let clientIndex = 0; clientIndex < shardConfigs.length; clientIndex++) {
            // skip finalized nodes
            const info = await this.nodes[clientIndex].getFileInfo(tree.rootHash());
            if (info !== null && !info.finalized) {
                continue;
            }
            const shardConfig = shardConfigs[clientIndex];
            var tasks = [];
            var segIndex = shardConfig.shardId;
            while (segIndex < numSegments) {
                tasks.push({
                    clientIndex,
                    taskSize,
                    segIndex,
                    numShard: shardConfig.numShard,
                });
                segIndex += shardConfig.numShard * taskSize;
            }
            uploadTasks.push(tasks);
        }
        var tasks = [];
        if (uploadTasks.length > 0) {
            uploadTasks.sort((a, b) => a.length - b.length);
            for (let taskIndex = 0; taskIndex < uploadTasks[0].length; taskIndex += 1) {
                for (let i = 0; i < uploadTasks.length && taskIndex < uploadTasks[i].length; i += 1) {
                    tasks.push(uploadTasks[i][taskIndex]);
                }
            }
        }
        return tasks;
    }
    async uploadTask(file, tree, uploadTask) {
        const numChunks = file.numChunks();
        let segIndex = uploadTask.segIndex;
        let startSegIndex = segIndex;
        let allDataUploaded = false;
        var segments = [];
        for (let i = 0; i < uploadTask.taskSize; i += 1) {
            startSegIndex = segIndex * constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
            if (startSegIndex >= numChunks) {
                break;
            }
            const iter = file.iterateWithOffsetAndBatch(segIndex * constant_js_1.DEFAULT_SEGMENT_SIZE, constant_js_1.DEFAULT_SEGMENT_SIZE, true);
            let [ok, err] = await iter.next();
            if (err) {
                return new Error('Failed to read segment');
            }
            if (!ok) {
                break;
            }
            let segment = iter.current();
            const proof = tree.proofAt(segIndex);
            const startIndex = segIndex * constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
            if (startIndex >= numChunks) {
                break;
            }
            else if (startIndex + segment.length / constant_js_1.DEFAULT_CHUNK_SIZE >=
                numChunks) {
                const expectedLen = constant_js_1.DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
                segment = segment.slice(0, expectedLen);
                allDataUploaded = true;
            }
            const segWithProof = {
                root: tree.rootHash(),
                data: (0, ethers_1.encodeBase64)(segment),
                index: segIndex,
                proof: proof,
                fileSize: file.size(),
            };
            segments.push(segWithProof);
            if (allDataUploaded) {
                break;
            }
            segIndex += uploadTask.numShard;
        }
        try {
            return await this.nodes[uploadTask.clientIndex].uploadSegments(segments);
        }
        catch (e) {
            return e;
        }
    }
    async uploadFileHelper(file, tree, segIndex = 0) {
        const iter = file.iterateWithOffsetAndBatch(segIndex * constant_js_1.DEFAULT_SEGMENT_SIZE, constant_js_1.DEFAULT_SEGMENT_SIZE, true);
        const numChunks = file.numChunks();
        const fileSize = file.size();
        while (true) {
            let [ok, err] = await iter.next();
            if (err) {
                return new Error('Failed to read segment');
            }
            if (!ok) {
                break;
            }
            let segment = iter.current();
            const proof = tree.proofAt(segIndex);
            const startIndex = segIndex * constant_js_1.DEFAULT_SEGMENT_MAX_CHUNKS;
            let allDataUploaded = false;
            if (startIndex >= numChunks) {
                break;
            }
            else if (startIndex + segment.length / constant_js_1.DEFAULT_CHUNK_SIZE >=
                numChunks) {
                const expectedLen = constant_js_1.DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
                segment = segment.slice(0, expectedLen);
                allDataUploaded = true;
            }
            const segWithProof = {
                root: tree.rootHash(),
                data: (0, ethers_1.encodeBase64)(segment),
                index: segIndex,
                proof: proof,
                fileSize,
            };
            try {
                await this.nodes[0].uploadSegment(segWithProof); // todo check error
            }
            catch (e) {
                return e;
            }
            if (allDataUploaded) {
                break;
            }
            segIndex++;
        }
        return null;
    }
}
exports.Uploader = Uploader;
//# sourceMappingURL=Uploader.js.map