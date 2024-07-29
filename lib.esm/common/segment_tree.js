export function pushdown(node) {
    if (node.childs === null) {
        node.childs = [];
        for (let i = 0; i < 2; i += 1) {
            node.childs.push({
                childs: null,
                numShard: node.numShard << 1,
                replica: 0,
                lazyTags: 0,
            });
        }
    }
    for (let i = 0; i < 2; i += 1) {
        node.childs[i].replica += node.lazyTags;
        node.childs[i].lazyTags += node.lazyTags;
    }
    node.lazyTags = 0;
}
// insert a shard if it contributes to the replica
export function insert(node, numShard, shardId, expectedReplica) {
    if (node.replica >= expectedReplica) {
        return false;
    }
    if (node.numShard === numShard) {
        node.replica += 1;
        node.lazyTags += 1;
        return true;
    }
    pushdown(node);
    if (node.childs === null) {
        throw new Error('node.childs is null');
    }
    let inserted = insert(node.childs[shardId % 2], numShard, shardId >> 1, expectedReplica);
    node.replica = Math.min(node.childs[0].replica, node.childs[1].replica);
    return inserted;
}
//# sourceMappingURL=segment_tree.js.map