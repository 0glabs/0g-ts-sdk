import { StorageNode, FileInfo } from '../node/index.js';
import { Hash } from '../types.js';
import { ShardConfig } from '../common/index.js';
export declare class Downloader {
    nodes: StorageNode[];
    shardConfigs: ShardConfig[];
    startSegmentIndex: number;
    endSegmentIndex: number;
    constructor(nodes: StorageNode[]);
    downloadFile(root: Hash, filePath: string, proof: boolean): Promise<Error | null>;
    queryFile(root: string): Promise<[FileInfo | null, Error | null]>;
    downloadTask(info: FileInfo, segmentOffset: number, taskInd: number, numChunks: number, proof: boolean): Promise<[Uint8Array, Error | null]>;
    downloadFileHelper(filePath: string, info: FileInfo, proof: boolean): Promise<Error | null>;
}
//# sourceMappingURL=Downloader.d.ts.map