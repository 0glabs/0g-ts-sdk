"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KvClient = void 0;
const index_js_1 = require("../node/index.js");
const iterator_js_1 = require("./iterator.js");
const constants_js_1 = require("./constants.js");
const ethers_1 = require("ethers");
class KvClient {
    inner;
    constructor(rpc) {
        const client = new index_js_1.StorageKv(rpc);
        this.inner = client;
    }
    newIterator(streamId, version) {
        return new iterator_js_1.KvIterator(this, streamId, version);
    }
    async getValue(streamId, key, version) {
        let val = {
            data: [],
            size: 0,
            version: version || 0,
        };
        while (true) {
            const seg = await this.inner.getValue(streamId, key, val.data.length, constants_js_1.MAX_QUERY_SIZE, version);
            if (seg === undefined) {
                return null;
            }
            if (val.version == Number.MAX_SAFE_INTEGER) {
                val.version = seg.version;
            }
            else if (val.version != seg.version) {
                val.version = seg.version;
                val.data = [];
            }
            val.size = seg.size;
            const data = ethers_1.ethers.concat([
                new Uint8Array(val.data),
                new Uint8Array(seg.data),
            ]);
            val.data = ethers_1.ethers.toUtf8Bytes(data);
            if (seg.size == val.data.length) {
                return val;
            }
        }
    }
    async get(streamId, key, startIndex, length, version) {
        return this.inner.getValue(streamId, key, startIndex, length, version);
    }
    async getNext(streamId, key, startIndex, length, inclusive, version) {
        return this.inner.getNext(streamId, key, startIndex, length, inclusive, version);
    }
    async getPrev(streamId, key, startIndex, length, inclusive, version) {
        return this.inner.getPrev(streamId, key, startIndex, length, inclusive, version);
    }
    async getFirst(streamId, startIndex, length, version) {
        return this.inner.getFirst(streamId, startIndex, length, version);
    }
    async getLast(streamId, startIndex, length, version) {
        return this.inner.getLast(streamId, startIndex, length, version);
    }
    async getTransactionResult(txSeq) {
        return this.inner.getTransactionResult(txSeq);
    }
    async getHoldingStreamIds() {
        return this.inner.getHoldingStreamIds();
    }
    async hasWritePermission(account, streamId, key, version) {
        return this.inner.hasWritePermission(account, streamId, key, version);
    }
    async isAdmin(account, streamId, version) {
        return this.inner.isAdmin(account, streamId, version);
    }
    async isSpecialKey(streamId, key, version) {
        return this.inner.isSpecialKey(streamId, key, version);
    }
    async isWriterOfKey(account, streamId, key, version) {
        return this.inner.isWriterOfKey(account, streamId, key, version);
    }
    async isWriterOfStream(account, streamId, version) {
        return this.inner.isWriterOfStream(account, streamId, version);
    }
}
exports.KvClient = KvClient;
//# sourceMappingURL=client.js.map