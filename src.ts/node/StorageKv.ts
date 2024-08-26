import { HttpProvider } from 'open-jsonrpc-provider'
import { Bytes } from '@ethersproject/bytes'
import { KeyValue, Value } from './types'
import { Hash } from '../types'

export class StorageKv extends HttpProvider {
    constructor(url: string) {
        super({ url })
    }

    async getValue(
        streamId: Hash,
        key: Bytes,
        startIndex: number,
        length: number,
        version?: bigint
    ): Promise<Value> {
        var params
        if (version === undefined) {
            params = [streamId, key, startIndex, length]
        } else {
            params = [streamId, key, startIndex, length, version]
        }

        const res = await super.request({
            method: 'kv_getValue',
            params: params,
        })
        return res as Value
    }

    async getNext(
        streamId: Hash,
        key: Bytes,
        startIndex: number,
        length: number,
        inclusive: boolean,
        version?: bigint
    ): Promise<KeyValue> {
        var params
        if (version === undefined) {
            params = [streamId, key, startIndex, length, inclusive]
        } else {
            params = [streamId, key, startIndex, length, inclusive, version]
        }
        const res = await super.request({
            method: 'kv_getNext',
            params: params,
        })
        return res as KeyValue
    }

    async getPrev(
        streamId: Hash,
        key: Bytes,
        startIndex: number,
        length: number,
        inclusive: boolean,
        version?: bigint
    ): Promise<KeyValue> {
        var params
        if (version === undefined) {
            params = [streamId, key, startIndex, length, inclusive]
        } else {
            params = [streamId, key, startIndex, length, inclusive, version]
        }
        const res = await super.request({
            method: 'kv_getPrev',
            params: params,
        })
        return res as KeyValue
    }

    async getFirst(
        streamId: Hash,
        startIndex: number,
        length: number,
        version?: bigint
    ): Promise<KeyValue> {
        var params
        if (version === undefined) {
            params = [streamId, startIndex, length]
        } else {
            params = [streamId, startIndex, length, version]
        }
        const res = await super.request({
            method: 'kv_getFirst',
            params: params,
        })
        return res as KeyValue
    }

    async getLast(
        streamId: Hash,
        startIndex: number,
        length: number,
        version?: bigint
    ): Promise<KeyValue> {
        var params
        if (version === undefined) {
            params = [streamId, startIndex, length]
        } else {
            params = [streamId, startIndex, length, version]
        }
        const res = await super.request({
            method: 'kv_getLast',
            params: params,
        })
        return res as KeyValue
    }

    async getTransactionResult(txSeq: number): Promise<string> {
        const res = await super.request({
            method: 'kv_getTransactionResult',
            params: [txSeq],
        })
        return res as string
    }

    async getHoldingStreamIds(): Promise<Hash[]> {
        const res = await super.request({
            method: 'kv_getHoldingStreamIds',
        })
        return res as Hash[]
    }

    async hasWritePermission(
        account: Hash,
        streamId: Hash,
        key: Bytes,
        version?: bigint
    ): Promise<boolean> {
        var params
        if (version === undefined) {
            params = [account, streamId, key]
        } else {
            params = [account, streamId, key, version]
        }
        const res = await super.request({
            method: 'kv_hasWritePermission',
            params: params,
        })
        return res as boolean
    }

    async IsAdmin(
        account: Hash,
        streamId: Hash,
        version?: bigint
    ): Promise<boolean> {
        var params
        if (version === undefined) {
            params = [account, streamId]
        } else {
            params = [account, streamId, version]
        }
        const res = await super.request({
            method: 'kv_IsAdmin',
            params: params,
        })
        return res as boolean
    }

    async isSpecialKey(
        stremId: Bytes,
        key: Bytes,
        version?: bigint
    ): Promise<boolean> {
        var params
        if (version === undefined) {
            params = [stremId, key]
        } else {
            params = [stremId, key, version]
        }
        const res = await super.request({
            method: 'kv_isSpecialKey',
            params: params,
        })
        return res as boolean
    }
}
