import { FileHandle } from "node:fs/promises";
import { BlobIterator } from "./BlobIterator.js";
export declare class NodeFdIterator extends BlobIterator {
    fd: FileHandle | null;
    constructor(fd: FileHandle, fileSize: number, offset: number, batch: number, flowPadding: boolean);
    readFromFile(start: number, end: number): Promise<{
        bytesRead: number;
        buffer: Uint8Array;
    }>;
}
//# sourceMappingURL=NodeIterator.d.ts.map