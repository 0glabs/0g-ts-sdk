import { open } from 'node:fs/promises';
import { NodeFdIterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export class NHFile extends AbstractFile {
    fd = null;
    fileSize = 0;
    constructor(fd, fileSize) {
        super();
        this.fd = fd;
        this.fileSize = fileSize;
    }
    static async fromNodeFileHandle(fd) {
        const stat = await fd.stat();
        return new NHFile(fd, stat.size);
    }
    // NOTE: need manually close fd after use
    static async fromFilePath(path) {
        const fd = await open(path, 'r'); // if fail, throw error
        return await NHFile.fromNodeFileHandle(fd);
    }
    async close() {
        await this.fd?.close();
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new NodeFdIterator(this.fd, this.size(), offset, batch, flowPadding);
    }
}
//# sourceMappingURL=NHFile.js.map