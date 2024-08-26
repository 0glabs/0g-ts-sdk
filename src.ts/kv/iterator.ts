import { Bytes } from '@ethersproject/bytes'
import { KeyValue, StorageKv, Value } from '../node/index.js'
import { MAX_QUERY_SIZE } from './constants.js'
import { ethers } from 'ethers'

const maxUint64 = BigInt('18446744073709551615')

export class Iterator {
    // client is the client to use for requests.
    client: StorageKv
    // streamId is the stream ID.
    streamId: string
    // version is the version of the stream.
    version: bigint
    // currentPair is the current key-value pair.
    currentPair: KeyValue | undefined

    // NewIterator creates an iterator.
    constructor(client: StorageKv, streamId: string, version?: bigint) {
        this.client = client
        this.streamId = streamId
        this.version = version || maxUint64
    }

    // Valid check if current position is exist
    public valid(): boolean {
        return this.currentPair !== undefined
    }

    public getCurrentPair(): KeyValue | undefined {
        return this.currentPair
    }

    public async getValue(
        streamId: string,
        key: Bytes,
        version?: bigint
    ): Promise<Value | null> {
        let val: Value = {
            data: [],
            size: 0,
            version: version || maxUint64,
        }

        while (true) {
            const seg = await this.client.getValue(
                streamId,
                key,
                val.data.length,
                MAX_QUERY_SIZE,
                val.version
            )
            if (seg === undefined) {
                return null
            }
            if (val.version == maxUint64) {
                val.version = seg.version
            } else if (val.version != seg.version) {
                val.version = seg.version
                val.data = []
            }
            val.size = seg.size
            const data = ethers.concat([
                new Uint8Array(val.data),
                new Uint8Array(seg.data),
            ])
            val.data = ethers.toUtf8Bytes(data)

            if (val.data.length == val.size) {
                return val
            }
        }
    }

    public async move(kv: KeyValue): Promise<Error | null> {
        if (kv === undefined) {
            this.currentPair = undefined
            return null
        }
        let value = await this.getValue(this.streamId, kv.key, kv.version)
        if (value === null) {
            return new Error('errValueNotFound')
        }
        this.currentPair = {
            key: kv.key,
            data: value.data,
            size: value.size,
            version: kv.version,
        }
        return null
    }
}
