import { FileHandle } from 'node:fs/promises';
import { Iterator } from './Iterator/index.js';
import { AbstractFile } from './AbstractFile.js';
export declare class ZgFile extends AbstractFile {
    fd: FileHandle | null;
    fileSize: number;
    constructor(fd: FileHandle, fileSize: number);
    static fromNodeFileHandle(fd: FileHandle): Promise<ZgFile>;
    static fromFilePath(path: string): Promise<ZgFile>;
    close(): Promise<void>;
    iterateWithOffsetAndBatch(offset: number, batch: number, flowPadding: boolean): Iterator;
}
//# sourceMappingURL=ZgFile.d.ts.map