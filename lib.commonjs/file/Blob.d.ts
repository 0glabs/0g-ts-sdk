import { Iterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export declare class Blob extends AbstractFile {
    blob: File | null;
    fileSize: number;
    constructor(blob: File);
    iterateWithOffsetAndBatch(offset: number, batch: number, flowPadding: boolean): Iterator;
}
//# sourceMappingURL=Blob.d.ts.map