export function numSplits(total, unit) {
    return Math.floor((total - 1) / unit) + 1;
}
export function nextPow2(input) {
    let x = input;
    x -= 1;
    x |= x >> 32;
    x |= x >> 16;
    x |= x >> 8;
    x |= x >> 4;
    x |= x >> 2;
    x |= x >> 1;
    x += 1;
    return x;
}
export function computePaddedSize(chunks) {
    let chunksNextPow2 = nextPow2(chunks);
    if (chunksNextPow2 === chunks) {
        return [chunksNextPow2, chunksNextPow2];
    }
    let minChunk;
    if (chunksNextPow2 >= 16) {
        minChunk = Math.floor(chunksNextPow2 / 16);
    }
    else {
        minChunk = 1;
    }
    const paddedChunks = numSplits(chunks, minChunk) * minChunk;
    return [paddedChunks, chunksNextPow2];
}
//# sourceMappingURL=utils.js.map