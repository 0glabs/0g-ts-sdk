import { HttpProvider } from 'open-jsonrpc-provider';
import { Bytes } from '@ethersproject/bytes';
import { KeyValue, Value } from './types';
import { Hash } from '../types';
export declare class StorageKv extends HttpProvider {
    constructor(url: string);
    getValue(streamId: Hash, key: Bytes, startIndex: number, length: number, version?: number): Promise<Value>;
    getNext(streamId: Hash, key: Bytes, startIndex: number, length: number, inclusive: boolean, version?: number): Promise<KeyValue>;
    getPrev(streamId: Hash, key: Bytes, startIndex: number, length: number, inclusive: boolean, version?: number): Promise<KeyValue>;
    getFirst(streamId: Hash, startIndex: number, length: number, version?: number): Promise<KeyValue>;
    getLast(streamId: Hash, startIndex: number, length: number, version?: number): Promise<KeyValue>;
    getTransactionResult(txSeq: number): Promise<string>;
    getHoldingStreamIds(): Promise<Hash[]>;
    hasWritePermission(account: Hash, streamId: Hash, key: Bytes, version?: number): Promise<boolean>;
    isAdmin(account: Hash, streamId: Hash, version?: number): Promise<boolean>;
    isSpecialKey(stremId: Hash, key: Bytes, version?: number): Promise<boolean>;
    isWriterOfKey(account: Hash, streamId: Hash, key: Bytes, version?: number): Promise<boolean>;
    isWriterOfStream(account: Hash, streamId: Hash, version?: number): Promise<boolean>;
}
//# sourceMappingURL=StorageKv.d.ts.map