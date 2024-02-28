"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeFdIterator = void 0;
const BlobIterator_js_1 = require("./BlobIterator.js");
class NodeFdIterator extends BlobIterator_js_1.BlobIterator {
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
exports.NodeFdIterator = NodeFdIterator;
//# sourceMappingURL=NodeIterator.js.map