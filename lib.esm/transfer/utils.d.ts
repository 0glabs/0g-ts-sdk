import { ShardConfig } from '../common/index.js';
import { SubmissionStruct } from '../contracts/flow/FixedPriceFlow.js';
import { StorageNode } from '../node/index.js';
export declare function getShardConfigs(nodes: StorageNode[]): Promise<ShardConfig[] | null>;
export declare function calculatePrice(submission: SubmissionStruct, pricePerSector: bigint): bigint;
//# sourceMappingURL=utils.d.ts.map