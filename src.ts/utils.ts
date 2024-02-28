import { Signer } from 'ethers';
import { Flow__factory } from './contracts/flow/index.js';

export function getFlowContract(address: string, signer: Signer) {
    return Flow__factory.connect(address, signer);
}