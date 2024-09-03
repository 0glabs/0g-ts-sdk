"use strict";
// type ShardConfig = {
//     shardId: number;
//     numShard: number;
// };
// class ShardConfigClass {
//     shardId: number;
//     numShard: number;
//     constructor(shardId: number, numShard: number) {
//         this.shardId = shardId;
//         this.numShard = numShard;
//     }
//     hasSegment(segmentIndex: number): boolean {
//         return this.numShard < 2 || segmentIndex % this.numShard === this.shardId;
//     }
//     isValid(): boolean {
//         return this.numShard > 0 && (this.numShard & (this.numShard - 1)) === 0 && this.shardId < this.numShard;
//     }
// }
// export interface ShardedNode {
//     url: string
//     config: ShardConfig
//     latency: number
//     since: number
// }
// class ShardSegmentTreeNode {
//     childs: ShardSegmentTreeNode[] | null = null;
//     numShard: number;
//     lazyTags: number = 0;
//     replica: number = 0;
//     constructor(numShard: number) {
//         this.numShard = numShard;
//     }
//     pushdown(): void {
//         if (this.childs === null) {
//             this.childs = [new ShardSegmentTreeNode(this.numShard << 1), new ShardSegmentTreeNode(this.numShard << 1)];
//         }
//         for (let i = 0; i < 2; i++) {
//             if (this.childs) {
//                 this.childs[i].replica += this.lazyTags;
//                 this.childs[i].lazyTags += this.lazyTags;
//             }
//         }
//         this.lazyTags = 0;
//     }
//     insert(numShard: number, shardId: number, expectedReplica: number): boolean {
//         if (this.replica >= expectedReplica) {
//             return false;
//         }
//         if (this.numShard === numShard) {
//             this.replica += 1;
//             this.lazyTags += 1;
//             return true;
//         }
//         this.pushdown();
//         const inserted = this.childs ? this.childs[shardId % 2].insert(numShard, shardId >> 1, expectedReplica) : false;
//         if (this.childs) {
//             this.replica = Math.min(this.childs[0].replica, this.childs[1].replica);
//         }
//         return inserted;
//     }
// }
// function selectShardedNodes(nodes: ShardedNode[], expectedReplica: number, random: boolean): [ShardedNode[], boolean] {
//     let selected: ShardedNode[] = [];
//     if (expectedReplica === 0) {
//         return [selected, true];
//     }
//     if (random) {
//         // Shuffle
//         for (let i = nodes.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1));
//             [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
//         }
//     } else {
//         // Sort by shard size from large to small
//         nodes.sort((a, b) => {
//             if (a.config.numShard === b.config.numShard) {
//                 return a.config.shardId - b.config.shardId;
//             }
//             return a.config.numShard - b.config.numShard;
//         });
//     }
//     const root = new ShardSegmentTreeNode(1);
//     for (const node of nodes) {
//         if (root.insert(node.config.numShard, node.config.shardId, expectedReplica)) {
//             selected.push(node);
//         }
//         if (root.replica >= expectedReplica) {
//             return [selected, true];
//         }
//     }
//     return [[], false];
// }
//# sourceMappingURL=index.js.map