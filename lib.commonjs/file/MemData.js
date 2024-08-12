"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemData = void 0;
const index_js_1 = require("./Iterator/index.js");
const AbstractFile_js_1 = require("./AbstractFile.js");
class MemData extends AbstractFile_js_1.AbstractFile {
    fileSize = 0;
    data;
    constructor(data) {
        super();
        this.data = data;
        this.fileSize = data.length;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        const data = new Uint8Array(this.data);
        return new index_js_1.MemIterator(data, this.size(), offset, batch, flowPadding);
    }
}
exports.MemData = MemData;
//# sourceMappingURL=MemData.js.map