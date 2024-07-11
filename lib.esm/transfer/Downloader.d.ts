import { StorageNode } from '../node/index.js';
import { Hash } from '../node/types.js';
export declare class Downloader {
    node: StorageNode;
    constructor(node: StorageNode);
    downloadFileHelper(root: Hash, filePath: string, size: number, proof: boolean): Promise<Error | null>;
    downloadFile(root: Hash, filePath: string, proof: boolean): Promise<Error | null>;
}
//# sourceMappingURL=Downloader.d.ts.map