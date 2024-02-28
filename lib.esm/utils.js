import { Flow__factory } from './contracts/flow/index.js';
export function getFlowContract(address, signer) {
    return Flow__factory.connect(address, signer);
}
//# sourceMappingURL=utils.js.map