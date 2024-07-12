export function isValidConfig(config) {
    // NumShard should be larger than zero and be power of 2
    return (config.numShard > 0 &&
        (config.numShard & (config.numShard - 1)) === 0 &&
        config.shardId < config.numShard);
}
//# sourceMappingURL=utils.js.map