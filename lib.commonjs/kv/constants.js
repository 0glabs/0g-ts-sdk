"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamDomain = exports.MAX_QUERY_SIZE = exports.MAX_KEY_SIZE = exports.MAX_SET_SIZE = void 0;
const ethers_1 = require("ethers");
exports.MAX_SET_SIZE = 1 << 16; // 64K
exports.MAX_KEY_SIZE = 1 << 24; // 16.7M
exports.MAX_QUERY_SIZE = 1024 * 256;
// df2ff3bb0af36c6384e6206552a4ed807f6f6a26e7d0aa6bff772ddc9d4307aa
exports.StreamDomain = ethers_1.ethers.hexlify(ethers_1.ethers.keccak256(ethers_1.ethers.toUtf8Bytes('STREAM')));
//# sourceMappingURL=constants.js.map