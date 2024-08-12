import { MemIterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export class MemData extends AbstractFile {
    fileSize = 0;
    data;
    constructor(data) {
        super();
        this.data = data;
        this.fileSize = data.length;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        const data = new Uint8Array(this.data);
        return new MemIterator(data, this.size(), offset, batch, flowPadding);
    }
}
//# sourceMappingURL=MemData.js.map