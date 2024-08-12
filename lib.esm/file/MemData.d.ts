import { Iterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export declare class MemData extends AbstractFile {
    fileSize: number;
    data: ArrayLike<number>;
    constructor(data: ArrayLike<number>);
    iterateWithOffsetAndBatch(offset: number, batch: number, flowPadding: boolean): Iterator;
}
//# sourceMappingURL=MemData.d.ts.map