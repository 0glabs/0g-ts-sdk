import { ethers } from 'ethers';
export const MAX_SET_SIZE = 1 << 16; // 64K
export const MAX_KEY_SIZE = 1 << 24; // 16.7M
export const MAX_QUERY_SIZE = 1024 * 256;
// df2ff3bb0af36c6384e6206552a4ed807f6f6a26e7d0aa6bff772ddc9d4307aa
export const StreamDomain = ethers.hexlify(ethers.keccak256(ethers.toUtf8Bytes('STREAM')));
//# sourceMappingURL=constants.js.map