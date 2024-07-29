import { ShardConfig } from '../common/index.js'
import { StorageNode, isValidConfig } from '../node/index.js'

export async function getShardConfigs(
    nodes: StorageNode[]
): Promise<ShardConfig[] | null> {
    var configs: ShardConfig[] = []
    for (const cNode of nodes) {
        const cConfig: ShardConfig = await cNode.getShardConfig()
        if (!isValidConfig(cConfig)) {
            return null
        }
        configs.push(cConfig)
    }

    return configs
}
