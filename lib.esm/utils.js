import { Flow__factory } from './contracts/flow/index.js';
import * as fs from 'fs';
export function getFlowContract(address, signer) {
    return Flow__factory.connect(address, signer);
}
export function checkExist(path) {
    let statSync = fs.statSync(path);
    if (statSync.isFile()) {
        return true;
    }
    if (statSync.isDirectory()) {
        return true;
    }
    return false;
}
export function GetSplitNum(total, unit) {
    return (total - 1) / unit + 1;
}
//# sourceMappingURL=utils.js.map