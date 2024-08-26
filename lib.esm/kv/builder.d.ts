import { AccessControl, StreamData } from './types';
type Hash = string;
export declare class StreamDataBuilder {
    version: bigint;
    streamIds: Map<Hash, boolean>;
    controls: AccessControl[];
    reads: Map<Hash, Map<string, boolean>>;
    writes: Map<Hash, Map<string, Uint8Array>>;
    constructor(version: bigint);
    build(sorted?: boolean): StreamData;
    addStreamId(streamId: Hash): void;
    buildTags(sorted?: boolean): Uint8Array;
    private createTags;
    private buildAccessControl;
}
export {};
//# sourceMappingURL=builder.d.ts.map