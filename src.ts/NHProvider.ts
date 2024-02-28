import { Bytes } from "@ethersproject/bytes";
import { encodeBase64 } from "ethers";
import { HttpProvider } from "open-jsonrpc-provider";
import { AbstractFile } from "./file/AbstractFile.js";
import { 
    DEFAULT_SEGMENT_SIZE, 
    DEFAULT_SEGMENT_MAX_CHUNKS, 
    DEFAULT_CHUNK_SIZE,
} from "./constant.js";

export type Hash = string;

export type Base64 = string;

export type Segment = Base64;

export type MerkleNode = [number, Hash];

export interface Status {
    connectedPeers: number;
}

// can direct use NeuraProof
export interface FileProof {
    lemma: Hash[];
    path: boolean[];
}

export interface SegmentWithProof {
    root: Hash;
    data: Base64;
    index: number;
    proof: FileProof;
    fileSize: number;
}

export interface Transaction {
    streamIds: BigInt[];
    data: Bytes;  // Vec<u8>
    dataMerkleRoot: Hash;
    merkleNodes: MerkleNode[];
    startEntryIndex: number;
    size: number;
    seq: number;
}

export interface FileInfo {
    tx: Transaction;
    finalized: boolean;
    isCached: boolean;
    uploadedSegNum: number;
}

export class NHProvider extends HttpProvider {
  constructor(url: string) {
    super({url});
  }

  async getStatus(): Promise<Status> {
    const res = await super.request({method: 'nrhv_getStatus'});
    return res as Status;
  }

  async uploadSegment(seg: SegmentWithProof): Promise<void> {
    super.request({
        method: 'nrhv_uploadSegment',
        params: [seg],
    });
  }

  async downloadSegment(root: Hash, startIndex: number, endIndx: number): Promise<Segment> {
    const seg = await super.request({
        method: 'nrhv_downloadSegment',
        params: [root, startIndex, endIndx],
    });
    return seg as Segment;
  }

  async downloadSegmentWithProof(root: Hash, index: number): Promise<SegmentWithProof> {
    const seg = await super.request({
        method: 'nrhv_downloadSegmentWithProof',
        params: [root, index],
    });
    return seg as SegmentWithProof;
  }

  async getFileInfo(root: Hash): Promise<FileInfo|null> {
    const info = await super.request({
        method: 'nrhv_getFileInfo',
        params: [root],
    });
    return info as FileInfo|null;
  }

  async getFileInfoByTxSeq(txSeq: number): Promise<FileInfo|null> {
    const info = await super.request({
        method: 'getFileInfoByTxSeq',
        params: [txSeq],
    });
    return info as FileInfo|null;
  }

  async uploadFile(file: AbstractFile, segIndex: number = 0): Promise<Error|null> {
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
        const iter = file.iterateWithOffsetAndBatch(segIndex* DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_SIZE, true);
        const numChunks = file.numChunks();
        const fileSize = file.size();
        
        while(true) {
            let [ok, err] = await iter.next();
            if(err) {
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
                await this.uploadSegment(segWithProof); // todo check error
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