import { HttpProvider } from 'open-jsonrpc-provider';
export class StorageKv extends HttpProvider {
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
//# sourceMappingURL=Indexer.js.map