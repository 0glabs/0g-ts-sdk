import { ethers, Signer } from 'ethers'
import { Flow__factory } from './contracts/flow/index.js'
import { FixedPrice__factory } from './contracts/market/index.js'
import fs from 'fs'
import path from 'path'
import { RetryOpts } from './types.js'

export function getFlowContract(address: string, signer: Signer) {
    return Flow__factory.connect(address, signer)
}

export function getMarketContract(address: string, signer: Signer) {
    return FixedPrice__factory.connect(address, signer)
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

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function WaitForReceipt(
    provider: ethers.JsonRpcProvider,
    txHash: string,
    opts?: RetryOpts
): Promise<ethers.TransactionReceipt | null> {
    var receipt

    if (opts === undefined) {
        opts = { Retries: 10, Interval: 5 }
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
