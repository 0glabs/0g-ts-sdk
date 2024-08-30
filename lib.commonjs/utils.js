"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
exports.getFlowContract = getFlowContract;
exports.getMarketContract = getMarketContract;
exports.checkExist = checkExist;
exports.GetSplitNum = GetSplitNum;
const tslib_1 = require("tslib");
const index_js_1 = require("./contracts/flow/index.js");
const index_js_2 = require("./contracts/market/index.js");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
function getFlowContract(address, signer) {
    return index_js_1.FixedPriceFlow__factory.connect(address, signer);
}
function getMarketContract(address, runner) {
    return index_js_2.FixedPrice__factory.connect(address, runner);
}
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
function GetSplitNum(total, unit) {
    return Math.floor((total - 1) / unit + 1);
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
exports.delay = delay;
//# sourceMappingURL=utils.js.map