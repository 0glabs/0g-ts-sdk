"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageKv = void 0;
const open_jsonrpc_provider_1 = require("open-jsonrpc-provider");
class StorageKv extends open_jsonrpc_provider_1.HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getValue(streamId, key, startIndex, length, version) {
        var params = [streamId, key, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getValue',
            params: params,
        });
        return res;
    }
    async GetNext(streamId, key, startIndex, length, inclusive, version) {
        var params = [streamId, key, startIndex, length, inclusive];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getNext',
            params: params,
        });
        return res;
    }
    async getPrev(streamId, key, startIndex, length, inclusive, version) {
        var params = [streamId, key, startIndex, length, inclusive];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getPrev',
            params: params,
        });
        return res;
    }
    async getFirst(streamId, startIndex, length, version) {
        var params = [streamId, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getFirst',
            params: params,
        });
        return res;
    }
    async getLast(streamId, startIndex, length, version) {
        var params = [streamId, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getLast',
            params: params,
        });
        return res;
    }
    async getTransactionResult(txSeq) {
        const res = await super.request({
            method: 'kv_getTransactionResult',
            params: [txSeq],
        });
        return res;
    }
    async getHoldingStreamIds() {
        const res = await super.request({
            method: 'kv_getHoldingStreamIds',
        });
        return res;
    }
    async hasWritePermission(account, streamId, key, version) {
        var params = [account, streamId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_hasWritePermission',
            params: params,
        });
        return res;
    }
    async IsAdmin(account, streamId, version) {
        var params = [account, streamId];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_IsAdmin',
            params: params,
        });
        return res;
    }
    async isSpecialKey(stremId, key, version) {
        var params = [stremId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isSpecialKey',
            params: params,
        });
        return res;
    }
}
exports.StorageKv = StorageKv;
//# sourceMappingURL=StorageKv.js.map