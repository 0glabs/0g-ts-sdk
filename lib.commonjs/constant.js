"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZERO_HASH = exports.SMALL_FILE_SIZE_THRESHOLD = exports.EMPTY_CHUNK_HASH = exports.EMPTY_CHUNK = exports.DEFAULT_SEGMENT_SIZE = exports.DEFAULT_SEGMENT_MAX_CHUNKS = exports.DEFAULT_CHUNK_SIZE = exports.TESTNET_USDT_ADDRESS = exports.TESTNET_FLOW_ADDRESS = void 0;
const keccak256_1 = require("@ethersproject/keccak256");
exports.TESTNET_FLOW_ADDRESS = '0xcb7afff6f048ec1fb033aa7b495ed0dd932c8656';
exports.TESTNET_USDT_ADDRESS = '0x7d682e65efc5c13bf4e394b8f376c48e6bae0355';
exports.DEFAULT_CHUNK_SIZE = 256; // bytes
exports.DEFAULT_SEGMENT_MAX_CHUNKS = 1024;
exports.DEFAULT_SEGMENT_SIZE = exports.DEFAULT_CHUNK_SIZE * exports.DEFAULT_SEGMENT_MAX_CHUNKS;
exports.EMPTY_CHUNK = new Uint8Array(exports.DEFAULT_CHUNK_SIZE);
exports.EMPTY_CHUNK_HASH = (0, keccak256_1.keccak256)(exports.EMPTY_CHUNK);
exports.SMALL_FILE_SIZE_THRESHOLD = 256 * 1024;
exports.ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
//# sourceMappingURL=constant.js.map