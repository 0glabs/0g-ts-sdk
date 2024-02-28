import { Iterator } from "./Iterator/index.js";
import { AbstractFile } from "./AbstractFile.js";
export declare class NHBlob extends AbstractFile {
    blob: File | null;
    fileSize: number;
    constructor(blob: File);
    iterateWithOffsetAndBatch(offset: number, batch: number, flowPadding: boolean): Iterator;
}
//# sourceMappingURL=NHBlob.d.ts.map