"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectNodes = selectNodes;
exports.checkReplica = checkReplica;
const tslib_1 = require("tslib");
const segment_tree_js_1 = require("./segment_tree.js");
tslib_1.__exportStar(require("./types.js"), exports);
tslib_1.__exportStar(require("./segment_tree.js"), exports);
function selectNodes(nodes, expectedReplica) {
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
    let selectedNodes = [];
    for (let i = 0; i < nodes.length; i += 1) {
        let node = nodes[i];
        if ((0, segment_tree_js_1.insert)(root, node.config.numShard, node.config.shardId, expectedReplica)) {
            selectedNodes.push(node);
        }
        if (root.replica >= expectedReplica) {
            return [selectedNodes, true];
        }
    }
    return [[], false];
}
function checkReplica(shardConfigs, expectedReplica) {
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
    let [_, ok] = selectNodes(shardedNodes, expectedReplica);
    return ok;
}
//# sourceMappingURL=index.js.map