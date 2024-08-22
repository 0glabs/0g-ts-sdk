import { FixedPriceFlow__factory } from './contracts/flow/index.js';
import { FixedPrice__factory } from './contracts/market/index.js';
import fs from 'fs';
import path from 'path';
export function getFlowContract(address, signer) {
    return FixedPriceFlow__factory.connect(address, signer);
}
export function getMarketContract(address, runner) {
    return FixedPrice__factory.connect(address, runner);
}
export function checkExist(inputPath) {
    const dirName = path.dirname(inputPath);
    if (!fs.existsSync(dirName)) {
        return true;
    }
    if (fs.existsSync(inputPath) && fs.lstatSync(inputPath).isDirectory()) {
        return true;
    }
    // Check if the directory exists and the file does not exist
    if (!fs.existsSync(inputPath)) {
        return false;
    }
    return true;
}
export function GetSplitNum(total, unit) {
    return Math.floor((total - 1) / unit + 1);
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
export async function WaitForReceipt(provider, txHash, opts) {
    var receipt;
    if (opts === undefined) {
        opts = { Retries: 10, Interval: 5 };
    }
    let nTries = 0;
    while (nTries < opts.Retries) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (receipt !== null && receipt.status == 1) {
            return receipt;
        }
        await delay(opts.Interval * 1000);
        nTries++;
    }
    return null;
}
//# sourceMappingURL=utils.js.map