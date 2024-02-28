import { FileHandle } from "node:fs/promises";
import { BlobIterator } from "./BlobIterator.js";

export class NodeFdIterator extends BlobIterator {
    fd: FileHandle | null = null; // node file descriptor

    constructor(fd: FileHandle, fileSize: number, offset: number, batch: number, flowPadding: boolean) {
        super(null as any, fileSize, offset, batch, flowPadding);
        this.fd = fd;
    }

    // override BlobIterator.readFromFile
    async readFromFile(start: number, end: number): Promise<{bytesRead: number, buffer: Uint8Array}> {
        if (start < 0 || start >= this.fileSize) {
            throw new Error("invalid start offset");
        }
        if (end > this.fileSize) {
            end = this.fileSize;
        }
        const res = await this.fd?.read({
            buffer: this.buf,
            offset: this.bufSize,
            length: end - start,
            position: start
        });
        return res as {bytesRead: number, buffer: Uint8Array};
    }

}