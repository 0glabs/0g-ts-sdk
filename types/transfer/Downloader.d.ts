import { StorageNode, FileInfo } from '../node/index.js';
import { Hash } from '../types.js';
import { ShardConfig } from '../common/index.js';
export declare class Downloader {
    nodes: StorageNode[];
    shardConfigs: ShardConfig[];
    constructor(nodes: StorageNode[]);
    downloadTask(root: Hash, size: number, segmentOffset: number, taskInd: number, numSegments: number, numChunks: number, proof: boolean): Promise<[Uint8Array, Error | null]>;
    downloadFileHelper(root: Hash, filePath: string, size: number, proof: boolean): Promise<Error | null>;
    downloadFile(root: Hash, filePath: string, proof: boolean): Promise<Error | null>;
    queryFile(root: string): Promise<[FileInfo | null, Error | null]>;
}
//# sourceMappingURL=Downloader.d.ts.map