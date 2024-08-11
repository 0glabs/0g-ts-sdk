import { MemIterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export class ZgFile extends AbstractFile {
    fileSize = 0;
    constructor(data) {
        super();
        this.fileSize = data.length;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new MemIterator(new Uint8Array(0), this.size(), offset, batch, flowPadding);
    }
}
//# sourceMappingURL=MemData.js.map