import { AccessControl, StreamData } from './types.js';
import { Bytes } from '@ethersproject/bytes';
type Hash = string;
export declare class StreamDataBuilder {
    version: number;
    streamIds: Map<Hash, boolean>;
    controls: AccessControl[];
    reads: Map<Hash, Map<string, boolean>>;
    writes: Map<Hash, Map<string, Bytes>>;
    constructor(version: number);
    private hexToBytes;
    build(sorted?: boolean): StreamData;
    set(streamId: string, key: Uint8Array, data: Uint8Array): void;
    addStreamId(streamId: Hash): void;
    buildTags(sorted?: boolean): Uint8Array;
    private createTags;
    private buildAccessControl;
}
export {};
//# sourceMappingURL=builder.d.ts.map