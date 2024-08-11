import { Iterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
import { Bytes } from '@ethersproject/bytes';
export declare class ZgFile extends AbstractFile {
    fileSize: number;
    constructor(data: Bytes);
    iterateWithOffsetAndBatch(offset: number, batch: number, flowPadding: boolean): Iterator;
}
//# sourceMappingURL=MemData.d.ts.map