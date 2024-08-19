import { ethers, Signer } from 'ethers';
import { RetryOpts } from './types.js';
export declare function getFlowContract(address: string, signer: Signer): import("./contracts/flow/FixedPriceFlow.js").FixedPriceFlow;
export declare function getMarketContract(address: string, signer?: Signer): import("./contracts/market/FixedPrice.js").FixedPrice;
export declare function checkExist(inputPath: string): boolean;
export declare function GetSplitNum(total: number, unit: number): number;
export declare function WaitForReceipt(provider: ethers.JsonRpcProvider, txHash: string, opts?: RetryOpts): Promise<ethers.TransactionReceipt | null>;
//# sourceMappingURL=utils.d.ts.map