/// <reference types="node" />
import { FileHandle } from "node:fs/promises";
import { Iterator } from "./Iterator/index.js";
import { AbstractFile } from "./AbstractFile.js";
export declare class NHFile extends AbstractFile {
    fd: FileHandle | null;
    fileSize: number;
    constructor(fd: FileHandle, fileSize: number);
    static fromNodeFileHandle(fd: FileHandle): Promise<NHFile>;
    static fromFilePath(path: string): Promise<NHFile>;
    close(): Promise<void>;
    iterateWithOffsetAndBatch(offset: number, batch: number, flowPadding: boolean): Iterator;
}
//# sourceMappingURL=NHFile.d.ts.map