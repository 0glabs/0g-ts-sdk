import { AbstractFile } from "../file/AbstractFile.js";
import {
    DEFAULT_SEGMENT_SIZE,
    DEFAULT_SEGMENT_MAX_CHUNKS,
    DEFAULT_CHUNK_SIZE,
} from "../constant.js";
import { StorageNode } from "../node/index.js";
import { encodeBase64 } from "ethers";
import { SegmentWithProof } from "../node/types.js";

export class Uploader {
    node: StorageNode;

    constructor(node: StorageNode) {
        this.node = node;
    }

    async uploadFile(file: AbstractFile, segIndex: number = 0): Promise<Error | null> {
        const [tree, err] = await file.merkleTree();
        if (tree == null || err != null) {
            return err;
        }
        /*
            todo: check if file is already uploaded
            1. calculate root hash of file
            2. get file info by root hash
            3. check file is finalized
        */
        const iter = file.iterateWithOffsetAndBatch(segIndex * DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_SIZE, true);
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

            const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
            let allDataUploaded = false;

            if (startIndex >= numChunks) {
                break;
            } else if (startIndex + segment.length / DEFAULT_CHUNK_SIZE >= numChunks) {
                const expectedLen = DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
                segment = segment.slice(0, expectedLen);
                allDataUploaded = true;
            }

            const segWithProof: SegmentWithProof = {
                root: tree.rootHash() as string,
                data: encodeBase64(segment),
                index: segIndex,
                proof: proof,
                fileSize,
            };

            try {
                await this.node.uploadSegment(segWithProof); // todo check error
            } catch (e) {
                return e as Error;
            }

            if (allDataUploaded) {
                break;
            }

            segIndex++;
        }

        return null;
    }
}