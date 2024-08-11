import { numSplits, computePaddedSize, } from "../utils.js";
import { DEFAULT_CHUNK_SIZE, } from '../../constant.js';
export class MemIterator {
    dataArray = null; // browser file
    buf;
    bufSize = 0; // buffer content size
    fileSize;
    paddedSize; // total size including padding zeros
    offset = 0;
    batchSize;
    constructor(data, fileSize, offset, batch, flowPadding) {
        if (batch % DEFAULT_CHUNK_SIZE > 0) {
            throw new Error("batch size should align with chunk size");
        }
        const buf = new Uint8Array(batch);
        const chunks = numSplits(fileSize, DEFAULT_CHUNK_SIZE);
        let paddedSize;
        if (flowPadding) {
            const [paddedChunks,] = computePaddedSize(chunks);
            paddedSize = paddedChunks * DEFAULT_CHUNK_SIZE;
        }
        else {
            paddedSize = chunks * DEFAULT_CHUNK_SIZE;
        }
        this.dataArray = data;
        this.buf = buf;
        this.fileSize = fileSize;
        this.paddedSize = paddedSize;
        this.batchSize = batch;
        this.offset = offset;
    }
    async readFromFile(start, end) {
        if (start < 0 || start >= this.fileSize) {
            throw new Error("invalid start offset");
        }
        if (end > this.fileSize) {
            end = this.fileSize;
        }
        const buf = this.dataArray?.slice(start, end);
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
    paddingZeros(length) {
        const startOffset = this.bufSize;
        this.buf = this.buf.fill(0, startOffset, startOffset + length);
        this.bufSize += length;
        this.offset += length;
    }
    async next() {
        if (this.offset < 0 || this.offset >= this.paddedSize) {
            return [false, null];
        }
        let expectedBufSize;
        let maxAvailableLength = this.paddedSize - this.offset; // include padding zeros
        if (maxAvailableLength >= this.batchSize) {
            expectedBufSize = this.batchSize;
        }
        else {
            expectedBufSize = maxAvailableLength;
        }
        this.clearBuffer();
        if (this.offset >= this.fileSize) {
            this.paddingZeros(expectedBufSize);
            return [true, null];
        }
        const { bytesRead: n, buffer } = await this.readFromFile(this.offset, this.offset + this.batchSize);
        this.buf = buffer;
        this.bufSize = n;
        this.offset += n;
        // not reach EOF
        if (n === expectedBufSize) {
            return [true, null];
        }
        if (n > expectedBufSize) {
            // should never happen
            throw new Error("load more data from file than expected");
        }
        if (expectedBufSize > n) {
            this.paddingZeros(expectedBufSize - n);
        }
        return [true, null];
    }
    current() {
        return this.buf.subarray(0, this.bufSize);
    }
}
//# sourceMappingURL=MemIterator.js.map