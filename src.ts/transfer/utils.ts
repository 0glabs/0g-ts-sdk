import { ShardConfig, StorageNode } from '../node'
import { isValidConfig } from '../node/utils'

export async function getShardConfig(
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
