import { AbstractFile } from "../file/AbstractFile.js";
import { StorageNode } from "../node/index.js";
export declare class Uploader {
    node: StorageNode;
    constructor(node: StorageNode);
    uploadFile(file: AbstractFile, segIndex?: number): Promise<Error | null>;
}
//# sourceMappingURL=Uploader.d.ts.map