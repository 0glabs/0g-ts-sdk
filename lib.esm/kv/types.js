import { ethers } from 'ethers';
var AccessControlType;
(function (AccessControlType) {
    AccessControlType[AccessControlType["GrantAdminRole"] = 0] = "GrantAdminRole";
    AccessControlType[AccessControlType["RenounceAdminRole"] = 1] = "RenounceAdminRole";
    AccessControlType[AccessControlType["SetKeyToSpecial"] = 16] = "SetKeyToSpecial";
    AccessControlType[AccessControlType["SetKeyToNormal"] = 17] = "SetKeyToNormal";
    AccessControlType[AccessControlType["GrantWriteRole"] = 32] = "GrantWriteRole";
    AccessControlType[AccessControlType["RevokeWriteRole"] = 33] = "RevokeWriteRole";
    AccessControlType[AccessControlType["RenounceWriteRole"] = 34] = "RenounceWriteRole";
    AccessControlType[AccessControlType["GrantSpecialWriteRole"] = 48] = "GrantSpecialWriteRole";
    AccessControlType[AccessControlType["RevokeSpecialWriteRole"] = 49] = "RevokeSpecialWriteRole";
    AccessControlType[AccessControlType["RenounceSpecialWriteRole"] = 50] = "RenounceSpecialWriteRole";
})(AccessControlType || (AccessControlType = {}));
export class StreamData {
    Version;
    Reads = [];
    Writes = [];
    Controls = [];
    constructor(version) {
        this.Version = version;
    }
    size() {
        let size = 8; // version size in bytes
        size += 4; // Reads size prefix
        for (const v of this.Reads) {
            size += 32 + 3 + v.Key.length;
        }
        size += 4; // Writes size prefix
        for (const v of this.Writes) {
            size += 32 + 3 + v.Key.length + 8 + v.Data.length;
        }
        size += 4; // Controls size prefix
        for (const v of this.Controls) {
            size += 1 + 32; // Type + StreamId
            if (v.Account) {
                size += 20; // Address length
            }
            if (v.Key) {
                size += 3 + v.Key.length;
            }
        }
        return size;
    }
    encodeSize24(size) {
        if (size === 0) {
            throw new Error('errKeyIsEmpty');
        }
        const buf = new Uint8Array(4);
        const view = new DataView(buf.buffer);
        view.setUint32(0, size, false);
        if (buf[0] !== 0) {
            throw new Error('errKeyTooLarge');
        }
        return buf.slice(1);
    }
    encodeSize32(size) {
        const buf = new Uint8Array(4);
        const view = new DataView(buf.buffer);
        view.setUint32(0, size, false);
        return buf;
    }
    encodeSize64(size) {
        const buf = new Uint8Array(8);
        const view = new DataView(buf.buffer);
        view.setBigUint64(0, BigInt(size), false);
        return buf;
    }
    encode() {
        const encoded = new Uint8Array(this.size());
        let offset = 0;
        const view = new DataView(encoded.buffer);
        // version
        view.setBigUint64(0, BigInt(this.Version.toString()), false);
        offset += 8;
        // reads
        encoded.set(this.encodeSize32(this.Reads.length), offset);
        offset += 4;
        for (const v of this.Reads) {
            encoded.set(ethers.toUtf8Bytes(v.StreamId), offset);
            offset += 32;
            const keySize = this.encodeSize24(v.Key.length);
            encoded.set(keySize, offset);
            offset += keySize.length;
            encoded.set(v.Key, offset);
            offset += v.Key.length;
        }
        // writes
        encoded.set(this.encodeSize32(this.Writes.length), offset);
        offset += 4;
        for (const v of this.Writes) {
            encoded.set(ethers.toUtf8Bytes(v.StreamId), offset);
            offset += 32;
            const keySize = this.encodeSize24(v.Key.length);
            encoded.set(keySize, offset);
            offset += keySize.length;
            encoded.set(v.Key, offset);
            offset += v.Key.length;
            const dataSize = this.encodeSize64(v.Data.length);
            encoded.set(dataSize, offset);
            offset += dataSize.length;
            encoded.set(v.Data, offset);
            offset += v.Data.length;
        }
        // controls
        encoded.set(this.encodeSize32(this.Controls.length), offset);
        offset += 4;
        for (const v of this.Controls) {
            encoded[offset] = v.Type;
            offset += 1;
            encoded.set(ethers.toUtf8Bytes(v.StreamId), offset);
            offset += 32;
            if (v.Key) {
                const keySize = this.encodeSize24(v.Key.length);
                encoded.set(keySize, offset);
                offset += keySize.length;
                encoded.set(v.Key, offset);
                offset += v.Key.length;
            }
            if (v.Account) {
                encoded.set(ethers.toUtf8Bytes(v.Account), offset);
                offset += 20;
            }
        }
        return encoded;
    }
}
//# sourceMappingURL=types.js.map