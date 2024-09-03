import { Bytes } from '@ethersproject/bytes';
import { KeyValue, StorageKv, Value } from '../node/index.js';
import { KvIterator } from './iterator.js';
export declare class KvClient {
    inner: StorageKv;
    constructor(rpc: string);
    newIterator(streamId: string, version?: number): KvIterator;
    getValue(streamId: string, key: Bytes, version?: number): Promise<Value | null>;
    get(streamId: string, key: Bytes, startIndex: number, length: number, version?: number): Promise<Value>;
    getNext(streamId: string, key: Bytes, startIndex: number, length: number, inclusive: boolean, version?: number): Promise<KeyValue>;
    getPrev(streamId: string, key: Bytes, startIndex: number, length: number, inclusive: boolean, version?: number): Promise<KeyValue>;
    getFirst(streamId: string, startIndex: number, length: number, version?: number): Promise<KeyValue>;
    getLast(streamId: string, startIndex: number, length: number, version?: number): Promise<KeyValue>;
    getTransactionResult(txSeq: number): Promise<string>;
    getHoldingStreamIds(): Promise<string[]>;
    hasWritePermission(account: string, streamId: string, key: Bytes, version?: number): Promise<boolean>;
    isAdmin(account: string, streamId: string, version?: number): Promise<boolean>;
    isSpecialKey(streamId: string, key: Bytes, version?: number): Promise<boolean>;
    isWriterOfKey(account: string, streamId: string, key: Bytes, version?: number): Promise<boolean>;
    isWriterOfStream(account: string, streamId: string, version?: number): Promise<boolean>;
}
//# sourceMappingURL=client.d.ts.map