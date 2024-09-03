export class KvIterator {
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
        this.version = version;
    }
    // Valid check if current position is exist
    valid() {
        return this.currentPair !== undefined;
    }
    getCurrentPair() {
        return this.currentPair;
    }
    async move(kv) {
        if (kv === null) {
            this.currentPair = undefined;
            return null;
        }
        let value = await this.client.getValue(this.streamId, kv.key, kv.version);
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
    async seekBefore(key) {
        let kv = await this.client.getPrev(this.streamId, key, 0, 0, true, this.version);
        return this.move(kv);
    }
    async seekAfter(key) {
        let kv = await this.client.getNext(this.streamId, key, 0, 0, true, this.version);
        return this.move(kv);
    }
    async seekToFirst() {
        let kv = await this.client.getFirst(this.streamId, 0, 0, this.version);
        return this.move(kv);
    }
    async seekToLast() {
        let kv = await this.client.getLast(this.streamId, 0, 0, this.version);
        return this.move(kv);
    }
    async next() {
        if (!this.valid()) {
            return new Error('errIteratorInvalid');
        }
        let kv = await this.client.getNext(this.streamId, this.currentPair.key, 0, 0, false, this.version);
        return this.move(kv);
    }
    async prev() {
        if (!this.valid()) {
            return new Error('errIteratorInvalid');
        }
        let kv = await this.client.getPrev(this.streamId, this.currentPair.key, 0, 0, false, this.version);
        return this.move(kv);
    }
}
//# sourceMappingURL=iterator.js.map