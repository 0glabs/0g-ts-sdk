"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShardConfig = void 0;
const utils_1 = require("../node/utils");
async function getShardConfig(nodes) {
    var configs = [];
    for (const cNode of nodes) {
        const cConfig = await cNode.getShardConfig();
        if (!(0, utils_1.isValidConfig)(cConfig)) {
            return null;
        }
        configs.push(cConfig);
    }
    return configs;
}
exports.getShardConfig = getShardConfig;
//# sourceMappingURL=utils.js.map