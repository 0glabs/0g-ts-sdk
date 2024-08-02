import { isValidConfig } from '../node/index.js';
export async function getShardConfigs(nodes) {
    var configs = [];
    for (const cNode of nodes) {
        const cConfig = await cNode.getShardConfig();
        if (!isValidConfig(cConfig)) {
            return null;
        }
        configs.push(cConfig);
    }
    return configs;
}
export function calculatePrice(submission, pricePerSector) {
    let sectors = 0;
    for (const node of submission.nodes) {
        sectors += 1 << Number(node.height.toString());
    }
    return BigInt(sectors) * pricePerSector;
}
//# sourceMappingURL=utils.js.map