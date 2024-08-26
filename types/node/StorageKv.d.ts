import { HttpProvider } from 'open-jsonrpc-provider';
import { Bytes } from '@ethersproject/bytes';
import { KeyValue, Value } from './types';
import { Hash } from '../types';
export declare class StorageKv extends HttpProvider {
    constructor(url: string);
    getValue(streamId: Hash, key: Bytes, startIndex: number, length: number, version?: bigint): Promise<Value>;
    getNext(streamId: Hash, key: Bytes, startIndex: number, length: number, inclusive: boolean, version?: bigint): Promise<KeyValue>;
    getPrev(streamId: Hash, key: Bytes, startIndex: number, length: number, inclusive: boolean, version?: bigint): Promise<KeyValue>;
    getFirst(streamId: Hash, startIndex: number, length: number, version?: bigint): Promise<KeyValue>;
    getLast(streamId: Hash, startIndex: number, length: number, version?: bigint): Promise<KeyValue>;
    getTransactionResult(txSeq: number): Promise<string>;
    getHoldingStreamIds(): Promise<Hash[]>;
    hasWritePermission(account: Hash, streamId: Hash, key: Bytes, version?: bigint): Promise<boolean>;
    IsAdmin(account: Hash, streamId: Hash, version?: bigint): Promise<boolean>;
    isSpecialKey(stremId: Bytes, key: Bytes, version?: bigint): Promise<boolean>;
}
//# sourceMappingURL=StorageKv.d.ts.map