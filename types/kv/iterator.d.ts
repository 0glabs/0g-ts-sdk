import { Bytes } from '@ethersproject/bytes';
import { KeyValue } from '../node/index.js';
import { KvClient } from './client.js';
export declare class KvIterator {
    client: KvClient;
    streamId: string;
    version: number | undefined;
    currentPair: KeyValue | undefined;
    constructor(client: KvClient, streamId: string, version?: number);
    valid(): boolean;
    getCurrentPair(): KeyValue | undefined;
    move(kv: KeyValue): Promise<Error | null>;
    seekBefore(key: Bytes): Promise<Error | null>;
    seekAfter(key: Bytes): Promise<Error | null>;
    seekToFirst(): Promise<Error | null>;
    seekToLast(): Promise<Error | null>;
    next(): Promise<Error | null>;
    prev(): Promise<Error | null>;
}
//# sourceMappingURL=iterator.d.ts.map