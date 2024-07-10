import { Signer } from 'ethers'
import { Flow__factory } from './contracts/flow/index.js'
import fs from 'fs'
import path from 'path'

export function getFlowContract(address: string, signer: Signer) {
    return Flow__factory.connect(address, signer)
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
