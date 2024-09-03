"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAM_DOMAIN = exports.MAX_QUERY_SIZE = exports.MAX_KEY_SIZE = exports.MAX_SET_SIZE = void 0;
const node_crypto_1 = require("node:crypto");
exports.MAX_SET_SIZE = 1 << 16; // 64K
exports.MAX_KEY_SIZE = 1 << 24; // 16.7M
exports.MAX_QUERY_SIZE = 1024 * 256;
// df2ff3bb0af36c6384e6206552a4ed807f6f6a26e7d0aa6bff772ddc9d4307aa
exports.STREAM_DOMAIN = (0, node_crypto_1.createHash)('sha256').update('STREAM').digest();
//# sourceMappingURL=constants.js.map