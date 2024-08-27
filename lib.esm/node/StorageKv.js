import { HttpProvider } from 'open-jsonrpc-provider';
export class StorageKv extends HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getValue(streamId, key, startIndex, length, version) {
        let params = [streamId, key, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getValue',
            params: params,
        });
        return res;
    }
    async getNext(streamId, key, startIndex, length, inclusive, version) {
        let params = [streamId, key, startIndex, length, inclusive];
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
        let params = [streamId, key, startIndex, length, inclusive];
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
        let params = [streamId, startIndex, length];
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
        let params = [streamId, startIndex, length];
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
            params: [txSeq.toString()],
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
        let params = [account, streamId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_hasWritePermission',
            params: params,
        });
        return res;
    }
    async isAdmin(account, streamId, version) {
        let params = [account, streamId];
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
        let params = [stremId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isSpecialKey',
            params: params,
        });
        return res;
    }
    async isWriterOfKey(account, streamId, key, version) {
        let params = [account, streamId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isWriterOfKey',
            params: params,
        });
        return res;
    }
    async isWriterOfStream(account, streamId, version) {
        let params = [account, streamId];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isWriterOfStream',
            params: params,
        });
        return res;
    }
}
//# sourceMappingURL=StorageKv.js.map