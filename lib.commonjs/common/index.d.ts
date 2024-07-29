import { ShardConfig, ShardedNode } from './types.js';
export * from './types.js';
export * from './segment_tree.js';
export declare function selectNodes(nodes: ShardedNode[], expectedReplica: number): [ShardedNode[], boolean];
export declare function checkReplica(shardConfigs: ShardConfig[], expectedReplica: number): boolean;
//# sourceMappingURL=index.d.ts.map