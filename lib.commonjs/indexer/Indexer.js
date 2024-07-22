"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageKv = void 0;
const open_jsonrpc_provider_1 = require("open-jsonrpc-provider");
class StorageKv extends open_jsonrpc_provider_1.HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getValue() {
        const res = await super.request({
            method: 'indexer_getNodes',
        });
        return res;
    }
}
exports.StorageKv = StorageKv;
//# sourceMappingURL=Indexer.js.map