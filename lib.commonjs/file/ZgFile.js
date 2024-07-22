"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZgFile = void 0;
const promises_1 = require("node:fs/promises");
const index_js_1 = require("./Iterator/index.js");
const AbstractFile_js_1 = require("./AbstractFile.js");
class ZgFile extends AbstractFile_js_1.AbstractFile {
    fd = null;
    fileSize = 0;
    constructor(fd, fileSize) {
        super();
        this.fd = fd;
        this.fileSize = fileSize;
    }
    static async fromNodeFileHandle(fd) {
        const stat = await fd.stat();
        return new ZgFile(fd, stat.size);
    }
    // NOTE: need manually close fd after use
    static async fromFilePath(path) {
        const fd = await (0, promises_1.open)(path, 'r'); // if fail, throw error
        return await ZgFile.fromNodeFileHandle(fd);
    }
    async close() {
        await this.fd?.close();
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new index_js_1.NodeFdIterator(this.fd, this.size(), offset, batch, flowPadding);
    }
}
exports.ZgFile = ZgFile;
//# sourceMappingURL=ZgFile.js.map