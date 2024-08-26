"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamDataBuilder = void 0;
const ethers_1 = require("ethers");
const constants_1 = require("./constants");
const types_1 = require("./types");
class StreamDataBuilder {
    version;
    streamIds;
    controls;
    reads;
    writes;
    constructor(version) {
        this.version = version;
        this.streamIds = new Map();
        this.controls = [];
        this.reads = new Map();
        this.writes = new Map();
    }
    build(sorted = false) {
        const data = new types_1.StreamData(this.version);
        // controls
        data.Controls = this.buildAccessControl();
        // reads
        data.Reads = [];
        for (const [streamId, keys] of this.reads.entries()) {
            for (const k of keys.keys()) {
                const key = ethers_1.ethers.toUtf8Bytes(k);
                if (key.length > constants_1.MAX_KEY_SIZE) {
                    throw new Error('errKeyTooLarge');
                }
                if (key.length === 0) {
                    throw new Error('errKeyIsEmpty');
                }
                data.Reads.push({
                    StreamId: streamId,
                    Key: key,
                });
                if (data.Reads.length > constants_1.MAX_SET_SIZE) {
                    throw new Error('errSizeTooLarge');
                }
            }
        }
        // writes
        data.Writes = [];
        for (const [streamId, keys] of this.writes.entries()) {
            for (const [k, d] of keys.entries()) {
                const key = ethers_1.ethers.toUtf8Bytes(k);
                if (key.length > constants_1.MAX_KEY_SIZE) {
                    throw new Error('errKeyTooLarge');
                }
                if (key.length === 0) {
                    throw new Error('errKeyIsEmpty');
                }
                data.Writes.push({
                    StreamId: streamId,
                    Key: key,
                    Data: d,
                });
                if (data.Writes.length > constants_1.MAX_SET_SIZE) {
                    throw new Error('errSizeTooLarge');
                }
            }
        }
        if (sorted) {
            data.Reads.sort((a, b) => {
                const streamIdI = a.StreamId;
                const streamIdJ = b.StreamId;
                if (streamIdI === streamIdJ) {
                    return ethers_1.ethers.hexlify(a.Key) < ethers_1.ethers.hexlify(b.Key)
                        ? -1
                        : 1;
                }
                else {
                    return streamIdI < streamIdJ ? -1 : 1;
                }
            });
            data.Writes.sort((a, b) => {
                const streamIdI = a.StreamId;
                const streamIdJ = b.StreamId;
                if (streamIdI === streamIdJ) {
                    return ethers_1.ethers.hexlify(a.Key) < ethers_1.ethers.hexlify(b.Key)
                        ? -1
                        : 1;
                }
                else {
                    return streamIdI < streamIdJ ? -1 : 1;
                }
            });
        }
        return data;
    }
    addStreamId(streamId) {
        this.streamIds.set(streamId, true);
    }
    buildTags(sorted = false) {
        let ids = Array.from(this.streamIds.keys());
        if (sorted) {
            ids.sort((a, b) => (a < b ? -1 : 1));
        }
        return this.createTags(ids);
    }
    createTags(streamIds) {
        const result = new Uint8Array((1 + streamIds.length) * 32); // Assuming Hash is 32 bytes
        result.set(ethers_1.ethers.toUtf8Bytes(constants_1.StreamDomain), 0);
        streamIds.forEach((id, index) => {
            result.set(ethers_1.ethers.toUtf8Bytes(id), 32 * (index + 1));
        });
        return result;
    }
    buildAccessControl() {
        if (this.controls.length > constants_1.MAX_SET_SIZE) {
            throw new Error('errSizeTooLarge');
        }
        return this.controls;
    }
}
exports.StreamDataBuilder = StreamDataBuilder;
//# sourceMappingURL=builder.js.map