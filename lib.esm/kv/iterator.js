import { MAX_QUERY_SIZE } from './constants.js';
import { ethers } from 'ethers';
const maxUint64 = BigInt('18446744073709551615');
export class Iterator {
    // client is the client to use for requests.
    client;
    // streamId is the stream ID.
    streamId;
    // version is the version of the stream.
    version;
    // currentPair is the current key-value pair.
    currentPair;
    // NewIterator creates an iterator.
    constructor(client, streamId, version) {
        this.client = client;
        this.streamId = streamId;
        this.version = version || maxUint64;
    }
    // Valid check if current position is exist
    valid() {
        return this.currentPair !== undefined;
    }
    getCurrentPair() {
        return this.currentPair;
    }
    async getValue(streamId, key, version) {
        let val = {
            data: [],
            size: 0,
            version: version || maxUint64,
        };
        while (true) {
            const seg = await this.client.getValue(streamId, key, val.data.length, MAX_QUERY_SIZE, val.version);
            if (seg === undefined) {
                return null;
            }
            if (val.version == maxUint64) {
                val.version = seg.version;
            }
            else if (val.version != seg.version) {
                val.version = seg.version;
                val.data = [];
            }
            val.size = seg.size;
            const data = ethers.concat([new Uint8Array(val.data), new Uint8Array(seg.data)]);
            val.data = ethers.toUtf8Bytes(data);
            if (val.data.length == val.size) {
                return val;
            }
        }
    }
    async move(kv) {
        if (kv === undefined) {
            this.currentPair = undefined;
            return null;
        }
        let value = await this.getValue(this.streamId, kv.key, kv.version);
        if (value === null) {
            return new Error('errValueNotFound');
        }
        this.currentPair = {
            key: kv.key,
            data: value.data,
            size: value.size,
            version: kv.version,
        };
        return null;
    }
}
//# sourceMappingURL=iterator.js.map