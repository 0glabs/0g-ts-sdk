import { insert, SegmentTreeNode } from './segment_tree.js'
import { ShardConfig, ShardedNode } from './types.js'

export * from './types.js'
export * from './segment_tree.js'

export function selectNodes(
    nodes: ShardedNode[],
    expectedReplica: number
): [ShardedNode[], boolean] {
    if (expectedReplica === 0) {
        return [[], false]
    }
    nodes.sort((a, b) => {
        if (a.config.numShard === b.config.numShard) {
            return a.config.shardId - b.config.shardId
        }
        return a.config.numShard - b.config.numShard
    })
    let root: SegmentTreeNode = {
        childs: null,
        numShard: 1,
        replica: 0,
        lazyTags: 0,
    }

    let selectedNodes: ShardedNode[] = []
    for (let i = 0; i < nodes.length; i += 1) {
        let node = nodes[i]
        if (
            insert(
                root,
                node.config.numShard,
                node.config.shardId,
                expectedReplica
            )
        ) {
            selectedNodes.push(node)
        }
        if (root.replica >= expectedReplica) {
            return [selectedNodes, true]
        }
    }

    return [[], false]
}

export function checkReplica(
    shardConfigs: ShardConfig[],
    expectedReplica: number
): boolean {
    let shardedNodes: ShardedNode[] = []
    for (let i = 0; i < shardConfigs.length; i += 1) {
        shardedNodes.push({
            url: '',
            config: {
                numShard: shardConfigs[i].numShard,
                shardId: shardConfigs[i].shardId,
            },
            latency: 0,
            since: 0,
        })
    }
    let [_, ok] = selectNodes(shardedNodes, expectedReplica)
    return ok
}
