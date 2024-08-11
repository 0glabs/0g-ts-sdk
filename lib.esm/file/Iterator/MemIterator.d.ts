import { Iterator } from './Iterator.js';
export declare class MemIterator implements Iterator {
    dataArray: Uint8Array | null;
    buf: Uint8Array;
    bufSize: number;
    fileSize: number;
    paddedSize: number;
    offset: number;
    batchSize: number;
    constructor(data: Uint8Array, fileSize: number, offset: number, batch: number, flowPadding: boolean);
    readFromFile(start: number, end: number): Promise<{
        bytesRead: number;
        buffer: Uint8Array;
    }>;
    clearBuffer(): void;
    paddingZeros(length: number): void;
    next(): Promise<[boolean, Error | null]>;
    current(): Uint8Array;
}
//# sourceMappingURL=MemIterator.d.ts.map