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
//# sourceMappingURL=utils.js.map