"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetSplitNum = exports.checkExist = exports.getFlowContract = void 0;
const tslib_1 = require("tslib");
const index_js_1 = require("./contracts/flow/index.js");
const fs = tslib_1.__importStar(require("fs"));
function getFlowContract(address, signer) {
    return index_js_1.Flow__factory.connect(address, signer);
}
exports.getFlowContract = getFlowContract;
function checkExist(path) {
    let statSync = fs.statSync(path);
    if (statSync.isFile()) {
        return true;
    }
    if (statSync.isDirectory()) {
        return true;
    }
    return false;
}
exports.checkExist = checkExist;
function GetSplitNum(total, unit) {
    return (total - 1) / unit + 1;
}
exports.GetSplitNum = GetSplitNum;
//# sourceMappingURL=utils.js.map