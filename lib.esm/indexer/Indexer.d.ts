import { HttpProvider } from 'open-jsonrpc-provider';
import { ShardedNode } from '../node';
export declare class StorageKv extends HttpProvider {
    constructor(url: string);
    getValue(): Promise<ShardedNode[]>;
}
//# sourceMappingURL=Indexer.d.ts.map