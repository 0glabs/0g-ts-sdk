import { ContractTransactionReceipt, ethers, Signer } from 'ethers'
import { FixedPriceFlow__factory } from './contracts/flow/index.js'
import { FixedPrice__factory } from './contracts/market/index.js'
import fs from 'fs'
import path from 'path'
import { ContractRunner } from 'ethers'
import { BaseContract } from 'ethers'
import { TIMEOUT_MS } from './constant.js'
import { RetryOpts } from './types.js'
import { TransactionReceipt } from 'ethers'

export function getFlowContract(address: string, signer: Signer) {
    return FixedPriceFlow__factory.connect(address, signer)
}

export function getMarketContract(address: string, runner: ContractRunner) {
    return FixedPrice__factory.connect(address, runner)
}

export function checkExist(inputPath: string): boolean {
    const dirName = path.dirname(inputPath)
    if (!fs.existsSync(dirName)) {
        return true
    }

    if (fs.existsSync(inputPath) && fs.lstatSync(inputPath).isDirectory()) {
        return true
    }
    // Check if the directory exists and the file does not exist
    if (!fs.existsSync(inputPath)) {
        return false
    }

    return true
}

export function GetSplitNum(total: number, unit: number): number {
    return Math.floor((total - 1) / unit + 1)
}

export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function txWithGasAdjustment(
    contract: BaseContract,
    provider: ethers.JsonRpcProvider,
    method: string,
    params: unknown[],
    txOpts: { value: bigint; gasPrice?: bigint; gasLimit?: bigint },
    retryOpts?: RetryOpts
): Promise<TransactionReceipt | null> {
    let current_gas_price = txOpts.gasPrice! // gas price is required in txOpts
    let maxGasPrice = current_gas_price
    if (retryOpts !== undefined && retryOpts.MaxGasPrice > 0) {
        maxGasPrice = BigInt(retryOpts.MaxGasPrice)
    }

    while (current_gas_price <= maxGasPrice) {
        console.log(`Sending transaction with gas price ${current_gas_price}`)
        txOpts.gasPrice = current_gas_price
        try {
            let resp = await contract
                .getFunction(method)
                .send(...params, txOpts)
            const tx = (await Promise.race([
                resp.wait(),
                new Promise((_, reject) =>
                    setTimeout(
                        () => reject(new Error('Transaction timed out')),
                        TIMEOUT_MS
                    )
                ),
            ])) as ContractTransactionReceipt | null

            if (tx === null) {
                throw new Error('Failed to send transaction')
            }

            let receipt = await waitForReceipt(provider, tx.hash, retryOpts)
            if (receipt === null) {
                throw new Error('Failed to get transaction receipt')
            }

            return receipt
        } catch (e) {
            console.log(
                `Failed to send transaction with gas price ${current_gas_price}, with error ${e}, retrying with higher gas price`
            )
            current_gas_price =
                (BigInt(11) * BigInt(current_gas_price)) / BigInt(10)
        }
    }
    return null
}

async function waitForReceipt(
    provider: ethers.Provider,
    txHash: string,
    opts?: RetryOpts
): Promise<ethers.TransactionReceipt | null> {
    var receipt: ethers.TransactionReceipt | null = null

    if (opts === undefined) {
        opts = { Retries: 10, Interval: 5, MaxGasPrice: 0 }
    }
    if (opts.Retries === undefined || opts.Retries === 0) {
        opts.Retries = 10
    }

    if (opts.Interval === undefined || opts.Interval === 0) {
        opts.Interval = 5
    }

    let nTries = 0

    while (nTries < opts.Retries) {
        receipt = await provider.getTransactionReceipt(txHash)

        if (receipt !== null && receipt.status == 1) {
            return receipt
        }
        await delay(opts.Interval * 1000)
        nTries++
    }

    return null
}
