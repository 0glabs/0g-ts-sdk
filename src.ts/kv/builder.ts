import { ethers } from 'ethers'
import { MAX_KEY_SIZE, MAX_SET_SIZE, StreamDomain } from './constants'
import { AccessControl, StreamData } from './types'

// Assuming common.Hash is equivalent to string (hex string) in TypeScript
type Hash = string

export class StreamDataBuilder {
    version: bigint
    streamIds: Map<Hash, boolean>
    controls: AccessControl[]
    reads: Map<Hash, Map<string, boolean>>
    writes: Map<Hash, Map<string, Uint8Array>>

    constructor(version: bigint) {
        this.version = version
        this.streamIds = new Map<Hash, boolean>()
        this.controls = []
        this.reads = new Map<Hash, Map<string, boolean>>()
        this.writes = new Map<Hash, Map<string, Uint8Array>>()
    }

    public build(sorted: boolean = false): StreamData {
        const data: StreamData = new StreamData(this.version)

        // controls
        data.Controls = this.buildAccessControl()

        // reads
        data.Reads = []
        for (const [streamId, keys] of this.reads.entries()) {
            for (const k of keys.keys()) {
                const key = ethers.toUtf8Bytes(k)
                if (key.length > MAX_KEY_SIZE) {
                    throw new Error('errKeyTooLarge')
                }
                if (key.length === 0) {
                    throw new Error('errKeyIsEmpty')
                }
                data.Reads.push({
                    StreamId: streamId,
                    Key: key,
                })

                if (data.Reads.length > MAX_SET_SIZE) {
                    throw new Error('errSizeTooLarge')
                }
            }
        }

        // writes
        data.Writes = []
        for (const [streamId, keys] of this.writes.entries()) {
            for (const [k, d] of keys.entries()) {
                const key = ethers.toUtf8Bytes(k)
                if (key.length > MAX_KEY_SIZE) {
                    throw new Error('errKeyTooLarge')
                }
                if (key.length === 0) {
                    throw new Error('errKeyIsEmpty')
                }
                data.Writes.push({
                    StreamId: streamId,
                    Key: key,
                    Data: d,
                })

                if (data.Writes.length > MAX_SET_SIZE) {
                    throw new Error('errSizeTooLarge')
                }
            }
        }

        if (sorted) {
            data.Reads.sort((a, b) => {
                const streamIdI = a.StreamId
                const streamIdJ = b.StreamId
                if (streamIdI === streamIdJ) {
                    return ethers.hexlify(a.Key) < ethers.hexlify(b.Key)
                        ? -1
                        : 1
                } else {
                    return streamIdI < streamIdJ ? -1 : 1
                }
            })
            data.Writes.sort((a, b) => {
                const streamIdI = a.StreamId
                const streamIdJ = b.StreamId
                if (streamIdI === streamIdJ) {
                    return ethers.hexlify(a.Key) < ethers.hexlify(b.Key)
                        ? -1
                        : 1
                } else {
                    return streamIdI < streamIdJ ? -1 : 1
                }
            })
        }

        return data
    }

    addStreamId(streamId: Hash): void {
        this.streamIds.set(streamId, true)
    }

    buildTags(sorted: boolean = false): Uint8Array {
        let ids: Hash[] = Array.from(this.streamIds.keys())

        if (sorted) {
            ids.sort((a, b) => (a < b ? -1 : 1))
        }

        return this.createTags(ids)
    }

    private createTags(streamIds: Hash[]): Uint8Array {
        const result = new Uint8Array((1 + streamIds.length) * 32) // Assuming Hash is 32 bytes
        result.set(ethers.toUtf8Bytes(StreamDomain), 0)

        streamIds.forEach((id, index) => {
            result.set(ethers.toUtf8Bytes(id), 32 * (index + 1))
        })

        return result
    }

    private buildAccessControl(): AccessControl[] {
        if (this.controls.length > MAX_SET_SIZE) {
            throw new Error('errSizeTooLarge')
        }
        return this.controls
    }
}
