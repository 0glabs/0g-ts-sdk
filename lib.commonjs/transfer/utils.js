"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShardConfigs = getShardConfigs;
const index_js_1 = require("../node/index.js");
async function getShardConfigs(nodes) {
    var configs = [];
    for (const cNode of nodes) {
        const cConfig = await cNode.getShardConfig();
        if (!(0, index_js_1.isValidConfig)(cConfig)) {
            return null;
        }
        configs.push(cConfig);
    }
    return configs;
}
//# sourceMappingURL=utils.js.map