import { BlobIterator } from "./BlobIterator.js";
export class NodeFdIterator extends BlobIterator {
    fd = null; // node file descriptor
    constructor(fd, fileSize, offset, batch, flowPadding) {
        super(null, fileSize, offset, batch, flowPadding);
        this.fd = fd;
    }
    // override BlobIterator.readFromFile
    async readFromFile(start, end) {
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
        return res;
    }
}
//# sourceMappingURL=NodeIterator.js.map