import { FixedPriceFlow__factory } from './contracts/flow/index.js';
import { FixedPrice__factory } from './contracts/market/index.js';
import fs from 'fs';
import path from 'path';
import { TIMEOUT_MS } from './constant.js';
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
export async function txWithGasAdjustment(contract, provider, method, params, txOpts, retryOpts) {
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
                new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timed out')), TIMEOUT_MS)),
            ]));
            if (tx === null) {
                throw new Error('Failed to get transaction receipt');
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