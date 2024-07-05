import { Flow__factory } from './contracts/flow/index.js';
import fs from 'fs';
import path from 'path';
export function getFlowContract(address, signer) {
    return Flow__factory.connect(address, signer);
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
//# sourceMappingURL=utils.js.map