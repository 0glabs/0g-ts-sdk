import { BlobIterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export class Blob extends AbstractFile {
    blob = null; // @see https://developer.mozilla.org/en-US/docs/Web/API/File/File
    fileSize = 0;
    constructor(blob) {
        super();
        this.blob = blob;
        this.fileSize = blob.size;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new BlobIterator(this.blob, this.size(), offset, batch, flowPadding);
    }
}
//# sourceMappingURL=Blob.js.map