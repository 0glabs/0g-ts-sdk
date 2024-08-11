import { Iterator } from './Iterator.js';
import { 
    numSplits, 
    computePaddedSize,
} from "../utils.js";
import {
    DEFAULT_CHUNK_SIZE, 
} from '../../constant.js';

export class MemIterator implements Iterator {
    dataArray: Uint8Array | null = null; // browser file
    buf: Uint8Array;
    bufSize: number = 0; // buffer content size
    fileSize: number;
    paddedSize: number; // total size including padding zeros
    offset: number = 0;
    batchSize: number;

    constructor(data: Uint8Array, fileSize: number, offset: number, batch: number, flowPadding: boolean) {
        if (batch % DEFAULT_CHUNK_SIZE > 0) {
            throw new Error("batch size should align with chunk size");
        }
    
        const buf = new Uint8Array(batch);
    
        const chunks = numSplits(fileSize, DEFAULT_CHUNK_SIZE);
        let paddedSize;
        if (flowPadding) {
            const [paddedChunks,]= computePaddedSize(chunks);
            paddedSize = paddedChunks * DEFAULT_CHUNK_SIZE;
        } else {
            paddedSize = chunks * DEFAULT_CHUNK_SIZE;
        }

        this.dataArray = data;
        this.buf = buf;
        this.fileSize = fileSize;
        this.paddedSize = paddedSize;
        this.batchSize = batch;
        this.offset = offset;
    }

    async readFromFile(start: number, end: number): Promise<{bytesRead: number, buffer: Uint8Array}> {
        if (start < 0 || start >= this.fileSize) {
            throw new Error("invalid start offset");
        }
        if (end > this.fileSize) {
            end = this.fileSize;
        }
        const buf = this.dataArray?.slice(start, end) as ArrayBuffer;
        const buffer = new Uint8Array(this.batchSize);
        buffer.set(new Uint8Array(buf));
        return {
            bytesRead: buf.byteLength,
            buffer
        };
    }

    clearBuffer() {
        this.bufSize = 0;
    }

    paddingZeros(length: number) {
        const startOffset = this.bufSize;
        this.buf = this.buf.fill(0, startOffset, startOffset + length);
        this.bufSize += length;
        this.offset += length;
    }

    async next(): Promise<[boolean, Error | null]> {
        if (this.offset < 0 || this.offset >= this.paddedSize) {
            return [false, null];
        }

        let expectedBufSize;
        let maxAvailableLength = this.paddedSize - this.offset;  // include padding zeros
        if (maxAvailableLength >= this.batchSize) {
            expectedBufSize = this.batchSize;
        } else {
            expectedBufSize = maxAvailableLength;
        }

        this.clearBuffer()

        if (this.offset >= this.fileSize) {
            this.paddingZeros(expectedBufSize);
            return [true, null];
        }

        const {bytesRead: n, buffer} = await this.readFromFile(this.offset, this.offset + this.batchSize);
        this.buf = buffer;

        this.bufSize = n;
        this.offset += n;

        // not reach EOF
        if (n === expectedBufSize) {
            return [true, null];
        }

        if (n > expectedBufSize) {
            // should never happen
            throw new Error("load more data from file than expected")
        }

        if (expectedBufSize > n) {
            this.paddingZeros(expectedBufSize - n);
        }

        return [true, null];
    }

    current(): Uint8Array {
        return this.buf.subarray(0, this.bufSize);
    }
}