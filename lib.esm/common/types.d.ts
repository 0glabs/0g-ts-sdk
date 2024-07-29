export interface ShardConfig {
    shardId: number;
    numShard: number;
}
export interface ShardedNode {
    url: string;
    config: ShardConfig;
    latency: number;
    since: number;
}
//# sourceMappingURL=types.d.ts.map