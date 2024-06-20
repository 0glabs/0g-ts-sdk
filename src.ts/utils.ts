import { Signer } from 'ethers';
import { Flow__factory } from './contracts/flow/index.js';
import * as fs from 'fs';

export function getFlowContract(address: string, signer: Signer) {
    return Flow__factory.connect(address, signer);
}

export function checkExist(path: string): boolean {
    let statSync = fs.statSync(path);
    if (statSync.isFile()) {
        return true;
    }
    if (statSync.isDirectory()) {
        return true;
    }
    return false;
}

export function GetSplitNum(total: number, unit: number): number {
    return (total - 1) / unit + 1;
}
