import { HttpProvider } from 'open-jsonrpc-provider'
import { Bytes } from '@ethersproject/bytes'
import { Hash, KeyValue, Value } from './types'

export class StorageKv extends HttpProvider {
    constructor(url: string) {
        super({ url })
    }

    async getValue(
        streamId: Hash,
        key: Bytes,
        startIndex: number,
        length: number,
        version?: number
    ): Promise<Value> {
        var params = [streamId, key, startIndex, length]
        if (version !== undefined) {
            params.push(version)
        }
        const res = await super.request({
            method: 'kv_getValue',
            params: params,
        })
        return res as Value
    }

    async GetNext(
        streamId: Hash,
        key: Bytes,
        startIndex: number,
        length: number,
        inclusive: boolean,
        version?: number
    ): Promise<KeyValue> {
        var params = [streamId, key, startIndex, length, inclusive]
        if (version !== undefined) {
            params.push(version)
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
        version?: number
    ): Promise<KeyValue> {
        var params = [streamId, key, startIndex, length, inclusive]
        if (version !== undefined) {
            params.push(version)
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
        version?: number
    ): Promise<KeyValue> {
        var params = [streamId, startIndex, length]
        if (version !== undefined) {
            params.push(version)
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
        version?: number
    ): Promise<KeyValue> {
        var params = [streamId, startIndex, length]
        if (version !== undefined) {
            params.push(version)
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
        version?: number
    ): Promise<boolean> {
        var params: (Hash | Bytes | number)[] = [account, streamId, key]
        if (version !== undefined) {
            params.push(version)
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
        version?: number
    ): Promise<boolean> {
        var params: (Hash | number)[] = [account, streamId]
        if (version !== undefined) {
            params.push(version)
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
        version?: number
    ): Promise<boolean> {
        var params: (Bytes | number)[] = [stremId, key]
        if (version !== undefined) {
            params.push(version)
        }
        const res = await super.request({
            method: 'kv_isSpecialKey',
            params: params,
        })
        return res as boolean
    }
}
