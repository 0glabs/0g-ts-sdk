import { Bytes } from '@ethersproject/bytes';
import { KeyValue, StorageKv, Value } from '../node/index.js';
export declare class Iterator {
    client: StorageKv;
    streamId: string;
    version: bigint;
    currentPair: KeyValue | undefined;
    constructor(client: StorageKv, streamId: string, version?: bigint);
    valid(): boolean;
    getCurrentPair(): KeyValue | undefined;
    getValue(streamId: string, key: Bytes, version?: bigint): Promise<Value | null>;
    move(kv: KeyValue): Promise<Error | null>;
}
//# sourceMappingURL=iterator.d.ts.map