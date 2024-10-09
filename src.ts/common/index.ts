import { insert, SegmentTreeNode } from './segment_tree.js'
import { ShardConfig, ShardedNode } from './types.js'

export * from './types.js'
export * from './segment_tree.js'

export function selectNodes(
    segNum: number,
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

    let occupied: { [key: number]: number } = {}
    let selectedNodes: ShardedNode[] = []
    let hit = 0
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
        if (segNum > 0) {
            let chosen = false
            for (
                let j = node.config.shardId;
                j < segNum;
                j += node.config.numShard
            ) {
                if (occupied[j] === undefined) {
                    occupied[j] = 0
                }
                if (occupied[j] < expectedReplica) {
                    hit += 1
                    occupied[j] += 1
                    chosen = true
                }
            }
            if (chosen) {
                selectedNodes.push(node)
            }
            if (hit == segNum * expectedReplica) {
                return [selectedNodes, true]
            }
        }
    }

    return [[], false]
}

export function checkReplica(
    segNum: number,
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
    let [_, ok] = selectNodes(segNum, shardedNodes, expectedReplica)
    return ok
}
