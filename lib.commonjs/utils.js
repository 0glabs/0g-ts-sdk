"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitForReceipt = exports.GetSplitNum = exports.checkExist = exports.getFlowContract = void 0;
const tslib_1 = require("tslib");
const index_js_1 = require("./contracts/flow/index.js");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
function getFlowContract(address, signer) {
    return index_js_1.Flow__factory.connect(address, signer);
}
exports.getFlowContract = getFlowContract;
function checkExist(inputPath) {
    const dirName = path_1.default.dirname(inputPath);
    if (!fs_1.default.existsSync(dirName)) {
        return true;
    }
    if (fs_1.default.existsSync(inputPath) && fs_1.default.lstatSync(inputPath).isDirectory()) {
        return true;
    }
    // Check if the directory exists and the file does not exist
    if (!fs_1.default.existsSync(inputPath)) {
        return false;
    }
    return true;
}
exports.checkExist = checkExist;
function GetSplitNum(total, unit) {
    return Math.floor((total - 1) / unit + 1);
}
exports.GetSplitNum = GetSplitNum;
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
async function WaitForReceipt(provider, txHash, opts) {
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
exports.WaitForReceipt = WaitForReceipt;
//# sourceMappingURL=utils.js.map