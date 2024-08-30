import { Signer } from 'ethers';
import { ContractRunner } from 'ethers';
export declare function getFlowContract(address: string, signer: Signer): import("./contracts/flow/FixedPriceFlow.js").FixedPriceFlow;
export declare function getMarketContract(address: string, runner: ContractRunner): import("./contracts/market/FixedPrice.js").FixedPrice;
export declare function checkExist(inputPath: string): boolean;
export declare function GetSplitNum(total: number, unit: number): number;
export declare const delay: (ms: number) => Promise<unknown>;
//# sourceMappingURL=utils.d.ts.map