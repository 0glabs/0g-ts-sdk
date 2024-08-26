import { StreamDataBuilder } from './builder.js';
import { FixedPriceFlow } from '../contracts/flow/index.js';
import { StorageNode } from '../node/index.js';
import { UploadOption } from '../transfer/index.js';
export declare class Batcher {
    streamDataBuilder: StreamDataBuilder;
    clients: StorageNode[];
    flow: FixedPriceFlow;
    blockchainRpc: string;
    constructor(version: bigint, clients: StorageNode[], flow: FixedPriceFlow, provider: string);
    exec(opts: UploadOption): void;
}
//# sourceMappingURL=batcher.d.ts.map