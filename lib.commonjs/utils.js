"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFlowContract = void 0;
const index_js_1 = require("./contracts/flow/index.js");
function getFlowContract(address, signer) {
    return index_js_1.Flow__factory.connect(address, signer);
}
exports.getFlowContract = getFlowContract;
//# sourceMappingURL=utils.js.map