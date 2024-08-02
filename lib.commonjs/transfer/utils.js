"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShardConfigs = getShardConfigs;
exports.calculatePrice = calculatePrice;
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
function calculatePrice(submission, pricePerSector) {
    let sectors = 0;
    for (const node of submission.nodes) {
        sectors += 1 << Number(node.height.toString());
    }
    return BigInt(sectors) * pricePerSector;
}
//# sourceMappingURL=utils.js.map