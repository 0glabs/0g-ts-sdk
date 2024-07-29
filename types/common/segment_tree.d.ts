export interface SegmentTreeNode {
    childs: SegmentTreeNode[] | null;
    numShard: number;
    lazyTags: number;
    replica: number;
}
export declare function pushdown(node: SegmentTreeNode): void;
export declare function insert(node: SegmentTreeNode, numShard: number, shardId: number, expectedReplica: number): boolean;
//# sourceMappingURL=segment_tree.d.ts.map