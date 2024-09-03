type Hash = string;
type Address = string;
declare enum AccessControlType {
    GrantAdminRole = 0,
    RenounceAdminRole = 1,
    SetKeyToSpecial = 16,
    SetKeyToNormal = 17,
    GrantWriteRole = 32,
    RevokeWriteRole = 33,
    RenounceWriteRole = 34,
    GrantSpecialWriteRole = 48,
    RevokeSpecialWriteRole = 49,
    RenounceSpecialWriteRole = 50
}
interface StreamRead {
    StreamId: Hash;
    Key: Uint8Array;
}
interface StreamWrite {
    StreamId: Hash;
    Key: Uint8Array;
    Data: Uint8Array;
}
export interface AccessControl {
    Type: AccessControlType;
    StreamId: Hash;
    Account?: Address;
    Key?: Uint8Array;
}
export declare class StreamData {
    Version: number;
    Reads: StreamRead[];
    Writes: StreamWrite[];
    Controls: AccessControl[];
    constructor(version: number);
    size(): number;
    private encodeSize24;
    private encodeSize32;
    private encodeSize64;
    encode(): Uint8Array;
}
export {};
//# sourceMappingURL=types.d.ts.map