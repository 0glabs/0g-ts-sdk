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
export const delay = (ms) => new Promise((res) => setTimeout(res, ms));
//# sourceMappingURL=utils.js.map