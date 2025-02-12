import { ShardedNode } from '../common/types';
export interface IpLocation {
    city: number;
    region: string;
    country: string;
    location: string;
    timezone: string;
}
export interface ShardedNodes {
    trusted: ShardedNode[];
    discovered: ShardedNode[];
}
export interface TransactionOptions {
    gasPrice?: bigint;
    gasLimit?: bigint;
}
//# sourceMappingURL=types.d.ts.map