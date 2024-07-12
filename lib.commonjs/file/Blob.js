"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Blob = void 0;
const index_js_1 = require("./Iterator/index.js");
const AbstractFile_js_1 = require("./AbstractFile.js");
class Blob extends AbstractFile_js_1.AbstractFile {
    blob = null; // @see https://developer.mozilla.org/en-US/docs/Web/API/File/File
    fileSize = 0;
    constructor(blob) {
        super();
        this.blob = blob;
        this.fileSize = blob.size;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new index_js_1.BlobIterator(this.blob, this.size(), offset, batch, flowPadding);
    }
}
exports.Blob = Blob;
//# sourceMappingURL=Blob.js.map