import { insert } from './segment_tree.js';
export * from './types.js';
export * from './segment_tree.js';
export function selectNodes(segNum, nodes, expectedReplica) {
    if (expectedReplica === 0) {
        return [[], false];
    }
    nodes.sort((a, b) => {
        if (a.config.numShard === b.config.numShard) {
            return a.config.shardId - b.config.shardId;
        }
        return a.config.numShard - b.config.numShard;
    });
    let root = {
        childs: null,
        numShard: 1,
        replica: 0,
        lazyTags: 0,
    };
    let occupied = {};
    let selectedNodes = [];
    let hit = 0;
    for (let i = 0; i < nodes.length; i += 1) {
        let node = nodes[i];
        if (insert(root, node.config.numShard, node.config.shardId, expectedReplica)) {
            selectedNodes.push(node);
        }
        if (root.replica >= expectedReplica) {
            return [selectedNodes, true];
        }
        if (segNum > 0) {
            let chosen = false;
            for (let j = node.config.shardId; j < segNum; j += node.config.numShard) {
                if (occupied[j] === undefined) {
                    occupied[j] = 0;
                }
                if (occupied[j] < expectedReplica) {
                    hit += 1;
                    occupied[j] += 1;
                    chosen = true;
                }
            }
            if (chosen) {
                selectedNodes.push(node);
            }
            if (hit == segNum * expectedReplica) {
                return [selectedNodes, true];
            }
        }
    }
    return [[], false];
}
export function checkReplica(segNum, shardConfigs, expectedReplica) {
    let shardedNodes = [];
    for (let i = 0; i < shardConfigs.length; i += 1) {
        shardedNodes.push({
            url: '',
            config: {
                numShard: shardConfigs[i].numShard,
                shardId: shardConfigs[i].shardId,
            },
            latency: 0,
            since: 0,
        });
    }
    let [_, ok] = selectNodes(segNum, shardedNodes, expectedReplica);
    return ok;
}
//# sourceMappingURL=index.js.map