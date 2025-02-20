"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.delay = void 0;
exports.getFlowContract = getFlowContract;
exports.getMarketContract = getMarketContract;
exports.checkExist = checkExist;
exports.GetSplitNum = GetSplitNum;
exports.txWithGasAdjustment = txWithGasAdjustment;
const tslib_1 = require("tslib");
const index_js_1 = require("./contracts/flow/index.js");
const index_js_2 = require("./contracts/market/index.js");
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const constant_js_1 = require("./constant.js");
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
async function txWithGasAdjustment(contract, provider, method, params, txOpts, retryOpts) {
    let current_gas_price = txOpts.gasPrice; // gas price is required in txOpts
    let maxGasPrice = current_gas_price;
    if (retryOpts !== undefined && retryOpts.MaxGasPrice > 0) {
        maxGasPrice = BigInt(retryOpts.MaxGasPrice);
    }
    while (current_gas_price <= maxGasPrice) {
        console.log(`Sending transaction with gas price ${current_gas_price}`);
        txOpts.gasPrice = current_gas_price;
        try {
            let resp = await contract
                .getFunction(method)
                .send(...params, txOpts);
            const tx = (await Promise.race([
                resp.wait(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timed out')), constant_js_1.TIMEOUT_MS)),
            ]));
            if (tx === null) {
                throw new Error('Failed to send transaction');
            }
            let receipt = await waitForReceipt(provider, tx.hash, retryOpts);
            if (receipt === null) {
                throw new Error('Failed to get transaction receipt');
            }
            return receipt;
        }
        catch (e) {
            console.log(`Failed to send transaction with gas price ${current_gas_price}, with error ${e}, retrying with higher gas price`);
            current_gas_price =
                (BigInt(11) * BigInt(current_gas_price)) / BigInt(10);
        }
    }
    return null;
}
async function waitForReceipt(provider, txHash, opts) {
    var receipt = null;
    if (opts === undefined) {
        opts = { Retries: 10, Interval: 5, MaxGasPrice: 0 };
    }
    if (opts.Retries === undefined || opts.Retries === 0) {
        opts.Retries = 10;
    }
    if (opts.Interval === undefined || opts.Interval === 0) {
        opts.Interval = 5;
    }
    let nTries = 0;
    while (nTries < opts.Retries) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (receipt !== null && receipt.status == 1) {
            return receipt;
        }
        await (0, exports.delay)(opts.Interval * 1000);
        nTries++;
    }
    return null;
}
//# sourceMappingURL=utils.js.map