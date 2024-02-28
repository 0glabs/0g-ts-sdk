import { Iterator } from './Iterator.js';
export declare class BlobIterator implements Iterator {
    file: File | null;
    buf: Uint8Array;
    bufSize: number;
    fileSize: number;
    paddedSize: number;
    offset: number;
    batchSize: number;
    constructor(file: File, fileSize: number, offset: number, batch: number, flowPadding: boolean);
    static NewSegmentIterator(file: File, fileSize: number, offset: number, flowPadding: boolean): Iterator;
    readFromFile(start: number, end: number): Promise<{
        bytesRead: number;
        buffer: Uint8Array;
    }>;
    clearBuffer(): void;
    paddingZeros(length: number): void;
    next(): Promise<[boolean, Error | null]>;
    current(): Uint8Array;
}
//# sourceMappingURL=BlobIterator.d.ts.map