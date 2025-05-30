import fs from 'fs';
import path from 'path';
import { createHash as createHash$1 } from 'node:crypto';
import { open } from 'node:fs/promises';

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var sha3$1 = {exports: {}};

/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.8.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2018
 * @license MIT
 */

(function (module) {
	/*jslint bitwise: true */
	(function () {

	  var INPUT_ERROR = 'input is invalid type';
	  var FINALIZE_ERROR = 'finalize already called';
	  var WINDOW = typeof window === 'object';
	  var root = WINDOW ? window : {};
	  if (root.JS_SHA3_NO_WINDOW) {
	    WINDOW = false;
	  }
	  var WEB_WORKER = !WINDOW && typeof self === 'object';
	  var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
	  if (NODE_JS) {
	    root = commonjsGlobal;
	  } else if (WEB_WORKER) {
	    root = self;
	  }
	  var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && 'object' === 'object' && module.exports;
	  var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
	  var HEX_CHARS = '0123456789abcdef'.split('');
	  var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
	  var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
	  var KECCAK_PADDING = [1, 256, 65536, 16777216];
	  var PADDING = [6, 1536, 393216, 100663296];
	  var SHIFT = [0, 8, 16, 24];
	  var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
	    0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
	    2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
	    2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
	    2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
	  var BITS = [224, 256, 384, 512];
	  var SHAKE_BITS = [128, 256];
	  var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
	  var CSHAKE_BYTEPAD = {
	    '128': 168,
	    '256': 136
	  };

	  if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
	    Array.isArray = function (obj) {
	      return Object.prototype.toString.call(obj) === '[object Array]';
	    };
	  }

	  if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
	    ArrayBuffer.isView = function (obj) {
	      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
	    };
	  }

	  var createOutputMethod = function (bits, padding, outputType) {
	    return function (message) {
	      return new Keccak(bits, padding, bits).update(message)[outputType]();
	    };
	  };

	  var createShakeOutputMethod = function (bits, padding, outputType) {
	    return function (message, outputBits) {
	      return new Keccak(bits, padding, outputBits).update(message)[outputType]();
	    };
	  };

	  var createCshakeOutputMethod = function (bits, padding, outputType) {
	    return function (message, outputBits, n, s) {
	      return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
	    };
	  };

	  var createKmacOutputMethod = function (bits, padding, outputType) {
	    return function (key, message, outputBits, s) {
	      return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
	    };
	  };

	  var createOutputMethods = function (method, createMethod, bits, padding) {
	    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
	      var type = OUTPUT_TYPES[i];
	      method[type] = createMethod(bits, padding, type);
	    }
	    return method;
	  };

	  var createMethod = function (bits, padding) {
	    var method = createOutputMethod(bits, padding, 'hex');
	    method.create = function () {
	      return new Keccak(bits, padding, bits);
	    };
	    method.update = function (message) {
	      return method.create().update(message);
	    };
	    return createOutputMethods(method, createOutputMethod, bits, padding);
	  };

	  var createShakeMethod = function (bits, padding) {
	    var method = createShakeOutputMethod(bits, padding, 'hex');
	    method.create = function (outputBits) {
	      return new Keccak(bits, padding, outputBits);
	    };
	    method.update = function (message, outputBits) {
	      return method.create(outputBits).update(message);
	    };
	    return createOutputMethods(method, createShakeOutputMethod, bits, padding);
	  };

	  var createCshakeMethod = function (bits, padding) {
	    var w = CSHAKE_BYTEPAD[bits];
	    var method = createCshakeOutputMethod(bits, padding, 'hex');
	    method.create = function (outputBits, n, s) {
	      if (!n && !s) {
	        return methods['shake' + bits].create(outputBits);
	      } else {
	        return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
	      }
	    };
	    method.update = function (message, outputBits, n, s) {
	      return method.create(outputBits, n, s).update(message);
	    };
	    return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
	  };

	  var createKmacMethod = function (bits, padding) {
	    var w = CSHAKE_BYTEPAD[bits];
	    var method = createKmacOutputMethod(bits, padding, 'hex');
	    method.create = function (key, outputBits, s) {
	      return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
	    };
	    method.update = function (key, message, outputBits, s) {
	      return method.create(key, outputBits, s).update(message);
	    };
	    return createOutputMethods(method, createKmacOutputMethod, bits, padding);
	  };

	  var algorithms = [
	    { name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod },
	    { name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod },
	    { name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
	    { name: 'cshake', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
	    { name: 'kmac', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
	  ];

	  var methods = {}, methodNames = [];

	  for (var i = 0; i < algorithms.length; ++i) {
	    var algorithm = algorithms[i];
	    var bits = algorithm.bits;
	    for (var j = 0; j < bits.length; ++j) {
	      var methodName = algorithm.name + '_' + bits[j];
	      methodNames.push(methodName);
	      methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
	      if (algorithm.name !== 'sha3') {
	        var newMethodName = algorithm.name + bits[j];
	        methodNames.push(newMethodName);
	        methods[newMethodName] = methods[methodName];
	      }
	    }
	  }

	  function Keccak(bits, padding, outputBits) {
	    this.blocks = [];
	    this.s = [];
	    this.padding = padding;
	    this.outputBits = outputBits;
	    this.reset = true;
	    this.finalized = false;
	    this.block = 0;
	    this.start = 0;
	    this.blockCount = (1600 - (bits << 1)) >> 5;
	    this.byteCount = this.blockCount << 2;
	    this.outputBlocks = outputBits >> 5;
	    this.extraBytes = (outputBits & 31) >> 3;

	    for (var i = 0; i < 50; ++i) {
	      this.s[i] = 0;
	    }
	  }

	  Keccak.prototype.update = function (message) {
	    if (this.finalized) {
	      throw new Error(FINALIZE_ERROR);
	    }
	    var notString, type = typeof message;
	    if (type !== 'string') {
	      if (type === 'object') {
	        if (message === null) {
	          throw new Error(INPUT_ERROR);
	        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
	          message = new Uint8Array(message);
	        } else if (!Array.isArray(message)) {
	          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
	            throw new Error(INPUT_ERROR);
	          }
	        }
	      } else {
	        throw new Error(INPUT_ERROR);
	      }
	      notString = true;
	    }
	    var blocks = this.blocks, byteCount = this.byteCount, length = message.length,
	      blockCount = this.blockCount, index = 0, s = this.s, i, code;

	    while (index < length) {
	      if (this.reset) {
	        this.reset = false;
	        blocks[0] = this.block;
	        for (i = 1; i < blockCount + 1; ++i) {
	          blocks[i] = 0;
	        }
	      }
	      if (notString) {
	        for (i = this.start; index < length && i < byteCount; ++index) {
	          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
	        }
	      } else {
	        for (i = this.start; index < length && i < byteCount; ++index) {
	          code = message.charCodeAt(index);
	          if (code < 0x80) {
	            blocks[i >> 2] |= code << SHIFT[i++ & 3];
	          } else if (code < 0x800) {
	            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
	            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
	          } else if (code < 0xd800 || code >= 0xe000) {
	            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
	            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
	            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
	          } else {
	            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
	            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
	            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
	            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
	            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
	          }
	        }
	      }
	      this.lastByteIndex = i;
	      if (i >= byteCount) {
	        this.start = i - byteCount;
	        this.block = blocks[blockCount];
	        for (i = 0; i < blockCount; ++i) {
	          s[i] ^= blocks[i];
	        }
	        f(s);
	        this.reset = true;
	      } else {
	        this.start = i;
	      }
	    }
	    return this;
	  };

	  Keccak.prototype.encode = function (x, right) {
	    var o = x & 255, n = 1;
	    var bytes = [o];
	    x = x >> 8;
	    o = x & 255;
	    while (o > 0) {
	      bytes.unshift(o);
	      x = x >> 8;
	      o = x & 255;
	      ++n;
	    }
	    if (right) {
	      bytes.push(n);
	    } else {
	      bytes.unshift(n);
	    }
	    this.update(bytes);
	    return bytes.length;
	  };

	  Keccak.prototype.encodeString = function (str) {
	    var notString, type = typeof str;
	    if (type !== 'string') {
	      if (type === 'object') {
	        if (str === null) {
	          throw new Error(INPUT_ERROR);
	        } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
	          str = new Uint8Array(str);
	        } else if (!Array.isArray(str)) {
	          if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
	            throw new Error(INPUT_ERROR);
	          }
	        }
	      } else {
	        throw new Error(INPUT_ERROR);
	      }
	      notString = true;
	    }
	    var bytes = 0, length = str.length;
	    if (notString) {
	      bytes = length;
	    } else {
	      for (var i = 0; i < str.length; ++i) {
	        var code = str.charCodeAt(i);
	        if (code < 0x80) {
	          bytes += 1;
	        } else if (code < 0x800) {
	          bytes += 2;
	        } else if (code < 0xd800 || code >= 0xe000) {
	          bytes += 3;
	        } else {
	          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
	          bytes += 4;
	        }
	      }
	    }
	    bytes += this.encode(bytes * 8);
	    this.update(str);
	    return bytes;
	  };

	  Keccak.prototype.bytepad = function (strs, w) {
	    var bytes = this.encode(w);
	    for (var i = 0; i < strs.length; ++i) {
	      bytes += this.encodeString(strs[i]);
	    }
	    var paddingBytes = w - bytes % w;
	    var zeros = [];
	    zeros.length = paddingBytes;
	    this.update(zeros);
	    return this;
	  };

	  Keccak.prototype.finalize = function () {
	    if (this.finalized) {
	      return;
	    }
	    this.finalized = true;
	    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
	    blocks[i >> 2] |= this.padding[i & 3];
	    if (this.lastByteIndex === this.byteCount) {
	      blocks[0] = blocks[blockCount];
	      for (i = 1; i < blockCount + 1; ++i) {
	        blocks[i] = 0;
	      }
	    }
	    blocks[blockCount - 1] |= 0x80000000;
	    for (i = 0; i < blockCount; ++i) {
	      s[i] ^= blocks[i];
	    }
	    f(s);
	  };

	  Keccak.prototype.toString = Keccak.prototype.hex = function () {
	    this.finalize();

	    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
	      extraBytes = this.extraBytes, i = 0, j = 0;
	    var hex = '', block;
	    while (j < outputBlocks) {
	      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
	        block = s[i];
	        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
	          HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
	          HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
	          HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
	      }
	      if (j % blockCount === 0) {
	        f(s);
	        i = 0;
	      }
	    }
	    if (extraBytes) {
	      block = s[i];
	      hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
	      if (extraBytes > 1) {
	        hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
	      }
	      if (extraBytes > 2) {
	        hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
	      }
	    }
	    return hex;
	  };

	  Keccak.prototype.arrayBuffer = function () {
	    this.finalize();

	    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
	      extraBytes = this.extraBytes, i = 0, j = 0;
	    var bytes = this.outputBits >> 3;
	    var buffer;
	    if (extraBytes) {
	      buffer = new ArrayBuffer((outputBlocks + 1) << 2);
	    } else {
	      buffer = new ArrayBuffer(bytes);
	    }
	    var array = new Uint32Array(buffer);
	    while (j < outputBlocks) {
	      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
	        array[j] = s[i];
	      }
	      if (j % blockCount === 0) {
	        f(s);
	      }
	    }
	    if (extraBytes) {
	      array[i] = s[i];
	      buffer = buffer.slice(0, bytes);
	    }
	    return buffer;
	  };

	  Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

	  Keccak.prototype.digest = Keccak.prototype.array = function () {
	    this.finalize();

	    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
	      extraBytes = this.extraBytes, i = 0, j = 0;
	    var array = [], offset, block;
	    while (j < outputBlocks) {
	      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
	        offset = j << 2;
	        block = s[i];
	        array[offset] = block & 0xFF;
	        array[offset + 1] = (block >> 8) & 0xFF;
	        array[offset + 2] = (block >> 16) & 0xFF;
	        array[offset + 3] = (block >> 24) & 0xFF;
	      }
	      if (j % blockCount === 0) {
	        f(s);
	      }
	    }
	    if (extraBytes) {
	      offset = j << 2;
	      block = s[i];
	      array[offset] = block & 0xFF;
	      if (extraBytes > 1) {
	        array[offset + 1] = (block >> 8) & 0xFF;
	      }
	      if (extraBytes > 2) {
	        array[offset + 2] = (block >> 16) & 0xFF;
	      }
	    }
	    return array;
	  };

	  function Kmac(bits, padding, outputBits) {
	    Keccak.call(this, bits, padding, outputBits);
	  }

	  Kmac.prototype = new Keccak();

	  Kmac.prototype.finalize = function () {
	    this.encode(this.outputBits, true);
	    return Keccak.prototype.finalize.call(this);
	  };

	  var f = function (s) {
	    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
	      b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
	      b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
	      b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
	    for (n = 0; n < 48; n += 2) {
	      c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
	      c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
	      c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
	      c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
	      c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
	      c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
	      c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
	      c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
	      c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
	      c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

	      h = c8 ^ ((c2 << 1) | (c3 >>> 31));
	      l = c9 ^ ((c3 << 1) | (c2 >>> 31));
	      s[0] ^= h;
	      s[1] ^= l;
	      s[10] ^= h;
	      s[11] ^= l;
	      s[20] ^= h;
	      s[21] ^= l;
	      s[30] ^= h;
	      s[31] ^= l;
	      s[40] ^= h;
	      s[41] ^= l;
	      h = c0 ^ ((c4 << 1) | (c5 >>> 31));
	      l = c1 ^ ((c5 << 1) | (c4 >>> 31));
	      s[2] ^= h;
	      s[3] ^= l;
	      s[12] ^= h;
	      s[13] ^= l;
	      s[22] ^= h;
	      s[23] ^= l;
	      s[32] ^= h;
	      s[33] ^= l;
	      s[42] ^= h;
	      s[43] ^= l;
	      h = c2 ^ ((c6 << 1) | (c7 >>> 31));
	      l = c3 ^ ((c7 << 1) | (c6 >>> 31));
	      s[4] ^= h;
	      s[5] ^= l;
	      s[14] ^= h;
	      s[15] ^= l;
	      s[24] ^= h;
	      s[25] ^= l;
	      s[34] ^= h;
	      s[35] ^= l;
	      s[44] ^= h;
	      s[45] ^= l;
	      h = c4 ^ ((c8 << 1) | (c9 >>> 31));
	      l = c5 ^ ((c9 << 1) | (c8 >>> 31));
	      s[6] ^= h;
	      s[7] ^= l;
	      s[16] ^= h;
	      s[17] ^= l;
	      s[26] ^= h;
	      s[27] ^= l;
	      s[36] ^= h;
	      s[37] ^= l;
	      s[46] ^= h;
	      s[47] ^= l;
	      h = c6 ^ ((c0 << 1) | (c1 >>> 31));
	      l = c7 ^ ((c1 << 1) | (c0 >>> 31));
	      s[8] ^= h;
	      s[9] ^= l;
	      s[18] ^= h;
	      s[19] ^= l;
	      s[28] ^= h;
	      s[29] ^= l;
	      s[38] ^= h;
	      s[39] ^= l;
	      s[48] ^= h;
	      s[49] ^= l;

	      b0 = s[0];
	      b1 = s[1];
	      b32 = (s[11] << 4) | (s[10] >>> 28);
	      b33 = (s[10] << 4) | (s[11] >>> 28);
	      b14 = (s[20] << 3) | (s[21] >>> 29);
	      b15 = (s[21] << 3) | (s[20] >>> 29);
	      b46 = (s[31] << 9) | (s[30] >>> 23);
	      b47 = (s[30] << 9) | (s[31] >>> 23);
	      b28 = (s[40] << 18) | (s[41] >>> 14);
	      b29 = (s[41] << 18) | (s[40] >>> 14);
	      b20 = (s[2] << 1) | (s[3] >>> 31);
	      b21 = (s[3] << 1) | (s[2] >>> 31);
	      b2 = (s[13] << 12) | (s[12] >>> 20);
	      b3 = (s[12] << 12) | (s[13] >>> 20);
	      b34 = (s[22] << 10) | (s[23] >>> 22);
	      b35 = (s[23] << 10) | (s[22] >>> 22);
	      b16 = (s[33] << 13) | (s[32] >>> 19);
	      b17 = (s[32] << 13) | (s[33] >>> 19);
	      b48 = (s[42] << 2) | (s[43] >>> 30);
	      b49 = (s[43] << 2) | (s[42] >>> 30);
	      b40 = (s[5] << 30) | (s[4] >>> 2);
	      b41 = (s[4] << 30) | (s[5] >>> 2);
	      b22 = (s[14] << 6) | (s[15] >>> 26);
	      b23 = (s[15] << 6) | (s[14] >>> 26);
	      b4 = (s[25] << 11) | (s[24] >>> 21);
	      b5 = (s[24] << 11) | (s[25] >>> 21);
	      b36 = (s[34] << 15) | (s[35] >>> 17);
	      b37 = (s[35] << 15) | (s[34] >>> 17);
	      b18 = (s[45] << 29) | (s[44] >>> 3);
	      b19 = (s[44] << 29) | (s[45] >>> 3);
	      b10 = (s[6] << 28) | (s[7] >>> 4);
	      b11 = (s[7] << 28) | (s[6] >>> 4);
	      b42 = (s[17] << 23) | (s[16] >>> 9);
	      b43 = (s[16] << 23) | (s[17] >>> 9);
	      b24 = (s[26] << 25) | (s[27] >>> 7);
	      b25 = (s[27] << 25) | (s[26] >>> 7);
	      b6 = (s[36] << 21) | (s[37] >>> 11);
	      b7 = (s[37] << 21) | (s[36] >>> 11);
	      b38 = (s[47] << 24) | (s[46] >>> 8);
	      b39 = (s[46] << 24) | (s[47] >>> 8);
	      b30 = (s[8] << 27) | (s[9] >>> 5);
	      b31 = (s[9] << 27) | (s[8] >>> 5);
	      b12 = (s[18] << 20) | (s[19] >>> 12);
	      b13 = (s[19] << 20) | (s[18] >>> 12);
	      b44 = (s[29] << 7) | (s[28] >>> 25);
	      b45 = (s[28] << 7) | (s[29] >>> 25);
	      b26 = (s[38] << 8) | (s[39] >>> 24);
	      b27 = (s[39] << 8) | (s[38] >>> 24);
	      b8 = (s[48] << 14) | (s[49] >>> 18);
	      b9 = (s[49] << 14) | (s[48] >>> 18);

	      s[0] = b0 ^ (~b2 & b4);
	      s[1] = b1 ^ (~b3 & b5);
	      s[10] = b10 ^ (~b12 & b14);
	      s[11] = b11 ^ (~b13 & b15);
	      s[20] = b20 ^ (~b22 & b24);
	      s[21] = b21 ^ (~b23 & b25);
	      s[30] = b30 ^ (~b32 & b34);
	      s[31] = b31 ^ (~b33 & b35);
	      s[40] = b40 ^ (~b42 & b44);
	      s[41] = b41 ^ (~b43 & b45);
	      s[2] = b2 ^ (~b4 & b6);
	      s[3] = b3 ^ (~b5 & b7);
	      s[12] = b12 ^ (~b14 & b16);
	      s[13] = b13 ^ (~b15 & b17);
	      s[22] = b22 ^ (~b24 & b26);
	      s[23] = b23 ^ (~b25 & b27);
	      s[32] = b32 ^ (~b34 & b36);
	      s[33] = b33 ^ (~b35 & b37);
	      s[42] = b42 ^ (~b44 & b46);
	      s[43] = b43 ^ (~b45 & b47);
	      s[4] = b4 ^ (~b6 & b8);
	      s[5] = b5 ^ (~b7 & b9);
	      s[14] = b14 ^ (~b16 & b18);
	      s[15] = b15 ^ (~b17 & b19);
	      s[24] = b24 ^ (~b26 & b28);
	      s[25] = b25 ^ (~b27 & b29);
	      s[34] = b34 ^ (~b36 & b38);
	      s[35] = b35 ^ (~b37 & b39);
	      s[44] = b44 ^ (~b46 & b48);
	      s[45] = b45 ^ (~b47 & b49);
	      s[6] = b6 ^ (~b8 & b0);
	      s[7] = b7 ^ (~b9 & b1);
	      s[16] = b16 ^ (~b18 & b10);
	      s[17] = b17 ^ (~b19 & b11);
	      s[26] = b26 ^ (~b28 & b20);
	      s[27] = b27 ^ (~b29 & b21);
	      s[36] = b36 ^ (~b38 & b30);
	      s[37] = b37 ^ (~b39 & b31);
	      s[46] = b46 ^ (~b48 & b40);
	      s[47] = b47 ^ (~b49 & b41);
	      s[8] = b8 ^ (~b0 & b2);
	      s[9] = b9 ^ (~b1 & b3);
	      s[18] = b18 ^ (~b10 & b12);
	      s[19] = b19 ^ (~b11 & b13);
	      s[28] = b28 ^ (~b20 & b22);
	      s[29] = b29 ^ (~b21 & b23);
	      s[38] = b38 ^ (~b30 & b32);
	      s[39] = b39 ^ (~b31 & b33);
	      s[48] = b48 ^ (~b40 & b42);
	      s[49] = b49 ^ (~b41 & b43);

	      s[0] ^= RC[n];
	      s[1] ^= RC[n + 1];
	    }
	  };

	  if (COMMON_JS) {
	    module.exports = methods;
	  } else {
	    for (i = 0; i < methodNames.length; ++i) {
	      root[methodNames[i]] = methods[methodNames[i]];
	    }
	  }
	})(); 
} (sha3$1));

var sha3Exports = sha3$1.exports;
var sha3 = /*@__PURE__*/getDefaultExportFromCjs(sha3Exports);

const version$2 = "logger/5.7.0";

let _permanentCensorErrors = false;
let _censorErrors = false;
const LogLevels = { debug: 1, "default": 2, info: 2, warning: 3, error: 4, off: 5 };
let _logLevel = LogLevels["default"];
let _globalLogger = null;
function _checkNormalize() {
    try {
        const missing = [];
        // Make sure all forms of normalization are supported
        ["NFD", "NFC", "NFKD", "NFKC"].forEach((form) => {
            try {
                if ("test".normalize(form) !== "test") {
                    throw new Error("bad normalize");
                }
                ;
            }
            catch (error) {
                missing.push(form);
            }
        });
        if (missing.length) {
            throw new Error("missing " + missing.join(", "));
        }
        if (String.fromCharCode(0xe9).normalize("NFD") !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error("broken implementation");
        }
    }
    catch (error) {
        return error.message;
    }
    return null;
}
const _normalizeError = _checkNormalize();
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["OFF"] = "OFF";
})(LogLevel || (LogLevel = {}));
var ErrorCode;
(function (ErrorCode) {
    ///////////////////
    // Generic Errors
    // Unknown Error
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    // Not Implemented
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    // Unsupported Operation
    //   - operation
    ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
    // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
    //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    // Some sort of bad response from the server
    ErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    // Timeout
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ///////////////////
    // Operational  Errors
    // Buffer Overrun
    ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
    // Numeric Fault
    //   - operation: the operation being executed
    //   - fault: the reason this faulted
    ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT";
    ///////////////////
    // Argument Errors
    // Missing new operator to an object
    //  - name: The name of the class
    ErrorCode["MISSING_NEW"] = "MISSING_NEW";
    // Invalid argument (e.g. value is incompatible with type) to a function:
    //   - argument: The argument name that was invalid
    //   - value: The value of the argument
    ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    // Missing argument to a function:
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
    // Too many arguments
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
    ///////////////////
    // Blockchain Errors
    // Call exception
    //  - transaction: the transaction
    //  - address?: the contract address
    //  - args?: The arguments passed into the function
    //  - method?: The Solidity method signature
    //  - errorSignature?: The EIP848 error signature
    //  - errorArgs?: The EIP848 error parameters
    //  - reason: The reason (only for EIP848 "Error(string)")
    ErrorCode["CALL_EXCEPTION"] = "CALL_EXCEPTION";
    // Insufficient funds (< value + gasLimit * gasPrice)
    //   - transaction: the transaction attempted
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    // Nonce has already been used
    //   - transaction: the transaction attempted
    ErrorCode["NONCE_EXPIRED"] = "NONCE_EXPIRED";
    // The replacement fee for the transaction is too low
    //   - transaction: the transaction attempted
    ErrorCode["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED";
    // The gas limit could not be estimated
    //   - transaction: the transaction passed to estimateGas
    ErrorCode["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT";
    // The transaction was replaced by one with a higher gas price
    //   - reason: "cancelled", "replaced" or "repriced"
    //   - cancelled: true if reason == "cancelled" or reason == "replaced")
    //   - hash: original transaction hash
    //   - replacement: the full TransactionsResponse for the replacement
    //   - receipt: the receipt of the replacement
    ErrorCode["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
    ///////////////////
    // Interaction Errors
    // The user rejected the action, such as signing a message or sending
    // a transaction
    ErrorCode["ACTION_REJECTED"] = "ACTION_REJECTED";
})(ErrorCode || (ErrorCode = {}));
const HEX = "0123456789abcdef";
class Logger {
    constructor(version) {
        Object.defineProperty(this, "version", {
            enumerable: true,
            value: version,
            writable: false
        });
    }
    _log(logLevel, args) {
        const level = logLevel.toLowerCase();
        if (LogLevels[level] == null) {
            this.throwArgumentError("invalid log level name", "logLevel", logLevel);
        }
        if (_logLevel > LogLevels[level]) {
            return;
        }
        console.log.apply(console, args);
    }
    debug(...args) {
        this._log(Logger.levels.DEBUG, args);
    }
    info(...args) {
        this._log(Logger.levels.INFO, args);
    }
    warn(...args) {
        this._log(Logger.levels.WARNING, args);
    }
    makeError(message, code, params) {
        // Errors are being censored
        if (_censorErrors) {
            return this.makeError("censored error", code, {});
        }
        if (!code) {
            code = Logger.errors.UNKNOWN_ERROR;
        }
        if (!params) {
            params = {};
        }
        const messageDetails = [];
        Object.keys(params).forEach((key) => {
            const value = params[key];
            try {
                if (value instanceof Uint8Array) {
                    let hex = "";
                    for (let i = 0; i < value.length; i++) {
                        hex += HEX[value[i] >> 4];
                        hex += HEX[value[i] & 0x0f];
                    }
                    messageDetails.push(key + "=Uint8Array(0x" + hex + ")");
                }
                else {
                    messageDetails.push(key + "=" + JSON.stringify(value));
                }
            }
            catch (error) {
                messageDetails.push(key + "=" + JSON.stringify(params[key].toString()));
            }
        });
        messageDetails.push(`code=${code}`);
        messageDetails.push(`version=${this.version}`);
        const reason = message;
        let url = "";
        switch (code) {
            case ErrorCode.NUMERIC_FAULT: {
                url = "NUMERIC_FAULT";
                const fault = message;
                switch (fault) {
                    case "overflow":
                    case "underflow":
                    case "division-by-zero":
                        url += "-" + fault;
                        break;
                    case "negative-power":
                    case "negative-width":
                        url += "-unsupported";
                        break;
                    case "unbound-bitwise-result":
                        url += "-unbound-result";
                        break;
                }
                break;
            }
            case ErrorCode.CALL_EXCEPTION:
            case ErrorCode.INSUFFICIENT_FUNDS:
            case ErrorCode.MISSING_NEW:
            case ErrorCode.NONCE_EXPIRED:
            case ErrorCode.REPLACEMENT_UNDERPRICED:
            case ErrorCode.TRANSACTION_REPLACED:
            case ErrorCode.UNPREDICTABLE_GAS_LIMIT:
                url = code;
                break;
        }
        if (url) {
            message += " [ See: https:/\/links.ethers.org/v5-errors-" + url + " ]";
        }
        if (messageDetails.length) {
            message += " (" + messageDetails.join(", ") + ")";
        }
        // @TODO: Any??
        const error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.keys(params).forEach(function (key) {
            error[key] = params[key];
        });
        return error;
    }
    throwError(message, code, params) {
        throw this.makeError(message, code, params);
    }
    throwArgumentError(message, name, value) {
        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
            argument: name,
            value: value
        });
    }
    assert(condition, message, code, params) {
        if (!!condition) {
            return;
        }
        this.throwError(message, code, params);
    }
    assertArgument(condition, message, name, value) {
        if (!!condition) {
            return;
        }
        this.throwArgumentError(message, name, value);
    }
    checkNormalize(message) {
        if (_normalizeError) {
            this.throwError("platform missing String.prototype.normalize", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "String.prototype.normalize", form: _normalizeError
            });
        }
    }
    checkSafeUint53(value, message) {
        if (typeof (value) !== "number") {
            return;
        }
        if (message == null) {
            message = "value not safe";
        }
        if (value < 0 || value >= 0x1fffffffffffff) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "out-of-safe-range",
                value: value
            });
        }
        if (value % 1) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "non-integer",
                value: value
            });
        }
    }
    checkArgumentCount(count, expectedCount, message) {
        if (message) {
            message = ": " + message;
        }
        else {
            message = "";
        }
        if (count < expectedCount) {
            this.throwError("missing argument" + message, Logger.errors.MISSING_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
        if (count > expectedCount) {
            this.throwError("too many arguments" + message, Logger.errors.UNEXPECTED_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
    }
    checkNew(target, kind) {
        if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    checkAbstract(target, kind) {
        if (target === kind) {
            this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: "new" });
        }
        else if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    }
    static globalLogger() {
        if (!_globalLogger) {
            _globalLogger = new Logger(version$2);
        }
        return _globalLogger;
    }
    static setCensorship(censorship, permanent) {
        if (!censorship && permanent) {
            this.globalLogger().throwError("cannot permanently disable censorship", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        if (_permanentCensorErrors) {
            if (!censorship) {
                return;
            }
            this.globalLogger().throwError("error censorship permanent", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
    }
    static setLogLevel(logLevel) {
        const level = LogLevels[logLevel.toLowerCase()];
        if (level == null) {
            Logger.globalLogger().warn("invalid log level - " + logLevel);
            return;
        }
        _logLevel = level;
    }
    static from(version) {
        return new Logger(version);
    }
}
Logger.errors = ErrorCode;
Logger.levels = LogLevel;

const version$1 = "bytes/5.7.0";

const logger = new Logger(version$1);
///////////////////////////////
function isHexable(value) {
    return !!(value.toHexString);
}
function addSlice(array) {
    if (array.slice) {
        return array;
    }
    array.slice = function () {
        const args = Array.prototype.slice.call(arguments);
        return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
    };
    return array;
}
function isInteger(value) {
    return (typeof (value) === "number" && value == value && (value % 1) === 0);
}
function isBytes(value) {
    if (value == null) {
        return false;
    }
    if (value.constructor === Uint8Array) {
        return true;
    }
    if (typeof (value) === "string") {
        return false;
    }
    if (!isInteger(value.length) || value.length < 0) {
        return false;
    }
    for (let i = 0; i < value.length; i++) {
        const v = value[i];
        if (!isInteger(v) || v < 0 || v >= 256) {
            return false;
        }
    }
    return true;
}
function arrayify(value, options) {
    if (!options) {
        options = {};
    }
    if (typeof (value) === "number") {
        logger.checkSafeUint53(value, "invalid arrayify value");
        const result = [];
        while (value) {
            result.unshift(value & 0xff);
            value = parseInt(String(value / 256));
        }
        if (result.length === 0) {
            result.push(0);
        }
        return addSlice(new Uint8Array(result));
    }
    if (options.allowMissingPrefix && typeof (value) === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
    }
    if (isHexable(value)) {
        value = value.toHexString();
    }
    if (isHexString$1(value)) {
        let hex = value.substring(2);
        if (hex.length % 2) {
            if (options.hexPad === "left") {
                hex = "0" + hex;
            }
            else if (options.hexPad === "right") {
                hex += "0";
            }
            else {
                logger.throwArgumentError("hex data is odd-length", "value", value);
            }
        }
        const result = [];
        for (let i = 0; i < hex.length; i += 2) {
            result.push(parseInt(hex.substring(i, i + 2), 16));
        }
        return addSlice(new Uint8Array(result));
    }
    if (isBytes(value)) {
        return addSlice(new Uint8Array(value));
    }
    return logger.throwArgumentError("invalid arrayify value", "value", value);
}
function isHexString$1(value, length) {
    if (typeof (value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false;
    }
    if (length && value.length !== 2 + 2 * length) {
        return false;
    }
    return true;
}
const HexCharacters$1 = "0123456789abcdef";
function hexlify$1(value, options) {
    if (!options) {
        options = {};
    }
    if (typeof (value) === "number") {
        logger.checkSafeUint53(value, "invalid hexlify value");
        let hex = "";
        while (value) {
            hex = HexCharacters$1[value & 0xf] + hex;
            value = Math.floor(value / 16);
        }
        if (hex.length) {
            if (hex.length % 2) {
                hex = "0" + hex;
            }
            return "0x" + hex;
        }
        return "0x00";
    }
    if (typeof (value) === "bigint") {
        value = value.toString(16);
        if (value.length % 2) {
            return ("0x0" + value);
        }
        return "0x" + value;
    }
    if (options.allowMissingPrefix && typeof (value) === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
    }
    if (isHexable(value)) {
        return value.toHexString();
    }
    if (isHexString$1(value)) {
        if (value.length % 2) {
            if (options.hexPad === "left") {
                value = "0x0" + value.substring(2);
            }
            else if (options.hexPad === "right") {
                value += "0";
            }
            else {
                logger.throwArgumentError("hex data is odd-length", "value", value);
            }
        }
        return value.toLowerCase();
    }
    if (isBytes(value)) {
        let result = "0x";
        for (let i = 0; i < value.length; i++) {
            let v = value[i];
            result += HexCharacters$1[(v & 0xf0) >> 4] + HexCharacters$1[v & 0x0f];
        }
        return result;
    }
    return logger.throwArgumentError("invalid hexlify value", "value", value);
}
function hexConcat(items) {
    let result = "0x";
    items.forEach((item) => {
        result += hexlify$1(item).substring(2);
    });
    return result;
}

function keccak256$1(data) {
    return '0x' + sha3.keccak_256(arrayify(data));
}

const DEFAULT_CHUNK_SIZE = 256; // bytes
const DEFAULT_SEGMENT_MAX_CHUNKS = 1024;
const DEFAULT_SEGMENT_SIZE = DEFAULT_CHUNK_SIZE * DEFAULT_SEGMENT_MAX_CHUNKS;
const EMPTY_CHUNK = new Uint8Array(DEFAULT_CHUNK_SIZE);
const EMPTY_CHUNK_HASH = keccak256$1(EMPTY_CHUNK);
const SMALL_FILE_SIZE_THRESHOLD = 256 * 1024;
const TIMEOUT_MS = 3000_000; // 60 seconds
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

/* Do NOT modify this file; see /src.ts/_admin/update-version.ts */
/**
 *  The current version of Ethers.
 */
const version = "6.13.1";

/**
 *  Property helper functions.
 *
 *  @_subsection api/utils:Properties  [about-properties]
 */
function checkType(value, type, name) {
    const types = type.split("|").map(t => t.trim());
    for (let i = 0; i < types.length; i++) {
        switch (type) {
            case "any":
                return;
            case "bigint":
            case "boolean":
            case "number":
            case "string":
                if (typeof (value) === type) {
                    return;
                }
        }
    }
    const error = new Error(`invalid value for type ${type}`);
    error.code = "INVALID_ARGUMENT";
    error.argument = `value.${name}`;
    error.value = value;
    throw error;
}
/**
 *  Resolves to a new object that is a copy of %%value%%, but with all
 *  values resolved.
 */
async function resolveProperties(value) {
    const keys = Object.keys(value);
    const results = await Promise.all(keys.map((k) => Promise.resolve(value[k])));
    return results.reduce((accum, v, index) => {
        accum[keys[index]] = v;
        return accum;
    }, {});
}
/**
 *  Assigns the %%values%% to %%target%% as read-only values.
 *
 *  It %%types%% is specified, the values are checked.
 */
function defineProperties(target, values, types) {
    for (let key in values) {
        let value = values[key];
        const type = (types ? types[key] : null);
        if (type) {
            checkType(value, type, key);
        }
        Object.defineProperty(target, key, { enumerable: true, value, writable: false });
    }
}

/**
 *  All errors in ethers include properties to ensure they are both
 *  human-readable (i.e. ``.message``) and machine-readable (i.e. ``.code``).
 *
 *  The [[isError]] function can be used to check the error ``code`` and
 *  provide a type guard for the properties present on that error interface.
 *
 *  @_section: api/utils/errors:Errors  [about-errors]
 */
function stringify(value) {
    if (value == null) {
        return "null";
    }
    if (Array.isArray(value)) {
        return "[ " + (value.map(stringify)).join(", ") + " ]";
    }
    if (value instanceof Uint8Array) {
        const HEX = "0123456789abcdef";
        let result = "0x";
        for (let i = 0; i < value.length; i++) {
            result += HEX[value[i] >> 4];
            result += HEX[value[i] & 0xf];
        }
        return result;
    }
    if (typeof (value) === "object" && typeof (value.toJSON) === "function") {
        return stringify(value.toJSON());
    }
    switch (typeof (value)) {
        case "boolean":
        case "symbol":
            return value.toString();
        case "bigint":
            return BigInt(value).toString();
        case "number":
            return (value).toString();
        case "string":
            return JSON.stringify(value);
        case "object": {
            const keys = Object.keys(value);
            keys.sort();
            return "{ " + keys.map((k) => `${stringify(k)}: ${stringify(value[k])}`).join(", ") + " }";
        }
    }
    return `[ COULD NOT SERIALIZE ]`;
}
/**
 *  Returns true if the %%error%% matches an error thrown by ethers
 *  that matches the error %%code%%.
 *
 *  In TypeScript environments, this can be used to check that %%error%%
 *  matches an EthersError type, which means the expected properties will
 *  be set.
 *
 *  @See [ErrorCodes](api:ErrorCode)
 *  @example
 *    try {
 *      // code....
 *    } catch (e) {
 *      if (isError(e, "CALL_EXCEPTION")) {
 *          // The Type Guard has validated this object
 *          console.log(e.data);
 *      }
 *    }
 */
function isError(error, code) {
    return (error && error.code === code);
}
/**
 *  Returns true if %%error%% is a [[CallExceptionError].
 */
function isCallException(error) {
    return isError(error, "CALL_EXCEPTION");
}
/**
 *  Returns a new Error configured to the format ethers emits errors, with
 *  the %%message%%, [[api:ErrorCode]] %%code%% and additional properties
 *  for the corresponding EthersError.
 *
 *  Each error in ethers includes the version of ethers, a
 *  machine-readable [[ErrorCode]], and depending on %%code%%, additional
 *  required properties. The error message will also include the %%message%%,
 *  ethers version, %%code%% and all additional properties, serialized.
 */
function makeError(message, code, info) {
    let shortMessage = message;
    {
        const details = [];
        if (info) {
            if ("message" in info || "code" in info || "name" in info) {
                throw new Error(`value will overwrite populated values: ${stringify(info)}`);
            }
            for (const key in info) {
                if (key === "shortMessage") {
                    continue;
                }
                const value = (info[key]);
                //                try {
                details.push(key + "=" + stringify(value));
                //                } catch (error: any) {
                //                console.log("MMM", error.message);
                //                    details.push(key + "=[could not serialize object]");
                //                }
            }
        }
        details.push(`code=${code}`);
        details.push(`version=${version}`);
        if (details.length) {
            message += " (" + details.join(", ") + ")";
        }
    }
    let error;
    switch (code) {
        case "INVALID_ARGUMENT":
            error = new TypeError(message);
            break;
        case "NUMERIC_FAULT":
        case "BUFFER_OVERRUN":
            error = new RangeError(message);
            break;
        default:
            error = new Error(message);
    }
    defineProperties(error, { code });
    if (info) {
        Object.assign(error, info);
    }
    if (error.shortMessage == null) {
        defineProperties(error, { shortMessage });
    }
    return error;
}
/**
 *  Throws an EthersError with %%message%%, %%code%% and additional error
 *  %%info%% when %%check%% is falsish..
 *
 *  @see [[api:makeError]]
 */
function assert(check, message, code, info) {
    if (!check) {
        throw makeError(message, code, info);
    }
}
/**
 *  A simple helper to simply ensuring provided arguments match expected
 *  constraints, throwing if not.
 *
 *  In TypeScript environments, the %%check%% has been asserted true, so
 *  any further code does not need additional compile-time checks.
 */
function assertArgument(check, message, name, value) {
    assert(check, message, "INVALID_ARGUMENT", { argument: name, value: value });
}
function assertArgumentCount(count, expectedCount, message) {
    if (message == null) {
        message = "";
    }
    if (message) {
        message = ": " + message;
    }
    assert(count >= expectedCount, "missing arguemnt" + message, "MISSING_ARGUMENT", {
        count: count,
        expectedCount: expectedCount
    });
    assert(count <= expectedCount, "too many arguments" + message, "UNEXPECTED_ARGUMENT", {
        count: count,
        expectedCount: expectedCount
    });
}
const _normalizeForms = ["NFD", "NFC", "NFKD", "NFKC"].reduce((accum, form) => {
    try {
        // General test for normalize
        /* c8 ignore start */
        if ("test".normalize(form) !== "test") {
            throw new Error("bad");
        }
        ;
        /* c8 ignore stop */
        if (form === "NFD") {
            const check = String.fromCharCode(0xe9).normalize("NFD");
            const expected = String.fromCharCode(0x65, 0x0301);
            /* c8 ignore start */
            if (check !== expected) {
                throw new Error("broken");
            }
            /* c8 ignore stop */
        }
        accum.push(form);
    }
    catch (error) { }
    return accum;
}, []);
/**
 *  Throws if the normalization %%form%% is not supported.
 */
function assertNormalize(form) {
    assert(_normalizeForms.indexOf(form) >= 0, "platform missing String.prototype.normalize", "UNSUPPORTED_OPERATION", {
        operation: "String.prototype.normalize", info: { form }
    });
}
/**
 *  Many classes use file-scoped values to guard the constructor,
 *  making it effectively private. This facilitates that pattern
 *  by ensuring the %%givenGaurd%% matches the file-scoped %%guard%%,
 *  throwing if not, indicating the %%className%% if provided.
 */
function assertPrivate(givenGuard, guard, className) {
    if (className == null) {
        className = "";
    }
    if (givenGuard !== guard) {
        let method = className, operation = "new";
        if (className) {
            method += ".";
            operation += " " + className;
        }
        assert(false, `private constructor; use ${method}from* methods`, "UNSUPPORTED_OPERATION", {
            operation
        });
    }
}

/**
 *  Some data helpers.
 *
 *
 *  @_subsection api/utils:Data Helpers  [about-data]
 */
function _getBytes(value, name, copy) {
    if (value instanceof Uint8Array) {
        if (copy) {
            return new Uint8Array(value);
        }
        return value;
    }
    if (typeof (value) === "string" && value.match(/^0x(?:[0-9a-f][0-9a-f])*$/i)) {
        const result = new Uint8Array((value.length - 2) / 2);
        let offset = 2;
        for (let i = 0; i < result.length; i++) {
            result[i] = parseInt(value.substring(offset, offset + 2), 16);
            offset += 2;
        }
        return result;
    }
    assertArgument(false, "invalid BytesLike value", name || "value", value);
}
/**
 *  Get a typed Uint8Array for %%value%%. If already a Uint8Array
 *  the original %%value%% is returned; if a copy is required use
 *  [[getBytesCopy]].
 *
 *  @see: getBytesCopy
 */
function getBytes(value, name) {
    return _getBytes(value, name, false);
}
/**
 *  Get a typed Uint8Array for %%value%%, creating a copy if necessary
 *  to prevent any modifications of the returned value from being
 *  reflected elsewhere.
 *
 *  @see: getBytes
 */
function getBytesCopy(value, name) {
    return _getBytes(value, name, true);
}
/**
 *  Returns true if %%value%% is a valid [[HexString]].
 *
 *  If %%length%% is ``true`` or a //number//, it also checks that
 *  %%value%% is a valid [[DataHexString]] of %%length%% (if a //number//)
 *  bytes of data (e.g. ``0x1234`` is 2 bytes).
 */
function isHexString(value, length) {
    if (typeof (value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false;
    }
    if (typeof (length) === "number" && value.length !== 2 + 2 * length) {
        return false;
    }
    if (length === true && (value.length % 2) !== 0) {
        return false;
    }
    return true;
}
/**
 *  Returns true if %%value%% is a valid representation of arbitrary
 *  data (i.e. a valid [[DataHexString]] or a Uint8Array).
 */
function isBytesLike(value) {
    return (isHexString(value, true) || (value instanceof Uint8Array));
}
const HexCharacters = "0123456789abcdef";
/**
 *  Returns a [[DataHexString]] representation of %%data%%.
 */
function hexlify(data) {
    const bytes = getBytes(data);
    let result = "0x";
    for (let i = 0; i < bytes.length; i++) {
        const v = bytes[i];
        result += HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f];
    }
    return result;
}
/**
 *  Returns a [[DataHexString]] by concatenating all values
 *  within %%data%%.
 */
function concat(datas) {
    return "0x" + datas.map((d) => hexlify(d).substring(2)).join("");
}
/**
 *  Returns the length of %%data%%, in bytes.
 */
function dataLength(data) {
    if (isHexString(data, true)) {
        return (data.length - 2) / 2;
    }
    return getBytes(data).length;
}
/**
 *  Returns a [[DataHexString]] by slicing %%data%% from the %%start%%
 *  offset to the %%end%% offset.
 *
 *  By default %%start%% is 0 and %%end%% is the length of %%data%%.
 */
function dataSlice(data, start, end) {
    const bytes = getBytes(data);
    if (end != null && end > bytes.length) {
        assert(false, "cannot slice beyond data bounds", "BUFFER_OVERRUN", {
            buffer: bytes, length: bytes.length, offset: end
        });
    }
    return hexlify(bytes.slice((start == null) ? 0 : start, (end == null) ? bytes.length : end));
}
function zeroPad(data, length, left) {
    const bytes = getBytes(data);
    assert(length >= bytes.length, "padding exceeds data length", "BUFFER_OVERRUN", {
        buffer: new Uint8Array(bytes),
        length: length,
        offset: length + 1
    });
    const result = new Uint8Array(length);
    result.fill(0);
    if (left) {
        result.set(bytes, length - bytes.length);
    }
    else {
        result.set(bytes, 0);
    }
    return hexlify(result);
}
/**
 *  Return the [[DataHexString]] of %%data%% padded on the **left**
 *  to %%length%% bytes.
 *
 *  If %%data%% already exceeds %%length%%, a [[BufferOverrunError]] is
 *  thrown.
 *
 *  This pads data the same as **values** are in Solidity
 *  (e.g. ``uint128``).
 */
function zeroPadValue(data, length) {
    return zeroPad(data, length, true);
}
/**
 *  Return the [[DataHexString]] of %%data%% padded on the **right**
 *  to %%length%% bytes.
 *
 *  If %%data%% already exceeds %%length%%, a [[BufferOverrunError]] is
 *  thrown.
 *
 *  This pads data the same as **bytes** are in Solidity
 *  (e.g. ``bytes16``).
 */
function zeroPadBytes(data, length) {
    return zeroPad(data, length, false);
}

/**
 *  Some mathematic operations.
 *
 *  @_subsection: api/utils:Math Helpers  [about-maths]
 */
const BN_0$8 = BigInt(0);
const BN_1$3 = BigInt(1);
//const BN_Max256 = (BN_1 << BigInt(256)) - BN_1;
// IEEE 754 support 53-bits of mantissa
const maxValue = 0x1fffffffffffff;
/**
 *  Convert %%value%% from a twos-compliment representation of %%width%%
 *  bits to its value.
 *
 *  If the highest bit is ``1``, the result will be negative.
 */
function fromTwos(_value, _width) {
    const value = getUint(_value, "value");
    const width = BigInt(getNumber(_width, "width"));
    assert((value >> width) === BN_0$8, "overflow", "NUMERIC_FAULT", {
        operation: "fromTwos", fault: "overflow", value: _value
    });
    // Top bit set; treat as a negative value
    if (value >> (width - BN_1$3)) {
        const mask = (BN_1$3 << width) - BN_1$3;
        return -(((~value) & mask) + BN_1$3);
    }
    return value;
}
/**
 *  Convert %%value%% to a twos-compliment representation of
 *  %%width%% bits.
 *
 *  The result will always be positive.
 */
function toTwos(_value, _width) {
    let value = getBigInt(_value, "value");
    const width = BigInt(getNumber(_width, "width"));
    const limit = (BN_1$3 << (width - BN_1$3));
    if (value < BN_0$8) {
        value = -value;
        assert(value <= limit, "too low", "NUMERIC_FAULT", {
            operation: "toTwos", fault: "overflow", value: _value
        });
        const mask = (BN_1$3 << width) - BN_1$3;
        return ((~value) & mask) + BN_1$3;
    }
    else {
        assert(value < limit, "too high", "NUMERIC_FAULT", {
            operation: "toTwos", fault: "overflow", value: _value
        });
    }
    return value;
}
/**
 *  Mask %%value%% with a bitmask of %%bits%% ones.
 */
function mask(_value, _bits) {
    const value = getUint(_value, "value");
    const bits = BigInt(getNumber(_bits, "bits"));
    return value & ((BN_1$3 << bits) - BN_1$3);
}
/**
 *  Gets a BigInt from %%value%%. If it is an invalid value for
 *  a BigInt, then an ArgumentError will be thrown for %%name%%.
 */
function getBigInt(value, name) {
    switch (typeof (value)) {
        case "bigint": return value;
        case "number":
            assertArgument(Number.isInteger(value), "underflow", name || "value", value);
            assertArgument(value >= -maxValue && value <= maxValue, "overflow", name || "value", value);
            return BigInt(value);
        case "string":
            try {
                if (value === "") {
                    throw new Error("empty string");
                }
                if (value[0] === "-" && value[1] !== "-") {
                    return -BigInt(value.substring(1));
                }
                return BigInt(value);
            }
            catch (e) {
                assertArgument(false, `invalid BigNumberish string: ${e.message}`, name || "value", value);
            }
    }
    assertArgument(false, "invalid BigNumberish value", name || "value", value);
}
/**
 *  Returns %%value%% as a bigint, validating it is valid as a bigint
 *  value and that it is positive.
 */
function getUint(value, name) {
    const result = getBigInt(value, name);
    assert(result >= BN_0$8, "unsigned value cannot be negative", "NUMERIC_FAULT", {
        fault: "overflow", operation: "getUint", value
    });
    return result;
}
const Nibbles = "0123456789abcdef";
/*
 * Converts %%value%% to a BigInt. If %%value%% is a Uint8Array, it
 * is treated as Big Endian data.
 */
function toBigInt(value) {
    if (value instanceof Uint8Array) {
        let result = "0x0";
        for (const v of value) {
            result += Nibbles[v >> 4];
            result += Nibbles[v & 0x0f];
        }
        return BigInt(result);
    }
    return getBigInt(value);
}
/**
 *  Gets a //number// from %%value%%. If it is an invalid value for
 *  a //number//, then an ArgumentError will be thrown for %%name%%.
 */
function getNumber(value, name) {
    switch (typeof (value)) {
        case "bigint":
            assertArgument(value >= -maxValue && value <= maxValue, "overflow", name || "value", value);
            return Number(value);
        case "number":
            assertArgument(Number.isInteger(value), "underflow", name || "value", value);
            assertArgument(value >= -maxValue && value <= maxValue, "overflow", name || "value", value);
            return value;
        case "string":
            try {
                if (value === "") {
                    throw new Error("empty string");
                }
                return getNumber(BigInt(value), name);
            }
            catch (e) {
                assertArgument(false, `invalid numeric string: ${e.message}`, name || "value", value);
            }
    }
    assertArgument(false, "invalid numeric value", name || "value", value);
}
/**
 *  Converts %%value%% to a number. If %%value%% is a Uint8Array, it
 *  is treated as Big Endian data. Throws if the value is not safe.
 */
function toNumber(value) {
    return getNumber(toBigInt(value));
}
/**
 *  Converts %%value%% to a Big Endian hexstring, optionally padded to
 *  %%width%% bytes.
 */
function toBeHex(_value, _width) {
    const value = getUint(_value, "value");
    let result = value.toString(16);
    if (_width == null) {
        // Ensure the value is of even length
        if (result.length % 2) {
            result = "0" + result;
        }
    }
    else {
        const width = getNumber(_width, "width");
        assert(width * 2 >= result.length, `value exceeds width (${width} bytes)`, "NUMERIC_FAULT", {
            operation: "toBeHex",
            fault: "overflow",
            value: _value
        });
        // Pad the value to the required width
        while (result.length < (width * 2)) {
            result = "0" + result;
        }
    }
    return "0x" + result;
}
/**
 *  Converts %%value%% to a Big Endian Uint8Array.
 */
function toBeArray(_value) {
    const value = getUint(_value, "value");
    if (value === BN_0$8) {
        return new Uint8Array([]);
    }
    let hex = value.toString(16);
    if (hex.length % 2) {
        hex = "0" + hex;
    }
    const result = new Uint8Array(hex.length / 2);
    for (let i = 0; i < result.length; i++) {
        const offset = i * 2;
        result[i] = parseInt(hex.substring(offset, offset + 2), 16);
    }
    return result;
}
/**
 *  Returns a [[HexString]] for %%value%% safe to use as a //Quantity//.
 *
 *  A //Quantity// does not have and leading 0 values unless the value is
 *  the literal value `0x0`. This is most commonly used for JSSON-RPC
 *  numeric values.
 */
function toQuantity(value) {
    let result = hexlify(isBytesLike(value) ? value : toBeArray(value)).substring(2);
    while (result.startsWith("0")) {
        result = result.substring(1);
    }
    if (result === "") {
        result = "0";
    }
    return "0x" + result;
}

/**
 *  The [Base58 Encoding](link-base58) scheme allows a **numeric** value
 *  to be encoded as a compact string using a radix of 58 using only
 *  alpha-numeric characters. Confusingly similar characters are omitted
 *  (i.e. ``"l0O"``).
 *
 *  Note that Base58 encodes a **numeric** value, not arbitrary bytes,
 *  since any zero-bytes on the left would get removed. To mitigate this
 *  issue most schemes that use Base58 choose specific high-order values
 *  to ensure non-zero prefixes.
 *
 *  @_subsection: api/utils:Base58 Encoding [about-base58]
 */
const Alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
BigInt(0);
const BN_58 = BigInt(58);
/**
 *  Encode %%value%% as a Base58-encoded string.
 */
function encodeBase58(_value) {
    const bytes = getBytes(_value);
    let value = toBigInt(bytes);
    let result = "";
    while (value) {
        result = Alphabet[Number(value % BN_58)] + result;
        value /= BN_58;
    }
    // Account for leading padding zeros
    for (let i = 0; i < bytes.length; i++) {
        if (bytes[i]) {
            break;
        }
        result = Alphabet[0] + result;
    }
    return result;
}

// utils/base64-browser
function decodeBase64(textData) {
    textData = atob(textData);
    const data = new Uint8Array(textData.length);
    for (let i = 0; i < textData.length; i++) {
        data[i] = textData.charCodeAt(i);
    }
    return getBytes(data);
}
function encodeBase64(_data) {
    const data = getBytes(_data);
    let textData = "";
    for (let i = 0; i < data.length; i++) {
        textData += String.fromCharCode(data[i]);
    }
    return btoa(textData);
}

/**
 *  Events allow for applications to use the observer pattern, which
 *  allows subscribing and publishing events, outside the normal
 *  execution paths.
 *
 *  @_section api/utils/events:Events  [about-events]
 */
/**
 *  When an [[EventEmitterable]] triggers a [[Listener]], the
 *  callback always ahas one additional argument passed, which is
 *  an **EventPayload**.
 */
class EventPayload {
    /**
     *  The event filter.
     */
    filter;
    /**
     *  The **EventEmitterable**.
     */
    emitter;
    #listener;
    /**
     *  Create a new **EventPayload** for %%emitter%% with
     *  the %%listener%% and for %%filter%%.
     */
    constructor(emitter, listener, filter) {
        this.#listener = listener;
        defineProperties(this, { emitter, filter });
    }
    /**
     *  Unregister the triggered listener for future events.
     */
    async removeListener() {
        if (this.#listener == null) {
            return;
        }
        await this.emitter.off(this.filter, this.#listener);
    }
}

/**
 *  Using strings in Ethereum (or any security-basd system) requires
 *  additional care. These utilities attempt to mitigate some of the
 *  safety issues as well as provide the ability to recover and analyse
 *  strings.
 *
 *  @_subsection api/utils:Strings and UTF-8  [about-strings]
 */
function errorFunc(reason, offset, bytes, output, badCodepoint) {
    assertArgument(false, `invalid codepoint at offset ${offset}; ${reason}`, "bytes", bytes);
}
function ignoreFunc(reason, offset, bytes, output, badCodepoint) {
    // If there is an invalid prefix (including stray continuation), skip any additional continuation bytes
    if (reason === "BAD_PREFIX" || reason === "UNEXPECTED_CONTINUE") {
        let i = 0;
        for (let o = offset + 1; o < bytes.length; o++) {
            if (bytes[o] >> 6 !== 0x02) {
                break;
            }
            i++;
        }
        return i;
    }
    // This byte runs us past the end of the string, so just jump to the end
    // (but the first byte was read already read and therefore skipped)
    if (reason === "OVERRUN") {
        return bytes.length - offset - 1;
    }
    // Nothing to skip
    return 0;
}
function replaceFunc(reason, offset, bytes, output, badCodepoint) {
    // Overlong representations are otherwise "valid" code points; just non-deistingtished
    if (reason === "OVERLONG") {
        assertArgument(typeof (badCodepoint) === "number", "invalid bad code point for replacement", "badCodepoint", badCodepoint);
        output.push(badCodepoint);
        return 0;
    }
    // Put the replacement character into the output
    output.push(0xfffd);
    // Otherwise, process as if ignoring errors
    return ignoreFunc(reason, offset, bytes);
}
/**
 *  A handful of popular, built-in UTF-8 error handling strategies.
 *
 *  **``"error"``** - throws on ANY illegal UTF-8 sequence or
 *  non-canonical (overlong) codepoints (this is the default)
 *
 *  **``"ignore"``** - silently drops any illegal UTF-8 sequence
 *  and accepts non-canonical (overlong) codepoints
 *
 *  **``"replace"``** - replace any illegal UTF-8 sequence with the
 *  UTF-8 replacement character (i.e. ``"\\ufffd"``) and accepts
 *  non-canonical (overlong) codepoints
 *
 *  @returns: Record<"error" | "ignore" | "replace", Utf8ErrorFunc>
 */
const Utf8ErrorFuncs = Object.freeze({
    error: errorFunc,
    ignore: ignoreFunc,
    replace: replaceFunc
});
// http://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript#13691499
function getUtf8CodePoints(_bytes, onError) {
    if (onError == null) {
        onError = Utf8ErrorFuncs.error;
    }
    const bytes = getBytes(_bytes, "bytes");
    const result = [];
    let i = 0;
    // Invalid bytes are ignored
    while (i < bytes.length) {
        const c = bytes[i++];
        // 0xxx xxxx
        if (c >> 7 === 0) {
            result.push(c);
            continue;
        }
        // Multibyte; how many bytes left for this character?
        let extraLength = null;
        let overlongMask = null;
        // 110x xxxx 10xx xxxx
        if ((c & 0xe0) === 0xc0) {
            extraLength = 1;
            overlongMask = 0x7f;
            // 1110 xxxx 10xx xxxx 10xx xxxx
        }
        else if ((c & 0xf0) === 0xe0) {
            extraLength = 2;
            overlongMask = 0x7ff;
            // 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx
        }
        else if ((c & 0xf8) === 0xf0) {
            extraLength = 3;
            overlongMask = 0xffff;
        }
        else {
            if ((c & 0xc0) === 0x80) {
                i += onError("UNEXPECTED_CONTINUE", i - 1, bytes, result);
            }
            else {
                i += onError("BAD_PREFIX", i - 1, bytes, result);
            }
            continue;
        }
        // Do we have enough bytes in our data?
        if (i - 1 + extraLength >= bytes.length) {
            i += onError("OVERRUN", i - 1, bytes, result);
            continue;
        }
        // Remove the length prefix from the char
        let res = c & ((1 << (8 - extraLength - 1)) - 1);
        for (let j = 0; j < extraLength; j++) {
            let nextChar = bytes[i];
            // Invalid continuation byte
            if ((nextChar & 0xc0) != 0x80) {
                i += onError("MISSING_CONTINUE", i, bytes, result);
                res = null;
                break;
            }
            res = (res << 6) | (nextChar & 0x3f);
            i++;
        }
        // See above loop for invalid continuation byte
        if (res === null) {
            continue;
        }
        // Maximum code point
        if (res > 0x10ffff) {
            i += onError("OUT_OF_RANGE", i - 1 - extraLength, bytes, result, res);
            continue;
        }
        // Reserved for UTF-16 surrogate halves
        if (res >= 0xd800 && res <= 0xdfff) {
            i += onError("UTF16_SURROGATE", i - 1 - extraLength, bytes, result, res);
            continue;
        }
        // Check for overlong sequences (more bytes than needed)
        if (res <= overlongMask) {
            i += onError("OVERLONG", i - 1 - extraLength, bytes, result, res);
            continue;
        }
        result.push(res);
    }
    return result;
}
// http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
/**
 *  Returns the UTF-8 byte representation of %%str%%.
 *
 *  If %%form%% is specified, the string is normalized.
 */
function toUtf8Bytes(str, form) {
    assertArgument(typeof (str) === "string", "invalid string value", "str", str);
    if (form != null) {
        assertNormalize(form);
        str = str.normalize(form);
    }
    let result = [];
    for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        if (c < 0x80) {
            result.push(c);
        }
        else if (c < 0x800) {
            result.push((c >> 6) | 0xc0);
            result.push((c & 0x3f) | 0x80);
        }
        else if ((c & 0xfc00) == 0xd800) {
            i++;
            const c2 = str.charCodeAt(i);
            assertArgument(i < str.length && ((c2 & 0xfc00) === 0xdc00), "invalid surrogate pair", "str", str);
            // Surrogate Pair
            const pair = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
            result.push((pair >> 18) | 0xf0);
            result.push(((pair >> 12) & 0x3f) | 0x80);
            result.push(((pair >> 6) & 0x3f) | 0x80);
            result.push((pair & 0x3f) | 0x80);
        }
        else {
            result.push((c >> 12) | 0xe0);
            result.push(((c >> 6) & 0x3f) | 0x80);
            result.push((c & 0x3f) | 0x80);
        }
    }
    return new Uint8Array(result);
}
//export 
function _toUtf8String(codePoints) {
    return codePoints.map((codePoint) => {
        if (codePoint <= 0xffff) {
            return String.fromCharCode(codePoint);
        }
        codePoint -= 0x10000;
        return String.fromCharCode((((codePoint >> 10) & 0x3ff) + 0xd800), ((codePoint & 0x3ff) + 0xdc00));
    }).join("");
}
/**
 *  Returns the string represented by the UTF-8 data %%bytes%%.
 *
 *  When %%onError%% function is specified, it is called on UTF-8
 *  errors allowing recovery using the [[Utf8ErrorFunc]] API.
 *  (default: [error](Utf8ErrorFuncs))
 */
function toUtf8String(bytes, onError) {
    return _toUtf8String(getUtf8CodePoints(bytes, onError));
}

function createGetUrl(options) {
    async function getUrl(req, _signal) {
        assert(_signal == null || !_signal.cancelled, "request cancelled before sending", "CANCELLED");
        const protocol = req.url.split(":")[0].toLowerCase();
        assert(protocol === "http" || protocol === "https", `unsupported protocol ${protocol}`, "UNSUPPORTED_OPERATION", {
            info: { protocol },
            operation: "request"
        });
        assert(protocol === "https" || !req.credentials || req.allowInsecureAuthentication, "insecure authorized connections unsupported", "UNSUPPORTED_OPERATION", {
            operation: "request"
        });
        let error = null;
        const controller = new AbortController();
        const timer = setTimeout(() => {
            error = makeError("request timeout", "TIMEOUT");
            controller.abort();
        }, req.timeout);
        if (_signal) {
            _signal.addListener(() => {
                error = makeError("request cancelled", "CANCELLED");
                controller.abort();
            });
        }
        const init = {
            method: req.method,
            headers: new Headers(Array.from(req)),
            body: req.body || undefined,
            signal: controller.signal
        };
        let resp;
        try {
            resp = await fetch(req.url, init);
        }
        catch (_error) {
            clearTimeout(timer);
            if (error) {
                throw error;
            }
            throw _error;
        }
        clearTimeout(timer);
        const headers = {};
        resp.headers.forEach((value, key) => {
            headers[key.toLowerCase()] = value;
        });
        const respBody = await resp.arrayBuffer();
        const body = (respBody == null) ? null : new Uint8Array(respBody);
        return {
            statusCode: resp.status,
            statusMessage: resp.statusText,
            headers, body
        };
    }
    return getUrl;
}

/**
 *  Fetching content from the web is environment-specific, so Ethers
 *  provides an abstraction that each environment can implement to provide
 *  this service.
 *
 *  On [Node.js](link-node), the ``http`` and ``https`` libs are used to
 *  create a request object, register event listeners and process data
 *  and populate the [[FetchResponse]].
 *
 *  In a browser, the [DOM fetch](link-js-fetch) is used, and the resulting
 *  ``Promise`` is waited on to retrieve the payload.
 *
 *  The [[FetchRequest]] is responsible for handling many common situations,
 *  such as redirects, server throttling, authentication, etc.
 *
 *  It also handles common gateways, such as IPFS and data URIs.
 *
 *  @_section api/utils/fetching:Fetching Web Content  [about-fetch]
 */
const MAX_ATTEMPTS = 12;
const SLOT_INTERVAL = 250;
// The global FetchGetUrlFunc implementation.
let defaultGetUrlFunc = createGetUrl();
const reData = new RegExp("^data:([^;:]*)?(;base64)?,(.*)$", "i");
const reIpfs = new RegExp("^ipfs:/\/(ipfs/)?(.*)$", "i");
// If locked, new Gateways cannot be added
let locked$1 = false;
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs
async function dataGatewayFunc(url, signal) {
    try {
        const match = url.match(reData);
        if (!match) {
            throw new Error("invalid data");
        }
        return new FetchResponse(200, "OK", {
            "content-type": (match[1] || "text/plain"),
        }, (match[2] ? decodeBase64(match[3]) : unpercent(match[3])));
    }
    catch (error) {
        return new FetchResponse(599, "BAD REQUEST (invalid data: URI)", {}, null, new FetchRequest(url));
    }
}
/**
 *  Returns a [[FetchGatewayFunc]] for fetching content from a standard
 *  IPFS gateway hosted at %%baseUrl%%.
 */
function getIpfsGatewayFunc(baseUrl) {
    async function gatewayIpfs(url, signal) {
        try {
            const match = url.match(reIpfs);
            if (!match) {
                throw new Error("invalid link");
            }
            return new FetchRequest(`${baseUrl}${match[2]}`);
        }
        catch (error) {
            return new FetchResponse(599, "BAD REQUEST (invalid IPFS URI)", {}, null, new FetchRequest(url));
        }
    }
    return gatewayIpfs;
}
const Gateways = {
    "data": dataGatewayFunc,
    "ipfs": getIpfsGatewayFunc("https:/\/gateway.ipfs.io/ipfs/")
};
const fetchSignals = new WeakMap();
/**
 *  @_ignore
 */
class FetchCancelSignal {
    #listeners;
    #cancelled;
    constructor(request) {
        this.#listeners = [];
        this.#cancelled = false;
        fetchSignals.set(request, () => {
            if (this.#cancelled) {
                return;
            }
            this.#cancelled = true;
            for (const listener of this.#listeners) {
                setTimeout(() => { listener(); }, 0);
            }
            this.#listeners = [];
        });
    }
    addListener(listener) {
        assert(!this.#cancelled, "singal already cancelled", "UNSUPPORTED_OPERATION", {
            operation: "fetchCancelSignal.addCancelListener"
        });
        this.#listeners.push(listener);
    }
    get cancelled() { return this.#cancelled; }
    checkSignal() {
        assert(!this.cancelled, "cancelled", "CANCELLED", {});
    }
}
// Check the signal, throwing if it is cancelled
function checkSignal(signal) {
    if (signal == null) {
        throw new Error("missing signal; should not happen");
    }
    signal.checkSignal();
    return signal;
}
/**
 *  Represents a request for a resource using a URI.
 *
 *  By default, the supported schemes are ``HTTP``, ``HTTPS``, ``data:``,
 *  and ``IPFS:``.
 *
 *  Additional schemes can be added globally using [[registerGateway]].
 *
 *  @example:
 *    req = new FetchRequest("https://www.ricmoo.com")
 *    resp = await req.send()
 *    resp.body.length
 *    //_result:
 */
class FetchRequest {
    #allowInsecure;
    #gzip;
    #headers;
    #method;
    #timeout;
    #url;
    #body;
    #bodyType;
    #creds;
    // Hooks
    #preflight;
    #process;
    #retry;
    #signal;
    #throttle;
    #getUrlFunc;
    /**
     *  The fetch URL to request.
     */
    get url() { return this.#url; }
    set url(url) {
        this.#url = String(url);
    }
    /**
     *  The fetch body, if any, to send as the request body. //(default: null)//
     *
     *  When setting a body, the intrinsic ``Content-Type`` is automatically
     *  set and will be used if **not overridden** by setting a custom
     *  header.
     *
     *  If %%body%% is null, the body is cleared (along with the
     *  intrinsic ``Content-Type``).
     *
     *  If %%body%% is a string, the intrinsic ``Content-Type`` is set to
     *  ``text/plain``.
     *
     *  If %%body%% is a Uint8Array, the intrinsic ``Content-Type`` is set to
     *  ``application/octet-stream``.
     *
     *  If %%body%% is any other object, the intrinsic ``Content-Type`` is
     *  set to ``application/json``.
     */
    get body() {
        if (this.#body == null) {
            return null;
        }
        return new Uint8Array(this.#body);
    }
    set body(body) {
        if (body == null) {
            this.#body = undefined;
            this.#bodyType = undefined;
        }
        else if (typeof (body) === "string") {
            this.#body = toUtf8Bytes(body);
            this.#bodyType = "text/plain";
        }
        else if (body instanceof Uint8Array) {
            this.#body = body;
            this.#bodyType = "application/octet-stream";
        }
        else if (typeof (body) === "object") {
            this.#body = toUtf8Bytes(JSON.stringify(body));
            this.#bodyType = "application/json";
        }
        else {
            throw new Error("invalid body");
        }
    }
    /**
     *  Returns true if the request has a body.
     */
    hasBody() {
        return (this.#body != null);
    }
    /**
     *  The HTTP method to use when requesting the URI. If no method
     *  has been explicitly set, then ``GET`` is used if the body is
     *  null and ``POST`` otherwise.
     */
    get method() {
        if (this.#method) {
            return this.#method;
        }
        if (this.hasBody()) {
            return "POST";
        }
        return "GET";
    }
    set method(method) {
        if (method == null) {
            method = "";
        }
        this.#method = String(method).toUpperCase();
    }
    /**
     *  The headers that will be used when requesting the URI. All
     *  keys are lower-case.
     *
     *  This object is a copy, so any changes will **NOT** be reflected
     *  in the ``FetchRequest``.
     *
     *  To set a header entry, use the ``setHeader`` method.
     */
    get headers() {
        const headers = Object.assign({}, this.#headers);
        if (this.#creds) {
            headers["authorization"] = `Basic ${encodeBase64(toUtf8Bytes(this.#creds))}`;
        }
        if (this.allowGzip) {
            headers["accept-encoding"] = "gzip";
        }
        if (headers["content-type"] == null && this.#bodyType) {
            headers["content-type"] = this.#bodyType;
        }
        if (this.body) {
            headers["content-length"] = String(this.body.length);
        }
        return headers;
    }
    /**
     *  Get the header for %%key%%, ignoring case.
     */
    getHeader(key) {
        return this.headers[key.toLowerCase()];
    }
    /**
     *  Set the header for %%key%% to %%value%%. All values are coerced
     *  to a string.
     */
    setHeader(key, value) {
        this.#headers[String(key).toLowerCase()] = String(value);
    }
    /**
     *  Clear all headers, resetting all intrinsic headers.
     */
    clearHeaders() {
        this.#headers = {};
    }
    [Symbol.iterator]() {
        const headers = this.headers;
        const keys = Object.keys(headers);
        let index = 0;
        return {
            next: () => {
                if (index < keys.length) {
                    const key = keys[index++];
                    return {
                        value: [key, headers[key]], done: false
                    };
                }
                return { value: undefined, done: true };
            }
        };
    }
    /**
     *  The value that will be sent for the ``Authorization`` header.
     *
     *  To set the credentials, use the ``setCredentials`` method.
     */
    get credentials() {
        return this.#creds || null;
    }
    /**
     *  Sets an ``Authorization`` for %%username%% with %%password%%.
     */
    setCredentials(username, password) {
        assertArgument(!username.match(/:/), "invalid basic authentication username", "username", "[REDACTED]");
        this.#creds = `${username}:${password}`;
    }
    /**
     *  Enable and request gzip-encoded responses. The response will
     *  automatically be decompressed. //(default: true)//
     */
    get allowGzip() {
        return this.#gzip;
    }
    set allowGzip(value) {
        this.#gzip = !!value;
    }
    /**
     *  Allow ``Authentication`` credentials to be sent over insecure
     *  channels. //(default: false)//
     */
    get allowInsecureAuthentication() {
        return !!this.#allowInsecure;
    }
    set allowInsecureAuthentication(value) {
        this.#allowInsecure = !!value;
    }
    /**
     *  The timeout (in milliseconds) to wait for a complete response.
     *  //(default: 5 minutes)//
     */
    get timeout() { return this.#timeout; }
    set timeout(timeout) {
        assertArgument(timeout >= 0, "timeout must be non-zero", "timeout", timeout);
        this.#timeout = timeout;
    }
    /**
     *  This function is called prior to each request, for example
     *  during a redirection or retry in case of server throttling.
     *
     *  This offers an opportunity to populate headers or update
     *  content before sending a request.
     */
    get preflightFunc() {
        return this.#preflight || null;
    }
    set preflightFunc(preflight) {
        this.#preflight = preflight;
    }
    /**
     *  This function is called after each response, offering an
     *  opportunity to provide client-level throttling or updating
     *  response data.
     *
     *  Any error thrown in this causes the ``send()`` to throw.
     *
     *  To schedule a retry attempt (assuming the maximum retry limit
     *  has not been reached), use [[response.throwThrottleError]].
     */
    get processFunc() {
        return this.#process || null;
    }
    set processFunc(process) {
        this.#process = process;
    }
    /**
     *  This function is called on each retry attempt.
     */
    get retryFunc() {
        return this.#retry || null;
    }
    set retryFunc(retry) {
        this.#retry = retry;
    }
    /**
     *  This function is called to fetch content from HTTP and
     *  HTTPS URLs and is platform specific (e.g. nodejs vs
     *  browsers).
     *
     *  This is by default the currently registered global getUrl
     *  function, which can be changed using [[registerGetUrl]].
     *  If this has been set, setting is to ``null`` will cause
     *  this FetchRequest (and any future clones) to revert back to
     *  using the currently registered global getUrl function.
     *
     *  Setting this is generally not necessary, but may be useful
     *  for developers that wish to intercept requests or to
     *  configurege a proxy or other agent.
     */
    get getUrlFunc() {
        return this.#getUrlFunc || defaultGetUrlFunc;
    }
    set getUrlFunc(value) {
        this.#getUrlFunc = value;
    }
    /**
     *  Create a new FetchRequest instance with default values.
     *
     *  Once created, each property may be set before issuing a
     *  ``.send()`` to make the request.
     */
    constructor(url) {
        this.#url = String(url);
        this.#allowInsecure = false;
        this.#gzip = true;
        this.#headers = {};
        this.#method = "";
        this.#timeout = 300000;
        this.#throttle = {
            slotInterval: SLOT_INTERVAL,
            maxAttempts: MAX_ATTEMPTS
        };
        this.#getUrlFunc = null;
    }
    toString() {
        return `<FetchRequest method=${JSON.stringify(this.method)} url=${JSON.stringify(this.url)} headers=${JSON.stringify(this.headers)} body=${this.#body ? hexlify(this.#body) : "null"}>`;
    }
    /**
     *  Update the throttle parameters used to determine maximum
     *  attempts and exponential-backoff properties.
     */
    setThrottleParams(params) {
        if (params.slotInterval != null) {
            this.#throttle.slotInterval = params.slotInterval;
        }
        if (params.maxAttempts != null) {
            this.#throttle.maxAttempts = params.maxAttempts;
        }
    }
    async #send(attempt, expires, delay, _request, _response) {
        if (attempt >= this.#throttle.maxAttempts) {
            return _response.makeServerError("exceeded maximum retry limit");
        }
        assert(getTime$1() <= expires, "timeout", "TIMEOUT", {
            operation: "request.send", reason: "timeout", request: _request
        });
        if (delay > 0) {
            await wait(delay);
        }
        let req = this.clone();
        const scheme = (req.url.split(":")[0] || "").toLowerCase();
        // Process any Gateways
        if (scheme in Gateways) {
            const result = await Gateways[scheme](req.url, checkSignal(_request.#signal));
            if (result instanceof FetchResponse) {
                let response = result;
                if (this.processFunc) {
                    checkSignal(_request.#signal);
                    try {
                        response = await this.processFunc(req, response);
                    }
                    catch (error) {
                        // Something went wrong during processing; throw a 5xx server error
                        if (error.throttle == null || typeof (error.stall) !== "number") {
                            response.makeServerError("error in post-processing function", error).assertOk();
                        }
                        // Ignore throttling
                    }
                }
                return response;
            }
            req = result;
        }
        // We have a preflight function; update the request
        if (this.preflightFunc) {
            req = await this.preflightFunc(req);
        }
        const resp = await this.getUrlFunc(req, checkSignal(_request.#signal));
        let response = new FetchResponse(resp.statusCode, resp.statusMessage, resp.headers, resp.body, _request);
        if (response.statusCode === 301 || response.statusCode === 302) {
            // Redirect
            try {
                const location = response.headers.location || "";
                return req.redirect(location).#send(attempt + 1, expires, 0, _request, response);
            }
            catch (error) { }
            // Things won't get any better on another attempt; abort
            return response;
        }
        else if (response.statusCode === 429) {
            // Throttle
            if (this.retryFunc == null || (await this.retryFunc(req, response, attempt))) {
                const retryAfter = response.headers["retry-after"];
                let delay = this.#throttle.slotInterval * Math.trunc(Math.random() * Math.pow(2, attempt));
                if (typeof (retryAfter) === "string" && retryAfter.match(/^[1-9][0-9]*$/)) {
                    delay = parseInt(retryAfter);
                }
                return req.clone().#send(attempt + 1, expires, delay, _request, response);
            }
        }
        if (this.processFunc) {
            checkSignal(_request.#signal);
            try {
                response = await this.processFunc(req, response);
            }
            catch (error) {
                // Something went wrong during processing; throw a 5xx server error
                if (error.throttle == null || typeof (error.stall) !== "number") {
                    response.makeServerError("error in post-processing function", error).assertOk();
                }
                // Throttle
                let delay = this.#throttle.slotInterval * Math.trunc(Math.random() * Math.pow(2, attempt));
                if (error.stall >= 0) {
                    delay = error.stall;
                }
                return req.clone().#send(attempt + 1, expires, delay, _request, response);
            }
        }
        return response;
    }
    /**
     *  Resolves to the response by sending the request.
     */
    send() {
        assert(this.#signal == null, "request already sent", "UNSUPPORTED_OPERATION", { operation: "fetchRequest.send" });
        this.#signal = new FetchCancelSignal(this);
        return this.#send(0, getTime$1() + this.timeout, 0, this, new FetchResponse(0, "", {}, null, this));
    }
    /**
     *  Cancels the inflight response, causing a ``CANCELLED``
     *  error to be rejected from the [[send]].
     */
    cancel() {
        assert(this.#signal != null, "request has not been sent", "UNSUPPORTED_OPERATION", { operation: "fetchRequest.cancel" });
        const signal = fetchSignals.get(this);
        if (!signal) {
            throw new Error("missing signal; should not happen");
        }
        signal();
    }
    /**
     *  Returns a new [[FetchRequest]] that represents the redirection
     *  to %%location%%.
     */
    redirect(location) {
        // Redirection; for now we only support absolute locations
        const current = this.url.split(":")[0].toLowerCase();
        const target = location.split(":")[0].toLowerCase();
        // Don't allow redirecting:
        // - non-GET requests
        // - downgrading the security (e.g. https => http)
        // - to non-HTTP (or non-HTTPS) protocols [this could be relaxed?]
        assert(this.method === "GET" && (current !== "https" || target !== "http") && location.match(/^https?:/), `unsupported redirect`, "UNSUPPORTED_OPERATION", {
            operation: `redirect(${this.method} ${JSON.stringify(this.url)} => ${JSON.stringify(location)})`
        });
        // Create a copy of this request, with a new URL
        const req = new FetchRequest(location);
        req.method = "GET";
        req.allowGzip = this.allowGzip;
        req.timeout = this.timeout;
        req.#headers = Object.assign({}, this.#headers);
        if (this.#body) {
            req.#body = new Uint8Array(this.#body);
        }
        req.#bodyType = this.#bodyType;
        // Do not forward credentials unless on the same domain; only absolute
        //req.allowInsecure = false;
        // paths are currently supported; may want a way to specify to forward?
        //setStore(req.#props, "creds", getStore(this.#pros, "creds"));
        return req;
    }
    /**
     *  Create a new copy of this request.
     */
    clone() {
        const clone = new FetchRequest(this.url);
        // Preserve "default method" (i.e. null)
        clone.#method = this.#method;
        // Preserve "default body" with type, copying the Uint8Array is present
        if (this.#body) {
            clone.#body = this.#body;
        }
        clone.#bodyType = this.#bodyType;
        // Preserve "default headers"
        clone.#headers = Object.assign({}, this.#headers);
        // Credentials is readonly, so we copy internally
        clone.#creds = this.#creds;
        if (this.allowGzip) {
            clone.allowGzip = true;
        }
        clone.timeout = this.timeout;
        if (this.allowInsecureAuthentication) {
            clone.allowInsecureAuthentication = true;
        }
        clone.#preflight = this.#preflight;
        clone.#process = this.#process;
        clone.#retry = this.#retry;
        clone.#throttle = Object.assign({}, this.#throttle);
        clone.#getUrlFunc = this.#getUrlFunc;
        return clone;
    }
    /**
     *  Locks all static configuration for gateways and FetchGetUrlFunc
     *  registration.
     */
    static lockConfig() {
        locked$1 = true;
    }
    /**
     *  Get the current Gateway function for %%scheme%%.
     */
    static getGateway(scheme) {
        return Gateways[scheme.toLowerCase()] || null;
    }
    /**
     *  Use the %%func%% when fetching URIs using %%scheme%%.
     *
     *  This method affects all requests globally.
     *
     *  If [[lockConfig]] has been called, no change is made and this
     *  throws.
     */
    static registerGateway(scheme, func) {
        scheme = scheme.toLowerCase();
        if (scheme === "http" || scheme === "https") {
            throw new Error(`cannot intercept ${scheme}; use registerGetUrl`);
        }
        if (locked$1) {
            throw new Error("gateways locked");
        }
        Gateways[scheme] = func;
    }
    /**
     *  Use %%getUrl%% when fetching URIs over HTTP and HTTPS requests.
     *
     *  This method affects all requests globally.
     *
     *  If [[lockConfig]] has been called, no change is made and this
     *  throws.
     */
    static registerGetUrl(getUrl) {
        if (locked$1) {
            throw new Error("gateways locked");
        }
        defaultGetUrlFunc = getUrl;
    }
    /**
     *  Creates a getUrl function that fetches content from HTTP and
     *  HTTPS URLs.
     *
     *  The available %%options%% are dependent on the platform
     *  implementation of the default getUrl function.
     *
     *  This is not generally something that is needed, but is useful
     *  when trying to customize simple behaviour when fetching HTTP
     *  content.
     */
    static createGetUrlFunc(options) {
        return createGetUrl();
    }
    /**
     *  Creates a function that can "fetch" data URIs.
     *
     *  Note that this is automatically done internally to support
     *  data URIs, so it is not necessary to register it.
     *
     *  This is not generally something that is needed, but may
     *  be useful in a wrapper to perfom custom data URI functionality.
     */
    static createDataGateway() {
        return dataGatewayFunc;
    }
    /**
     *  Creates a function that will fetch IPFS (unvalidated) from
     *  a custom gateway baseUrl.
     *
     *  The default IPFS gateway used internally is
     *  ``"https:/\/gateway.ipfs.io/ipfs/"``.
     */
    static createIpfsGatewayFunc(baseUrl) {
        return getIpfsGatewayFunc(baseUrl);
    }
}
/**
 *  The response for a FetchRequest.
 */
class FetchResponse {
    #statusCode;
    #statusMessage;
    #headers;
    #body;
    #request;
    #error;
    toString() {
        return `<FetchResponse status=${this.statusCode} body=${this.#body ? hexlify(this.#body) : "null"}>`;
    }
    /**
     *  The response status code.
     */
    get statusCode() { return this.#statusCode; }
    /**
     *  The response status message.
     */
    get statusMessage() { return this.#statusMessage; }
    /**
     *  The response headers. All keys are lower-case.
     */
    get headers() { return Object.assign({}, this.#headers); }
    /**
     *  The response body, or ``null`` if there was no body.
     */
    get body() {
        return (this.#body == null) ? null : new Uint8Array(this.#body);
    }
    /**
     *  The response body as a UTF-8 encoded string, or the empty
     *  string (i.e. ``""``) if there was no body.
     *
     *  An error is thrown if the body is invalid UTF-8 data.
     */
    get bodyText() {
        try {
            return (this.#body == null) ? "" : toUtf8String(this.#body);
        }
        catch (error) {
            assert(false, "response body is not valid UTF-8 data", "UNSUPPORTED_OPERATION", {
                operation: "bodyText", info: { response: this }
            });
        }
    }
    /**
     *  The response body, decoded as JSON.
     *
     *  An error is thrown if the body is invalid JSON-encoded data
     *  or if there was no body.
     */
    get bodyJson() {
        try {
            return JSON.parse(this.bodyText);
        }
        catch (error) {
            assert(false, "response body is not valid JSON", "UNSUPPORTED_OPERATION", {
                operation: "bodyJson", info: { response: this }
            });
        }
    }
    [Symbol.iterator]() {
        const headers = this.headers;
        const keys = Object.keys(headers);
        let index = 0;
        return {
            next: () => {
                if (index < keys.length) {
                    const key = keys[index++];
                    return {
                        value: [key, headers[key]], done: false
                    };
                }
                return { value: undefined, done: true };
            }
        };
    }
    constructor(statusCode, statusMessage, headers, body, request) {
        this.#statusCode = statusCode;
        this.#statusMessage = statusMessage;
        this.#headers = Object.keys(headers).reduce((accum, k) => {
            accum[k.toLowerCase()] = String(headers[k]);
            return accum;
        }, {});
        this.#body = ((body == null) ? null : new Uint8Array(body));
        this.#request = (request || null);
        this.#error = { message: "" };
    }
    /**
     *  Return a Response with matching headers and body, but with
     *  an error status code (i.e. 599) and %%message%% with an
     *  optional %%error%%.
     */
    makeServerError(message, error) {
        let statusMessage;
        if (!message) {
            message = `${this.statusCode} ${this.statusMessage}`;
            statusMessage = `CLIENT ESCALATED SERVER ERROR (${message})`;
        }
        else {
            statusMessage = `CLIENT ESCALATED SERVER ERROR (${this.statusCode} ${this.statusMessage}; ${message})`;
        }
        const response = new FetchResponse(599, statusMessage, this.headers, this.body, this.#request || undefined);
        response.#error = { message, error };
        return response;
    }
    /**
     *  If called within a [request.processFunc](FetchRequest-processFunc)
     *  call, causes the request to retry as if throttled for %%stall%%
     *  milliseconds.
     */
    throwThrottleError(message, stall) {
        if (stall == null) {
            stall = -1;
        }
        else {
            assertArgument(Number.isInteger(stall) && stall >= 0, "invalid stall timeout", "stall", stall);
        }
        const error = new Error(message || "throttling requests");
        defineProperties(error, { stall, throttle: true });
        throw error;
    }
    /**
     *  Get the header value for %%key%%, ignoring case.
     */
    getHeader(key) {
        return this.headers[key.toLowerCase()];
    }
    /**
     *  Returns true if the response has a body.
     */
    hasBody() {
        return (this.#body != null);
    }
    /**
     *  The request made for this response.
     */
    get request() { return this.#request; }
    /**
     *  Returns true if this response was a success statusCode.
     */
    ok() {
        return (this.#error.message === "" && this.statusCode >= 200 && this.statusCode < 300);
    }
    /**
     *  Throws a ``SERVER_ERROR`` if this response is not ok.
     */
    assertOk() {
        if (this.ok()) {
            return;
        }
        let { message, error } = this.#error;
        if (message === "") {
            message = `server response ${this.statusCode} ${this.statusMessage}`;
        }
        let requestUrl = null;
        if (this.request) {
            requestUrl = this.request.url;
        }
        let responseBody = null;
        try {
            if (this.#body) {
                responseBody = toUtf8String(this.#body);
            }
        }
        catch (e) { }
        assert(false, message, "SERVER_ERROR", {
            request: (this.request || "unknown request"), response: this, error,
            info: {
                requestUrl, responseBody,
                responseStatus: `${this.statusCode} ${this.statusMessage}`
            }
        });
    }
}
function getTime$1() { return (new Date()).getTime(); }
function unpercent(value) {
    return toUtf8Bytes(value.replace(/%([0-9a-f][0-9a-f])/gi, (all, code) => {
        return String.fromCharCode(parseInt(code, 16));
    }));
}
function wait(delay) {
    return new Promise((resolve) => setTimeout(resolve, delay));
}

//See: https://github.com/ethereum/wiki/wiki/RLP
function hexlifyByte(value) {
    let result = value.toString(16);
    while (result.length < 2) {
        result = "0" + result;
    }
    return "0x" + result;
}
function unarrayifyInteger(data, offset, length) {
    let result = 0;
    for (let i = 0; i < length; i++) {
        result = (result * 256) + data[offset + i];
    }
    return result;
}
function _decodeChildren(data, offset, childOffset, length) {
    const result = [];
    while (childOffset < offset + 1 + length) {
        const decoded = _decode(data, childOffset);
        result.push(decoded.result);
        childOffset += decoded.consumed;
        assert(childOffset <= offset + 1 + length, "child data too short", "BUFFER_OVERRUN", {
            buffer: data, length, offset
        });
    }
    return { consumed: (1 + length), result: result };
}
// returns { consumed: number, result: Object }
function _decode(data, offset) {
    assert(data.length !== 0, "data too short", "BUFFER_OVERRUN", {
        buffer: data, length: 0, offset: 1
    });
    const checkOffset = (offset) => {
        assert(offset <= data.length, "data short segment too short", "BUFFER_OVERRUN", {
            buffer: data, length: data.length, offset
        });
    };
    // Array with extra length prefix
    if (data[offset] >= 0xf8) {
        const lengthLength = data[offset] - 0xf7;
        checkOffset(offset + 1 + lengthLength);
        const length = unarrayifyInteger(data, offset + 1, lengthLength);
        checkOffset(offset + 1 + lengthLength + length);
        return _decodeChildren(data, offset, offset + 1 + lengthLength, lengthLength + length);
    }
    else if (data[offset] >= 0xc0) {
        const length = data[offset] - 0xc0;
        checkOffset(offset + 1 + length);
        return _decodeChildren(data, offset, offset + 1, length);
    }
    else if (data[offset] >= 0xb8) {
        const lengthLength = data[offset] - 0xb7;
        checkOffset(offset + 1 + lengthLength);
        const length = unarrayifyInteger(data, offset + 1, lengthLength);
        checkOffset(offset + 1 + lengthLength + length);
        const result = hexlify(data.slice(offset + 1 + lengthLength, offset + 1 + lengthLength + length));
        return { consumed: (1 + lengthLength + length), result: result };
    }
    else if (data[offset] >= 0x80) {
        const length = data[offset] - 0x80;
        checkOffset(offset + 1 + length);
        const result = hexlify(data.slice(offset + 1, offset + 1 + length));
        return { consumed: (1 + length), result: result };
    }
    return { consumed: 1, result: hexlifyByte(data[offset]) };
}
/**
 *  Decodes %%data%% into the structured data it represents.
 */
function decodeRlp(_data) {
    const data = getBytes(_data, "data");
    const decoded = _decode(data, 0);
    assertArgument(decoded.consumed === data.length, "unexpected junk after rlp payload", "data", _data);
    return decoded.result;
}

//See: https://github.com/ethereum/wiki/wiki/RLP
function arrayifyInteger(value) {
    const result = [];
    while (value) {
        result.unshift(value & 0xff);
        value >>= 8;
    }
    return result;
}
function _encode(object) {
    if (Array.isArray(object)) {
        let payload = [];
        object.forEach(function (child) {
            payload = payload.concat(_encode(child));
        });
        if (payload.length <= 55) {
            payload.unshift(0xc0 + payload.length);
            return payload;
        }
        const length = arrayifyInteger(payload.length);
        length.unshift(0xf7 + length.length);
        return length.concat(payload);
    }
    const data = Array.prototype.slice.call(getBytes(object, "object"));
    if (data.length === 1 && data[0] <= 0x7f) {
        return data;
    }
    else if (data.length <= 55) {
        data.unshift(0x80 + data.length);
        return data;
    }
    const length = arrayifyInteger(data.length);
    length.unshift(0xb7 + length.length);
    return length.concat(data);
}
const nibbles = "0123456789abcdef";
/**
 *  Encodes %%object%% as an RLP-encoded [[DataHexString]].
 */
function encodeRlp(object) {
    let result = "0x";
    for (const v of _encode(object)) {
        result += nibbles[v >> 4];
        result += nibbles[v & 0xf];
    }
    return result;
}

/**
 * @_ignore:
 */
const WordSize = 32;
const Padding = new Uint8Array(WordSize);
// Properties used to immediate pass through to the underlying object
// - `then` is used to detect if an object is a Promise for await
const passProperties$1 = ["then"];
const _guard$2 = {};
const resultNames = new WeakMap();
function getNames(result) {
    return resultNames.get(result);
}
function setNames(result, names) {
    resultNames.set(result, names);
}
function throwError(name, error) {
    const wrapped = new Error(`deferred error during ABI decoding triggered accessing ${name}`);
    wrapped.error = error;
    throw wrapped;
}
function toObject(names, items, deep) {
    if (names.indexOf(null) >= 0) {
        return items.map((item, index) => {
            if (item instanceof Result) {
                return toObject(getNames(item), item, deep);
            }
            return item;
        });
    }
    return names.reduce((accum, name, index) => {
        let item = items.getValue(name);
        if (!(name in accum)) {
            if (deep && item instanceof Result) {
                item = toObject(getNames(item), item, deep);
            }
            accum[name] = item;
        }
        return accum;
    }, {});
}
/**
 *  A [[Result]] is a sub-class of Array, which allows accessing any
 *  of its values either positionally by its index or, if keys are
 *  provided by its name.
 *
 *  @_docloc: api/abi
 */
class Result extends Array {
    // No longer used; but cannot be removed as it will remove the
    // #private field from the .d.ts which may break backwards
    // compatibility
    #names;
    /**
     *  @private
     */
    constructor(...args) {
        // To properly sub-class Array so the other built-in
        // functions work, the constructor has to behave fairly
        // well. So, in the event we are created via fromItems()
        // we build the read-only Result object we want, but on
        // any other input, we use the default constructor
        // constructor(guard: any, items: Array<any>, keys?: Array<null | string>);
        const guard = args[0];
        let items = args[1];
        let names = (args[2] || []).slice();
        let wrap = true;
        if (guard !== _guard$2) {
            items = args;
            names = [];
            wrap = false;
        }
        // Can't just pass in ...items since an array of length 1
        // is a special case in the super.
        super(items.length);
        items.forEach((item, index) => { this[index] = item; });
        // Find all unique keys
        const nameCounts = names.reduce((accum, name) => {
            if (typeof (name) === "string") {
                accum.set(name, (accum.get(name) || 0) + 1);
            }
            return accum;
        }, (new Map()));
        // Remove any key thats not unique
        setNames(this, Object.freeze(items.map((item, index) => {
            const name = names[index];
            if (name != null && nameCounts.get(name) === 1) {
                return name;
            }
            return null;
        })));
        // Dummy operations to prevent TypeScript from complaining
        this.#names = [];
        if (this.#names == null) {
            void (this.#names);
        }
        if (!wrap) {
            return;
        }
        // A wrapped Result is immutable
        Object.freeze(this);
        // Proxy indices and names so we can trap deferred errors
        const proxy = new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof (prop) === "string") {
                    // Index accessor
                    if (prop.match(/^[0-9]+$/)) {
                        const index = getNumber(prop, "%index");
                        if (index < 0 || index >= this.length) {
                            throw new RangeError("out of result range");
                        }
                        const item = target[index];
                        if (item instanceof Error) {
                            throwError(`index ${index}`, item);
                        }
                        return item;
                    }
                    // Pass important checks (like `then` for Promise) through
                    if (passProperties$1.indexOf(prop) >= 0) {
                        return Reflect.get(target, prop, receiver);
                    }
                    const value = target[prop];
                    if (value instanceof Function) {
                        // Make sure functions work with private variables
                        // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#no_private_property_forwarding
                        return function (...args) {
                            return value.apply((this === receiver) ? target : this, args);
                        };
                    }
                    else if (!(prop in target)) {
                        // Possible name accessor
                        return target.getValue.apply((this === receiver) ? target : this, [prop]);
                    }
                }
                return Reflect.get(target, prop, receiver);
            }
        });
        setNames(proxy, getNames(this));
        return proxy;
    }
    /**
     *  Returns the Result as a normal Array. If %%deep%%, any children
     *  which are Result objects are also converted to a normal Array.
     *
     *  This will throw if there are any outstanding deferred
     *  errors.
     */
    toArray(deep) {
        const result = [];
        this.forEach((item, index) => {
            if (item instanceof Error) {
                throwError(`index ${index}`, item);
            }
            if (deep && item instanceof Result) {
                item = item.toArray(deep);
            }
            result.push(item);
        });
        return result;
    }
    /**
     *  Returns the Result as an Object with each name-value pair. If
     *  %%deep%%, any children which are Result objects are also
     *  converted to an Object.
     *
     *  This will throw if any value is unnamed, or if there are
     *  any outstanding deferred errors.
     */
    toObject(deep) {
        const names = getNames(this);
        return names.reduce((accum, name, index) => {
            assert(name != null, `value at index ${index} unnamed`, "UNSUPPORTED_OPERATION", {
                operation: "toObject()"
            });
            return toObject(names, this, deep);
        }, {});
    }
    /**
     *  @_ignore
     */
    slice(start, end) {
        if (start == null) {
            start = 0;
        }
        if (start < 0) {
            start += this.length;
            if (start < 0) {
                start = 0;
            }
        }
        if (end == null) {
            end = this.length;
        }
        if (end < 0) {
            end += this.length;
            if (end < 0) {
                end = 0;
            }
        }
        if (end > this.length) {
            end = this.length;
        }
        const _names = getNames(this);
        const result = [], names = [];
        for (let i = start; i < end; i++) {
            result.push(this[i]);
            names.push(_names[i]);
        }
        return new Result(_guard$2, result, names);
    }
    /**
     *  @_ignore
     */
    filter(callback, thisArg) {
        const _names = getNames(this);
        const result = [], names = [];
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            if (item instanceof Error) {
                throwError(`index ${i}`, item);
            }
            if (callback.call(thisArg, item, i, this)) {
                result.push(item);
                names.push(_names[i]);
            }
        }
        return new Result(_guard$2, result, names);
    }
    /**
     *  @_ignore
     */
    map(callback, thisArg) {
        const result = [];
        for (let i = 0; i < this.length; i++) {
            const item = this[i];
            if (item instanceof Error) {
                throwError(`index ${i}`, item);
            }
            result.push(callback.call(thisArg, item, i, this));
        }
        return result;
    }
    /**
     *  Returns the value for %%name%%.
     *
     *  Since it is possible to have a key whose name conflicts with
     *  a method on a [[Result]] or its superclass Array, or any
     *  JavaScript keyword, this ensures all named values are still
     *  accessible by name.
     */
    getValue(name) {
        const index = getNames(this).indexOf(name);
        if (index === -1) {
            return undefined;
        }
        const value = this[index];
        if (value instanceof Error) {
            throwError(`property ${JSON.stringify(name)}`, value.error);
        }
        return value;
    }
    /**
     *  Creates a new [[Result]] for %%items%% with each entry
     *  also accessible by its corresponding name in %%keys%%.
     */
    static fromItems(items, keys) {
        return new Result(_guard$2, items, keys);
    }
}
function getValue$1(value) {
    let bytes = toBeArray(value);
    assert(bytes.length <= WordSize, "value out-of-bounds", "BUFFER_OVERRUN", { buffer: bytes, length: WordSize, offset: bytes.length });
    if (bytes.length !== WordSize) {
        bytes = getBytesCopy(concat([Padding.slice(bytes.length % WordSize), bytes]));
    }
    return bytes;
}
/**
 *  @_ignore
 */
class Coder {
    // The coder name:
    //   - address, uint256, tuple, array, etc.
    name;
    // The fully expanded type, including composite types:
    //   - address, uint256, tuple(address,bytes), uint256[3][4][],  etc.
    type;
    // The localName bound in the signature, in this example it is "baz":
    //   - tuple(address foo, uint bar) baz
    localName;
    // Whether this type is dynamic:
    //  - Dynamic: bytes, string, address[], tuple(boolean[]), etc.
    //  - Not Dynamic: address, uint256, boolean[3], tuple(address, uint8)
    dynamic;
    constructor(name, type, localName, dynamic) {
        defineProperties(this, { name, type, localName, dynamic }, {
            name: "string", type: "string", localName: "string", dynamic: "boolean"
        });
    }
    _throwError(message, value) {
        assertArgument(false, message, this.localName, value);
    }
}
/**
 *  @_ignore
 */
class Writer {
    // An array of WordSize lengthed objects to concatenation
    #data;
    #dataLength;
    constructor() {
        this.#data = [];
        this.#dataLength = 0;
    }
    get data() {
        return concat(this.#data);
    }
    get length() { return this.#dataLength; }
    #writeData(data) {
        this.#data.push(data);
        this.#dataLength += data.length;
        return data.length;
    }
    appendWriter(writer) {
        return this.#writeData(getBytesCopy(writer.data));
    }
    // Arrayish item; pad on the right to *nearest* WordSize
    writeBytes(value) {
        let bytes = getBytesCopy(value);
        const paddingOffset = bytes.length % WordSize;
        if (paddingOffset) {
            bytes = getBytesCopy(concat([bytes, Padding.slice(paddingOffset)]));
        }
        return this.#writeData(bytes);
    }
    // Numeric item; pad on the left *to* WordSize
    writeValue(value) {
        return this.#writeData(getValue$1(value));
    }
    // Inserts a numeric place-holder, returning a callback that can
    // be used to asjust the value later
    writeUpdatableValue() {
        const offset = this.#data.length;
        this.#data.push(Padding);
        this.#dataLength += WordSize;
        return (value) => {
            this.#data[offset] = getValue$1(value);
        };
    }
}
/**
 *  @_ignore
 */
class Reader {
    // Allows incomplete unpadded data to be read; otherwise an error
    // is raised if attempting to overrun the buffer. This is required
    // to deal with an old Solidity bug, in which event data for
    // external (not public thoguh) was tightly packed.
    allowLoose;
    #data;
    #offset;
    #bytesRead;
    #parent;
    #maxInflation;
    constructor(data, allowLoose, maxInflation) {
        defineProperties(this, { allowLoose: !!allowLoose });
        this.#data = getBytesCopy(data);
        this.#bytesRead = 0;
        this.#parent = null;
        this.#maxInflation = (maxInflation != null) ? maxInflation : 1024;
        this.#offset = 0;
    }
    get data() { return hexlify(this.#data); }
    get dataLength() { return this.#data.length; }
    get consumed() { return this.#offset; }
    get bytes() { return new Uint8Array(this.#data); }
    #incrementBytesRead(count) {
        if (this.#parent) {
            return this.#parent.#incrementBytesRead(count);
        }
        this.#bytesRead += count;
        // Check for excessive inflation (see: #4537)
        assert(this.#maxInflation < 1 || this.#bytesRead <= this.#maxInflation * this.dataLength, `compressed ABI data exceeds inflation ratio of ${this.#maxInflation} ( see: https:/\/github.com/ethers-io/ethers.js/issues/4537 )`, "BUFFER_OVERRUN", {
            buffer: getBytesCopy(this.#data), offset: this.#offset,
            length: count, info: {
                bytesRead: this.#bytesRead,
                dataLength: this.dataLength
            }
        });
    }
    #peekBytes(offset, length, loose) {
        let alignedLength = Math.ceil(length / WordSize) * WordSize;
        if (this.#offset + alignedLength > this.#data.length) {
            if (this.allowLoose && loose && this.#offset + length <= this.#data.length) {
                alignedLength = length;
            }
            else {
                assert(false, "data out-of-bounds", "BUFFER_OVERRUN", {
                    buffer: getBytesCopy(this.#data),
                    length: this.#data.length,
                    offset: this.#offset + alignedLength
                });
            }
        }
        return this.#data.slice(this.#offset, this.#offset + alignedLength);
    }
    // Create a sub-reader with the same underlying data, but offset
    subReader(offset) {
        const reader = new Reader(this.#data.slice(this.#offset + offset), this.allowLoose, this.#maxInflation);
        reader.#parent = this;
        return reader;
    }
    // Read bytes
    readBytes(length, loose) {
        let bytes = this.#peekBytes(0, length, !!loose);
        this.#incrementBytesRead(length);
        this.#offset += bytes.length;
        // @TODO: Make sure the length..end bytes are all 0?
        return bytes.slice(0, length);
    }
    // Read a numeric values
    readValue() {
        return toBigInt(this.readBytes(WordSize));
    }
    readIndex() {
        return toNumber(this.readBytes(WordSize));
    }
}

function number(n) {
    if (!Number.isSafeInteger(n) || n < 0)
        throw new Error(`Wrong positive integer: ${n}`);
}
function bytes(b, ...lengths) {
    if (!(b instanceof Uint8Array))
        throw new Error('Expected Uint8Array');
    if (lengths.length > 0 && !lengths.includes(b.length))
        throw new Error(`Expected Uint8Array of length ${lengths}, not of length=${b.length}`);
}
function hash(hash) {
    if (typeof hash !== 'function' || typeof hash.create !== 'function')
        throw new Error('Hash should be wrapped by utils.wrapConstructor');
    number(hash.outputLen);
    number(hash.blockLen);
}
function exists(instance, checkFinished = true) {
    if (instance.destroyed)
        throw new Error('Hash instance has been destroyed');
    if (checkFinished && instance.finished)
        throw new Error('Hash#digest() has already been called');
}
function output(out, instance) {
    bytes(out);
    const min = instance.outputLen;
    if (out.length < min) {
        throw new Error(`digestInto() expects output buffer of length at least ${min}`);
    }
}

const crypto = typeof globalThis === 'object' && 'crypto' in globalThis ? globalThis.crypto : undefined;

/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
// node.js versions earlier than v19 don't declare it in global scope.
// For node.js, package.json#exports field mapping rewrites import
// from `crypto` to `cryptoNode`, which imports native module.
// Makes the utils un-importable in browsers without a bundler.
// Once node.js 18 is deprecated, we can just drop the import.
const u8a$1 = (a) => a instanceof Uint8Array;
const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
// Cast array to view
const createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
// The rotate right (circular right shift) operation for uint32
const rotr = (word, shift) => (word << (32 - shift)) | (word >>> shift);
// big-endian hardware is rare. Just in case someone still decides to run hashes:
// early-throw an error because we don't support BE yet.
const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
if (!isLE)
    throw new Error('Non little-endian hardware is not supported');
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes$1(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
/**
 * Normalizes (non-hex) string or Uint8Array to Uint8Array.
 * Warning: when Uint8Array is passed, it would NOT get copied.
 * Keep in mind for future mutable operations.
 */
function toBytes(data) {
    if (typeof data === 'string')
        data = utf8ToBytes$1(data);
    if (!u8a$1(data))
        throw new Error(`expected Uint8Array, got ${typeof data}`);
    return data;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes$1(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0; // walk through each item, ensure they have proper type
    arrays.forEach((a) => {
        if (!u8a$1(a))
            throw new Error('Uint8Array expected');
        r.set(a, pad);
        pad += a.length;
    });
    return r;
}
// For runtime check if class implements interface
class Hash {
    // Safe version that clones internal state
    clone() {
        return this._cloneInto();
    }
}
function wrapConstructor(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
}
/**
 * Secure PRNG. Uses `crypto.getRandomValues`, which defers to OS.
 */
function randomBytes(bytesLength = 32) {
    if (crypto && typeof crypto.getRandomValues === 'function') {
        return crypto.getRandomValues(new Uint8Array(bytesLength));
    }
    throw new Error('crypto.getRandomValues must be defined');
}

// HMAC (RFC 2104)
class HMAC extends Hash {
    constructor(hash$1, _key) {
        super();
        this.finished = false;
        this.destroyed = false;
        hash(hash$1);
        const key = toBytes(_key);
        this.iHash = hash$1.create();
        if (typeof this.iHash.update !== 'function')
            throw new Error('Expected instance of class which extends utils.Hash');
        this.blockLen = this.iHash.blockLen;
        this.outputLen = this.iHash.outputLen;
        const blockLen = this.blockLen;
        const pad = new Uint8Array(blockLen);
        // blockLen can be bigger than outputLen
        pad.set(key.length > blockLen ? hash$1.create().update(key).digest() : key);
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36;
        this.iHash.update(pad);
        // By doing update (processing of first block) of outer hash here we can re-use it between multiple calls via clone
        this.oHash = hash$1.create();
        // Undo internal XOR && apply outer XOR
        for (let i = 0; i < pad.length; i++)
            pad[i] ^= 0x36 ^ 0x5c;
        this.oHash.update(pad);
        pad.fill(0);
    }
    update(buf) {
        exists(this);
        this.iHash.update(buf);
        return this;
    }
    digestInto(out) {
        exists(this);
        bytes(out, this.outputLen);
        this.finished = true;
        this.iHash.digestInto(out);
        this.oHash.update(out);
        this.oHash.digestInto(out);
        this.destroy();
    }
    digest() {
        const out = new Uint8Array(this.oHash.outputLen);
        this.digestInto(out);
        return out;
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        to || (to = Object.create(Object.getPrototypeOf(this), {}));
        const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
        to = to;
        to.finished = finished;
        to.destroyed = destroyed;
        to.blockLen = blockLen;
        to.outputLen = outputLen;
        to.oHash = oHash._cloneInto(to.oHash);
        to.iHash = iHash._cloneInto(to.iHash);
        return to;
    }
    destroy() {
        this.destroyed = true;
        this.oHash.destroy();
        this.iHash.destroy();
    }
}
/**
 * HMAC: RFC2104 message authentication code.
 * @param hash - function that would be used e.g. sha256
 * @param key - message key
 * @param message - message data
 */
const hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

// Polyfill for Safari 14
function setBigUint64(view, byteOffset, value, isLE) {
    if (typeof view.setBigUint64 === 'function')
        return view.setBigUint64(byteOffset, value, isLE);
    const _32n = BigInt(32);
    const _u32_max = BigInt(0xffffffff);
    const wh = Number((value >> _32n) & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE ? 4 : 0;
    const l = isLE ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE);
    view.setUint32(byteOffset + l, wl, isLE);
}
// Base SHA2 class (RFC 6234)
class SHA2 extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE) {
        super();
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.padOffset = padOffset;
        this.isLE = isLE;
        this.finished = false;
        this.length = 0;
        this.pos = 0;
        this.destroyed = false;
        this.buffer = new Uint8Array(blockLen);
        this.view = createView(this.buffer);
    }
    update(data) {
        exists(this);
        const { view, buffer, blockLen } = this;
        data = toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            // Fast path: we have at least one block in input, cast it to view and process
            if (take === blockLen) {
                const dataView = createView(data);
                for (; blockLen <= len - pos; pos += blockLen)
                    this.process(dataView, pos);
                continue;
            }
            buffer.set(data.subarray(pos, pos + take), this.pos);
            this.pos += take;
            pos += take;
            if (this.pos === blockLen) {
                this.process(view, 0);
                this.pos = 0;
            }
        }
        this.length += data.length;
        this.roundClean();
        return this;
    }
    digestInto(out) {
        exists(this);
        output(out, this);
        this.finished = true;
        // Padding
        // We can avoid allocation of buffer for padding completely if it
        // was previously not allocated here. But it won't change performance.
        const { buffer, view, blockLen, isLE } = this;
        let { pos } = this;
        // append the bit '1' to the message
        buffer[pos++] = 0b10000000;
        this.buffer.subarray(pos).fill(0);
        // we have less than padOffset left in buffer, so we cannot put length in current block, need process it and pad again
        if (this.padOffset > blockLen - pos) {
            this.process(view, 0);
            pos = 0;
        }
        // Pad until full block byte with zeros
        for (let i = pos; i < blockLen; i++)
            buffer[i] = 0;
        // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
        // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
        // So we just write lowest 64 bits of that value.
        setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
        this.process(view, 0);
        const oview = createView(out);
        const len = this.outputLen;
        // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
        if (len % 4)
            throw new Error('_sha2: outputLen should be aligned to 32bit');
        const outLen = len / 4;
        const state = this.get();
        if (outLen > state.length)
            throw new Error('_sha2: outputLen bigger than state');
        for (let i = 0; i < outLen; i++)
            oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
    }
    _cloneInto(to) {
        to || (to = new this.constructor());
        to.set(...this.get());
        const { blockLen, buffer, length, finished, destroyed, pos } = this;
        to.length = length;
        to.pos = pos;
        to.finished = finished;
        to.destroyed = destroyed;
        if (length % blockLen)
            to.buffer.set(buffer);
        return to;
    }
}

// SHA2-256 need to try 2^128 hashes to execute birthday attack.
// BTC network is doing 2^67 hashes/sec as per early 2023.
// Choice: a ? b : c
const Chi = (a, b, c) => (a & b) ^ (~a & c);
// Majority function, true if any two inpust is true
const Maj = (a, b, c) => (a & b) ^ (a & c) ^ (b & c);
// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K = /* @__PURE__ */ new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);
// Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
// prettier-ignore
const IV = /* @__PURE__ */ new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
]);
// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
class SHA256 extends SHA2 {
    constructor() {
        super(64, 32, 8, false);
        // We cannot use array here since array allows indexing by variable
        // which means optimizer/compiler cannot use registers.
        this.A = IV[0] | 0;
        this.B = IV[1] | 0;
        this.C = IV[2] | 0;
        this.D = IV[3] | 0;
        this.E = IV[4] | 0;
        this.F = IV[5] | 0;
        this.G = IV[6] | 0;
        this.H = IV[7] | 0;
    }
    get() {
        const { A, B, C, D, E, F, G, H } = this;
        return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
        this.A = A | 0;
        this.B = B | 0;
        this.C = C | 0;
        this.D = D | 0;
        this.E = E | 0;
        this.F = F | 0;
        this.G = G | 0;
        this.H = H | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4)
            SHA256_W[i] = view.getUint32(offset, false);
        for (let i = 16; i < 64; i++) {
            const W15 = SHA256_W[i - 15];
            const W2 = SHA256_W[i - 2];
            const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
            const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
            SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
        }
        // Compression function main loop, 64 rounds
        let { A, B, C, D, E, F, G, H } = this;
        for (let i = 0; i < 64; i++) {
            const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
            const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
            const T2 = (sigma0 + Maj(A, B, C)) | 0;
            H = G;
            G = F;
            F = E;
            E = (D + T1) | 0;
            D = C;
            C = B;
            B = A;
            A = (T1 + T2) | 0;
        }
        // Add the compressed chunk to the current hash value
        A = (A + this.A) | 0;
        B = (B + this.B) | 0;
        C = (C + this.C) | 0;
        D = (D + this.D) | 0;
        E = (E + this.E) | 0;
        F = (F + this.F) | 0;
        G = (G + this.G) | 0;
        H = (H + this.H) | 0;
        this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
        SHA256_W.fill(0);
    }
    destroy() {
        this.set(0, 0, 0, 0, 0, 0, 0, 0);
        this.buffer.fill(0);
    }
}
/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
const sha256$1 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
const _32n = /* @__PURE__ */ BigInt(32);
// We are not using BigUint64Array, because they are extremely slow as per 2022
function fromBig(n, le = false) {
    if (le)
        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split$1(lst, le = false) {
    let Ah = new Uint32Array(lst.length);
    let Al = new Uint32Array(lst.length);
    for (let i = 0; i < lst.length; i++) {
        const { h, l } = fromBig(lst[i], le);
        [Ah[i], Al[i]] = [h, l];
    }
    return [Ah, Al];
}
const toBig = (h, l) => (BigInt(h >>> 0) << _32n) | BigInt(l >>> 0);
// for Shift in [0, 32)
const shrSH = (h, _l, s) => h >>> s;
const shrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in [1, 32)
const rotrSH = (h, l, s) => (h >>> s) | (l << (32 - s));
const rotrSL = (h, l, s) => (h << (32 - s)) | (l >>> s);
// Right rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotrBH = (h, l, s) => (h << (64 - s)) | (l >>> (s - 32));
const rotrBL = (h, l, s) => (h >>> (s - 32)) | (l << (64 - s));
// Right rotate for shift===32 (just swaps l&h)
const rotr32H = (_h, l) => l;
const rotr32L = (h, _l) => h;
// Left rotate for Shift in [1, 32)
const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));
// JS uses 32-bit signed integers for bitwise operations which means we cannot
// simple take carry out of low bit sum by shift, we need to use division.
function add(Ah, Al, Bh, Bl) {
    const l = (Al >>> 0) + (Bl >>> 0);
    return { h: (Ah + Bh + ((l / 2 ** 32) | 0)) | 0, l: l | 0 };
}
// Addition with more than 2 elements
const add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
const add3H = (low, Ah, Bh, Ch) => (Ah + Bh + Ch + ((low / 2 ** 32) | 0)) | 0;
const add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
const add4H = (low, Ah, Bh, Ch, Dh) => (Ah + Bh + Ch + Dh + ((low / 2 ** 32) | 0)) | 0;
const add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
const add5H = (low, Ah, Bh, Ch, Dh, Eh) => (Ah + Bh + Ch + Dh + Eh + ((low / 2 ** 32) | 0)) | 0;
// prettier-ignore
const u64 = {
    fromBig, split: split$1, toBig,
    shrSH, shrSL,
    rotrSH, rotrSL, rotrBH, rotrBL,
    rotr32H, rotr32L,
    rotlSH, rotlSL, rotlBH, rotlBL,
    add, add3L, add3H, add4L, add4H, add5H, add5L,
};

// Round contants (first 32 bits of the fractional parts of the cube roots of the first 80 primes 2..409):
// prettier-ignore
const [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => u64.split([
    '0x428a2f98d728ae22', '0x7137449123ef65cd', '0xb5c0fbcfec4d3b2f', '0xe9b5dba58189dbbc',
    '0x3956c25bf348b538', '0x59f111f1b605d019', '0x923f82a4af194f9b', '0xab1c5ed5da6d8118',
    '0xd807aa98a3030242', '0x12835b0145706fbe', '0x243185be4ee4b28c', '0x550c7dc3d5ffb4e2',
    '0x72be5d74f27b896f', '0x80deb1fe3b1696b1', '0x9bdc06a725c71235', '0xc19bf174cf692694',
    '0xe49b69c19ef14ad2', '0xefbe4786384f25e3', '0x0fc19dc68b8cd5b5', '0x240ca1cc77ac9c65',
    '0x2de92c6f592b0275', '0x4a7484aa6ea6e483', '0x5cb0a9dcbd41fbd4', '0x76f988da831153b5',
    '0x983e5152ee66dfab', '0xa831c66d2db43210', '0xb00327c898fb213f', '0xbf597fc7beef0ee4',
    '0xc6e00bf33da88fc2', '0xd5a79147930aa725', '0x06ca6351e003826f', '0x142929670a0e6e70',
    '0x27b70a8546d22ffc', '0x2e1b21385c26c926', '0x4d2c6dfc5ac42aed', '0x53380d139d95b3df',
    '0x650a73548baf63de', '0x766a0abb3c77b2a8', '0x81c2c92e47edaee6', '0x92722c851482353b',
    '0xa2bfe8a14cf10364', '0xa81a664bbc423001', '0xc24b8b70d0f89791', '0xc76c51a30654be30',
    '0xd192e819d6ef5218', '0xd69906245565a910', '0xf40e35855771202a', '0x106aa07032bbd1b8',
    '0x19a4c116b8d2d0c8', '0x1e376c085141ab53', '0x2748774cdf8eeb99', '0x34b0bcb5e19b48a8',
    '0x391c0cb3c5c95a63', '0x4ed8aa4ae3418acb', '0x5b9cca4f7763e373', '0x682e6ff3d6b2b8a3',
    '0x748f82ee5defb2fc', '0x78a5636f43172f60', '0x84c87814a1f0ab72', '0x8cc702081a6439ec',
    '0x90befffa23631e28', '0xa4506cebde82bde9', '0xbef9a3f7b2c67915', '0xc67178f2e372532b',
    '0xca273eceea26619c', '0xd186b8c721c0c207', '0xeada7dd6cde0eb1e', '0xf57d4f7fee6ed178',
    '0x06f067aa72176fba', '0x0a637dc5a2c898a6', '0x113f9804bef90dae', '0x1b710b35131c471b',
    '0x28db77f523047d84', '0x32caab7b40c72493', '0x3c9ebe0a15c9bebc', '0x431d67c49c100d4c',
    '0x4cc5d4becb3e42b6', '0x597f299cfc657e2a', '0x5fcb6fab3ad6faec', '0x6c44198c4a475817'
].map(n => BigInt(n))))();
// Temporary buffer, not used to store anything between runs
const SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
const SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
class SHA512 extends SHA2 {
    constructor() {
        super(128, 64, 16, false);
        // We cannot use array here since array allows indexing by variable which means optimizer/compiler cannot use registers.
        // Also looks cleaner and easier to verify with spec.
        // Initial state (first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19):
        // h -- high 32 bits, l -- low 32 bits
        this.Ah = 0x6a09e667 | 0;
        this.Al = 0xf3bcc908 | 0;
        this.Bh = 0xbb67ae85 | 0;
        this.Bl = 0x84caa73b | 0;
        this.Ch = 0x3c6ef372 | 0;
        this.Cl = 0xfe94f82b | 0;
        this.Dh = 0xa54ff53a | 0;
        this.Dl = 0x5f1d36f1 | 0;
        this.Eh = 0x510e527f | 0;
        this.El = 0xade682d1 | 0;
        this.Fh = 0x9b05688c | 0;
        this.Fl = 0x2b3e6c1f | 0;
        this.Gh = 0x1f83d9ab | 0;
        this.Gl = 0xfb41bd6b | 0;
        this.Hh = 0x5be0cd19 | 0;
        this.Hl = 0x137e2179 | 0;
    }
    // prettier-ignore
    get() {
        const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
    }
    // prettier-ignore
    set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
        this.Ah = Ah | 0;
        this.Al = Al | 0;
        this.Bh = Bh | 0;
        this.Bl = Bl | 0;
        this.Ch = Ch | 0;
        this.Cl = Cl | 0;
        this.Dh = Dh | 0;
        this.Dl = Dl | 0;
        this.Eh = Eh | 0;
        this.El = El | 0;
        this.Fh = Fh | 0;
        this.Fl = Fl | 0;
        this.Gh = Gh | 0;
        this.Gl = Gl | 0;
        this.Hh = Hh | 0;
        this.Hl = Hl | 0;
    }
    process(view, offset) {
        // Extend the first 16 words into the remaining 64 words w[16..79] of the message schedule array
        for (let i = 0; i < 16; i++, offset += 4) {
            SHA512_W_H[i] = view.getUint32(offset);
            SHA512_W_L[i] = view.getUint32((offset += 4));
        }
        for (let i = 16; i < 80; i++) {
            // s0 := (w[i-15] rightrotate 1) xor (w[i-15] rightrotate 8) xor (w[i-15] rightshift 7)
            const W15h = SHA512_W_H[i - 15] | 0;
            const W15l = SHA512_W_L[i - 15] | 0;
            const s0h = u64.rotrSH(W15h, W15l, 1) ^ u64.rotrSH(W15h, W15l, 8) ^ u64.shrSH(W15h, W15l, 7);
            const s0l = u64.rotrSL(W15h, W15l, 1) ^ u64.rotrSL(W15h, W15l, 8) ^ u64.shrSL(W15h, W15l, 7);
            // s1 := (w[i-2] rightrotate 19) xor (w[i-2] rightrotate 61) xor (w[i-2] rightshift 6)
            const W2h = SHA512_W_H[i - 2] | 0;
            const W2l = SHA512_W_L[i - 2] | 0;
            const s1h = u64.rotrSH(W2h, W2l, 19) ^ u64.rotrBH(W2h, W2l, 61) ^ u64.shrSH(W2h, W2l, 6);
            const s1l = u64.rotrSL(W2h, W2l, 19) ^ u64.rotrBL(W2h, W2l, 61) ^ u64.shrSL(W2h, W2l, 6);
            // SHA256_W[i] = s0 + s1 + SHA256_W[i - 7] + SHA256_W[i - 16];
            const SUMl = u64.add4L(s0l, s1l, SHA512_W_L[i - 7], SHA512_W_L[i - 16]);
            const SUMh = u64.add4H(SUMl, s0h, s1h, SHA512_W_H[i - 7], SHA512_W_H[i - 16]);
            SHA512_W_H[i] = SUMh | 0;
            SHA512_W_L[i] = SUMl | 0;
        }
        let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
        // Compression function main loop, 80 rounds
        for (let i = 0; i < 80; i++) {
            // S1 := (e rightrotate 14) xor (e rightrotate 18) xor (e rightrotate 41)
            const sigma1h = u64.rotrSH(Eh, El, 14) ^ u64.rotrSH(Eh, El, 18) ^ u64.rotrBH(Eh, El, 41);
            const sigma1l = u64.rotrSL(Eh, El, 14) ^ u64.rotrSL(Eh, El, 18) ^ u64.rotrBL(Eh, El, 41);
            //const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
            const CHIh = (Eh & Fh) ^ (~Eh & Gh);
            const CHIl = (El & Fl) ^ (~El & Gl);
            // T1 = H + sigma1 + Chi(E, F, G) + SHA512_K[i] + SHA512_W[i]
            // prettier-ignore
            const T1ll = u64.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i], SHA512_W_L[i]);
            const T1h = u64.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i], SHA512_W_H[i]);
            const T1l = T1ll | 0;
            // S0 := (a rightrotate 28) xor (a rightrotate 34) xor (a rightrotate 39)
            const sigma0h = u64.rotrSH(Ah, Al, 28) ^ u64.rotrBH(Ah, Al, 34) ^ u64.rotrBH(Ah, Al, 39);
            const sigma0l = u64.rotrSL(Ah, Al, 28) ^ u64.rotrBL(Ah, Al, 34) ^ u64.rotrBL(Ah, Al, 39);
            const MAJh = (Ah & Bh) ^ (Ah & Ch) ^ (Bh & Ch);
            const MAJl = (Al & Bl) ^ (Al & Cl) ^ (Bl & Cl);
            Hh = Gh | 0;
            Hl = Gl | 0;
            Gh = Fh | 0;
            Gl = Fl | 0;
            Fh = Eh | 0;
            Fl = El | 0;
            ({ h: Eh, l: El } = u64.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
            Dh = Ch | 0;
            Dl = Cl | 0;
            Ch = Bh | 0;
            Cl = Bl | 0;
            Bh = Ah | 0;
            Bl = Al | 0;
            const All = u64.add3L(T1l, sigma0l, MAJl);
            Ah = u64.add3H(All, T1h, sigma0h, MAJh);
            Al = All | 0;
        }
        // Add the compressed chunk to the current hash value
        ({ h: Ah, l: Al } = u64.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
        ({ h: Bh, l: Bl } = u64.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
        ({ h: Ch, l: Cl } = u64.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
        ({ h: Dh, l: Dl } = u64.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
        ({ h: Eh, l: El } = u64.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
        ({ h: Fh, l: Fl } = u64.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
        ({ h: Gh, l: Gl } = u64.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
        ({ h: Hh, l: Hl } = u64.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
        this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
    }
    roundClean() {
        SHA512_W_H.fill(0);
        SHA512_W_L.fill(0);
    }
    destroy() {
        this.buffer.fill(0);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    }
}
const sha512 = /* @__PURE__ */ wrapConstructor(() => new SHA512());

/* Browser Crypto Shims */
function getGlobal() {
    if (typeof self !== 'undefined') {
        return self;
    }
    if (typeof window !== 'undefined') {
        return window;
    }
    if (typeof global !== 'undefined') {
        return global;
    }
    throw new Error('unable to locate global object');
}
const anyGlobal = getGlobal();
anyGlobal.crypto || anyGlobal.msCrypto;
function createHash(algo) {
    switch (algo) {
        case "sha256": return sha256$1.create();
        case "sha512": return sha512.create();
    }
    assertArgument(false, "invalid hashing algorithm name", "algorithm", algo);
}

// SHA3 (keccak) is based on a new design: basically, the internal state is bigger than output size.
// It's called a sponge function.
// Various per round constants calculations
const [SHA3_PI, SHA3_ROTL, _SHA3_IOTA] = [[], [], []];
const _0n$4 = /* @__PURE__ */ BigInt(0);
const _1n$5 = /* @__PURE__ */ BigInt(1);
const _2n$3 = /* @__PURE__ */ BigInt(2);
const _7n = /* @__PURE__ */ BigInt(7);
const _256n = /* @__PURE__ */ BigInt(256);
const _0x71n = /* @__PURE__ */ BigInt(0x71);
for (let round = 0, R = _1n$5, x = 1, y = 0; round < 24; round++) {
    // Pi
    [x, y] = [y, (2 * x + 3 * y) % 5];
    SHA3_PI.push(2 * (5 * y + x));
    // Rotational
    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
    // Iota
    let t = _0n$4;
    for (let j = 0; j < 7; j++) {
        R = ((R << _1n$5) ^ ((R >> _7n) * _0x71n)) % _256n;
        if (R & _2n$3)
            t ^= _1n$5 << ((_1n$5 << /* @__PURE__ */ BigInt(j)) - _1n$5);
    }
    _SHA3_IOTA.push(t);
}
const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split$1(_SHA3_IOTA, true);
// Left rotation (without 0, 32, 64)
const rotlH = (h, l, s) => (s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s));
const rotlL = (h, l, s) => (s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s));
// Same as keccakf1600, but allows to skip some rounds
function keccakP(s, rounds = 24) {
    const B = new Uint32Array(5 * 2);
    // NOTE: all indices are x2 since we store state as u32 instead of u64 (bigints to slow in js)
    for (let round = 24 - rounds; round < 24; round++) {
        // Theta θ
        for (let x = 0; x < 10; x++)
            B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
        for (let x = 0; x < 10; x += 2) {
            const idx1 = (x + 8) % 10;
            const idx0 = (x + 2) % 10;
            const B0 = B[idx0];
            const B1 = B[idx0 + 1];
            const Th = rotlH(B0, B1, 1) ^ B[idx1];
            const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
            for (let y = 0; y < 50; y += 10) {
                s[x + y] ^= Th;
                s[x + y + 1] ^= Tl;
            }
        }
        // Rho (ρ) and Pi (π)
        let curH = s[2];
        let curL = s[3];
        for (let t = 0; t < 24; t++) {
            const shift = SHA3_ROTL[t];
            const Th = rotlH(curH, curL, shift);
            const Tl = rotlL(curH, curL, shift);
            const PI = SHA3_PI[t];
            curH = s[PI];
            curL = s[PI + 1];
            s[PI] = Th;
            s[PI + 1] = Tl;
        }
        // Chi (χ)
        for (let y = 0; y < 50; y += 10) {
            for (let x = 0; x < 10; x++)
                B[x] = s[y + x];
            for (let x = 0; x < 10; x++)
                s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
        }
        // Iota (ι)
        s[0] ^= SHA3_IOTA_H[round];
        s[1] ^= SHA3_IOTA_L[round];
    }
    B.fill(0);
}
class Keccak extends Hash {
    // NOTE: we accept arguments in bytes instead of bits here.
    constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        // Can be passed from user as dkLen
        number(outputLen);
        // 1600 = 5x5 matrix of 64bit.  1600 bits === 200 bytes
        if (0 >= this.blockLen || this.blockLen >= 200)
            throw new Error('Sha3 supports only keccak-f1600 function');
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
    }
    keccak() {
        keccakP(this.state32, this.rounds);
        this.posOut = 0;
        this.pos = 0;
    }
    update(data) {
        exists(this);
        const { blockLen, state } = this;
        data = toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len;) {
            const take = Math.min(blockLen - this.pos, len - pos);
            for (let i = 0; i < take; i++)
                state[this.pos++] ^= data[pos++];
            if (this.pos === blockLen)
                this.keccak();
        }
        return this;
    }
    finish() {
        if (this.finished)
            return;
        this.finished = true;
        const { state, suffix, pos, blockLen } = this;
        // Do the padding
        state[pos] ^= suffix;
        if ((suffix & 0x80) !== 0 && pos === blockLen - 1)
            this.keccak();
        state[blockLen - 1] ^= 0x80;
        this.keccak();
    }
    writeInto(out) {
        exists(this, false);
        bytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len;) {
            if (this.posOut >= blockLen)
                this.keccak();
            const take = Math.min(blockLen - this.posOut, len - pos);
            out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
            this.posOut += take;
            pos += take;
        }
        return out;
    }
    xofInto(out) {
        // Sha3/Keccak usage with XOF is probably mistake, only SHAKE instances can do XOF
        if (!this.enableXOF)
            throw new Error('XOF is not possible for this instance');
        return this.writeInto(out);
    }
    xof(bytes) {
        number(bytes);
        return this.xofInto(new Uint8Array(bytes));
    }
    digestInto(out) {
        output(out, this);
        if (this.finished)
            throw new Error('digest() was already called');
        this.writeInto(out);
        this.destroy();
        return out;
    }
    digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
    }
    destroy() {
        this.destroyed = true;
        this.state.fill(0);
    }
    _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        // Suffix can change in cSHAKE
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
    }
}
const gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
/**
 * keccak-256 hash function. Different from SHA3-256.
 * @param message - that would be hashed
 */
const keccak_256 = /* @__PURE__ */ gen(0x01, 136, 256 / 8);

/**
 *  Cryptographic hashing functions
 *
 *  @_subsection: api/crypto:Hash Functions [about-crypto-hashing]
 */
let locked = false;
const _keccak256 = function (data) {
    return keccak_256(data);
};
let __keccak256 = _keccak256;
/**
 *  Compute the cryptographic KECCAK256 hash of %%data%%.
 *
 *  The %%data%% **must** be a data representation, to compute the
 *  hash of UTF-8 data use the [[id]] function.
 *
 *  @returns DataHexstring
 *  @example:
 *    keccak256("0x")
 *    //_result:
 *
 *    keccak256("0x1337")
 *    //_result:
 *
 *    keccak256(new Uint8Array([ 0x13, 0x37 ]))
 *    //_result:
 *
 *    // Strings are assumed to be DataHexString, otherwise it will
 *    // throw. To hash UTF-8 data, see the note above.
 *    keccak256("Hello World")
 *    //_error:
 */
function keccak256(_data) {
    const data = getBytes(_data, "data");
    return hexlify(__keccak256(data));
}
keccak256._ = _keccak256;
keccak256.lock = function () { locked = true; };
keccak256.register = function (func) {
    if (locked) {
        throw new TypeError("keccak256 is locked");
    }
    __keccak256 = func;
};
Object.freeze(keccak256);

const _sha256 = function (data) {
    return createHash("sha256").update(data).digest();
};
let __sha256 = _sha256;
let locked256 = false;
/**
 *  Compute the cryptographic SHA2-256 hash of %%data%%.
 *
 *  @_docloc: api/crypto:Hash Functions
 *  @returns DataHexstring
 *
 *  @example:
 *    sha256("0x")
 *    //_result:
 *
 *    sha256("0x1337")
 *    //_result:
 *
 *    sha256(new Uint8Array([ 0x13, 0x37 ]))
 *    //_result:
 *
 */
function sha256(_data) {
    const data = getBytes(_data, "data");
    return hexlify(__sha256(data));
}
sha256._ = _sha256;
sha256.lock = function () { locked256 = true; };
sha256.register = function (func) {
    if (locked256) {
        throw new Error("sha256 is locked");
    }
    __sha256 = func;
};
Object.freeze(sha256);
Object.freeze(sha256);

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// 100 lines of code in the file are duplicated from noble-hashes (utils).
// This is OK: `abstract` directory does not use noble-hashes.
// User may opt-in into using different hashing library. This way, noble-hashes
// won't be included into their bundle.
const _0n$3 = BigInt(0);
const _1n$4 = BigInt(1);
const _2n$2 = BigInt(2);
const u8a = (a) => a instanceof Uint8Array;
const hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'));
/**
 * @example bytesToHex(Uint8Array.from([0xca, 0xfe, 0x01, 0x23])) // 'cafe0123'
 */
function bytesToHex(bytes) {
    if (!u8a(bytes))
        throw new Error('Uint8Array expected');
    // pre-caching improves the speed 6x
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += hexes[bytes[i]];
    }
    return hex;
}
function numberToHexUnpadded(num) {
    const hex = num.toString(16);
    return hex.length & 1 ? `0${hex}` : hex;
}
function hexToNumber(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    // Big Endian
    return BigInt(hex === '' ? '0' : `0x${hex}`);
}
/**
 * @example hexToBytes('cafe0123') // Uint8Array.from([0xca, 0xfe, 0x01, 0x23])
 */
function hexToBytes(hex) {
    if (typeof hex !== 'string')
        throw new Error('hex string expected, got ' + typeof hex);
    const len = hex.length;
    if (len % 2)
        throw new Error('padded hex string expected, got unpadded hex of length ' + len);
    const array = new Uint8Array(len / 2);
    for (let i = 0; i < array.length; i++) {
        const j = i * 2;
        const hexByte = hex.slice(j, j + 2);
        const byte = Number.parseInt(hexByte, 16);
        if (Number.isNaN(byte) || byte < 0)
            throw new Error('Invalid byte sequence');
        array[i] = byte;
    }
    return array;
}
// BE: Big Endian, LE: Little Endian
function bytesToNumberBE(bytes) {
    return hexToNumber(bytesToHex(bytes));
}
function bytesToNumberLE(bytes) {
    if (!u8a(bytes))
        throw new Error('Uint8Array expected');
    return hexToNumber(bytesToHex(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n, len) {
    return hexToBytes(n.toString(16).padStart(len * 2, '0'));
}
function numberToBytesLE(n, len) {
    return numberToBytesBE(n, len).reverse();
}
// Unpadded, rarely used
function numberToVarBytesBE(n) {
    return hexToBytes(numberToHexUnpadded(n));
}
/**
 * Takes hex string or Uint8Array, converts to Uint8Array.
 * Validates output length.
 * Will throw error for other types.
 * @param title descriptive title for an error e.g. 'private key'
 * @param hex hex string or Uint8Array
 * @param expectedLength optional, will compare to result array's length
 * @returns
 */
function ensureBytes(title, hex, expectedLength) {
    let res;
    if (typeof hex === 'string') {
        try {
            res = hexToBytes(hex);
        }
        catch (e) {
            throw new Error(`${title} must be valid hex string, got "${hex}". Cause: ${e}`);
        }
    }
    else if (u8a(hex)) {
        // Uint8Array.from() instead of hash.slice() because node.js Buffer
        // is instance of Uint8Array, and its slice() creates **mutable** copy
        res = Uint8Array.from(hex);
    }
    else {
        throw new Error(`${title} must be hex string or Uint8Array`);
    }
    const len = res.length;
    if (typeof expectedLength === 'number' && len !== expectedLength)
        throw new Error(`${title} expected ${expectedLength} bytes, got ${len}`);
    return res;
}
/**
 * Copies several Uint8Arrays into one.
 */
function concatBytes(...arrays) {
    const r = new Uint8Array(arrays.reduce((sum, a) => sum + a.length, 0));
    let pad = 0; // walk through each item, ensure they have proper type
    arrays.forEach((a) => {
        if (!u8a(a))
            throw new Error('Uint8Array expected');
        r.set(a, pad);
        pad += a.length;
    });
    return r;
}
function equalBytes(b1, b2) {
    // We don't care about timing attacks here
    if (b1.length !== b2.length)
        return false;
    for (let i = 0; i < b1.length; i++)
        if (b1[i] !== b2[i])
            return false;
    return true;
}
/**
 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
 */
function utf8ToBytes(str) {
    if (typeof str !== 'string')
        throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
    return new Uint8Array(new TextEncoder().encode(str)); // https://bugzil.la/1681809
}
// Bit operations
/**
 * Calculates amount of bits in a bigint.
 * Same as `n.toString(2).length`
 */
function bitLen(n) {
    let len;
    for (len = 0; n > _0n$3; n >>= _1n$4, len += 1)
        ;
    return len;
}
/**
 * Gets single bit at position.
 * NOTE: first bit position is 0 (same as arrays)
 * Same as `!!+Array.from(n.toString(2)).reverse()[pos]`
 */
function bitGet(n, pos) {
    return (n >> BigInt(pos)) & _1n$4;
}
/**
 * Sets single bit at position.
 */
const bitSet = (n, pos, value) => {
    return n | ((value ? _1n$4 : _0n$3) << BigInt(pos));
};
/**
 * Calculate mask for N bits. Not using ** operator with bigints because of old engines.
 * Same as BigInt(`0b${Array(i).fill('1').join('')}`)
 */
const bitMask = (n) => (_2n$2 << BigInt(n - 1)) - _1n$4;
// DRBG
const u8n = (data) => new Uint8Array(data); // creates Uint8Array
const u8fr = (arr) => Uint8Array.from(arr); // another shortcut
/**
 * Minimal HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
 * @returns function that will call DRBG until 2nd arg returns something meaningful
 * @example
 *   const drbg = createHmacDRBG<Key>(32, 32, hmac);
 *   drbg(seed, bytesToKey); // bytesToKey must return Key or undefined
 */
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
    if (typeof hashLen !== 'number' || hashLen < 2)
        throw new Error('hashLen must be a number');
    if (typeof qByteLen !== 'number' || qByteLen < 2)
        throw new Error('qByteLen must be a number');
    if (typeof hmacFn !== 'function')
        throw new Error('hmacFn must be a function');
    // Step B, Step C: set hashLen to 8*ceil(hlen/8)
    let v = u8n(hashLen); // Minimal non-full-spec HMAC-DRBG from NIST 800-90 for RFC6979 sigs.
    let k = u8n(hashLen); // Steps B and C of RFC6979 3.2: set hashLen, in our case always same
    let i = 0; // Iterations counter, will throw when over 1000
    const reset = () => {
        v.fill(1);
        k.fill(0);
        i = 0;
    };
    const h = (...b) => hmacFn(k, v, ...b); // hmac(k)(v, ...values)
    const reseed = (seed = u8n()) => {
        // HMAC-DRBG reseed() function. Steps D-G
        k = h(u8fr([0x00]), seed); // k = hmac(k || v || 0x00 || seed)
        v = h(); // v = hmac(k || v)
        if (seed.length === 0)
            return;
        k = h(u8fr([0x01]), seed); // k = hmac(k || v || 0x01 || seed)
        v = h(); // v = hmac(k || v)
    };
    const gen = () => {
        // HMAC-DRBG generate() function
        if (i++ >= 1000)
            throw new Error('drbg: tried 1000 values');
        let len = 0;
        const out = [];
        while (len < qByteLen) {
            v = h();
            const sl = v.slice();
            out.push(sl);
            len += v.length;
        }
        return concatBytes(...out);
    };
    const genUntil = (seed, pred) => {
        reset();
        reseed(seed); // Steps D-G
        let res = undefined; // Step H: grind until k is in [1..n-1]
        while (!(res = pred(gen())))
            reseed();
        reset();
        return res;
    };
    return genUntil;
}
// Validating curves and fields
const validatorFns = {
    bigint: (val) => typeof val === 'bigint',
    function: (val) => typeof val === 'function',
    boolean: (val) => typeof val === 'boolean',
    string: (val) => typeof val === 'string',
    stringOrUint8Array: (val) => typeof val === 'string' || val instanceof Uint8Array,
    isSafeInteger: (val) => Number.isSafeInteger(val),
    array: (val) => Array.isArray(val),
    field: (val, object) => object.Fp.isValid(val),
    hash: (val) => typeof val === 'function' && Number.isSafeInteger(val.outputLen),
};
// type Record<K extends string | number | symbol, T> = { [P in K]: T; }
function validateObject(object, validators, optValidators = {}) {
    const checkField = (fieldName, type, isOptional) => {
        const checkVal = validatorFns[type];
        if (typeof checkVal !== 'function')
            throw new Error(`Invalid validator "${type}", expected function`);
        const val = object[fieldName];
        if (isOptional && val === undefined)
            return;
        if (!checkVal(val, object)) {
            throw new Error(`Invalid param ${String(fieldName)}=${val} (${typeof val}), expected ${type}`);
        }
    };
    for (const [fieldName, type] of Object.entries(validators))
        checkField(fieldName, type, false);
    for (const [fieldName, type] of Object.entries(optValidators))
        checkField(fieldName, type, true);
    return object;
}
// validate type tests
// const o: { a: number; b: number; c: number } = { a: 1, b: 5, c: 6 };
// const z0 = validateObject(o, { a: 'isSafeInteger' }, { c: 'bigint' }); // Ok!
// // Should fail type-check
// const z1 = validateObject(o, { a: 'tmp' }, { c: 'zz' });
// const z2 = validateObject(o, { a: 'isSafeInteger' }, { c: 'zz' });
// const z3 = validateObject(o, { test: 'boolean', z: 'bug' });
// const z4 = validateObject(o, { a: 'boolean', z: 'bug' });

var ut = /*#__PURE__*/Object.freeze({
	__proto__: null,
	bitGet: bitGet,
	bitLen: bitLen,
	bitMask: bitMask,
	bitSet: bitSet,
	bytesToHex: bytesToHex,
	bytesToNumberBE: bytesToNumberBE,
	bytesToNumberLE: bytesToNumberLE,
	concatBytes: concatBytes,
	createHmacDrbg: createHmacDrbg,
	ensureBytes: ensureBytes,
	equalBytes: equalBytes,
	hexToBytes: hexToBytes,
	hexToNumber: hexToNumber,
	numberToBytesBE: numberToBytesBE,
	numberToBytesLE: numberToBytesLE,
	numberToHexUnpadded: numberToHexUnpadded,
	numberToVarBytesBE: numberToVarBytesBE,
	utf8ToBytes: utf8ToBytes,
	validateObject: validateObject
});

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Utilities for modular arithmetics and finite fields
// prettier-ignore
const _0n$2 = BigInt(0), _1n$3 = BigInt(1), _2n$1 = BigInt(2), _3n$1 = BigInt(3);
// prettier-ignore
const _4n = BigInt(4), _5n = BigInt(5), _8n = BigInt(8);
// prettier-ignore
BigInt(9); BigInt(16);
// Calculates a modulo b
function mod(a, b) {
    const result = a % b;
    return result >= _0n$2 ? result : b + result;
}
/**
 * Efficiently raise num to power and do modular division.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 * @example
 * pow(2n, 6n, 11n) // 64n % 11n == 9n
 */
// TODO: use field version && remove
function pow(num, power, modulo) {
    if (modulo <= _0n$2 || power < _0n$2)
        throw new Error('Expected power/modulo > 0');
    if (modulo === _1n$3)
        return _0n$2;
    let res = _1n$3;
    while (power > _0n$2) {
        if (power & _1n$3)
            res = (res * num) % modulo;
        num = (num * num) % modulo;
        power >>= _1n$3;
    }
    return res;
}
// Does x ^ (2 ^ power) mod p. pow2(30, 4) == 30 ^ (2 ^ 4)
function pow2(x, power, modulo) {
    let res = x;
    while (power-- > _0n$2) {
        res *= res;
        res %= modulo;
    }
    return res;
}
// Inverses number over modulo
function invert(number, modulo) {
    if (number === _0n$2 || modulo <= _0n$2) {
        throw new Error(`invert: expected positive integers, got n=${number} mod=${modulo}`);
    }
    // Euclidean GCD https://brilliant.org/wiki/extended-euclidean-algorithm/
    // Fermat's little theorem "CT-like" version inv(n) = n^(m-2) mod m is 30x slower.
    let a = mod(number, modulo);
    let b = modulo;
    // prettier-ignore
    let x = _0n$2, u = _1n$3;
    while (a !== _0n$2) {
        // JIT applies optimization if those two lines follow each other
        const q = b / a;
        const r = b % a;
        const m = x - u * q;
        // prettier-ignore
        b = a, a = r, x = u, u = m;
    }
    const gcd = b;
    if (gcd !== _1n$3)
        throw new Error('invert: does not exist');
    return mod(x, modulo);
}
/**
 * Tonelli-Shanks square root search algorithm.
 * 1. https://eprint.iacr.org/2012/685.pdf (page 12)
 * 2. Square Roots from 1; 24, 51, 10 to Dan Shanks
 * Will start an infinite loop if field order P is not prime.
 * @param P field order
 * @returns function that takes field Fp (created from P) and number n
 */
function tonelliShanks(P) {
    // Legendre constant: used to calculate Legendre symbol (a | p),
    // which denotes the value of a^((p-1)/2) (mod p).
    // (a | p) ≡ 1    if a is a square (mod p)
    // (a | p) ≡ -1   if a is not a square (mod p)
    // (a | p) ≡ 0    if a ≡ 0 (mod p)
    const legendreC = (P - _1n$3) / _2n$1;
    let Q, S, Z;
    // Step 1: By factoring out powers of 2 from p - 1,
    // find q and s such that p - 1 = q*(2^s) with q odd
    for (Q = P - _1n$3, S = 0; Q % _2n$1 === _0n$2; Q /= _2n$1, S++)
        ;
    // Step 2: Select a non-square z such that (z | p) ≡ -1 and set c ≡ zq
    for (Z = _2n$1; Z < P && pow(Z, legendreC, P) !== P - _1n$3; Z++)
        ;
    // Fast-path
    if (S === 1) {
        const p1div4 = (P + _1n$3) / _4n;
        return function tonelliFast(Fp, n) {
            const root = Fp.pow(n, p1div4);
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Slow-path
    const Q1div2 = (Q + _1n$3) / _2n$1;
    return function tonelliSlow(Fp, n) {
        // Step 0: Check that n is indeed a square: (n | p) should not be ≡ -1
        if (Fp.pow(n, legendreC) === Fp.neg(Fp.ONE))
            throw new Error('Cannot find square root');
        let r = S;
        // TODO: will fail at Fp2/etc
        let g = Fp.pow(Fp.mul(Fp.ONE, Z), Q); // will update both x and b
        let x = Fp.pow(n, Q1div2); // first guess at the square root
        let b = Fp.pow(n, Q); // first guess at the fudge factor
        while (!Fp.eql(b, Fp.ONE)) {
            if (Fp.eql(b, Fp.ZERO))
                return Fp.ZERO; // https://en.wikipedia.org/wiki/Tonelli%E2%80%93Shanks_algorithm (4. If t = 0, return r = 0)
            // Find m such b^(2^m)==1
            let m = 1;
            for (let t2 = Fp.sqr(b); m < r; m++) {
                if (Fp.eql(t2, Fp.ONE))
                    break;
                t2 = Fp.sqr(t2); // t2 *= t2
            }
            // NOTE: r-m-1 can be bigger than 32, need to convert to bigint before shift, otherwise there will be overflow
            const ge = Fp.pow(g, _1n$3 << BigInt(r - m - 1)); // ge = 2^(r-m-1)
            g = Fp.sqr(ge); // g = ge * ge
            x = Fp.mul(x, ge); // x *= ge
            b = Fp.mul(b, g); // b *= g
            r = m;
        }
        return x;
    };
}
function FpSqrt(P) {
    // NOTE: different algorithms can give different roots, it is up to user to decide which one they want.
    // For example there is FpSqrtOdd/FpSqrtEven to choice root based on oddness (used for hash-to-curve).
    // P ≡ 3 (mod 4)
    // √n = n^((P+1)/4)
    if (P % _4n === _3n$1) {
        // Not all roots possible!
        // const ORDER =
        //   0x1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaabn;
        // const NUM = 72057594037927816n;
        const p1div4 = (P + _1n$3) / _4n;
        return function sqrt3mod4(Fp, n) {
            const root = Fp.pow(n, p1div4);
            // Throw if root**2 != n
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Atkin algorithm for q ≡ 5 (mod 8), https://eprint.iacr.org/2012/685.pdf (page 10)
    if (P % _8n === _5n) {
        const c1 = (P - _5n) / _8n;
        return function sqrt5mod8(Fp, n) {
            const n2 = Fp.mul(n, _2n$1);
            const v = Fp.pow(n2, c1);
            const nv = Fp.mul(n, v);
            const i = Fp.mul(Fp.mul(nv, _2n$1), v);
            const root = Fp.mul(nv, Fp.sub(i, Fp.ONE));
            if (!Fp.eql(Fp.sqr(root), n))
                throw new Error('Cannot find square root');
            return root;
        };
    }
    // Other cases: Tonelli-Shanks algorithm
    return tonelliShanks(P);
}
// prettier-ignore
const FIELD_FIELDS = [
    'create', 'isValid', 'is0', 'neg', 'inv', 'sqrt', 'sqr',
    'eql', 'add', 'sub', 'mul', 'pow', 'div',
    'addN', 'subN', 'mulN', 'sqrN'
];
function validateField(field) {
    const initial = {
        ORDER: 'bigint',
        MASK: 'bigint',
        BYTES: 'isSafeInteger',
        BITS: 'isSafeInteger',
    };
    const opts = FIELD_FIELDS.reduce((map, val) => {
        map[val] = 'function';
        return map;
    }, initial);
    return validateObject(field, opts);
}
// Generic field functions
/**
 * Same as `pow` but for Fp: non-constant-time.
 * Unsafe in some contexts: uses ladder, so can expose bigint bits.
 */
function FpPow(f, num, power) {
    // Should have same speed as pow for bigints
    // TODO: benchmark!
    if (power < _0n$2)
        throw new Error('Expected power > 0');
    if (power === _0n$2)
        return f.ONE;
    if (power === _1n$3)
        return num;
    let p = f.ONE;
    let d = num;
    while (power > _0n$2) {
        if (power & _1n$3)
            p = f.mul(p, d);
        d = f.sqr(d);
        power >>= _1n$3;
    }
    return p;
}
/**
 * Efficiently invert an array of Field elements.
 * `inv(0)` will return `undefined` here: make sure to throw an error.
 */
function FpInvertBatch(f, nums) {
    const tmp = new Array(nums.length);
    // Walk from first to last, multiply them by each other MOD p
    const lastMultiplied = nums.reduce((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = acc;
        return f.mul(acc, num);
    }, f.ONE);
    // Invert last element
    const inverted = f.inv(lastMultiplied);
    // Walk from last to first, multiply them by inverted each other MOD p
    nums.reduceRight((acc, num, i) => {
        if (f.is0(num))
            return acc;
        tmp[i] = f.mul(acc, tmp[i]);
        return f.mul(acc, num);
    }, inverted);
    return tmp;
}
// CURVE.n lengths
function nLength(n, nBitLength) {
    // Bit size, byte size of CURVE.n
    const _nBitLength = nBitLength !== undefined ? nBitLength : n.toString(2).length;
    const nByteLength = Math.ceil(_nBitLength / 8);
    return { nBitLength: _nBitLength, nByteLength };
}
/**
 * Initializes a finite field over prime. **Non-primes are not supported.**
 * Do not init in loop: slow. Very fragile: always run a benchmark on a change.
 * Major performance optimizations:
 * * a) denormalized operations like mulN instead of mul
 * * b) same object shape: never add or remove keys
 * * c) Object.freeze
 * @param ORDER prime positive bigint
 * @param bitLen how many bits the field consumes
 * @param isLE (def: false) if encoding / decoding should be in little-endian
 * @param redef optional faster redefinitions of sqrt and other methods
 */
function Field(ORDER, bitLen, isLE = false, redef = {}) {
    if (ORDER <= _0n$2)
        throw new Error(`Expected Field ORDER > 0, got ${ORDER}`);
    const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen);
    if (BYTES > 2048)
        throw new Error('Field lengths over 2048 bytes are not supported');
    const sqrtP = FpSqrt(ORDER);
    const f = Object.freeze({
        ORDER,
        BITS,
        BYTES,
        MASK: bitMask(BITS),
        ZERO: _0n$2,
        ONE: _1n$3,
        create: (num) => mod(num, ORDER),
        isValid: (num) => {
            if (typeof num !== 'bigint')
                throw new Error(`Invalid field element: expected bigint, got ${typeof num}`);
            return _0n$2 <= num && num < ORDER; // 0 is valid element, but it's not invertible
        },
        is0: (num) => num === _0n$2,
        isOdd: (num) => (num & _1n$3) === _1n$3,
        neg: (num) => mod(-num, ORDER),
        eql: (lhs, rhs) => lhs === rhs,
        sqr: (num) => mod(num * num, ORDER),
        add: (lhs, rhs) => mod(lhs + rhs, ORDER),
        sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
        mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
        pow: (num, power) => FpPow(f, num, power),
        div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
        // Same as above, but doesn't normalize
        sqrN: (num) => num * num,
        addN: (lhs, rhs) => lhs + rhs,
        subN: (lhs, rhs) => lhs - rhs,
        mulN: (lhs, rhs) => lhs * rhs,
        inv: (num) => invert(num, ORDER),
        sqrt: redef.sqrt || ((n) => sqrtP(f, n)),
        invertBatch: (lst) => FpInvertBatch(f, lst),
        // TODO: do we really need constant cmov?
        // We don't have const-time bigints anyway, so probably will be not very useful
        cmov: (a, b, c) => (c ? b : a),
        toBytes: (num) => (isLE ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES)),
        fromBytes: (bytes) => {
            if (bytes.length !== BYTES)
                throw new Error(`Fp.fromBytes: expected ${BYTES}, got ${bytes.length}`);
            return isLE ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
        },
    });
    return Object.freeze(f);
}
/**
 * Returns total number of bytes consumed by the field element.
 * For example, 32 bytes for usual 256-bit weierstrass curve.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of field
 */
function getFieldBytesLength(fieldOrder) {
    if (typeof fieldOrder !== 'bigint')
        throw new Error('field order must be bigint');
    const bitLength = fieldOrder.toString(2).length;
    return Math.ceil(bitLength / 8);
}
/**
 * Returns minimal amount of bytes that can be safely reduced
 * by field order.
 * Should be 2^-128 for 128-bit curve such as P256.
 * @param fieldOrder number of field elements, usually CURVE.n
 * @returns byte length of target hash
 */
function getMinHashLength(fieldOrder) {
    const length = getFieldBytesLength(fieldOrder);
    return length + Math.ceil(length / 2);
}
/**
 * "Constant-time" private key generation utility.
 * Can take (n + n/2) or more bytes of uniform input e.g. from CSPRNG or KDF
 * and convert them into private scalar, with the modulo bias being negligible.
 * Needs at least 48 bytes of input for 32-byte private key.
 * https://research.kudelskisecurity.com/2020/07/28/the-definitive-guide-to-modulo-bias-and-how-to-avoid-it/
 * FIPS 186-5, A.2 https://csrc.nist.gov/publications/detail/fips/186/5/final
 * RFC 9380, https://www.rfc-editor.org/rfc/rfc9380#section-5
 * @param hash hash output from SHA3 or a similar function
 * @param groupOrder size of subgroup - (e.g. secp256k1.CURVE.n)
 * @param isLE interpret hash bytes as LE num
 * @returns valid private scalar
 */
function mapHashToField(key, fieldOrder, isLE = false) {
    const len = key.length;
    const fieldLen = getFieldBytesLength(fieldOrder);
    const minLen = getMinHashLength(fieldOrder);
    // No small numbers: need to understand bias story. No huge numbers: easier to detect JS timings.
    if (len < 16 || len < minLen || len > 1024)
        throw new Error(`expected ${minLen}-1024 bytes of input, got ${len}`);
    const num = isLE ? bytesToNumberBE(key) : bytesToNumberLE(key);
    // `mod(x, 11)` can sometimes produce 0. `mod(x, 10) + 1` is the same, but no 0
    const reduced = mod(num, fieldOrder - _1n$3) + _1n$3;
    return isLE ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Abelian group utilities
const _0n$1 = BigInt(0);
const _1n$2 = BigInt(1);
// Elliptic curve multiplication of Point by scalar. Fragile.
// Scalars should always be less than curve order: this should be checked inside of a curve itself.
// Creates precomputation tables for fast multiplication:
// - private scalar is split by fixed size windows of W bits
// - every window point is collected from window's table & added to accumulator
// - since windows are different, same point inside tables won't be accessed more than once per calc
// - each multiplication is 'Math.ceil(CURVE_ORDER / 𝑊) + 1' point additions (fixed for any scalar)
// - +1 window is neccessary for wNAF
// - wNAF reduces table size: 2x less memory + 2x faster generation, but 10% slower multiplication
// TODO: Research returning 2d JS array of windows, instead of a single window. This would allow
// windows to be in different memory locations
function wNAF(c, bits) {
    const constTimeNegate = (condition, item) => {
        const neg = item.negate();
        return condition ? neg : item;
    };
    const opts = (W) => {
        const windows = Math.ceil(bits / W) + 1; // +1, because
        const windowSize = 2 ** (W - 1); // -1 because we skip zero
        return { windows, windowSize };
    };
    return {
        constTimeNegate,
        // non-const time multiplication ladder
        unsafeLadder(elm, n) {
            let p = c.ZERO;
            let d = elm;
            while (n > _0n$1) {
                if (n & _1n$2)
                    p = p.add(d);
                d = d.double();
                n >>= _1n$2;
            }
            return p;
        },
        /**
         * Creates a wNAF precomputation window. Used for caching.
         * Default window size is set by `utils.precompute()` and is equal to 8.
         * Number of precomputed points depends on the curve size:
         * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
         * - 𝑊 is the window size
         * - 𝑛 is the bitlength of the curve order.
         * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
         * @returns precomputed point tables flattened to a single array
         */
        precomputeWindow(elm, W) {
            const { windows, windowSize } = opts(W);
            const points = [];
            let p = elm;
            let base = p;
            for (let window = 0; window < windows; window++) {
                base = p;
                points.push(base);
                // =1, because we skip zero
                for (let i = 1; i < windowSize; i++) {
                    base = base.add(p);
                    points.push(base);
                }
                p = base.double();
            }
            return points;
        },
        /**
         * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
         * @param W window size
         * @param precomputes precomputed tables
         * @param n scalar (we don't check here, but should be less than curve order)
         * @returns real and fake (for const-time) points
         */
        wNAF(W, precomputes, n) {
            // TODO: maybe check that scalar is less than group order? wNAF behavious is undefined otherwise
            // But need to carefully remove other checks before wNAF. ORDER == bits here
            const { windows, windowSize } = opts(W);
            let p = c.ZERO;
            let f = c.BASE;
            const mask = BigInt(2 ** W - 1); // Create mask with W ones: 0b1111 for W=4 etc.
            const maxNumber = 2 ** W;
            const shiftBy = BigInt(W);
            for (let window = 0; window < windows; window++) {
                const offset = window * windowSize;
                // Extract W bits.
                let wbits = Number(n & mask);
                // Shift number by W bits.
                n >>= shiftBy;
                // If the bits are bigger than max size, we'll split those.
                // +224 => 256 - 32
                if (wbits > windowSize) {
                    wbits -= maxNumber;
                    n += _1n$2;
                }
                // This code was first written with assumption that 'f' and 'p' will never be infinity point:
                // since each addition is multiplied by 2 ** W, it cannot cancel each other. However,
                // there is negate now: it is possible that negated element from low value
                // would be the same as high element, which will create carry into next window.
                // It's not obvious how this can fail, but still worth investigating later.
                // Check if we're onto Zero point.
                // Add random point inside current window to f.
                const offset1 = offset;
                const offset2 = offset + Math.abs(wbits) - 1; // -1 because we skip zero
                const cond1 = window % 2 !== 0;
                const cond2 = wbits < 0;
                if (wbits === 0) {
                    // The most important part for const-time getPublicKey
                    f = f.add(constTimeNegate(cond1, precomputes[offset1]));
                }
                else {
                    p = p.add(constTimeNegate(cond2, precomputes[offset2]));
                }
            }
            // JIT-compiler should not eliminate f here, since it will later be used in normalizeZ()
            // Even if the variable is still unused, there are some checks which will
            // throw an exception, so compiler needs to prove they won't happen, which is hard.
            // At this point there is a way to F be infinity-point even if p is not,
            // which makes it less const-time: around 1 bigint multiply.
            return { p, f };
        },
        wNAFCached(P, precomputesMap, n, transform) {
            // @ts-ignore
            const W = P._WINDOW_SIZE || 1;
            // Calculate precomputes on a first run, reuse them after
            let comp = precomputesMap.get(P);
            if (!comp) {
                comp = this.precomputeWindow(P, W);
                if (W !== 1) {
                    precomputesMap.set(P, transform(comp));
                }
            }
            return this.wNAF(W, comp, n);
        },
    };
}
function validateBasic(curve) {
    validateField(curve.Fp);
    validateObject(curve, {
        n: 'bigint',
        h: 'bigint',
        Gx: 'field',
        Gy: 'field',
    }, {
        nBitLength: 'isSafeInteger',
        nByteLength: 'isSafeInteger',
    });
    // Set defaults
    return Object.freeze({
        ...nLength(curve.n, curve.nBitLength),
        ...curve,
        ...{ p: curve.Fp.ORDER },
    });
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// Short Weierstrass curve. The formula is: y² = x³ + ax + b
function validatePointOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
        a: 'field',
        b: 'field',
    }, {
        allowedPrivateKeyLengths: 'array',
        wrapPrivateKey: 'boolean',
        isTorsionFree: 'function',
        clearCofactor: 'function',
        allowInfinityPoint: 'boolean',
        fromBytes: 'function',
        toBytes: 'function',
    });
    const { endo, Fp, a } = opts;
    if (endo) {
        if (!Fp.eql(a, Fp.ZERO)) {
            throw new Error('Endomorphism can only be defined for Koblitz curves that have a=0');
        }
        if (typeof endo !== 'object' ||
            typeof endo.beta !== 'bigint' ||
            typeof endo.splitScalar !== 'function') {
            throw new Error('Expected endomorphism with beta: bigint and splitScalar: function');
        }
    }
    return Object.freeze({ ...opts });
}
// ASN.1 DER encoding utilities
const { bytesToNumberBE: b2n, hexToBytes: h2b } = ut;
const DER = {
    // asn.1 DER encoding utils
    Err: class DERErr extends Error {
        constructor(m = '') {
            super(m);
        }
    },
    _parseInt(data) {
        const { Err: E } = DER;
        if (data.length < 2 || data[0] !== 0x02)
            throw new E('Invalid signature integer tag');
        const len = data[1];
        const res = data.subarray(2, len + 2);
        if (!len || res.length !== len)
            throw new E('Invalid signature integer: wrong length');
        // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
        // since we always use positive integers here. It must always be empty:
        // - add zero byte if exists
        // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
        if (res[0] & 0b10000000)
            throw new E('Invalid signature integer: negative');
        if (res[0] === 0x00 && !(res[1] & 0b10000000))
            throw new E('Invalid signature integer: unnecessary leading zero');
        return { d: b2n(res), l: data.subarray(len + 2) }; // d is data, l is left
    },
    toSig(hex) {
        // parse DER signature
        const { Err: E } = DER;
        const data = typeof hex === 'string' ? h2b(hex) : hex;
        if (!(data instanceof Uint8Array))
            throw new Error('ui8a expected');
        let l = data.length;
        if (l < 2 || data[0] != 0x30)
            throw new E('Invalid signature tag');
        if (data[1] !== l - 2)
            throw new E('Invalid signature: incorrect length');
        const { d: r, l: sBytes } = DER._parseInt(data.subarray(2));
        const { d: s, l: rBytesLeft } = DER._parseInt(sBytes);
        if (rBytesLeft.length)
            throw new E('Invalid signature: left bytes after parsing');
        return { r, s };
    },
    hexFromSig(sig) {
        // Add leading zero if first byte has negative bit enabled. More details in '_parseInt'
        const slice = (s) => (Number.parseInt(s[0], 16) & 0b1000 ? '00' + s : s);
        const h = (num) => {
            const hex = num.toString(16);
            return hex.length & 1 ? `0${hex}` : hex;
        };
        const s = slice(h(sig.s));
        const r = slice(h(sig.r));
        const shl = s.length / 2;
        const rhl = r.length / 2;
        const sl = h(shl);
        const rl = h(rhl);
        return `30${h(rhl + shl + 4)}02${rl}${r}02${sl}${s}`;
    },
};
// Be friendly to bad ECMAScript parsers by not using bigint literals
// prettier-ignore
const _0n = BigInt(0), _1n$1 = BigInt(1); BigInt(2); const _3n = BigInt(3); BigInt(4);
function weierstrassPoints(opts) {
    const CURVE = validatePointOpts(opts);
    const { Fp } = CURVE; // All curves has same field / group length as for now, but they can differ
    const toBytes = CURVE.toBytes ||
        ((_c, point, _isCompressed) => {
            const a = point.toAffine();
            return concatBytes(Uint8Array.from([0x04]), Fp.toBytes(a.x), Fp.toBytes(a.y));
        });
    const fromBytes = CURVE.fromBytes ||
        ((bytes) => {
            // const head = bytes[0];
            const tail = bytes.subarray(1);
            // if (head !== 0x04) throw new Error('Only non-compressed encoding is supported');
            const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
            const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
            return { x, y };
        });
    /**
     * y² = x³ + ax + b: Short weierstrass curve formula
     * @returns y²
     */
    function weierstrassEquation(x) {
        const { a, b } = CURVE;
        const x2 = Fp.sqr(x); // x * x
        const x3 = Fp.mul(x2, x); // x2 * x
        return Fp.add(Fp.add(x3, Fp.mul(x, a)), b); // x3 + a * x + b
    }
    // Validate whether the passed curve params are valid.
    // We check if curve equation works for generator point.
    // `assertValidity()` won't work: `isTorsionFree()` is not available at this point in bls12-381.
    // ProjectivePoint class has not been initialized yet.
    if (!Fp.eql(Fp.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
        throw new Error('bad generator point: equation left != right');
    // Valid group elements reside in range 1..n-1
    function isWithinCurveOrder(num) {
        return typeof num === 'bigint' && _0n < num && num < CURVE.n;
    }
    function assertGE(num) {
        if (!isWithinCurveOrder(num))
            throw new Error('Expected valid bigint: 0 < bigint < curve.n');
    }
    // Validates if priv key is valid and converts it to bigint.
    // Supports options allowedPrivateKeyLengths and wrapPrivateKey.
    function normPrivateKeyToScalar(key) {
        const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n } = CURVE;
        if (lengths && typeof key !== 'bigint') {
            if (key instanceof Uint8Array)
                key = bytesToHex(key);
            // Normalize to hex string, pad. E.g. P521 would norm 130-132 char hex to 132-char bytes
            if (typeof key !== 'string' || !lengths.includes(key.length))
                throw new Error('Invalid key');
            key = key.padStart(nByteLength * 2, '0');
        }
        let num;
        try {
            num =
                typeof key === 'bigint'
                    ? key
                    : bytesToNumberBE(ensureBytes('private key', key, nByteLength));
        }
        catch (error) {
            throw new Error(`private key must be ${nByteLength} bytes, hex or bigint, not ${typeof key}`);
        }
        if (wrapPrivateKey)
            num = mod(num, n); // disabled by default, enabled for BLS
        assertGE(num); // num in range [1..N-1]
        return num;
    }
    const pointPrecomputes = new Map();
    function assertPrjPoint(other) {
        if (!(other instanceof Point))
            throw new Error('ProjectivePoint expected');
    }
    /**
     * Projective Point works in 3d / projective (homogeneous) coordinates: (x, y, z) ∋ (x=x/z, y=y/z)
     * Default Point works in 2d / affine coordinates: (x, y)
     * We're doing calculations in projective, because its operations don't require costly inversion.
     */
    class Point {
        constructor(px, py, pz) {
            this.px = px;
            this.py = py;
            this.pz = pz;
            if (px == null || !Fp.isValid(px))
                throw new Error('x required');
            if (py == null || !Fp.isValid(py))
                throw new Error('y required');
            if (pz == null || !Fp.isValid(pz))
                throw new Error('z required');
        }
        // Does not validate if the point is on-curve.
        // Use fromHex instead, or call assertValidity() later.
        static fromAffine(p) {
            const { x, y } = p || {};
            if (!p || !Fp.isValid(x) || !Fp.isValid(y))
                throw new Error('invalid affine point');
            if (p instanceof Point)
                throw new Error('projective point not allowed');
            const is0 = (i) => Fp.eql(i, Fp.ZERO);
            // fromAffine(x:0, y:0) would produce (x:0, y:0, z:1), but we need (x:0, y:1, z:0)
            if (is0(x) && is0(y))
                return Point.ZERO;
            return new Point(x, y, Fp.ONE);
        }
        get x() {
            return this.toAffine().x;
        }
        get y() {
            return this.toAffine().y;
        }
        /**
         * Takes a bunch of Projective Points but executes only one
         * inversion on all of them. Inversion is very slow operation,
         * so this improves performance massively.
         * Optimization: converts a list of projective points to a list of identical points with Z=1.
         */
        static normalizeZ(points) {
            const toInv = Fp.invertBatch(points.map((p) => p.pz));
            return points.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
        }
        /**
         * Converts hash string or Uint8Array to Point.
         * @param hex short/long ECDSA hex
         */
        static fromHex(hex) {
            const P = Point.fromAffine(fromBytes(ensureBytes('pointHex', hex)));
            P.assertValidity();
            return P;
        }
        // Multiplies generator point by privateKey.
        static fromPrivateKey(privateKey) {
            return Point.BASE.multiply(normPrivateKeyToScalar(privateKey));
        }
        // "Private method", don't use it directly
        _setWindowSize(windowSize) {
            this._WINDOW_SIZE = windowSize;
            pointPrecomputes.delete(this);
        }
        // A point on curve is valid if it conforms to equation.
        assertValidity() {
            if (this.is0()) {
                // (0, 1, 0) aka ZERO is invalid in most contexts.
                // In BLS, ZERO can be serialized, so we allow it.
                // (0, 0, 0) is wrong representation of ZERO and is always invalid.
                if (CURVE.allowInfinityPoint && !Fp.is0(this.py))
                    return;
                throw new Error('bad point: ZERO');
            }
            // Some 3rd-party test vectors require different wording between here & `fromCompressedHex`
            const { x, y } = this.toAffine();
            // Check if x, y are valid field elements
            if (!Fp.isValid(x) || !Fp.isValid(y))
                throw new Error('bad point: x or y not FE');
            const left = Fp.sqr(y); // y²
            const right = weierstrassEquation(x); // x³ + ax + b
            if (!Fp.eql(left, right))
                throw new Error('bad point: equation left != right');
            if (!this.isTorsionFree())
                throw new Error('bad point: not in prime-order subgroup');
        }
        hasEvenY() {
            const { y } = this.toAffine();
            if (Fp.isOdd)
                return !Fp.isOdd(y);
            throw new Error("Field doesn't support isOdd");
        }
        /**
         * Compare one point to another.
         */
        equals(other) {
            assertPrjPoint(other);
            const { px: X1, py: Y1, pz: Z1 } = this;
            const { px: X2, py: Y2, pz: Z2 } = other;
            const U1 = Fp.eql(Fp.mul(X1, Z2), Fp.mul(X2, Z1));
            const U2 = Fp.eql(Fp.mul(Y1, Z2), Fp.mul(Y2, Z1));
            return U1 && U2;
        }
        /**
         * Flips point to one corresponding to (x, -y) in Affine coordinates.
         */
        negate() {
            return new Point(this.px, Fp.neg(this.py), this.pz);
        }
        // Renes-Costello-Batina exception-free doubling formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 3
        // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
        double() {
            const { a, b } = CURVE;
            const b3 = Fp.mul(b, _3n);
            const { px: X1, py: Y1, pz: Z1 } = this;
            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
            let t0 = Fp.mul(X1, X1); // step 1
            let t1 = Fp.mul(Y1, Y1);
            let t2 = Fp.mul(Z1, Z1);
            let t3 = Fp.mul(X1, Y1);
            t3 = Fp.add(t3, t3); // step 5
            Z3 = Fp.mul(X1, Z1);
            Z3 = Fp.add(Z3, Z3);
            X3 = Fp.mul(a, Z3);
            Y3 = Fp.mul(b3, t2);
            Y3 = Fp.add(X3, Y3); // step 10
            X3 = Fp.sub(t1, Y3);
            Y3 = Fp.add(t1, Y3);
            Y3 = Fp.mul(X3, Y3);
            X3 = Fp.mul(t3, X3);
            Z3 = Fp.mul(b3, Z3); // step 15
            t2 = Fp.mul(a, t2);
            t3 = Fp.sub(t0, t2);
            t3 = Fp.mul(a, t3);
            t3 = Fp.add(t3, Z3);
            Z3 = Fp.add(t0, t0); // step 20
            t0 = Fp.add(Z3, t0);
            t0 = Fp.add(t0, t2);
            t0 = Fp.mul(t0, t3);
            Y3 = Fp.add(Y3, t0);
            t2 = Fp.mul(Y1, Z1); // step 25
            t2 = Fp.add(t2, t2);
            t0 = Fp.mul(t2, t3);
            X3 = Fp.sub(X3, t0);
            Z3 = Fp.mul(t2, t1);
            Z3 = Fp.add(Z3, Z3); // step 30
            Z3 = Fp.add(Z3, Z3);
            return new Point(X3, Y3, Z3);
        }
        // Renes-Costello-Batina exception-free addition formula.
        // There is 30% faster Jacobian formula, but it is not complete.
        // https://eprint.iacr.org/2015/1060, algorithm 1
        // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
        add(other) {
            assertPrjPoint(other);
            const { px: X1, py: Y1, pz: Z1 } = this;
            const { px: X2, py: Y2, pz: Z2 } = other;
            let X3 = Fp.ZERO, Y3 = Fp.ZERO, Z3 = Fp.ZERO; // prettier-ignore
            const a = CURVE.a;
            const b3 = Fp.mul(CURVE.b, _3n);
            let t0 = Fp.mul(X1, X2); // step 1
            let t1 = Fp.mul(Y1, Y2);
            let t2 = Fp.mul(Z1, Z2);
            let t3 = Fp.add(X1, Y1);
            let t4 = Fp.add(X2, Y2); // step 5
            t3 = Fp.mul(t3, t4);
            t4 = Fp.add(t0, t1);
            t3 = Fp.sub(t3, t4);
            t4 = Fp.add(X1, Z1);
            let t5 = Fp.add(X2, Z2); // step 10
            t4 = Fp.mul(t4, t5);
            t5 = Fp.add(t0, t2);
            t4 = Fp.sub(t4, t5);
            t5 = Fp.add(Y1, Z1);
            X3 = Fp.add(Y2, Z2); // step 15
            t5 = Fp.mul(t5, X3);
            X3 = Fp.add(t1, t2);
            t5 = Fp.sub(t5, X3);
            Z3 = Fp.mul(a, t4);
            X3 = Fp.mul(b3, t2); // step 20
            Z3 = Fp.add(X3, Z3);
            X3 = Fp.sub(t1, Z3);
            Z3 = Fp.add(t1, Z3);
            Y3 = Fp.mul(X3, Z3);
            t1 = Fp.add(t0, t0); // step 25
            t1 = Fp.add(t1, t0);
            t2 = Fp.mul(a, t2);
            t4 = Fp.mul(b3, t4);
            t1 = Fp.add(t1, t2);
            t2 = Fp.sub(t0, t2); // step 30
            t2 = Fp.mul(a, t2);
            t4 = Fp.add(t4, t2);
            t0 = Fp.mul(t1, t4);
            Y3 = Fp.add(Y3, t0);
            t0 = Fp.mul(t5, t4); // step 35
            X3 = Fp.mul(t3, X3);
            X3 = Fp.sub(X3, t0);
            t0 = Fp.mul(t3, t1);
            Z3 = Fp.mul(t5, Z3);
            Z3 = Fp.add(Z3, t0); // step 40
            return new Point(X3, Y3, Z3);
        }
        subtract(other) {
            return this.add(other.negate());
        }
        is0() {
            return this.equals(Point.ZERO);
        }
        wNAF(n) {
            return wnaf.wNAFCached(this, pointPrecomputes, n, (comp) => {
                const toInv = Fp.invertBatch(comp.map((p) => p.pz));
                return comp.map((p, i) => p.toAffine(toInv[i])).map(Point.fromAffine);
            });
        }
        /**
         * Non-constant-time multiplication. Uses double-and-add algorithm.
         * It's faster, but should only be used when you don't care about
         * an exposed private key e.g. sig verification, which works over *public* keys.
         */
        multiplyUnsafe(n) {
            const I = Point.ZERO;
            if (n === _0n)
                return I;
            assertGE(n); // Will throw on 0
            if (n === _1n$1)
                return this;
            const { endo } = CURVE;
            if (!endo)
                return wnaf.unsafeLadder(this, n);
            // Apply endomorphism
            let { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
            let k1p = I;
            let k2p = I;
            let d = this;
            while (k1 > _0n || k2 > _0n) {
                if (k1 & _1n$1)
                    k1p = k1p.add(d);
                if (k2 & _1n$1)
                    k2p = k2p.add(d);
                d = d.double();
                k1 >>= _1n$1;
                k2 >>= _1n$1;
            }
            if (k1neg)
                k1p = k1p.negate();
            if (k2neg)
                k2p = k2p.negate();
            k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
            return k1p.add(k2p);
        }
        /**
         * Constant time multiplication.
         * Uses wNAF method. Windowed method may be 10% faster,
         * but takes 2x longer to generate and consumes 2x memory.
         * Uses precomputes when available.
         * Uses endomorphism for Koblitz curves.
         * @param scalar by which the point would be multiplied
         * @returns New point
         */
        multiply(scalar) {
            assertGE(scalar);
            let n = scalar;
            let point, fake; // Fake point is used to const-time mult
            const { endo } = CURVE;
            if (endo) {
                const { k1neg, k1, k2neg, k2 } = endo.splitScalar(n);
                let { p: k1p, f: f1p } = this.wNAF(k1);
                let { p: k2p, f: f2p } = this.wNAF(k2);
                k1p = wnaf.constTimeNegate(k1neg, k1p);
                k2p = wnaf.constTimeNegate(k2neg, k2p);
                k2p = new Point(Fp.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
                point = k1p.add(k2p);
                fake = f1p.add(f2p);
            }
            else {
                const { p, f } = this.wNAF(n);
                point = p;
                fake = f;
            }
            // Normalize `z` for both points, but return only real one
            return Point.normalizeZ([point, fake])[0];
        }
        /**
         * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
         * Not using Strauss-Shamir trick: precomputation tables are faster.
         * The trick could be useful if both P and Q are not G (not in our case).
         * @returns non-zero affine point
         */
        multiplyAndAddUnsafe(Q, a, b) {
            const G = Point.BASE; // No Strauss-Shamir trick: we have 10% faster G precomputes
            const mul = (P, a // Select faster multiply() method
            ) => (a === _0n || a === _1n$1 || !P.equals(G) ? P.multiplyUnsafe(a) : P.multiply(a));
            const sum = mul(this, a).add(mul(Q, b));
            return sum.is0() ? undefined : sum;
        }
        // Converts Projective point to affine (x, y) coordinates.
        // Can accept precomputed Z^-1 - for example, from invertBatch.
        // (x, y, z) ∋ (x=x/z, y=y/z)
        toAffine(iz) {
            const { px: x, py: y, pz: z } = this;
            const is0 = this.is0();
            // If invZ was 0, we return zero point. However we still want to execute
            // all operations, so we replace invZ with a random number, 1.
            if (iz == null)
                iz = is0 ? Fp.ONE : Fp.inv(z);
            const ax = Fp.mul(x, iz);
            const ay = Fp.mul(y, iz);
            const zz = Fp.mul(z, iz);
            if (is0)
                return { x: Fp.ZERO, y: Fp.ZERO };
            if (!Fp.eql(zz, Fp.ONE))
                throw new Error('invZ was invalid');
            return { x: ax, y: ay };
        }
        isTorsionFree() {
            const { h: cofactor, isTorsionFree } = CURVE;
            if (cofactor === _1n$1)
                return true; // No subgroups, always torsion-free
            if (isTorsionFree)
                return isTorsionFree(Point, this);
            throw new Error('isTorsionFree() has not been declared for the elliptic curve');
        }
        clearCofactor() {
            const { h: cofactor, clearCofactor } = CURVE;
            if (cofactor === _1n$1)
                return this; // Fast-path
            if (clearCofactor)
                return clearCofactor(Point, this);
            return this.multiplyUnsafe(CURVE.h);
        }
        toRawBytes(isCompressed = true) {
            this.assertValidity();
            return toBytes(Point, this, isCompressed);
        }
        toHex(isCompressed = true) {
            return bytesToHex(this.toRawBytes(isCompressed));
        }
    }
    Point.BASE = new Point(CURVE.Gx, CURVE.Gy, Fp.ONE);
    Point.ZERO = new Point(Fp.ZERO, Fp.ONE, Fp.ZERO);
    const _bits = CURVE.nBitLength;
    const wnaf = wNAF(Point, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
    // Validate if generator point is on curve
    return {
        CURVE,
        ProjectivePoint: Point,
        normPrivateKeyToScalar,
        weierstrassEquation,
        isWithinCurveOrder,
    };
}
function validateOpts(curve) {
    const opts = validateBasic(curve);
    validateObject(opts, {
        hash: 'hash',
        hmac: 'function',
        randomBytes: 'function',
    }, {
        bits2int: 'function',
        bits2int_modN: 'function',
        lowS: 'boolean',
    });
    return Object.freeze({ lowS: true, ...opts });
}
function weierstrass(curveDef) {
    const CURVE = validateOpts(curveDef);
    const { Fp, n: CURVE_ORDER } = CURVE;
    const compressedLen = Fp.BYTES + 1; // e.g. 33 for 32
    const uncompressedLen = 2 * Fp.BYTES + 1; // e.g. 65 for 32
    function isValidFieldElement(num) {
        return _0n < num && num < Fp.ORDER; // 0 is banned since it's not invertible FE
    }
    function modN(a) {
        return mod(a, CURVE_ORDER);
    }
    function invN(a) {
        return invert(a, CURVE_ORDER);
    }
    const { ProjectivePoint: Point, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder, } = weierstrassPoints({
        ...CURVE,
        toBytes(_c, point, isCompressed) {
            const a = point.toAffine();
            const x = Fp.toBytes(a.x);
            const cat = concatBytes;
            if (isCompressed) {
                return cat(Uint8Array.from([point.hasEvenY() ? 0x02 : 0x03]), x);
            }
            else {
                return cat(Uint8Array.from([0x04]), x, Fp.toBytes(a.y));
            }
        },
        fromBytes(bytes) {
            const len = bytes.length;
            const head = bytes[0];
            const tail = bytes.subarray(1);
            // this.assertValidity() is done inside of fromHex
            if (len === compressedLen && (head === 0x02 || head === 0x03)) {
                const x = bytesToNumberBE(tail);
                if (!isValidFieldElement(x))
                    throw new Error('Point is not on curve');
                const y2 = weierstrassEquation(x); // y² = x³ + ax + b
                let y = Fp.sqrt(y2); // y = y² ^ (p+1)/4
                const isYOdd = (y & _1n$1) === _1n$1;
                // ECDSA
                const isHeadOdd = (head & 1) === 1;
                if (isHeadOdd !== isYOdd)
                    y = Fp.neg(y);
                return { x, y };
            }
            else if (len === uncompressedLen && head === 0x04) {
                const x = Fp.fromBytes(tail.subarray(0, Fp.BYTES));
                const y = Fp.fromBytes(tail.subarray(Fp.BYTES, 2 * Fp.BYTES));
                return { x, y };
            }
            else {
                throw new Error(`Point of length ${len} was invalid. Expected ${compressedLen} compressed bytes or ${uncompressedLen} uncompressed bytes`);
            }
        },
    });
    const numToNByteStr = (num) => bytesToHex(numberToBytesBE(num, CURVE.nByteLength));
    function isBiggerThanHalfOrder(number) {
        const HALF = CURVE_ORDER >> _1n$1;
        return number > HALF;
    }
    function normalizeS(s) {
        return isBiggerThanHalfOrder(s) ? modN(-s) : s;
    }
    // slice bytes num
    const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
    /**
     * ECDSA signature with its (r, s) properties. Supports DER & compact representations.
     */
    class Signature {
        constructor(r, s, recovery) {
            this.r = r;
            this.s = s;
            this.recovery = recovery;
            this.assertValidity();
        }
        // pair (bytes of r, bytes of s)
        static fromCompact(hex) {
            const l = CURVE.nByteLength;
            hex = ensureBytes('compactSignature', hex, l * 2);
            return new Signature(slcNum(hex, 0, l), slcNum(hex, l, 2 * l));
        }
        // DER encoded ECDSA signature
        // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
        static fromDER(hex) {
            const { r, s } = DER.toSig(ensureBytes('DER', hex));
            return new Signature(r, s);
        }
        assertValidity() {
            // can use assertGE here
            if (!isWithinCurveOrder(this.r))
                throw new Error('r must be 0 < r < CURVE.n');
            if (!isWithinCurveOrder(this.s))
                throw new Error('s must be 0 < s < CURVE.n');
        }
        addRecoveryBit(recovery) {
            return new Signature(this.r, this.s, recovery);
        }
        recoverPublicKey(msgHash) {
            const { r, s, recovery: rec } = this;
            const h = bits2int_modN(ensureBytes('msgHash', msgHash)); // Truncate hash
            if (rec == null || ![0, 1, 2, 3].includes(rec))
                throw new Error('recovery id invalid');
            const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
            if (radj >= Fp.ORDER)
                throw new Error('recovery id 2 or 3 invalid');
            const prefix = (rec & 1) === 0 ? '02' : '03';
            const R = Point.fromHex(prefix + numToNByteStr(radj));
            const ir = invN(radj); // r^-1
            const u1 = modN(-h * ir); // -hr^-1
            const u2 = modN(s * ir); // sr^-1
            const Q = Point.BASE.multiplyAndAddUnsafe(R, u1, u2); // (sr^-1)R-(hr^-1)G = -(hr^-1)G + (sr^-1)
            if (!Q)
                throw new Error('point at infinify'); // unsafe is fine: no priv data leaked
            Q.assertValidity();
            return Q;
        }
        // Signatures should be low-s, to prevent malleability.
        hasHighS() {
            return isBiggerThanHalfOrder(this.s);
        }
        normalizeS() {
            return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
        }
        // DER-encoded
        toDERRawBytes() {
            return hexToBytes(this.toDERHex());
        }
        toDERHex() {
            return DER.hexFromSig({ r: this.r, s: this.s });
        }
        // padded bytes of r, then padded bytes of s
        toCompactRawBytes() {
            return hexToBytes(this.toCompactHex());
        }
        toCompactHex() {
            return numToNByteStr(this.r) + numToNByteStr(this.s);
        }
    }
    const utils = {
        isValidPrivateKey(privateKey) {
            try {
                normPrivateKeyToScalar(privateKey);
                return true;
            }
            catch (error) {
                return false;
            }
        },
        normPrivateKeyToScalar: normPrivateKeyToScalar,
        /**
         * Produces cryptographically secure private key from random of size
         * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
         */
        randomPrivateKey: () => {
            const length = getMinHashLength(CURVE.n);
            return mapHashToField(CURVE.randomBytes(length), CURVE.n);
        },
        /**
         * Creates precompute table for an arbitrary EC point. Makes point "cached".
         * Allows to massively speed-up `point.multiply(scalar)`.
         * @returns cached point
         * @example
         * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
         * fast.multiply(privKey); // much faster ECDH now
         */
        precompute(windowSize = 8, point = Point.BASE) {
            point._setWindowSize(windowSize);
            point.multiply(BigInt(3)); // 3 is arbitrary, just need any number here
            return point;
        },
    };
    /**
     * Computes public key for a private key. Checks for validity of the private key.
     * @param privateKey private key
     * @param isCompressed whether to return compact (default), or full key
     * @returns Public key, full when isCompressed=false; short when isCompressed=true
     */
    function getPublicKey(privateKey, isCompressed = true) {
        return Point.fromPrivateKey(privateKey).toRawBytes(isCompressed);
    }
    /**
     * Quick and dirty check for item being public key. Does not validate hex, or being on-curve.
     */
    function isProbPub(item) {
        const arr = item instanceof Uint8Array;
        const str = typeof item === 'string';
        const len = (arr || str) && item.length;
        if (arr)
            return len === compressedLen || len === uncompressedLen;
        if (str)
            return len === 2 * compressedLen || len === 2 * uncompressedLen;
        if (item instanceof Point)
            return true;
        return false;
    }
    /**
     * ECDH (Elliptic Curve Diffie Hellman).
     * Computes shared public key from private key and public key.
     * Checks: 1) private key validity 2) shared key is on-curve.
     * Does NOT hash the result.
     * @param privateA private key
     * @param publicB different public key
     * @param isCompressed whether to return compact (default), or full key
     * @returns shared public key
     */
    function getSharedSecret(privateA, publicB, isCompressed = true) {
        if (isProbPub(privateA))
            throw new Error('first arg must be private key');
        if (!isProbPub(publicB))
            throw new Error('second arg must be public key');
        const b = Point.fromHex(publicB); // check for being on-curve
        return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
    }
    // RFC6979: ensure ECDSA msg is X bytes and < N. RFC suggests optional truncating via bits2octets.
    // FIPS 186-4 4.6 suggests the leftmost min(nBitLen, outLen) bits, which matches bits2int.
    // bits2int can produce res>N, we can do mod(res, N) since the bitLen is the same.
    // int2octets can't be used; pads small msgs with 0: unacceptatble for trunc as per RFC vectors
    const bits2int = CURVE.bits2int ||
        function (bytes) {
            // For curves with nBitLength % 8 !== 0: bits2octets(bits2octets(m)) !== bits2octets(m)
            // for some cases, since bytes.length * 8 is not actual bitLength.
            const num = bytesToNumberBE(bytes); // check for == u8 done here
            const delta = bytes.length * 8 - CURVE.nBitLength; // truncate to nBitLength leftmost bits
            return delta > 0 ? num >> BigInt(delta) : num;
        };
    const bits2int_modN = CURVE.bits2int_modN ||
        function (bytes) {
            return modN(bits2int(bytes)); // can't use bytesToNumberBE here
        };
    // NOTE: pads output with zero as per spec
    const ORDER_MASK = bitMask(CURVE.nBitLength);
    /**
     * Converts to bytes. Checks if num in `[0..ORDER_MASK-1]` e.g.: `[0..2^256-1]`.
     */
    function int2octets(num) {
        if (typeof num !== 'bigint')
            throw new Error('bigint expected');
        if (!(_0n <= num && num < ORDER_MASK))
            throw new Error(`bigint expected < 2^${CURVE.nBitLength}`);
        // works with order, can have different size than numToField!
        return numberToBytesBE(num, CURVE.nByteLength);
    }
    // Steps A, D of RFC6979 3.2
    // Creates RFC6979 seed; converts msg/privKey to numbers.
    // Used only in sign, not in verify.
    // NOTE: we cannot assume here that msgHash has same amount of bytes as curve order, this will be wrong at least for P521.
    // Also it can be bigger for P224 + SHA256
    function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
        if (['recovered', 'canonical'].some((k) => k in opts))
            throw new Error('sign() legacy options not supported');
        const { hash, randomBytes } = CURVE;
        let { lowS, prehash, extraEntropy: ent } = opts; // generates low-s sigs by default
        if (lowS == null)
            lowS = true; // RFC6979 3.2: we skip step A, because we already provide hash
        msgHash = ensureBytes('msgHash', msgHash);
        if (prehash)
            msgHash = ensureBytes('prehashed msgHash', hash(msgHash));
        // We can't later call bits2octets, since nested bits2int is broken for curves
        // with nBitLength % 8 !== 0. Because of that, we unwrap it here as int2octets call.
        // const bits2octets = (bits) => int2octets(bits2int_modN(bits))
        const h1int = bits2int_modN(msgHash);
        const d = normPrivateKeyToScalar(privateKey); // validate private key, convert to bigint
        const seedArgs = [int2octets(d), int2octets(h1int)];
        // extraEntropy. RFC6979 3.6: additional k' (optional).
        if (ent != null) {
            // K = HMAC_K(V || 0x00 || int2octets(x) || bits2octets(h1) || k')
            const e = ent === true ? randomBytes(Fp.BYTES) : ent; // generate random bytes OR pass as-is
            seedArgs.push(ensureBytes('extraEntropy', e)); // check for being bytes
        }
        const seed = concatBytes(...seedArgs); // Step D of RFC6979 3.2
        const m = h1int; // NOTE: no need to call bits2int second time here, it is inside truncateHash!
        // Converts signature params into point w r/s, checks result for validity.
        function k2sig(kBytes) {
            // RFC 6979 Section 3.2, step 3: k = bits2int(T)
            const k = bits2int(kBytes); // Cannot use fields methods, since it is group element
            if (!isWithinCurveOrder(k))
                return; // Important: all mod() calls here must be done over N
            const ik = invN(k); // k^-1 mod n
            const q = Point.BASE.multiply(k).toAffine(); // q = Gk
            const r = modN(q.x); // r = q.x mod n
            if (r === _0n)
                return;
            // Can use scalar blinding b^-1(bm + bdr) where b ∈ [1,q−1] according to
            // https://tches.iacr.org/index.php/TCHES/article/view/7337/6509. We've decided against it:
            // a) dependency on CSPRNG b) 15% slowdown c) doesn't really help since bigints are not CT
            const s = modN(ik * modN(m + r * d)); // Not using blinding here
            if (s === _0n)
                return;
            let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n$1); // recovery bit (2 or 3, when q.x > n)
            let normS = s;
            if (lowS && isBiggerThanHalfOrder(s)) {
                normS = normalizeS(s); // if lowS was passed, ensure s is always
                recovery ^= 1; // // in the bottom half of N
            }
            return new Signature(r, normS, recovery); // use normS, not s
        }
        return { seed, k2sig };
    }
    const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
    const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
    /**
     * Signs message hash with a private key.
     * ```
     * sign(m, d, k) where
     *   (x, y) = G × k
     *   r = x mod n
     *   s = (m + dr)/k mod n
     * ```
     * @param msgHash NOT message. msg needs to be hashed to `msgHash`, or use `prehash`.
     * @param privKey private key
     * @param opts lowS for non-malleable sigs. extraEntropy for mixing randomness into k. prehash will hash first arg.
     * @returns signature with recovery param
     */
    function sign(msgHash, privKey, opts = defaultSigOpts) {
        const { seed, k2sig } = prepSig(msgHash, privKey, opts); // Steps A, D of RFC6979 3.2.
        const C = CURVE;
        const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
        return drbg(seed, k2sig); // Steps B, C, D, E, F, G
    }
    // Enable precomputes. Slows down first publicKey computation by 20ms.
    Point.BASE._setWindowSize(8);
    // utils.precompute(8, ProjectivePoint.BASE)
    /**
     * Verifies a signature against message hash and public key.
     * Rejects lowS signatures by default: to override,
     * specify option `{lowS: false}`. Implements section 4.1.4 from https://www.secg.org/sec1-v2.pdf:
     *
     * ```
     * verify(r, s, h, P) where
     *   U1 = hs^-1 mod n
     *   U2 = rs^-1 mod n
     *   R = U1⋅G - U2⋅P
     *   mod(R.x, n) == r
     * ```
     */
    function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
        const sg = signature;
        msgHash = ensureBytes('msgHash', msgHash);
        publicKey = ensureBytes('publicKey', publicKey);
        if ('strict' in opts)
            throw new Error('options.strict was renamed to lowS');
        const { lowS, prehash } = opts;
        let _sig = undefined;
        let P;
        try {
            if (typeof sg === 'string' || sg instanceof Uint8Array) {
                // Signature can be represented in 2 ways: compact (2*nByteLength) & DER (variable-length).
                // Since DER can also be 2*nByteLength bytes, we check for it first.
                try {
                    _sig = Signature.fromDER(sg);
                }
                catch (derError) {
                    if (!(derError instanceof DER.Err))
                        throw derError;
                    _sig = Signature.fromCompact(sg);
                }
            }
            else if (typeof sg === 'object' && typeof sg.r === 'bigint' && typeof sg.s === 'bigint') {
                const { r, s } = sg;
                _sig = new Signature(r, s);
            }
            else {
                throw new Error('PARSE');
            }
            P = Point.fromHex(publicKey);
        }
        catch (error) {
            if (error.message === 'PARSE')
                throw new Error(`signature must be Signature instance, Uint8Array or hex string`);
            return false;
        }
        if (lowS && _sig.hasHighS())
            return false;
        if (prehash)
            msgHash = CURVE.hash(msgHash);
        const { r, s } = _sig;
        const h = bits2int_modN(msgHash); // Cannot use fields methods, since it is group element
        const is = invN(s); // s^-1
        const u1 = modN(h * is); // u1 = hs^-1 mod n
        const u2 = modN(r * is); // u2 = rs^-1 mod n
        const R = Point.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine(); // R = u1⋅G + u2⋅P
        if (!R)
            return false;
        const v = modN(R.x);
        return v === r;
    }
    return {
        CURVE,
        getPublicKey,
        getSharedSecret,
        sign,
        verify,
        ProjectivePoint: Point,
        Signature,
        utils,
    };
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
// connects noble-curves to noble-hashes
function getHash(hash) {
    return {
        hash,
        hmac: (key, ...msgs) => hmac(hash, key, concatBytes$1(...msgs)),
        randomBytes,
    };
}
function createCurve(curveDef, defHash) {
    const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
    return Object.freeze({ ...create(defHash), create });
}

/*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) */
const secp256k1P = BigInt('0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f');
const secp256k1N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const _1n = BigInt(1);
const _2n = BigInt(2);
const divNearest = (a, b) => (a + b / _2n) / b;
/**
 * √n = n^((p+1)/4) for fields p = 3 mod 4. We unwrap the loop and multiply bit-by-bit.
 * (P+1n/4n).toString(2) would produce bits [223x 1, 0, 22x 1, 4x 0, 11, 00]
 */
function sqrtMod(y) {
    const P = secp256k1P;
    // prettier-ignore
    const _3n = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
    // prettier-ignore
    const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
    const b2 = (y * y * y) % P; // x^3, 11
    const b3 = (b2 * b2 * y) % P; // x^7
    const b6 = (pow2(b3, _3n, P) * b3) % P;
    const b9 = (pow2(b6, _3n, P) * b3) % P;
    const b11 = (pow2(b9, _2n, P) * b2) % P;
    const b22 = (pow2(b11, _11n, P) * b11) % P;
    const b44 = (pow2(b22, _22n, P) * b22) % P;
    const b88 = (pow2(b44, _44n, P) * b44) % P;
    const b176 = (pow2(b88, _88n, P) * b88) % P;
    const b220 = (pow2(b176, _44n, P) * b44) % P;
    const b223 = (pow2(b220, _3n, P) * b3) % P;
    const t1 = (pow2(b223, _23n, P) * b22) % P;
    const t2 = (pow2(t1, _6n, P) * b2) % P;
    const root = pow2(t2, _2n, P);
    if (!Fp.eql(Fp.sqr(root), y))
        throw new Error('Cannot find square root');
    return root;
}
const Fp = Field(secp256k1P, undefined, undefined, { sqrt: sqrtMod });
const secp256k1 = createCurve({
    a: BigInt(0),
    b: BigInt(7),
    Fp,
    n: secp256k1N,
    // Base point (x, y) aka generator point
    Gx: BigInt('55066263022277343669578718895168534326250603453777594175500187360389116729240'),
    Gy: BigInt('32670510020758816978083085130507043184471273380659243275938904335757337482424'),
    h: BigInt(1),
    lowS: true,
    /**
     * secp256k1 belongs to Koblitz curves: it has efficiently computable endomorphism.
     * Endomorphism uses 2x less RAM, speeds up precomputation by 2x and ECDH / key recovery by 20%.
     * For precomputed wNAF it trades off 1/2 init time & 1/3 ram for 20% perf hit.
     * Explanation: https://gist.github.com/paulmillr/eb670806793e84df628a7c434a873066
     */
    endo: {
        beta: BigInt('0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee'),
        splitScalar: (k) => {
            const n = secp256k1N;
            const a1 = BigInt('0x3086d221a7d46bcde86c90e49284eb15');
            const b1 = -_1n * BigInt('0xe4437ed6010e88286f547fa90abfe4c3');
            const a2 = BigInt('0x114ca50f7a8e2f3f657c1108d9d44cfd8');
            const b2 = a1;
            const POW_2_128 = BigInt('0x100000000000000000000000000000000'); // (2n**128n).toString(16)
            const c1 = divNearest(b2 * k, n);
            const c2 = divNearest(-b1 * k, n);
            let k1 = mod(k - c1 * a1 - c2 * a2, n);
            let k2 = mod(-c1 * b1 - c2 * b2, n);
            const k1neg = k1 > POW_2_128;
            const k2neg = k2 > POW_2_128;
            if (k1neg)
                k1 = n - k1;
            if (k2neg)
                k2 = n - k2;
            if (k1 > POW_2_128 || k2 > POW_2_128) {
                throw new Error('splitScalar: Endomorphism failed, k=' + k);
            }
            return { k1neg, k1, k2neg, k2 };
        },
    },
}, sha256$1);
// Schnorr signatures are superior to ECDSA from above. Below is Schnorr-specific BIP0340 code.
// https://github.com/bitcoin/bips/blob/master/bip-0340.mediawiki
BigInt(0);
secp256k1.ProjectivePoint;

/**
 *  A constant for the zero address.
 *
 *  (**i.e.** ``"0x0000000000000000000000000000000000000000"``)
 */
const ZeroAddress = "0x0000000000000000000000000000000000000000";

/**
 *  A constant for the zero hash.
 *
 *  (**i.e.** ``"0x0000000000000000000000000000000000000000000000000000000000000000"``)
 */
const ZeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";

// Constants
const BN_0$7 = BigInt(0);
const BN_1$2 = BigInt(1);
const BN_2$2 = BigInt(2);
const BN_27$1 = BigInt(27);
const BN_28$1 = BigInt(28);
const BN_35$1 = BigInt(35);
const _guard$1 = {};
function toUint256(value) {
    return zeroPadValue(toBeArray(value), 32);
}
/**
 *  A Signature  @TODO
 *
 *
 *  @_docloc: api/crypto:Signing
 */
class Signature {
    #r;
    #s;
    #v;
    #networkV;
    /**
     *  The ``r`` value for a signautre.
     *
     *  This represents the ``x`` coordinate of a "reference" or
     *  challenge point, from which the ``y`` can be computed.
     */
    get r() { return this.#r; }
    set r(value) {
        assertArgument(dataLength(value) === 32, "invalid r", "value", value);
        this.#r = hexlify(value);
    }
    /**
     *  The ``s`` value for a signature.
     */
    get s() { return this.#s; }
    set s(_value) {
        assertArgument(dataLength(_value) === 32, "invalid s", "value", _value);
        const value = hexlify(_value);
        assertArgument(parseInt(value.substring(0, 3)) < 8, "non-canonical s", "value", value);
        this.#s = value;
    }
    /**
     *  The ``v`` value for a signature.
     *
     *  Since a given ``x`` value for ``r`` has two possible values for
     *  its correspondin ``y``, the ``v`` indicates which of the two ``y``
     *  values to use.
     *
     *  It is normalized to the values ``27`` or ``28`` for legacy
     *  purposes.
     */
    get v() { return this.#v; }
    set v(value) {
        const v = getNumber(value, "value");
        assertArgument(v === 27 || v === 28, "invalid v", "v", value);
        this.#v = v;
    }
    /**
     *  The EIP-155 ``v`` for legacy transactions. For non-legacy
     *  transactions, this value is ``null``.
     */
    get networkV() { return this.#networkV; }
    /**
     *  The chain ID for EIP-155 legacy transactions. For non-legacy
     *  transactions, this value is ``null``.
     */
    get legacyChainId() {
        const v = this.networkV;
        if (v == null) {
            return null;
        }
        return Signature.getChainId(v);
    }
    /**
     *  The ``yParity`` for the signature.
     *
     *  See ``v`` for more details on how this value is used.
     */
    get yParity() {
        return (this.v === 27) ? 0 : 1;
    }
    /**
     *  The [[link-eip-2098]] compact representation of the ``yParity``
     *  and ``s`` compacted into a single ``bytes32``.
     */
    get yParityAndS() {
        // The EIP-2098 compact representation
        const yParityAndS = getBytes(this.s);
        if (this.yParity) {
            yParityAndS[0] |= 0x80;
        }
        return hexlify(yParityAndS);
    }
    /**
     *  The [[link-eip-2098]] compact representation.
     */
    get compactSerialized() {
        return concat([this.r, this.yParityAndS]);
    }
    /**
     *  The serialized representation.
     */
    get serialized() {
        return concat([this.r, this.s, (this.yParity ? "0x1c" : "0x1b")]);
    }
    /**
     *  @private
     */
    constructor(guard, r, s, v) {
        assertPrivate(guard, _guard$1, "Signature");
        this.#r = r;
        this.#s = s;
        this.#v = v;
        this.#networkV = null;
    }
    [Symbol.for('nodejs.util.inspect.custom')]() {
        return `Signature { r: "${this.r}", s: "${this.s}", yParity: ${this.yParity}, networkV: ${this.networkV} }`;
    }
    /**
     *  Returns a new identical [[Signature]].
     */
    clone() {
        const clone = new Signature(_guard$1, this.r, this.s, this.v);
        if (this.networkV) {
            clone.#networkV = this.networkV;
        }
        return clone;
    }
    /**
     *  Returns a representation that is compatible with ``JSON.stringify``.
     */
    toJSON() {
        const networkV = this.networkV;
        return {
            _type: "signature",
            networkV: ((networkV != null) ? networkV.toString() : null),
            r: this.r, s: this.s, v: this.v,
        };
    }
    /**
     *  Compute the chain ID from the ``v`` in a legacy EIP-155 transactions.
     *
     *  @example:
     *    Signature.getChainId(45)
     *    //_result:
     *
     *    Signature.getChainId(46)
     *    //_result:
     */
    static getChainId(v) {
        const bv = getBigInt(v, "v");
        // The v is not an EIP-155 v, so it is the unspecified chain ID
        if ((bv == BN_27$1) || (bv == BN_28$1)) {
            return BN_0$7;
        }
        // Bad value for an EIP-155 v
        assertArgument(bv >= BN_35$1, "invalid EIP-155 v", "v", v);
        return (bv - BN_35$1) / BN_2$2;
    }
    /**
     *  Compute the ``v`` for a chain ID for a legacy EIP-155 transactions.
     *
     *  Legacy transactions which use [[link-eip-155]] hijack the ``v``
     *  property to include the chain ID.
     *
     *  @example:
     *    Signature.getChainIdV(5, 27)
     *    //_result:
     *
     *    Signature.getChainIdV(5, 28)
     *    //_result:
     *
     */
    static getChainIdV(chainId, v) {
        return (getBigInt(chainId) * BN_2$2) + BigInt(35 + v - 27);
    }
    /**
     *  Compute the normalized legacy transaction ``v`` from a ``yParirty``,
     *  a legacy transaction ``v`` or a legacy [[link-eip-155]] transaction.
     *
     *  @example:
     *    // The values 0 and 1 imply v is actually yParity
     *    Signature.getNormalizedV(0)
     *    //_result:
     *
     *    // Legacy non-EIP-1559 transaction (i.e. 27 or 28)
     *    Signature.getNormalizedV(27)
     *    //_result:
     *
     *    // Legacy EIP-155 transaction (i.e. >= 35)
     *    Signature.getNormalizedV(46)
     *    //_result:
     *
     *    // Invalid values throw
     *    Signature.getNormalizedV(5)
     *    //_error:
     */
    static getNormalizedV(v) {
        const bv = getBigInt(v);
        if (bv === BN_0$7 || bv === BN_27$1) {
            return 27;
        }
        if (bv === BN_1$2 || bv === BN_28$1) {
            return 28;
        }
        assertArgument(bv >= BN_35$1, "invalid v", "v", v);
        // Otherwise, EIP-155 v means odd is 27 and even is 28
        return (bv & BN_1$2) ? 27 : 28;
    }
    /**
     *  Creates a new [[Signature]].
     *
     *  If no %%sig%% is provided, a new [[Signature]] is created
     *  with default values.
     *
     *  If %%sig%% is a string, it is parsed.
     */
    static from(sig) {
        function assertError(check, message) {
            assertArgument(check, message, "signature", sig);
        }
        if (sig == null) {
            return new Signature(_guard$1, ZeroHash, ZeroHash, 27);
        }
        if (typeof (sig) === "string") {
            const bytes = getBytes(sig, "signature");
            if (bytes.length === 64) {
                const r = hexlify(bytes.slice(0, 32));
                const s = bytes.slice(32, 64);
                const v = (s[0] & 0x80) ? 28 : 27;
                s[0] &= 0x7f;
                return new Signature(_guard$1, r, hexlify(s), v);
            }
            if (bytes.length === 65) {
                const r = hexlify(bytes.slice(0, 32));
                const s = bytes.slice(32, 64);
                assertError((s[0] & 0x80) === 0, "non-canonical s");
                const v = Signature.getNormalizedV(bytes[64]);
                return new Signature(_guard$1, r, hexlify(s), v);
            }
            assertError(false, "invalid raw signature length");
        }
        if (sig instanceof Signature) {
            return sig.clone();
        }
        // Get r
        const _r = sig.r;
        assertError(_r != null, "missing r");
        const r = toUint256(_r);
        // Get s; by any means necessary (we check consistency below)
        const s = (function (s, yParityAndS) {
            if (s != null) {
                return toUint256(s);
            }
            if (yParityAndS != null) {
                assertError(isHexString(yParityAndS, 32), "invalid yParityAndS");
                const bytes = getBytes(yParityAndS);
                bytes[0] &= 0x7f;
                return hexlify(bytes);
            }
            assertError(false, "missing s");
        })(sig.s, sig.yParityAndS);
        assertError((getBytes(s)[0] & 0x80) == 0, "non-canonical s");
        // Get v; by any means necessary (we check consistency below)
        const { networkV, v } = (function (_v, yParityAndS, yParity) {
            if (_v != null) {
                const v = getBigInt(_v);
                return {
                    networkV: ((v >= BN_35$1) ? v : undefined),
                    v: Signature.getNormalizedV(v)
                };
            }
            if (yParityAndS != null) {
                assertError(isHexString(yParityAndS, 32), "invalid yParityAndS");
                return { v: ((getBytes(yParityAndS)[0] & 0x80) ? 28 : 27) };
            }
            if (yParity != null) {
                switch (getNumber(yParity, "sig.yParity")) {
                    case 0: return { v: 27 };
                    case 1: return { v: 28 };
                }
                assertError(false, "invalid yParity");
            }
            assertError(false, "missing v");
        })(sig.v, sig.yParityAndS, sig.yParity);
        const result = new Signature(_guard$1, r, s, v);
        if (networkV) {
            result.#networkV = networkV;
        }
        // If multiple of v, yParity, yParityAndS we given, check they match
        assertError(sig.yParity == null || getNumber(sig.yParity, "sig.yParity") === result.yParity, "yParity mismatch");
        assertError(sig.yParityAndS == null || sig.yParityAndS === result.yParityAndS, "yParityAndS mismatch");
        return result;
    }
}

/**
 *  Add details about signing here.
 *
 *  @_subsection: api/crypto:Signing  [about-signing]
 */
/**
 *  A **SigningKey** provides high-level access to the elliptic curve
 *  cryptography (ECC) operations and key management.
 */
class SigningKey {
    #privateKey;
    /**
     *  Creates a new **SigningKey** for %%privateKey%%.
     */
    constructor(privateKey) {
        assertArgument(dataLength(privateKey) === 32, "invalid private key", "privateKey", "[REDACTED]");
        this.#privateKey = hexlify(privateKey);
    }
    /**
     *  The private key.
     */
    get privateKey() { return this.#privateKey; }
    /**
     *  The uncompressed public key.
     *
     * This will always begin with the prefix ``0x04`` and be 132
     * characters long (the ``0x`` prefix and 130 hexadecimal nibbles).
     */
    get publicKey() { return SigningKey.computePublicKey(this.#privateKey); }
    /**
     *  The compressed public key.
     *
     *  This will always begin with either the prefix ``0x02`` or ``0x03``
     *  and be 68 characters long (the ``0x`` prefix and 33 hexadecimal
     *  nibbles)
     */
    get compressedPublicKey() { return SigningKey.computePublicKey(this.#privateKey, true); }
    /**
     *  Return the signature of the signed %%digest%%.
     */
    sign(digest) {
        assertArgument(dataLength(digest) === 32, "invalid digest length", "digest", digest);
        const sig = secp256k1.sign(getBytesCopy(digest), getBytesCopy(this.#privateKey), {
            lowS: true
        });
        return Signature.from({
            r: toBeHex(sig.r, 32),
            s: toBeHex(sig.s, 32),
            v: (sig.recovery ? 0x1c : 0x1b)
        });
    }
    /**
     *  Returns the [[link-wiki-ecdh]] shared secret between this
     *  private key and the %%other%% key.
     *
     *  The %%other%% key may be any type of key, a raw public key,
     *  a compressed/uncompressed pubic key or aprivate key.
     *
     *  Best practice is usually to use a cryptographic hash on the
     *  returned value before using it as a symetric secret.
     *
     *  @example:
     *    sign1 = new SigningKey(id("some-secret-1"))
     *    sign2 = new SigningKey(id("some-secret-2"))
     *
     *    // Notice that privA.computeSharedSecret(pubB)...
     *    sign1.computeSharedSecret(sign2.publicKey)
     *    //_result:
     *
     *    // ...is equal to privB.computeSharedSecret(pubA).
     *    sign2.computeSharedSecret(sign1.publicKey)
     *    //_result:
     */
    computeSharedSecret(other) {
        const pubKey = SigningKey.computePublicKey(other);
        return hexlify(secp256k1.getSharedSecret(getBytesCopy(this.#privateKey), getBytes(pubKey), false));
    }
    /**
     *  Compute the public key for %%key%%, optionally %%compressed%%.
     *
     *  The %%key%% may be any type of key, a raw public key, a
     *  compressed/uncompressed public key or private key.
     *
     *  @example:
     *    sign = new SigningKey(id("some-secret"));
     *
     *    // Compute the uncompressed public key for a private key
     *    SigningKey.computePublicKey(sign.privateKey)
     *    //_result:
     *
     *    // Compute the compressed public key for a private key
     *    SigningKey.computePublicKey(sign.privateKey, true)
     *    //_result:
     *
     *    // Compute the uncompressed public key
     *    SigningKey.computePublicKey(sign.publicKey, false);
     *    //_result:
     *
     *    // Compute the Compressed a public key
     *    SigningKey.computePublicKey(sign.publicKey, true);
     *    //_result:
     */
    static computePublicKey(key, compressed) {
        let bytes = getBytes(key, "key");
        // private key
        if (bytes.length === 32) {
            const pubKey = secp256k1.getPublicKey(bytes, !!compressed);
            return hexlify(pubKey);
        }
        // raw public key; use uncompressed key with 0x04 prefix
        if (bytes.length === 64) {
            const pub = new Uint8Array(65);
            pub[0] = 0x04;
            pub.set(bytes, 1);
            bytes = pub;
        }
        const point = secp256k1.ProjectivePoint.fromHex(bytes);
        return hexlify(point.toRawBytes(compressed));
    }
    /**
     *  Returns the public key for the private key which produced the
     *  %%signature%% for the given %%digest%%.
     *
     *  @example:
     *    key = new SigningKey(id("some-secret"))
     *    digest = id("hello world")
     *    sig = key.sign(digest)
     *
     *    // Notice the signer public key...
     *    key.publicKey
     *    //_result:
     *
     *    // ...is equal to the recovered public key
     *    SigningKey.recoverPublicKey(digest, sig)
     *    //_result:
     *
     */
    static recoverPublicKey(digest, signature) {
        assertArgument(dataLength(digest) === 32, "invalid digest length", "digest", digest);
        const sig = Signature.from(signature);
        let secpSig = secp256k1.Signature.fromCompact(getBytesCopy(concat([sig.r, sig.s])));
        secpSig = secpSig.addRecoveryBit(sig.yParity);
        const pubKey = secpSig.recoverPublicKey(getBytesCopy(digest));
        assertArgument(pubKey != null, "invalid signautre for digest", "signature", signature);
        return "0x" + pubKey.toHex(false);
    }
    /**
     *  Returns the point resulting from adding the ellipic curve points
     *  %%p0%% and %%p1%%.
     *
     *  This is not a common function most developers should require, but
     *  can be useful for certain privacy-specific techniques.
     *
     *  For example, it is used by [[HDNodeWallet]] to compute child
     *  addresses from parent public keys and chain codes.
     */
    static addPoints(p0, p1, compressed) {
        const pub0 = secp256k1.ProjectivePoint.fromHex(SigningKey.computePublicKey(p0).substring(2));
        const pub1 = secp256k1.ProjectivePoint.fromHex(SigningKey.computePublicKey(p1).substring(2));
        return "0x" + pub0.add(pub1).toHex(!!compressed);
    }
}

const BN_0$6 = BigInt(0);
const BN_36 = BigInt(36);
function getChecksumAddress(address) {
    //    if (!isHexString(address, 20)) {
    //        logger.throwArgumentError("invalid address", "address", address);
    //    }
    address = address.toLowerCase();
    const chars = address.substring(2).split("");
    const expanded = new Uint8Array(40);
    for (let i = 0; i < 40; i++) {
        expanded[i] = chars[i].charCodeAt(0);
    }
    const hashed = getBytes(keccak256(expanded));
    for (let i = 0; i < 40; i += 2) {
        if ((hashed[i >> 1] >> 4) >= 8) {
            chars[i] = chars[i].toUpperCase();
        }
        if ((hashed[i >> 1] & 0x0f) >= 8) {
            chars[i + 1] = chars[i + 1].toUpperCase();
        }
    }
    return "0x" + chars.join("");
}
// See: https://en.wikipedia.org/wiki/International_Bank_Account_Number
// Create lookup table
const ibanLookup = {};
for (let i = 0; i < 10; i++) {
    ibanLookup[String(i)] = String(i);
}
for (let i = 0; i < 26; i++) {
    ibanLookup[String.fromCharCode(65 + i)] = String(10 + i);
}
// How many decimal digits can we process? (for 64-bit float, this is 15)
// i.e. Math.floor(Math.log10(Number.MAX_SAFE_INTEGER));
const safeDigits = 15;
function ibanChecksum(address) {
    address = address.toUpperCase();
    address = address.substring(4) + address.substring(0, 2) + "00";
    let expanded = address.split("").map((c) => { return ibanLookup[c]; }).join("");
    // Javascript can handle integers safely up to 15 (decimal) digits
    while (expanded.length >= safeDigits) {
        let block = expanded.substring(0, safeDigits);
        expanded = parseInt(block, 10) % 97 + expanded.substring(block.length);
    }
    let checksum = String(98 - (parseInt(expanded, 10) % 97));
    while (checksum.length < 2) {
        checksum = "0" + checksum;
    }
    return checksum;
}
const Base36 = (function () {
    const result = {};
    for (let i = 0; i < 36; i++) {
        const key = "0123456789abcdefghijklmnopqrstuvwxyz"[i];
        result[key] = BigInt(i);
    }
    return result;
})();
function fromBase36(value) {
    value = value.toLowerCase();
    let result = BN_0$6;
    for (let i = 0; i < value.length; i++) {
        result = result * BN_36 + Base36[value[i]];
    }
    return result;
}
/**
 *  Returns a normalized and checksumed address for %%address%%.
 *  This accepts non-checksum addresses, checksum addresses and
 *  [[getIcapAddress]] formats.
 *
 *  The checksum in Ethereum uses the capitalization (upper-case
 *  vs lower-case) of the characters within an address to encode
 *  its checksum, which offers, on average, a checksum of 15-bits.
 *
 *  If %%address%% contains both upper-case and lower-case, it is
 *  assumed to already be a checksum address and its checksum is
 *  validated, and if the address fails its expected checksum an
 *  error is thrown.
 *
 *  If you wish the checksum of %%address%% to be ignore, it should
 *  be converted to lower-case (i.e. ``.toLowercase()``) before
 *  being passed in. This should be a very rare situation though,
 *  that you wish to bypass the safegaurds in place to protect
 *  against an address that has been incorrectly copied from another
 *  source.
 *
 *  @example:
 *    // Adds the checksum (via upper-casing specific letters)
 *    getAddress("0x8ba1f109551bd432803012645ac136ddd64dba72")
 *    //_result:
 *
 *    // Converts ICAP address and adds checksum
 *    getAddress("XE65GB6LDNXYOFTX0NSV3FUWKOWIXAMJK36");
 *    //_result:
 *
 *    // Throws an error if an address contains mixed case,
 *    // but the checksum fails
 *    getAddress("0x8Ba1f109551bD432803012645Ac136ddd64DBA72")
 *    //_error:
 */
function getAddress(address) {
    assertArgument(typeof (address) === "string", "invalid address", "address", address);
    if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
        // Missing the 0x prefix
        if (!address.startsWith("0x")) {
            address = "0x" + address;
        }
        const result = getChecksumAddress(address);
        // It is a checksummed address with a bad checksum
        assertArgument(!address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) || result === address, "bad address checksum", "address", address);
        return result;
    }
    // Maybe ICAP? (we only support direct mode)
    if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
        // It is an ICAP address with a bad checksum
        assertArgument(address.substring(2, 4) === ibanChecksum(address), "bad icap checksum", "address", address);
        let result = fromBase36(address.substring(4)).toString(16);
        while (result.length < 40) {
            result = "0" + result;
        }
        return getChecksumAddress("0x" + result);
    }
    assertArgument(false, "invalid address", "address", address);
}

// http://ethereum.stackexchange.com/questions/760/how-is-the-address-of-an-ethereum-contract-computed
/**
 *  Returns the address that would result from a ``CREATE`` for %%tx%%.
 *
 *  This can be used to compute the address a contract will be
 *  deployed to by an EOA when sending a deployment transaction (i.e.
 *  when the ``to`` address is ``null``).
 *
 *  This can also be used to compute the address a contract will be
 *  deployed to by a contract, by using the contract's address as the
 *  ``to`` and the contract's nonce.
 *
 *  @example
 *    from = "0x8ba1f109551bD432803012645Ac136ddd64DBA72";
 *    nonce = 5;
 *
 *    getCreateAddress({ from, nonce });
 *    //_result:
 */
function getCreateAddress(tx) {
    const from = getAddress(tx.from);
    const nonce = getBigInt(tx.nonce, "tx.nonce");
    let nonceHex = nonce.toString(16);
    if (nonceHex === "0") {
        nonceHex = "0x";
    }
    else if (nonceHex.length % 2) {
        nonceHex = "0x0" + nonceHex;
    }
    else {
        nonceHex = "0x" + nonceHex;
    }
    return getAddress(dataSlice(keccak256(encodeRlp([from, nonceHex])), 12));
}

/**
 *  Returns true if %%value%% is an object which implements the
 *  [[Addressable]] interface.
 *
 *  @example:
 *    // Wallets and AbstractSigner sub-classes
 *    isAddressable(Wallet.createRandom())
 *    //_result:
 *
 *    // Contracts
 *    contract = new Contract("dai.tokens.ethers.eth", [ ], provider)
 *    isAddressable(contract)
 *    //_result:
 */
function isAddressable(value) {
    return (value && typeof (value.getAddress) === "function");
}
async function checkAddress(target, promise) {
    const result = await promise;
    if (result == null || result === "0x0000000000000000000000000000000000000000") {
        assert(typeof (target) !== "string", "unconfigured name", "UNCONFIGURED_NAME", { value: target });
        assertArgument(false, "invalid AddressLike value; did not resolve to a value address", "target", target);
    }
    return getAddress(result);
}
/**
 *  Resolves to an address for the %%target%%, which may be any
 *  supported address type, an [[Addressable]] or a Promise which
 *  resolves to an address.
 *
 *  If an ENS name is provided, but that name has not been correctly
 *  configured a [[UnconfiguredNameError]] is thrown.
 *
 *  @example:
 *    addr = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
 *
 *    // Addresses are return synchronously
 *    resolveAddress(addr, provider)
 *    //_result:
 *
 *    // Address promises are resolved asynchronously
 *    resolveAddress(Promise.resolve(addr))
 *    //_result:
 *
 *    // ENS names are resolved asynchronously
 *    resolveAddress("dai.tokens.ethers.eth", provider)
 *    //_result:
 *
 *    // Addressable objects are resolved asynchronously
 *    contract = new Contract(addr, [ ])
 *    resolveAddress(contract, provider)
 *    //_result:
 *
 *    // Unconfigured ENS names reject
 *    resolveAddress("nothing-here.ricmoo.eth", provider)
 *    //_error:
 *
 *    // ENS names require a NameResolver object passed in
 *    // (notice the provider was omitted)
 *    resolveAddress("nothing-here.ricmoo.eth")
 *    //_error:
 */
function resolveAddress(target, resolver) {
    if (typeof (target) === "string") {
        if (target.match(/^0x[0-9a-f]{40}$/i)) {
            return getAddress(target);
        }
        assert(resolver != null, "ENS resolution requires a provider", "UNSUPPORTED_OPERATION", { operation: "resolveName" });
        return checkAddress(target, resolver.resolveName(target));
    }
    else if (isAddressable(target)) {
        return checkAddress(target, target.getAddress());
    }
    else if (target && typeof (target.then) === "function") {
        return checkAddress(target, target);
    }
    assertArgument(false, "unsupported addressable value", "target", target);
}

/**
 *  A Typed object allows a value to have its type explicitly
 *  specified.
 *
 *  For example, in Solidity, the value ``45`` could represent a
 *  ``uint8`` or a ``uint256``. The value ``0x1234`` could represent
 *  a ``bytes2`` or ``bytes``.
 *
 *  Since JavaScript has no meaningful way to explicitly inform any
 *  APIs which what the type is, this allows transparent interoperation
 *  with Soldity.
 *
 *  @_subsection: api/abi:Typed Values
 */
const _gaurd = {};
function n(value, width) {
    let signed = false;
    if (width < 0) {
        signed = true;
        width *= -1;
    }
    // @TODO: Check range is valid for value
    return new Typed(_gaurd, `${signed ? "" : "u"}int${width}`, value, { signed, width });
}
function b(value, size) {
    // @TODO: Check range is valid for value
    return new Typed(_gaurd, `bytes${(size) ? size : ""}`, value, { size });
}
const _typedSymbol = Symbol.for("_ethers_typed");
/**
 *  The **Typed** class to wrap values providing explicit type information.
 */
class Typed {
    /**
     *  The type, as a Solidity-compatible type.
     */
    type;
    /**
     *  The actual value.
     */
    value;
    #options;
    /**
     *  @_ignore:
     */
    _typedSymbol;
    /**
     *  @_ignore:
     */
    constructor(gaurd, type, value, options) {
        if (options == null) {
            options = null;
        }
        assertPrivate(_gaurd, gaurd, "Typed");
        defineProperties(this, { _typedSymbol, type, value });
        this.#options = options;
        // Check the value is valid
        this.format();
    }
    /**
     *  Format the type as a Human-Readable type.
     */
    format() {
        if (this.type === "array") {
            throw new Error("");
        }
        else if (this.type === "dynamicArray") {
            throw new Error("");
        }
        else if (this.type === "tuple") {
            return `tuple(${this.value.map((v) => v.format()).join(",")})`;
        }
        return this.type;
    }
    /**
     *  The default value returned by this type.
     */
    defaultValue() {
        return 0;
    }
    /**
     *  The minimum value for numeric types.
     */
    minValue() {
        return 0;
    }
    /**
     *  The maximum value for numeric types.
     */
    maxValue() {
        return 0;
    }
    /**
     *  Returns ``true`` and provides a type guard is this is a [[TypedBigInt]].
     */
    isBigInt() {
        return !!(this.type.match(/^u?int[0-9]+$/));
    }
    /**
     *  Returns ``true`` and provides a type guard is this is a [[TypedData]].
     */
    isData() {
        return this.type.startsWith("bytes");
    }
    /**
     *  Returns ``true`` and provides a type guard is this is a [[TypedString]].
     */
    isString() {
        return (this.type === "string");
    }
    /**
     *  Returns the tuple name, if this is a tuple. Throws otherwise.
     */
    get tupleName() {
        if (this.type !== "tuple") {
            throw TypeError("not a tuple");
        }
        return this.#options;
    }
    // Returns the length of this type as an array
    // - `null` indicates the length is unforced, it could be dynamic
    // - `-1` indicates the length is dynamic
    // - any other value indicates it is a static array and is its length
    /**
     *  Returns the length of the array type or ``-1`` if it is dynamic.
     *
     *  Throws if the type is not an array.
     */
    get arrayLength() {
        if (this.type !== "array") {
            throw TypeError("not an array");
        }
        if (this.#options === true) {
            return -1;
        }
        if (this.#options === false) {
            return (this.value).length;
        }
        return null;
    }
    /**
     *  Returns a new **Typed** of %%type%% with the %%value%%.
     */
    static from(type, value) {
        return new Typed(_gaurd, type, value);
    }
    /**
     *  Return a new ``uint8`` type for %%v%%.
     */
    static uint8(v) { return n(v, 8); }
    /**
     *  Return a new ``uint16`` type for %%v%%.
     */
    static uint16(v) { return n(v, 16); }
    /**
     *  Return a new ``uint24`` type for %%v%%.
     */
    static uint24(v) { return n(v, 24); }
    /**
     *  Return a new ``uint32`` type for %%v%%.
     */
    static uint32(v) { return n(v, 32); }
    /**
     *  Return a new ``uint40`` type for %%v%%.
     */
    static uint40(v) { return n(v, 40); }
    /**
     *  Return a new ``uint48`` type for %%v%%.
     */
    static uint48(v) { return n(v, 48); }
    /**
     *  Return a new ``uint56`` type for %%v%%.
     */
    static uint56(v) { return n(v, 56); }
    /**
     *  Return a new ``uint64`` type for %%v%%.
     */
    static uint64(v) { return n(v, 64); }
    /**
     *  Return a new ``uint72`` type for %%v%%.
     */
    static uint72(v) { return n(v, 72); }
    /**
     *  Return a new ``uint80`` type for %%v%%.
     */
    static uint80(v) { return n(v, 80); }
    /**
     *  Return a new ``uint88`` type for %%v%%.
     */
    static uint88(v) { return n(v, 88); }
    /**
     *  Return a new ``uint96`` type for %%v%%.
     */
    static uint96(v) { return n(v, 96); }
    /**
     *  Return a new ``uint104`` type for %%v%%.
     */
    static uint104(v) { return n(v, 104); }
    /**
     *  Return a new ``uint112`` type for %%v%%.
     */
    static uint112(v) { return n(v, 112); }
    /**
     *  Return a new ``uint120`` type for %%v%%.
     */
    static uint120(v) { return n(v, 120); }
    /**
     *  Return a new ``uint128`` type for %%v%%.
     */
    static uint128(v) { return n(v, 128); }
    /**
     *  Return a new ``uint136`` type for %%v%%.
     */
    static uint136(v) { return n(v, 136); }
    /**
     *  Return a new ``uint144`` type for %%v%%.
     */
    static uint144(v) { return n(v, 144); }
    /**
     *  Return a new ``uint152`` type for %%v%%.
     */
    static uint152(v) { return n(v, 152); }
    /**
     *  Return a new ``uint160`` type for %%v%%.
     */
    static uint160(v) { return n(v, 160); }
    /**
     *  Return a new ``uint168`` type for %%v%%.
     */
    static uint168(v) { return n(v, 168); }
    /**
     *  Return a new ``uint176`` type for %%v%%.
     */
    static uint176(v) { return n(v, 176); }
    /**
     *  Return a new ``uint184`` type for %%v%%.
     */
    static uint184(v) { return n(v, 184); }
    /**
     *  Return a new ``uint192`` type for %%v%%.
     */
    static uint192(v) { return n(v, 192); }
    /**
     *  Return a new ``uint200`` type for %%v%%.
     */
    static uint200(v) { return n(v, 200); }
    /**
     *  Return a new ``uint208`` type for %%v%%.
     */
    static uint208(v) { return n(v, 208); }
    /**
     *  Return a new ``uint216`` type for %%v%%.
     */
    static uint216(v) { return n(v, 216); }
    /**
     *  Return a new ``uint224`` type for %%v%%.
     */
    static uint224(v) { return n(v, 224); }
    /**
     *  Return a new ``uint232`` type for %%v%%.
     */
    static uint232(v) { return n(v, 232); }
    /**
     *  Return a new ``uint240`` type for %%v%%.
     */
    static uint240(v) { return n(v, 240); }
    /**
     *  Return a new ``uint248`` type for %%v%%.
     */
    static uint248(v) { return n(v, 248); }
    /**
     *  Return a new ``uint256`` type for %%v%%.
     */
    static uint256(v) { return n(v, 256); }
    /**
     *  Return a new ``uint256`` type for %%v%%.
     */
    static uint(v) { return n(v, 256); }
    /**
     *  Return a new ``int8`` type for %%v%%.
     */
    static int8(v) { return n(v, -8); }
    /**
     *  Return a new ``int16`` type for %%v%%.
     */
    static int16(v) { return n(v, -16); }
    /**
     *  Return a new ``int24`` type for %%v%%.
     */
    static int24(v) { return n(v, -24); }
    /**
     *  Return a new ``int32`` type for %%v%%.
     */
    static int32(v) { return n(v, -32); }
    /**
     *  Return a new ``int40`` type for %%v%%.
     */
    static int40(v) { return n(v, -40); }
    /**
     *  Return a new ``int48`` type for %%v%%.
     */
    static int48(v) { return n(v, -48); }
    /**
     *  Return a new ``int56`` type for %%v%%.
     */
    static int56(v) { return n(v, -56); }
    /**
     *  Return a new ``int64`` type for %%v%%.
     */
    static int64(v) { return n(v, -64); }
    /**
     *  Return a new ``int72`` type for %%v%%.
     */
    static int72(v) { return n(v, -72); }
    /**
     *  Return a new ``int80`` type for %%v%%.
     */
    static int80(v) { return n(v, -80); }
    /**
     *  Return a new ``int88`` type for %%v%%.
     */
    static int88(v) { return n(v, -88); }
    /**
     *  Return a new ``int96`` type for %%v%%.
     */
    static int96(v) { return n(v, -96); }
    /**
     *  Return a new ``int104`` type for %%v%%.
     */
    static int104(v) { return n(v, -104); }
    /**
     *  Return a new ``int112`` type for %%v%%.
     */
    static int112(v) { return n(v, -112); }
    /**
     *  Return a new ``int120`` type for %%v%%.
     */
    static int120(v) { return n(v, -120); }
    /**
     *  Return a new ``int128`` type for %%v%%.
     */
    static int128(v) { return n(v, -128); }
    /**
     *  Return a new ``int136`` type for %%v%%.
     */
    static int136(v) { return n(v, -136); }
    /**
     *  Return a new ``int144`` type for %%v%%.
     */
    static int144(v) { return n(v, -144); }
    /**
     *  Return a new ``int52`` type for %%v%%.
     */
    static int152(v) { return n(v, -152); }
    /**
     *  Return a new ``int160`` type for %%v%%.
     */
    static int160(v) { return n(v, -160); }
    /**
     *  Return a new ``int168`` type for %%v%%.
     */
    static int168(v) { return n(v, -168); }
    /**
     *  Return a new ``int176`` type for %%v%%.
     */
    static int176(v) { return n(v, -176); }
    /**
     *  Return a new ``int184`` type for %%v%%.
     */
    static int184(v) { return n(v, -184); }
    /**
     *  Return a new ``int92`` type for %%v%%.
     */
    static int192(v) { return n(v, -192); }
    /**
     *  Return a new ``int200`` type for %%v%%.
     */
    static int200(v) { return n(v, -200); }
    /**
     *  Return a new ``int208`` type for %%v%%.
     */
    static int208(v) { return n(v, -208); }
    /**
     *  Return a new ``int216`` type for %%v%%.
     */
    static int216(v) { return n(v, -216); }
    /**
     *  Return a new ``int224`` type for %%v%%.
     */
    static int224(v) { return n(v, -224); }
    /**
     *  Return a new ``int232`` type for %%v%%.
     */
    static int232(v) { return n(v, -232); }
    /**
     *  Return a new ``int240`` type for %%v%%.
     */
    static int240(v) { return n(v, -240); }
    /**
     *  Return a new ``int248`` type for %%v%%.
     */
    static int248(v) { return n(v, -248); }
    /**
     *  Return a new ``int256`` type for %%v%%.
     */
    static int256(v) { return n(v, -256); }
    /**
     *  Return a new ``int256`` type for %%v%%.
     */
    static int(v) { return n(v, -256); }
    /**
     *  Return a new ``bytes1`` type for %%v%%.
     */
    static bytes1(v) { return b(v, 1); }
    /**
     *  Return a new ``bytes2`` type for %%v%%.
     */
    static bytes2(v) { return b(v, 2); }
    /**
     *  Return a new ``bytes3`` type for %%v%%.
     */
    static bytes3(v) { return b(v, 3); }
    /**
     *  Return a new ``bytes4`` type for %%v%%.
     */
    static bytes4(v) { return b(v, 4); }
    /**
     *  Return a new ``bytes5`` type for %%v%%.
     */
    static bytes5(v) { return b(v, 5); }
    /**
     *  Return a new ``bytes6`` type for %%v%%.
     */
    static bytes6(v) { return b(v, 6); }
    /**
     *  Return a new ``bytes7`` type for %%v%%.
     */
    static bytes7(v) { return b(v, 7); }
    /**
     *  Return a new ``bytes8`` type for %%v%%.
     */
    static bytes8(v) { return b(v, 8); }
    /**
     *  Return a new ``bytes9`` type for %%v%%.
     */
    static bytes9(v) { return b(v, 9); }
    /**
     *  Return a new ``bytes10`` type for %%v%%.
     */
    static bytes10(v) { return b(v, 10); }
    /**
     *  Return a new ``bytes11`` type for %%v%%.
     */
    static bytes11(v) { return b(v, 11); }
    /**
     *  Return a new ``bytes12`` type for %%v%%.
     */
    static bytes12(v) { return b(v, 12); }
    /**
     *  Return a new ``bytes13`` type for %%v%%.
     */
    static bytes13(v) { return b(v, 13); }
    /**
     *  Return a new ``bytes14`` type for %%v%%.
     */
    static bytes14(v) { return b(v, 14); }
    /**
     *  Return a new ``bytes15`` type for %%v%%.
     */
    static bytes15(v) { return b(v, 15); }
    /**
     *  Return a new ``bytes16`` type for %%v%%.
     */
    static bytes16(v) { return b(v, 16); }
    /**
     *  Return a new ``bytes17`` type for %%v%%.
     */
    static bytes17(v) { return b(v, 17); }
    /**
     *  Return a new ``bytes18`` type for %%v%%.
     */
    static bytes18(v) { return b(v, 18); }
    /**
     *  Return a new ``bytes19`` type for %%v%%.
     */
    static bytes19(v) { return b(v, 19); }
    /**
     *  Return a new ``bytes20`` type for %%v%%.
     */
    static bytes20(v) { return b(v, 20); }
    /**
     *  Return a new ``bytes21`` type for %%v%%.
     */
    static bytes21(v) { return b(v, 21); }
    /**
     *  Return a new ``bytes22`` type for %%v%%.
     */
    static bytes22(v) { return b(v, 22); }
    /**
     *  Return a new ``bytes23`` type for %%v%%.
     */
    static bytes23(v) { return b(v, 23); }
    /**
     *  Return a new ``bytes24`` type for %%v%%.
     */
    static bytes24(v) { return b(v, 24); }
    /**
     *  Return a new ``bytes25`` type for %%v%%.
     */
    static bytes25(v) { return b(v, 25); }
    /**
     *  Return a new ``bytes26`` type for %%v%%.
     */
    static bytes26(v) { return b(v, 26); }
    /**
     *  Return a new ``bytes27`` type for %%v%%.
     */
    static bytes27(v) { return b(v, 27); }
    /**
     *  Return a new ``bytes28`` type for %%v%%.
     */
    static bytes28(v) { return b(v, 28); }
    /**
     *  Return a new ``bytes29`` type for %%v%%.
     */
    static bytes29(v) { return b(v, 29); }
    /**
     *  Return a new ``bytes30`` type for %%v%%.
     */
    static bytes30(v) { return b(v, 30); }
    /**
     *  Return a new ``bytes31`` type for %%v%%.
     */
    static bytes31(v) { return b(v, 31); }
    /**
     *  Return a new ``bytes32`` type for %%v%%.
     */
    static bytes32(v) { return b(v, 32); }
    /**
     *  Return a new ``address`` type for %%v%%.
     */
    static address(v) { return new Typed(_gaurd, "address", v); }
    /**
     *  Return a new ``bool`` type for %%v%%.
     */
    static bool(v) { return new Typed(_gaurd, "bool", !!v); }
    /**
     *  Return a new ``bytes`` type for %%v%%.
     */
    static bytes(v) { return new Typed(_gaurd, "bytes", v); }
    /**
     *  Return a new ``string`` type for %%v%%.
     */
    static string(v) { return new Typed(_gaurd, "string", v); }
    /**
     *  Return a new ``array`` type for %%v%%, allowing %%dynamic%% length.
     */
    static array(v, dynamic) {
        throw new Error("not implemented yet");
    }
    /**
     *  Return a new ``tuple`` type for %%v%%, with the optional %%name%%.
     */
    static tuple(v, name) {
        throw new Error("not implemented yet");
    }
    /**
     *  Return a new ``uint8`` type for %%v%%.
     */
    static overrides(v) {
        return new Typed(_gaurd, "overrides", Object.assign({}, v));
    }
    /**
     *  Returns true only if %%value%% is a [[Typed]] instance.
     */
    static isTyped(value) {
        return (value
            && typeof (value) === "object"
            && "_typedSymbol" in value
            && value._typedSymbol === _typedSymbol);
    }
    /**
     *  If the value is a [[Typed]] instance, validates the underlying value
     *  and returns it, otherwise returns value directly.
     *
     *  This is useful for functions that with to accept either a [[Typed]]
     *  object or values.
     */
    static dereference(value, type) {
        if (Typed.isTyped(value)) {
            if (value.type !== type) {
                throw new Error(`invalid type: expecetd ${type}, got ${value.type}`);
            }
            return value.value;
        }
        return value;
    }
}

/**
 *  @_ignore
 */
class AddressCoder extends Coder {
    constructor(localName) {
        super("address", "address", localName, false);
    }
    defaultValue() {
        return "0x0000000000000000000000000000000000000000";
    }
    encode(writer, _value) {
        let value = Typed.dereference(_value, "string");
        try {
            value = getAddress(value);
        }
        catch (error) {
            return this._throwError(error.message, _value);
        }
        return writer.writeValue(value);
    }
    decode(reader) {
        return getAddress(toBeHex(reader.readValue(), 20));
    }
}

/**
 *  Clones the functionality of an existing Coder, but without a localName
 *
 *  @_ignore
 */
class AnonymousCoder extends Coder {
    coder;
    constructor(coder) {
        super(coder.name, coder.type, "_", coder.dynamic);
        this.coder = coder;
    }
    defaultValue() {
        return this.coder.defaultValue();
    }
    encode(writer, value) {
        return this.coder.encode(writer, value);
    }
    decode(reader) {
        return this.coder.decode(reader);
    }
}

/**
 *  @_ignore
 */
function pack(writer, coders, values) {
    let arrayValues = [];
    if (Array.isArray(values)) {
        arrayValues = values;
    }
    else if (values && typeof (values) === "object") {
        let unique = {};
        arrayValues = coders.map((coder) => {
            const name = coder.localName;
            assert(name, "cannot encode object for signature with missing names", "INVALID_ARGUMENT", { argument: "values", info: { coder }, value: values });
            assert(!unique[name], "cannot encode object for signature with duplicate names", "INVALID_ARGUMENT", { argument: "values", info: { coder }, value: values });
            unique[name] = true;
            return values[name];
        });
    }
    else {
        assertArgument(false, "invalid tuple value", "tuple", values);
    }
    assertArgument(coders.length === arrayValues.length, "types/value length mismatch", "tuple", values);
    let staticWriter = new Writer();
    let dynamicWriter = new Writer();
    let updateFuncs = [];
    coders.forEach((coder, index) => {
        let value = arrayValues[index];
        if (coder.dynamic) {
            // Get current dynamic offset (for the future pointer)
            let dynamicOffset = dynamicWriter.length;
            // Encode the dynamic value into the dynamicWriter
            coder.encode(dynamicWriter, value);
            // Prepare to populate the correct offset once we are done
            let updateFunc = staticWriter.writeUpdatableValue();
            updateFuncs.push((baseOffset) => {
                updateFunc(baseOffset + dynamicOffset);
            });
        }
        else {
            coder.encode(staticWriter, value);
        }
    });
    // Backfill all the dynamic offsets, now that we know the static length
    updateFuncs.forEach((func) => { func(staticWriter.length); });
    let length = writer.appendWriter(staticWriter);
    length += writer.appendWriter(dynamicWriter);
    return length;
}
/**
 *  @_ignore
 */
function unpack(reader, coders) {
    let values = [];
    let keys = [];
    // A reader anchored to this base
    let baseReader = reader.subReader(0);
    coders.forEach((coder) => {
        let value = null;
        if (coder.dynamic) {
            let offset = reader.readIndex();
            let offsetReader = baseReader.subReader(offset);
            try {
                value = coder.decode(offsetReader);
            }
            catch (error) {
                // Cannot recover from this
                if (isError(error, "BUFFER_OVERRUN")) {
                    throw error;
                }
                value = error;
                value.baseType = coder.name;
                value.name = coder.localName;
                value.type = coder.type;
            }
        }
        else {
            try {
                value = coder.decode(reader);
            }
            catch (error) {
                // Cannot recover from this
                if (isError(error, "BUFFER_OVERRUN")) {
                    throw error;
                }
                value = error;
                value.baseType = coder.name;
                value.name = coder.localName;
                value.type = coder.type;
            }
        }
        if (value == undefined) {
            throw new Error("investigate");
        }
        values.push(value);
        keys.push(coder.localName || null);
    });
    return Result.fromItems(values, keys);
}
/**
 *  @_ignore
 */
class ArrayCoder extends Coder {
    coder;
    length;
    constructor(coder, length, localName) {
        const type = (coder.type + "[" + (length >= 0 ? length : "") + "]");
        const dynamic = (length === -1 || coder.dynamic);
        super("array", type, localName, dynamic);
        defineProperties(this, { coder, length });
    }
    defaultValue() {
        // Verifies the child coder is valid (even if the array is dynamic or 0-length)
        const defaultChild = this.coder.defaultValue();
        const result = [];
        for (let i = 0; i < this.length; i++) {
            result.push(defaultChild);
        }
        return result;
    }
    encode(writer, _value) {
        const value = Typed.dereference(_value, "array");
        if (!Array.isArray(value)) {
            this._throwError("expected array value", value);
        }
        let count = this.length;
        if (count === -1) {
            count = value.length;
            writer.writeValue(value.length);
        }
        assertArgumentCount(value.length, count, "coder array" + (this.localName ? (" " + this.localName) : ""));
        let coders = [];
        for (let i = 0; i < value.length; i++) {
            coders.push(this.coder);
        }
        return pack(writer, coders, value);
    }
    decode(reader) {
        let count = this.length;
        if (count === -1) {
            count = reader.readIndex();
            // Check that there is *roughly* enough data to ensure
            // stray random data is not being read as a length. Each
            // slot requires at least 32 bytes for their value (or 32
            // bytes as a link to the data). This could use a much
            // tighter bound, but we are erroring on the side of safety.
            assert(count * WordSize <= reader.dataLength, "insufficient data length", "BUFFER_OVERRUN", { buffer: reader.bytes, offset: count * WordSize, length: reader.dataLength });
        }
        let coders = [];
        for (let i = 0; i < count; i++) {
            coders.push(new AnonymousCoder(this.coder));
        }
        return unpack(reader, coders);
    }
}

/**
 *  @_ignore
 */
class BooleanCoder extends Coder {
    constructor(localName) {
        super("bool", "bool", localName, false);
    }
    defaultValue() {
        return false;
    }
    encode(writer, _value) {
        const value = Typed.dereference(_value, "bool");
        return writer.writeValue(value ? 1 : 0);
    }
    decode(reader) {
        return !!reader.readValue();
    }
}

/**
 *  @_ignore
 */
class DynamicBytesCoder extends Coder {
    constructor(type, localName) {
        super(type, type, localName, true);
    }
    defaultValue() {
        return "0x";
    }
    encode(writer, value) {
        value = getBytesCopy(value);
        let length = writer.writeValue(value.length);
        length += writer.writeBytes(value);
        return length;
    }
    decode(reader) {
        return reader.readBytes(reader.readIndex(), true);
    }
}
/**
 *  @_ignore
 */
class BytesCoder extends DynamicBytesCoder {
    constructor(localName) {
        super("bytes", localName);
    }
    decode(reader) {
        return hexlify(super.decode(reader));
    }
}

/**
 *  @_ignore
 */
class FixedBytesCoder extends Coder {
    size;
    constructor(size, localName) {
        let name = "bytes" + String(size);
        super(name, name, localName, false);
        defineProperties(this, { size }, { size: "number" });
    }
    defaultValue() {
        return ("0x0000000000000000000000000000000000000000000000000000000000000000").substring(0, 2 + this.size * 2);
    }
    encode(writer, _value) {
        let data = getBytesCopy(Typed.dereference(_value, this.type));
        if (data.length !== this.size) {
            this._throwError("incorrect data length", _value);
        }
        return writer.writeBytes(data);
    }
    decode(reader) {
        return hexlify(reader.readBytes(this.size));
    }
}

const Empty = new Uint8Array([]);
/**
 *  @_ignore
 */
class NullCoder extends Coder {
    constructor(localName) {
        super("null", "", localName, false);
    }
    defaultValue() {
        return null;
    }
    encode(writer, value) {
        if (value != null) {
            this._throwError("not null", value);
        }
        return writer.writeBytes(Empty);
    }
    decode(reader) {
        reader.readBytes(0);
        return null;
    }
}

const BN_0$5 = BigInt(0);
const BN_1$1 = BigInt(1);
const BN_MAX_UINT256$1 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
/**
 *  @_ignore
 */
class NumberCoder extends Coder {
    size;
    signed;
    constructor(size, signed, localName) {
        const name = ((signed ? "int" : "uint") + (size * 8));
        super(name, name, localName, false);
        defineProperties(this, { size, signed }, { size: "number", signed: "boolean" });
    }
    defaultValue() {
        return 0;
    }
    encode(writer, _value) {
        let value = getBigInt(Typed.dereference(_value, this.type));
        // Check bounds are safe for encoding
        let maxUintValue = mask(BN_MAX_UINT256$1, WordSize * 8);
        if (this.signed) {
            let bounds = mask(maxUintValue, (this.size * 8) - 1);
            if (value > bounds || value < -(bounds + BN_1$1)) {
                this._throwError("value out-of-bounds", _value);
            }
            value = toTwos(value, 8 * WordSize);
        }
        else if (value < BN_0$5 || value > mask(maxUintValue, this.size * 8)) {
            this._throwError("value out-of-bounds", _value);
        }
        return writer.writeValue(value);
    }
    decode(reader) {
        let value = mask(reader.readValue(), this.size * 8);
        if (this.signed) {
            value = fromTwos(value, this.size * 8);
        }
        return value;
    }
}

/**
 *  @_ignore
 */
class StringCoder extends DynamicBytesCoder {
    constructor(localName) {
        super("string", localName);
    }
    defaultValue() {
        return "";
    }
    encode(writer, _value) {
        return super.encode(writer, toUtf8Bytes(Typed.dereference(_value, "string")));
    }
    decode(reader) {
        return toUtf8String(super.decode(reader));
    }
}

/**
 *  @_ignore
 */
class TupleCoder extends Coder {
    coders;
    constructor(coders, localName) {
        let dynamic = false;
        const types = [];
        coders.forEach((coder) => {
            if (coder.dynamic) {
                dynamic = true;
            }
            types.push(coder.type);
        });
        const type = ("tuple(" + types.join(",") + ")");
        super("tuple", type, localName, dynamic);
        defineProperties(this, { coders: Object.freeze(coders.slice()) });
    }
    defaultValue() {
        const values = [];
        this.coders.forEach((coder) => {
            values.push(coder.defaultValue());
        });
        // We only output named properties for uniquely named coders
        const uniqueNames = this.coders.reduce((accum, coder) => {
            const name = coder.localName;
            if (name) {
                if (!accum[name]) {
                    accum[name] = 0;
                }
                accum[name]++;
            }
            return accum;
        }, {});
        // Add named values
        this.coders.forEach((coder, index) => {
            let name = coder.localName;
            if (!name || uniqueNames[name] !== 1) {
                return;
            }
            if (name === "length") {
                name = "_length";
            }
            if (values[name] != null) {
                return;
            }
            values[name] = values[index];
        });
        return Object.freeze(values);
    }
    encode(writer, _value) {
        const value = Typed.dereference(_value, "tuple");
        return pack(writer, this.coders, value);
    }
    decode(reader) {
        return unpack(reader, this.coders);
    }
}

/**
 *  A simple hashing function which operates on UTF-8 strings to
 *  compute an 32-byte identifier.
 *
 *  This simply computes the [UTF-8 bytes](toUtf8Bytes) and computes
 *  the [[keccak256]].
 *
 *  @example:
 *    id("hello world")
 *    //_result:
 */
function id(value) {
    return keccak256(toUtf8Bytes(value));
}

// created 2023-09-25T01:01:55.148Z
// compressed base64-encoded blob for include-ens data
// source: https://github.com/adraffy/ens-normalize.js/blob/main/src/make.js
// see: https://github.com/adraffy/ens-normalize.js#security
// SHA-256: 0565ed049b9cf1614bb9e11ba7d8ac6a6fb96c893253d890f7e2b2884b9ded32
var COMPRESSED$1 = 'AEEUdwmgDS8BxQKKAP4BOgDjATAAngDUAIMAoABoAOAAagCOAEQAhABMAHIAOwA9ACsANgAmAGIAHgAuACgAJwAXAC0AGgAjAB8ALwAUACkAEgAeAAkAGwARABkAFgA5ACgALQArADcAFQApABAAHgAiABAAGgAeABMAGAUhBe8BFxREN8sF2wC5AK5HAW8ArQkDzQCuhzc3NzcBP68NEfMABQdHBuw5BV8FYAA9MzkI9r4ZBg7QyQAWA9CeOwLNCjcCjqkChuA/lm+RAsXTAoP6ASfnEQDytQFJAjWVCkeXAOsA6godAB/cwdAUE0WlBCN/AQUCQRjFD/MRBjHxDQSJbw0jBzUAswBxme+tnIcAYwabAysG8QAjAEMMmxcDqgPKQyDXCMMxA7kUQwD3NXOrAKmFIAAfBC0D3x4BJQDBGdUFAhEgVD8JnwmQJiNWYUzrg0oAGwAUAB0AFnNcACkAFgBP9h3gPfsDOWDKneY2ChglX1UDYD30ABsAFAAdABZzIGRAnwDD8wAjAEEMzRbDqgMB2sAFYwXqAtCnAsS4AwpUJKRtFHsadUz9AMMVbwLpABM1NJEX0ZkCgYMBEyMAxRVvAukAEzUBUFAtmUwSAy4DBTER33EftQHfSwB5MxJ/AjkWKQLzL8E/cwBB6QH9LQDPDtO9ASNriQC5DQANAwCK21EFI91zHwCoL9kBqQcHBwcHKzUDowBvAQohPvU3fAQgHwCyAc8CKQMA5zMSezr7ULgFmDp/LzVQBgEGAi8FYQVgt8AFcTtlQhpCWEmfe5tmZ6IAExsDzQ8t+X8rBKtTAltbAn0jsy8Bl6utPWMDTR8Ei2kRANkDBrNHNysDBzECQWUAcwFpJ3kAiyUhAJ0BUb8AL3EfAbfNAz81KUsFWwF3YQZtAm0A+VEfAzEJDQBRSQCzAQBlAHsAM70GD/v3IZWHBwARKQAxALsjTwHZAeMPEzmXgIHwABIAGQA8AEUAQDt3gdvIEGcQZAkGTRFMdEIVEwK0D64L7REdDNkq09PgADSxB/MDWwfzA1sDWwfzB/MDWwfzA1sDWwNbA1scEvAi28gQZw9QBHUFlgWTBN4IiyZREYkHMAjaVBV0JhxPA00BBCMtSSQ7mzMTJUpMFE0LCAQ2SmyvfUADTzGzVP2QqgPTMlc5dAkGHnkSqAAyD3skNb1OhnpPcagKU0+2tYdJak5vAsY6sEAACikJm2/Dd1YGRRAfJ6kQ+ww3AbkBPw3xS9wE9QY/BM0fgRkdD9GVoAipLeEM8SbnLqWAXiP5KocF8Uv4POELUVFsD10LaQnnOmeBUgMlAREijwrhDT0IcRD3Cs1vDekRSQc9A9lJngCpBwULFR05FbkmFGKwCw05ewb/GvoLkyazEy17AAXXGiUGUQEtGwMA0y7rhbRaNVwgT2MGBwspI8sUrFAkDSlAu3hMGh8HGSWtApVDdEqLUToelyH6PEENai4XUYAH+TwJGVMLhTyiRq9FEhHWPpE9TCJNTDAEOYMsMyePCdMPiQy9fHYBXQklCbUMdRM1ERs3yQg9Bx0xlygnGQglRplgngT7owP3E9UDDwVDCUUHFwO5HDETMhUtBRGBKNsC9zbZLrcCk1aEARsFzw8pH+MQVEfkDu0InwJpA4cl7wAxFSUAGyKfCEdnAGOP3FMJLs8Iy2pwI3gDaxTrZRF3B5UOWwerHDcVwxzlcMxeD4YMKKezCV8BeQmdAWME5wgNNV+MpCBFZ1eLXBifIGVBQ14AAjUMaRWjRMGHfAKPD28SHwE5AXcHPQ0FAnsR8RFvEJkI74YINbkz/DopBFMhhyAVCisDU2zSCysm/Qz8bQGnEmYDEDRBd/Jnr2C6KBgBBx0yyUFkIfULlk/RDKAaxRhGVDIZ6AfDA/ca9yfuQVsGAwOnBxc6UTPyBMELbQiPCUMATQ6nGwfbGG4KdYzUATWPAbudA1uVhwJzkwY7Bw8Aaw+LBX3pACECqwinAAkA0wNbAD0CsQehAB0AiUUBQQMrMwEl6QKTA5cINc8BmTMB9y0EH8cMGQD7O25OAsO1AoBuZqYF4VwCkgJNOQFRKQQJUktVA7N15QDfAE8GF+NLARmvTs8e50cB43MvAMsA/wAJOQcJRQHRAfdxALsBYws1Caa3uQFR7S0AhwAZbwHbAo0A4QA5AIP1AVcAUQVd/QXXAlNNARU1HC9bZQG/AyMBNwERAH0Gz5GpzQsjBHEH1wIQHxXlAu8yB7kFAyLjE9FCyQK94lkAMhoKPAqrCqpgX2Q3CjV2PVQAEh+sPss/UgVVO1c7XDtXO1w7VztcO1c7XDtXO1wDm8Pmw+YKcF9JYe8Mqg3YRMw6TRPfYFVgNhPMLbsUxRXSJVoZQRrAJwkl6FUNDwgt12Y0CDA0eRfAAEMpbINFY4oeNApPHOtTlVT8LR8AtUumM7MNsBsZREQFS3XxYi4WEgomAmSFAmJGX1GzAV83JAKh+wJonAJmDQKfiDgfDwJmPwJmKgRyBIMDfxcDfpY5Cjl7GzmGOicnAmwhAjI6OA4CbcsCbbLzjgM3a0kvAWsA4gDlAE4JB5wMkQECD8YAEbkCdzMCdqZDAnlPRwJ4viFg30WyRvcCfEMCeswCfQ0CfPRIBEiBZygALxlJXEpfGRtK0ALRBQLQ0EsrA4hTA4fqRMmRNgLypV0HAwOyS9JMMSkH001QTbMCi0MCitzFHwshR2sJuwKOOwKOYESbhQKO3QKOYHxRuFM5AQ5S2FSJApP/ApMQAO0AIFUiVbNV1AosHymZijLleGpFPz0Cl6MC77ZYJawAXSkClpMCloCgAK1ZsFoNhVEAPwKWuQKWUlxIXNUCmc8CmWhczl0LHQKcnznGOqECnBoCn58CnryOACETNS4TAp31Ap6WALlBYThh8wKe1wKgcgGtAp6jIwKeUqljzGQrKS8CJ7MCJoICoP8CoFDbAqYzAqXSAqgDAIECp/ZogGi1AAdNaiBq1QKs5wKssgKtawKtBgJXIQJV4AKx5dsDH1JsmwKywRECsuwbbORtZ21MYwMl0QK2YD9DbpQDKUkCuGICuUsZArkue3A6cOUCvR0DLbYDMhUCvoxyBgMzdQK+HnMmc1MCw88CwwhzhnRPOUl05AM8qwEDPJ4DPcMCxYACxksCxhSNAshtVQLISALJUwLJMgJkoQLd1nh9ZXiyeSlL1AMYp2cGAmH4GfeVKHsPXpZevxUCz28Cz3AzT1fW9xejAMqxAs93AS3uA04Wfk8JAtwrAtuOAtJTA1JgA1NjAQUDVZCAjUMEzxrxZEl5A4LSg5EC2ssC2eKEFIRNp0ADhqkAMwNkEoZ1Xf0AWQLfaQLevHd7AuIz7RgB8zQrAfSfAfLWiwLr9wLpdH0DAur9AuroAP1LAb0C7o0C66CWrpcHAu5DA4XkmH1w5HGlAvMHAG0DjhqZlwL3FwORcgOSiwL3nAL53QL4apogmq+/O5siA52HAv7+AR8APZ8gAZ+3AwWRA6ZuA6bdANXJAwZuoYyiCQ0DDE0BEwEjB3EGZb1rCQC/BG/DFY8etxEAG3k9ACcDNxJRA42DAWcrJQCM8wAlAOanC6OVCLsGI6fJBgCvBRnDBvElRUYFFoAFcD9GSDNCKUK8X3kZX8QAls0FOgCQVCGbwTsuYDoZutcONxjOGJHJ/gVfBWAFXwVgBWsFYAVfBWAFXwVgBV8FYAVfBWBOHQjfjW8KCgoKbF7xMwTRA7kGN8PDAMMEr8MA70gxFroFTj5xPnhCR0K+X30/X/AAWBkzswCNBsxzzASm70aCRS4rDDMeLz49fnXfcsH5GcoscQFz13Y4HwVnBXLJycnACNdRYwgICAqEXoWTxgA7P4kACxbZBu21Kw0AjMsTAwkVAOVtJUUsJ1JCuULESUArXy9gPi9AKwnJRQYKTD9LPoA+iT54PnkCkULEUUpDX9NWV3JVEjQAc1w3A3IBE3YnX+g7QiMJb6MKaiszRCUuQrNCxDPMCcwEX9EWJzYREBEEBwIHKn6l33JCNVIfybPJtAltydPUCmhBZw/tEKsZAJOVJU1CLRuxbUHOQAo7P0s+eEJHHA8SJVRPdGM0NVrpvBoKhfUlM0JHHGUQUhEWO1xLSj8MO0ucNAqJIzVCRxv9EFsqKyA4OQgNj2nwZgp5ZNFgE2A1K3YHS2AhQQojJmC7DgpzGG1WYFUZCQYHZO9gHWCdYIVgu2BTYJlwFh8GvRbcXbG8YgtDHrMBwzPVyQonHQgkCyYBgQJ0Ajc4nVqIAwGSCsBPIgDsK3SWEtIVBa5N8gGjAo+kVwVIZwD/AEUSCDweX4ITrRQsJ8K3TwBXFDwEAB0TvzVcAtoTS20RIwDgVgZ9BBImYgA5AL4Coi8LFnezOkCnIQFjAY4KBAPh9RcGsgZSBsEAJctdsWIRu2kTkQstRw7DAcMBKgpPBGIGMDAwKCYnKTQaLg4AKRSVAFwCdl+YUZ0JdicFD3lPAdt1F9ZZKCGxuE3yBxkFVGcA/wBFEgiCBwAOLHQSjxOtQDg1z7deFRMAZ8QTAGtKb1ApIiPHADkAvgKiLy1DFtYCmBiDAlDDWNB0eo7fpaMO/aEVRRv0ATEQZBIODyMEAc8JQhCbDRgzFD4TAEMAu9YBCgCsAOkAm5I3ABwAYxvONnR+MhXJAxgKQyxL2+kkJhMbhQKDBMkSsvF0AD9BNQ6uQC7WqSQHwxEAEEIu1hkhAH2z4iQPwyJPHNWpdyYBRSpnJALzoBAEVPPsH20MxA0CCEQKRgAFyAtFAlMNwwjEDUQJRArELtapMg7DDZgJIw+TGukEIwvDFkMAqAtDEMMMBhioe+QAO3MMRAACrgnEBSPY9Q0FDnbSBoMAB8MSYxkSxAEJAPIJAAB8FWMOFtMc/HcXwxhDAC7DAvOowwAewwJdKDKHAAHDAALrFUQVwwAbwyvzpWMWv8wA/ABpAy++bcYDUKPD0KhDCwKmJ1MAAmMA5+UZwxAagwipBRL/eADfw6fDGOMCGsOjk3l6BwOpo4sAEsMOGxMAA5sAbcMOAAvDp0MJGkMDwgipnNIPAwfIqUMGAOGDAAPzABXDAAcDAAnDAGmTABrDAA7DChjDjnEWAwABYwAOcwAuUyYABsMAF8MIKQANUgC6wy4AA8MADqMq8wCyYgAcIwAB8wqpAAXOCx0V4wAHowBCwwEKAGnDAAuDAB3DAAjDCakABdIAbqcZ3QCZCCkABdIAAAFDAAfjAB2jCCkABqIACYMAGzMAbSMA5sOIAAhjAAhDABTDBAkpAAbSAOOTAAlDC6kOzPtnAAdDAG6kQFAATwAKwwwAA0MACbUDPwAHIwAZgwACE6cDAAojAApDAAoDp/MGwwAJIwADEwAQQwgAFEMAEXMAD5MADfMADcMAGRMOFiMAFUMAbqMWuwHDAMIAE0MLAGkzEgDhUwACQwAEWgAXgwUjAAbYABjDBSYBgzBaAEFNALcQBxUMegAwMngBrA0IZgJ0KxQHBREPd1N0ZzKRJwaIHAZqNT4DqQq8BwngAB4DAwt2AX56T1ocKQNXAh1GATQGC3tOxYNagkgAMQA5CQADAQEAWxLjAIOYNAEzAH7tFRk6TglSAF8NAAlYAQ+S1ACAQwQorQBiAN4dAJ1wPyeTANVzuQDX3AIeEMp9eyMgXiUAEdkBkJizKltbVVAaRMqRAAEAhyQ/SDEz6BmfVwB6ATEsOClKIRcDOF0E/832AFNt5AByAnkCRxGCOs94NjXdAwINGBonDBwPALW2AwICAgAAAAAAAAYDBQMDARrUAwAtAAAAAgEGBgYGBgYFBQUFBQUEBQYHCAkEBQUFBQQAAAICAAAAIgCNAJAAlT0A6gC7ANwApEQAwgCyAK0AqADuAKYA2gCjAOcBCAEDAMcAgQBiANIA1AEDAN4A8gCQAKkBMQDqAN8A3AsBCQ8yO9ra2tq8xuLT1tRJOB0BUgFcNU0BWgFpAWgBWwFMUUlLbhMBUxsNEAs6PhMOACcUKy0vMj5AQENDQ0RFFEYGJFdXV1dZWVhZL1pbXVxcI2NnZ2ZoZypsbnZ1eHh4eHh4enp6enp6enp6enp8fH18e2IARPIASQCaAHgAMgBm+ACOAFcAVwA3AnbvAIsABfj4AGQAk/IAnwBPAGIAZP//sACFAIUAaQBWALEAJAC2AIMCQAJDAPwA5wD+AP4A6AD/AOkA6QDoAOYALwJ7AVEBQAE+AVQBPgE+AT4BOQE4ATgBOAEcAVgXADEQCAEAUx8SHgsdHhYAjgCWAKYAUQBqIAIxAHYAbwCXAxUDJzIDIUlGTzEAkQJPAMcCVwKkAMAClgKWApYClgKWApYCiwKWApYClgKWApYClgKVApUCmAKgApcClgKWApQClAKUApQCkgKVAnUB1AKXAp8ClgKWApUeAIETBQD+DQOfAmECOh8BVBg9AuIZEjMbAU4/G1WZAXusRAFpYQEFA0FPAQYAmTEeIJdyADFoAHEANgCRA5zMk/C2jGINwjMWygIZCaXdfDILBCs5dAE7YnQBugDlhoiHhoiGiYqKhouOjIaNkI6Ij4qQipGGkoaThpSSlYaWhpeKmIaZhpqGm4aci52QnoqfhuIC4XTpAt90AIp0LHSoAIsAdHQEQwRABEIERQRDBEkERgRBBEcESQRIBEQERgRJAJ5udACrA490ALxuAQ10ANFZdHQA13QCFHQA/mJ0AP4BIQD+APwA/AD9APwDhGZ03ASMK23HAP4A/AD8AP0A/CR0dACRYnQA/gCRASEA/gCRAvQA/gCRA4RmdNwEjCttxyR0AP9idAEhAP4A/gD8APwA/QD8AP8A/AD8AP0A/AOEZnTcBIwrbcckdHQAkWJ0ASEA/gCRAP4AkQL0AP4AkQOEZnTcBIwrbcckdAJLAT50AlIBQXQCU8l0dAJfdHQDpgL0A6YDpgOnA6cDpwOnA4RmdNwEjCttxyR0dACRYnQBIQOmAJEDpgCRAvQDpgCRA4RmdNwEjCttxyR0BDh0AJEEOQCRDpU5dSgCADR03gV2CwArdAEFAM5iCnR0AF1iAAYcOgp0dACRCnQAXAEIwWZ0CnRmdHQAkWZ0CnRmdEXgAFF03gp0dEY0tlT2u3SOAQTwscwhjZZKrhYcBSfFp9XNbKiVDOD2b+cpe4/Z17mQnbtzzhaeQtE2GGj0IDNTjRUSyTxxw/RPHW/+vS7d1NfRt9z9QPZg4X7QFfhCnkvgNPIItOsC2eV6hPannZNHlZ9xrwZXIMOlu3jSoQSq78WEjwLjw1ELSlF1aBvfzwk5ZX7AUvQzjPQKbDuQ+sm4wNOp4A6AdVuRS0t1y/DZpg4R6m7FNjM9HgvW7Bi88zaMjOo6lM8wtBBdj8LP4ylv3zCXPhebMKJc066o9sF71oFW/8JXu86HJbwDID5lzw5GWLR/LhT0Qqnp2JQxNZNfcbLIzPy+YypqRm/lBmGmex+82+PisxUumSeJkALIT6rJezxMH+CTJmQtt5uwTVbL3ptmjDUQzlSIvWi8Tl7ng1NpuRn1Ng4n14Qc+3Iil7OwkvNWogLSPkn3pihIFytyIGmMhOe3n1tWsuMy9BdKyqF4Z3v2SgggTL9KVvMXPnCbRe+oOuFFP3HejBG/w9gvmfNYvg6JuWia2lcSSN1uIjBktzoIazOHPJZ7kKHPz8mRWVdW3lA8WGF9dQF6Bm673boov3BUWDU2JNcahR23GtfHKLOz/viZ+rYnZFaIznXO67CYEJ1fXuTRpZhYZkKe54xeoagkNGLs+NTZHE0rX45/XvQ2RGADX6vcAvdxIUBV27wxGm2zjZo4X3ILgAlrOFheuZ6wtsvaIj4yLY7qqawlliaIcrz2G+c3vscAnCkCuMzMmZvMfu9lLwTvfX+3cVSyPdN9ZwgDZhfjRgNJcLiJ67b9xx8JHswprbiE3v9UphotAPIgnXVIN5KmMc0piXhc6cChPnN+MRhG9adtdttQTTwSIpl8I4/j//d3sz1326qTBTpPRM/Hgh3kzqEXs8ZAk4ErQhNO8hzrQ0DLkWMA/N+91tn2MdOJnWC2FCZehkQrwzwbKOjhvZsbM95QoeL9skYyMf4srVPVJSgg7pOLUtr/n9eT99oe9nLtFRpjA9okV2Kj8h9k5HaC0oivRD8VyXkJ81tcd4fHNXPCfloIQasxsuO18/46dR2jgul/UIet2G0kRvnyONMKhHs6J26FEoqSqd+rfYjeEGwHWVDpX1fh1jBBcKGMqRepju9Y00mDVHC+Xdij/j44rKfvfjGinNs1jO/0F3jB83XCDINN/HB84axlP+3E/klktRo+vl3U/aiyMJbIodE1XSsDn6UAzIoMtUObY2+k/4gY/l+AkZJ5Sj2vQrkyLm3FoxjhDX+31UXBFf9XrAH31fFqoBmDEZvhvvpnZ87N+oZEu7U9O/nnk+QWj3x8uyoRbEnf+O5UMr9i0nHP38IF5AvzrBW8YWBUR0mIAzIvndQq9N3v/Jto3aPjPXUPl8ASdPPyAp7jENf8bk7VMM9ol9XGmlBmeDMuGqt+WzuL6CXAxXjIhCPM5vACchgMJ/8XBGLO/D1isVvGhwwHHr1DLaI5mn2Jr/b1pUD90uciDaS8cXNDzCWvNmT/PhQe5e8nTnnnkt8Ds/SIjibcum/fqDhKopxAY8AkSrPn+IGDEKOO+U3XOP6djFs2H5N9+orhOahiQk5KnEUWa+CzkVzhp8bMHRbg81qhjjXuIKbHjSLSIBKWqockGtKinY+z4/RdBUF6pcc3JmnlxVcNgrI4SEzKUZSwcD2QCyxzKve+gAmg6ZuSRkpPFa6mfThu7LJNu3H5K42uCpNvPAsoedolKV/LHe/eJ+BbaG5MG0NaSGVPRUmNFMFFSSpXEcXwbVh7UETOZZtoVNRGOIbbkig3McEtR68cG0RZAoJevWYo7Dg/lZ1CQzblWeUvVHmr8fY4Nqd9JJiH/zEX24mJviH60fAyFr0A3c4bC1j3yZU60VgJxXn8JgJXLUIsiBnmKmMYz+7yBQFBvqb2eYnuW59joZBf56/wXvWIR4R8wTmV80i1mZy+S4+BUES+hzjk0uXpC///z/IlqHZ1monzlXp8aCfhGKMti73FI1KbL1q6IKO4fuBuZ59gagjn5xU79muMpHXg6S+e+gDM/U9BKLHbl9l6o8czQKl4RUkJJiqftQG2i3BMg/TQlUYFkJDYBOOvAugYuzYSDnZbDDd/aSd9x0Oe6F+bJcHfl9+gp6L5/TgA+BdFFovbfCrQ40s5vMPw8866pNX8zyFGeFWdxIpPVp9Rg1UPOVFbFZrvaFq/YAzHQgqMWpahMYfqHpmwXfHL1/kpYmGuHFwT55mQu0dylfNuq2Oq0hTMCPwqfxnuBIPLXfci4Y1ANy+1CUipQxld/izVh16WyG2Q0CQQ9NqtAnx1HCHwDj7sYxOSB0wopZSnOzxQOcExmxrVTF2BkOthVpGfuhaGECfCJpJKpjnihY+xOT2QJxN61+9K6QSqtv2Shr82I3jgJrqBg0wELFZPjvHpvzTtaJnLK6Vb97Yn933koO/saN7fsjwNKzp4l2lJVx2orjCGzC/4ZL4zCver6aQYtC5sdoychuFE6ufOiog+VWi5UDkbmvmtah/3aArEBIi39s5ILUnlFLgilcGuz9CQshEY7fw2ouoILAYPVT/gyAIq3TFAIwVsl+ktkRz/qGfnCDGrm5gsl/l9QdvCWGsjPz3dU7XuqKfdUrr/6XIgjp4rey6AJBmCmUJMjITHVdFb5m1p+dLMCL8t55zD42cmftmLEJC0Da04YiRCVUBLLa8D071/N5UBNBXDh0LFsmhV/5B5ExOB4j3WVG/S3lfK5o+V6ELHvy6RR9n4ac+VsK4VE4yphPvV+kG9FegTBH4ZRXL2HytUHCduJazB/KykjfetYxOXTLws267aGOd+I+JhKP//+VnXmS90OD/jvLcVu0asyqcuYN1mSb6XTlCkqv1vigZPIYwNF/zpWcT1GR/6aEIRjkh0yhg4LXJfaGobYJTY4JI58KiAKgmmgAKWdl5nYCeLqavRJGQNuYuZtZFGx+IkI4w4NS2xwbetNMunOjBu/hmKCI/w7tfiiyUd//4rbTeWt4izBY8YvGIN6vyKYmP/8X8wHKCeN+WRcKM70+tXKNGyevU9H2Dg5BsljnTf8YbsJ1TmMs74Ce2XlHisleguhyeg44rQOHZuw/6HTkhnnurK2d62q6yS7210SsAIaR+jXMQA+svkrLpsUY+F30Uw89uOdGAR6vo4FIME0EfVVeHTu6eKicfhSqOeXJhbftcd08sWEnNUL1C9fnprTgd83IMut8onVUF0hvqzZfHduPjbjwEXIcoYmy+P6tcJZHmeOv6VrvEdkHDJecjHuHeWANe79VG662qTjA/HCvumVv3qL+LrOcpqGps2ZGwQdFJ7PU4iuyRlBrwfO+xnPyr47s2cXVbWzAyznDiBGjCM3ksxjjqM62GE9C8f5U38kB3VjtabKp/nRdvMESPGDG90bWRLAt1Qk5DyLuazRR1YzdC1c+hZXvAWV8xA72S4A8B67vjVhbba3MMop293FeEXpe7zItMWrJG/LOH9ByOXmYnNJfjmfuX9KbrpgLOba4nZ+fl8Gbdv/ihv+6wFGKHCYrVwmhFC0J3V2bn2tIB1wCc1CST3d3X2OyxhguXcs4sm679UngzofuSeBewMFJboIQHbUh/m2JhW2hG9DIvG2t7yZIzKBTz9wBtnNC+2pCRYhSIuQ1j8xsz5VvqnyUIthvuoyyu7fNIrg/KQUVmGQaqkqZk/Vx5b33/gsEs8yX7SC1J+NV4icz6bvIE7C5G6McBaI8rVg56q5QBJWxn/87Q1sPK4+sQa8fLU5gXo4paaq4cOcQ4wR0VBHPGjKh+UlPCbA1nLXyEUX45qZ8J7/Ln4FPJE2TdzD0Z8MLSNQiykMMmSyOCiFfy84Rq60emYB2vD09KjYwsoIpeDcBDTElBbXxND72yhd9pC/1CMid/5HUMvAL27OtcIJDzNKpRPNqPOpyt2aPGz9QWIs9hQ9LiX5s8m9hjTUu/f7MyIatjjd+tSfQ3ufZxPpmJhTaBtZtKLUcfOCUqADuO+QoH8B9v6U+P0HV1GLQmtoNFTb3s74ivZgjES0qfK+8RdGgBbcCMSy8eBvh98+et1KIFqSe1KQPyXULBMTsIYnysIwiZBJYdI20vseV+wuJkcqGemehKjaAb9L57xZm3g2zX0bZ2xk/fU+bCo7TlnbW7JuF1YdURo/2Gw7VclDG1W7LOtas2LX4upifZ/23rzpsnY/ALfRgrcWP5hYmV9VxVOQA1fZvp9F2UNU+7d7xRyVm5wiLp3/0dlV7vdw1PMiZrbDAYzIVqEjRY2YU03sJhPnlwIPcZUG5ltL6S8XCxU1eYS5cjr34veBmXAvy7yN4ZjArIG0dfD/5UpBNlX1ZPoxJOwyqRi3wQWtOzd4oNKh0LkoTm8cwqgIfKhqqGOhwo71I+zXnMemTv2B2AUzABWyFztGgGULjDDzWYwJUVBTjKCn5K2QGMK1CQT7SzziOjo+BhAmqBjzuc3xYym2eedGeOIRJVyTwDw37iCMe4g5Vbnsb5ZBdxOAnMT7HU4DHpxWGuQ7GeiY30Cpbvzss55+5Km1YsbD5ea3NI9QNYIXol5apgSu9dZ8f8xS5dtHpido5BclDuLWY4lhik0tbJa07yJhH0BOyEut/GRbYTS6RfiTYWGMCkNpfSHi7HvdiTglEVHKZXaVhezH4kkXiIvKopYAlPusftpE4a5IZwvw1x/eLvoDIh/zpo9FiQInsTb2SAkKHV42XYBjpJDg4374XiVb3ws4qM0s9eSQ5HzsMU4OZJKuopFjBM+dAZEl8RUMx5uU2N486Kr141tVsGQfGjORYMCJAMsxELeNT4RmWjRcpdTGBwcx6XN9drWqPmJzcrGrH4+DRc7+n1w3kPZwu0BkNr6hQrqgo7JTB9A5kdJ/H7P4cWBMwsmuixAzJB3yrQpnGIq90lxAXLzDCdn1LPibsRt7rHNjgQBklRgPZ8vTbjXdgXrTWQsK5MdrXXQVPp0Rinq3frzZKJ0qD6Qhc40VzAraUXlob1gvkhK3vpmHgI6FRlQZNx6eRqkp0zy4AQlX813fAPtL3jMRaitGFFjo0zmErloC+h+YYdVQ6k4F/epxAoF0BmqEoKNTt6j4vQZNQ2BoqF9Vj53TOIoNmDiu9Xp15RkIgQIGcoLpfoIbenzpGUAtqFJp5W+LLnx38jHeECTJ/navKY1NWfN0sY1T8/pB8kIH3DU3DX+u6W3YwpypBMYOhbSxGjq84RZ84fWJow8pyHqn4S/9J15EcCMsXqrfwyd9mhiu3+rEo9pPpoJkdZqHjra4NvzFwuThNKy6hao/SlLw3ZADUcUp3w3SRVfW2rhl80zOgTYnKE0Hs2qp1J6H3xqPqIkvUDRMFDYyRbsFI3M9MEyovPk8rlw7/0a81cDVLmBsR2ze2pBuKb23fbeZC0uXoIvDppfTwIDxk1Oq2dGesGc+oJXWJLGkOha3CX+DUnzgAp9HGH9RsPZN63Hn4RMA5eSVhPHO+9RcRb/IOgtW31V1Q5IPGtoxPjC+MEJbVlIMYADd9aHYWUIQKopuPOHmoqSkubnAKnzgKHqgIOfW5RdAgotN6BN+O2ZYHkuemLnvQ8U9THVrS1RtLmKbcC7PeeDsYznvqzeg6VCNwmr0Yyx1wnLjyT84BZz3EJyCptD3yeueAyDWIs0L2qs/VQ3HUyqfrja0V1LdDzqAikeWuV4sc7RLIB69jEIBjCkyZedoUHqCrOvShVzyd73OdrJW0hPOuQv2qOoHDc9xVb6Yu6uq3Xqp2ZaH46A7lzevbxQEmfrzvAYSJuZ4WDk1Hz3QX1LVdiUK0EvlAGAYlG3Md30r7dcPN63yqBCIj25prpvZP0nI4+EgWoFG95V596CurXpKRBGRjQlHCvy5Ib/iW8nZJWwrET3mgd6mEhfP4KCuaLjopWs7h+MdXFdIv8dHQJgg1xi1eYqB0uDYjxwVmri0Sv5XKut/onqapC+FQiC2C1lvYJ9MVco6yDYsS3AANUfMtvtbYI2hfwZatiSsnoUeMZd34GVjkMMKA+XnjJpXgRW2SHTZplVowPmJsvXy6w3cfO1AK2dvtZEKTkC/TY9LFiKHCG0DnrMQdGm2lzlBHM9iEYynH2UcVMhUEjsc0oDBTgo2ZSQ1gzkAHeWeBXYFjYLuuf8yzTCy7/RFR81WDjXMbq2BOH5dURnxo6oivmxL3cKzKInlZkD31nvpHB9Kk7GfcfE1t+1V64b9LtgeJGlpRFxQCAqWJ5DoY77ski8gsOEOr2uywZaoO/NGa0X0y1pNQHBi3b2SUGNpcZxDT7rLbBf1FSnQ8guxGW3W+36BW0gBje4DOz6Ba6SVk0xiKgt+q2JOFyr4SYfnu+Ic1QZYIuwHBrgzr6UvOcSCzPTOo7D6IC4ISeS7zkl4h+2VoeHpnG/uWR3+ysNgPcOIXQbv0n4mr3BwQcdKJxgPSeyuP/z1Jjg4e9nUvoXegqQVIE30EHx5GHv+FAVUNTowYDJgyFhf5IvlYmEqRif6+WN1MkEJmDcQITx9FX23a4mxy1AQRsOHO/+eImX9l8EMJI3oPWzVXxSOeHU1dUWYr2uAA7AMb+vAEZSbU3qob9ibCyXeypEMpZ6863o6QPqlqGHZkuWABSTVNd4cOh9hv3qEpSx2Zy/DJMP6cItEmiBJ5PFqQnDEIt3NrA3COlOSgz43D7gpNFNJ5MBh4oFzhDPiglC2ypsNU4ISywY2erkyb1NC3Qh/IfWj0eDgZI4/ln8WPfBsT3meTjq1Uqt1E7Zl/qftqkx6aM9KueMCekSnMrcHj1CqTWWzEzPsZGcDe3Ue4Ws+XFYVxNbOFF8ezkvQGR6ZOtOLU2lQEnMBStx47vE6Pb7AYMBRj2OOfZXfisjJnpTfSNjo6sZ6qSvNxZNmDeS7Gk3yYyCk1HtKN2UnhMIjOXUzAqDv90lx9O/q/AT1ZMnit5XQe9wmQxnE/WSH0CqZ9/2Hy+Sfmpeg8RwsHI5Z8kC8H293m/LHVVM/BA7HaTJYg5Enk7M/xWpq0192ACfBai2LA/qrCjCr6Dh1BIMzMXINBmX96MJ5Hn2nxln/RXPFhwHxUmSV0EV2V0jm86/dxxuYSU1W7sVkEbN9EzkG0QFwPhyHKyb3t+Fj5WoUUTErcazE/N6EW6Lvp0d//SDPj7EV9UdJN+Amnf3Wwk3A0SlJ9Z00yvXZ7n3z70G47Hfsow8Wq1JXcfwnA+Yxa5mFsgV464KKP4T31wqIgzFPd3eCe3j5ory5fBF2hgCFyVFrLzI9eetNXvM7oQqyFgDo4CTp/hDV9NMX9JDHQ/nyHTLvZLNLF6ftn2OxjGm8+PqOwhxnPHWipkE/8wbtyri80Sr7pMNkQGMfo4ZYK9OcCC4ESVFFbLMIvlxSoRqWie0wxqnLfcLSXMSpMMQEJYDVObYsXIQNv4TGNwjq1kvT1UOkicTrG3IaBZ3XdScS3u8sgeZPVpOLkbiF940FjbCeNRINNvDbd01EPBrTCPpm12m43ze1bBB59Ia6Ovhnur/Nvx3IxwSWol+3H2qfCJR8df6aQf4v6WiONxkK+IqT4pKQrZK/LplgDI/PJZbOep8dtbV7oCr6CgfpWa8NczOkPx81iSHbsNhVSJBOtrLIMrL31LK9TqHqAbAHe0RLmmV806kRLDLNEhUEJfm9u0sxpkL93Zgd6rw+tqBfTMi59xqXHLXSHwSbSBl0EK0+loECOPtrl+/nsaFe197di4yUgoe4jKoAJDXc6DGDjrQOoFDWZJ9HXwt8xDrQP+7aRwWKWI1GF8s8O4KzxWBBcwnl3vnl1Oez3oh6Ea1vjR7/z7DDTrFtqU2W/KAEzAuXDNZ7MY73MF216dzdSbWmUp4lcm7keJfWaMHgut9x5C9mj66Z0lJ+yhsjVvyiWrfk1lzPOTdhG15Y7gQlXtacvI7qv/XNSscDwqkgwHT/gUsD5yB7LdRRvJxQGYINn9hTpodKFVSTPrtGvyQw+HlRFXIkodErAGu9Iy1YpfSPc3jkFh5CX3lPxv7aqjE/JAfTIpEjGb/H7MO0e2vsViSW1qa/Lmi4/n4DEI3g7lYrcanspDfEpKkdV1OjSLOy0BCUqVoECaB55vs06rXl4jqmLsPsFM/7vYJ0vrBhDCm/00A/H81l1uekJ/6Lml3Hb9+NKiLqATJmDpyzfYZFHumEjC662L0Bwkxi7E9U4cQA0XMVDuMYAIeLMPgQaMVOd8fmt5SflFIfuBoszeAw7ow5gXPE2Y/yBc/7jExARUf/BxIHQBF5Sn3i61w4z5xJdCyO1F1X3+3ax+JSvMeZ7S6QSKp1Fp/sjYz6Z+VgCZzibGeEoujryfMulH7Rai5kAft9ebcW50DyJr2uo2z97mTWIu45YsSnNSMrrNUuG1XsYBtD9TDYzQffKB87vWbkM4EbPAFgoBV4GQS+vtFDUqOFAoi1nTtmIOvg38N4hT2Sn8r8clmBCXspBlMBYTnrqFJGBT3wZOzAyJDre9dHH7+x7qaaKDOB4UQALD5ecS0DE4obubQEiuJZ0EpBVpLuYcce8Aa4PYd/V4DLDAJBYKQPCWTcrEaZ5HYbJi11Gd6hjGom1ii18VHYnG28NKpkz2UKVPxlhYSp8uZr367iOmoy7zsxehW9wzcy2zG0a80PBMCRQMb32hnaHeOR8fnNDzZhaNYhkOdDsBUZ3loDMa1YP0uS0cjUP3b/6DBlqmZOeNABDsLl5BI5QJups8uxAuWJdkUB/pO6Zax6tsg7fN5mjjDgMGngO+DPcKqiHIDbFIGudxtPTIyDi9SFMKBDcfdGQRv41q1AqmxgkVfJMnP8w/Bc7N9/TR6C7mGObFqFkIEom8sKi2xYqJLTCHK7cxzaZvqODo22c3wisBCP4HeAgcRbNPAsBkNRhSmD48dHupdBRw4mIvtS5oeF6zeT1KMCyhMnmhpkFAGWnGscoNkwvQ8ZM5lE/vgTHFYL99OuNxdFBxTEDd5v2qLR8y9WkXsWgG6kZNndFG+pO/UAkOCipqIhL3hq7cRSdrCq7YhUsTocEcnaFa6nVkhnSeRYUA1YO0z5itF9Sly3VlxYDw239TJJH6f3EUfYO5lb7bcFcz8Bp7Oo8QmnsUHOz/fagVUBtKEw1iT88j+aKkv8cscKNkMxjYr8344D1kFoZ7/td1W6LCNYN594301tUGRmFjAzeRg5vyoM1F6+bJZ/Q54jN/k8SFd3DxPTYaAUsivsBfgTn7Mx8H2SpPt4GOdYRnEJOH6jHM2p6SgB0gzIRq6fHxGMmSmqaPCmlfwxiuloaVIitLGN8wie2CDWhkzLoCJcODh7KIOAqbHEvXdUxaS4TTTs07Clzj/6GmVs9kiZDerMxEnhUB6QQPlcfqkG9882RqHoLiHGBoHfQuXIsAG8GTAtao2KVwRnvvam8jo1e312GQAKWEa4sUVEAMG4G6ckcONDwRcg1e2D3+ohXgY4UAWF8wHKQMrSnzCgfFpsxh+aHXMGtPQroQasRY4U6UdG0rz1Vjbka0MekOGRZQEvqQFlxseFor8zWFgHek3v29+WqN6gaK5gZOTOMZzpQIC1201LkMCXild3vWXSc5UX9xcFYfbRPzGFa1FDcPfPB/jUEq/FeGt419CI3YmBlVoHsa4KdcwQP5ZSwHHhFJ7/Ph/Rap/4vmG91eDwPP0lDfCDRCLszTqfzM71xpmiKi2HwS4WlqvGNwtvwF5Dqpn6KTq8ax00UMPkxDcZrEEEsIvHiUXXEphdb4GB4FymlPwBz4Gperqq5pW7TQ6/yNRhW8VT5NhuP0udlxo4gILq5ZxAZk8ZGh3g4CqxJlPKY7AQxupfUcVpWT5VItp1+30UqoyP4wWsRo3olRRgkWZZ2ZN6VC3OZFeXB8NbnUrSdikNptD1QiGuKkr8EmSR/AK9Rw+FF3s5uwuPbvHGiPeFOViltMK7AUaOsq9+x9cndk3iJEE5LKZRlWJbKOZweROzmPNVPkjE3K/TyA57Rs68TkZ3MR8akKpm7cFjnjPd/DdkWjgYoKHSr5Wu5ssoBYU4acRs5g2DHxUmdq8VXOXRbunD8QN0LhgkssgahcdoYsNvuXGUK/KXD/7oFb+VGdhqIn02veuM5bLudJOc2Ky0GMaG4W/xWBxIJcL7yliJOXOpx0AkBqUgzlDczmLT4iILXDxxtRR1oZa2JWFgiAb43obrJnG/TZC2KSK2wqOzRZTXavZZFMb1f3bXvVaNaK828w9TO610gk8JNf3gMfETzXXsbcvRGCG9JWQZ6+cDPqc4466Yo2RcKH+PILeKOqtnlbInR3MmBeGG3FH10yzkybuqEC2HSQwpA0An7d9+73BkDUTm30bZmoP/RGbgFN+GrCOfADgqr0WbI1a1okpFms8iHYw9hm0zUvlEMivBRxModrbJJ+9/p3jUdQQ9BCtQdxnOGrT5dzRUmw0593/mbRSdBg0nRvRZM5/E16m7ZHmDEtWhwvfdZCZ8J8M12W0yRMszXamWfQTwIZ4ayYktrnscQuWr8idp3PjT2eF/jmtdhIfcpMnb+IfZY2FebW6UY/AK3jP4u3Tu4zE4qlnQgLFbM19EBIsNf7KhjdbqQ/D6yiDb+NlEi2SKD+ivXVUK8ib0oBo366gXkR8ZxGjpJIDcEgZPa9TcYe0TIbiPl/rPUQDu3XBJ9X/GNq3FAUsKsll57DzaGMrjcT+gctp+9MLYXCq+sqP81eVQ0r9lt+gcQfZbACRbEjvlMskztZG8gbC8Qn9tt26Q7y7nDrbZq/LEz7kR6Jc6pg3N9rVX8Y5MJrGlML9p9lU4jbTkKqCveeZUJjHB03m2KRKR2TytoFkTXOLg7keU1s1lrPMQJpoOKLuAAC+y1HlJucU6ysB5hsXhvSPPLq5J7JtnqHKZ4vYjC4Vy8153QY+6780xDuGARsGbOs1WqzH0QS765rnSKEbbKlkO8oI/VDwUd0is13tKpqILu1mDJFNy/iJAWcvDgjxvusIT+PGz3ST/J9r9Mtfd0jpaGeiLYIqXc7DiHSS8TcjFVksi66PEkxW1z6ujbLLUGNNYnzOWpH8BZGK4bCK7iR+MbIv8ncDAz1u4StN3vTTzewr9IQjk9wxFxn+6N1ddKs0vffJiS08N3a4G1SVrlZ97Q/M+8G9fe5AP6d9/Qq4WRnORVhofPIKEdCr3llspUfE0oKIIYoByBRPh+bX1HLS3JWGJRhIvE1aW4NTd8ePi4Z+kXb+Z8snYfSNcqijhAgVsx4RCM54cXUiYkjeBmmC4ajOHrChoELscJJC7+9jjMjw5BagZKlgRMiSNYz7h7vvZIoQqbtQmspc0cUk1G/73iXtSpROl5wtLgQi0mW2Ex8i3WULhcggx6E1LMVHUsdc9GHI1PH3U2Ko0PyGdn9KdVOLm7FPBui0i9a0HpA60MsewVE4z8CAt5d401Gv6zXlIT5Ybit1VIA0FCs7wtvYreru1fUyW3oLAZ/+aTnZrOcYRNVA8spoRtlRoWflsRClFcgzkqiHOrf0/SVw+EpVaFlJ0g4Kxq1MMOmiQdpMNpte8lMMQqm6cIFXlnGbfJllysKDi+0JJMotkqgIxOSQgU9dn/lWkeVf8nUm3iwX2Nl3WDw9i6AUK3vBAbZZrcJpDQ/N64AVwjT07Jef30GSSmtNu2WlW7YoyW2FlWfZFQUwk867EdLYKk9VG6JgEnBiBxkY7LMo4YLQJJlAo9l/oTvJkSARDF/XtyAzM8O2t3eT/iXa6wDN3WewNmQHdPfsxChU/KtLG2Mn8i4ZqKdSlIaBZadxJmRzVS/o4yA65RTSViq60oa395Lqw0pzY4SipwE0SXXsKV+GZraGSkr/RW08wPRvqvSUkYBMA9lPx4m24az+IHmCbXA+0faxTRE9wuGeO06DIXa6QlKJ3puIyiuAVfPr736vzo2pBirS+Vxel3TMm3JKhz9o2ZoRvaFVpIkykb0Hcm4oHFBMcNSNj7/4GJt43ogonY2Vg4nsDQIWxAcorpXACzgBqQPjYsE/VUpXpwNManEru4NwMCFPkXvMoqvoeLN3qyu/N1eWEHttMD65v19l/0kH2mR35iv/FI+yjoHJ9gPMz67af3Mq/BoWXqu3rphiWMXVkmnPSEkpGpUI2h1MThideGFEOK6YZHPwYzMBvpNC7+ZHxPb7epfefGyIB4JzO9DTNEYnDLVVHdQyvOEVefrk6Uv5kTQYVYWWdqrdcIl7yljwwIWdfQ/y+2QB3eR/qxYObuYyB4gTbo2in4PzarU1sO9nETkmj9/AoxDA+JM3GMqQtJR4jtduHtnoCLxd1gQUscHRB/MoRYIEsP2pDZ9KvHgtlk1iTbWWbHhohwFEYX7y51fUV2nuUmnoUcqnWIQAAgl9LTVX+Bc0QGNEhChxHR4YjfE51PUdGfsSFE6ck7BL3/hTf9jLq4G1IafINxOLKeAtO7quulYvH5YOBc+zX7CrMgWnW47/jfRsWnJjYYoE7xMfWV2HN2iyIqLI';
const FENCED = new Map([[8217,"apostrophe"],[8260,"fraction slash"],[12539,"middle dot"]]);
const NSM_MAX = 4;

function decode_arithmetic(bytes) {
	let pos = 0;
	function u16() { return (bytes[pos++] << 8) | bytes[pos++]; }
	
	// decode the frequency table
	let symbol_count = u16();
	let total = 1;
	let acc = [0, 1]; // first symbol has frequency 1
	for (let i = 1; i < symbol_count; i++) {
		acc.push(total += u16());
	}

	// skip the sized-payload that the last 3 symbols index into
	let skip = u16();
	let pos_payload = pos;
	pos += skip;

	let read_width = 0;
	let read_buffer = 0; 
	function read_bit() {
		if (read_width == 0) {
			// this will read beyond end of buffer
			// but (undefined|0) => zero pad
			read_buffer = (read_buffer << 8) | bytes[pos++];
			read_width = 8;
		}
		return (read_buffer >> --read_width) & 1;
	}

	const N = 31;
	const FULL = 2**N;
	const HALF = FULL >>> 1;
	const QRTR = HALF >> 1;
	const MASK = FULL - 1;

	// fill register
	let register = 0;
	for (let i = 0; i < N; i++) register = (register << 1) | read_bit();

	let symbols = [];
	let low = 0;
	let range = FULL; // treat like a float
	while (true) {
		let value = Math.floor((((register - low + 1) * total) - 1) / range);
		let start = 0;
		let end = symbol_count;
		while (end - start > 1) { // binary search
			let mid = (start + end) >>> 1;
			if (value < acc[mid]) {
				end = mid;
			} else {
				start = mid;
			}
		}
		if (start == 0) break; // first symbol is end mark
		symbols.push(start);
		let a = low + Math.floor(range * acc[start]   / total);
		let b = low + Math.floor(range * acc[start+1] / total) - 1;
		while (((a ^ b) & HALF) == 0) {
			register = (register << 1) & MASK | read_bit();
			a = (a << 1) & MASK;
			b = (b << 1) & MASK | 1;
		}
		while (a & ~b & QRTR) {
			register = (register & HALF) | ((register << 1) & (MASK >>> 1)) | read_bit();
			a = (a << 1) ^ HALF;
			b = ((b ^ HALF) << 1) | HALF | 1;
		}
		low = a;
		range = 1 + b - a;
	}
	let offset = symbol_count - 4;
	return symbols.map(x => { // index into payload
		switch (x - offset) {
			case 3: return offset + 0x10100 + ((bytes[pos_payload++] << 16) | (bytes[pos_payload++] << 8) | bytes[pos_payload++]);
			case 2: return offset + 0x100 + ((bytes[pos_payload++] << 8) | bytes[pos_payload++]);
			case 1: return offset + bytes[pos_payload++];
			default: return x - 1;
		}
	});
}	

// returns an iterator which returns the next symbol
function read_payload(v) {
	let pos = 0;
	return () => v[pos++];
}
function read_compressed_payload(s) {
	return read_payload(decode_arithmetic(unsafe_atob(s)));
}

// unsafe in the sense:
// expected well-formed Base64 w/o padding 
// 20220922: added for https://github.com/adraffy/ens-normalize.js/issues/4
function unsafe_atob(s) {
	let lookup = [];
	[...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].forEach((c, i) => lookup[c.charCodeAt(0)] = i);
	let n = s.length;
	let ret = new Uint8Array((6 * n) >> 3);
	for (let i = 0, pos = 0, width = 0, carry = 0; i < n; i++) {
		carry = (carry << 6) | lookup[s.charCodeAt(i)];
		width += 6;
		if (width >= 8) {
			ret[pos++] = (carry >> (width -= 8));
		}
	}
	return ret;
}

// eg. [0,1,2,3...] => [0,-1,1,-2,...]
function signed(i) { 
	return (i & 1) ? (~i >> 1) : (i >> 1);
}

function read_deltas(n, next) {
	let v = Array(n);
	for (let i = 0, x = 0; i < n; i++) v[i] = x += signed(next());
	return v;
}

// [123][5] => [0 3] [1 1] [0 0]
function read_sorted(next, prev = 0) {
	let ret = [];
	while (true) {
		let x = next();
		let n = next();
		if (!n) break;
		prev += x;
		for (let i = 0; i < n; i++) {
			ret.push(prev + i);
		}
		prev += n + 1;
	}
	return ret;
}

function read_sorted_arrays(next) {
	return read_array_while(() => { 
		let v = read_sorted(next);
		if (v.length) return v;
	});
}

// returns map of x => ys
function read_mapped(next) {
	let ret = [];
	while (true) {
		let w = next();
		if (w == 0) break;
		ret.push(read_linear_table(w, next));
	}
	while (true) {
		let w = next() - 1;
		if (w < 0) break;
		ret.push(read_replacement_table(w, next));
	}
	return ret.flat();
}

// read until next is falsy
// return array of read values
function read_array_while(next) {
	let v = [];
	while (true) {
		let x = next(v.length);
		if (!x) break;
		v.push(x);
	}
	return v;
}

// read w columns of length n
// return as n rows of length w
function read_transposed(n, w, next) {
	let m = Array(n).fill().map(() => []);
	for (let i = 0; i < w; i++) {
		read_deltas(n, next).forEach((x, j) => m[j].push(x));
	}
	return m;
}
 
// returns [[x, ys], [x+dx, ys+dy], [x+2*dx, ys+2*dy], ...]
// where dx/dy = steps, n = run size, w = length of y
function read_linear_table(w, next) {
	let dx = 1 + next();
	let dy = next();
	let vN = read_array_while(next);
	let m = read_transposed(vN.length, 1+w, next);
	return m.flatMap((v, i) => {
		let [x, ...ys] = v;
		return Array(vN[i]).fill().map((_, j) => {
			let j_dy = j * dy;
			return [x + j * dx, ys.map(y => y + j_dy)];
		});
	});
}

// return [[x, ys...], ...]
// where w = length of y
function read_replacement_table(w, next) { 
	let n = 1 + next();
	let m = read_transposed(n, 1+w, next);
	return m.map(v => [v[0], v.slice(1)]);
}


function read_trie(next) {
	let ret = [];
	let sorted = read_sorted(next); 
	expand(decode([]), []);
	return ret; // not sorted
	function decode(Q) { // characters that lead into this node
		let S = next(); // state: valid, save, check
		let B = read_array_while(() => { // buckets leading to new nodes
			let cps = read_sorted(next).map(i => sorted[i]);
			if (cps.length) return decode(cps);
		});
		return {S, B, Q};
	}
	function expand({S, B}, cps, saved) {
		if (S & 4 && saved === cps[cps.length-1]) return;
		if (S & 2) saved = cps[cps.length-1];
		if (S & 1) ret.push(cps); 
		for (let br of B) {
			for (let cp of br.Q) {
				expand(br, [...cps, cp], saved);
			}
		}
	}
}

function hex_cp(cp) {
	return cp.toString(16).toUpperCase().padStart(2, '0');
}

function quote_cp(cp) {
	return `{${hex_cp(cp)}}`; // raffy convention: like "\u{X}" w/o the "\u"
}

/*
export function explode_cp(s) {
	return [...s].map(c => c.codePointAt(0));
}
*/
function explode_cp(s) { // this is about 2x faster
	let cps = [];
	for (let pos = 0, len = s.length; pos < len; ) {
		let cp = s.codePointAt(pos);
		pos += cp < 0x10000 ? 1 : 2;
		cps.push(cp);
	}
	return cps;
}

function str_from_cps(cps) {
	const chunk = 4096;
	let len = cps.length;
	if (len < chunk) return String.fromCodePoint(...cps);
	let buf = [];
	for (let i = 0; i < len; ) {
		buf.push(String.fromCodePoint(...cps.slice(i, i += chunk)));
	}
	return buf.join('');
}

function compare_arrays(a, b) {
	let n = a.length;
	let c = n - b.length;
	for (let i = 0; c == 0 && i < n; i++) c = a[i] - b[i];
	return c;
}

// created 2023-09-25T01:01:55.148Z
// compressed base64-encoded blob for include-nf data
// source: https://github.com/adraffy/ens-normalize.js/blob/main/src/make.js
// see: https://github.com/adraffy/ens-normalize.js#security
// SHA-256: a974b6f8541fc29d919bc85118af0a44015851fab5343f8679cb31be2bdb209e
var COMPRESSED = 'AEUDTAHBCFQATQDRADAAcgAgADQAFAAsABQAHwAOACQADQARAAoAFwAHABIACAAPAAUACwAFAAwABAAQAAMABwAEAAoABQAIAAIACgABAAQAFAALAAIACwABAAIAAQAHAAMAAwAEAAsADAAMAAwACgANAA0AAwAKAAkABAAdAAYAZwDSAdsDJgC0CkMB8xhZAqfoC190UGcThgBurwf7PT09Pb09AjgJum8OjDllxHYUKXAPxzq6tABAxgK8ysUvWAgMPT09PT09PSs6LT2HcgWXWwFLoSMEEEl5RFVMKvO0XQ8ExDdJMnIgsj26PTQyy8FfEQ8AY8IPAGcEbwRwBHEEcgRzBHQEdQR2BHcEeAR6BHsEfAR+BIAEgfndBQoBYgULAWIFDAFiBNcE2ATZBRAFEQUvBdALFAsVDPcNBw13DYcOMA4xDjMB4BllHI0B2grbAMDpHLkQ7QHVAPRNQQFnGRUEg0yEB2uaJF8AJpIBpob5AERSMAKNoAXqaQLUBMCzEiACnwRZEkkVsS7tANAsBG0RuAQLEPABv9HICTUBXigPZwRBApMDOwAamhtaABqEAY8KvKx3LQ4ArAB8UhwEBAVSagD8AEFZADkBIadVj2UMUgx5Il4ANQC9AxIB1BlbEPMAs30CGxlXAhwZKQIECBc6EbsCoxngzv7UzRQA8M0BawL6ZwkN7wABAD33OQRcsgLJCjMCjqUChtw/km+NAsXPAoP2BT84PwURAK0RAvptb6cApQS/OMMey5HJS84UdxpxTPkCogVFITaTOwERAK5pAvkNBOVyA7q3BKlOJSALAgUIBRcEdASpBXqzABXFSWZOawLCOqw//AolCZdvv3dSBkEQGyelEPcMMwG1ATsN7UvYBPEGOwTJH30ZGQ/NlZwIpS3dDO0m4y6hgFoj9SqDBe1L9DzdC01RaA9ZC2UJ4zpjgU4DIQENIosK3Q05CG0Q8wrJaw3lEUUHOQPVSZoApQcBCxEdNRW1JhBirAsJOXcG+xr2C48mrxMpevwF0xohBk0BKRr/AM8u54WwWjFcHE9fBgMLJSPHFKhQIA0lQLd4SBobBxUlqQKRQ3BKh1E2HpMh9jw9DWYuE1F8B/U8BRlPC4E8nkarRQ4R0j6NPUgiSUwsBDV/LC8niwnPD4UMuXxyAVkJIQmxDHETMREXN8UIOQcZLZckJxUIIUaVYJoE958D8xPRAwsFPwlBBxMDtRwtEy4VKQUNgSTXAvM21S6zAo9WgAEXBcsPJR/fEFBH4A7pCJsCZQODJesALRUhABcimwhDYwBfj9hTBS7LCMdqbCN0A2cU52ERcweRDlcHpxwzFb8c4XDIXguGCCijrwlbAXUJmQFfBOMICTVbjKAgQWdTi1gYmyBhQT9d/AIxDGUVn0S9h3gCiw9rEhsBNQFzBzkNAQJ3Ee0RaxCVCOuGBDW1M/g6JQRPIYMgEQonA09szgsnJvkM+GkBoxJiAww0PXfuZ6tgtiQX/QcZMsVBYCHxC5JPzQycGsEYQlQuGeQHvwPzGvMn6kFXBf8DowMTOk0z7gS9C2kIiwk/AEkOoxcH1xhqCnGM0AExiwG3mQNXkYMCb48GNwcLAGcLhwV55QAdAqcIowAFAM8DVwA5Aq0HnQAZAIVBAT0DJy8BIeUCjwOTCDHLAZUvAfMpBBvDDBUA9zduSgLDsQKAamaiBd1YAo4CSTUBTSUEBU5HUQOvceEA2wBLBhPfRwEVq0rLGuNDAd9vKwDHAPsABTUHBUEBzQHzbQC3AV8LMQmis7UBTekpAIMAFWsB1wKJAN0ANQB/8QFTAE0FWfkF0wJPSQERMRgrV2EBuwMfATMBDQB5BsuNpckHHwRtB9MCEBsV4QLvLge1AQMi3xPNQsUCvd5VoWACZIECYkJbTa9bNyACofcCaJgCZgkCn4Q4GwsCZjsCZiYEbgR/A38TA36SOQY5dxc5gjojIwJsHQIyNjgKAm3HAm2u74ozZ0UrAWcA3gDhAEoFB5gMjQD+C8IADbUCdy8CdqI/AnlLQwJ4uh1c20WuRtcCfD8CesgCfQkCfPAFWQUgSABIfWMkAoFtAoAAAoAFAn+uSVhKWxUXSswC0QEC0MxLJwOITwOH5kTFkTIC8qFdAwMDrkvOTC0lA89NTE2vAos/AorYwRsHHUNnBbcCjjcCjlxAl4ECjtkCjlx4UbRTNQpS1FSFApP7ApMMAOkAHFUeVa9V0AYsGymVhjLheGZFOzkCl58C77JYIagAWSUClo8ClnycAKlZrFoJgU0AOwKWtQKWTlxEXNECmcsCmWRcyl0HGQKcmznCOp0CnBYCn5sCnriKAB0PMSoPAp3xAp6SALU9YTRh7wKe0wKgbgGpAp6fHwKeTqVjyGQnJSsCJ68CJn4CoPsCoEwCot0CocQCpi8Cpc4Cp/8AfQKn8mh8aLEAA0lqHGrRAqzjAqyuAq1nAq0CAlcdAlXcArHh1wMfTmyXArK9DQKy6Bds4G1jbUhfAyXNArZcOz9ukAMpRQK4XgK5RxUCuSp3cDZw4QK9GQK72nCWAzIRAr6IcgIDM3ECvhpzInNPAsPLAsMEc4J0SzVFdOADPKcDPJoDPb8CxXwCxkcCxhCJAshpUQLIRALJTwLJLgJknQLd0nh5YXiueSVL0AMYo2cCAmH0GfOVJHsLXpJeuxECz2sCz2wvS1PS8xOfAMatAs9zASnqA04SfksFAtwnAtuKAtJPA1JcA1NfAQEDVYyAiT8AyxbtYEWCHILTgs6DjQLaxwLZ3oQQhEmnPAOGpQAvA2QOhnFZ+QBVAt9lAt64c3cC4i/tFAHzMCcB9JsB8tKHAuvzAulweQLq+QLq5AD5RwG5Au6JAuuclqqXAwLuPwOF4Jh5cOBxoQLzAwBpA44WmZMC9xMDkW4DkocC95gC+dkC+GaaHJqruzebHgOdgwL++gEbADmfHJ+zAwWNA6ZqA6bZANHFAwZqoYiiBQkDDEkCwAA/AwDhQRdTARHzA2sHl2cFAJMtK7evvdsBiZkUfxEEOQH7KQUhDp0JnwCS/SlXxQL3AZ0AtwW5AG8LbUEuFCaNLgFDAYD8AbUmAHUDDgRtACwCFgyhAAAKAj0CagPdA34EkQEgRQUhfAoABQBEABMANhICdwEABdUDa+8KxQIA9wqfJ7+xt+UBkSFBQgHpFH8RNMCJAAQAGwBaAkUChIsABjpTOpSNbQC4Oo860ACNOME63AClAOgAywE6gTo7Ofw5+Tt2iTpbO56JOm85GAFWATMBbAUvNV01njWtNWY1dTW2NcU1gjWRNdI14TWeNa017jX9NbI1wTYCNhE1xjXVNhY2JzXeNe02LjY9Ni41LSE2OjY9Njw2yTcIBJA8VzY4Nt03IDcPNsogN4k3MAoEsDxnNiQ3GTdsOo03IULUQwdC4EMLHA8PCZsobShRVQYA6X8A6bABFCnXAukBowC9BbcAbwNzBL8MDAMMAQgDAAkKCwsLCQoGBAVVBI/DvwDz9b29kaUCb0QtsRTNLt4eGBcSHAMZFhYZEhYEARAEBUEcQRxBHEEcQRxBHEEaQRxBHEFCSTxBPElISUhBNkM2QTYbNklISVmBVIgBFLWZAu0BhQCjBcEAbykBvwGJAaQcEZ0ePCklMAAhMvAIMAL54gC7Bm8EescjzQMpARQpKgDUABavAj626xQAJP0A3etzuf4NNRA7efy2Z9NQrCnC0OSyANz5BBIbJ5IFDR6miIavYS6tprjjmuKebxm5C74Q225X1pkaYYPb6f1DK4k3xMEBb9S2WMjEibTNWhsRJIA+vwNVEiXTE5iXs/wezV66oFLfp9NZGYW+Gk19J2+bCT6Ye2w6LDYdgzKMUabk595eLBCXANz9HUpWbATq9vqXVx9XDg+Pc9Xp4+bsS005SVM/BJBM4687WUuf+Uj9dEi8aDNaPxtpbDxcG1THTImUMZq4UCaaNYpsVqraNyKLJXDYsFZ/5jl7bLRtO88t7P3xZaAxhb5OdPMXqsSkp1WCieG8jXm1U99+blvLlXzPCS+M93VnJCiK+09LfaSaBAVBomyDgJua8dfUzR7ga34IvR2Nvj+A9heJ6lsl1KG4NkI1032Cnff1m1wof2B9oHJK4bi6JkEdSqeNeiuo6QoZZincoc73/TH9SXF8sCE7XyuYyW8WSgbGFCjPV0ihLKhdPs08Tx82fYAkLLc4I2wdl4apY7GU5lHRFzRWJep7Ww3wbeA3qmd59/86P4xuNaqDpygXt6M85glSBHOCGgJDnt+pN9bK7HApMguX6+06RZNjzVmcZJ+wcUrJ9//bpRNxNuKpNl9uFds+S9tdx7LaM5ZkIrPj6nIU9mnbFtVbs9s/uLgl8MVczAwet+iOEzzBlYW7RCMgE6gyNLeq6+1tIx4dpgZnd0DksJS5f+JNDpwwcPNXaaVspq1fbQajOrJgK0ofKtJ1Ne90L6VO4MOl5S886p7u6xo7OLjG8TGL+HU1JXGJgppg4nNbNJ5nlzSpuPYy21JUEcUA94PoFiZfjZue+QnyQ80ekOuZVkxx4g+cvhJfHgNl4hy1/a6+RKcKlar/J29y//EztlbVPHVUeQ1zX86eQVAjR/M3dA9w4W8LfaXp4EgM85wOWasli837PzVMOnsLzR+k3o75/lRPAJSE1xAKQzEi5v10ke+VBvRt1cwQRMd+U5mLCTGVd6XiZtgBG5cDi0w22GKcVNvHiu5LQbZEDVtz0onn7k5+heuKXVsZtSzilkLRAUmjMXEMB3J9YC50XBxPiz53SC+EhnPl9WsKCv92SM/OFFIMJZYfl0WW8tIO3UxYcwdMAj7FSmgrsZ2aAZO03BOhP1bNNZItyXYQFTpC3SG1VuPDqH9GkiCDmE+JwxyIVSO5siDErAOpEXFgjy6PQtOVDj+s6e1r8heWVvmZnTciuf4EiNZzCAd7SOMhXERIOlsHIMG399i9aLTy3m2hRLZjJVDNLS53iGIK11dPqQt0zBDyg6qc7YqkDm2M5Ve6dCWCaCbTXX2rToaIgz6+zh4lYUi/+6nqcFMAkQJKHYLK0wYk5N9szV6xihDbDDFr45lN1K4aCXBq/FitPSud9gLt5ZVn+ZqGX7cwm2z5EGMgfFpIFyhGGuDPmso6TItTMwny+7uPnLCf4W6goFQFV0oQSsc9VfMmVLcLr6ZetDZbaSFTLqnSO/bIPjA3/zAUoqgGFAEQS4IhuMzEp2I3jJzbzkk/IEmyax+rhZTwd6f+CGtwPixu8IvzACquPWPREu9ZvGkUzpRwvRRuaNN6cr0W1wWits9ICdYJ7ltbgMiSL3sTPeufgNcVqMVWFkCPDH4jG2jA0XcVgQj62Cb29v9f/z/+2KbYvIv/zzjpQAPkliaVDzNrW57TZ/ZOyZD0nlfMmAIBIAGAI0D3k/mdN4xr9v85ZbZbbqfH2jGd5hUqNZWwl5SPfoGmfElmazUIeNL1j/mkF7VNAzTq4jNt8JoQ11NQOcmhprXoxSxfRGJ9LDEOAQ+dmxAQH90iti9e2u/MoeuaGcDTHoC+xsmEeWmxEKefQuIzHbpw5Tc5cEocboAD09oipWQhtTO1wivf/O+DRe2rpl/E9wlrzBorjJsOeG1B/XPW4EaJEFdNlECEZga5ZoGRHXgYouGRuVkm8tDESiEyFNo+3s5M5puSdTyUL2llnINVHEt91XUNW4ewdMgJ4boJfEyt/iY5WXqbA+A2Fkt5Z0lutiWhe9nZIyIUjyXDC3UsaG1t+eNx6z4W/OYoTB7A6x+dNSTOi9AInctbESqm5gvOLww7OWXPrmHwVZasrl4eD113pm+JtT7JVOvnCXqdzzdTRHgJ0PiGTFYW5Gvt9R9LD6Lzfs0v/TZZHSmyVNq7viIHE6DBK7Qp07Iz55EM8SYtQvZf/obBniTWi5C2/ovHfw4VndkE5XYdjOhCMRjDeOEfXeN/CwfGduiUIfsoFeUxXeQXba7c7972XNv8w+dTjjUM0QeNAReW+J014dKAD/McQYXT7c0GQPIkn3Ll6R7gGjuiQoZD0TEeEqQpKoZ15g/0OPQI17QiSv9AUROa/V/TQN3dvLArec3RrsYlvBm1b8LWzltdugsC50lNKYLEp2a+ZZYqPejULRlOJh5zj/LVMyTDvwKhMxxwuDkxJ1QpoNI0OTWLom4Z71SNzI9TV1iXJrIu9Wcnd+MCaAw8o1jSXd94YU/1gnkrC9BUEOtQvEIQ7g0i6h+KL2JKk8Ydl7HruvgWMSAmNe+LshGhV4qnWHhO9/RIPQzY1tHRj2VqOyNsDpK0cww+56AdDC4gsWwY0XxoucIWIqs/GcwnWqlaT0KPr8mbK5U94/301i1WLt4YINTVvCFBrFZbIbY8eycOdeJ2teD5IfPLCRg7jjcFTwlMFNl9zdh/o3E/hHPwj7BWg0MU09pPrBLbrCgm54A6H+I6v27+jL5gkjWg/iYdks9jbfVP5y/n0dlgWEMlKasl7JvFZd56LfybW1eeaVO0gxTfXZwD8G4SI116yx7UKVRgui6Ya1YpixqXeNLc8IxtAwCU5IhwQgn+NqHnRaDv61CxKhOq4pOX7M6pkA+Pmpd4j1vn6ACUALoLLc4vpXci8VidLxzm7qFBe7s+quuJs6ETYmnpgS3LwSZxPIltgBDXz8M1k/W2ySNv2f9/NPhxLGK2D21dkHeSGmenRT3Yqcdl0m/h3OYr8V+lXNYGf8aCCpd4bWjE4QIPj7vUKN4Nrfs7ML6Y2OyS830JCnofg/k7lpFpt4SqZc5HGg1HCOrHvOdC8bP6FGDbE/VV0mX4IakzbdS/op+Kt3G24/8QbBV7y86sGSQ/vZzU8FXs7u6jIvwchsEP2BpIhW3G8uWNwa3HmjfH/ZjhhCWvluAcF+nMf14ClKg5hGgtPLJ98ueNAkc5Hs2WZlk2QHvfreCK1CCGO6nMZVSb99VM/ajr8WHTte9JSmkXq/i/U943HEbdzW6Re/S88dKgg8pGOLlAeNiqrcLkUR3/aClFpMXcOUP3rmETcWSfMXZE3TUOi8i+fqRnTYLflVx/Vb/6GJ7eIRZUA6k3RYR3iFSK9c4iDdNwJuZL2FKz/IK5VimcNWEqdXjSoxSgmF0UPlDoUlNrPcM7ftmA8Y9gKiqKEHuWN+AZRIwtVSxye2Kf8rM3lhJ5XcBXU9n4v0Oy1RU2M+4qM8AQPVwse8ErNSob5oFPWxuqZnVzo1qB/IBxkM3EVUKFUUlO3e51259GgNcJbCmlvrdjtoTW7rChm1wyCKzpCTwozUUEOIcWLneRLgMXh+SjGSFkAllzbGS5HK7LlfCMRNRDSvbQPjcXaenNYxCvu2Qyznz6StuxVj66SgI0T8B6/sfHAJYZaZ78thjOSIFumNWLQbeZixDCCC+v0YBtkxiBB3jefHqZ/dFHU+crbj6OvS1x/JDD7vlm7zOVPwpUC01nhxZuY/63E7g';

// https://unicode.org/reports/tr15/
// for reference implementation
// see: /derive/nf.js


// algorithmic hangul
// https://www.unicode.org/versions/Unicode15.0.0/ch03.pdf (page 144)
const S0 = 0xAC00;
const L0 = 0x1100;
const V0 = 0x1161;
const T0 = 0x11A7;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;
const S1 = S0 + S_COUNT;
const L1 = L0 + L_COUNT;
const V1 = V0 + V_COUNT;
const T1 = T0 + T_COUNT;

function unpack_cc(packed) {
	return (packed >> 24) & 0xFF;
}
function unpack_cp(packed) {
	return packed & 0xFFFFFF;
}

let SHIFTED_RANK, EXCLUSIONS, DECOMP, RECOMP;

function init$1() {
	//console.time('nf');
	let r = read_compressed_payload(COMPRESSED);
	SHIFTED_RANK = new Map(read_sorted_arrays(r).flatMap((v, i) => v.map(x => [x, (i+1) << 24]))); // pre-shifted
	EXCLUSIONS = new Set(read_sorted(r));
	DECOMP = new Map();
	RECOMP = new Map();
	for (let [cp, cps] of read_mapped(r)) {
		if (!EXCLUSIONS.has(cp) && cps.length == 2) {
			let [a, b] = cps;
			let bucket = RECOMP.get(a);
			if (!bucket) {
				bucket = new Map();
				RECOMP.set(a, bucket);
			}
			bucket.set(b, cp);
		}
		DECOMP.set(cp, cps.reverse()); // stored reversed
	}
	//console.timeEnd('nf');
	// 20230905: 11ms
}

function is_hangul(cp) {
	return cp >= S0 && cp < S1;
}

function compose_pair(a, b) {
	if (a >= L0 && a < L1 && b >= V0 && b < V1) {
		return S0 + (a - L0) * N_COUNT + (b - V0) * T_COUNT;
	} else if (is_hangul(a) && b > T0 && b < T1 && (a - S0) % T_COUNT == 0) {
		return a + (b - T0);
	} else {
		let recomp = RECOMP.get(a);
		if (recomp) {
			recomp = recomp.get(b);
			if (recomp) {
				return recomp;
			}
		}
		return -1;
	}
}

function decomposed(cps) {
	if (!SHIFTED_RANK) init$1();
	let ret = [];
	let buf = [];
	let check_order = false;
	function add(cp) {
		let cc = SHIFTED_RANK.get(cp);
		if (cc) {
			check_order = true;
			cp |= cc;
		}
		ret.push(cp);
	}
	for (let cp of cps) {
		while (true) {
			if (cp < 0x80) {
				ret.push(cp);
			} else if (is_hangul(cp)) {
				let s_index = cp - S0;
				let l_index = s_index / N_COUNT | 0;
				let v_index = (s_index % N_COUNT) / T_COUNT | 0;
				let t_index = s_index % T_COUNT;
				add(L0 + l_index);
				add(V0 + v_index);
				if (t_index > 0) add(T0 + t_index);
			} else {
				let mapped = DECOMP.get(cp);
				if (mapped) {
					buf.push(...mapped);
				} else {
					add(cp);
				}
			}
			if (!buf.length) break;
			cp = buf.pop();
		}
	}
	if (check_order && ret.length > 1) {
		let prev_cc = unpack_cc(ret[0]);
		for (let i = 1; i < ret.length; i++) {
			let cc = unpack_cc(ret[i]);
			if (cc == 0 || prev_cc <= cc) {
				prev_cc = cc;
				continue;
			}
			let j = i-1;
			while (true) {
				let tmp = ret[j+1];
				ret[j+1] = ret[j];
				ret[j] = tmp;
				if (!j) break;
				prev_cc = unpack_cc(ret[--j]);
				if (prev_cc <= cc) break;
			}
			prev_cc = unpack_cc(ret[i]);
		}
	}
	return ret;
}

function composed_from_decomposed(v) {
	let ret = [];
	let stack = [];
	let prev_cp = -1;
	let prev_cc = 0;
	for (let packed of v) {
		let cc = unpack_cc(packed);
		let cp = unpack_cp(packed);
		if (prev_cp == -1) {
			if (cc == 0) {
				prev_cp = cp;
			} else {
				ret.push(cp);
			}
		} else if (prev_cc > 0 && prev_cc >= cc) {
			if (cc == 0) {
				ret.push(prev_cp, ...stack);
				stack.length = 0;
				prev_cp = cp;
			} else {
				stack.push(cp);
			}
			prev_cc = cc;
		} else {
			let composed = compose_pair(prev_cp, cp);
			if (composed >= 0) {
				prev_cp = composed;
			} else if (prev_cc == 0 && cc == 0) {
				ret.push(prev_cp);
				prev_cp = cp;
			} else {
				stack.push(cp);
				prev_cc = cc;
			}
		}
	}
	if (prev_cp >= 0) {
		ret.push(prev_cp, ...stack);	
	}
	return ret;
}

// note: cps can be iterable
function nfd(cps) {
	return decomposed(cps).map(unpack_cp);
}
function nfc(cps) {
	return composed_from_decomposed(decomposed(cps));
}

const HYPHEN = 0x2D;
const STOP_CH = '.';
const FE0F = 0xFE0F;
const UNIQUE_PH = 1;

// 20230913: replace [...v] with Array_from(v) to avoid large spreads
const Array_from = x => Array.from(x); // Array.from.bind(Array);

function group_has_cp(g, cp) {
	// 20230913: keep primary and secondary distinct instead of creating valid union
	return g.P.has(cp) || g.Q.has(cp);
}

class Emoji extends Array {
	get is_emoji() { return true; } // free tagging system
}

let MAPPED, IGNORED, CM, NSM, ESCAPE, GROUPS, WHOLE_VALID, WHOLE_MAP, VALID, EMOJI_LIST, EMOJI_ROOT;

function init() {
	if (MAPPED) return;
	
	let r = read_compressed_payload(COMPRESSED$1);
	const read_sorted_array = () => read_sorted(r);
	const read_sorted_set = () => new Set(read_sorted_array());
	const set_add_many = (set, v) => v.forEach(x => set.add(x));

	MAPPED = new Map(read_mapped(r)); 
	IGNORED = read_sorted_set(); // ignored characters are not valid, so just read raw codepoints

	/*
	// direct include from payload is smaller than the decompression code
	const FENCED = new Map(read_array_while(() => {
		let cp = r();
		if (cp) return [cp, read_str(r())];
	}));
	*/
	// 20230217: we still need all CM for proper error formatting
	// but norm only needs NSM subset that are potentially-valid
	CM = read_sorted_array();
	NSM = new Set(read_sorted_array().map(i => CM[i]));
	CM = new Set(CM);
	
	ESCAPE = read_sorted_set(); // characters that should not be printed
	read_sorted_set(); // only needed to illustrate ens_tokenize() transformations

	let chunks = read_sorted_arrays(r);
	let unrestricted = r();
	//const read_chunked = () => new Set(read_sorted_array().flatMap(i => chunks[i]).concat(read_sorted_array()));
	const read_chunked = () => {
		// 20230921: build set in parts, 2x faster
		let set = new Set();
		read_sorted_array().forEach(i => set_add_many(set, chunks[i]));
		set_add_many(set, read_sorted_array());
		return set; 
	};
	GROUPS = read_array_while(i => {
		// minifier property mangling seems unsafe
		// so these are manually renamed to single chars
		let N = read_array_while(r).map(x => x+0x60);
		if (N.length) {
			let R = i >= unrestricted; // unrestricted then restricted
			N[0] -= 32; // capitalize
			N = str_from_cps(N);
			if (R) N=`Restricted[${N}]`;
			let P = read_chunked(); // primary
			let Q = read_chunked(); // secondary
			let M = !r(); // not-whitelisted, check for NSM
			// *** this code currently isn't needed ***
			/*
			let V = [...P, ...Q].sort((a, b) => a-b); // derive: sorted valid
			let M = r()-1; // number of combining mark
			if (M < 0) { // whitelisted
				M = new Map(read_array_while(() => {
					let i = r();
					if (i) return [V[i-1], read_array_while(() => {
						let v = read_array_while(r);
						if (v.length) return v.map(x => x-1);
					})];
				}));
			}*/
			return {N, P, Q, M, R};
		}
	});

	// decode compressed wholes
	WHOLE_VALID = read_sorted_set();
	WHOLE_MAP = new Map();
	let wholes = read_sorted_array().concat(Array_from(WHOLE_VALID)).sort((a, b) => a-b); // must be sorted
	wholes.forEach((cp, i) => {
		let d = r(); 
		let w = wholes[i] = d ? wholes[i-d] : {V: [], M: new Map()};
		w.V.push(cp); // add to member set
		if (!WHOLE_VALID.has(cp)) {
			WHOLE_MAP.set(cp, w);  // register with whole map
		}
	});

	// compute confusable-extent complements
	// usage: WHOLE_MAP.get(cp).M.get(cp) = complement set
	for (let {V, M} of new Set(WHOLE_MAP.values())) {
		// connect all groups that have each whole character
		let recs = [];
		for (let cp of V) {
			let gs = GROUPS.filter(g => group_has_cp(g, cp));
			let rec = recs.find(({G}) => gs.some(g => G.has(g)));
			if (!rec) {
				rec = {G: new Set(), V: []};
				recs.push(rec);
			}
			rec.V.push(cp);
			set_add_many(rec.G, gs);
		}
		// per character cache groups which are not a member of the extent
		let union = recs.flatMap(x => Array_from(x.G)); // all of the groups used by this whole
		for (let {G, V} of recs) {
			let complement = new Set(union.filter(g => !G.has(g))); // groups not covered by the extent
			for (let cp of V) {
				M.set(cp, complement); // this is the same reference
			}
		}
	}

	// compute valid set
	// 20230924: VALID was union but can be re-used
	VALID = new Set(); // exists in 1+ groups
	let multi = new Set(); // exists in 2+ groups
	const add_to_union = cp => VALID.has(cp) ? multi.add(cp) : VALID.add(cp);
	for (let g of GROUPS) {
		for (let cp of g.P) add_to_union(cp);
		for (let cp of g.Q) add_to_union(cp);
	}
	// dual purpose WHOLE_MAP: return placeholder if unique non-confusable
	for (let cp of VALID) {
		if (!WHOLE_MAP.has(cp) && !multi.has(cp)) {
			WHOLE_MAP.set(cp, UNIQUE_PH);
		}
	}
	// add all decomposed parts
	// see derive: "Valid is Closed (via Brute-force)"
	set_add_many(VALID, nfd(VALID));
	
	// decode emoji
	// 20230719: emoji are now fully-expanded to avoid quirk logic 
	EMOJI_LIST = read_trie(r).map(v => Emoji.from(v)).sort(compare_arrays);
	EMOJI_ROOT = new Map(); // this has approx 7K nodes (2+ per emoji)
	for (let cps of EMOJI_LIST) {
		// 20230719: change to *slightly* stricter algorithm which disallows 
		// insertion of misplaced FE0F in emoji sequences (matching ENSIP-15)
		// example: beautified [A B] (eg. flag emoji) 
		//  before: allow: [A FE0F B], error: [A FE0F FE0F B] 
		//   after: error: both
		// note: this code now matches ENSNormalize.{cs,java} logic
		let prev = [EMOJI_ROOT];
		for (let cp of cps) {
			let next = prev.map(node => {
				let child = node.get(cp);
				if (!child) {
					// should this be object? 
					// (most have 1-2 items, few have many)
					// 20230719: no, v8 default map is 4?
					child = new Map();
					node.set(cp, child);
				}
				return child;
			});
			if (cp === FE0F) {
				prev.push(...next); // less than 20 elements
			} else {
				prev = next;
			}
		}
		for (let x of prev) {
			x.V = cps;
		}
	}
}

// if escaped: {HEX}
//       else: "x" {HEX}
function quoted_cp(cp) {
	return (should_escape(cp) ? '' : `${bidi_qq(safe_str_from_cps([cp]))} `) + quote_cp(cp);
}

// 20230211: some messages can be mixed-directional and result in spillover
// use 200E after a quoted string to force the remainder of a string from 
// acquring the direction of the quote
// https://www.w3.org/International/questions/qa-bidi-unicode-controls#exceptions
function bidi_qq(s) {
	return `"${s}"\u200E`; // strong LTR
}

function check_label_extension(cps) {
	if (cps.length >= 4 && cps[2] == HYPHEN && cps[3] == HYPHEN) {
		throw new Error(`invalid label extension: "${str_from_cps(cps.slice(0, 4))}"`); // this can only be ascii so cant be bidi
	}
}
function check_leading_underscore(cps) {
	const UNDERSCORE = 0x5F;
	for (let i = cps.lastIndexOf(UNDERSCORE); i > 0; ) {
		if (cps[--i] !== UNDERSCORE) {
			throw new Error('underscore allowed only at start');
		}
	}
}
// check that a fenced cp is not leading, trailing, or touching another fenced cp
function check_fenced(cps) {
	let cp = cps[0];
	let prev = FENCED.get(cp);
	if (prev) throw error_placement(`leading ${prev}`);
	let n = cps.length;
	let last = -1; // prevents trailing from throwing
	for (let i = 1; i < n; i++) {
		cp = cps[i];
		let match = FENCED.get(cp);
		if (match) {
			// since cps[0] isn't fenced, cps[1] cannot throw
			if (last == i) throw error_placement(`${prev} + ${match}`);
			last = i + 1;
			prev = match;
		}
	}
	if (last == n) throw error_placement(`trailing ${prev}`);
}

// create a safe to print string 
// invisibles are escaped
// leading cm uses placeholder
// if cps exceed max, middle truncate with ellipsis
// quoter(cp) => string, eg. 3000 => "{3000}"
// note: in html, you'd call this function then replace [<>&] with entities
function safe_str_from_cps(cps, max = Infinity, quoter = quote_cp) {
	//if (Number.isInteger(cps)) cps = [cps];
	//if (!Array.isArray(cps)) throw new TypeError(`expected codepoints`);
	let buf = [];
	if (is_combining_mark(cps[0])) buf.push('◌');
	if (cps.length > max) {
		max >>= 1;
		cps = [...cps.slice(0, max), 0x2026, ...cps.slice(-max)];
	}
	let prev = 0;
	let n = cps.length;
	for (let i = 0; i < n; i++) {
		let cp = cps[i];
		if (should_escape(cp)) {
			buf.push(str_from_cps(cps.slice(prev, i)));
			buf.push(quoter(cp));
			prev = i + 1;
		}
	}
	buf.push(str_from_cps(cps.slice(prev, n)));
	return buf.join('');
}

// note: set(s) cannot be exposed because they can be modified
// note: Object.freeze() doesn't work
function is_combining_mark(cp) {
	init();
	return CM.has(cp);
}
function should_escape(cp) {
	init();
	return ESCAPE.has(cp);
}

function ens_normalize(name) {
	return flatten(split(name, nfc, filter_fe0f));
}

function split(name, nf, ef) {
	if (!name) return []; // 20230719: empty name allowance
	init();
	let offset = 0;
	// https://unicode.org/reports/tr46/#Validity_Criteria
	// 4.) "The label must not contain a U+002E ( . ) FULL STOP."
	return name.split(STOP_CH).map(label => {
		let input = explode_cp(label);
		let info = {
			input,
			offset, // codepoint, not substring!
		};
		offset += input.length + 1; // + stop
		try {
			// 1.) "The label must be in Unicode Normalization Form NFC"
			let tokens = info.tokens = tokens_from_str(input, nf, ef);
			let token_count = tokens.length;
			let type;
			if (!token_count) { // the label was effectively empty (could of had ignored characters)
				//norm = [];
				//type = 'None'; // use this instead of next match, "ASCII"
				// 20230120: change to strict
				// https://discuss.ens.domains/t/ens-name-normalization-2nd/14564/59
				throw new Error(`empty label`);
			} 
			let norm = info.output = tokens.flat();
			check_leading_underscore(norm);
			let emoji = info.emoji = token_count > 1 || tokens[0].is_emoji; // same as: tokens.some(x => x.is_emoji);
			if (!emoji && norm.every(cp => cp < 0x80)) { // special case for ascii
				// 20230123: matches matches WHATWG, see note 3.3
				check_label_extension(norm); // only needed for ascii
				// cant have fenced
				// cant have cm
				// cant have wholes
				// see derive: "Fastpath ASCII"
				type = 'ASCII';
			} else {
				let chars = tokens.flatMap(x => x.is_emoji ? [] : x); // all of the nfc tokens concat together
				if (!chars.length) { // theres no text, just emoji
					type = 'Emoji';
				} else {
					// 5.) "The label must not begin with a combining mark, that is: General_Category=Mark."
					if (CM.has(norm[0])) throw error_placement('leading combining mark');
					for (let i = 1; i < token_count; i++) { // we've already checked the first token
						let cps = tokens[i];
						if (!cps.is_emoji && CM.has(cps[0])) { // every text token has emoji neighbors, eg. EtEEEtEt...
							// bidi_qq() not needed since emoji is LTR and cps is a CM
							throw error_placement(`emoji + combining mark: "${str_from_cps(tokens[i-1])} + ${safe_str_from_cps([cps[0]])}"`); 
						}
					}
					check_fenced(norm);
					let unique = Array_from(new Set(chars));
					let [g] = determine_group(unique); // take the first match
					// see derive: "Matching Groups have Same CM Style"
					// alternative: could form a hybrid type: Latin/Japanese/...	
					check_group(g, chars); // need text in order
					check_whole(g, unique); // only need unique text (order would be required for multiple-char confusables)
					type = g.N;
					// 20230121: consider exposing restricted flag
					// it's simpler to just check for 'Restricted'
					// or even better: type.endsWith(']')
					//if (g.R) info.restricted = true;
				}
			}
			info.type = type;
		} catch (err) {
			info.error = err; // use full error object
		}
		return info;
	});
}

function check_whole(group, unique) {
	let maker;
	let shared = [];
	for (let cp of unique) {
		let whole = WHOLE_MAP.get(cp);
		if (whole === UNIQUE_PH) return; // unique, non-confusable
		if (whole) {
			let set = whole.M.get(cp); // groups which have a character that look-like this character
			maker = maker ? maker.filter(g => set.has(g)) : Array_from(set);
			if (!maker.length) return; // confusable intersection is empty
		} else {
			shared.push(cp); 
		}
	}
	if (maker) {
		// we have 1+ confusable
		// check if any of the remaining groups
		// contain the shared characters too
		for (let g of maker) {
			if (shared.every(cp => group_has_cp(g, cp))) {
				throw new Error(`whole-script confusable: ${group.N}/${g.N}`);
			}
		}
	}
}

// assumption: unique.size > 0
// returns list of matching groups
function determine_group(unique) {
	let groups = GROUPS;
	for (let cp of unique) {
		// note: we need to dodge CM that are whitelisted
		// but that code isn't currently necessary
		let gs = groups.filter(g => group_has_cp(g, cp));
		if (!gs.length) {
			if (!GROUPS.some(g => group_has_cp(g, cp))) { 
				// the character was composed of valid parts
				// but it's NFC form is invalid
				// 20230716: change to more exact statement, see: ENSNormalize.{cs,java}
				// note: this doesn't have to be a composition
				// 20230720: change to full check
				throw error_disallowed(cp); // this should be rare
			} else {
				// there is no group that contains all these characters
				// throw using the highest priority group that matched
				// https://www.unicode.org/reports/tr39/#mixed_script_confusables
				throw error_group_member(groups[0], cp);
			}
		}
		groups = gs;
		if (gs.length == 1) break; // there is only one group left
	}
	// there are at least 1 group(s) with all of these characters
	return groups;
}

// throw on first error
function flatten(split) {
	return split.map(({input, error, output}) => {
		if (error) {
			// don't print label again if just a single label
			let msg = error.message;
			// bidi_qq() only necessary if msg is digits
			throw new Error(split.length == 1 ? msg : `Invalid label ${bidi_qq(safe_str_from_cps(input, 63))}: ${msg}`); 
		}
		return str_from_cps(output);
	}).join(STOP_CH);
}

function error_disallowed(cp) {
	// TODO: add cp to error?
	return new Error(`disallowed character: ${quoted_cp(cp)}`); 
}
function error_group_member(g, cp) {
	let quoted = quoted_cp(cp);
	let gg = GROUPS.find(g => g.P.has(cp)); // only check primary
	if (gg) {
		quoted = `${gg.N} ${quoted}`;
	}
	return new Error(`illegal mixture: ${g.N} + ${quoted}`);
}
function error_placement(where) {
	return new Error(`illegal placement: ${where}`);
}

// assumption: cps.length > 0
// assumption: cps[0] isn't a CM
// assumption: the previous character isn't an emoji
function check_group(g, cps) {
	for (let cp of cps) {
		if (!group_has_cp(g, cp)) {
			// for whitelisted scripts, this will throw illegal mixture on invalid cm, eg. "e{300}{300}"
			// at the moment, it's unnecessary to introduce an extra error type
			// until there exists a whitelisted multi-character
			//   eg. if (M < 0 && is_combining_mark(cp)) { ... }
			// there are 3 cases:
			//   1. illegal cm for wrong group => mixture error
			//   2. illegal cm for same group => cm error
			//       requires set of whitelist cm per group: 
			//        eg. new Set([...g.P, ...g.Q].flatMap(nfc).filter(cp => CM.has(cp)))
			//   3. wrong group => mixture error
			throw error_group_member(g, cp);
		}
	}
	//if (M >= 0) { // we have a known fixed cm count
	if (g.M) { // we need to check for NSM
		let decomposed = nfd(cps);
		for (let i = 1, e = decomposed.length; i < e; i++) { // see: assumption
			// 20230210: bugfix: using cps instead of decomposed h/t Carbon225
			/*
			if (CM.has(decomposed[i])) {
				let j = i + 1;
				while (j < e && CM.has(decomposed[j])) j++;
				if (j - i > M) {
					throw new Error(`too many combining marks: ${g.N} ${bidi_qq(str_from_cps(decomposed.slice(i-1, j)))} (${j-i}/${M})`);
				}
				i = j;
			}
			*/
			// 20230217: switch to NSM counting
			// https://www.unicode.org/reports/tr39/#Optional_Detection
			if (NSM.has(decomposed[i])) {
				let j = i + 1;
				for (let cp; j < e && NSM.has(cp = decomposed[j]); j++) {
					// a. Forbid sequences of the same nonspacing mark.
					for (let k = i; k < j; k++) { // O(n^2) but n < 100
						if (decomposed[k] == cp) {
							throw new Error(`duplicate non-spacing marks: ${quoted_cp(cp)}`);
						}
					}
				}
				// parse to end so we have full nsm count
				// b. Forbid sequences of more than 4 nonspacing marks (gc=Mn or gc=Me).
				if (j - i > NSM_MAX) {
					// note: this slice starts with a base char or spacing-mark cm
					throw new Error(`excessive non-spacing marks: ${bidi_qq(safe_str_from_cps(decomposed.slice(i-1, j)))} (${j-i}/${NSM_MAX})`);
				}
				i = j;
			}
		}
	}
	// *** this code currently isn't needed ***
	/*
	let cm_whitelist = M instanceof Map;
	for (let i = 0, e = cps.length; i < e; ) {
		let cp = cps[i++];
		let seqs = cm_whitelist && M.get(cp);
		if (seqs) { 
			// list of codepoints that can follow
			// if this exists, this will always be 1+
			let j = i;
			while (j < e && CM.has(cps[j])) j++;
			let cms = cps.slice(i, j);
			let match = seqs.find(seq => !compare_arrays(seq, cms));
			if (!match) throw new Error(`disallowed combining mark sequence: "${safe_str_from_cps([cp, ...cms])}"`);
			i = j;
		} else if (!V.has(cp)) {
			// https://www.unicode.org/reports/tr39/#mixed_script_confusables
			let quoted = quoted_cp(cp);
			for (let cp of cps) {
				let u = UNIQUE.get(cp);
				if (u && u !== g) {
					// if both scripts are restricted this error is confusing
					// because we don't differentiate RestrictedA from RestrictedB 
					if (!u.R) quoted = `${quoted} is ${u.N}`;
					break;
				}
			}
			throw new Error(`disallowed ${g.N} character: ${quoted}`);
			//throw new Error(`disallowed character: ${quoted} (expected ${g.N})`);
			//throw new Error(`${g.N} does not allow: ${quoted}`);
		}
	}
	if (!cm_whitelist) {
		let decomposed = nfd(cps);
		for (let i = 1, e = decomposed.length; i < e; i++) { // we know it can't be cm leading
			if (CM.has(decomposed[i])) {
				let j = i + 1;
				while (j < e && CM.has(decomposed[j])) j++;
				if (j - i > M) {
					throw new Error(`too many combining marks: "${str_from_cps(decomposed.slice(i-1, j))}" (${j-i}/${M})`);
				}
				i = j;
			}
		}
	}
	*/
}

// given a list of codepoints
// returns a list of lists, where emoji are a fully-qualified (as Array subclass)
// eg. explode_cp("abc💩d") => [[61, 62, 63], Emoji[1F4A9, FE0F], [64]]
// 20230818: rename for 'process' name collision h/t Javarome
// https://github.com/adraffy/ens-normalize.js/issues/23
function tokens_from_str(input, nf, ef) {
	let ret = [];
	let chars = [];
	input = input.slice().reverse(); // flip so we can pop
	while (input.length) {
		let emoji = consume_emoji_reversed(input);
		if (emoji) {
			if (chars.length) {
				ret.push(nf(chars));
				chars = [];
			}
			ret.push(ef(emoji));
		} else {
			let cp = input.pop();
			if (VALID.has(cp)) {
				chars.push(cp);
			} else {
				let cps = MAPPED.get(cp);
				if (cps) {
					chars.push(...cps); // less than 10 elements
				} else if (!IGNORED.has(cp)) {
					// 20230912: unicode 15.1 changed the order of processing such that
					// disallowed parts are only rejected after NFC
					// https://unicode.org/reports/tr46/#Validity_Criteria
					// this doesn't impact normalization as of today
					// technically, this error can be removed as the group logic will apply similar logic
					// however the error type might be less clear
					throw error_disallowed(cp);
				}
			}
		}
	}
	if (chars.length) {
		ret.push(nf(chars));
	}
	return ret;
}

function filter_fe0f(cps) {
	return cps.filter(cp => cp != FE0F);
}

// given array of codepoints
// returns the longest valid emoji sequence (or undefined if no match)
// *MUTATES* the supplied array
// disallows interleaved ignored characters
// fills (optional) eaten array with matched codepoints
function consume_emoji_reversed(cps, eaten) {
	let node = EMOJI_ROOT;
	let emoji;
	let pos = cps.length;
	while (pos) {
		node = node.get(cps[--pos]);
		if (!node) break;
		let {V} = node;
		if (V) { // this is a valid emoji (so far)
			emoji = V;
			if (eaten) eaten.push(...cps.slice(pos).reverse()); // (optional) copy input, used for ens_tokenize()
			cps.length = pos; // truncate
		}
	}
	return emoji;
}

const Zeros = new Uint8Array(32);
Zeros.fill(0);
function checkComponent(comp) {
    assertArgument(comp.length !== 0, "invalid ENS name; empty component", "comp", comp);
    return comp;
}
function ensNameSplit(name) {
    const bytes = toUtf8Bytes(ensNormalize(name));
    const comps = [];
    if (name.length === 0) {
        return comps;
    }
    let last = 0;
    for (let i = 0; i < bytes.length; i++) {
        const d = bytes[i];
        // A separator (i.e. "."); copy this component
        if (d === 0x2e) {
            comps.push(checkComponent(bytes.slice(last, i)));
            last = i + 1;
        }
    }
    // There was a stray separator at the end of the name
    assertArgument(last < bytes.length, "invalid ENS name; empty component", "name", name);
    comps.push(checkComponent(bytes.slice(last)));
    return comps;
}
/**
 *  Returns the ENS %%name%% normalized.
 */
function ensNormalize(name) {
    try {
        if (name.length === 0) {
            throw new Error("empty label");
        }
        return ens_normalize(name);
    }
    catch (error) {
        assertArgument(false, `invalid ENS name (${error.message})`, "name", name);
    }
}
/**
 *  Returns the [[link-namehash]] for %%name%%.
 */
function namehash(name) {
    assertArgument(typeof (name) === "string", "invalid ENS name; not a string", "name", name);
    assertArgument(name.length, `invalid ENS name (empty label)`, "name", name);
    let result = Zeros;
    const comps = ensNameSplit(name);
    while (comps.length) {
        result = keccak256(concat([result, keccak256((comps.pop()))]));
    }
    return hexlify(result);
}
/**
 *  Returns the DNS encoded %%name%%.
 *
 *  This is used for various parts of ENS name resolution, such
 *  as the wildcard resolution.
 */
function dnsEncode(name, _maxLength) {
    const length = (_maxLength != null) ? _maxLength : 63;
    assertArgument(length <= 255, "DNS encoded label cannot exceed 255", "length", length);
    return hexlify(concat(ensNameSplit(name).map((comp) => {
        assertArgument(comp.length <= length, `label ${JSON.stringify(name)} exceeds ${length} bytes`, "name", name);
        const bytes = new Uint8Array(comp.length + 1);
        bytes.set(comp, 1);
        bytes[0] = bytes.length - 1;
        return bytes;
    }))) + "00";
}

function accessSetify(addr, storageKeys) {
    return {
        address: getAddress(addr),
        storageKeys: storageKeys.map((storageKey, index) => {
            assertArgument(isHexString(storageKey, 32), "invalid slot", `storageKeys[${index}]`, storageKey);
            return storageKey.toLowerCase();
        })
    };
}
/**
 *  Returns a [[AccessList]] from any ethers-supported access-list structure.
 */
function accessListify(value) {
    if (Array.isArray(value)) {
        return value.map((set, index) => {
            if (Array.isArray(set)) {
                assertArgument(set.length === 2, "invalid slot set", `value[${index}]`, set);
                return accessSetify(set[0], set[1]);
            }
            assertArgument(set != null && typeof (set) === "object", "invalid address-slot set", "value", value);
            return accessSetify(set.address, set.storageKeys);
        });
    }
    assertArgument(value != null && typeof (value) === "object", "invalid access list", "value", value);
    const result = Object.keys(value).map((addr) => {
        const storageKeys = value[addr].reduce((accum, storageKey) => {
            accum[storageKey] = true;
            return accum;
        }, {});
        return accessSetify(addr, Object.keys(storageKeys).sort());
    });
    result.sort((a, b) => (a.address.localeCompare(b.address)));
    return result;
}

/**
 *  Returns the address for the %%key%%.
 *
 *  The key may be any standard form of public key or a private key.
 */
function computeAddress(key) {
    let pubkey;
    if (typeof (key) === "string") {
        pubkey = SigningKey.computePublicKey(key, false);
    }
    else {
        pubkey = key.publicKey;
    }
    return getAddress(keccak256("0x" + pubkey.substring(4)).substring(26));
}
/**
 *  Returns the recovered address for the private key that was
 *  used to sign %%digest%% that resulted in %%signature%%.
 */
function recoverAddress(digest, signature) {
    return computeAddress(SigningKey.recoverPublicKey(digest, signature));
}

const BN_0$4 = BigInt(0);
const BN_2$1 = BigInt(2);
const BN_27 = BigInt(27);
const BN_28 = BigInt(28);
const BN_35 = BigInt(35);
const BN_MAX_UINT = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const BLOB_SIZE = 4096 * 32;
function getVersionedHash(version, hash) {
    let versioned = version.toString(16);
    while (versioned.length < 2) {
        versioned = "0" + versioned;
    }
    versioned += sha256(hash).substring(4);
    return "0x" + versioned;
}
function handleAddress(value) {
    if (value === "0x") {
        return null;
    }
    return getAddress(value);
}
function handleAccessList(value, param) {
    try {
        return accessListify(value);
    }
    catch (error) {
        assertArgument(false, error.message, param, value);
    }
}
function handleNumber(_value, param) {
    if (_value === "0x") {
        return 0;
    }
    return getNumber(_value, param);
}
function handleUint(_value, param) {
    if (_value === "0x") {
        return BN_0$4;
    }
    const value = getBigInt(_value, param);
    assertArgument(value <= BN_MAX_UINT, "value exceeds uint size", param, value);
    return value;
}
function formatNumber(_value, name) {
    const value = getBigInt(_value, "value");
    const result = toBeArray(value);
    assertArgument(result.length <= 32, `value too large`, `tx.${name}`, value);
    return result;
}
function formatAccessList(value) {
    return accessListify(value).map((set) => [set.address, set.storageKeys]);
}
function formatHashes(value, param) {
    assertArgument(Array.isArray(value), `invalid ${param}`, "value", value);
    for (let i = 0; i < value.length; i++) {
        assertArgument(isHexString(value[i], 32), "invalid ${ param } hash", `value[${i}]`, value[i]);
    }
    return value;
}
function _parseLegacy(data) {
    const fields = decodeRlp(data);
    assertArgument(Array.isArray(fields) && (fields.length === 9 || fields.length === 6), "invalid field count for legacy transaction", "data", data);
    const tx = {
        type: 0,
        nonce: handleNumber(fields[0], "nonce"),
        gasPrice: handleUint(fields[1], "gasPrice"),
        gasLimit: handleUint(fields[2], "gasLimit"),
        to: handleAddress(fields[3]),
        value: handleUint(fields[4], "value"),
        data: hexlify(fields[5]),
        chainId: BN_0$4
    };
    // Legacy unsigned transaction
    if (fields.length === 6) {
        return tx;
    }
    const v = handleUint(fields[6], "v");
    const r = handleUint(fields[7], "r");
    const s = handleUint(fields[8], "s");
    if (r === BN_0$4 && s === BN_0$4) {
        // EIP-155 unsigned transaction
        tx.chainId = v;
    }
    else {
        // Compute the EIP-155 chain ID (or 0 for legacy)
        let chainId = (v - BN_35) / BN_2$1;
        if (chainId < BN_0$4) {
            chainId = BN_0$4;
        }
        tx.chainId = chainId;
        // Signed Legacy Transaction
        assertArgument(chainId !== BN_0$4 || (v === BN_27 || v === BN_28), "non-canonical legacy v", "v", fields[6]);
        tx.signature = Signature.from({
            r: zeroPadValue(fields[7], 32),
            s: zeroPadValue(fields[8], 32),
            v
        });
        //tx.hash = keccak256(data);
    }
    return tx;
}
function _serializeLegacy(tx, sig) {
    const fields = [
        formatNumber(tx.nonce, "nonce"),
        formatNumber(tx.gasPrice || 0, "gasPrice"),
        formatNumber(tx.gasLimit, "gasLimit"),
        (tx.to || "0x"),
        formatNumber(tx.value, "value"),
        tx.data,
    ];
    let chainId = BN_0$4;
    if (tx.chainId != BN_0$4) {
        // A chainId was provided; if non-zero we'll use EIP-155
        chainId = getBigInt(tx.chainId, "tx.chainId");
        // We have a chainId in the tx and an EIP-155 v in the signature,
        // make sure they agree with each other
        assertArgument(!sig || sig.networkV == null || sig.legacyChainId === chainId, "tx.chainId/sig.v mismatch", "sig", sig);
    }
    else if (tx.signature) {
        // No explicit chainId, but EIP-155 have a derived implicit chainId
        const legacy = tx.signature.legacyChainId;
        if (legacy != null) {
            chainId = legacy;
        }
    }
    // Requesting an unsigned transaction
    if (!sig) {
        // We have an EIP-155 transaction (chainId was specified and non-zero)
        if (chainId !== BN_0$4) {
            fields.push(toBeArray(chainId));
            fields.push("0x");
            fields.push("0x");
        }
        return encodeRlp(fields);
    }
    // @TODO: We should probably check that tx.signature, chainId, and sig
    //        match but that logic could break existing code, so schedule
    //        this for the next major bump.
    // Compute the EIP-155 v
    let v = BigInt(27 + sig.yParity);
    if (chainId !== BN_0$4) {
        v = Signature.getChainIdV(chainId, sig.v);
    }
    else if (BigInt(sig.v) !== v) {
        assertArgument(false, "tx.chainId/sig.v mismatch", "sig", sig);
    }
    // Add the signature
    fields.push(toBeArray(v));
    fields.push(toBeArray(sig.r));
    fields.push(toBeArray(sig.s));
    return encodeRlp(fields);
}
function _parseEipSignature(tx, fields) {
    let yParity;
    try {
        yParity = handleNumber(fields[0], "yParity");
        if (yParity !== 0 && yParity !== 1) {
            throw new Error("bad yParity");
        }
    }
    catch (error) {
        assertArgument(false, "invalid yParity", "yParity", fields[0]);
    }
    const r = zeroPadValue(fields[1], 32);
    const s = zeroPadValue(fields[2], 32);
    const signature = Signature.from({ r, s, yParity });
    tx.signature = signature;
}
function _parseEip1559(data) {
    const fields = decodeRlp(getBytes(data).slice(1));
    assertArgument(Array.isArray(fields) && (fields.length === 9 || fields.length === 12), "invalid field count for transaction type: 2", "data", hexlify(data));
    const tx = {
        type: 2,
        chainId: handleUint(fields[0], "chainId"),
        nonce: handleNumber(fields[1], "nonce"),
        maxPriorityFeePerGas: handleUint(fields[2], "maxPriorityFeePerGas"),
        maxFeePerGas: handleUint(fields[3], "maxFeePerGas"),
        gasPrice: null,
        gasLimit: handleUint(fields[4], "gasLimit"),
        to: handleAddress(fields[5]),
        value: handleUint(fields[6], "value"),
        data: hexlify(fields[7]),
        accessList: handleAccessList(fields[8], "accessList"),
    };
    // Unsigned EIP-1559 Transaction
    if (fields.length === 9) {
        return tx;
    }
    //tx.hash = keccak256(data);
    _parseEipSignature(tx, fields.slice(9));
    return tx;
}
function _serializeEip1559(tx, sig) {
    const fields = [
        formatNumber(tx.chainId, "chainId"),
        formatNumber(tx.nonce, "nonce"),
        formatNumber(tx.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
        formatNumber(tx.maxFeePerGas || 0, "maxFeePerGas"),
        formatNumber(tx.gasLimit, "gasLimit"),
        (tx.to || "0x"),
        formatNumber(tx.value, "value"),
        tx.data,
        formatAccessList(tx.accessList || [])
    ];
    if (sig) {
        fields.push(formatNumber(sig.yParity, "yParity"));
        fields.push(toBeArray(sig.r));
        fields.push(toBeArray(sig.s));
    }
    return concat(["0x02", encodeRlp(fields)]);
}
function _parseEip2930(data) {
    const fields = decodeRlp(getBytes(data).slice(1));
    assertArgument(Array.isArray(fields) && (fields.length === 8 || fields.length === 11), "invalid field count for transaction type: 1", "data", hexlify(data));
    const tx = {
        type: 1,
        chainId: handleUint(fields[0], "chainId"),
        nonce: handleNumber(fields[1], "nonce"),
        gasPrice: handleUint(fields[2], "gasPrice"),
        gasLimit: handleUint(fields[3], "gasLimit"),
        to: handleAddress(fields[4]),
        value: handleUint(fields[5], "value"),
        data: hexlify(fields[6]),
        accessList: handleAccessList(fields[7], "accessList")
    };
    // Unsigned EIP-2930 Transaction
    if (fields.length === 8) {
        return tx;
    }
    //tx.hash = keccak256(data);
    _parseEipSignature(tx, fields.slice(8));
    return tx;
}
function _serializeEip2930(tx, sig) {
    const fields = [
        formatNumber(tx.chainId, "chainId"),
        formatNumber(tx.nonce, "nonce"),
        formatNumber(tx.gasPrice || 0, "gasPrice"),
        formatNumber(tx.gasLimit, "gasLimit"),
        (tx.to || "0x"),
        formatNumber(tx.value, "value"),
        tx.data,
        formatAccessList(tx.accessList || [])
    ];
    if (sig) {
        fields.push(formatNumber(sig.yParity, "recoveryParam"));
        fields.push(toBeArray(sig.r));
        fields.push(toBeArray(sig.s));
    }
    return concat(["0x01", encodeRlp(fields)]);
}
function _parseEip4844(data) {
    let fields = decodeRlp(getBytes(data).slice(1));
    let typeName = "3";
    let blobs = null;
    // Parse the network format
    if (fields.length === 4 && Array.isArray(fields[0])) {
        typeName = "3 (network format)";
        const fBlobs = fields[1], fCommits = fields[2], fProofs = fields[3];
        assertArgument(Array.isArray(fBlobs), "invalid network format: blobs not an array", "fields[1]", fBlobs);
        assertArgument(Array.isArray(fCommits), "invalid network format: commitments not an array", "fields[2]", fCommits);
        assertArgument(Array.isArray(fProofs), "invalid network format: proofs not an array", "fields[3]", fProofs);
        assertArgument(fBlobs.length === fCommits.length, "invalid network format: blobs/commitments length mismatch", "fields", fields);
        assertArgument(fBlobs.length === fProofs.length, "invalid network format: blobs/proofs length mismatch", "fields", fields);
        blobs = [];
        for (let i = 0; i < fields[1].length; i++) {
            blobs.push({
                data: fBlobs[i],
                commitment: fCommits[i],
                proof: fProofs[i],
            });
        }
        fields = fields[0];
    }
    assertArgument(Array.isArray(fields) && (fields.length === 11 || fields.length === 14), `invalid field count for transaction type: ${typeName}`, "data", hexlify(data));
    const tx = {
        type: 3,
        chainId: handleUint(fields[0], "chainId"),
        nonce: handleNumber(fields[1], "nonce"),
        maxPriorityFeePerGas: handleUint(fields[2], "maxPriorityFeePerGas"),
        maxFeePerGas: handleUint(fields[3], "maxFeePerGas"),
        gasPrice: null,
        gasLimit: handleUint(fields[4], "gasLimit"),
        to: handleAddress(fields[5]),
        value: handleUint(fields[6], "value"),
        data: hexlify(fields[7]),
        accessList: handleAccessList(fields[8], "accessList"),
        maxFeePerBlobGas: handleUint(fields[9], "maxFeePerBlobGas"),
        blobVersionedHashes: fields[10]
    };
    if (blobs) {
        tx.blobs = blobs;
    }
    assertArgument(tx.to != null, `invalid address for transaction type: ${typeName}`, "data", data);
    assertArgument(Array.isArray(tx.blobVersionedHashes), "invalid blobVersionedHashes: must be an array", "data", data);
    for (let i = 0; i < tx.blobVersionedHashes.length; i++) {
        assertArgument(isHexString(tx.blobVersionedHashes[i], 32), `invalid blobVersionedHash at index ${i}: must be length 32`, "data", data);
    }
    // Unsigned EIP-4844 Transaction
    if (fields.length === 11) {
        return tx;
    }
    // @TODO: Do we need to do this? This is only called internally
    // and used to verify hashes; it might save time to not do this
    //tx.hash = keccak256(concat([ "0x03", encodeRlp(fields) ]));
    _parseEipSignature(tx, fields.slice(11));
    return tx;
}
function _serializeEip4844(tx, sig, blobs) {
    const fields = [
        formatNumber(tx.chainId, "chainId"),
        formatNumber(tx.nonce, "nonce"),
        formatNumber(tx.maxPriorityFeePerGas || 0, "maxPriorityFeePerGas"),
        formatNumber(tx.maxFeePerGas || 0, "maxFeePerGas"),
        formatNumber(tx.gasLimit, "gasLimit"),
        (tx.to || ZeroAddress),
        formatNumber(tx.value, "value"),
        tx.data,
        formatAccessList(tx.accessList || []),
        formatNumber(tx.maxFeePerBlobGas || 0, "maxFeePerBlobGas"),
        formatHashes(tx.blobVersionedHashes || [], "blobVersionedHashes")
    ];
    if (sig) {
        fields.push(formatNumber(sig.yParity, "yParity"));
        fields.push(toBeArray(sig.r));
        fields.push(toBeArray(sig.s));
        // We have blobs; return the network wrapped format
        if (blobs) {
            return concat([
                "0x03",
                encodeRlp([
                    fields,
                    blobs.map((b) => b.data),
                    blobs.map((b) => b.commitment),
                    blobs.map((b) => b.proof),
                ])
            ]);
        }
    }
    return concat(["0x03", encodeRlp(fields)]);
}
/**
 *  A **Transaction** describes an operation to be executed on
 *  Ethereum by an Externally Owned Account (EOA). It includes
 *  who (the [[to]] address), what (the [[data]]) and how much (the
 *  [[value]] in ether) the operation should entail.
 *
 *  @example:
 *    tx = new Transaction()
 *    //_result:
 *
 *    tx.data = "0x1234";
 *    //_result:
 */
class Transaction {
    #type;
    #to;
    #data;
    #nonce;
    #gasLimit;
    #gasPrice;
    #maxPriorityFeePerGas;
    #maxFeePerGas;
    #value;
    #chainId;
    #sig;
    #accessList;
    #maxFeePerBlobGas;
    #blobVersionedHashes;
    #kzg;
    #blobs;
    /**
     *  The transaction type.
     *
     *  If null, the type will be automatically inferred based on
     *  explicit properties.
     */
    get type() { return this.#type; }
    set type(value) {
        switch (value) {
            case null:
                this.#type = null;
                break;
            case 0:
            case "legacy":
                this.#type = 0;
                break;
            case 1:
            case "berlin":
            case "eip-2930":
                this.#type = 1;
                break;
            case 2:
            case "london":
            case "eip-1559":
                this.#type = 2;
                break;
            case 3:
            case "cancun":
            case "eip-4844":
                this.#type = 3;
                break;
            default:
                assertArgument(false, "unsupported transaction type", "type", value);
        }
    }
    /**
     *  The name of the transaction type.
     */
    get typeName() {
        switch (this.type) {
            case 0: return "legacy";
            case 1: return "eip-2930";
            case 2: return "eip-1559";
            case 3: return "eip-4844";
        }
        return null;
    }
    /**
     *  The ``to`` address for the transaction or ``null`` if the
     *  transaction is an ``init`` transaction.
     */
    get to() {
        const value = this.#to;
        if (value == null && this.type === 3) {
            return ZeroAddress;
        }
        return value;
    }
    set to(value) {
        this.#to = (value == null) ? null : getAddress(value);
    }
    /**
     *  The transaction nonce.
     */
    get nonce() { return this.#nonce; }
    set nonce(value) { this.#nonce = getNumber(value, "value"); }
    /**
     *  The gas limit.
     */
    get gasLimit() { return this.#gasLimit; }
    set gasLimit(value) { this.#gasLimit = getBigInt(value); }
    /**
     *  The gas price.
     *
     *  On legacy networks this defines the fee that will be paid. On
     *  EIP-1559 networks, this should be ``null``.
     */
    get gasPrice() {
        const value = this.#gasPrice;
        if (value == null && (this.type === 0 || this.type === 1)) {
            return BN_0$4;
        }
        return value;
    }
    set gasPrice(value) {
        this.#gasPrice = (value == null) ? null : getBigInt(value, "gasPrice");
    }
    /**
     *  The maximum priority fee per unit of gas to pay. On legacy
     *  networks this should be ``null``.
     */
    get maxPriorityFeePerGas() {
        const value = this.#maxPriorityFeePerGas;
        if (value == null) {
            if (this.type === 2 || this.type === 3) {
                return BN_0$4;
            }
            return null;
        }
        return value;
    }
    set maxPriorityFeePerGas(value) {
        this.#maxPriorityFeePerGas = (value == null) ? null : getBigInt(value, "maxPriorityFeePerGas");
    }
    /**
     *  The maximum total fee per unit of gas to pay. On legacy
     *  networks this should be ``null``.
     */
    get maxFeePerGas() {
        const value = this.#maxFeePerGas;
        if (value == null) {
            if (this.type === 2 || this.type === 3) {
                return BN_0$4;
            }
            return null;
        }
        return value;
    }
    set maxFeePerGas(value) {
        this.#maxFeePerGas = (value == null) ? null : getBigInt(value, "maxFeePerGas");
    }
    /**
     *  The transaction data. For ``init`` transactions this is the
     *  deployment code.
     */
    get data() { return this.#data; }
    set data(value) { this.#data = hexlify(value); }
    /**
     *  The amount of ether (in wei) to send in this transactions.
     */
    get value() { return this.#value; }
    set value(value) {
        this.#value = getBigInt(value, "value");
    }
    /**
     *  The chain ID this transaction is valid on.
     */
    get chainId() { return this.#chainId; }
    set chainId(value) { this.#chainId = getBigInt(value); }
    /**
     *  If signed, the signature for this transaction.
     */
    get signature() { return this.#sig || null; }
    set signature(value) {
        this.#sig = (value == null) ? null : Signature.from(value);
    }
    /**
     *  The access list.
     *
     *  An access list permits discounted (but pre-paid) access to
     *  bytecode and state variable access within contract execution.
     */
    get accessList() {
        const value = this.#accessList || null;
        if (value == null) {
            if (this.type === 1 || this.type === 2 || this.type === 3) {
                // @TODO: in v7, this should assign the value or become
                // a live object itself, otherwise mutation is inconsistent
                return [];
            }
            return null;
        }
        return value;
    }
    set accessList(value) {
        this.#accessList = (value == null) ? null : accessListify(value);
    }
    /**
     *  The max fee per blob gas for Cancun transactions.
     */
    get maxFeePerBlobGas() {
        const value = this.#maxFeePerBlobGas;
        if (value == null && this.type === 3) {
            return BN_0$4;
        }
        return value;
    }
    set maxFeePerBlobGas(value) {
        this.#maxFeePerBlobGas = (value == null) ? null : getBigInt(value, "maxFeePerBlobGas");
    }
    /**
     *  The BLOb versioned hashes for Cancun transactions.
     */
    get blobVersionedHashes() {
        // @TODO: Mutation is inconsistent; if unset, the returned value
        // cannot mutate the object, if set it can
        let value = this.#blobVersionedHashes;
        if (value == null && this.type === 3) {
            return [];
        }
        return value;
    }
    set blobVersionedHashes(value) {
        if (value != null) {
            assertArgument(Array.isArray(value), "blobVersionedHashes must be an Array", "value", value);
            value = value.slice();
            for (let i = 0; i < value.length; i++) {
                assertArgument(isHexString(value[i], 32), "invalid blobVersionedHash", `value[${i}]`, value[i]);
            }
        }
        this.#blobVersionedHashes = value;
    }
    /**
     *  The BLObs for the Transaction, if any.
     *
     *  If ``blobs`` is non-``null``, then the [[seriailized]]
     *  will return the network formatted sidecar, otherwise it
     *  will return the standard [[link-eip-2718]] payload. The
     *  [[unsignedSerialized]] is unaffected regardless.
     *
     *  When setting ``blobs``, either fully valid [[Blob]] objects
     *  may be specified (i.e. correctly padded, with correct
     *  committments and proofs) or a raw [[BytesLike]] may
     *  be provided.
     *
     *  If raw [[BytesLike]] are provided, the [[kzg]] property **must**
     *  be already set. The blob will be correctly padded and the
     *  [[KzgLibrary]] will be used to compute the committment and
     *  proof for the blob.
     *
     *  A BLOb is a sequence of field elements, each of which must
     *  be within the BLS field modulo, so some additional processing
     *  may be required to encode arbitrary data to ensure each 32 byte
     *  field is within the valid range.
     *
     *  Setting this automatically populates [[blobVersionedHashes]],
     *  overwriting any existing values. Setting this to ``null``
     *  does **not** remove the [[blobVersionedHashes]], leaving them
     *  present.
     */
    get blobs() {
        if (this.#blobs == null) {
            return null;
        }
        return this.#blobs.map((b) => Object.assign({}, b));
    }
    set blobs(_blobs) {
        if (_blobs == null) {
            this.#blobs = null;
            return;
        }
        const blobs = [];
        const versionedHashes = [];
        for (let i = 0; i < _blobs.length; i++) {
            const blob = _blobs[i];
            if (isBytesLike(blob)) {
                assert(this.#kzg, "adding a raw blob requires a KZG library", "UNSUPPORTED_OPERATION", {
                    operation: "set blobs()"
                });
                let data = getBytes(blob);
                assertArgument(data.length <= BLOB_SIZE, "blob is too large", `blobs[${i}]`, blob);
                // Pad blob if necessary
                if (data.length !== BLOB_SIZE) {
                    const padded = new Uint8Array(BLOB_SIZE);
                    padded.set(data);
                    data = padded;
                }
                const commit = this.#kzg.blobToKzgCommitment(data);
                const proof = hexlify(this.#kzg.computeBlobKzgProof(data, commit));
                blobs.push({
                    data: hexlify(data),
                    commitment: hexlify(commit),
                    proof
                });
                versionedHashes.push(getVersionedHash(1, commit));
            }
            else {
                const commit = hexlify(blob.commitment);
                blobs.push({
                    data: hexlify(blob.data),
                    commitment: commit,
                    proof: hexlify(blob.proof)
                });
                versionedHashes.push(getVersionedHash(1, commit));
            }
        }
        this.#blobs = blobs;
        this.#blobVersionedHashes = versionedHashes;
    }
    get kzg() { return this.#kzg; }
    set kzg(kzg) {
        this.#kzg = kzg;
    }
    /**
     *  Creates a new Transaction with default values.
     */
    constructor() {
        this.#type = null;
        this.#to = null;
        this.#nonce = 0;
        this.#gasLimit = BN_0$4;
        this.#gasPrice = null;
        this.#maxPriorityFeePerGas = null;
        this.#maxFeePerGas = null;
        this.#data = "0x";
        this.#value = BN_0$4;
        this.#chainId = BN_0$4;
        this.#sig = null;
        this.#accessList = null;
        this.#maxFeePerBlobGas = null;
        this.#blobVersionedHashes = null;
        this.#blobs = null;
        this.#kzg = null;
    }
    /**
     *  The transaction hash, if signed. Otherwise, ``null``.
     */
    get hash() {
        if (this.signature == null) {
            return null;
        }
        return keccak256(this.#getSerialized(true, false));
    }
    /**
     *  The pre-image hash of this transaction.
     *
     *  This is the digest that a [[Signer]] must sign to authorize
     *  this transaction.
     */
    get unsignedHash() {
        return keccak256(this.unsignedSerialized);
    }
    /**
     *  The sending address, if signed. Otherwise, ``null``.
     */
    get from() {
        if (this.signature == null) {
            return null;
        }
        return recoverAddress(this.unsignedHash, this.signature);
    }
    /**
     *  The public key of the sender, if signed. Otherwise, ``null``.
     */
    get fromPublicKey() {
        if (this.signature == null) {
            return null;
        }
        return SigningKey.recoverPublicKey(this.unsignedHash, this.signature);
    }
    /**
     *  Returns true if signed.
     *
     *  This provides a Type Guard that properties requiring a signed
     *  transaction are non-null.
     */
    isSigned() {
        return this.signature != null;
    }
    #getSerialized(signed, sidecar) {
        assert(!signed || this.signature != null, "cannot serialize unsigned transaction; maybe you meant .unsignedSerialized", "UNSUPPORTED_OPERATION", { operation: ".serialized" });
        const sig = signed ? this.signature : null;
        switch (this.inferType()) {
            case 0:
                return _serializeLegacy(this, sig);
            case 1:
                return _serializeEip2930(this, sig);
            case 2:
                return _serializeEip1559(this, sig);
            case 3:
                return _serializeEip4844(this, sig, sidecar ? this.blobs : null);
        }
        assert(false, "unsupported transaction type", "UNSUPPORTED_OPERATION", { operation: ".serialized" });
    }
    /**
     *  The serialized transaction.
     *
     *  This throws if the transaction is unsigned. For the pre-image,
     *  use [[unsignedSerialized]].
     */
    get serialized() {
        return this.#getSerialized(true, true);
    }
    /**
     *  The transaction pre-image.
     *
     *  The hash of this is the digest which needs to be signed to
     *  authorize this transaction.
     */
    get unsignedSerialized() {
        return this.#getSerialized(false, false);
    }
    /**
     *  Return the most "likely" type; currently the highest
     *  supported transaction type.
     */
    inferType() {
        const types = this.inferTypes();
        // Prefer London (EIP-1559) over Cancun (BLOb)
        if (types.indexOf(2) >= 0) {
            return 2;
        }
        // Return the highest inferred type
        return (types.pop());
    }
    /**
     *  Validates the explicit properties and returns a list of compatible
     *  transaction types.
     */
    inferTypes() {
        // Checks that there are no conflicting properties set
        const hasGasPrice = this.gasPrice != null;
        const hasFee = (this.maxFeePerGas != null || this.maxPriorityFeePerGas != null);
        const hasAccessList = (this.accessList != null);
        const hasBlob = (this.#maxFeePerBlobGas != null || this.#blobVersionedHashes);
        //if (hasGasPrice && hasFee) {
        //    throw new Error("transaction cannot have gasPrice and maxFeePerGas");
        //}
        if (this.maxFeePerGas != null && this.maxPriorityFeePerGas != null) {
            assert(this.maxFeePerGas >= this.maxPriorityFeePerGas, "priorityFee cannot be more than maxFee", "BAD_DATA", { value: this });
        }
        //if (this.type === 2 && hasGasPrice) {
        //    throw new Error("eip-1559 transaction cannot have gasPrice");
        //}
        assert(!hasFee || (this.type !== 0 && this.type !== 1), "transaction type cannot have maxFeePerGas or maxPriorityFeePerGas", "BAD_DATA", { value: this });
        assert(this.type !== 0 || !hasAccessList, "legacy transaction cannot have accessList", "BAD_DATA", { value: this });
        const types = [];
        // Explicit type
        if (this.type != null) {
            types.push(this.type);
        }
        else {
            if (hasFee) {
                types.push(2);
            }
            else if (hasGasPrice) {
                types.push(1);
                if (!hasAccessList) {
                    types.push(0);
                }
            }
            else if (hasAccessList) {
                types.push(1);
                types.push(2);
            }
            else if (hasBlob && this.to) {
                types.push(3);
            }
            else {
                types.push(0);
                types.push(1);
                types.push(2);
                types.push(3);
            }
        }
        types.sort();
        return types;
    }
    /**
     *  Returns true if this transaction is a legacy transaction (i.e.
     *  ``type === 0``).
     *
     *  This provides a Type Guard that the related properties are
     *  non-null.
     */
    isLegacy() {
        return (this.type === 0);
    }
    /**
     *  Returns true if this transaction is berlin hardform transaction (i.e.
     *  ``type === 1``).
     *
     *  This provides a Type Guard that the related properties are
     *  non-null.
     */
    isBerlin() {
        return (this.type === 1);
    }
    /**
     *  Returns true if this transaction is london hardform transaction (i.e.
     *  ``type === 2``).
     *
     *  This provides a Type Guard that the related properties are
     *  non-null.
     */
    isLondon() {
        return (this.type === 2);
    }
    /**
     *  Returns true if this transaction is an [[link-eip-4844]] BLOB
     *  transaction.
     *
     *  This provides a Type Guard that the related properties are
     *  non-null.
     */
    isCancun() {
        return (this.type === 3);
    }
    /**
     *  Create a copy of this transaciton.
     */
    clone() {
        return Transaction.from(this);
    }
    /**
     *  Return a JSON-friendly object.
     */
    toJSON() {
        const s = (v) => {
            if (v == null) {
                return null;
            }
            return v.toString();
        };
        return {
            type: this.type,
            to: this.to,
            //            from: this.from,
            data: this.data,
            nonce: this.nonce,
            gasLimit: s(this.gasLimit),
            gasPrice: s(this.gasPrice),
            maxPriorityFeePerGas: s(this.maxPriorityFeePerGas),
            maxFeePerGas: s(this.maxFeePerGas),
            value: s(this.value),
            chainId: s(this.chainId),
            sig: this.signature ? this.signature.toJSON() : null,
            accessList: this.accessList
        };
    }
    /**
     *  Create a **Transaction** from a serialized transaction or a
     *  Transaction-like object.
     */
    static from(tx) {
        if (tx == null) {
            return new Transaction();
        }
        if (typeof (tx) === "string") {
            const payload = getBytes(tx);
            if (payload[0] >= 0x7f) { // @TODO: > vs >= ??
                return Transaction.from(_parseLegacy(payload));
            }
            switch (payload[0]) {
                case 1: return Transaction.from(_parseEip2930(payload));
                case 2: return Transaction.from(_parseEip1559(payload));
                case 3: return Transaction.from(_parseEip4844(payload));
            }
            assert(false, "unsupported transaction type", "UNSUPPORTED_OPERATION", { operation: "from" });
        }
        const result = new Transaction();
        if (tx.type != null) {
            result.type = tx.type;
        }
        if (tx.to != null) {
            result.to = tx.to;
        }
        if (tx.nonce != null) {
            result.nonce = tx.nonce;
        }
        if (tx.gasLimit != null) {
            result.gasLimit = tx.gasLimit;
        }
        if (tx.gasPrice != null) {
            result.gasPrice = tx.gasPrice;
        }
        if (tx.maxPriorityFeePerGas != null) {
            result.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
        }
        if (tx.maxFeePerGas != null) {
            result.maxFeePerGas = tx.maxFeePerGas;
        }
        if (tx.maxFeePerBlobGas != null) {
            result.maxFeePerBlobGas = tx.maxFeePerBlobGas;
        }
        if (tx.data != null) {
            result.data = tx.data;
        }
        if (tx.value != null) {
            result.value = tx.value;
        }
        if (tx.chainId != null) {
            result.chainId = tx.chainId;
        }
        if (tx.signature != null) {
            result.signature = Signature.from(tx.signature);
        }
        if (tx.accessList != null) {
            result.accessList = tx.accessList;
        }
        // This will get overwritten by blobs, if present
        if (tx.blobVersionedHashes != null) {
            result.blobVersionedHashes = tx.blobVersionedHashes;
        }
        // Make sure we assign the kzg before assigning blobs, which
        // require the library in the event raw blob data is provided.
        if (tx.kzg != null) {
            result.kzg = tx.kzg;
        }
        if (tx.blobs != null) {
            result.blobs = tx.blobs;
        }
        if (tx.hash != null) {
            assertArgument(result.isSigned(), "unsigned transaction cannot define '.hash'", "tx", tx);
            assertArgument(result.hash === tx.hash, "hash mismatch", "tx", tx);
        }
        if (tx.from != null) {
            assertArgument(result.isSigned(), "unsigned transaction cannot define '.from'", "tx", tx);
            assertArgument(result.from.toLowerCase() === (tx.from || "").toLowerCase(), "from mismatch", "tx", tx);
        }
        return result;
    }
}

//import { TypedDataDomain, TypedDataField } from "@ethersproject/providerabstract-signer";
const padding = new Uint8Array(32);
padding.fill(0);
const BN__1 = BigInt(-1);
const BN_0$3 = BigInt(0);
const BN_1 = BigInt(1);
const BN_MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
function hexPadRight(value) {
    const bytes = getBytes(value);
    const padOffset = bytes.length % 32;
    if (padOffset) {
        return concat([bytes, padding.slice(padOffset)]);
    }
    return hexlify(bytes);
}
const hexTrue = toBeHex(BN_1, 32);
const hexFalse = toBeHex(BN_0$3, 32);
const domainFieldTypes = {
    name: "string",
    version: "string",
    chainId: "uint256",
    verifyingContract: "address",
    salt: "bytes32"
};
const domainFieldNames = [
    "name", "version", "chainId", "verifyingContract", "salt"
];
function checkString(key) {
    return function (value) {
        assertArgument(typeof (value) === "string", `invalid domain value for ${JSON.stringify(key)}`, `domain.${key}`, value);
        return value;
    };
}
const domainChecks = {
    name: checkString("name"),
    version: checkString("version"),
    chainId: function (_value) {
        const value = getBigInt(_value, "domain.chainId");
        assertArgument(value >= 0, "invalid chain ID", "domain.chainId", _value);
        if (Number.isSafeInteger(value)) {
            return Number(value);
        }
        return toQuantity(value);
    },
    verifyingContract: function (value) {
        try {
            return getAddress(value).toLowerCase();
        }
        catch (error) { }
        assertArgument(false, `invalid domain value "verifyingContract"`, "domain.verifyingContract", value);
    },
    salt: function (value) {
        const bytes = getBytes(value, "domain.salt");
        assertArgument(bytes.length === 32, `invalid domain value "salt"`, "domain.salt", value);
        return hexlify(bytes);
    }
};
function getBaseEncoder(type) {
    // intXX and uintXX
    {
        const match = type.match(/^(u?)int(\d+)$/);
        if (match) {
            const signed = (match[1] === "");
            const width = parseInt(match[2]);
            assertArgument(width % 8 === 0 && width !== 0 && width <= 256 && match[2] === String(width), "invalid numeric width", "type", type);
            const boundsUpper = mask(BN_MAX_UINT256, signed ? (width - 1) : width);
            const boundsLower = signed ? ((boundsUpper + BN_1) * BN__1) : BN_0$3;
            return function (_value) {
                const value = getBigInt(_value, "value");
                assertArgument(value >= boundsLower && value <= boundsUpper, `value out-of-bounds for ${type}`, "value", value);
                return toBeHex(signed ? toTwos(value, 256) : value, 32);
            };
        }
    }
    // bytesXX
    {
        const match = type.match(/^bytes(\d+)$/);
        if (match) {
            const width = parseInt(match[1]);
            assertArgument(width !== 0 && width <= 32 && match[1] === String(width), "invalid bytes width", "type", type);
            return function (value) {
                const bytes = getBytes(value);
                assertArgument(bytes.length === width, `invalid length for ${type}`, "value", value);
                return hexPadRight(value);
            };
        }
    }
    switch (type) {
        case "address": return function (value) {
            return zeroPadValue(getAddress(value), 32);
        };
        case "bool": return function (value) {
            return ((!value) ? hexFalse : hexTrue);
        };
        case "bytes": return function (value) {
            return keccak256(value);
        };
        case "string": return function (value) {
            return id(value);
        };
    }
    return null;
}
function encodeType(name, fields) {
    return `${name}(${fields.map(({ name, type }) => (type + " " + name)).join(",")})`;
}
// foo[][3] => { base: "foo", index: "[][3]", array: {
//     base: "foo", prefix: "foo[]", count: 3 } }
function splitArray(type) {
    const match = type.match(/^([^\x5b]*)((\x5b\d*\x5d)*)(\x5b(\d*)\x5d)$/);
    if (match) {
        return {
            base: match[1],
            index: (match[2] + match[4]),
            array: {
                base: match[1],
                prefix: (match[1] + match[2]),
                count: (match[5] ? parseInt(match[5]) : -1),
            }
        };
    }
    return { base: type };
}
/**
 *  A **TypedDataEncode** prepares and encodes [[link-eip-712]] payloads
 *  for signed typed data.
 *
 *  This is useful for those that wish to compute various components of a
 *  typed data hash, primary types, or sub-components, but generally the
 *  higher level [[Signer-signTypedData]] is more useful.
 */
class TypedDataEncoder {
    /**
     *  The primary type for the structured [[types]].
     *
     *  This is derived automatically from the [[types]], since no
     *  recursion is possible, once the DAG for the types is consturcted
     *  internally, the primary type must be the only remaining type with
     *  no parent nodes.
     */
    primaryType;
    #types;
    /**
     *  The types.
     */
    get types() {
        return JSON.parse(this.#types);
    }
    #fullTypes;
    #encoderCache;
    /**
     *  Create a new **TypedDataEncoder** for %%types%%.
     *
     *  This performs all necessary checking that types are valid and
     *  do not violate the [[link-eip-712]] structural constraints as
     *  well as computes the [[primaryType]].
     */
    constructor(_types) {
        this.#fullTypes = new Map();
        this.#encoderCache = new Map();
        // Link struct types to their direct child structs
        const links = new Map();
        // Link structs to structs which contain them as a child
        const parents = new Map();
        // Link all subtypes within a given struct
        const subtypes = new Map();
        const types = {};
        Object.keys(_types).forEach((type) => {
            types[type] = _types[type].map(({ name, type }) => {
                // Normalize the base type (unless name conflict)
                let { base, index } = splitArray(type);
                if (base === "int" && !_types["int"]) {
                    base = "int256";
                }
                if (base === "uint" && !_types["uint"]) {
                    base = "uint256";
                }
                return { name, type: (base + (index || "")) };
            });
            links.set(type, new Set());
            parents.set(type, []);
            subtypes.set(type, new Set());
        });
        this.#types = JSON.stringify(types);
        for (const name in types) {
            const uniqueNames = new Set();
            for (const field of types[name]) {
                // Check each field has a unique name
                assertArgument(!uniqueNames.has(field.name), `duplicate variable name ${JSON.stringify(field.name)} in ${JSON.stringify(name)}`, "types", _types);
                uniqueNames.add(field.name);
                // Get the base type (drop any array specifiers)
                const baseType = splitArray(field.type).base;
                assertArgument(baseType !== name, `circular type reference to ${JSON.stringify(baseType)}`, "types", _types);
                // Is this a base encoding type?
                const encoder = getBaseEncoder(baseType);
                if (encoder) {
                    continue;
                }
                assertArgument(parents.has(baseType), `unknown type ${JSON.stringify(baseType)}`, "types", _types);
                // Add linkage
                parents.get(baseType).push(name);
                links.get(name).add(baseType);
            }
        }
        // Deduce the primary type
        const primaryTypes = Array.from(parents.keys()).filter((n) => (parents.get(n).length === 0));
        assertArgument(primaryTypes.length !== 0, "missing primary type", "types", _types);
        assertArgument(primaryTypes.length === 1, `ambiguous primary types or unused types: ${primaryTypes.map((t) => (JSON.stringify(t))).join(", ")}`, "types", _types);
        defineProperties(this, { primaryType: primaryTypes[0] });
        // Check for circular type references
        function checkCircular(type, found) {
            assertArgument(!found.has(type), `circular type reference to ${JSON.stringify(type)}`, "types", _types);
            found.add(type);
            for (const child of links.get(type)) {
                if (!parents.has(child)) {
                    continue;
                }
                // Recursively check children
                checkCircular(child, found);
                // Mark all ancestors as having this decendant
                for (const subtype of found) {
                    subtypes.get(subtype).add(child);
                }
            }
            found.delete(type);
        }
        checkCircular(this.primaryType, new Set());
        // Compute each fully describe type
        for (const [name, set] of subtypes) {
            const st = Array.from(set);
            st.sort();
            this.#fullTypes.set(name, encodeType(name, types[name]) + st.map((t) => encodeType(t, types[t])).join(""));
        }
    }
    /**
     *  Returnthe encoder for the specific %%type%%.
     */
    getEncoder(type) {
        let encoder = this.#encoderCache.get(type);
        if (!encoder) {
            encoder = this.#getEncoder(type);
            this.#encoderCache.set(type, encoder);
        }
        return encoder;
    }
    #getEncoder(type) {
        // Basic encoder type (address, bool, uint256, etc)
        {
            const encoder = getBaseEncoder(type);
            if (encoder) {
                return encoder;
            }
        }
        // Array
        const array = splitArray(type).array;
        if (array) {
            const subtype = array.prefix;
            const subEncoder = this.getEncoder(subtype);
            return (value) => {
                assertArgument(array.count === -1 || array.count === value.length, `array length mismatch; expected length ${array.count}`, "value", value);
                let result = value.map(subEncoder);
                if (this.#fullTypes.has(subtype)) {
                    result = result.map(keccak256);
                }
                return keccak256(concat(result));
            };
        }
        // Struct
        const fields = this.types[type];
        if (fields) {
            const encodedType = id(this.#fullTypes.get(type));
            return (value) => {
                const values = fields.map(({ name, type }) => {
                    const result = this.getEncoder(type)(value[name]);
                    if (this.#fullTypes.has(type)) {
                        return keccak256(result);
                    }
                    return result;
                });
                values.unshift(encodedType);
                return concat(values);
            };
        }
        assertArgument(false, `unknown type: ${type}`, "type", type);
    }
    /**
     *  Return the full type for %%name%%.
     */
    encodeType(name) {
        const result = this.#fullTypes.get(name);
        assertArgument(result, `unknown type: ${JSON.stringify(name)}`, "name", name);
        return result;
    }
    /**
     *  Return the encoded %%value%% for the %%type%%.
     */
    encodeData(type, value) {
        return this.getEncoder(type)(value);
    }
    /**
     *  Returns the hash of %%value%% for the type of %%name%%.
     */
    hashStruct(name, value) {
        return keccak256(this.encodeData(name, value));
    }
    /**
     *  Return the fulled encoded %%value%% for the [[types]].
     */
    encode(value) {
        return this.encodeData(this.primaryType, value);
    }
    /**
     *  Return the hash of the fully encoded %%value%% for the [[types]].
     */
    hash(value) {
        return this.hashStruct(this.primaryType, value);
    }
    /**
     *  @_ignore:
     */
    _visit(type, value, callback) {
        // Basic encoder type (address, bool, uint256, etc)
        {
            const encoder = getBaseEncoder(type);
            if (encoder) {
                return callback(type, value);
            }
        }
        // Array
        const array = splitArray(type).array;
        if (array) {
            assertArgument(array.count === -1 || array.count === value.length, `array length mismatch; expected length ${array.count}`, "value", value);
            return value.map((v) => this._visit(array.prefix, v, callback));
        }
        // Struct
        const fields = this.types[type];
        if (fields) {
            return fields.reduce((accum, { name, type }) => {
                accum[name] = this._visit(type, value[name], callback);
                return accum;
            }, {});
        }
        assertArgument(false, `unknown type: ${type}`, "type", type);
    }
    /**
     *  Call %%calback%% for each value in %%value%%, passing the type and
     *  component within %%value%%.
     *
     *  This is useful for replacing addresses or other transformation that
     *  may be desired on each component, based on its type.
     */
    visit(value, callback) {
        return this._visit(this.primaryType, value, callback);
    }
    /**
     *  Create a new **TypedDataEncoder** for %%types%%.
     */
    static from(types) {
        return new TypedDataEncoder(types);
    }
    /**
     *  Return the primary type for %%types%%.
     */
    static getPrimaryType(types) {
        return TypedDataEncoder.from(types).primaryType;
    }
    /**
     *  Return the hashed struct for %%value%% using %%types%% and %%name%%.
     */
    static hashStruct(name, types, value) {
        return TypedDataEncoder.from(types).hashStruct(name, value);
    }
    /**
     *  Return the domain hash for %%domain%%.
     */
    static hashDomain(domain) {
        const domainFields = [];
        for (const name in domain) {
            if (domain[name] == null) {
                continue;
            }
            const type = domainFieldTypes[name];
            assertArgument(type, `invalid typed-data domain key: ${JSON.stringify(name)}`, "domain", domain);
            domainFields.push({ name, type });
        }
        domainFields.sort((a, b) => {
            return domainFieldNames.indexOf(a.name) - domainFieldNames.indexOf(b.name);
        });
        return TypedDataEncoder.hashStruct("EIP712Domain", { EIP712Domain: domainFields }, domain);
    }
    /**
     *  Return the fully encoded [[link-eip-712]] %%value%% for %%types%% with %%domain%%.
     */
    static encode(domain, types, value) {
        return concat([
            "0x1901",
            TypedDataEncoder.hashDomain(domain),
            TypedDataEncoder.from(types).hash(value)
        ]);
    }
    /**
     *  Return the hash of the fully encoded [[link-eip-712]] %%value%% for %%types%% with %%domain%%.
     */
    static hash(domain, types, value) {
        return keccak256(TypedDataEncoder.encode(domain, types, value));
    }
    // Replaces all address types with ENS names with their looked up address
    /**
     * Resolves to the value from resolving all addresses in %%value%% for
     * %%types%% and the %%domain%%.
     */
    static async resolveNames(domain, types, value, resolveName) {
        // Make a copy to isolate it from the object passed in
        domain = Object.assign({}, domain);
        // Allow passing null to ignore value
        for (const key in domain) {
            if (domain[key] == null) {
                delete domain[key];
            }
        }
        // Look up all ENS names
        const ensCache = {};
        // Do we need to look up the domain's verifyingContract?
        if (domain.verifyingContract && !isHexString(domain.verifyingContract, 20)) {
            ensCache[domain.verifyingContract] = "0x";
        }
        // We are going to use the encoder to visit all the base values
        const encoder = TypedDataEncoder.from(types);
        // Get a list of all the addresses
        encoder.visit(value, (type, value) => {
            if (type === "address" && !isHexString(value, 20)) {
                ensCache[value] = "0x";
            }
            return value;
        });
        // Lookup each name
        for (const name in ensCache) {
            ensCache[name] = await resolveName(name);
        }
        // Replace the domain verifyingContract if needed
        if (domain.verifyingContract && ensCache[domain.verifyingContract]) {
            domain.verifyingContract = ensCache[domain.verifyingContract];
        }
        // Replace all ENS names with their address
        value = encoder.visit(value, (type, value) => {
            if (type === "address" && ensCache[value]) {
                return ensCache[value];
            }
            return value;
        });
        return { domain, value };
    }
    /**
     *  Returns the JSON-encoded payload expected by nodes which implement
     *  the JSON-RPC [[link-eip-712]] method.
     */
    static getPayload(domain, types, value) {
        // Validate the domain fields
        TypedDataEncoder.hashDomain(domain);
        // Derive the EIP712Domain Struct reference type
        const domainValues = {};
        const domainTypes = [];
        domainFieldNames.forEach((name) => {
            const value = domain[name];
            if (value == null) {
                return;
            }
            domainValues[name] = domainChecks[name](value);
            domainTypes.push({ name, type: domainFieldTypes[name] });
        });
        const encoder = TypedDataEncoder.from(types);
        // Get the normalized types
        types = encoder.types;
        const typesWithDomain = Object.assign({}, types);
        assertArgument(typesWithDomain.EIP712Domain == null, "types must not contain EIP712Domain type", "types.EIP712Domain", types);
        typesWithDomain.EIP712Domain = domainTypes;
        // Validate the data structures and types
        encoder.encode(value);
        return {
            types: typesWithDomain,
            domain: domainValues,
            primaryType: encoder.primaryType,
            message: encoder.visit(value, (type, value) => {
                // bytes
                if (type.match(/^bytes(\d*)/)) {
                    return hexlify(getBytes(value));
                }
                // uint or int
                if (type.match(/^u?int/)) {
                    return getBigInt(value).toString();
                }
                switch (type) {
                    case "address":
                        return value.toLowerCase();
                    case "bool":
                        return !!value;
                    case "string":
                        assertArgument(typeof (value) === "string", "invalid string", "value", value);
                        return value;
                }
                assertArgument(false, "unsupported type", "type", type);
            })
        };
    }
}

/**
 *  A fragment is a single item from an ABI, which may represent any of:
 *
 *  - [Functions](FunctionFragment)
 *  - [Events](EventFragment)
 *  - [Constructors](ConstructorFragment)
 *  - Custom [Errors](ErrorFragment)
 *  - [Fallback or Receive](FallbackFragment) functions
 *
 *  @_subsection api/abi/abi-coder:Fragments  [about-fragments]
 */
// [ "a", "b" ] => { "a": 1, "b": 1 }
function setify(items) {
    const result = new Set();
    items.forEach((k) => result.add(k));
    return Object.freeze(result);
}
const _kwVisibDeploy = "external public payable override";
const KwVisibDeploy = setify(_kwVisibDeploy.split(" "));
// Visibility Keywords
const _kwVisib = "constant external internal payable private public pure view override";
const KwVisib = setify(_kwVisib.split(" "));
const _kwTypes = "constructor error event fallback function receive struct";
const KwTypes = setify(_kwTypes.split(" "));
const _kwModifiers = "calldata memory storage payable indexed";
const KwModifiers = setify(_kwModifiers.split(" "));
const _kwOther = "tuple returns";
// All Keywords
const _keywords = [_kwTypes, _kwModifiers, _kwOther, _kwVisib].join(" ");
const Keywords = setify(_keywords.split(" "));
// Single character tokens
const SimpleTokens = {
    "(": "OPEN_PAREN", ")": "CLOSE_PAREN",
    "[": "OPEN_BRACKET", "]": "CLOSE_BRACKET",
    ",": "COMMA", "@": "AT"
};
// Parser regexes to consume the next token
const regexWhitespacePrefix = new RegExp("^(\\s*)");
const regexNumberPrefix = new RegExp("^([0-9]+)");
const regexIdPrefix = new RegExp("^([a-zA-Z$_][a-zA-Z0-9$_]*)");
// Parser regexs to check validity
const regexId = new RegExp("^([a-zA-Z$_][a-zA-Z0-9$_]*)$");
const regexType = new RegExp("^(address|bool|bytes([0-9]*)|string|u?int([0-9]*))$");
class TokenString {
    #offset;
    #tokens;
    get offset() { return this.#offset; }
    get length() { return this.#tokens.length - this.#offset; }
    constructor(tokens) {
        this.#offset = 0;
        this.#tokens = tokens.slice();
    }
    clone() { return new TokenString(this.#tokens); }
    reset() { this.#offset = 0; }
    #subTokenString(from = 0, to = 0) {
        return new TokenString(this.#tokens.slice(from, to).map((t) => {
            return Object.freeze(Object.assign({}, t, {
                match: (t.match - from),
                linkBack: (t.linkBack - from),
                linkNext: (t.linkNext - from),
            }));
        }));
    }
    // Pops and returns the value of the next token, if it is a keyword in allowed; throws if out of tokens
    popKeyword(allowed) {
        const top = this.peek();
        if (top.type !== "KEYWORD" || !allowed.has(top.text)) {
            throw new Error(`expected keyword ${top.text}`);
        }
        return this.pop().text;
    }
    // Pops and returns the value of the next token if it is `type`; throws if out of tokens
    popType(type) {
        if (this.peek().type !== type) {
            const top = this.peek();
            throw new Error(`expected ${type}; got ${top.type} ${JSON.stringify(top.text)}`);
        }
        return this.pop().text;
    }
    // Pops and returns a "(" TOKENS ")"
    popParen() {
        const top = this.peek();
        if (top.type !== "OPEN_PAREN") {
            throw new Error("bad start");
        }
        const result = this.#subTokenString(this.#offset + 1, top.match + 1);
        this.#offset = top.match + 1;
        return result;
    }
    // Pops and returns the items within "(" ITEM1 "," ITEM2 "," ... ")"
    popParams() {
        const top = this.peek();
        if (top.type !== "OPEN_PAREN") {
            throw new Error("bad start");
        }
        const result = [];
        while (this.#offset < top.match - 1) {
            const link = this.peek().linkNext;
            result.push(this.#subTokenString(this.#offset + 1, link));
            this.#offset = link;
        }
        this.#offset = top.match + 1;
        return result;
    }
    // Returns the top Token, throwing if out of tokens
    peek() {
        if (this.#offset >= this.#tokens.length) {
            throw new Error("out-of-bounds");
        }
        return this.#tokens[this.#offset];
    }
    // Returns the next value, if it is a keyword in `allowed`
    peekKeyword(allowed) {
        const top = this.peekType("KEYWORD");
        return (top != null && allowed.has(top)) ? top : null;
    }
    // Returns the value of the next token if it is `type`
    peekType(type) {
        if (this.length === 0) {
            return null;
        }
        const top = this.peek();
        return (top.type === type) ? top.text : null;
    }
    // Returns the next token; throws if out of tokens
    pop() {
        const result = this.peek();
        this.#offset++;
        return result;
    }
    toString() {
        const tokens = [];
        for (let i = this.#offset; i < this.#tokens.length; i++) {
            const token = this.#tokens[i];
            tokens.push(`${token.type}:${token.text}`);
        }
        return `<TokenString ${tokens.join(" ")}>`;
    }
}
function lex(text) {
    const tokens = [];
    const throwError = (message) => {
        const token = (offset < text.length) ? JSON.stringify(text[offset]) : "$EOI";
        throw new Error(`invalid token ${token} at ${offset}: ${message}`);
    };
    let brackets = [];
    let commas = [];
    let offset = 0;
    while (offset < text.length) {
        // Strip off any leading whitespace
        let cur = text.substring(offset);
        let match = cur.match(regexWhitespacePrefix);
        if (match) {
            offset += match[1].length;
            cur = text.substring(offset);
        }
        const token = { depth: brackets.length, linkBack: -1, linkNext: -1, match: -1, type: "", text: "", offset, value: -1 };
        tokens.push(token);
        let type = (SimpleTokens[cur[0]] || "");
        if (type) {
            token.type = type;
            token.text = cur[0];
            offset++;
            if (type === "OPEN_PAREN") {
                brackets.push(tokens.length - 1);
                commas.push(tokens.length - 1);
            }
            else if (type == "CLOSE_PAREN") {
                if (brackets.length === 0) {
                    throwError("no matching open bracket");
                }
                token.match = brackets.pop();
                (tokens[token.match]).match = tokens.length - 1;
                token.depth--;
                token.linkBack = commas.pop();
                (tokens[token.linkBack]).linkNext = tokens.length - 1;
            }
            else if (type === "COMMA") {
                token.linkBack = commas.pop();
                (tokens[token.linkBack]).linkNext = tokens.length - 1;
                commas.push(tokens.length - 1);
            }
            else if (type === "OPEN_BRACKET") {
                token.type = "BRACKET";
            }
            else if (type === "CLOSE_BRACKET") {
                // Remove the CLOSE_BRACKET
                let suffix = tokens.pop().text;
                if (tokens.length > 0 && tokens[tokens.length - 1].type === "NUMBER") {
                    const value = tokens.pop().text;
                    suffix = value + suffix;
                    (tokens[tokens.length - 1]).value = getNumber(value);
                }
                if (tokens.length === 0 || tokens[tokens.length - 1].type !== "BRACKET") {
                    throw new Error("missing opening bracket");
                }
                (tokens[tokens.length - 1]).text += suffix;
            }
            continue;
        }
        match = cur.match(regexIdPrefix);
        if (match) {
            token.text = match[1];
            offset += token.text.length;
            if (Keywords.has(token.text)) {
                token.type = "KEYWORD";
                continue;
            }
            if (token.text.match(regexType)) {
                token.type = "TYPE";
                continue;
            }
            token.type = "ID";
            continue;
        }
        match = cur.match(regexNumberPrefix);
        if (match) {
            token.text = match[1];
            token.type = "NUMBER";
            offset += token.text.length;
            continue;
        }
        throw new Error(`unexpected token ${JSON.stringify(cur[0])} at position ${offset}`);
    }
    return new TokenString(tokens.map((t) => Object.freeze(t)));
}
// Check only one of `allowed` is in `set`
function allowSingle(set, allowed) {
    let included = [];
    for (const key in allowed.keys()) {
        if (set.has(key)) {
            included.push(key);
        }
    }
    if (included.length > 1) {
        throw new Error(`conflicting types: ${included.join(", ")}`);
    }
}
// Functions to process a Solidity Signature TokenString from left-to-right for...
// ...the name with an optional type, returning the name
function consumeName(type, tokens) {
    if (tokens.peekKeyword(KwTypes)) {
        const keyword = tokens.pop().text;
        if (keyword !== type) {
            throw new Error(`expected ${type}, got ${keyword}`);
        }
    }
    return tokens.popType("ID");
}
// ...all keywords matching allowed, returning the keywords
function consumeKeywords(tokens, allowed) {
    const keywords = new Set();
    while (true) {
        const keyword = tokens.peekType("KEYWORD");
        if (keyword == null || (allowed && !allowed.has(keyword))) {
            break;
        }
        tokens.pop();
        if (keywords.has(keyword)) {
            throw new Error(`duplicate keywords: ${JSON.stringify(keyword)}`);
        }
        keywords.add(keyword);
    }
    return Object.freeze(keywords);
}
// ...all visibility keywords, returning the coalesced mutability
function consumeMutability(tokens) {
    let modifiers = consumeKeywords(tokens, KwVisib);
    // Detect conflicting modifiers
    allowSingle(modifiers, setify("constant payable nonpayable".split(" ")));
    allowSingle(modifiers, setify("pure view payable nonpayable".split(" ")));
    // Process mutability states
    if (modifiers.has("view")) {
        return "view";
    }
    if (modifiers.has("pure")) {
        return "pure";
    }
    if (modifiers.has("payable")) {
        return "payable";
    }
    if (modifiers.has("nonpayable")) {
        return "nonpayable";
    }
    // Process legacy `constant` last
    if (modifiers.has("constant")) {
        return "view";
    }
    return "nonpayable";
}
// ...a parameter list, returning the ParamType list
function consumeParams(tokens, allowIndexed) {
    return tokens.popParams().map((t) => ParamType.from(t, allowIndexed));
}
// ...a gas limit, returning a BigNumber or null if none
function consumeGas(tokens) {
    if (tokens.peekType("AT")) {
        tokens.pop();
        if (tokens.peekType("NUMBER")) {
            return getBigInt(tokens.pop().text);
        }
        throw new Error("invalid gas");
    }
    return null;
}
function consumeEoi(tokens) {
    if (tokens.length) {
        throw new Error(`unexpected tokens at offset ${tokens.offset}: ${tokens.toString()}`);
    }
}
const regexArrayType = new RegExp(/^(.*)\[([0-9]*)\]$/);
function verifyBasicType(type) {
    const match = type.match(regexType);
    assertArgument(match, "invalid type", "type", type);
    if (type === "uint") {
        return "uint256";
    }
    if (type === "int") {
        return "int256";
    }
    if (match[2]) {
        // bytesXX
        const length = parseInt(match[2]);
        assertArgument(length !== 0 && length <= 32, "invalid bytes length", "type", type);
    }
    else if (match[3]) {
        // intXX or uintXX
        const size = parseInt(match[3]);
        assertArgument(size !== 0 && size <= 256 && (size % 8) === 0, "invalid numeric width", "type", type);
    }
    return type;
}
// Make the Fragment constructors effectively private
const _guard = {};
const internal$1 = Symbol.for("_ethers_internal");
const ParamTypeInternal = "_ParamTypeInternal";
const ErrorFragmentInternal = "_ErrorInternal";
const EventFragmentInternal = "_EventInternal";
const ConstructorFragmentInternal = "_ConstructorInternal";
const FallbackFragmentInternal = "_FallbackInternal";
const FunctionFragmentInternal = "_FunctionInternal";
const StructFragmentInternal = "_StructInternal";
/**
 *  Each input and output of a [[Fragment]] is an Array of **ParamType**.
 */
class ParamType {
    /**
     *  The local name of the parameter (or ``""`` if unbound)
     */
    name;
    /**
     *  The fully qualified type (e.g. ``"address"``, ``"tuple(address)"``,
     *  ``"uint256[3][]"``)
     */
    type;
    /**
     *  The base type (e.g. ``"address"``, ``"tuple"``, ``"array"``)
     */
    baseType;
    /**
     *  True if the parameters is indexed.
     *
     *  For non-indexable types this is ``null``.
     */
    indexed;
    /**
     *  The components for the tuple.
     *
     *  For non-tuple types this is ``null``.
     */
    components;
    /**
     *  The array length, or ``-1`` for dynamic-lengthed arrays.
     *
     *  For non-array types this is ``null``.
     */
    arrayLength;
    /**
     *  The type of each child in the array.
     *
     *  For non-array types this is ``null``.
     */
    arrayChildren;
    /**
     *  @private
     */
    constructor(guard, name, type, baseType, indexed, components, arrayLength, arrayChildren) {
        assertPrivate(guard, _guard, "ParamType");
        Object.defineProperty(this, internal$1, { value: ParamTypeInternal });
        if (components) {
            components = Object.freeze(components.slice());
        }
        if (baseType === "array") {
            if (arrayLength == null || arrayChildren == null) {
                throw new Error("");
            }
        }
        else if (arrayLength != null || arrayChildren != null) {
            throw new Error("");
        }
        if (baseType === "tuple") {
            if (components == null) {
                throw new Error("");
            }
        }
        else if (components != null) {
            throw new Error("");
        }
        defineProperties(this, {
            name, type, baseType, indexed, components, arrayLength, arrayChildren
        });
    }
    /**
     *  Return a string representation of this type.
     *
     *  For example,
     *
     *  ``sighash" => "(uint256,address)"``
     *
     *  ``"minimal" => "tuple(uint256,address) indexed"``
     *
     *  ``"full" => "tuple(uint256 foo, address bar) indexed baz"``
     */
    format(format) {
        if (format == null) {
            format = "sighash";
        }
        if (format === "json") {
            const name = this.name || "";
            if (this.isArray()) {
                const result = JSON.parse(this.arrayChildren.format("json"));
                result.name = name;
                result.type += `[${(this.arrayLength < 0 ? "" : String(this.arrayLength))}]`;
                return JSON.stringify(result);
            }
            const result = {
                type: ((this.baseType === "tuple") ? "tuple" : this.type),
                name
            };
            if (typeof (this.indexed) === "boolean") {
                result.indexed = this.indexed;
            }
            if (this.isTuple()) {
                result.components = this.components.map((c) => JSON.parse(c.format(format)));
            }
            return JSON.stringify(result);
        }
        let result = "";
        // Array
        if (this.isArray()) {
            result += this.arrayChildren.format(format);
            result += `[${(this.arrayLength < 0 ? "" : String(this.arrayLength))}]`;
        }
        else {
            if (this.isTuple()) {
                result += "(" + this.components.map((comp) => comp.format(format)).join((format === "full") ? ", " : ",") + ")";
            }
            else {
                result += this.type;
            }
        }
        if (format !== "sighash") {
            if (this.indexed === true) {
                result += " indexed";
            }
            if (format === "full" && this.name) {
                result += " " + this.name;
            }
        }
        return result;
    }
    /**
     *  Returns true if %%this%% is an Array type.
     *
     *  This provides a type gaurd ensuring that [[arrayChildren]]
     *  and [[arrayLength]] are non-null.
     */
    isArray() {
        return (this.baseType === "array");
    }
    /**
     *  Returns true if %%this%% is a Tuple type.
     *
     *  This provides a type gaurd ensuring that [[components]]
     *  is non-null.
     */
    isTuple() {
        return (this.baseType === "tuple");
    }
    /**
     *  Returns true if %%this%% is an Indexable type.
     *
     *  This provides a type gaurd ensuring that [[indexed]]
     *  is non-null.
     */
    isIndexable() {
        return (this.indexed != null);
    }
    /**
     *  Walks the **ParamType** with %%value%%, calling %%process%%
     *  on each type, destructing the %%value%% recursively.
     */
    walk(value, process) {
        if (this.isArray()) {
            if (!Array.isArray(value)) {
                throw new Error("invalid array value");
            }
            if (this.arrayLength !== -1 && value.length !== this.arrayLength) {
                throw new Error("array is wrong length");
            }
            const _this = this;
            return value.map((v) => (_this.arrayChildren.walk(v, process)));
        }
        if (this.isTuple()) {
            if (!Array.isArray(value)) {
                throw new Error("invalid tuple value");
            }
            if (value.length !== this.components.length) {
                throw new Error("array is wrong length");
            }
            const _this = this;
            return value.map((v, i) => (_this.components[i].walk(v, process)));
        }
        return process(this.type, value);
    }
    #walkAsync(promises, value, process, setValue) {
        if (this.isArray()) {
            if (!Array.isArray(value)) {
                throw new Error("invalid array value");
            }
            if (this.arrayLength !== -1 && value.length !== this.arrayLength) {
                throw new Error("array is wrong length");
            }
            const childType = this.arrayChildren;
            const result = value.slice();
            result.forEach((value, index) => {
                childType.#walkAsync(promises, value, process, (value) => {
                    result[index] = value;
                });
            });
            setValue(result);
            return;
        }
        if (this.isTuple()) {
            const components = this.components;
            // Convert the object into an array
            let result;
            if (Array.isArray(value)) {
                result = value.slice();
            }
            else {
                if (value == null || typeof (value) !== "object") {
                    throw new Error("invalid tuple value");
                }
                result = components.map((param) => {
                    if (!param.name) {
                        throw new Error("cannot use object value with unnamed components");
                    }
                    if (!(param.name in value)) {
                        throw new Error(`missing value for component ${param.name}`);
                    }
                    return value[param.name];
                });
            }
            if (result.length !== this.components.length) {
                throw new Error("array is wrong length");
            }
            result.forEach((value, index) => {
                components[index].#walkAsync(promises, value, process, (value) => {
                    result[index] = value;
                });
            });
            setValue(result);
            return;
        }
        const result = process(this.type, value);
        if (result.then) {
            promises.push((async function () { setValue(await result); })());
        }
        else {
            setValue(result);
        }
    }
    /**
     *  Walks the **ParamType** with %%value%%, asynchronously calling
     *  %%process%% on each type, destructing the %%value%% recursively.
     *
     *  This can be used to resolve ENS names by walking and resolving each
     *  ``"address"`` type.
     */
    async walkAsync(value, process) {
        const promises = [];
        const result = [value];
        this.#walkAsync(promises, value, process, (value) => {
            result[0] = value;
        });
        if (promises.length) {
            await Promise.all(promises);
        }
        return result[0];
    }
    /**
     *  Creates a new **ParamType** for %%obj%%.
     *
     *  If %%allowIndexed%% then the ``indexed`` keyword is permitted,
     *  otherwise the ``indexed`` keyword will throw an error.
     */
    static from(obj, allowIndexed) {
        if (ParamType.isParamType(obj)) {
            return obj;
        }
        if (typeof (obj) === "string") {
            try {
                return ParamType.from(lex(obj), allowIndexed);
            }
            catch (error) {
                assertArgument(false, "invalid param type", "obj", obj);
            }
        }
        else if (obj instanceof TokenString) {
            let type = "", baseType = "";
            let comps = null;
            if (consumeKeywords(obj, setify(["tuple"])).has("tuple") || obj.peekType("OPEN_PAREN")) {
                // Tuple
                baseType = "tuple";
                comps = obj.popParams().map((t) => ParamType.from(t));
                type = `tuple(${comps.map((c) => c.format()).join(",")})`;
            }
            else {
                // Normal
                type = verifyBasicType(obj.popType("TYPE"));
                baseType = type;
            }
            // Check for Array
            let arrayChildren = null;
            let arrayLength = null;
            while (obj.length && obj.peekType("BRACKET")) {
                const bracket = obj.pop(); //arrays[i];
                arrayChildren = new ParamType(_guard, "", type, baseType, null, comps, arrayLength, arrayChildren);
                arrayLength = bracket.value;
                type += bracket.text;
                baseType = "array";
                comps = null;
            }
            let indexed = null;
            const keywords = consumeKeywords(obj, KwModifiers);
            if (keywords.has("indexed")) {
                if (!allowIndexed) {
                    throw new Error("");
                }
                indexed = true;
            }
            const name = (obj.peekType("ID") ? obj.pop().text : "");
            if (obj.length) {
                throw new Error("leftover tokens");
            }
            return new ParamType(_guard, name, type, baseType, indexed, comps, arrayLength, arrayChildren);
        }
        const name = obj.name;
        assertArgument(!name || (typeof (name) === "string" && name.match(regexId)), "invalid name", "obj.name", name);
        let indexed = obj.indexed;
        if (indexed != null) {
            assertArgument(allowIndexed, "parameter cannot be indexed", "obj.indexed", obj.indexed);
            indexed = !!indexed;
        }
        let type = obj.type;
        let arrayMatch = type.match(regexArrayType);
        if (arrayMatch) {
            const arrayLength = parseInt(arrayMatch[2] || "-1");
            const arrayChildren = ParamType.from({
                type: arrayMatch[1],
                components: obj.components
            });
            return new ParamType(_guard, name || "", type, "array", indexed, null, arrayLength, arrayChildren);
        }
        if (type === "tuple" || type.startsWith("tuple(" /* fix: ) */) || type.startsWith("(" /* fix: ) */)) {
            const comps = (obj.components != null) ? obj.components.map((c) => ParamType.from(c)) : null;
            const tuple = new ParamType(_guard, name || "", type, "tuple", indexed, comps, null, null);
            // @TODO: use lexer to validate and normalize type
            return tuple;
        }
        type = verifyBasicType(obj.type);
        return new ParamType(_guard, name || "", type, type, indexed, null, null, null);
    }
    /**
     *  Returns true if %%value%% is a **ParamType**.
     */
    static isParamType(value) {
        return (value && value[internal$1] === ParamTypeInternal);
    }
}
/**
 *  An abstract class to represent An individual fragment from a parse ABI.
 */
class Fragment {
    /**
     *  The type of the fragment.
     */
    type;
    /**
     *  The inputs for the fragment.
     */
    inputs;
    /**
     *  @private
     */
    constructor(guard, type, inputs) {
        assertPrivate(guard, _guard, "Fragment");
        inputs = Object.freeze(inputs.slice());
        defineProperties(this, { type, inputs });
    }
    /**
     *  Creates a new **Fragment** for %%obj%%, wich can be any supported
     *  ABI frgament type.
     */
    static from(obj) {
        if (typeof (obj) === "string") {
            // Try parsing JSON...
            try {
                Fragment.from(JSON.parse(obj));
            }
            catch (e) { }
            // ...otherwise, use the human-readable lexer
            return Fragment.from(lex(obj));
        }
        if (obj instanceof TokenString) {
            // Human-readable ABI (already lexed)
            const type = obj.peekKeyword(KwTypes);
            switch (type) {
                case "constructor": return ConstructorFragment.from(obj);
                case "error": return ErrorFragment.from(obj);
                case "event": return EventFragment.from(obj);
                case "fallback":
                case "receive":
                    return FallbackFragment.from(obj);
                case "function": return FunctionFragment.from(obj);
                case "struct": return StructFragment.from(obj);
            }
        }
        else if (typeof (obj) === "object") {
            // JSON ABI
            switch (obj.type) {
                case "constructor": return ConstructorFragment.from(obj);
                case "error": return ErrorFragment.from(obj);
                case "event": return EventFragment.from(obj);
                case "fallback":
                case "receive":
                    return FallbackFragment.from(obj);
                case "function": return FunctionFragment.from(obj);
                case "struct": return StructFragment.from(obj);
            }
            assert(false, `unsupported type: ${obj.type}`, "UNSUPPORTED_OPERATION", {
                operation: "Fragment.from"
            });
        }
        assertArgument(false, "unsupported frgament object", "obj", obj);
    }
    /**
     *  Returns true if %%value%% is a [[ConstructorFragment]].
     */
    static isConstructor(value) {
        return ConstructorFragment.isFragment(value);
    }
    /**
     *  Returns true if %%value%% is an [[ErrorFragment]].
     */
    static isError(value) {
        return ErrorFragment.isFragment(value);
    }
    /**
     *  Returns true if %%value%% is an [[EventFragment]].
     */
    static isEvent(value) {
        return EventFragment.isFragment(value);
    }
    /**
     *  Returns true if %%value%% is a [[FunctionFragment]].
     */
    static isFunction(value) {
        return FunctionFragment.isFragment(value);
    }
    /**
     *  Returns true if %%value%% is a [[StructFragment]].
     */
    static isStruct(value) {
        return StructFragment.isFragment(value);
    }
}
/**
 *  An abstract class to represent An individual fragment
 *  which has a name from a parse ABI.
 */
class NamedFragment extends Fragment {
    /**
     *  The name of the fragment.
     */
    name;
    /**
     *  @private
     */
    constructor(guard, type, name, inputs) {
        super(guard, type, inputs);
        assertArgument(typeof (name) === "string" && name.match(regexId), "invalid identifier", "name", name);
        inputs = Object.freeze(inputs.slice());
        defineProperties(this, { name });
    }
}
function joinParams(format, params) {
    return "(" + params.map((p) => p.format(format)).join((format === "full") ? ", " : ",") + ")";
}
/**
 *  A Fragment which represents a //Custom Error//.
 */
class ErrorFragment extends NamedFragment {
    /**
     *  @private
     */
    constructor(guard, name, inputs) {
        super(guard, "error", name, inputs);
        Object.defineProperty(this, internal$1, { value: ErrorFragmentInternal });
    }
    /**
     *  The Custom Error selector.
     */
    get selector() {
        return id(this.format("sighash")).substring(0, 10);
    }
    /**
     *  Returns a string representation of this fragment as %%format%%.
     */
    format(format) {
        if (format == null) {
            format = "sighash";
        }
        if (format === "json") {
            return JSON.stringify({
                type: "error",
                name: this.name,
                inputs: this.inputs.map((input) => JSON.parse(input.format(format))),
            });
        }
        const result = [];
        if (format !== "sighash") {
            result.push("error");
        }
        result.push(this.name + joinParams(format, this.inputs));
        return result.join(" ");
    }
    /**
     *  Returns a new **ErrorFragment** for %%obj%%.
     */
    static from(obj) {
        if (ErrorFragment.isFragment(obj)) {
            return obj;
        }
        if (typeof (obj) === "string") {
            return ErrorFragment.from(lex(obj));
        }
        else if (obj instanceof TokenString) {
            const name = consumeName("error", obj);
            const inputs = consumeParams(obj);
            consumeEoi(obj);
            return new ErrorFragment(_guard, name, inputs);
        }
        return new ErrorFragment(_guard, obj.name, obj.inputs ? obj.inputs.map(ParamType.from) : []);
    }
    /**
     *  Returns ``true`` and provides a type guard if %%value%% is an
     *  **ErrorFragment**.
     */
    static isFragment(value) {
        return (value && value[internal$1] === ErrorFragmentInternal);
    }
}
/**
 *  A Fragment which represents an Event.
 */
class EventFragment extends NamedFragment {
    /**
     *  Whether this event is anonymous.
     */
    anonymous;
    /**
     *  @private
     */
    constructor(guard, name, inputs, anonymous) {
        super(guard, "event", name, inputs);
        Object.defineProperty(this, internal$1, { value: EventFragmentInternal });
        defineProperties(this, { anonymous });
    }
    /**
     *  The Event topic hash.
     */
    get topicHash() {
        return id(this.format("sighash"));
    }
    /**
     *  Returns a string representation of this event as %%format%%.
     */
    format(format) {
        if (format == null) {
            format = "sighash";
        }
        if (format === "json") {
            return JSON.stringify({
                type: "event",
                anonymous: this.anonymous,
                name: this.name,
                inputs: this.inputs.map((i) => JSON.parse(i.format(format)))
            });
        }
        const result = [];
        if (format !== "sighash") {
            result.push("event");
        }
        result.push(this.name + joinParams(format, this.inputs));
        if (format !== "sighash" && this.anonymous) {
            result.push("anonymous");
        }
        return result.join(" ");
    }
    /**
     *  Return the topic hash for an event with %%name%% and %%params%%.
     */
    static getTopicHash(name, params) {
        params = (params || []).map((p) => ParamType.from(p));
        const fragment = new EventFragment(_guard, name, params, false);
        return fragment.topicHash;
    }
    /**
     *  Returns a new **EventFragment** for %%obj%%.
     */
    static from(obj) {
        if (EventFragment.isFragment(obj)) {
            return obj;
        }
        if (typeof (obj) === "string") {
            try {
                return EventFragment.from(lex(obj));
            }
            catch (error) {
                assertArgument(false, "invalid event fragment", "obj", obj);
            }
        }
        else if (obj instanceof TokenString) {
            const name = consumeName("event", obj);
            const inputs = consumeParams(obj, true);
            const anonymous = !!consumeKeywords(obj, setify(["anonymous"])).has("anonymous");
            consumeEoi(obj);
            return new EventFragment(_guard, name, inputs, anonymous);
        }
        return new EventFragment(_guard, obj.name, obj.inputs ? obj.inputs.map((p) => ParamType.from(p, true)) : [], !!obj.anonymous);
    }
    /**
     *  Returns ``true`` and provides a type guard if %%value%% is an
     *  **EventFragment**.
     */
    static isFragment(value) {
        return (value && value[internal$1] === EventFragmentInternal);
    }
}
/**
 *  A Fragment which represents a constructor.
 */
class ConstructorFragment extends Fragment {
    /**
     *  Whether the constructor can receive an endowment.
     */
    payable;
    /**
     *  The recommended gas limit for deployment or ``null``.
     */
    gas;
    /**
     *  @private
     */
    constructor(guard, type, inputs, payable, gas) {
        super(guard, type, inputs);
        Object.defineProperty(this, internal$1, { value: ConstructorFragmentInternal });
        defineProperties(this, { payable, gas });
    }
    /**
     *  Returns a string representation of this constructor as %%format%%.
     */
    format(format) {
        assert(format != null && format !== "sighash", "cannot format a constructor for sighash", "UNSUPPORTED_OPERATION", { operation: "format(sighash)" });
        if (format === "json") {
            return JSON.stringify({
                type: "constructor",
                stateMutability: (this.payable ? "payable" : "undefined"),
                payable: this.payable,
                gas: ((this.gas != null) ? this.gas : undefined),
                inputs: this.inputs.map((i) => JSON.parse(i.format(format)))
            });
        }
        const result = [`constructor${joinParams(format, this.inputs)}`];
        if (this.payable) {
            result.push("payable");
        }
        if (this.gas != null) {
            result.push(`@${this.gas.toString()}`);
        }
        return result.join(" ");
    }
    /**
     *  Returns a new **ConstructorFragment** for %%obj%%.
     */
    static from(obj) {
        if (ConstructorFragment.isFragment(obj)) {
            return obj;
        }
        if (typeof (obj) === "string") {
            try {
                return ConstructorFragment.from(lex(obj));
            }
            catch (error) {
                assertArgument(false, "invalid constuctor fragment", "obj", obj);
            }
        }
        else if (obj instanceof TokenString) {
            consumeKeywords(obj, setify(["constructor"]));
            const inputs = consumeParams(obj);
            const payable = !!consumeKeywords(obj, KwVisibDeploy).has("payable");
            const gas = consumeGas(obj);
            consumeEoi(obj);
            return new ConstructorFragment(_guard, "constructor", inputs, payable, gas);
        }
        return new ConstructorFragment(_guard, "constructor", obj.inputs ? obj.inputs.map(ParamType.from) : [], !!obj.payable, (obj.gas != null) ? obj.gas : null);
    }
    /**
     *  Returns ``true`` and provides a type guard if %%value%% is a
     *  **ConstructorFragment**.
     */
    static isFragment(value) {
        return (value && value[internal$1] === ConstructorFragmentInternal);
    }
}
/**
 *  A Fragment which represents a method.
 */
class FallbackFragment extends Fragment {
    /**
     *  If the function can be sent value during invocation.
     */
    payable;
    constructor(guard, inputs, payable) {
        super(guard, "fallback", inputs);
        Object.defineProperty(this, internal$1, { value: FallbackFragmentInternal });
        defineProperties(this, { payable });
    }
    /**
     *  Returns a string representation of this fallback as %%format%%.
     */
    format(format) {
        const type = ((this.inputs.length === 0) ? "receive" : "fallback");
        if (format === "json") {
            const stateMutability = (this.payable ? "payable" : "nonpayable");
            return JSON.stringify({ type, stateMutability });
        }
        return `${type}()${this.payable ? " payable" : ""}`;
    }
    /**
     *  Returns a new **FallbackFragment** for %%obj%%.
     */
    static from(obj) {
        if (FallbackFragment.isFragment(obj)) {
            return obj;
        }
        if (typeof (obj) === "string") {
            try {
                return FallbackFragment.from(lex(obj));
            }
            catch (error) {
                assertArgument(false, "invalid fallback fragment", "obj", obj);
            }
        }
        else if (obj instanceof TokenString) {
            const errorObj = obj.toString();
            const topIsValid = obj.peekKeyword(setify(["fallback", "receive"]));
            assertArgument(topIsValid, "type must be fallback or receive", "obj", errorObj);
            const type = obj.popKeyword(setify(["fallback", "receive"]));
            // receive()
            if (type === "receive") {
                const inputs = consumeParams(obj);
                assertArgument(inputs.length === 0, `receive cannot have arguments`, "obj.inputs", inputs);
                consumeKeywords(obj, setify(["payable"]));
                consumeEoi(obj);
                return new FallbackFragment(_guard, [], true);
            }
            // fallback() [payable]
            // fallback(bytes) [payable] returns (bytes)
            let inputs = consumeParams(obj);
            if (inputs.length) {
                assertArgument(inputs.length === 1 && inputs[0].type === "bytes", "invalid fallback inputs", "obj.inputs", inputs.map((i) => i.format("minimal")).join(", "));
            }
            else {
                inputs = [ParamType.from("bytes")];
            }
            const mutability = consumeMutability(obj);
            assertArgument(mutability === "nonpayable" || mutability === "payable", "fallback cannot be constants", "obj.stateMutability", mutability);
            if (consumeKeywords(obj, setify(["returns"])).has("returns")) {
                const outputs = consumeParams(obj);
                assertArgument(outputs.length === 1 && outputs[0].type === "bytes", "invalid fallback outputs", "obj.outputs", outputs.map((i) => i.format("minimal")).join(", "));
            }
            consumeEoi(obj);
            return new FallbackFragment(_guard, inputs, mutability === "payable");
        }
        if (obj.type === "receive") {
            return new FallbackFragment(_guard, [], true);
        }
        if (obj.type === "fallback") {
            const inputs = [ParamType.from("bytes")];
            const payable = (obj.stateMutability === "payable");
            return new FallbackFragment(_guard, inputs, payable);
        }
        assertArgument(false, "invalid fallback description", "obj", obj);
    }
    /**
     *  Returns ``true`` and provides a type guard if %%value%% is a
     *  **FallbackFragment**.
     */
    static isFragment(value) {
        return (value && value[internal$1] === FallbackFragmentInternal);
    }
}
/**
 *  A Fragment which represents a method.
 */
class FunctionFragment extends NamedFragment {
    /**
     *  If the function is constant (e.g. ``pure`` or ``view`` functions).
     */
    constant;
    /**
     *  The returned types for the result of calling this function.
     */
    outputs;
    /**
     *  The state mutability (e.g. ``payable``, ``nonpayable``, ``view``
     *  or ``pure``)
     */
    stateMutability;
    /**
     *  If the function can be sent value during invocation.
     */
    payable;
    /**
     *  The recommended gas limit to send when calling this function.
     */
    gas;
    /**
     *  @private
     */
    constructor(guard, name, stateMutability, inputs, outputs, gas) {
        super(guard, "function", name, inputs);
        Object.defineProperty(this, internal$1, { value: FunctionFragmentInternal });
        outputs = Object.freeze(outputs.slice());
        const constant = (stateMutability === "view" || stateMutability === "pure");
        const payable = (stateMutability === "payable");
        defineProperties(this, { constant, gas, outputs, payable, stateMutability });
    }
    /**
     *  The Function selector.
     */
    get selector() {
        return id(this.format("sighash")).substring(0, 10);
    }
    /**
     *  Returns a string representation of this function as %%format%%.
     */
    format(format) {
        if (format == null) {
            format = "sighash";
        }
        if (format === "json") {
            return JSON.stringify({
                type: "function",
                name: this.name,
                constant: this.constant,
                stateMutability: ((this.stateMutability !== "nonpayable") ? this.stateMutability : undefined),
                payable: this.payable,
                gas: ((this.gas != null) ? this.gas : undefined),
                inputs: this.inputs.map((i) => JSON.parse(i.format(format))),
                outputs: this.outputs.map((o) => JSON.parse(o.format(format))),
            });
        }
        const result = [];
        if (format !== "sighash") {
            result.push("function");
        }
        result.push(this.name + joinParams(format, this.inputs));
        if (format !== "sighash") {
            if (this.stateMutability !== "nonpayable") {
                result.push(this.stateMutability);
            }
            if (this.outputs && this.outputs.length) {
                result.push("returns");
                result.push(joinParams(format, this.outputs));
            }
            if (this.gas != null) {
                result.push(`@${this.gas.toString()}`);
            }
        }
        return result.join(" ");
    }
    /**
     *  Return the selector for a function with %%name%% and %%params%%.
     */
    static getSelector(name, params) {
        params = (params || []).map((p) => ParamType.from(p));
        const fragment = new FunctionFragment(_guard, name, "view", params, [], null);
        return fragment.selector;
    }
    /**
     *  Returns a new **FunctionFragment** for %%obj%%.
     */
    static from(obj) {
        if (FunctionFragment.isFragment(obj)) {
            return obj;
        }
        if (typeof (obj) === "string") {
            try {
                return FunctionFragment.from(lex(obj));
            }
            catch (error) {
                assertArgument(false, "invalid function fragment", "obj", obj);
            }
        }
        else if (obj instanceof TokenString) {
            const name = consumeName("function", obj);
            const inputs = consumeParams(obj);
            const mutability = consumeMutability(obj);
            let outputs = [];
            if (consumeKeywords(obj, setify(["returns"])).has("returns")) {
                outputs = consumeParams(obj);
            }
            const gas = consumeGas(obj);
            consumeEoi(obj);
            return new FunctionFragment(_guard, name, mutability, inputs, outputs, gas);
        }
        let stateMutability = obj.stateMutability;
        // Use legacy Solidity ABI logic if stateMutability is missing
        if (stateMutability == null) {
            stateMutability = "payable";
            if (typeof (obj.constant) === "boolean") {
                stateMutability = "view";
                if (!obj.constant) {
                    stateMutability = "payable";
                    if (typeof (obj.payable) === "boolean" && !obj.payable) {
                        stateMutability = "nonpayable";
                    }
                }
            }
            else if (typeof (obj.payable) === "boolean" && !obj.payable) {
                stateMutability = "nonpayable";
            }
        }
        // @TODO: verifyState for stateMutability (e.g. throw if
        //        payable: false but stateMutability is "nonpayable")
        return new FunctionFragment(_guard, obj.name, stateMutability, obj.inputs ? obj.inputs.map(ParamType.from) : [], obj.outputs ? obj.outputs.map(ParamType.from) : [], (obj.gas != null) ? obj.gas : null);
    }
    /**
     *  Returns ``true`` and provides a type guard if %%value%% is a
     *  **FunctionFragment**.
     */
    static isFragment(value) {
        return (value && value[internal$1] === FunctionFragmentInternal);
    }
}
/**
 *  A Fragment which represents a structure.
 */
class StructFragment extends NamedFragment {
    /**
     *  @private
     */
    constructor(guard, name, inputs) {
        super(guard, "struct", name, inputs);
        Object.defineProperty(this, internal$1, { value: StructFragmentInternal });
    }
    /**
     *  Returns a string representation of this struct as %%format%%.
     */
    format() {
        throw new Error("@TODO");
    }
    /**
     *  Returns a new **StructFragment** for %%obj%%.
     */
    static from(obj) {
        if (typeof (obj) === "string") {
            try {
                return StructFragment.from(lex(obj));
            }
            catch (error) {
                assertArgument(false, "invalid struct fragment", "obj", obj);
            }
        }
        else if (obj instanceof TokenString) {
            const name = consumeName("struct", obj);
            const inputs = consumeParams(obj);
            consumeEoi(obj);
            return new StructFragment(_guard, name, inputs);
        }
        return new StructFragment(_guard, obj.name, obj.inputs ? obj.inputs.map(ParamType.from) : []);
    }
    // @TODO: fix this return type
    /**
     *  Returns ``true`` and provides a type guard if %%value%% is a
     *  **StructFragment**.
     */
    static isFragment(value) {
        return (value && value[internal$1] === StructFragmentInternal);
    }
}

/**
 *  When sending values to or receiving values from a [[Contract]], the
 *  data is generally encoded using the [ABI standard](link-solc-abi).
 *
 *  The AbiCoder provides a utility to encode values to ABI data and
 *  decode values from ABI data.
 *
 *  Most of the time, developers should favour the [[Contract]] class,
 *  which further abstracts a lot of the finer details of ABI data.
 *
 *  @_section api/abi/abi-coder:ABI Encoding
 */
// See: https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI
// https://docs.soliditylang.org/en/v0.8.17/control-structures.html
const PanicReasons$1 = new Map();
PanicReasons$1.set(0x00, "GENERIC_PANIC");
PanicReasons$1.set(0x01, "ASSERT_FALSE");
PanicReasons$1.set(0x11, "OVERFLOW");
PanicReasons$1.set(0x12, "DIVIDE_BY_ZERO");
PanicReasons$1.set(0x21, "ENUM_RANGE_ERROR");
PanicReasons$1.set(0x22, "BAD_STORAGE_DATA");
PanicReasons$1.set(0x31, "STACK_UNDERFLOW");
PanicReasons$1.set(0x32, "ARRAY_RANGE_ERROR");
PanicReasons$1.set(0x41, "OUT_OF_MEMORY");
PanicReasons$1.set(0x51, "UNINITIALIZED_FUNCTION_CALL");
const paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
const paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);
let defaultCoder = null;
let defaultMaxInflation = 1024;
function getBuiltinCallException(action, tx, data, abiCoder) {
    let message = "missing revert data";
    let reason = null;
    const invocation = null;
    let revert = null;
    if (data) {
        message = "execution reverted";
        const bytes = getBytes(data);
        data = hexlify(data);
        if (bytes.length === 0) {
            message += " (no data present; likely require(false) occurred";
            reason = "require(false)";
        }
        else if (bytes.length % 32 !== 4) {
            message += " (could not decode reason; invalid data length)";
        }
        else if (hexlify(bytes.slice(0, 4)) === "0x08c379a0") {
            // Error(string)
            try {
                reason = abiCoder.decode(["string"], bytes.slice(4))[0];
                revert = {
                    signature: "Error(string)",
                    name: "Error",
                    args: [reason]
                };
                message += `: ${JSON.stringify(reason)}`;
            }
            catch (error) {
                message += " (could not decode reason; invalid string data)";
            }
        }
        else if (hexlify(bytes.slice(0, 4)) === "0x4e487b71") {
            // Panic(uint256)
            try {
                const code = Number(abiCoder.decode(["uint256"], bytes.slice(4))[0]);
                revert = {
                    signature: "Panic(uint256)",
                    name: "Panic",
                    args: [code]
                };
                reason = `Panic due to ${PanicReasons$1.get(code) || "UNKNOWN"}(${code})`;
                message += `: ${reason}`;
            }
            catch (error) {
                message += " (could not decode panic code)";
            }
        }
        else {
            message += " (unknown custom error)";
        }
    }
    const transaction = {
        to: (tx.to ? getAddress(tx.to) : null),
        data: (tx.data || "0x")
    };
    if (tx.from) {
        transaction.from = getAddress(tx.from);
    }
    return makeError(message, "CALL_EXCEPTION", {
        action, data, reason, transaction, invocation, revert
    });
}
/**
 *  The **AbiCoder** is a low-level class responsible for encoding JavaScript
 *  values into binary data and decoding binary data into JavaScript values.
 */
class AbiCoder {
    #getCoder(param) {
        if (param.isArray()) {
            return new ArrayCoder(this.#getCoder(param.arrayChildren), param.arrayLength, param.name);
        }
        if (param.isTuple()) {
            return new TupleCoder(param.components.map((c) => this.#getCoder(c)), param.name);
        }
        switch (param.baseType) {
            case "address":
                return new AddressCoder(param.name);
            case "bool":
                return new BooleanCoder(param.name);
            case "string":
                return new StringCoder(param.name);
            case "bytes":
                return new BytesCoder(param.name);
            case "":
                return new NullCoder(param.name);
        }
        // u?int[0-9]*
        let match = param.type.match(paramTypeNumber);
        if (match) {
            let size = parseInt(match[2] || "256");
            assertArgument(size !== 0 && size <= 256 && (size % 8) === 0, "invalid " + match[1] + " bit length", "param", param);
            return new NumberCoder(size / 8, (match[1] === "int"), param.name);
        }
        // bytes[0-9]+
        match = param.type.match(paramTypeBytes);
        if (match) {
            let size = parseInt(match[1]);
            assertArgument(size !== 0 && size <= 32, "invalid bytes length", "param", param);
            return new FixedBytesCoder(size, param.name);
        }
        assertArgument(false, "invalid type", "type", param.type);
    }
    /**
     *  Get the default values for the given %%types%%.
     *
     *  For example, a ``uint`` is by default ``0`` and ``bool``
     *  is by default ``false``.
     */
    getDefaultValue(types) {
        const coders = types.map((type) => this.#getCoder(ParamType.from(type)));
        const coder = new TupleCoder(coders, "_");
        return coder.defaultValue();
    }
    /**
     *  Encode the %%values%% as the %%types%% into ABI data.
     *
     *  @returns DataHexstring
     */
    encode(types, values) {
        assertArgumentCount(values.length, types.length, "types/values length mismatch");
        const coders = types.map((type) => this.#getCoder(ParamType.from(type)));
        const coder = (new TupleCoder(coders, "_"));
        const writer = new Writer();
        coder.encode(writer, values);
        return writer.data;
    }
    /**
     *  Decode the ABI %%data%% as the %%types%% into values.
     *
     *  If %%loose%% decoding is enabled, then strict padding is
     *  not enforced. Some older versions of Solidity incorrectly
     *  padded event data emitted from ``external`` functions.
     */
    decode(types, data, loose) {
        const coders = types.map((type) => this.#getCoder(ParamType.from(type)));
        const coder = new TupleCoder(coders, "_");
        return coder.decode(new Reader(data, loose, defaultMaxInflation));
    }
    static _setDefaultMaxInflation(value) {
        assertArgument(typeof (value) === "number" && Number.isInteger(value), "invalid defaultMaxInflation factor", "value", value);
        defaultMaxInflation = value;
    }
    /**
     *  Returns the shared singleton instance of a default [[AbiCoder]].
     *
     *  On the first call, the instance is created internally.
     */
    static defaultAbiCoder() {
        if (defaultCoder == null) {
            defaultCoder = new AbiCoder();
        }
        return defaultCoder;
    }
    /**
     *  Returns an ethers-compatible [[CallExceptionError]] Error for the given
     *  result %%data%% for the [[CallExceptionAction]] %%action%% against
     *  the Transaction %%tx%%.
     */
    static getBuiltinCallException(action, tx, data) {
        return getBuiltinCallException(action, tx, data, AbiCoder.defaultAbiCoder());
    }
}

/**
 *  The Interface class is a low-level class that accepts an
 *  ABI and provides all the necessary functionality to encode
 *  and decode paramaters to and results from methods, events
 *  and errors.
 *
 *  It also provides several convenience methods to automatically
 *  search and find matching transactions and events to parse them.
 *
 *  @_subsection api/abi:Interfaces  [interfaces]
 */
/**
 *  When using the [[Interface-parseLog]] to automatically match a Log to its event
 *  for parsing, a **LogDescription** is returned.
 */
class LogDescription {
    /**
     *  The matching fragment for the ``topic0``.
     */
    fragment;
    /**
     *  The name of the Event.
     */
    name;
    /**
     *  The full Event signature.
     */
    signature;
    /**
     *  The topic hash for the Event.
     */
    topic;
    /**
     *  The arguments passed into the Event with ``emit``.
     */
    args;
    /**
     *  @_ignore:
     */
    constructor(fragment, topic, args) {
        const name = fragment.name, signature = fragment.format();
        defineProperties(this, {
            fragment, name, signature, topic, args
        });
    }
}
/**
 *  When using the [[Interface-parseTransaction]] to automatically match
 *  a transaction data to its function for parsing,
 *  a **TransactionDescription** is returned.
 */
class TransactionDescription {
    /**
     *  The matching fragment from the transaction ``data``.
     */
    fragment;
    /**
     *  The name of the Function from the transaction ``data``.
     */
    name;
    /**
     *  The arguments passed to the Function from the transaction ``data``.
     */
    args;
    /**
     *  The full Function signature from the transaction ``data``.
     */
    signature;
    /**
     *  The selector for the Function from the transaction ``data``.
     */
    selector;
    /**
     *  The ``value`` (in wei) from the transaction.
     */
    value;
    /**
     *  @_ignore:
     */
    constructor(fragment, selector, args, value) {
        const name = fragment.name, signature = fragment.format();
        defineProperties(this, {
            fragment, name, args, signature, selector, value
        });
    }
}
/**
 *  When using the [[Interface-parseError]] to automatically match an
 *  error for a call result for parsing, an **ErrorDescription** is returned.
 */
class ErrorDescription {
    /**
     *  The matching fragment.
     */
    fragment;
    /**
     *  The name of the Error.
     */
    name;
    /**
     *  The arguments passed to the Error with ``revert``.
     */
    args;
    /**
     *  The full Error signature.
     */
    signature;
    /**
     *  The selector for the Error.
     */
    selector;
    /**
     *  @_ignore:
     */
    constructor(fragment, selector, args) {
        const name = fragment.name, signature = fragment.format();
        defineProperties(this, {
            fragment, name, args, signature, selector
        });
    }
}
/**
 *  An **Indexed** is used as a value when a value that does not
 *  fit within a topic (i.e. not a fixed-length, 32-byte type). It
 *  is the ``keccak256`` of the value, and used for types such as
 *  arrays, tuples, bytes and strings.
 */
class Indexed {
    /**
     *  The ``keccak256`` of the value logged.
     */
    hash;
    /**
     *  @_ignore:
     */
    _isIndexed;
    /**
     *  Returns ``true`` if %%value%% is an **Indexed**.
     *
     *  This provides a Type Guard for property access.
     */
    static isIndexed(value) {
        return !!(value && value._isIndexed);
    }
    /**
     *  @_ignore:
     */
    constructor(hash) {
        defineProperties(this, { hash, _isIndexed: true });
    }
}
// https://docs.soliditylang.org/en/v0.8.13/control-structures.html?highlight=panic#panic-via-assert-and-error-via-require
const PanicReasons = {
    "0": "generic panic",
    "1": "assert(false)",
    "17": "arithmetic overflow",
    "18": "division or modulo by zero",
    "33": "enum overflow",
    "34": "invalid encoded storage byte array accessed",
    "49": "out-of-bounds array access; popping on an empty array",
    "50": "out-of-bounds access of an array or bytesN",
    "65": "out of memory",
    "81": "uninitialized function",
};
const BuiltinErrors = {
    "0x08c379a0": {
        signature: "Error(string)",
        name: "Error",
        inputs: ["string"],
        reason: (message) => {
            return `reverted with reason string ${JSON.stringify(message)}`;
        }
    },
    "0x4e487b71": {
        signature: "Panic(uint256)",
        name: "Panic",
        inputs: ["uint256"],
        reason: (code) => {
            let reason = "unknown panic code";
            if (code >= 0 && code <= 0xff && PanicReasons[code.toString()]) {
                reason = PanicReasons[code.toString()];
            }
            return `reverted with panic code 0x${code.toString(16)} (${reason})`;
        }
    }
};
/**
 *  An Interface abstracts many of the low-level details for
 *  encoding and decoding the data on the blockchain.
 *
 *  An ABI provides information on how to encode data to send to
 *  a Contract, how to decode the results and events and how to
 *  interpret revert errors.
 *
 *  The ABI can be specified by [any supported format](InterfaceAbi).
 */
class Interface {
    /**
     *  All the Contract ABI members (i.e. methods, events, errors, etc).
     */
    fragments;
    /**
     *  The Contract constructor.
     */
    deploy;
    /**
     *  The Fallback method, if any.
     */
    fallback;
    /**
     *  If receiving ether is supported.
     */
    receive;
    #errors;
    #events;
    #functions;
    //    #structs: Map<string, StructFragment>;
    #abiCoder;
    /**
     *  Create a new Interface for the %%fragments%%.
     */
    constructor(fragments) {
        let abi = [];
        if (typeof (fragments) === "string") {
            abi = JSON.parse(fragments);
        }
        else {
            abi = fragments;
        }
        this.#functions = new Map();
        this.#errors = new Map();
        this.#events = new Map();
        //        this.#structs = new Map();
        const frags = [];
        for (const a of abi) {
            try {
                frags.push(Fragment.from(a));
            }
            catch (error) {
                console.log(`[Warning] Invalid Fragment ${JSON.stringify(a)}:`, error.message);
            }
        }
        defineProperties(this, {
            fragments: Object.freeze(frags)
        });
        let fallback = null;
        let receive = false;
        this.#abiCoder = this.getAbiCoder();
        // Add all fragments by their signature
        this.fragments.forEach((fragment, index) => {
            let bucket;
            switch (fragment.type) {
                case "constructor":
                    if (this.deploy) {
                        console.log("duplicate definition - constructor");
                        return;
                    }
                    //checkNames(fragment, "input", fragment.inputs);
                    defineProperties(this, { deploy: fragment });
                    return;
                case "fallback":
                    if (fragment.inputs.length === 0) {
                        receive = true;
                    }
                    else {
                        assertArgument(!fallback || fragment.payable !== fallback.payable, "conflicting fallback fragments", `fragments[${index}]`, fragment);
                        fallback = fragment;
                        receive = fallback.payable;
                    }
                    return;
                case "function":
                    //checkNames(fragment, "input", fragment.inputs);
                    //checkNames(fragment, "output", (<FunctionFragment>fragment).outputs);
                    bucket = this.#functions;
                    break;
                case "event":
                    //checkNames(fragment, "input", fragment.inputs);
                    bucket = this.#events;
                    break;
                case "error":
                    bucket = this.#errors;
                    break;
                default:
                    return;
            }
            // Two identical entries; ignore it
            const signature = fragment.format();
            if (bucket.has(signature)) {
                return;
            }
            bucket.set(signature, fragment);
        });
        // If we do not have a constructor add a default
        if (!this.deploy) {
            defineProperties(this, {
                deploy: ConstructorFragment.from("constructor()")
            });
        }
        defineProperties(this, { fallback, receive });
    }
    /**
     *  Returns the entire Human-Readable ABI, as an array of
     *  signatures, optionally as %%minimal%% strings, which
     *  removes parameter names and unneceesary spaces.
     */
    format(minimal) {
        const format = (minimal ? "minimal" : "full");
        const abi = this.fragments.map((f) => f.format(format));
        return abi;
    }
    /**
     *  Return the JSON-encoded ABI. This is the format Solidiy
     *  returns.
     */
    formatJson() {
        const abi = this.fragments.map((f) => f.format("json"));
        // We need to re-bundle the JSON fragments a bit
        return JSON.stringify(abi.map((j) => JSON.parse(j)));
    }
    /**
     *  The ABI coder that will be used to encode and decode binary
     *  data.
     */
    getAbiCoder() {
        return AbiCoder.defaultAbiCoder();
    }
    // Find a function definition by any means necessary (unless it is ambiguous)
    #getFunction(key, values, forceUnique) {
        // Selector
        if (isHexString(key)) {
            const selector = key.toLowerCase();
            for (const fragment of this.#functions.values()) {
                if (selector === fragment.selector) {
                    return fragment;
                }
            }
            return null;
        }
        // It is a bare name, look up the function (will return null if ambiguous)
        if (key.indexOf("(") === -1) {
            const matching = [];
            for (const [name, fragment] of this.#functions) {
                if (name.split("(" /* fix:) */)[0] === key) {
                    matching.push(fragment);
                }
            }
            if (values) {
                const lastValue = (values.length > 0) ? values[values.length - 1] : null;
                let valueLength = values.length;
                let allowOptions = true;
                if (Typed.isTyped(lastValue) && lastValue.type === "overrides") {
                    allowOptions = false;
                    valueLength--;
                }
                // Remove all matches that don't have a compatible length. The args
                // may contain an overrides, so the match may have n or n - 1 parameters
                for (let i = matching.length - 1; i >= 0; i--) {
                    const inputs = matching[i].inputs.length;
                    if (inputs !== valueLength && (!allowOptions || inputs !== valueLength - 1)) {
                        matching.splice(i, 1);
                    }
                }
                // Remove all matches that don't match the Typed signature
                for (let i = matching.length - 1; i >= 0; i--) {
                    const inputs = matching[i].inputs;
                    for (let j = 0; j < values.length; j++) {
                        // Not a typed value
                        if (!Typed.isTyped(values[j])) {
                            continue;
                        }
                        // We are past the inputs
                        if (j >= inputs.length) {
                            if (values[j].type === "overrides") {
                                continue;
                            }
                            matching.splice(i, 1);
                            break;
                        }
                        // Make sure the value type matches the input type
                        if (values[j].type !== inputs[j].baseType) {
                            matching.splice(i, 1);
                            break;
                        }
                    }
                }
            }
            // We found a single matching signature with an overrides, but the
            // last value is something that cannot possibly be an options
            if (matching.length === 1 && values && values.length !== matching[0].inputs.length) {
                const lastArg = values[values.length - 1];
                if (lastArg == null || Array.isArray(lastArg) || typeof (lastArg) !== "object") {
                    matching.splice(0, 1);
                }
            }
            if (matching.length === 0) {
                return null;
            }
            if (matching.length > 1 && forceUnique) {
                const matchStr = matching.map((m) => JSON.stringify(m.format())).join(", ");
                assertArgument(false, `ambiguous function description (i.e. matches ${matchStr})`, "key", key);
            }
            return matching[0];
        }
        // Normalize the signature and lookup the function
        const result = this.#functions.get(FunctionFragment.from(key).format());
        if (result) {
            return result;
        }
        return null;
    }
    /**
     *  Get the function name for %%key%%, which may be a function selector,
     *  function name or function signature that belongs to the ABI.
     */
    getFunctionName(key) {
        const fragment = this.#getFunction(key, null, false);
        assertArgument(fragment, "no matching function", "key", key);
        return fragment.name;
    }
    /**
     *  Returns true if %%key%% (a function selector, function name or
     *  function signature) is present in the ABI.
     *
     *  In the case of a function name, the name may be ambiguous, so
     *  accessing the [[FunctionFragment]] may require refinement.
     */
    hasFunction(key) {
        return !!this.#getFunction(key, null, false);
    }
    /**
     *  Get the [[FunctionFragment]] for %%key%%, which may be a function
     *  selector, function name or function signature that belongs to the ABI.
     *
     *  If %%values%% is provided, it will use the Typed API to handle
     *  ambiguous cases where multiple functions match by name.
     *
     *  If the %%key%% and %%values%% do not refine to a single function in
     *  the ABI, this will throw.
     */
    getFunction(key, values) {
        return this.#getFunction(key, values || null, true);
    }
    /**
     *  Iterate over all functions, calling %%callback%%, sorted by their name.
     */
    forEachFunction(callback) {
        const names = Array.from(this.#functions.keys());
        names.sort((a, b) => a.localeCompare(b));
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            callback((this.#functions.get(name)), i);
        }
    }
    // Find an event definition by any means necessary (unless it is ambiguous)
    #getEvent(key, values, forceUnique) {
        // EventTopic
        if (isHexString(key)) {
            const eventTopic = key.toLowerCase();
            for (const fragment of this.#events.values()) {
                if (eventTopic === fragment.topicHash) {
                    return fragment;
                }
            }
            return null;
        }
        // It is a bare name, look up the function (will return null if ambiguous)
        if (key.indexOf("(") === -1) {
            const matching = [];
            for (const [name, fragment] of this.#events) {
                if (name.split("(" /* fix:) */)[0] === key) {
                    matching.push(fragment);
                }
            }
            if (values) {
                // Remove all matches that don't have a compatible length.
                for (let i = matching.length - 1; i >= 0; i--) {
                    if (matching[i].inputs.length < values.length) {
                        matching.splice(i, 1);
                    }
                }
                // Remove all matches that don't match the Typed signature
                for (let i = matching.length - 1; i >= 0; i--) {
                    const inputs = matching[i].inputs;
                    for (let j = 0; j < values.length; j++) {
                        // Not a typed value
                        if (!Typed.isTyped(values[j])) {
                            continue;
                        }
                        // Make sure the value type matches the input type
                        if (values[j].type !== inputs[j].baseType) {
                            matching.splice(i, 1);
                            break;
                        }
                    }
                }
            }
            if (matching.length === 0) {
                return null;
            }
            if (matching.length > 1 && forceUnique) {
                const matchStr = matching.map((m) => JSON.stringify(m.format())).join(", ");
                assertArgument(false, `ambiguous event description (i.e. matches ${matchStr})`, "key", key);
            }
            return matching[0];
        }
        // Normalize the signature and lookup the function
        const result = this.#events.get(EventFragment.from(key).format());
        if (result) {
            return result;
        }
        return null;
    }
    /**
     *  Get the event name for %%key%%, which may be a topic hash,
     *  event name or event signature that belongs to the ABI.
     */
    getEventName(key) {
        const fragment = this.#getEvent(key, null, false);
        assertArgument(fragment, "no matching event", "key", key);
        return fragment.name;
    }
    /**
     *  Returns true if %%key%% (an event topic hash, event name or
     *  event signature) is present in the ABI.
     *
     *  In the case of an event name, the name may be ambiguous, so
     *  accessing the [[EventFragment]] may require refinement.
     */
    hasEvent(key) {
        return !!this.#getEvent(key, null, false);
    }
    /**
     *  Get the [[EventFragment]] for %%key%%, which may be a topic hash,
     *  event name or event signature that belongs to the ABI.
     *
     *  If %%values%% is provided, it will use the Typed API to handle
     *  ambiguous cases where multiple events match by name.
     *
     *  If the %%key%% and %%values%% do not refine to a single event in
     *  the ABI, this will throw.
     */
    getEvent(key, values) {
        return this.#getEvent(key, values || null, true);
    }
    /**
     *  Iterate over all events, calling %%callback%%, sorted by their name.
     */
    forEachEvent(callback) {
        const names = Array.from(this.#events.keys());
        names.sort((a, b) => a.localeCompare(b));
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            callback((this.#events.get(name)), i);
        }
    }
    /**
     *  Get the [[ErrorFragment]] for %%key%%, which may be an error
     *  selector, error name or error signature that belongs to the ABI.
     *
     *  If %%values%% is provided, it will use the Typed API to handle
     *  ambiguous cases where multiple errors match by name.
     *
     *  If the %%key%% and %%values%% do not refine to a single error in
     *  the ABI, this will throw.
     */
    getError(key, values) {
        if (isHexString(key)) {
            const selector = key.toLowerCase();
            if (BuiltinErrors[selector]) {
                return ErrorFragment.from(BuiltinErrors[selector].signature);
            }
            for (const fragment of this.#errors.values()) {
                if (selector === fragment.selector) {
                    return fragment;
                }
            }
            return null;
        }
        // It is a bare name, look up the function (will return null if ambiguous)
        if (key.indexOf("(") === -1) {
            const matching = [];
            for (const [name, fragment] of this.#errors) {
                if (name.split("(" /* fix:) */)[0] === key) {
                    matching.push(fragment);
                }
            }
            if (matching.length === 0) {
                if (key === "Error") {
                    return ErrorFragment.from("error Error(string)");
                }
                if (key === "Panic") {
                    return ErrorFragment.from("error Panic(uint256)");
                }
                return null;
            }
            else if (matching.length > 1) {
                const matchStr = matching.map((m) => JSON.stringify(m.format())).join(", ");
                assertArgument(false, `ambiguous error description (i.e. ${matchStr})`, "name", key);
            }
            return matching[0];
        }
        // Normalize the signature and lookup the function
        key = ErrorFragment.from(key).format();
        if (key === "Error(string)") {
            return ErrorFragment.from("error Error(string)");
        }
        if (key === "Panic(uint256)") {
            return ErrorFragment.from("error Panic(uint256)");
        }
        const result = this.#errors.get(key);
        if (result) {
            return result;
        }
        return null;
    }
    /**
     *  Iterate over all errors, calling %%callback%%, sorted by their name.
     */
    forEachError(callback) {
        const names = Array.from(this.#errors.keys());
        names.sort((a, b) => a.localeCompare(b));
        for (let i = 0; i < names.length; i++) {
            const name = names[i];
            callback((this.#errors.get(name)), i);
        }
    }
    // Get the 4-byte selector used by Solidity to identify a function
    /*
getSelector(fragment: ErrorFragment | FunctionFragment): string {
    if (typeof(fragment) === "string") {
        const matches: Array<Fragment> = [ ];

        try { matches.push(this.getFunction(fragment)); } catch (error) { }
        try { matches.push(this.getError(<string>fragment)); } catch (_) { }

        if (matches.length === 0) {
            logger.throwArgumentError("unknown fragment", "key", fragment);
        } else if (matches.length > 1) {
            logger.throwArgumentError("ambiguous fragment matches function and error", "key", fragment);
        }

        fragment = matches[0];
    }

    return dataSlice(id(fragment.format()), 0, 4);
}
    */
    // Get the 32-byte topic hash used by Solidity to identify an event
    /*
    getEventTopic(fragment: EventFragment): string {
        //if (typeof(fragment) === "string") { fragment = this.getEvent(eventFragment); }
        return id(fragment.format());
    }
    */
    _decodeParams(params, data) {
        return this.#abiCoder.decode(params, data);
    }
    _encodeParams(params, values) {
        return this.#abiCoder.encode(params, values);
    }
    /**
     *  Encodes a ``tx.data`` object for deploying the Contract with
     *  the %%values%% as the constructor arguments.
     */
    encodeDeploy(values) {
        return this._encodeParams(this.deploy.inputs, values || []);
    }
    /**
     *  Decodes the result %%data%% (e.g. from an ``eth_call``) for the
     *  specified error (see [[getError]] for valid values for
     *  %%key%%).
     *
     *  Most developers should prefer the [[parseCallResult]] method instead,
     *  which will automatically detect a ``CALL_EXCEPTION`` and throw the
     *  corresponding error.
     */
    decodeErrorResult(fragment, data) {
        if (typeof (fragment) === "string") {
            const f = this.getError(fragment);
            assertArgument(f, "unknown error", "fragment", fragment);
            fragment = f;
        }
        assertArgument(dataSlice(data, 0, 4) === fragment.selector, `data signature does not match error ${fragment.name}.`, "data", data);
        return this._decodeParams(fragment.inputs, dataSlice(data, 4));
    }
    /**
     *  Encodes the transaction revert data for a call result that
     *  reverted from the the Contract with the sepcified %%error%%
     *  (see [[getError]] for valid values for %%fragment%%) with the %%values%%.
     *
     *  This is generally not used by most developers, unless trying to mock
     *  a result from a Contract.
     */
    encodeErrorResult(fragment, values) {
        if (typeof (fragment) === "string") {
            const f = this.getError(fragment);
            assertArgument(f, "unknown error", "fragment", fragment);
            fragment = f;
        }
        return concat([
            fragment.selector,
            this._encodeParams(fragment.inputs, values || [])
        ]);
    }
    /**
     *  Decodes the %%data%% from a transaction ``tx.data`` for
     *  the function specified (see [[getFunction]] for valid values
     *  for %%fragment%%).
     *
     *  Most developers should prefer the [[parseTransaction]] method
     *  instead, which will automatically detect the fragment.
     */
    decodeFunctionData(fragment, data) {
        if (typeof (fragment) === "string") {
            const f = this.getFunction(fragment);
            assertArgument(f, "unknown function", "fragment", fragment);
            fragment = f;
        }
        assertArgument(dataSlice(data, 0, 4) === fragment.selector, `data signature does not match function ${fragment.name}.`, "data", data);
        return this._decodeParams(fragment.inputs, dataSlice(data, 4));
    }
    /**
     *  Encodes the ``tx.data`` for a transaction that calls the function
     *  specified (see [[getFunction]] for valid values for %%fragment%%) with
     *  the %%values%%.
     */
    encodeFunctionData(fragment, values) {
        if (typeof (fragment) === "string") {
            const f = this.getFunction(fragment);
            assertArgument(f, "unknown function", "fragment", fragment);
            fragment = f;
        }
        return concat([
            fragment.selector,
            this._encodeParams(fragment.inputs, values || [])
        ]);
    }
    /**
     *  Decodes the result %%data%% (e.g. from an ``eth_call``) for the
     *  specified function (see [[getFunction]] for valid values for
     *  %%key%%).
     *
     *  Most developers should prefer the [[parseCallResult]] method instead,
     *  which will automatically detect a ``CALL_EXCEPTION`` and throw the
     *  corresponding error.
     */
    decodeFunctionResult(fragment, data) {
        if (typeof (fragment) === "string") {
            const f = this.getFunction(fragment);
            assertArgument(f, "unknown function", "fragment", fragment);
            fragment = f;
        }
        let message = "invalid length for result data";
        const bytes = getBytesCopy(data);
        if ((bytes.length % 32) === 0) {
            try {
                return this.#abiCoder.decode(fragment.outputs, bytes);
            }
            catch (error) {
                message = "could not decode result data";
            }
        }
        // Call returned data with no error, but the data is junk
        assert(false, message, "BAD_DATA", {
            value: hexlify(bytes),
            info: { method: fragment.name, signature: fragment.format() }
        });
    }
    makeError(_data, tx) {
        const data = getBytes(_data, "data");
        const error = AbiCoder.getBuiltinCallException("call", tx, data);
        // Not a built-in error; try finding a custom error
        const customPrefix = "execution reverted (unknown custom error)";
        if (error.message.startsWith(customPrefix)) {
            const selector = hexlify(data.slice(0, 4));
            const ef = this.getError(selector);
            if (ef) {
                try {
                    const args = this.#abiCoder.decode(ef.inputs, data.slice(4));
                    error.revert = {
                        name: ef.name, signature: ef.format(), args
                    };
                    error.reason = error.revert.signature;
                    error.message = `execution reverted: ${error.reason}`;
                }
                catch (e) {
                    error.message = `execution reverted (coult not decode custom error)`;
                }
            }
        }
        // Add the invocation, if available
        const parsed = this.parseTransaction(tx);
        if (parsed) {
            error.invocation = {
                method: parsed.name,
                signature: parsed.signature,
                args: parsed.args
            };
        }
        return error;
    }
    /**
     *  Encodes the result data (e.g. from an ``eth_call``) for the
     *  specified function (see [[getFunction]] for valid values
     *  for %%fragment%%) with %%values%%.
     *
     *  This is generally not used by most developers, unless trying to mock
     *  a result from a Contract.
     */
    encodeFunctionResult(fragment, values) {
        if (typeof (fragment) === "string") {
            const f = this.getFunction(fragment);
            assertArgument(f, "unknown function", "fragment", fragment);
            fragment = f;
        }
        return hexlify(this.#abiCoder.encode(fragment.outputs, values || []));
    }
    /*
        spelunk(inputs: Array<ParamType>, values: ReadonlyArray<any>, processfunc: (type: string, value: any) => Promise<any>): Promise<Array<any>> {
            const promises: Array<Promise<>> = [ ];
            const process = function(type: ParamType, value: any): any {
                if (type.baseType === "array") {
                    return descend(type.child
                }
                if (type. === "address") {
                }
            };
    
            const descend = function (inputs: Array<ParamType>, values: ReadonlyArray<any>) {
                if (inputs.length !== values.length) { throw new Error("length mismatch"); }
                
            };
    
            const result: Array<any> = [ ];
            values.forEach((value, index) => {
                if (value == null) {
                    topics.push(null);
                } else if (param.baseType === "array" || param.baseType === "tuple") {
                    logger.throwArgumentError("filtering with tuples or arrays not supported", ("contract." + param.name), value);
                } else if (Array.isArray(value)) {
                    topics.push(value.map((value) => encodeTopic(param, value)));
                } else {
                    topics.push(encodeTopic(param, value));
                }
            });
        }
    */
    // Create the filter for the event with search criteria (e.g. for eth_filterLog)
    encodeFilterTopics(fragment, values) {
        if (typeof (fragment) === "string") {
            const f = this.getEvent(fragment);
            assertArgument(f, "unknown event", "eventFragment", fragment);
            fragment = f;
        }
        assert(values.length <= fragment.inputs.length, `too many arguments for ${fragment.format()}`, "UNEXPECTED_ARGUMENT", { count: values.length, expectedCount: fragment.inputs.length });
        const topics = [];
        if (!fragment.anonymous) {
            topics.push(fragment.topicHash);
        }
        // @TODO: Use the coders for this; to properly support tuples, etc.
        const encodeTopic = (param, value) => {
            if (param.type === "string") {
                return id(value);
            }
            else if (param.type === "bytes") {
                return keccak256(hexlify(value));
            }
            if (param.type === "bool" && typeof (value) === "boolean") {
                value = (value ? "0x01" : "0x00");
            }
            else if (param.type.match(/^u?int/)) {
                value = toBeHex(value); // @TODO: Should this toTwos??
            }
            else if (param.type.match(/^bytes/)) {
                value = zeroPadBytes(value, 32);
            }
            else if (param.type === "address") {
                // Check addresses are valid
                this.#abiCoder.encode(["address"], [value]);
            }
            return zeroPadValue(hexlify(value), 32);
        };
        values.forEach((value, index) => {
            const param = fragment.inputs[index];
            if (!param.indexed) {
                assertArgument(value == null, "cannot filter non-indexed parameters; must be null", ("contract." + param.name), value);
                return;
            }
            if (value == null) {
                topics.push(null);
            }
            else if (param.baseType === "array" || param.baseType === "tuple") {
                assertArgument(false, "filtering with tuples or arrays not supported", ("contract." + param.name), value);
            }
            else if (Array.isArray(value)) {
                topics.push(value.map((value) => encodeTopic(param, value)));
            }
            else {
                topics.push(encodeTopic(param, value));
            }
        });
        // Trim off trailing nulls
        while (topics.length && topics[topics.length - 1] === null) {
            topics.pop();
        }
        return topics;
    }
    encodeEventLog(fragment, values) {
        if (typeof (fragment) === "string") {
            const f = this.getEvent(fragment);
            assertArgument(f, "unknown event", "eventFragment", fragment);
            fragment = f;
        }
        const topics = [];
        const dataTypes = [];
        const dataValues = [];
        if (!fragment.anonymous) {
            topics.push(fragment.topicHash);
        }
        assertArgument(values.length === fragment.inputs.length, "event arguments/values mismatch", "values", values);
        fragment.inputs.forEach((param, index) => {
            const value = values[index];
            if (param.indexed) {
                if (param.type === "string") {
                    topics.push(id(value));
                }
                else if (param.type === "bytes") {
                    topics.push(keccak256(value));
                }
                else if (param.baseType === "tuple" || param.baseType === "array") {
                    // @TODO
                    throw new Error("not implemented");
                }
                else {
                    topics.push(this.#abiCoder.encode([param.type], [value]));
                }
            }
            else {
                dataTypes.push(param);
                dataValues.push(value);
            }
        });
        return {
            data: this.#abiCoder.encode(dataTypes, dataValues),
            topics: topics
        };
    }
    // Decode a filter for the event and the search criteria
    decodeEventLog(fragment, data, topics) {
        if (typeof (fragment) === "string") {
            const f = this.getEvent(fragment);
            assertArgument(f, "unknown event", "eventFragment", fragment);
            fragment = f;
        }
        if (topics != null && !fragment.anonymous) {
            const eventTopic = fragment.topicHash;
            assertArgument(isHexString(topics[0], 32) && topics[0].toLowerCase() === eventTopic, "fragment/topic mismatch", "topics[0]", topics[0]);
            topics = topics.slice(1);
        }
        const indexed = [];
        const nonIndexed = [];
        const dynamic = [];
        fragment.inputs.forEach((param, index) => {
            if (param.indexed) {
                if (param.type === "string" || param.type === "bytes" || param.baseType === "tuple" || param.baseType === "array") {
                    indexed.push(ParamType.from({ type: "bytes32", name: param.name }));
                    dynamic.push(true);
                }
                else {
                    indexed.push(param);
                    dynamic.push(false);
                }
            }
            else {
                nonIndexed.push(param);
                dynamic.push(false);
            }
        });
        const resultIndexed = (topics != null) ? this.#abiCoder.decode(indexed, concat(topics)) : null;
        const resultNonIndexed = this.#abiCoder.decode(nonIndexed, data, true);
        //const result: (Array<any> & { [ key: string ]: any }) = [ ];
        const values = [];
        const keys = [];
        let nonIndexedIndex = 0, indexedIndex = 0;
        fragment.inputs.forEach((param, index) => {
            let value = null;
            if (param.indexed) {
                if (resultIndexed == null) {
                    value = new Indexed(null);
                }
                else if (dynamic[index]) {
                    value = new Indexed(resultIndexed[indexedIndex++]);
                }
                else {
                    try {
                        value = resultIndexed[indexedIndex++];
                    }
                    catch (error) {
                        value = error;
                    }
                }
            }
            else {
                try {
                    value = resultNonIndexed[nonIndexedIndex++];
                }
                catch (error) {
                    value = error;
                }
            }
            values.push(value);
            keys.push(param.name || null);
        });
        return Result.fromItems(values, keys);
    }
    /**
     *  Parses a transaction, finding the matching function and extracts
     *  the parameter values along with other useful function details.
     *
     *  If the matching function cannot be found, return null.
     */
    parseTransaction(tx) {
        const data = getBytes(tx.data, "tx.data");
        const value = getBigInt((tx.value != null) ? tx.value : 0, "tx.value");
        const fragment = this.getFunction(hexlify(data.slice(0, 4)));
        if (!fragment) {
            return null;
        }
        const args = this.#abiCoder.decode(fragment.inputs, data.slice(4));
        return new TransactionDescription(fragment, fragment.selector, args, value);
    }
    parseCallResult(data) {
        throw new Error("@TODO");
    }
    /**
     *  Parses a receipt log, finding the matching event and extracts
     *  the parameter values along with other useful event details.
     *
     *  If the matching event cannot be found, returns null.
     */
    parseLog(log) {
        const fragment = this.getEvent(log.topics[0]);
        if (!fragment || fragment.anonymous) {
            return null;
        }
        // @TODO: If anonymous, and the only method, and the input count matches, should we parse?
        //        Probably not, because just because it is the only event in the ABI does
        //        not mean we have the full ABI; maybe just a fragment?
        return new LogDescription(fragment, fragment.topicHash, this.decodeEventLog(fragment, log.data, log.topics));
    }
    /**
     *  Parses a revert data, finding the matching error and extracts
     *  the parameter values along with other useful error details.
     *
     *  If the matching error cannot be found, returns null.
     */
    parseError(data) {
        const hexData = hexlify(data);
        const fragment = this.getError(dataSlice(hexData, 0, 4));
        if (!fragment) {
            return null;
        }
        const args = this.#abiCoder.decode(fragment.inputs, dataSlice(hexData, 4));
        return new ErrorDescription(fragment, fragment.selector, args);
    }
    /**
     *  Creates a new [[Interface]] from the ABI %%value%%.
     *
     *  The %%value%% may be provided as an existing [[Interface]] object,
     *  a JSON-encoded ABI or any Human-Readable ABI format.
     */
    static from(value) {
        // Already an Interface, which is immutable
        if (value instanceof Interface) {
            return value;
        }
        // JSON
        if (typeof (value) === "string") {
            return new Interface(JSON.parse(value));
        }
        // An Interface; possibly from another v6 instance
        if (typeof (value.formatJson) === "function") {
            return new Interface(value.formatJson());
        }
        // A legacy Interface; from an older version
        if (typeof (value.format) === "function") {
            return new Interface(value.format("json"));
        }
        // Array of fragments
        return new Interface(value);
    }
}

//import { resolveAddress } from "@ethersproject/address";
const BN_0$2 = BigInt(0);
// -----------------------
function getValue(value) {
    if (value == null) {
        return null;
    }
    return value;
}
function toJson(value) {
    if (value == null) {
        return null;
    }
    return value.toString();
}
// @TODO? <T extends FeeData = { }> implements Required<T>
/**
 *  A **FeeData** wraps all the fee-related values associated with
 *  the network.
 */
class FeeData {
    /**
     *  The gas price for legacy networks.
     */
    gasPrice;
    /**
     *  The maximum fee to pay per gas.
     *
     *  The base fee per gas is defined by the network and based on
     *  congestion, increasing the cost during times of heavy load
     *  and lowering when less busy.
     *
     *  The actual fee per gas will be the base fee for the block
     *  and the priority fee, up to the max fee per gas.
     *
     *  This will be ``null`` on legacy networks (i.e. [pre-EIP-1559](link-eip-1559))
     */
    maxFeePerGas;
    /**
     *  The additional amout to pay per gas to encourage a validator
     *  to include the transaction.
     *
     *  The purpose of this is to compensate the validator for the
     *  adjusted risk for including a given transaction.
     *
     *  This will be ``null`` on legacy networks (i.e. [pre-EIP-1559](link-eip-1559))
     */
    maxPriorityFeePerGas;
    /**
     *  Creates a new FeeData for %%gasPrice%%, %%maxFeePerGas%% and
     *  %%maxPriorityFeePerGas%%.
     */
    constructor(gasPrice, maxFeePerGas, maxPriorityFeePerGas) {
        defineProperties(this, {
            gasPrice: getValue(gasPrice),
            maxFeePerGas: getValue(maxFeePerGas),
            maxPriorityFeePerGas: getValue(maxPriorityFeePerGas)
        });
    }
    /**
     *  Returns a JSON-friendly value.
     */
    toJSON() {
        const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = this;
        return {
            _type: "FeeData",
            gasPrice: toJson(gasPrice),
            maxFeePerGas: toJson(maxFeePerGas),
            maxPriorityFeePerGas: toJson(maxPriorityFeePerGas),
        };
    }
}
/**
 *  Returns a copy of %%req%% with all properties coerced to their strict
 *  types.
 */
function copyRequest(req) {
    const result = {};
    // These could be addresses, ENS names or Addressables
    if (req.to) {
        result.to = req.to;
    }
    if (req.from) {
        result.from = req.from;
    }
    if (req.data) {
        result.data = hexlify(req.data);
    }
    const bigIntKeys = "chainId,gasLimit,gasPrice,maxFeePerBlobGas,maxFeePerGas,maxPriorityFeePerGas,value".split(/,/);
    for (const key of bigIntKeys) {
        if (!(key in req) || req[key] == null) {
            continue;
        }
        result[key] = getBigInt(req[key], `request.${key}`);
    }
    const numberKeys = "type,nonce".split(/,/);
    for (const key of numberKeys) {
        if (!(key in req) || req[key] == null) {
            continue;
        }
        result[key] = getNumber(req[key], `request.${key}`);
    }
    if (req.accessList) {
        result.accessList = accessListify(req.accessList);
    }
    if ("blockTag" in req) {
        result.blockTag = req.blockTag;
    }
    if ("enableCcipRead" in req) {
        result.enableCcipRead = !!req.enableCcipRead;
    }
    if ("customData" in req) {
        result.customData = req.customData;
    }
    if ("blobVersionedHashes" in req && req.blobVersionedHashes) {
        result.blobVersionedHashes = req.blobVersionedHashes.slice();
    }
    if ("kzg" in req) {
        result.kzg = req.kzg;
    }
    if ("blobs" in req && req.blobs) {
        result.blobs = req.blobs.map((b) => {
            if (isBytesLike(b)) {
                return hexlify(b);
            }
            return Object.assign({}, b);
        });
    }
    return result;
}
/**
 *  A **Block** represents the data associated with a full block on
 *  Ethereum.
 */
class Block {
    /**
     *  The provider connected to the block used to fetch additional details
     *  if necessary.
     */
    provider;
    /**
     *  The block number, sometimes called the block height. This is a
     *  sequential number that is one higher than the parent block.
     */
    number;
    /**
     *  The block hash.
     *
     *  This hash includes all properties, so can be safely used to identify
     *  an exact set of block properties.
     */
    hash;
    /**
     *  The timestamp for this block, which is the number of seconds since
     *  epoch that this block was included.
     */
    timestamp;
    /**
     *  The block hash of the parent block.
     */
    parentHash;
    /**
     *  The hash tree root of the parent beacon block for the given
     *  execution block. See [[link-eip-4788]].
     */
    parentBeaconBlockRoot;
    /**
     *  The nonce.
     *
     *  On legacy networks, this is the random number inserted which
     *  permitted the difficulty target to be reached.
     */
    nonce;
    /**
     *  The difficulty target.
     *
     *  On legacy networks, this is the proof-of-work target required
     *  for a block to meet the protocol rules to be included.
     *
     *  On modern networks, this is a random number arrived at using
     *  randao.  @TODO: Find links?
     */
    difficulty;
    /**
     *  The total gas limit for this block.
     */
    gasLimit;
    /**
     *  The total gas used in this block.
     */
    gasUsed;
    /**
     *  The root hash for the global state after applying changes
     *  in this block.
     */
    stateRoot;
    /**
     *  The hash of the transaction receipts trie.
     */
    receiptsRoot;
    /**
     *  The total amount of blob gas consumed by the transactions
     *  within the block. See [[link-eip-4844]].
     */
    blobGasUsed;
    /**
     *  The running total of blob gas consumed in excess of the
     *  target, prior to the block. See [[link-eip-4844]].
     */
    excessBlobGas;
    /**
     *  The miner coinbase address, wihch receives any subsidies for
     *  including this block.
     */
    miner;
    /**
     *  The latest RANDAO mix of the post beacon state of
     *  the previous block.
     */
    prevRandao;
    /**
     *  Any extra data the validator wished to include.
     */
    extraData;
    /**
     *  The base fee per gas that all transactions in this block were
     *  charged.
     *
     *  This adjusts after each block, depending on how congested the network
     *  is.
     */
    baseFeePerGas;
    #transactions;
    /**
     *  Create a new **Block** object.
     *
     *  This should generally not be necessary as the unless implementing a
     *  low-level library.
     */
    constructor(block, provider) {
        this.#transactions = block.transactions.map((tx) => {
            if (typeof (tx) !== "string") {
                return new TransactionResponse(tx, provider);
            }
            return tx;
        });
        defineProperties(this, {
            provider,
            hash: getValue(block.hash),
            number: block.number,
            timestamp: block.timestamp,
            parentHash: block.parentHash,
            parentBeaconBlockRoot: block.parentBeaconBlockRoot,
            nonce: block.nonce,
            difficulty: block.difficulty,
            gasLimit: block.gasLimit,
            gasUsed: block.gasUsed,
            blobGasUsed: block.blobGasUsed,
            excessBlobGas: block.excessBlobGas,
            miner: block.miner,
            prevRandao: getValue(block.prevRandao),
            extraData: block.extraData,
            baseFeePerGas: getValue(block.baseFeePerGas),
            stateRoot: block.stateRoot,
            receiptsRoot: block.receiptsRoot,
        });
    }
    /**
     *  Returns the list of transaction hashes, in the order
     *  they were executed within the block.
     */
    get transactions() {
        return this.#transactions.map((tx) => {
            if (typeof (tx) === "string") {
                return tx;
            }
            return tx.hash;
        });
    }
    /**
     *  Returns the complete transactions, in the order they
     *  were executed within the block.
     *
     *  This is only available for blocks which prefetched
     *  transactions, by passing ``true`` to %%prefetchTxs%%
     *  into [[Provider-getBlock]].
     */
    get prefetchedTransactions() {
        const txs = this.#transactions.slice();
        // Doesn't matter...
        if (txs.length === 0) {
            return [];
        }
        // Make sure we prefetched the transactions
        assert(typeof (txs[0]) === "object", "transactions were not prefetched with block request", "UNSUPPORTED_OPERATION", {
            operation: "transactionResponses()"
        });
        return txs;
    }
    /**
     *  Returns a JSON-friendly value.
     */
    toJSON() {
        const { baseFeePerGas, difficulty, extraData, gasLimit, gasUsed, hash, miner, prevRandao, nonce, number, parentHash, parentBeaconBlockRoot, stateRoot, receiptsRoot, timestamp, transactions } = this;
        return {
            _type: "Block",
            baseFeePerGas: toJson(baseFeePerGas),
            difficulty: toJson(difficulty),
            extraData,
            gasLimit: toJson(gasLimit),
            gasUsed: toJson(gasUsed),
            blobGasUsed: toJson(this.blobGasUsed),
            excessBlobGas: toJson(this.excessBlobGas),
            hash, miner, prevRandao, nonce, number, parentHash, timestamp,
            parentBeaconBlockRoot, stateRoot, receiptsRoot,
            transactions,
        };
    }
    [Symbol.iterator]() {
        let index = 0;
        const txs = this.transactions;
        return {
            next: () => {
                if (index < this.length) {
                    return {
                        value: txs[index++], done: false
                    };
                }
                return { value: undefined, done: true };
            }
        };
    }
    /**
     *  The number of transactions in this block.
     */
    get length() { return this.#transactions.length; }
    /**
     *  The [[link-js-date]] this block was included at.
     */
    get date() {
        if (this.timestamp == null) {
            return null;
        }
        return new Date(this.timestamp * 1000);
    }
    /**
     *  Get the transaction at %%indexe%% within this block.
     */
    async getTransaction(indexOrHash) {
        // Find the internal value by its index or hash
        let tx = undefined;
        if (typeof (indexOrHash) === "number") {
            tx = this.#transactions[indexOrHash];
        }
        else {
            const hash = indexOrHash.toLowerCase();
            for (const v of this.#transactions) {
                if (typeof (v) === "string") {
                    if (v !== hash) {
                        continue;
                    }
                    tx = v;
                    break;
                }
                else {
                    if (v.hash === hash) {
                        continue;
                    }
                    tx = v;
                    break;
                }
            }
        }
        if (tx == null) {
            throw new Error("no such tx");
        }
        if (typeof (tx) === "string") {
            return (await this.provider.getTransaction(tx));
        }
        else {
            return tx;
        }
    }
    /**
     *  If a **Block** was fetched with a request to include the transactions
     *  this will allow synchronous access to those transactions.
     *
     *  If the transactions were not prefetched, this will throw.
     */
    getPrefetchedTransaction(indexOrHash) {
        const txs = this.prefetchedTransactions;
        if (typeof (indexOrHash) === "number") {
            return txs[indexOrHash];
        }
        indexOrHash = indexOrHash.toLowerCase();
        for (const tx of txs) {
            if (tx.hash === indexOrHash) {
                return tx;
            }
        }
        assertArgument(false, "no matching transaction", "indexOrHash", indexOrHash);
    }
    /**
     *  Returns true if this block been mined. This provides a type guard
     *  for all properties on a [[MinedBlock]].
     */
    isMined() { return !!this.hash; }
    /**
     *  Returns true if this block is an [[link-eip-2930]] block.
     */
    isLondon() {
        return !!this.baseFeePerGas;
    }
    /**
     *  @_ignore:
     */
    orphanedEvent() {
        if (!this.isMined()) {
            throw new Error("");
        }
        return createOrphanedBlockFilter(this);
    }
}
//////////////////////
// Log
/**
 *  A **Log** in Ethereum represents an event that has been included in a
 *  transaction using the ``LOG*`` opcodes, which are most commonly used by
 *  Solidity's emit for announcing events.
 */
class Log {
    /**
     *  The provider connected to the log used to fetch additional details
     *  if necessary.
     */
    provider;
    /**
     *  The transaction hash of the transaction this log occurred in. Use the
     *  [[Log-getTransaction]] to get the [[TransactionResponse]].
     */
    transactionHash;
    /**
     *  The block hash of the block this log occurred in. Use the
     *  [[Log-getBlock]] to get the [[Block]].
     */
    blockHash;
    /**
     *  The block number of the block this log occurred in. It is preferred
     *  to use the [[Block-hash]] when fetching the related [[Block]],
     *  since in the case of an orphaned block, the block at that height may
     *  have changed.
     */
    blockNumber;
    /**
     *  If the **Log** represents a block that was removed due to an orphaned
     *  block, this will be true.
     *
     *  This can only happen within an orphan event listener.
     */
    removed;
    /**
     *  The address of the contract that emitted this log.
     */
    address;
    /**
     *  The data included in this log when it was emitted.
     */
    data;
    /**
     *  The indexed topics included in this log when it was emitted.
     *
     *  All topics are included in the bloom filters, so they can be
     *  efficiently filtered using the [[Provider-getLogs]] method.
     */
    topics;
    /**
     *  The index within the block this log occurred at. This is generally
     *  not useful to developers, but can be used with the various roots
     *  to proof inclusion within a block.
     */
    index;
    /**
     *  The index within the transaction of this log.
     */
    transactionIndex;
    /**
     *  @_ignore:
     */
    constructor(log, provider) {
        this.provider = provider;
        const topics = Object.freeze(log.topics.slice());
        defineProperties(this, {
            transactionHash: log.transactionHash,
            blockHash: log.blockHash,
            blockNumber: log.blockNumber,
            removed: log.removed,
            address: log.address,
            data: log.data,
            topics,
            index: log.index,
            transactionIndex: log.transactionIndex,
        });
    }
    /**
     *  Returns a JSON-compatible object.
     */
    toJSON() {
        const { address, blockHash, blockNumber, data, index, removed, topics, transactionHash, transactionIndex } = this;
        return {
            _type: "log",
            address, blockHash, blockNumber, data, index,
            removed, topics, transactionHash, transactionIndex
        };
    }
    /**
     *  Returns the block that this log occurred in.
     */
    async getBlock() {
        const block = await this.provider.getBlock(this.blockHash);
        assert(!!block, "failed to find transaction", "UNKNOWN_ERROR", {});
        return block;
    }
    /**
     *  Returns the transaction that this log occurred in.
     */
    async getTransaction() {
        const tx = await this.provider.getTransaction(this.transactionHash);
        assert(!!tx, "failed to find transaction", "UNKNOWN_ERROR", {});
        return tx;
    }
    /**
     *  Returns the transaction receipt fot the transaction that this
     *  log occurred in.
     */
    async getTransactionReceipt() {
        const receipt = await this.provider.getTransactionReceipt(this.transactionHash);
        assert(!!receipt, "failed to find transaction receipt", "UNKNOWN_ERROR", {});
        return receipt;
    }
    /**
     *  @_ignore:
     */
    removedEvent() {
        return createRemovedLogFilter(this);
    }
}
//////////////////////
// Transaction Receipt
/*
export interface LegacyTransactionReceipt {
    byzantium: false;
    status: null;
    root: string;
}

export interface ByzantiumTransactionReceipt {
    byzantium: true;
    status: number;
    root: null;
}
*/
/**
 *  A **TransactionReceipt** includes additional information about a
 *  transaction that is only available after it has been mined.
 */
class TransactionReceipt {
    /**
     *  The provider connected to the log used to fetch additional details
     *  if necessary.
     */
    provider;
    /**
     *  The address the transaction was sent to.
     */
    to;
    /**
     *  The sender of the transaction.
     */
    from;
    /**
     *  The address of the contract if the transaction was directly
     *  responsible for deploying one.
     *
     *  This is non-null **only** if the ``to`` is empty and the ``data``
     *  was successfully executed as initcode.
     */
    contractAddress;
    /**
     *  The transaction hash.
     */
    hash;
    /**
     *  The index of this transaction within the block transactions.
     */
    index;
    /**
     *  The block hash of the [[Block]] this transaction was included in.
     */
    blockHash;
    /**
     *  The block number of the [[Block]] this transaction was included in.
     */
    blockNumber;
    /**
     *  The bloom filter bytes that represent all logs that occurred within
     *  this transaction. This is generally not useful for most developers,
     *  but can be used to validate the included logs.
     */
    logsBloom;
    /**
     *  The actual amount of gas used by this transaction.
     *
     *  When creating a transaction, the amount of gas that will be used can
     *  only be approximated, but the sender must pay the gas fee for the
     *  entire gas limit. After the transaction, the difference is refunded.
     */
    gasUsed;
    /**
     *  The gas used for BLObs. See [[link-eip-4844]].
     */
    blobGasUsed;
    /**
     *  The amount of gas used by all transactions within the block for this
     *  and all transactions with a lower ``index``.
     *
     *  This is generally not useful for developers but can be used to
     *  validate certain aspects of execution.
     */
    cumulativeGasUsed;
    /**
     *  The actual gas price used during execution.
     *
     *  Due to the complexity of [[link-eip-1559]] this value can only
     *  be caluclated after the transaction has been mined, snce the base
     *  fee is protocol-enforced.
     */
    gasPrice;
    /**
     *  The price paid per BLOB in gas. See [[link-eip-4844]].
     */
    blobGasPrice;
    /**
     *  The [[link-eip-2718]] transaction type.
     */
    type;
    //readonly byzantium!: boolean;
    /**
     *  The status of this transaction, indicating success (i.e. ``1``) or
     *  a revert (i.e. ``0``).
     *
     *  This is available in post-byzantium blocks, but some backends may
     *  backfill this value.
     */
    status;
    /**
     *  The root hash of this transaction.
     *
     *  This is no present and was only included in pre-byzantium blocks, but
     *  could be used to validate certain parts of the receipt.
     */
    root;
    #logs;
    /**
     *  @_ignore:
     */
    constructor(tx, provider) {
        this.#logs = Object.freeze(tx.logs.map((log) => {
            return new Log(log, provider);
        }));
        let gasPrice = BN_0$2;
        if (tx.effectiveGasPrice != null) {
            gasPrice = tx.effectiveGasPrice;
        }
        else if (tx.gasPrice != null) {
            gasPrice = tx.gasPrice;
        }
        defineProperties(this, {
            provider,
            to: tx.to,
            from: tx.from,
            contractAddress: tx.contractAddress,
            hash: tx.hash,
            index: tx.index,
            blockHash: tx.blockHash,
            blockNumber: tx.blockNumber,
            logsBloom: tx.logsBloom,
            gasUsed: tx.gasUsed,
            cumulativeGasUsed: tx.cumulativeGasUsed,
            blobGasUsed: tx.blobGasUsed,
            gasPrice,
            blobGasPrice: tx.blobGasPrice,
            type: tx.type,
            //byzantium: tx.byzantium,
            status: tx.status,
            root: tx.root
        });
    }
    /**
     *  The logs for this transaction.
     */
    get logs() { return this.#logs; }
    /**
     *  Returns a JSON-compatible representation.
     */
    toJSON() {
        const { to, from, contractAddress, hash, index, blockHash, blockNumber, logsBloom, logs, //byzantium, 
        status, root } = this;
        return {
            _type: "TransactionReceipt",
            blockHash, blockNumber,
            //byzantium, 
            contractAddress,
            cumulativeGasUsed: toJson(this.cumulativeGasUsed),
            from,
            gasPrice: toJson(this.gasPrice),
            blobGasUsed: toJson(this.blobGasUsed),
            blobGasPrice: toJson(this.blobGasPrice),
            gasUsed: toJson(this.gasUsed),
            hash, index, logs, logsBloom, root, status, to
        };
    }
    /**
     *  @_ignore:
     */
    get length() { return this.logs.length; }
    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if (index < this.length) {
                    return { value: this.logs[index++], done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }
    /**
     *  The total fee for this transaction, in wei.
     */
    get fee() {
        return this.gasUsed * this.gasPrice;
    }
    /**
     *  Resolves to the block this transaction occurred in.
     */
    async getBlock() {
        const block = await this.provider.getBlock(this.blockHash);
        if (block == null) {
            throw new Error("TODO");
        }
        return block;
    }
    /**
     *  Resolves to the transaction this transaction occurred in.
     */
    async getTransaction() {
        const tx = await this.provider.getTransaction(this.hash);
        if (tx == null) {
            throw new Error("TODO");
        }
        return tx;
    }
    /**
     *  Resolves to the return value of the execution of this transaction.
     *
     *  Support for this feature is limited, as it requires an archive node
     *  with the ``debug_`` or ``trace_`` API enabled.
     */
    async getResult() {
        return (await this.provider.getTransactionResult(this.hash));
    }
    /**
     *  Resolves to the number of confirmations this transaction has.
     */
    async confirmations() {
        return (await this.provider.getBlockNumber()) - this.blockNumber + 1;
    }
    /**
     *  @_ignore:
     */
    removedEvent() {
        return createRemovedTransactionFilter(this);
    }
    /**
     *  @_ignore:
     */
    reorderedEvent(other) {
        assert(!other || other.isMined(), "unmined 'other' transction cannot be orphaned", "UNSUPPORTED_OPERATION", { operation: "reorderedEvent(other)" });
        return createReorderedTransactionFilter(this, other);
    }
}
/**
 *  A **TransactionResponse** includes all properties about a transaction
 *  that was sent to the network, which may or may not be included in a
 *  block.
 *
 *  The [[TransactionResponse-isMined]] can be used to check if the
 *  transaction has been mined as well as type guard that the otherwise
 *  possibly ``null`` properties are defined.
 */
class TransactionResponse {
    /**
     *  The provider this is connected to, which will influence how its
     *  methods will resolve its async inspection methods.
     */
    provider;
    /**
     *  The block number of the block that this transaction was included in.
     *
     *  This is ``null`` for pending transactions.
     */
    blockNumber;
    /**
     *  The blockHash of the block that this transaction was included in.
     *
     *  This is ``null`` for pending transactions.
     */
    blockHash;
    /**
     *  The index within the block that this transaction resides at.
     */
    index;
    /**
     *  The transaction hash.
     */
    hash;
    /**
     *  The [[link-eip-2718]] transaction envelope type. This is
     *  ``0`` for legacy transactions types.
     */
    type;
    /**
     *  The receiver of this transaction.
     *
     *  If ``null``, then the transaction is an initcode transaction.
     *  This means the result of executing the [[data]] will be deployed
     *  as a new contract on chain (assuming it does not revert) and the
     *  address may be computed using [[getCreateAddress]].
     */
    to;
    /**
     *  The sender of this transaction. It is implicitly computed
     *  from the transaction pre-image hash (as the digest) and the
     *  [[signature]] using ecrecover.
     */
    from;
    /**
     *  The nonce, which is used to prevent replay attacks and offer
     *  a method to ensure transactions from a given sender are explicitly
     *  ordered.
     *
     *  When sending a transaction, this must be equal to the number of
     *  transactions ever sent by [[from]].
     */
    nonce;
    /**
     *  The maximum units of gas this transaction can consume. If execution
     *  exceeds this, the entries transaction is reverted and the sender
     *  is charged for the full amount, despite not state changes being made.
     */
    gasLimit;
    /**
     *  The gas price can have various values, depending on the network.
     *
     *  In modern networks, for transactions that are included this is
     *  the //effective gas price// (the fee per gas that was actually
     *  charged), while for transactions that have not been included yet
     *  is the [[maxFeePerGas]].
     *
     *  For legacy transactions, or transactions on legacy networks, this
     *  is the fee that will be charged per unit of gas the transaction
     *  consumes.
     */
    gasPrice;
    /**
     *  The maximum priority fee (per unit of gas) to allow a
     *  validator to charge the sender. This is inclusive of the
     *  [[maxFeeFeePerGas]].
     */
    maxPriorityFeePerGas;
    /**
     *  The maximum fee (per unit of gas) to allow this transaction
     *  to charge the sender.
     */
    maxFeePerGas;
    /**
     *  The [[link-eip-4844]] max fee per BLOb gas.
     */
    maxFeePerBlobGas;
    /**
     *  The data.
     */
    data;
    /**
     *  The value, in wei. Use [[formatEther]] to format this value
     *  as ether.
     */
    value;
    /**
     *  The chain ID.
     */
    chainId;
    /**
     *  The signature.
     */
    signature;
    /**
     *  The [[link-eip-2930]] access list for transaction types that
     *  support it, otherwise ``null``.
     */
    accessList;
    /**
     *  The [[link-eip-4844]] BLOb versioned hashes.
     */
    blobVersionedHashes;
    #startBlock;
    /**
     *  @_ignore:
     */
    constructor(tx, provider) {
        this.provider = provider;
        this.blockNumber = (tx.blockNumber != null) ? tx.blockNumber : null;
        this.blockHash = (tx.blockHash != null) ? tx.blockHash : null;
        this.hash = tx.hash;
        this.index = tx.index;
        this.type = tx.type;
        this.from = tx.from;
        this.to = tx.to || null;
        this.gasLimit = tx.gasLimit;
        this.nonce = tx.nonce;
        this.data = tx.data;
        this.value = tx.value;
        this.gasPrice = tx.gasPrice;
        this.maxPriorityFeePerGas = (tx.maxPriorityFeePerGas != null) ? tx.maxPriorityFeePerGas : null;
        this.maxFeePerGas = (tx.maxFeePerGas != null) ? tx.maxFeePerGas : null;
        this.maxFeePerBlobGas = (tx.maxFeePerBlobGas != null) ? tx.maxFeePerBlobGas : null;
        this.chainId = tx.chainId;
        this.signature = tx.signature;
        this.accessList = (tx.accessList != null) ? tx.accessList : null;
        this.blobVersionedHashes = (tx.blobVersionedHashes != null) ? tx.blobVersionedHashes : null;
        this.#startBlock = -1;
    }
    /**
     *  Returns a JSON-compatible representation of this transaction.
     */
    toJSON() {
        const { blockNumber, blockHash, index, hash, type, to, from, nonce, data, signature, accessList, blobVersionedHashes } = this;
        return {
            _type: "TransactionResponse",
            accessList, blockNumber, blockHash,
            blobVersionedHashes,
            chainId: toJson(this.chainId),
            data, from,
            gasLimit: toJson(this.gasLimit),
            gasPrice: toJson(this.gasPrice),
            hash,
            maxFeePerGas: toJson(this.maxFeePerGas),
            maxPriorityFeePerGas: toJson(this.maxPriorityFeePerGas),
            maxFeePerBlobGas: toJson(this.maxFeePerBlobGas),
            nonce, signature, to, index, type,
            value: toJson(this.value),
        };
    }
    /**
     *  Resolves to the Block that this transaction was included in.
     *
     *  This will return null if the transaction has not been included yet.
     */
    async getBlock() {
        let blockNumber = this.blockNumber;
        if (blockNumber == null) {
            const tx = await this.getTransaction();
            if (tx) {
                blockNumber = tx.blockNumber;
            }
        }
        if (blockNumber == null) {
            return null;
        }
        const block = this.provider.getBlock(blockNumber);
        if (block == null) {
            throw new Error("TODO");
        }
        return block;
    }
    /**
     *  Resolves to this transaction being re-requested from the
     *  provider. This can be used if you have an unmined transaction
     *  and wish to get an up-to-date populated instance.
     */
    async getTransaction() {
        return this.provider.getTransaction(this.hash);
    }
    /**
     *  Resolve to the number of confirmations this transaction has.
     */
    async confirmations() {
        if (this.blockNumber == null) {
            const { tx, blockNumber } = await resolveProperties({
                tx: this.getTransaction(),
                blockNumber: this.provider.getBlockNumber()
            });
            // Not mined yet...
            if (tx == null || tx.blockNumber == null) {
                return 0;
            }
            return blockNumber - tx.blockNumber + 1;
        }
        const blockNumber = await this.provider.getBlockNumber();
        return blockNumber - this.blockNumber + 1;
    }
    /**
     *  Resolves once this transaction has been mined and has
     *  %%confirms%% blocks including it (default: ``1``) with an
     *  optional %%timeout%%.
     *
     *  This can resolve to ``null`` only if %%confirms%% is ``0``
     *  and the transaction has not been mined, otherwise this will
     *  wait until enough confirmations have completed.
     */
    async wait(_confirms, _timeout) {
        const confirms = (_confirms == null) ? 1 : _confirms;
        const timeout = (_timeout == null) ? 0 : _timeout;
        let startBlock = this.#startBlock;
        let nextScan = -1;
        let stopScanning = (startBlock === -1) ? true : false;
        const checkReplacement = async () => {
            // Get the current transaction count for this sender
            if (stopScanning) {
                return null;
            }
            const { blockNumber, nonce } = await resolveProperties({
                blockNumber: this.provider.getBlockNumber(),
                nonce: this.provider.getTransactionCount(this.from)
            });
            // No transaction or our nonce has not been mined yet; but we
            // can start scanning later when we do start
            if (nonce < this.nonce) {
                startBlock = blockNumber;
                return;
            }
            // We were mined; no replacement
            if (stopScanning) {
                return null;
            }
            const mined = await this.getTransaction();
            if (mined && mined.blockNumber != null) {
                return;
            }
            // We were replaced; start scanning for that transaction
            // Starting to scan; look back a few extra blocks for safety
            if (nextScan === -1) {
                nextScan = startBlock - 3;
                if (nextScan < this.#startBlock) {
                    nextScan = this.#startBlock;
                }
            }
            while (nextScan <= blockNumber) {
                // Get the next block to scan
                if (stopScanning) {
                    return null;
                }
                const block = await this.provider.getBlock(nextScan, true);
                // This should not happen; but we'll try again shortly
                if (block == null) {
                    return;
                }
                // We were mined; no replacement
                for (const hash of block) {
                    if (hash === this.hash) {
                        return;
                    }
                }
                // Search for the transaction that replaced us
                for (let i = 0; i < block.length; i++) {
                    const tx = await block.getTransaction(i);
                    if (tx.from === this.from && tx.nonce === this.nonce) {
                        // Get the receipt
                        if (stopScanning) {
                            return null;
                        }
                        const receipt = await this.provider.getTransactionReceipt(tx.hash);
                        // This should not happen; but we'll try again shortly
                        if (receipt == null) {
                            return;
                        }
                        // We will retry this on the next block (this case could be optimized)
                        if ((blockNumber - receipt.blockNumber + 1) < confirms) {
                            return;
                        }
                        // The reason we were replaced
                        let reason = "replaced";
                        if (tx.data === this.data && tx.to === this.to && tx.value === this.value) {
                            reason = "repriced";
                        }
                        else if (tx.data === "0x" && tx.from === tx.to && tx.value === BN_0$2) {
                            reason = "cancelled";
                        }
                        assert(false, "transaction was replaced", "TRANSACTION_REPLACED", {
                            cancelled: (reason === "replaced" || reason === "cancelled"),
                            reason,
                            replacement: tx.replaceableTransaction(startBlock),
                            hash: tx.hash,
                            receipt
                        });
                    }
                }
                nextScan++;
            }
            return;
        };
        const checkReceipt = (receipt) => {
            if (receipt == null || receipt.status !== 0) {
                return receipt;
            }
            assert(false, "transaction execution reverted", "CALL_EXCEPTION", {
                action: "sendTransaction",
                data: null, reason: null, invocation: null, revert: null,
                transaction: {
                    to: receipt.to,
                    from: receipt.from,
                    data: "" // @TODO: in v7, split out sendTransaction properties
                }, receipt
            });
        };
        const receipt = await this.provider.getTransactionReceipt(this.hash);
        if (confirms === 0) {
            return checkReceipt(receipt);
        }
        if (receipt) {
            if ((await receipt.confirmations()) >= confirms) {
                return checkReceipt(receipt);
            }
        }
        else {
            // Check for a replacement; throws if a replacement was found
            await checkReplacement();
            // Allow null only when the confirms is 0
            if (confirms === 0) {
                return null;
            }
        }
        const waiter = new Promise((resolve, reject) => {
            // List of things to cancel when we have a result (one way or the other)
            const cancellers = [];
            const cancel = () => { cancellers.forEach((c) => c()); };
            // On cancel, stop scanning for replacements
            cancellers.push(() => { stopScanning = true; });
            // Set up any timeout requested
            if (timeout > 0) {
                const timer = setTimeout(() => {
                    cancel();
                    reject(makeError("wait for transaction timeout", "TIMEOUT"));
                }, timeout);
                cancellers.push(() => { clearTimeout(timer); });
            }
            const txListener = async (receipt) => {
                // Done; return it!
                if ((await receipt.confirmations()) >= confirms) {
                    cancel();
                    try {
                        resolve(checkReceipt(receipt));
                    }
                    catch (error) {
                        reject(error);
                    }
                }
            };
            cancellers.push(() => { this.provider.off(this.hash, txListener); });
            this.provider.on(this.hash, txListener);
            // We support replacement detection; start checking
            if (startBlock >= 0) {
                const replaceListener = async () => {
                    try {
                        // Check for a replacement; this throws only if one is found
                        await checkReplacement();
                    }
                    catch (error) {
                        // We were replaced (with enough confirms); re-throw the error
                        if (isError(error, "TRANSACTION_REPLACED")) {
                            cancel();
                            reject(error);
                            return;
                        }
                    }
                    // Rescheudle a check on the next block
                    if (!stopScanning) {
                        this.provider.once("block", replaceListener);
                    }
                };
                cancellers.push(() => { this.provider.off("block", replaceListener); });
                this.provider.once("block", replaceListener);
            }
        });
        return await waiter;
    }
    /**
     *  Returns ``true`` if this transaction has been included.
     *
     *  This is effective only as of the time the TransactionResponse
     *  was instantiated. To get up-to-date information, use
     *  [[getTransaction]].
     *
     *  This provides a Type Guard that this transaction will have
     *  non-null property values for properties that are null for
     *  unmined transactions.
     */
    isMined() {
        return (this.blockHash != null);
    }
    /**
     *  Returns true if the transaction is a legacy (i.e. ``type == 0``)
     *  transaction.
     *
     *  This provides a Type Guard that this transaction will have
     *  the ``null``-ness for hardfork-specific properties set correctly.
     */
    isLegacy() {
        return (this.type === 0);
    }
    /**
     *  Returns true if the transaction is a Berlin (i.e. ``type == 1``)
     *  transaction. See [[link-eip-2070]].
     *
     *  This provides a Type Guard that this transaction will have
     *  the ``null``-ness for hardfork-specific properties set correctly.
     */
    isBerlin() {
        return (this.type === 1);
    }
    /**
     *  Returns true if the transaction is a London (i.e. ``type == 2``)
     *  transaction. See [[link-eip-1559]].
     *
     *  This provides a Type Guard that this transaction will have
     *  the ``null``-ness for hardfork-specific properties set correctly.
     */
    isLondon() {
        return (this.type === 2);
    }
    /**
     *  Returns true if hte transaction is a Cancun (i.e. ``type == 3``)
     *  transaction. See [[link-eip-4844]].
     */
    isCancun() {
        return (this.type === 3);
    }
    /**
     *  Returns a filter which can be used to listen for orphan events
     *  that evict this transaction.
     */
    removedEvent() {
        assert(this.isMined(), "unmined transaction canot be orphaned", "UNSUPPORTED_OPERATION", { operation: "removeEvent()" });
        return createRemovedTransactionFilter(this);
    }
    /**
     *  Returns a filter which can be used to listen for orphan events
     *  that re-order this event against %%other%%.
     */
    reorderedEvent(other) {
        assert(this.isMined(), "unmined transaction canot be orphaned", "UNSUPPORTED_OPERATION", { operation: "removeEvent()" });
        assert(!other || other.isMined(), "unmined 'other' transaction canot be orphaned", "UNSUPPORTED_OPERATION", { operation: "removeEvent()" });
        return createReorderedTransactionFilter(this, other);
    }
    /**
     *  Returns a new TransactionResponse instance which has the ability to
     *  detect (and throw an error) if the transaction is replaced, which
     *  will begin scanning at %%startBlock%%.
     *
     *  This should generally not be used by developers and is intended
     *  primarily for internal use. Setting an incorrect %%startBlock%% can
     *  have devastating performance consequences if used incorrectly.
     */
    replaceableTransaction(startBlock) {
        assertArgument(Number.isInteger(startBlock) && startBlock >= 0, "invalid startBlock", "startBlock", startBlock);
        const tx = new TransactionResponse(this, this.provider);
        tx.#startBlock = startBlock;
        return tx;
    }
}
function createOrphanedBlockFilter(block) {
    return { orphan: "drop-block", hash: block.hash, number: block.number };
}
function createReorderedTransactionFilter(tx, other) {
    return { orphan: "reorder-transaction", tx, other };
}
function createRemovedTransactionFilter(tx) {
    return { orphan: "drop-transaction", tx };
}
function createRemovedLogFilter(log) {
    return { orphan: "drop-log", log: {
            transactionHash: log.transactionHash,
            blockHash: log.blockHash,
            blockNumber: log.blockNumber,
            address: log.address,
            data: log.data,
            topics: Object.freeze(log.topics.slice()),
            index: log.index
        } };
}

// import from provider.ts instead of index.ts to prevent circular dep
// from EtherscanProvider
/**
 *  An **EventLog** contains additional properties parsed from the [[Log]].
 */
class EventLog extends Log {
    /**
     *  The Contract Interface.
     */
    interface;
    /**
     *  The matching event.
     */
    fragment;
    /**
     *  The parsed arguments passed to the event by ``emit``.
     */
    args;
    /**
     * @_ignore:
     */
    constructor(log, iface, fragment) {
        super(log, log.provider);
        const args = iface.decodeEventLog(fragment, log.data, log.topics);
        defineProperties(this, { args, fragment, interface: iface });
    }
    /**
     *  The name of the event.
     */
    get eventName() { return this.fragment.name; }
    /**
     *  The signature of the event.
     */
    get eventSignature() { return this.fragment.format(); }
}
/**
 *  An **EventLog** contains additional properties parsed from the [[Log]].
 */
class UndecodedEventLog extends Log {
    /**
     *  The error encounted when trying to decode the log.
     */
    error;
    /**
     * @_ignore:
     */
    constructor(log, error) {
        super(log, log.provider);
        defineProperties(this, { error });
    }
}
/**
 *  A **ContractTransactionReceipt** includes the parsed logs from a
 *  [[TransactionReceipt]].
 */
class ContractTransactionReceipt extends TransactionReceipt {
    #iface;
    /**
     *  @_ignore:
     */
    constructor(iface, provider, tx) {
        super(tx, provider);
        this.#iface = iface;
    }
    /**
     *  The parsed logs for any [[Log]] which has a matching event in the
     *  Contract ABI.
     */
    get logs() {
        return super.logs.map((log) => {
            const fragment = log.topics.length ? this.#iface.getEvent(log.topics[0]) : null;
            if (fragment) {
                try {
                    return new EventLog(log, this.#iface, fragment);
                }
                catch (error) {
                    return new UndecodedEventLog(log, error);
                }
            }
            return log;
        });
    }
}
/**
 *  A **ContractTransactionResponse** will return a
 *  [[ContractTransactionReceipt]] when waited on.
 */
class ContractTransactionResponse extends TransactionResponse {
    #iface;
    /**
     *  @_ignore:
     */
    constructor(iface, provider, tx) {
        super(tx, provider);
        this.#iface = iface;
    }
    /**
     *  Resolves once this transaction has been mined and has
     *  %%confirms%% blocks including it (default: ``1``) with an
     *  optional %%timeout%%.
     *
     *  This can resolve to ``null`` only if %%confirms%% is ``0``
     *  and the transaction has not been mined, otherwise this will
     *  wait until enough confirmations have completed.
     */
    async wait(confirms, timeout) {
        const receipt = await super.wait(confirms, timeout);
        if (receipt == null) {
            return null;
        }
        return new ContractTransactionReceipt(this.#iface, this.provider, receipt);
    }
}
/**
 *  A **ContractUnknownEventPayload** is included as the last parameter to
 *  Contract Events when the event does not match any events in the ABI.
 */
class ContractUnknownEventPayload extends EventPayload {
    /**
     *  The log with no matching events.
     */
    log;
    /**
     *  @_event:
     */
    constructor(contract, listener, filter, log) {
        super(contract, listener, filter);
        defineProperties(this, { log });
    }
    /**
     *  Resolves to the block the event occured in.
     */
    async getBlock() {
        return await this.log.getBlock();
    }
    /**
     *  Resolves to the transaction the event occured in.
     */
    async getTransaction() {
        return await this.log.getTransaction();
    }
    /**
     *  Resolves to the transaction receipt the event occured in.
     */
    async getTransactionReceipt() {
        return await this.log.getTransactionReceipt();
    }
}
/**
 *  A **ContractEventPayload** is included as the last parameter to
 *  Contract Events when the event is known.
 */
class ContractEventPayload extends ContractUnknownEventPayload {
    /**
     *  @_ignore:
     */
    constructor(contract, listener, filter, fragment, _log) {
        super(contract, listener, filter, new EventLog(_log, contract.interface, fragment));
        const args = contract.interface.decodeEventLog(fragment, this.log.data, this.log.topics);
        defineProperties(this, { args, fragment });
    }
    /**
     *  The event name.
     */
    get eventName() {
        return this.fragment.name;
    }
    /**
     *  The event signature.
     */
    get eventSignature() {
        return this.fragment.format();
    }
}

const BN_0$1 = BigInt(0);
function canCall(value) {
    return (value && typeof (value.call) === "function");
}
function canEstimate(value) {
    return (value && typeof (value.estimateGas) === "function");
}
function canResolve(value) {
    return (value && typeof (value.resolveName) === "function");
}
function canSend(value) {
    return (value && typeof (value.sendTransaction) === "function");
}
function getResolver(value) {
    if (value != null) {
        if (canResolve(value)) {
            return value;
        }
        if (value.provider) {
            return value.provider;
        }
    }
    return undefined;
}
class PreparedTopicFilter {
    #filter;
    fragment;
    constructor(contract, fragment, args) {
        defineProperties(this, { fragment });
        if (fragment.inputs.length < args.length) {
            throw new Error("too many arguments");
        }
        // Recursively descend into args and resolve any addresses
        const runner = getRunner(contract.runner, "resolveName");
        const resolver = canResolve(runner) ? runner : null;
        this.#filter = (async function () {
            const resolvedArgs = await Promise.all(fragment.inputs.map((param, index) => {
                const arg = args[index];
                if (arg == null) {
                    return null;
                }
                return param.walkAsync(args[index], (type, value) => {
                    if (type === "address") {
                        if (Array.isArray(value)) {
                            return Promise.all(value.map((v) => resolveAddress(v, resolver)));
                        }
                        return resolveAddress(value, resolver);
                    }
                    return value;
                });
            }));
            return contract.interface.encodeFilterTopics(fragment, resolvedArgs);
        })();
    }
    getTopicFilter() {
        return this.#filter;
    }
}
// A = Arguments passed in as a tuple
// R = The result type of the call (i.e. if only one return type,
//     the qualified type, otherwise Result)
// D = The type the default call will return (i.e. R for view/pure,
//     TransactionResponse otherwise)
//export interface ContractMethod<A extends Array<any> = Array<any>, R = any, D extends R | ContractTransactionResponse = ContractTransactionResponse> {
function getRunner(value, feature) {
    if (value == null) {
        return null;
    }
    if (typeof (value[feature]) === "function") {
        return value;
    }
    if (value.provider && typeof (value.provider[feature]) === "function") {
        return value.provider;
    }
    return null;
}
function getProvider(value) {
    if (value == null) {
        return null;
    }
    return value.provider || null;
}
/**
 *  @_ignore:
 */
async function copyOverrides(arg, allowed) {
    // Make sure the overrides passed in are a valid overrides object
    const _overrides = Typed.dereference(arg, "overrides");
    assertArgument(typeof (_overrides) === "object", "invalid overrides parameter", "overrides", arg);
    // Create a shallow copy (we'll deep-ify anything needed during normalizing)
    const overrides = copyRequest(_overrides);
    assertArgument(overrides.to == null || (allowed || []).indexOf("to") >= 0, "cannot override to", "overrides.to", overrides.to);
    assertArgument(overrides.data == null || (allowed || []).indexOf("data") >= 0, "cannot override data", "overrides.data", overrides.data);
    // Resolve any from
    if (overrides.from) {
        overrides.from = overrides.from;
    }
    return overrides;
}
/**
 *  @_ignore:
 */
async function resolveArgs(_runner, inputs, args) {
    // Recursively descend into args and resolve any addresses
    const runner = getRunner(_runner, "resolveName");
    const resolver = canResolve(runner) ? runner : null;
    return await Promise.all(inputs.map((param, index) => {
        return param.walkAsync(args[index], (type, value) => {
            value = Typed.dereference(value, type);
            if (type === "address") {
                return resolveAddress(value, resolver);
            }
            return value;
        });
    }));
}
function buildWrappedFallback(contract) {
    const populateTransaction = async function (overrides) {
        // If an overrides was passed in, copy it and normalize the values
        const tx = (await copyOverrides(overrides, ["data"]));
        tx.to = await contract.getAddress();
        if (tx.from) {
            tx.from = await resolveAddress(tx.from, getResolver(contract.runner));
        }
        const iface = contract.interface;
        const noValue = (getBigInt((tx.value || BN_0$1), "overrides.value") === BN_0$1);
        const noData = ((tx.data || "0x") === "0x");
        if (iface.fallback && !iface.fallback.payable && iface.receive && !noData && !noValue) {
            assertArgument(false, "cannot send data to receive or send value to non-payable fallback", "overrides", overrides);
        }
        assertArgument(iface.fallback || noData, "cannot send data to receive-only contract", "overrides.data", tx.data);
        // Only allow payable contracts to set non-zero value
        const payable = iface.receive || (iface.fallback && iface.fallback.payable);
        assertArgument(payable || noValue, "cannot send value to non-payable fallback", "overrides.value", tx.value);
        // Only allow fallback contracts to set non-empty data
        assertArgument(iface.fallback || noData, "cannot send data to receive-only contract", "overrides.data", tx.data);
        return tx;
    };
    const staticCall = async function (overrides) {
        const runner = getRunner(contract.runner, "call");
        assert(canCall(runner), "contract runner does not support calling", "UNSUPPORTED_OPERATION", { operation: "call" });
        const tx = await populateTransaction(overrides);
        try {
            return await runner.call(tx);
        }
        catch (error) {
            if (isCallException(error) && error.data) {
                throw contract.interface.makeError(error.data, tx);
            }
            throw error;
        }
    };
    const send = async function (overrides) {
        const runner = contract.runner;
        assert(canSend(runner), "contract runner does not support sending transactions", "UNSUPPORTED_OPERATION", { operation: "sendTransaction" });
        const tx = await runner.sendTransaction(await populateTransaction(overrides));
        const provider = getProvider(contract.runner);
        // @TODO: the provider can be null; make a custom dummy provider that will throw a
        // meaningful error
        return new ContractTransactionResponse(contract.interface, provider, tx);
    };
    const estimateGas = async function (overrides) {
        const runner = getRunner(contract.runner, "estimateGas");
        assert(canEstimate(runner), "contract runner does not support gas estimation", "UNSUPPORTED_OPERATION", { operation: "estimateGas" });
        return await runner.estimateGas(await populateTransaction(overrides));
    };
    const method = async (overrides) => {
        return await send(overrides);
    };
    defineProperties(method, {
        _contract: contract,
        estimateGas,
        populateTransaction,
        send, staticCall
    });
    return method;
}
function buildWrappedMethod(contract, key) {
    const getFragment = function (...args) {
        const fragment = contract.interface.getFunction(key, args);
        assert(fragment, "no matching fragment", "UNSUPPORTED_OPERATION", {
            operation: "fragment",
            info: { key, args }
        });
        return fragment;
    };
    const populateTransaction = async function (...args) {
        const fragment = getFragment(...args);
        // If an overrides was passed in, copy it and normalize the values
        let overrides = {};
        if (fragment.inputs.length + 1 === args.length) {
            overrides = await copyOverrides(args.pop());
            if (overrides.from) {
                overrides.from = await resolveAddress(overrides.from, getResolver(contract.runner));
            }
        }
        if (fragment.inputs.length !== args.length) {
            throw new Error("internal error: fragment inputs doesn't match arguments; should not happen");
        }
        const resolvedArgs = await resolveArgs(contract.runner, fragment.inputs, args);
        return Object.assign({}, overrides, await resolveProperties({
            to: contract.getAddress(),
            data: contract.interface.encodeFunctionData(fragment, resolvedArgs)
        }));
    };
    const staticCall = async function (...args) {
        const result = await staticCallResult(...args);
        if (result.length === 1) {
            return result[0];
        }
        return result;
    };
    const send = async function (...args) {
        const runner = contract.runner;
        assert(canSend(runner), "contract runner does not support sending transactions", "UNSUPPORTED_OPERATION", { operation: "sendTransaction" });
        const tx = await runner.sendTransaction(await populateTransaction(...args));
        const provider = getProvider(contract.runner);
        // @TODO: the provider can be null; make a custom dummy provider that will throw a
        // meaningful error
        return new ContractTransactionResponse(contract.interface, provider, tx);
    };
    const estimateGas = async function (...args) {
        const runner = getRunner(contract.runner, "estimateGas");
        assert(canEstimate(runner), "contract runner does not support gas estimation", "UNSUPPORTED_OPERATION", { operation: "estimateGas" });
        return await runner.estimateGas(await populateTransaction(...args));
    };
    const staticCallResult = async function (...args) {
        const runner = getRunner(contract.runner, "call");
        assert(canCall(runner), "contract runner does not support calling", "UNSUPPORTED_OPERATION", { operation: "call" });
        const tx = await populateTransaction(...args);
        let result = "0x";
        try {
            result = await runner.call(tx);
        }
        catch (error) {
            if (isCallException(error) && error.data) {
                throw contract.interface.makeError(error.data, tx);
            }
            throw error;
        }
        const fragment = getFragment(...args);
        return contract.interface.decodeFunctionResult(fragment, result);
    };
    const method = async (...args) => {
        const fragment = getFragment(...args);
        if (fragment.constant) {
            return await staticCall(...args);
        }
        return await send(...args);
    };
    defineProperties(method, {
        name: contract.interface.getFunctionName(key),
        _contract: contract, _key: key,
        getFragment,
        estimateGas,
        populateTransaction,
        send, staticCall, staticCallResult,
    });
    // Only works on non-ambiguous keys (refined fragment is always non-ambiguous)
    Object.defineProperty(method, "fragment", {
        configurable: false,
        enumerable: true,
        get: () => {
            const fragment = contract.interface.getFunction(key);
            assert(fragment, "no matching fragment", "UNSUPPORTED_OPERATION", {
                operation: "fragment",
                info: { key }
            });
            return fragment;
        }
    });
    return method;
}
function buildWrappedEvent(contract, key) {
    const getFragment = function (...args) {
        const fragment = contract.interface.getEvent(key, args);
        assert(fragment, "no matching fragment", "UNSUPPORTED_OPERATION", {
            operation: "fragment",
            info: { key, args }
        });
        return fragment;
    };
    const method = function (...args) {
        return new PreparedTopicFilter(contract, getFragment(...args), args);
    };
    defineProperties(method, {
        name: contract.interface.getEventName(key),
        _contract: contract, _key: key,
        getFragment
    });
    // Only works on non-ambiguous keys (refined fragment is always non-ambiguous)
    Object.defineProperty(method, "fragment", {
        configurable: false,
        enumerable: true,
        get: () => {
            const fragment = contract.interface.getEvent(key);
            assert(fragment, "no matching fragment", "UNSUPPORTED_OPERATION", {
                operation: "fragment",
                info: { key }
            });
            return fragment;
        }
    });
    return method;
}
// The combination of TypeScrype, Private Fields and Proxies makes
// the world go boom; so we hide variables with some trickery keeping
// a symbol attached to each BaseContract which its sub-class (even
// via a Proxy) can reach and use to look up its internal values.
const internal = Symbol.for("_ethersInternal_contract");
const internalValues = new WeakMap();
function setInternal(contract, values) {
    internalValues.set(contract[internal], values);
}
function getInternal(contract) {
    return internalValues.get(contract[internal]);
}
function isDeferred(value) {
    return (value && typeof (value) === "object" && ("getTopicFilter" in value) &&
        (typeof (value.getTopicFilter) === "function") && value.fragment);
}
async function getSubInfo(contract, event) {
    let topics;
    let fragment = null;
    // Convert named events to topicHash and get the fragment for
    // events which need deconstructing.
    if (Array.isArray(event)) {
        const topicHashify = function (name) {
            if (isHexString(name, 32)) {
                return name;
            }
            const fragment = contract.interface.getEvent(name);
            assertArgument(fragment, "unknown fragment", "name", name);
            return fragment.topicHash;
        };
        // Array of Topics and Names; e.g. `[ "0x1234...89ab", "Transfer(address)" ]`
        topics = event.map((e) => {
            if (e == null) {
                return null;
            }
            if (Array.isArray(e)) {
                return e.map(topicHashify);
            }
            return topicHashify(e);
        });
    }
    else if (event === "*") {
        topics = [null];
    }
    else if (typeof (event) === "string") {
        if (isHexString(event, 32)) {
            // Topic Hash
            topics = [event];
        }
        else {
            // Name or Signature; e.g. `"Transfer", `"Transfer(address)"`
            fragment = contract.interface.getEvent(event);
            assertArgument(fragment, "unknown fragment", "event", event);
            topics = [fragment.topicHash];
        }
    }
    else if (isDeferred(event)) {
        // Deferred Topic Filter; e.g. `contract.filter.Transfer(from)`
        topics = await event.getTopicFilter();
    }
    else if ("fragment" in event) {
        // ContractEvent; e.g. `contract.filter.Transfer`
        fragment = event.fragment;
        topics = [fragment.topicHash];
    }
    else {
        assertArgument(false, "unknown event name", "event", event);
    }
    // Normalize topics and sort TopicSets
    topics = topics.map((t) => {
        if (t == null) {
            return null;
        }
        if (Array.isArray(t)) {
            const items = Array.from(new Set(t.map((t) => t.toLowerCase())).values());
            if (items.length === 1) {
                return items[0];
            }
            items.sort();
            return items;
        }
        return t.toLowerCase();
    });
    const tag = topics.map((t) => {
        if (t == null) {
            return "null";
        }
        if (Array.isArray(t)) {
            return t.join("|");
        }
        return t;
    }).join("&");
    return { fragment, tag, topics };
}
async function hasSub(contract, event) {
    const { subs } = getInternal(contract);
    return subs.get((await getSubInfo(contract, event)).tag) || null;
}
async function getSub(contract, operation, event) {
    // Make sure our runner can actually subscribe to events
    const provider = getProvider(contract.runner);
    assert(provider, "contract runner does not support subscribing", "UNSUPPORTED_OPERATION", { operation });
    const { fragment, tag, topics } = await getSubInfo(contract, event);
    const { addr, subs } = getInternal(contract);
    let sub = subs.get(tag);
    if (!sub) {
        const address = (addr ? addr : contract);
        const filter = { address, topics };
        const listener = (log) => {
            let foundFragment = fragment;
            if (foundFragment == null) {
                try {
                    foundFragment = contract.interface.getEvent(log.topics[0]);
                }
                catch (error) { }
            }
            // If fragment is null, we do not deconstruct the args to emit
            if (foundFragment) {
                const _foundFragment = foundFragment;
                const args = fragment ? contract.interface.decodeEventLog(fragment, log.data, log.topics) : [];
                emit(contract, event, args, (listener) => {
                    return new ContractEventPayload(contract, listener, event, _foundFragment, log);
                });
            }
            else {
                emit(contract, event, [], (listener) => {
                    return new ContractUnknownEventPayload(contract, listener, event, log);
                });
            }
        };
        let starting = [];
        const start = () => {
            if (starting.length) {
                return;
            }
            starting.push(provider.on(filter, listener));
        };
        const stop = async () => {
            if (starting.length == 0) {
                return;
            }
            let started = starting;
            starting = [];
            await Promise.all(started);
            provider.off(filter, listener);
        };
        sub = { tag, listeners: [], start, stop };
        subs.set(tag, sub);
    }
    return sub;
}
// We use this to ensure one emit resolves before firing the next to
// ensure correct ordering (note this cannot throw and just adds the
// notice to the event queu using setTimeout).
let lastEmit = Promise.resolve();
async function _emit(contract, event, args, payloadFunc) {
    await lastEmit;
    const sub = await hasSub(contract, event);
    if (!sub) {
        return false;
    }
    const count = sub.listeners.length;
    sub.listeners = sub.listeners.filter(({ listener, once }) => {
        const passArgs = Array.from(args);
        if (payloadFunc) {
            passArgs.push(payloadFunc(once ? null : listener));
        }
        try {
            listener.call(contract, ...passArgs);
        }
        catch (error) { }
        return !once;
    });
    if (sub.listeners.length === 0) {
        sub.stop();
        getInternal(contract).subs.delete(sub.tag);
    }
    return (count > 0);
}
async function emit(contract, event, args, payloadFunc) {
    try {
        await lastEmit;
    }
    catch (error) { }
    const resultPromise = _emit(contract, event, args, payloadFunc);
    lastEmit = resultPromise;
    return await resultPromise;
}
const passProperties = ["then"];
class BaseContract {
    /**
     *  The target to connect to.
     *
     *  This can be an address, ENS name or any [[Addressable]], such as
     *  another contract. To get the resovled address, use the ``getAddress``
     *  method.
     */
    target;
    /**
     *  The contract Interface.
     */
    interface;
    /**
     *  The connected runner. This is generally a [[Provider]] or a
     *  [[Signer]], which dictates what operations are supported.
     *
     *  For example, a **Contract** connected to a [[Provider]] may
     *  only execute read-only operations.
     */
    runner;
    /**
     *  All the Events available on this contract.
     */
    filters;
    /**
     *  @_ignore:
     */
    [internal];
    /**
     *  The fallback or receive function if any.
     */
    fallback;
    /**
     *  Creates a new contract connected to %%target%% with the %%abi%% and
     *  optionally connected to a %%runner%% to perform operations on behalf
     *  of.
     */
    constructor(target, abi, runner, _deployTx) {
        assertArgument(typeof (target) === "string" || isAddressable(target), "invalid value for Contract target", "target", target);
        if (runner == null) {
            runner = null;
        }
        const iface = Interface.from(abi);
        defineProperties(this, { target, runner, interface: iface });
        Object.defineProperty(this, internal, { value: {} });
        let addrPromise;
        let addr = null;
        let deployTx = null;
        if (_deployTx) {
            const provider = getProvider(runner);
            // @TODO: the provider can be null; make a custom dummy provider that will throw a
            // meaningful error
            deployTx = new ContractTransactionResponse(this.interface, provider, _deployTx);
        }
        let subs = new Map();
        // Resolve the target as the address
        if (typeof (target) === "string") {
            if (isHexString(target)) {
                addr = target;
                addrPromise = Promise.resolve(target);
            }
            else {
                const resolver = getRunner(runner, "resolveName");
                if (!canResolve(resolver)) {
                    throw makeError("contract runner does not support name resolution", "UNSUPPORTED_OPERATION", {
                        operation: "resolveName"
                    });
                }
                addrPromise = resolver.resolveName(target).then((addr) => {
                    if (addr == null) {
                        throw makeError("an ENS name used for a contract target must be correctly configured", "UNCONFIGURED_NAME", {
                            value: target
                        });
                    }
                    getInternal(this).addr = addr;
                    return addr;
                });
            }
        }
        else {
            addrPromise = target.getAddress().then((addr) => {
                if (addr == null) {
                    throw new Error("TODO");
                }
                getInternal(this).addr = addr;
                return addr;
            });
        }
        // Set our private values
        setInternal(this, { addrPromise, addr, deployTx, subs });
        // Add the event filters
        const filters = new Proxy({}, {
            get: (target, prop, receiver) => {
                // Pass important checks (like `then` for Promise) through
                if (typeof (prop) === "symbol" || passProperties.indexOf(prop) >= 0) {
                    return Reflect.get(target, prop, receiver);
                }
                try {
                    return this.getEvent(prop);
                }
                catch (error) {
                    if (!isError(error, "INVALID_ARGUMENT") || error.argument !== "key") {
                        throw error;
                    }
                }
                return undefined;
            },
            has: (target, prop) => {
                // Pass important checks (like `then` for Promise) through
                if (passProperties.indexOf(prop) >= 0) {
                    return Reflect.has(target, prop);
                }
                return Reflect.has(target, prop) || this.interface.hasEvent(String(prop));
            }
        });
        defineProperties(this, { filters });
        defineProperties(this, {
            fallback: ((iface.receive || iface.fallback) ? (buildWrappedFallback(this)) : null)
        });
        // Return a Proxy that will respond to functions
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof (prop) === "symbol" || prop in target || passProperties.indexOf(prop) >= 0) {
                    return Reflect.get(target, prop, receiver);
                }
                // Undefined properties should return undefined
                try {
                    return target.getFunction(prop);
                }
                catch (error) {
                    if (!isError(error, "INVALID_ARGUMENT") || error.argument !== "key") {
                        throw error;
                    }
                }
                return undefined;
            },
            has: (target, prop) => {
                if (typeof (prop) === "symbol" || prop in target || passProperties.indexOf(prop) >= 0) {
                    return Reflect.has(target, prop);
                }
                return target.interface.hasFunction(prop);
            }
        });
    }
    /**
     *  Return a new Contract instance with the same target and ABI, but
     *  a different %%runner%%.
     */
    connect(runner) {
        return new BaseContract(this.target, this.interface, runner);
    }
    /**
     *  Return a new Contract instance with the same ABI and runner, but
     *  a different %%target%%.
     */
    attach(target) {
        return new BaseContract(target, this.interface, this.runner);
    }
    /**
     *  Return the resolved address of this Contract.
     */
    async getAddress() { return await getInternal(this).addrPromise; }
    /**
     *  Return the deployed bytecode or null if no bytecode is found.
     */
    async getDeployedCode() {
        const provider = getProvider(this.runner);
        assert(provider, "runner does not support .provider", "UNSUPPORTED_OPERATION", { operation: "getDeployedCode" });
        const code = await provider.getCode(await this.getAddress());
        if (code === "0x") {
            return null;
        }
        return code;
    }
    /**
     *  Resolve to this Contract once the bytecode has been deployed, or
     *  resolve immediately if already deployed.
     */
    async waitForDeployment() {
        // We have the deployement transaction; just use that (throws if deployement fails)
        const deployTx = this.deploymentTransaction();
        if (deployTx) {
            await deployTx.wait();
            return this;
        }
        // Check for code
        const code = await this.getDeployedCode();
        if (code != null) {
            return this;
        }
        // Make sure we can subscribe to a provider event
        const provider = getProvider(this.runner);
        assert(provider != null, "contract runner does not support .provider", "UNSUPPORTED_OPERATION", { operation: "waitForDeployment" });
        return new Promise((resolve, reject) => {
            const checkCode = async () => {
                try {
                    const code = await this.getDeployedCode();
                    if (code != null) {
                        return resolve(this);
                    }
                    provider.once("block", checkCode);
                }
                catch (error) {
                    reject(error);
                }
            };
            checkCode();
        });
    }
    /**
     *  Return the transaction used to deploy this contract.
     *
     *  This is only available if this instance was returned from a
     *  [[ContractFactory]].
     */
    deploymentTransaction() {
        return getInternal(this).deployTx;
    }
    /**
     *  Return the function for a given name. This is useful when a contract
     *  method name conflicts with a JavaScript name such as ``prototype`` or
     *  when using a Contract programatically.
     */
    getFunction(key) {
        if (typeof (key) !== "string") {
            key = key.format();
        }
        const func = buildWrappedMethod(this, key);
        return func;
    }
    /**
     *  Return the event for a given name. This is useful when a contract
     *  event name conflicts with a JavaScript name such as ``prototype`` or
     *  when using a Contract programatically.
     */
    getEvent(key) {
        if (typeof (key) !== "string") {
            key = key.format();
        }
        return buildWrappedEvent(this, key);
    }
    /**
     *  @_ignore:
     */
    async queryTransaction(hash) {
        throw new Error("@TODO");
    }
    /*
    // @TODO: this is a non-backwards compatible change, but will be added
    //        in v7 and in a potential SmartContract class in an upcoming
    //        v6 release
    async getTransactionReceipt(hash: string): Promise<null | ContractTransactionReceipt> {
        const provider = getProvider(this.runner);
        assert(provider, "contract runner does not have a provider",
            "UNSUPPORTED_OPERATION", { operation: "queryTransaction" });

        const receipt = await provider.getTransactionReceipt(hash);
        if (receipt == null) { return null; }

        return new ContractTransactionReceipt(this.interface, provider, receipt);
    }
    */
    /**
     *  Provide historic access to event data for %%event%% in the range
     *  %%fromBlock%% (default: ``0``) to %%toBlock%% (default: ``"latest"``)
     *  inclusive.
     */
    async queryFilter(event, fromBlock, toBlock) {
        if (fromBlock == null) {
            fromBlock = 0;
        }
        if (toBlock == null) {
            toBlock = "latest";
        }
        const { addr, addrPromise } = getInternal(this);
        const address = (addr ? addr : (await addrPromise));
        const { fragment, topics } = await getSubInfo(this, event);
        const filter = { address, topics, fromBlock, toBlock };
        const provider = getProvider(this.runner);
        assert(provider, "contract runner does not have a provider", "UNSUPPORTED_OPERATION", { operation: "queryFilter" });
        return (await provider.getLogs(filter)).map((log) => {
            let foundFragment = fragment;
            if (foundFragment == null) {
                try {
                    foundFragment = this.interface.getEvent(log.topics[0]);
                }
                catch (error) { }
            }
            if (foundFragment) {
                try {
                    return new EventLog(log, this.interface, foundFragment);
                }
                catch (error) {
                    return new UndecodedEventLog(log, error);
                }
            }
            return new Log(log, provider);
        });
    }
    /**
     *  Add an event %%listener%% for the %%event%%.
     */
    async on(event, listener) {
        const sub = await getSub(this, "on", event);
        sub.listeners.push({ listener, once: false });
        sub.start();
        return this;
    }
    /**
     *  Add an event %%listener%% for the %%event%%, but remove the listener
     *  after it is fired once.
     */
    async once(event, listener) {
        const sub = await getSub(this, "once", event);
        sub.listeners.push({ listener, once: true });
        sub.start();
        return this;
    }
    /**
     *  Emit an %%event%% calling all listeners with %%args%%.
     *
     *  Resolves to ``true`` if any listeners were called.
     */
    async emit(event, ...args) {
        return await emit(this, event, args, null);
    }
    /**
     *  Resolves to the number of listeners of %%event%% or the total number
     *  of listeners if unspecified.
     */
    async listenerCount(event) {
        if (event) {
            const sub = await hasSub(this, event);
            if (!sub) {
                return 0;
            }
            return sub.listeners.length;
        }
        const { subs } = getInternal(this);
        let total = 0;
        for (const { listeners } of subs.values()) {
            total += listeners.length;
        }
        return total;
    }
    /**
     *  Resolves to the listeners subscribed to %%event%% or all listeners
     *  if unspecified.
     */
    async listeners(event) {
        if (event) {
            const sub = await hasSub(this, event);
            if (!sub) {
                return [];
            }
            return sub.listeners.map(({ listener }) => listener);
        }
        const { subs } = getInternal(this);
        let result = [];
        for (const { listeners } of subs.values()) {
            result = result.concat(listeners.map(({ listener }) => listener));
        }
        return result;
    }
    /**
     *  Remove the %%listener%% from the listeners for %%event%% or remove
     *  all listeners if unspecified.
     */
    async off(event, listener) {
        const sub = await hasSub(this, event);
        if (!sub) {
            return this;
        }
        if (listener) {
            const index = sub.listeners.map(({ listener }) => listener).indexOf(listener);
            if (index >= 0) {
                sub.listeners.splice(index, 1);
            }
        }
        if (listener == null || sub.listeners.length === 0) {
            sub.stop();
            getInternal(this).subs.delete(sub.tag);
        }
        return this;
    }
    /**
     *  Remove all the listeners for %%event%% or remove all listeners if
     *  unspecified.
     */
    async removeAllListeners(event) {
        if (event) {
            const sub = await hasSub(this, event);
            if (!sub) {
                return this;
            }
            sub.stop();
            getInternal(this).subs.delete(sub.tag);
        }
        else {
            const { subs } = getInternal(this);
            for (const { tag, stop } of subs.values()) {
                stop();
                subs.delete(tag);
            }
        }
        return this;
    }
    /**
     *  Alias for [on].
     */
    async addListener(event, listener) {
        return await this.on(event, listener);
    }
    /**
     *  Alias for [off].
     */
    async removeListener(event, listener) {
        return await this.off(event, listener);
    }
    /**
     *  Create a new Class for the %%abi%%.
     */
    static buildClass(abi) {
        class CustomContract extends BaseContract {
            constructor(address, runner = null) {
                super(address, abi, runner);
            }
        }
        return CustomContract;
    }
    ;
    /**
     *  Create a new BaseContract with a specified Interface.
     */
    static from(target, abi, runner) {
        if (runner == null) {
            runner = null;
        }
        const contract = new this(target, abi, runner);
        return contract;
    }
}
function _ContractBase() {
    return BaseContract;
}
/**
 *  A [[BaseContract]] with no type guards on its methods or events.
 */
class Contract extends _ContractBase() {
}

// A = Arguments to the constructor
// I = Interface of deployed contracts
/**
 *  A **ContractFactory** is used to deploy a Contract to the blockchain.
 */
class ContractFactory {
    /**
     *  The Contract Interface.
     */
    interface;
    /**
     *  The Contract deployment bytecode. Often called the initcode.
     */
    bytecode;
    /**
     *  The ContractRunner to deploy the Contract as.
     */
    runner;
    /**
     *  Create a new **ContractFactory** with %%abi%% and %%bytecode%%,
     *  optionally connected to %%runner%%.
     *
     *  The %%bytecode%% may be the ``bytecode`` property within the
     *  standard Solidity JSON output.
     */
    constructor(abi, bytecode, runner) {
        const iface = Interface.from(abi);
        // Dereference Solidity bytecode objects and allow a missing `0x`-prefix
        if (bytecode instanceof Uint8Array) {
            bytecode = hexlify(getBytes(bytecode));
        }
        else {
            if (typeof (bytecode) === "object") {
                bytecode = bytecode.object;
            }
            if (!bytecode.startsWith("0x")) {
                bytecode = "0x" + bytecode;
            }
            bytecode = hexlify(getBytes(bytecode));
        }
        defineProperties(this, {
            bytecode, interface: iface, runner: (runner || null)
        });
    }
    attach(target) {
        return new BaseContract(target, this.interface, this.runner);
    }
    /**
     *  Resolves to the transaction to deploy the contract, passing %%args%%
     *  into the constructor.
     */
    async getDeployTransaction(...args) {
        let overrides = {};
        const fragment = this.interface.deploy;
        if (fragment.inputs.length + 1 === args.length) {
            overrides = await copyOverrides(args.pop());
        }
        if (fragment.inputs.length !== args.length) {
            throw new Error("incorrect number of arguments to constructor");
        }
        const resolvedArgs = await resolveArgs(this.runner, fragment.inputs, args);
        const data = concat([this.bytecode, this.interface.encodeDeploy(resolvedArgs)]);
        return Object.assign({}, overrides, { data });
    }
    /**
     *  Resolves to the Contract deployed by passing %%args%% into the
     *  constructor.
     *
     *  This will resolve to the Contract before it has been deployed to the
     *  network, so the [[BaseContract-waitForDeployment]] should be used before
     *  sending any transactions to it.
     */
    async deploy(...args) {
        const tx = await this.getDeployTransaction(...args);
        assert(this.runner && typeof (this.runner.sendTransaction) === "function", "factory runner does not support sending transactions", "UNSUPPORTED_OPERATION", {
            operation: "sendTransaction"
        });
        const sentTx = await this.runner.sendTransaction(tx);
        const address = getCreateAddress(sentTx);
        return new BaseContract(address, this.interface, this.runner, sentTx);
    }
    /**
     *  Return a new **ContractFactory** with the same ABI and bytecode,
     *  but connected to %%runner%%.
     */
    connect(runner) {
        return new ContractFactory(this.interface, this.bytecode, runner);
    }
    /**
     *  Create a new **ContractFactory** from the standard Solidity JSON output.
     */
    static fromSolidity(output, runner) {
        assertArgument(output != null, "bad compiler output", "output", output);
        if (typeof (output) === "string") {
            output = JSON.parse(output);
        }
        const abi = output.abi;
        let bytecode = "";
        if (output.bytecode) {
            bytecode = output.bytecode;
        }
        else if (output.evm && output.evm.bytecode) {
            bytecode = output.evm.bytecode;
        }
        return new this(abi, bytecode, runner);
    }
}

/**
 *  ENS is a service which allows easy-to-remember names to map to
 *  network addresses.
 *
 *  @_section: api/providers/ens-resolver:ENS Resolver  [about-ens-rsolver]
 */
// @TODO: This should use the fetch-data:ipfs gateway
// Trim off the ipfs:// prefix and return the default gateway URL
function getIpfsLink(link) {
    if (link.match(/^ipfs:\/\/ipfs\//i)) {
        link = link.substring(12);
    }
    else if (link.match(/^ipfs:\/\//i)) {
        link = link.substring(7);
    }
    else {
        assertArgument(false, "unsupported IPFS format", "link", link);
    }
    return `https:/\/gateway.ipfs.io/ipfs/${link}`;
}
/**
 *  A provider plugin super-class for processing multicoin address types.
 */
class MulticoinProviderPlugin {
    /**
     *  The name.
     */
    name;
    /**
     *  Creates a new **MulticoinProviderPluing** for %%name%%.
     */
    constructor(name) {
        defineProperties(this, { name });
    }
    connect(proivder) {
        return this;
    }
    /**
     *  Returns ``true`` if %%coinType%% is supported by this plugin.
     */
    supportsCoinType(coinType) {
        return false;
    }
    /**
     *  Resolves to the encoded %%address%% for %%coinType%%.
     */
    async encodeAddress(coinType, address) {
        throw new Error("unsupported coin");
    }
    /**
     *  Resolves to the decoded %%data%% for %%coinType%%.
     */
    async decodeAddress(coinType, data) {
        throw new Error("unsupported coin");
    }
}
const matcherIpfs = new RegExp("^(ipfs):/\/(.*)$", "i");
const matchers = [
    new RegExp("^(https):/\/(.*)$", "i"),
    new RegExp("^(data):(.*)$", "i"),
    matcherIpfs,
    new RegExp("^eip155:[0-9]+/(erc[0-9]+):(.*)$", "i"),
];
/**
 *  A connected object to a resolved ENS name resolver, which can be
 *  used to query additional details.
 */
class EnsResolver {
    /**
     *  The connected provider.
     */
    provider;
    /**
     *  The address of the resolver.
     */
    address;
    /**
     *  The name this resolver was resolved against.
     */
    name;
    // For EIP-2544 names, the ancestor that provided the resolver
    #supports2544;
    #resolver;
    constructor(provider, address, name) {
        defineProperties(this, { provider, address, name });
        this.#supports2544 = null;
        this.#resolver = new Contract(address, [
            "function supportsInterface(bytes4) view returns (bool)",
            "function resolve(bytes, bytes) view returns (bytes)",
            "function addr(bytes32) view returns (address)",
            "function addr(bytes32, uint) view returns (bytes)",
            "function text(bytes32, string) view returns (string)",
            "function contenthash(bytes32) view returns (bytes)",
        ], provider);
    }
    /**
     *  Resolves to true if the resolver supports wildcard resolution.
     */
    async supportsWildcard() {
        if (this.#supports2544 == null) {
            this.#supports2544 = (async () => {
                try {
                    return await this.#resolver.supportsInterface("0x9061b923");
                }
                catch (error) {
                    // Wildcard resolvers must understand supportsInterface
                    // and return true.
                    if (isError(error, "CALL_EXCEPTION")) {
                        return false;
                    }
                    // Let future attempts try again...
                    this.#supports2544 = null;
                    throw error;
                }
            })();
        }
        return await this.#supports2544;
    }
    async #fetch(funcName, params) {
        params = (params || []).slice();
        const iface = this.#resolver.interface;
        // The first parameters is always the nodehash
        params.unshift(namehash(this.name));
        let fragment = null;
        if (await this.supportsWildcard()) {
            fragment = iface.getFunction(funcName);
            assert(fragment, "missing fragment", "UNKNOWN_ERROR", {
                info: { funcName }
            });
            params = [
                dnsEncode(this.name, 255),
                iface.encodeFunctionData(fragment, params)
            ];
            funcName = "resolve(bytes,bytes)";
        }
        params.push({
            enableCcipRead: true
        });
        try {
            const result = await this.#resolver[funcName](...params);
            if (fragment) {
                return iface.decodeFunctionResult(fragment, result)[0];
            }
            return result;
        }
        catch (error) {
            if (!isError(error, "CALL_EXCEPTION")) {
                throw error;
            }
        }
        return null;
    }
    /**
     *  Resolves to the address for %%coinType%% or null if the
     *  provided %%coinType%% has not been configured.
     */
    async getAddress(coinType) {
        if (coinType == null) {
            coinType = 60;
        }
        if (coinType === 60) {
            try {
                const result = await this.#fetch("addr(bytes32)");
                // No address
                if (result == null || result === ZeroAddress) {
                    return null;
                }
                return result;
            }
            catch (error) {
                if (isError(error, "CALL_EXCEPTION")) {
                    return null;
                }
                throw error;
            }
        }
        // Try decoding its EVM canonical chain as an EVM chain address first
        if (coinType >= 0 && coinType < 0x80000000) {
            let ethCoinType = coinType + 0x80000000;
            const data = await this.#fetch("addr(bytes32,uint)", [ethCoinType]);
            if (isHexString(data, 20)) {
                return getAddress(data);
            }
        }
        let coinPlugin = null;
        for (const plugin of this.provider.plugins) {
            if (!(plugin instanceof MulticoinProviderPlugin)) {
                continue;
            }
            if (plugin.supportsCoinType(coinType)) {
                coinPlugin = plugin;
                break;
            }
        }
        if (coinPlugin == null) {
            return null;
        }
        // keccak256("addr(bytes32,uint256")
        const data = await this.#fetch("addr(bytes32,uint)", [coinType]);
        // No address
        if (data == null || data === "0x") {
            return null;
        }
        // Compute the address
        const address = await coinPlugin.decodeAddress(coinType, data);
        if (address != null) {
            return address;
        }
        assert(false, `invalid coin data`, "UNSUPPORTED_OPERATION", {
            operation: `getAddress(${coinType})`,
            info: { coinType, data }
        });
    }
    /**
     *  Resolves to the EIP-634 text record for %%key%%, or ``null``
     *  if unconfigured.
     */
    async getText(key) {
        const data = await this.#fetch("text(bytes32,string)", [key]);
        if (data == null || data === "0x") {
            return null;
        }
        return data;
    }
    /**
     *  Rsolves to the content-hash or ``null`` if unconfigured.
     */
    async getContentHash() {
        // keccak256("contenthash()")
        const data = await this.#fetch("contenthash(bytes32)");
        // No contenthash
        if (data == null || data === "0x") {
            return null;
        }
        // IPFS (CID: 1, Type: 70=DAG-PB, 72=libp2p-key)
        const ipfs = data.match(/^0x(e3010170|e5010172)(([0-9a-f][0-9a-f])([0-9a-f][0-9a-f])([0-9a-f]*))$/);
        if (ipfs) {
            const scheme = (ipfs[1] === "e3010170") ? "ipfs" : "ipns";
            const length = parseInt(ipfs[4], 16);
            if (ipfs[5].length === length * 2) {
                return `${scheme}:/\/${encodeBase58("0x" + ipfs[2])}`;
            }
        }
        // Swarm (CID: 1, Type: swarm-manifest; hash/length hard-coded to keccak256/32)
        const swarm = data.match(/^0xe40101fa011b20([0-9a-f]*)$/);
        if (swarm && swarm[1].length === 64) {
            return `bzz:/\/${swarm[1]}`;
        }
        assert(false, `invalid or unsupported content hash data`, "UNSUPPORTED_OPERATION", {
            operation: "getContentHash()",
            info: { data }
        });
    }
    /**
     *  Resolves to the avatar url or ``null`` if the avatar is either
     *  unconfigured or incorrectly configured (e.g. references an NFT
     *  not owned by the address).
     *
     *  If diagnosing issues with configurations, the [[_getAvatar]]
     *  method may be useful.
     */
    async getAvatar() {
        const avatar = await this._getAvatar();
        return avatar.url;
    }
    /**
     *  When resolving an avatar, there are many steps involved, such
     *  fetching metadata and possibly validating ownership of an
     *  NFT.
     *
     *  This method can be used to examine each step and the value it
     *  was working from.
     */
    async _getAvatar() {
        const linkage = [{ type: "name", value: this.name }];
        try {
            // test data for ricmoo.eth
            //const avatar = "eip155:1/erc721:0x265385c7f4132228A0d54EB1A9e7460b91c0cC68/29233";
            const avatar = await this.getText("avatar");
            if (avatar == null) {
                linkage.push({ type: "!avatar", value: "" });
                return { url: null, linkage };
            }
            linkage.push({ type: "avatar", value: avatar });
            for (let i = 0; i < matchers.length; i++) {
                const match = avatar.match(matchers[i]);
                if (match == null) {
                    continue;
                }
                const scheme = match[1].toLowerCase();
                switch (scheme) {
                    case "https":
                    case "data":
                        linkage.push({ type: "url", value: avatar });
                        return { linkage, url: avatar };
                    case "ipfs": {
                        const url = getIpfsLink(avatar);
                        linkage.push({ type: "ipfs", value: avatar });
                        linkage.push({ type: "url", value: url });
                        return { linkage, url };
                    }
                    case "erc721":
                    case "erc1155": {
                        // Depending on the ERC type, use tokenURI(uint256) or url(uint256)
                        const selector = (scheme === "erc721") ? "tokenURI(uint256)" : "uri(uint256)";
                        linkage.push({ type: scheme, value: avatar });
                        // The owner of this name
                        const owner = await this.getAddress();
                        if (owner == null) {
                            linkage.push({ type: "!owner", value: "" });
                            return { url: null, linkage };
                        }
                        const comps = (match[2] || "").split("/");
                        if (comps.length !== 2) {
                            linkage.push({ type: `!${scheme}caip`, value: (match[2] || "") });
                            return { url: null, linkage };
                        }
                        const tokenId = comps[1];
                        const contract = new Contract(comps[0], [
                            // ERC-721
                            "function tokenURI(uint) view returns (string)",
                            "function ownerOf(uint) view returns (address)",
                            // ERC-1155
                            "function uri(uint) view returns (string)",
                            "function balanceOf(address, uint256) view returns (uint)"
                        ], this.provider);
                        // Check that this account owns the token
                        if (scheme === "erc721") {
                            const tokenOwner = await contract.ownerOf(tokenId);
                            if (owner !== tokenOwner) {
                                linkage.push({ type: "!owner", value: tokenOwner });
                                return { url: null, linkage };
                            }
                            linkage.push({ type: "owner", value: tokenOwner });
                        }
                        else if (scheme === "erc1155") {
                            const balance = await contract.balanceOf(owner, tokenId);
                            if (!balance) {
                                linkage.push({ type: "!balance", value: "0" });
                                return { url: null, linkage };
                            }
                            linkage.push({ type: "balance", value: balance.toString() });
                        }
                        // Call the token contract for the metadata URL
                        let metadataUrl = await contract[selector](tokenId);
                        if (metadataUrl == null || metadataUrl === "0x") {
                            linkage.push({ type: "!metadata-url", value: "" });
                            return { url: null, linkage };
                        }
                        linkage.push({ type: "metadata-url-base", value: metadataUrl });
                        // ERC-1155 allows a generic {id} in the URL
                        if (scheme === "erc1155") {
                            metadataUrl = metadataUrl.replace("{id}", toBeHex(tokenId, 32).substring(2));
                            linkage.push({ type: "metadata-url-expanded", value: metadataUrl });
                        }
                        // Transform IPFS metadata links
                        if (metadataUrl.match(/^ipfs:/i)) {
                            metadataUrl = getIpfsLink(metadataUrl);
                        }
                        linkage.push({ type: "metadata-url", value: metadataUrl });
                        // Get the token metadata
                        let metadata = {};
                        const response = await (new FetchRequest(metadataUrl)).send();
                        response.assertOk();
                        try {
                            metadata = response.bodyJson;
                        }
                        catch (error) {
                            try {
                                linkage.push({ type: "!metadata", value: response.bodyText });
                            }
                            catch (error) {
                                const bytes = response.body;
                                if (bytes) {
                                    linkage.push({ type: "!metadata", value: hexlify(bytes) });
                                }
                                return { url: null, linkage };
                            }
                            return { url: null, linkage };
                        }
                        if (!metadata) {
                            linkage.push({ type: "!metadata", value: "" });
                            return { url: null, linkage };
                        }
                        linkage.push({ type: "metadata", value: JSON.stringify(metadata) });
                        // Pull the image URL out
                        let imageUrl = metadata.image;
                        if (typeof (imageUrl) !== "string") {
                            linkage.push({ type: "!imageUrl", value: "" });
                            return { url: null, linkage };
                        }
                        if (imageUrl.match(/^(https:\/\/|data:)/i)) {
                            // Allow
                        }
                        else {
                            // Transform IPFS link to gateway
                            const ipfs = imageUrl.match(matcherIpfs);
                            if (ipfs == null) {
                                linkage.push({ type: "!imageUrl-ipfs", value: imageUrl });
                                return { url: null, linkage };
                            }
                            linkage.push({ type: "imageUrl-ipfs", value: imageUrl });
                            imageUrl = getIpfsLink(imageUrl);
                        }
                        linkage.push({ type: "url", value: imageUrl });
                        return { linkage, url: imageUrl };
                    }
                }
            }
        }
        catch (error) { }
        return { linkage, url: null };
    }
    static async getEnsAddress(provider) {
        const network = await provider.getNetwork();
        const ensPlugin = network.getPlugin("org.ethers.plugins.network.Ens");
        // No ENS...
        assert(ensPlugin, "network does not support ENS", "UNSUPPORTED_OPERATION", {
            operation: "getEnsAddress", info: { network }
        });
        return ensPlugin.address;
    }
    static async #getResolver(provider, name) {
        const ensAddr = await EnsResolver.getEnsAddress(provider);
        try {
            const contract = new Contract(ensAddr, [
                "function resolver(bytes32) view returns (address)"
            ], provider);
            const addr = await contract.resolver(namehash(name), {
                enableCcipRead: true
            });
            if (addr === ZeroAddress) {
                return null;
            }
            return addr;
        }
        catch (error) {
            // ENS registry cannot throw errors on resolver(bytes32),
            // so probably a link error
            throw error;
        }
        return null;
    }
    /**
     *  Resolve to the ENS resolver for %%name%% using %%provider%% or
     *  ``null`` if unconfigured.
     */
    static async fromName(provider, name) {
        let currentName = name;
        while (true) {
            if (currentName === "" || currentName === ".") {
                return null;
            }
            // Optimization since the eth node cannot change and does
            // not have a wildcard resolver
            if (name !== "eth" && currentName === "eth") {
                return null;
            }
            // Check the current node for a resolver
            const addr = await EnsResolver.#getResolver(provider, currentName);
            // Found a resolver!
            if (addr != null) {
                const resolver = new EnsResolver(provider, addr, name);
                // Legacy resolver found, using EIP-2544 so it isn't safe to use
                if (currentName !== name && !(await resolver.supportsWildcard())) {
                    return null;
                }
                return resolver;
            }
            // Get the parent node
            currentName = currentName.split(".").slice(1).join(".");
        }
    }
}

/**
 *  @_ignore
 */
const BN_0 = BigInt(0);
function allowNull(format, nullValue) {
    return (function (value) {
        if (value == null) {
            return nullValue;
        }
        return format(value);
    });
}
function arrayOf(format, allowNull) {
    return ((array) => {
        if (allowNull && array == null) {
            return null;
        }
        if (!Array.isArray(array)) {
            throw new Error("not an array");
        }
        return array.map((i) => format(i));
    });
}
// Requires an object which matches a fleet of other formatters
// Any FormatFunc may return `undefined` to have the value omitted
// from the result object. Calls preserve `this`.
function object(format, altNames) {
    return ((value) => {
        const result = {};
        for (const key in format) {
            let srcKey = key;
            if (altNames && key in altNames && !(srcKey in value)) {
                for (const altKey of altNames[key]) {
                    if (altKey in value) {
                        srcKey = altKey;
                        break;
                    }
                }
            }
            try {
                const nv = format[key](value[srcKey]);
                if (nv !== undefined) {
                    result[key] = nv;
                }
            }
            catch (error) {
                const message = (error instanceof Error) ? error.message : "not-an-error";
                assert(false, `invalid value for value.${key} (${message})`, "BAD_DATA", { value });
            }
        }
        return result;
    });
}
function formatBoolean(value) {
    switch (value) {
        case true:
        case "true":
            return true;
        case false:
        case "false":
            return false;
    }
    assertArgument(false, `invalid boolean; ${JSON.stringify(value)}`, "value", value);
}
function formatData(value) {
    assertArgument(isHexString(value, true), "invalid data", "value", value);
    return value;
}
function formatHash(value) {
    assertArgument(isHexString(value, 32), "invalid hash", "value", value);
    return value;
}
const _formatLog = object({
    address: getAddress,
    blockHash: formatHash,
    blockNumber: getNumber,
    data: formatData,
    index: getNumber,
    removed: allowNull(formatBoolean, false),
    topics: arrayOf(formatHash),
    transactionHash: formatHash,
    transactionIndex: getNumber,
}, {
    index: ["logIndex"]
});
function formatLog(value) {
    return _formatLog(value);
}
const _formatBlock = object({
    hash: allowNull(formatHash),
    parentHash: formatHash,
    parentBeaconBlockRoot: allowNull(formatHash, null),
    number: getNumber,
    timestamp: getNumber,
    nonce: allowNull(formatData),
    difficulty: getBigInt,
    gasLimit: getBigInt,
    gasUsed: getBigInt,
    stateRoot: allowNull(formatHash, null),
    receiptsRoot: allowNull(formatHash, null),
    blobGasUsed: allowNull(getBigInt, null),
    excessBlobGas: allowNull(getBigInt, null),
    miner: allowNull(getAddress),
    prevRandao: allowNull(formatHash, null),
    extraData: formatData,
    baseFeePerGas: allowNull(getBigInt)
}, {
    prevRandao: ["mixHash"]
});
function formatBlock(value) {
    const result = _formatBlock(value);
    result.transactions = value.transactions.map((tx) => {
        if (typeof (tx) === "string") {
            return tx;
        }
        return formatTransactionResponse(tx);
    });
    return result;
}
const _formatReceiptLog = object({
    transactionIndex: getNumber,
    blockNumber: getNumber,
    transactionHash: formatHash,
    address: getAddress,
    topics: arrayOf(formatHash),
    data: formatData,
    index: getNumber,
    blockHash: formatHash,
}, {
    index: ["logIndex"]
});
function formatReceiptLog(value) {
    return _formatReceiptLog(value);
}
const _formatTransactionReceipt = object({
    to: allowNull(getAddress, null),
    from: allowNull(getAddress, null),
    contractAddress: allowNull(getAddress, null),
    // should be allowNull(hash), but broken-EIP-658 support is handled in receipt
    index: getNumber,
    root: allowNull(hexlify),
    gasUsed: getBigInt,
    blobGasUsed: allowNull(getBigInt, null),
    logsBloom: allowNull(formatData),
    blockHash: formatHash,
    hash: formatHash,
    logs: arrayOf(formatReceiptLog),
    blockNumber: getNumber,
    //confirmations: allowNull(getNumber, null),
    cumulativeGasUsed: getBigInt,
    effectiveGasPrice: allowNull(getBigInt),
    blobGasPrice: allowNull(getBigInt, null),
    status: allowNull(getNumber),
    type: allowNull(getNumber, 0)
}, {
    effectiveGasPrice: ["gasPrice"],
    hash: ["transactionHash"],
    index: ["transactionIndex"],
});
function formatTransactionReceipt(value) {
    return _formatTransactionReceipt(value);
}
function formatTransactionResponse(value) {
    // Some clients (TestRPC) do strange things like return 0x0 for the
    // 0 address; correct this to be a real address
    if (value.to && getBigInt(value.to) === BN_0) {
        value.to = "0x0000000000000000000000000000000000000000";
    }
    const result = object({
        hash: formatHash,
        // Some nodes do not return this, usually test nodes (like Ganache)
        index: allowNull(getNumber, undefined),
        type: (value) => {
            if (value === "0x" || value == null) {
                return 0;
            }
            return getNumber(value);
        },
        accessList: allowNull(accessListify, null),
        blobVersionedHashes: allowNull(arrayOf(formatHash, true), null),
        blockHash: allowNull(formatHash, null),
        blockNumber: allowNull(getNumber, null),
        transactionIndex: allowNull(getNumber, null),
        from: getAddress,
        // either (gasPrice) or (maxPriorityFeePerGas + maxFeePerGas) must be set
        gasPrice: allowNull(getBigInt),
        maxPriorityFeePerGas: allowNull(getBigInt),
        maxFeePerGas: allowNull(getBigInt),
        maxFeePerBlobGas: allowNull(getBigInt, null),
        gasLimit: getBigInt,
        to: allowNull(getAddress, null),
        value: getBigInt,
        nonce: getNumber,
        data: formatData,
        creates: allowNull(getAddress, null),
        chainId: allowNull(getBigInt, null)
    }, {
        data: ["input"],
        gasLimit: ["gas"],
        index: ["transactionIndex"]
    })(value);
    // If to and creates are empty, populate the creates from the value
    if (result.to == null && result.creates == null) {
        result.creates = getCreateAddress(result);
    }
    // @TODO: Check fee data
    // Add an access list to supported transaction types
    if ((value.type === 1 || value.type === 2) && value.accessList == null) {
        result.accessList = [];
    }
    // Compute the signature
    if (value.signature) {
        result.signature = Signature.from(value.signature);
    }
    else {
        result.signature = Signature.from(value);
    }
    // Some backends omit ChainId on legacy transactions, but we can compute it
    if (result.chainId == null) {
        const chainId = result.signature.legacyChainId;
        if (chainId != null) {
            result.chainId = chainId;
        }
    }
    // @TODO: check chainID
    /*
    if (value.chainId != null) {
        let chainId = value.chainId;

        if (isHexString(chainId)) {
            chainId = BigNumber.from(chainId).toNumber();
        }

        result.chainId = chainId;

    } else {
        let chainId = value.networkId;

        // geth-etc returns chainId
        if (chainId == null && result.v == null) {
            chainId = value.chainId;
        }

        if (isHexString(chainId)) {
            chainId = BigNumber.from(chainId).toNumber();
        }

        if (typeof(chainId) !== "number" && result.v != null) {
            chainId = (result.v - 35) / 2;
            if (chainId < 0) { chainId = 0; }
            chainId = parseInt(chainId);
        }

        if (typeof(chainId) !== "number") { chainId = 0; }

        result.chainId = chainId;
    }
    */
    // 0x0000... should actually be null
    if (result.blockHash && getBigInt(result.blockHash) === BN_0) {
        result.blockHash = null;
    }
    return result;
}

const EnsAddress = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
/**
 *  A **NetworkPlugin** provides additional functionality on a [[Network]].
 */
class NetworkPlugin {
    /**
     *  The name of the plugin.
     *
     *  It is recommended to use reverse-domain-notation, which permits
     *  unique names with a known authority as well as hierarchal entries.
     */
    name;
    /**
     *  Creates a new **NetworkPlugin**.
     */
    constructor(name) {
        defineProperties(this, { name });
    }
    /**
     *  Creates a copy of this plugin.
     */
    clone() {
        return new NetworkPlugin(this.name);
    }
}
/**
 *  A **GasCostPlugin** allows a network to provide alternative values when
 *  computing the intrinsic gas required for a transaction.
 */
class GasCostPlugin extends NetworkPlugin {
    /**
     *  The block number to treat these values as valid from.
     *
     *  This allows a hardfork to have updated values included as well as
     *  mulutiple hardforks to be supported.
     */
    effectiveBlock;
    /**
     *  The transactions base fee.
     */
    txBase;
    /**
     *  The fee for creating a new account.
     */
    txCreate;
    /**
     *  The fee per zero-byte in the data.
     */
    txDataZero;
    /**
     *  The fee per non-zero-byte in the data.
     */
    txDataNonzero;
    /**
     *  The fee per storage key in the [[link-eip-2930]] access list.
     */
    txAccessListStorageKey;
    /**
     *  The fee per address in the [[link-eip-2930]] access list.
     */
    txAccessListAddress;
    /**
     *  Creates a new GasCostPlugin from %%effectiveBlock%% until the
     *  latest block or another GasCostPlugin supercedes that block number,
     *  with the associated %%costs%%.
     */
    constructor(effectiveBlock, costs) {
        if (effectiveBlock == null) {
            effectiveBlock = 0;
        }
        super(`org.ethers.network.plugins.GasCost#${(effectiveBlock || 0)}`);
        const props = { effectiveBlock };
        function set(name, nullish) {
            let value = (costs || {})[name];
            if (value == null) {
                value = nullish;
            }
            assertArgument(typeof (value) === "number", `invalud value for ${name}`, "costs", costs);
            props[name] = value;
        }
        set("txBase", 21000);
        set("txCreate", 32000);
        set("txDataZero", 4);
        set("txDataNonzero", 16);
        set("txAccessListStorageKey", 1900);
        set("txAccessListAddress", 2400);
        defineProperties(this, props);
    }
    clone() {
        return new GasCostPlugin(this.effectiveBlock, this);
    }
}
/**
 *  An **EnsPlugin** allows a [[Network]] to specify the ENS Registry
 *  Contract address and the target network to use when using that
 *  contract.
 *
 *  Various testnets have their own instance of the contract to use, but
 *  in general, the mainnet instance supports multi-chain addresses and
 *  should be used.
 */
class EnsPlugin extends NetworkPlugin {
    /**
     *  The ENS Registrty Contract address.
     */
    address;
    /**
     *  The chain ID that the ENS contract lives on.
     */
    targetNetwork;
    /**
     *  Creates a new **EnsPlugin** connected to %%address%% on the
     *  %%targetNetwork%%. The default ENS address and mainnet is used
     *  if unspecified.
     */
    constructor(address, targetNetwork) {
        super("org.ethers.plugins.network.Ens");
        defineProperties(this, {
            address: (address || EnsAddress),
            targetNetwork: ((targetNetwork == null) ? 1 : targetNetwork)
        });
    }
    clone() {
        return new EnsPlugin(this.address, this.targetNetwork);
    }
}
class FetchUrlFeeDataNetworkPlugin extends NetworkPlugin {
    #url;
    #processFunc;
    /**
     *  The URL to initialize the FetchRequest with in %%processFunc%%.
     */
    get url() { return this.#url; }
    /**
     *  The callback to use when computing the FeeData.
     */
    get processFunc() { return this.#processFunc; }
    /**
     *  Creates a new **FetchUrlFeeDataNetworkPlugin** which will
     *  be used when computing the fee data for the network.
     */
    constructor(url, processFunc) {
        super("org.ethers.plugins.network.FetchUrlFeeDataPlugin");
        this.#url = url;
        this.#processFunc = processFunc;
    }
    // We are immutable, so we can serve as our own clone
    clone() { return this; }
}
/*
export class CustomBlockNetworkPlugin extends NetworkPlugin {
    readonly #blockFunc: (provider: Provider, block: BlockParams<string>) => Block<string>;
    readonly #blockWithTxsFunc: (provider: Provider, block: BlockParams<TransactionResponseParams>) => Block<TransactionResponse>;

    constructor(blockFunc: (provider: Provider, block: BlockParams<string>) => Block<string>, blockWithTxsFunc: (provider: Provider, block: BlockParams<TransactionResponseParams>) => Block<TransactionResponse>) {
        super("org.ethers.network-plugins.custom-block");
        this.#blockFunc = blockFunc;
        this.#blockWithTxsFunc = blockWithTxsFunc;
    }

    async getBlock(provider: Provider, block: BlockParams<string>): Promise<Block<string>> {
        return await this.#blockFunc(provider, block);
    }

    async getBlockions(provider: Provider, block: BlockParams<TransactionResponseParams>): Promise<Block<TransactionResponse>> {
        return await this.#blockWithTxsFunc(provider, block);
    }

    clone(): CustomBlockNetworkPlugin {
        return new CustomBlockNetworkPlugin(this.#blockFunc, this.#blockWithTxsFunc);
    }
}
*/

/**
 *  A **Network** encapsulates the various properties required to
 *  interact with a specific chain.
 *
 *  @_subsection: api/providers:Networks  [networks]
 */
/* * * *
// Networks which operation against an L2 can use this plugin to
// specify how to access L1, for the purpose of resolving ENS,
// for example.
export class LayerOneConnectionPlugin extends NetworkPlugin {
    readonly provider!: Provider;
// @TODO: Rename to ChainAccess and allow for connecting to any chain
    constructor(provider: Provider) {
        super("org.ethers.plugins.layer-one-connection");
        defineProperties<LayerOneConnectionPlugin>(this, { provider });
    }

    clone(): LayerOneConnectionPlugin {
        return new LayerOneConnectionPlugin(this.provider);
    }
}
*/
const Networks = new Map();
/**
 *  A **Network** provides access to a chain's properties and allows
 *  for plug-ins to extend functionality.
 */
class Network {
    #name;
    #chainId;
    #plugins;
    /**
     *  Creates a new **Network** for %%name%% and %%chainId%%.
     */
    constructor(name, chainId) {
        this.#name = name;
        this.#chainId = getBigInt(chainId);
        this.#plugins = new Map();
    }
    /**
     *  Returns a JSON-compatible representation of a Network.
     */
    toJSON() {
        return { name: this.name, chainId: String(this.chainId) };
    }
    /**
     *  The network common name.
     *
     *  This is the canonical name, as networks migh have multiple
     *  names.
     */
    get name() { return this.#name; }
    set name(value) { this.#name = value; }
    /**
     *  The network chain ID.
     */
    get chainId() { return this.#chainId; }
    set chainId(value) { this.#chainId = getBigInt(value, "chainId"); }
    /**
     *  Returns true if %%other%% matches this network. Any chain ID
     *  must match, and if no chain ID is present, the name must match.
     *
     *  This method does not currently check for additional properties,
     *  such as ENS address or plug-in compatibility.
     */
    matches(other) {
        if (other == null) {
            return false;
        }
        if (typeof (other) === "string") {
            try {
                return (this.chainId === getBigInt(other));
            }
            catch (error) { }
            return (this.name === other);
        }
        if (typeof (other) === "number" || typeof (other) === "bigint") {
            try {
                return (this.chainId === getBigInt(other));
            }
            catch (error) { }
            return false;
        }
        if (typeof (other) === "object") {
            if (other.chainId != null) {
                try {
                    return (this.chainId === getBigInt(other.chainId));
                }
                catch (error) { }
                return false;
            }
            if (other.name != null) {
                return (this.name === other.name);
            }
            return false;
        }
        return false;
    }
    /**
     *  Returns the list of plugins currently attached to this Network.
     */
    get plugins() {
        return Array.from(this.#plugins.values());
    }
    /**
     *  Attach a new %%plugin%% to this Network. The network name
     *  must be unique, excluding any fragment.
     */
    attachPlugin(plugin) {
        if (this.#plugins.get(plugin.name)) {
            throw new Error(`cannot replace existing plugin: ${plugin.name} `);
        }
        this.#plugins.set(plugin.name, plugin.clone());
        return this;
    }
    /**
     *  Return the plugin, if any, matching %%name%% exactly. Plugins
     *  with fragments will not be returned unless %%name%% includes
     *  a fragment.
     */
    getPlugin(name) {
        return (this.#plugins.get(name)) || null;
    }
    /**
     *  Gets a list of all plugins that match %%name%%, with otr without
     *  a fragment.
     */
    getPlugins(basename) {
        return (this.plugins.filter((p) => (p.name.split("#")[0] === basename)));
    }
    /**
     *  Create a copy of this Network.
     */
    clone() {
        const clone = new Network(this.name, this.chainId);
        this.plugins.forEach((plugin) => {
            clone.attachPlugin(plugin.clone());
        });
        return clone;
    }
    /**
     *  Compute the intrinsic gas required for a transaction.
     *
     *  A GasCostPlugin can be attached to override the default
     *  values.
     */
    computeIntrinsicGas(tx) {
        const costs = this.getPlugin("org.ethers.plugins.network.GasCost") || (new GasCostPlugin());
        let gas = costs.txBase;
        if (tx.to == null) {
            gas += costs.txCreate;
        }
        if (tx.data) {
            for (let i = 2; i < tx.data.length; i += 2) {
                if (tx.data.substring(i, i + 2) === "00") {
                    gas += costs.txDataZero;
                }
                else {
                    gas += costs.txDataNonzero;
                }
            }
        }
        if (tx.accessList) {
            const accessList = accessListify(tx.accessList);
            for (const addr in accessList) {
                gas += costs.txAccessListAddress + costs.txAccessListStorageKey * accessList[addr].storageKeys.length;
            }
        }
        return gas;
    }
    /**
     *  Returns a new Network for the %%network%% name or chainId.
     */
    static from(network) {
        injectCommonNetworks();
        // Default network
        if (network == null) {
            return Network.from("mainnet");
        }
        // Canonical name or chain ID
        if (typeof (network) === "number") {
            network = BigInt(network);
        }
        if (typeof (network) === "string" || typeof (network) === "bigint") {
            const networkFunc = Networks.get(network);
            if (networkFunc) {
                return networkFunc();
            }
            if (typeof (network) === "bigint") {
                return new Network("unknown", network);
            }
            assertArgument(false, "unknown network", "network", network);
        }
        // Clonable with network-like abilities
        if (typeof (network.clone) === "function") {
            const clone = network.clone();
            //if (typeof(network.name) !== "string" || typeof(network.chainId) !== "number") {
            //}
            return clone;
        }
        // Networkish
        if (typeof (network) === "object") {
            assertArgument(typeof (network.name) === "string" && typeof (network.chainId) === "number", "invalid network object name or chainId", "network", network);
            const custom = new Network((network.name), (network.chainId));
            if (network.ensAddress || network.ensNetwork != null) {
                custom.attachPlugin(new EnsPlugin(network.ensAddress, network.ensNetwork));
            }
            //if ((<any>network).layerOneConnection) {
            //    custom.attachPlugin(new LayerOneConnectionPlugin((<any>network).layerOneConnection));
            //}
            return custom;
        }
        assertArgument(false, "invalid network", "network", network);
    }
    /**
     *  Register %%nameOrChainId%% with a function which returns
     *  an instance of a Network representing that chain.
     */
    static register(nameOrChainId, networkFunc) {
        if (typeof (nameOrChainId) === "number") {
            nameOrChainId = BigInt(nameOrChainId);
        }
        const existing = Networks.get(nameOrChainId);
        if (existing) {
            assertArgument(false, `conflicting network for ${JSON.stringify(existing.name)}`, "nameOrChainId", nameOrChainId);
        }
        Networks.set(nameOrChainId, networkFunc);
    }
}
// We don't want to bring in formatUnits because it is backed by
// FixedNumber and we want to keep Networks tiny. The values
// included by the Gas Stations are also IEEE 754 with lots of
// rounding issues and exceed the strict checks formatUnits has.
function parseUnits(_value, decimals) {
    const value = String(_value);
    if (!value.match(/^[0-9.]+$/)) {
        throw new Error(`invalid gwei value: ${_value}`);
    }
    // Break into [ whole, fraction ]
    const comps = value.split(".");
    if (comps.length === 1) {
        comps.push("");
    }
    // More than 1 decimal point or too many fractional positions
    if (comps.length !== 2) {
        throw new Error(`invalid gwei value: ${_value}`);
    }
    // Pad the fraction to 9 decimalplaces
    while (comps[1].length < decimals) {
        comps[1] += "0";
    }
    // Too many decimals and some non-zero ending, take the ceiling
    if (comps[1].length > 9) {
        let frac = BigInt(comps[1].substring(0, 9));
        if (!comps[1].substring(9).match(/^0+$/)) {
            frac++;
        }
        comps[1] = frac.toString();
    }
    return BigInt(comps[0] + comps[1]);
}
// Used by Polygon to use a gas station for fee data
function getGasStationPlugin(url) {
    return new FetchUrlFeeDataNetworkPlugin(url, async (fetchFeeData, provider, request) => {
        // Prevent Cloudflare from blocking our request in node.js
        request.setHeader("User-Agent", "ethers");
        let response;
        try {
            const [_response, _feeData] = await Promise.all([
                request.send(), fetchFeeData()
            ]);
            response = _response;
            const payload = response.bodyJson.standard;
            const feeData = {
                gasPrice: _feeData.gasPrice,
                maxFeePerGas: parseUnits(payload.maxFee, 9),
                maxPriorityFeePerGas: parseUnits(payload.maxPriorityFee, 9),
            };
            return feeData;
        }
        catch (error) {
            assert(false, `error encountered with polygon gas station (${JSON.stringify(request.url)})`, "SERVER_ERROR", { request, response, error });
        }
    });
}
// See: https://chainlist.org
let injected = false;
function injectCommonNetworks() {
    if (injected) {
        return;
    }
    injected = true;
    /// Register popular Ethereum networks
    function registerEth(name, chainId, options) {
        const func = function () {
            const network = new Network(name, chainId);
            // We use 0 to disable ENS
            if (options.ensNetwork != null) {
                network.attachPlugin(new EnsPlugin(null, options.ensNetwork));
            }
            network.attachPlugin(new GasCostPlugin());
            (options.plugins || []).forEach((plugin) => {
                network.attachPlugin(plugin);
            });
            return network;
        };
        // Register the network by name and chain ID
        Network.register(name, func);
        Network.register(chainId, func);
        if (options.altNames) {
            options.altNames.forEach((name) => {
                Network.register(name, func);
            });
        }
    }
    registerEth("mainnet", 1, { ensNetwork: 1, altNames: ["homestead"] });
    registerEth("ropsten", 3, { ensNetwork: 3 });
    registerEth("rinkeby", 4, { ensNetwork: 4 });
    registerEth("goerli", 5, { ensNetwork: 5 });
    registerEth("kovan", 42, { ensNetwork: 42 });
    registerEth("sepolia", 11155111, { ensNetwork: 11155111 });
    registerEth("holesky", 17000, { ensNetwork: 17000 });
    registerEth("classic", 61, {});
    registerEth("classicKotti", 6, {});
    registerEth("arbitrum", 42161, {
        ensNetwork: 1,
    });
    registerEth("arbitrum-goerli", 421613, {});
    registerEth("arbitrum-sepolia", 421614, {});
    registerEth("base", 8453, { ensNetwork: 1 });
    registerEth("base-goerli", 84531, {});
    registerEth("base-sepolia", 84532, {});
    registerEth("bnb", 56, { ensNetwork: 1 });
    registerEth("bnbt", 97, {});
    registerEth("linea", 59144, { ensNetwork: 1 });
    registerEth("linea-goerli", 59140, {});
    registerEth("linea-sepolia", 59141, {});
    registerEth("matic", 137, {
        ensNetwork: 1,
        plugins: [
            getGasStationPlugin("https:/\/gasstation.polygon.technology/v2")
        ]
    });
    registerEth("matic-amoy", 80002, {});
    registerEth("matic-mumbai", 80001, {
        altNames: ["maticMumbai", "maticmum"],
        plugins: [
            getGasStationPlugin("https:/\/gasstation-testnet.polygon.technology/v2")
        ]
    });
    registerEth("optimism", 10, {
        ensNetwork: 1,
        plugins: []
    });
    registerEth("optimism-goerli", 420, {});
    registerEth("optimism-sepolia", 11155420, {});
    registerEth("xdai", 100, { ensNetwork: 1 });
}

function copy$2(obj) {
    return JSON.parse(JSON.stringify(obj));
}
// @TODO: refactor this
/**
 *  A **PollingBlockSubscriber** polls at a regular interval for a change
 *  in the block number.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class PollingBlockSubscriber {
    #provider;
    #poller;
    #interval;
    // The most recent block we have scanned for events. The value -2
    // indicates we still need to fetch an initial block number
    #blockNumber;
    /**
     *  Create a new **PollingBlockSubscriber** attached to %%provider%%.
     */
    constructor(provider) {
        this.#provider = provider;
        this.#poller = null;
        this.#interval = 4000;
        this.#blockNumber = -2;
    }
    /**
     *  The polling interval.
     */
    get pollingInterval() { return this.#interval; }
    set pollingInterval(value) { this.#interval = value; }
    async #poll() {
        try {
            const blockNumber = await this.#provider.getBlockNumber();
            // Bootstrap poll to setup our initial block number
            if (this.#blockNumber === -2) {
                this.#blockNumber = blockNumber;
                return;
            }
            // @TODO: Put a cap on the maximum number of events per loop?
            if (blockNumber !== this.#blockNumber) {
                for (let b = this.#blockNumber + 1; b <= blockNumber; b++) {
                    // We have been stopped
                    if (this.#poller == null) {
                        return;
                    }
                    await this.#provider.emit("block", b);
                }
                this.#blockNumber = blockNumber;
            }
        }
        catch (error) {
            // @TODO: Minor bump, add an "error" event to let subscribers
            //        know things went awry.
            //console.log(error);
        }
        // We have been stopped
        if (this.#poller == null) {
            return;
        }
        this.#poller = this.#provider._setTimeout(this.#poll.bind(this), this.#interval);
    }
    start() {
        if (this.#poller) {
            return;
        }
        this.#poller = this.#provider._setTimeout(this.#poll.bind(this), this.#interval);
        this.#poll();
    }
    stop() {
        if (!this.#poller) {
            return;
        }
        this.#provider._clearTimeout(this.#poller);
        this.#poller = null;
    }
    pause(dropWhilePaused) {
        this.stop();
        if (dropWhilePaused) {
            this.#blockNumber = -2;
        }
    }
    resume() {
        this.start();
    }
}
/**
 *  An **OnBlockSubscriber** can be sub-classed, with a [[_poll]]
 *  implmentation which will be called on every new block.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class OnBlockSubscriber {
    #provider;
    #poll;
    #running;
    /**
     *  Create a new **OnBlockSubscriber** attached to %%provider%%.
     */
    constructor(provider) {
        this.#provider = provider;
        this.#running = false;
        this.#poll = (blockNumber) => {
            this._poll(blockNumber, this.#provider);
        };
    }
    /**
     *  Called on every new block.
     */
    async _poll(blockNumber, provider) {
        throw new Error("sub-classes must override this");
    }
    start() {
        if (this.#running) {
            return;
        }
        this.#running = true;
        this.#poll(-2);
        this.#provider.on("block", this.#poll);
    }
    stop() {
        if (!this.#running) {
            return;
        }
        this.#running = false;
        this.#provider.off("block", this.#poll);
    }
    pause(dropWhilePaused) { this.stop(); }
    resume() { this.start(); }
}
class PollingBlockTagSubscriber extends OnBlockSubscriber {
    #tag;
    #lastBlock;
    constructor(provider, tag) {
        super(provider);
        this.#tag = tag;
        this.#lastBlock = -2;
    }
    pause(dropWhilePaused) {
        if (dropWhilePaused) {
            this.#lastBlock = -2;
        }
        super.pause(dropWhilePaused);
    }
    async _poll(blockNumber, provider) {
        const block = await provider.getBlock(this.#tag);
        if (block == null) {
            return;
        }
        if (this.#lastBlock === -2) {
            this.#lastBlock = block.number;
        }
        else if (block.number > this.#lastBlock) {
            provider.emit(this.#tag, block.number);
            this.#lastBlock = block.number;
        }
    }
}
/**
 *  @_ignore:
 *
 *  @_docloc: api/providers/abstract-provider
 */
class PollingOrphanSubscriber extends OnBlockSubscriber {
    #filter;
    constructor(provider, filter) {
        super(provider);
        this.#filter = copy$2(filter);
    }
    async _poll(blockNumber, provider) {
        throw new Error("@TODO");
    }
}
/**
 *  A **PollingTransactionSubscriber** will poll for a given transaction
 *  hash for its receipt.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class PollingTransactionSubscriber extends OnBlockSubscriber {
    #hash;
    /**
     *  Create a new **PollingTransactionSubscriber** attached to
     *  %%provider%%, listening for %%hash%%.
     */
    constructor(provider, hash) {
        super(provider);
        this.#hash = hash;
    }
    async _poll(blockNumber, provider) {
        const tx = await provider.getTransactionReceipt(this.#hash);
        if (tx) {
            provider.emit(this.#hash, tx);
        }
    }
}
/**
 *  A **PollingEventSubscriber** will poll for a given filter for its logs.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class PollingEventSubscriber {
    #provider;
    #filter;
    #poller;
    #running;
    // The most recent block we have scanned for events. The value -2
    // indicates we still need to fetch an initial block number
    #blockNumber;
    /**
     *  Create a new **PollingTransactionSubscriber** attached to
     *  %%provider%%, listening for %%filter%%.
     */
    constructor(provider, filter) {
        this.#provider = provider;
        this.#filter = copy$2(filter);
        this.#poller = this.#poll.bind(this);
        this.#running = false;
        this.#blockNumber = -2;
    }
    async #poll(blockNumber) {
        // The initial block hasn't been determined yet
        if (this.#blockNumber === -2) {
            return;
        }
        const filter = copy$2(this.#filter);
        filter.fromBlock = this.#blockNumber + 1;
        filter.toBlock = blockNumber;
        const logs = await this.#provider.getLogs(filter);
        // No logs could just mean the node has not indexed them yet,
        // so we keep a sliding window of 60 blocks to keep scanning
        if (logs.length === 0) {
            if (this.#blockNumber < blockNumber - 60) {
                this.#blockNumber = blockNumber - 60;
            }
            return;
        }
        for (const log of logs) {
            this.#provider.emit(this.#filter, log);
            // Only advance the block number when logs were found to
            // account for networks (like BNB and Polygon) which may
            // sacrifice event consistency for block event speed
            this.#blockNumber = log.blockNumber;
        }
    }
    start() {
        if (this.#running) {
            return;
        }
        this.#running = true;
        if (this.#blockNumber === -2) {
            this.#provider.getBlockNumber().then((blockNumber) => {
                this.#blockNumber = blockNumber;
            });
        }
        this.#provider.on("block", this.#poller);
    }
    stop() {
        if (!this.#running) {
            return;
        }
        this.#running = false;
        this.#provider.off("block", this.#poller);
    }
    pause(dropWhilePaused) {
        this.stop();
        if (dropWhilePaused) {
            this.#blockNumber = -2;
        }
    }
    resume() {
        this.start();
    }
}

/**
 *  The available providers should suffice for most developers purposes,
 *  but the [[AbstractProvider]] class has many features which enable
 *  sub-classing it for specific purposes.
 *
 *  @_section: api/providers/abstract-provider: Subclassing Provider  [abstract-provider]
 */
// @TODO
// Event coalescence
//   When we register an event with an async value (e.g. address is a Signer
//   or ENS name), we need to add it immeidately for the Event API, but also
//   need time to resolve the address. Upon resolving the address, we need to
//   migrate the listener to the static event. We also need to maintain a map
//   of Signer/ENS name to address so we can sync respond to listenerCount.
// Constants
const BN_2 = BigInt(2);
const MAX_CCIP_REDIRECTS = 10;
function isPromise(value) {
    return (value && typeof (value.then) === "function");
}
function getTag(prefix, value) {
    return prefix + ":" + JSON.stringify(value, (k, v) => {
        if (v == null) {
            return "null";
        }
        if (typeof (v) === "bigint") {
            return `bigint:${v.toString()}`;
        }
        if (typeof (v) === "string") {
            return v.toLowerCase();
        }
        // Sort object keys
        if (typeof (v) === "object" && !Array.isArray(v)) {
            const keys = Object.keys(v);
            keys.sort();
            return keys.reduce((accum, key) => {
                accum[key] = v[key];
                return accum;
            }, {});
        }
        return v;
    });
}
/**
 *  An **UnmanagedSubscriber** is useful for events which do not require
 *  any additional management, such as ``"debug"`` which only requires
 *  emit in synchronous event loop triggered calls.
 */
class UnmanagedSubscriber {
    /**
     *  The name fof the event.
     */
    name;
    /**
     *  Create a new UnmanagedSubscriber with %%name%%.
     */
    constructor(name) { defineProperties(this, { name }); }
    start() { }
    stop() { }
    pause(dropWhilePaused) { }
    resume() { }
}
function copy$1(value) {
    return JSON.parse(JSON.stringify(value));
}
function concisify(items) {
    items = Array.from((new Set(items)).values());
    items.sort();
    return items;
}
async function getSubscription(_event, provider) {
    if (_event == null) {
        throw new Error("invalid event");
    }
    // Normalize topic array info an EventFilter
    if (Array.isArray(_event)) {
        _event = { topics: _event };
    }
    if (typeof (_event) === "string") {
        switch (_event) {
            case "block":
            case "debug":
            case "error":
            case "finalized":
            case "network":
            case "pending":
            case "safe": {
                return { type: _event, tag: _event };
            }
        }
    }
    if (isHexString(_event, 32)) {
        const hash = _event.toLowerCase();
        return { type: "transaction", tag: getTag("tx", { hash }), hash };
    }
    if (_event.orphan) {
        const event = _event;
        // @TODO: Should lowercase and whatnot things here instead of copy...
        return { type: "orphan", tag: getTag("orphan", event), filter: copy$1(event) };
    }
    if ((_event.address || _event.topics)) {
        const event = _event;
        const filter = {
            topics: ((event.topics || []).map((t) => {
                if (t == null) {
                    return null;
                }
                if (Array.isArray(t)) {
                    return concisify(t.map((t) => t.toLowerCase()));
                }
                return t.toLowerCase();
            }))
        };
        if (event.address) {
            const addresses = [];
            const promises = [];
            const addAddress = (addr) => {
                if (isHexString(addr)) {
                    addresses.push(addr);
                }
                else {
                    promises.push((async () => {
                        addresses.push(await resolveAddress(addr, provider));
                    })());
                }
            };
            if (Array.isArray(event.address)) {
                event.address.forEach(addAddress);
            }
            else {
                addAddress(event.address);
            }
            if (promises.length) {
                await Promise.all(promises);
            }
            filter.address = concisify(addresses.map((a) => a.toLowerCase()));
        }
        return { filter, tag: getTag("event", filter), type: "event" };
    }
    assertArgument(false, "unknown ProviderEvent", "event", _event);
}
function getTime() { return (new Date()).getTime(); }
const defaultOptions$1 = {
    cacheTimeout: 250,
    pollingInterval: 4000
};
/**
 *  An **AbstractProvider** provides a base class for other sub-classes to
 *  implement the [[Provider]] API by normalizing input arguments and
 *  formatting output results as well as tracking events for consistent
 *  behaviour on an eventually-consistent network.
 */
class AbstractProvider {
    #subs;
    #plugins;
    // null=unpaused, true=paused+dropWhilePaused, false=paused
    #pausedState;
    #destroyed;
    #networkPromise;
    #anyNetwork;
    #performCache;
    // The most recent block number if running an event or -1 if no "block" event
    #lastBlockNumber;
    #nextTimer;
    #timers;
    #disableCcipRead;
    #options;
    /**
     *  Create a new **AbstractProvider** connected to %%network%%, or
     *  use the various network detection capabilities to discover the
     *  [[Network]] if necessary.
     */
    constructor(_network, options) {
        this.#options = Object.assign({}, defaultOptions$1, options || {});
        if (_network === "any") {
            this.#anyNetwork = true;
            this.#networkPromise = null;
        }
        else if (_network) {
            const network = Network.from(_network);
            this.#anyNetwork = false;
            this.#networkPromise = Promise.resolve(network);
            setTimeout(() => { this.emit("network", network, null); }, 0);
        }
        else {
            this.#anyNetwork = false;
            this.#networkPromise = null;
        }
        this.#lastBlockNumber = -1;
        this.#performCache = new Map();
        this.#subs = new Map();
        this.#plugins = new Map();
        this.#pausedState = null;
        this.#destroyed = false;
        this.#nextTimer = 1;
        this.#timers = new Map();
        this.#disableCcipRead = false;
    }
    get pollingInterval() { return this.#options.pollingInterval; }
    /**
     *  Returns ``this``, to allow an **AbstractProvider** to implement
     *  the [[ContractRunner]] interface.
     */
    get provider() { return this; }
    /**
     *  Returns all the registered plug-ins.
     */
    get plugins() {
        return Array.from(this.#plugins.values());
    }
    /**
     *  Attach a new plug-in.
     */
    attachPlugin(plugin) {
        if (this.#plugins.get(plugin.name)) {
            throw new Error(`cannot replace existing plugin: ${plugin.name} `);
        }
        this.#plugins.set(plugin.name, plugin.connect(this));
        return this;
    }
    /**
     *  Get a plugin by name.
     */
    getPlugin(name) {
        return (this.#plugins.get(name)) || null;
    }
    /**
     *  Prevent any CCIP-read operation, regardless of whether requested
     *  in a [[call]] using ``enableCcipRead``.
     */
    get disableCcipRead() { return this.#disableCcipRead; }
    set disableCcipRead(value) { this.#disableCcipRead = !!value; }
    // Shares multiple identical requests made during the same 250ms
    async #perform(req) {
        const timeout = this.#options.cacheTimeout;
        // Caching disabled
        if (timeout < 0) {
            return await this._perform(req);
        }
        // Create a tag
        const tag = getTag(req.method, req);
        let perform = this.#performCache.get(tag);
        if (!perform) {
            perform = this._perform(req);
            this.#performCache.set(tag, perform);
            setTimeout(() => {
                if (this.#performCache.get(tag) === perform) {
                    this.#performCache.delete(tag);
                }
            }, timeout);
        }
        return await perform;
    }
    /**
     *  Resolves to the data for executing the CCIP-read operations.
     */
    async ccipReadFetch(tx, calldata, urls) {
        if (this.disableCcipRead || urls.length === 0 || tx.to == null) {
            return null;
        }
        const sender = tx.to.toLowerCase();
        const data = calldata.toLowerCase();
        const errorMessages = [];
        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            // URL expansion
            const href = url.replace("{sender}", sender).replace("{data}", data);
            // If no {data} is present, use POST; otherwise GET
            //const json: string | null = (url.indexOf("{data}") >= 0) ? null: JSON.stringify({ data, sender });
            //const result = await fetchJson({ url: href, errorPassThrough: true }, json, (value, response) => {
            //    value.status = response.statusCode;
            //    return value;
            //});
            const request = new FetchRequest(href);
            if (url.indexOf("{data}") === -1) {
                request.body = { data, sender };
            }
            this.emit("debug", { action: "sendCcipReadFetchRequest", request, index: i, urls });
            let errorMessage = "unknown error";
            const resp = await request.send();
            try {
                const result = resp.bodyJson;
                if (result.data) {
                    this.emit("debug", { action: "receiveCcipReadFetchResult", request, result });
                    return result.data;
                }
                if (result.message) {
                    errorMessage = result.message;
                }
                this.emit("debug", { action: "receiveCcipReadFetchError", request, result });
            }
            catch (error) { }
            // 4xx indicates the result is not present; stop
            assert(resp.statusCode < 400 || resp.statusCode >= 500, `response not found during CCIP fetch: ${errorMessage}`, "OFFCHAIN_FAULT", { reason: "404_MISSING_RESOURCE", transaction: tx, info: { url, errorMessage } });
            // 5xx indicates server issue; try the next url
            errorMessages.push(errorMessage);
        }
        assert(false, `error encountered during CCIP fetch: ${errorMessages.map((m) => JSON.stringify(m)).join(", ")}`, "OFFCHAIN_FAULT", {
            reason: "500_SERVER_ERROR",
            transaction: tx, info: { urls, errorMessages }
        });
    }
    /**
     *  Provides the opportunity for a sub-class to wrap a block before
     *  returning it, to add additional properties or an alternate
     *  sub-class of [[Block]].
     */
    _wrapBlock(value, network) {
        return new Block(formatBlock(value), this);
    }
    /**
     *  Provides the opportunity for a sub-class to wrap a log before
     *  returning it, to add additional properties or an alternate
     *  sub-class of [[Log]].
     */
    _wrapLog(value, network) {
        return new Log(formatLog(value), this);
    }
    /**
     *  Provides the opportunity for a sub-class to wrap a transaction
     *  receipt before returning it, to add additional properties or an
     *  alternate sub-class of [[TransactionReceipt]].
     */
    _wrapTransactionReceipt(value, network) {
        return new TransactionReceipt(formatTransactionReceipt(value), this);
    }
    /**
     *  Provides the opportunity for a sub-class to wrap a transaction
     *  response before returning it, to add additional properties or an
     *  alternate sub-class of [[TransactionResponse]].
     */
    _wrapTransactionResponse(tx, network) {
        return new TransactionResponse(formatTransactionResponse(tx), this);
    }
    /**
     *  Resolves to the Network, forcing a network detection using whatever
     *  technique the sub-class requires.
     *
     *  Sub-classes **must** override this.
     */
    _detectNetwork() {
        assert(false, "sub-classes must implement this", "UNSUPPORTED_OPERATION", {
            operation: "_detectNetwork"
        });
    }
    /**
     *  Sub-classes should use this to perform all built-in operations. All
     *  methods sanitizes and normalizes the values passed into this.
     *
     *  Sub-classes **must** override this.
     */
    async _perform(req) {
        assert(false, `unsupported method: ${req.method}`, "UNSUPPORTED_OPERATION", {
            operation: req.method,
            info: req
        });
    }
    // State
    async getBlockNumber() {
        const blockNumber = getNumber(await this.#perform({ method: "getBlockNumber" }), "%response");
        if (this.#lastBlockNumber >= 0) {
            this.#lastBlockNumber = blockNumber;
        }
        return blockNumber;
    }
    /**
     *  Returns or resolves to the address for %%address%%, resolving ENS
     *  names and [[Addressable]] objects and returning if already an
     *  address.
     */
    _getAddress(address) {
        return resolveAddress(address, this);
    }
    /**
     *  Returns or resolves to a valid block tag for %%blockTag%%, resolving
     *  negative values and returning if already a valid block tag.
     */
    _getBlockTag(blockTag) {
        if (blockTag == null) {
            return "latest";
        }
        switch (blockTag) {
            case "earliest":
                return "0x0";
            case "finalized":
            case "latest":
            case "pending":
            case "safe":
                return blockTag;
        }
        if (isHexString(blockTag)) {
            if (isHexString(blockTag, 32)) {
                return blockTag;
            }
            return toQuantity(blockTag);
        }
        if (typeof (blockTag) === "bigint") {
            blockTag = getNumber(blockTag, "blockTag");
        }
        if (typeof (blockTag) === "number") {
            if (blockTag >= 0) {
                return toQuantity(blockTag);
            }
            if (this.#lastBlockNumber >= 0) {
                return toQuantity(this.#lastBlockNumber + blockTag);
            }
            return this.getBlockNumber().then((b) => toQuantity(b + blockTag));
        }
        assertArgument(false, "invalid blockTag", "blockTag", blockTag);
    }
    /**
     *  Returns or resolves to a filter for %%filter%%, resolving any ENS
     *  names or [[Addressable]] object and returning if already a valid
     *  filter.
     */
    _getFilter(filter) {
        // Create a canonical representation of the topics
        const topics = (filter.topics || []).map((t) => {
            if (t == null) {
                return null;
            }
            if (Array.isArray(t)) {
                return concisify(t.map((t) => t.toLowerCase()));
            }
            return t.toLowerCase();
        });
        const blockHash = ("blockHash" in filter) ? filter.blockHash : undefined;
        const resolve = (_address, fromBlock, toBlock) => {
            let address = undefined;
            switch (_address.length) {
                case 0: break;
                case 1:
                    address = _address[0];
                    break;
                default:
                    _address.sort();
                    address = _address;
            }
            if (blockHash) {
                if (fromBlock != null || toBlock != null) {
                    throw new Error("invalid filter");
                }
            }
            const filter = {};
            if (address) {
                filter.address = address;
            }
            if (topics.length) {
                filter.topics = topics;
            }
            if (fromBlock) {
                filter.fromBlock = fromBlock;
            }
            if (toBlock) {
                filter.toBlock = toBlock;
            }
            if (blockHash) {
                filter.blockHash = blockHash;
            }
            return filter;
        };
        // Addresses could be async (ENS names or Addressables)
        let address = [];
        if (filter.address) {
            if (Array.isArray(filter.address)) {
                for (const addr of filter.address) {
                    address.push(this._getAddress(addr));
                }
            }
            else {
                address.push(this._getAddress(filter.address));
            }
        }
        let fromBlock = undefined;
        if ("fromBlock" in filter) {
            fromBlock = this._getBlockTag(filter.fromBlock);
        }
        let toBlock = undefined;
        if ("toBlock" in filter) {
            toBlock = this._getBlockTag(filter.toBlock);
        }
        if (address.filter((a) => (typeof (a) !== "string")).length ||
            (fromBlock != null && typeof (fromBlock) !== "string") ||
            (toBlock != null && typeof (toBlock) !== "string")) {
            return Promise.all([Promise.all(address), fromBlock, toBlock]).then((result) => {
                return resolve(result[0], result[1], result[2]);
            });
        }
        return resolve(address, fromBlock, toBlock);
    }
    /**
     *  Returns or resolves to a transaction for %%request%%, resolving
     *  any ENS names or [[Addressable]] and returning if already a valid
     *  transaction.
     */
    _getTransactionRequest(_request) {
        const request = copyRequest(_request);
        const promises = [];
        ["to", "from"].forEach((key) => {
            if (request[key] == null) {
                return;
            }
            const addr = resolveAddress(request[key], this);
            if (isPromise(addr)) {
                promises.push((async function () { request[key] = await addr; })());
            }
            else {
                request[key] = addr;
            }
        });
        if (request.blockTag != null) {
            const blockTag = this._getBlockTag(request.blockTag);
            if (isPromise(blockTag)) {
                promises.push((async function () { request.blockTag = await blockTag; })());
            }
            else {
                request.blockTag = blockTag;
            }
        }
        if (promises.length) {
            return (async function () {
                await Promise.all(promises);
                return request;
            })();
        }
        return request;
    }
    async getNetwork() {
        // No explicit network was set and this is our first time
        if (this.#networkPromise == null) {
            // Detect the current network (shared with all calls)
            const detectNetwork = (async () => {
                try {
                    const network = await this._detectNetwork();
                    this.emit("network", network, null);
                    return network;
                }
                catch (error) {
                    if (this.#networkPromise === detectNetwork) {
                        this.#networkPromise = null;
                    }
                    throw error;
                }
            })();
            this.#networkPromise = detectNetwork;
            return (await detectNetwork).clone();
        }
        const networkPromise = this.#networkPromise;
        const [expected, actual] = await Promise.all([
            networkPromise,
            this._detectNetwork() // The actual connected network
        ]);
        if (expected.chainId !== actual.chainId) {
            if (this.#anyNetwork) {
                // The "any" network can change, so notify listeners
                this.emit("network", actual, expected);
                // Update the network if something else hasn't already changed it
                if (this.#networkPromise === networkPromise) {
                    this.#networkPromise = Promise.resolve(actual);
                }
            }
            else {
                // Otherwise, we do not allow changes to the underlying network
                assert(false, `network changed: ${expected.chainId} => ${actual.chainId} `, "NETWORK_ERROR", {
                    event: "changed"
                });
            }
        }
        return expected.clone();
    }
    async getFeeData() {
        const network = await this.getNetwork();
        const getFeeDataFunc = async () => {
            const { _block, gasPrice, priorityFee } = await resolveProperties({
                _block: this.#getBlock("latest", false),
                gasPrice: ((async () => {
                    try {
                        const value = await this.#perform({ method: "getGasPrice" });
                        return getBigInt(value, "%response");
                    }
                    catch (error) { }
                    return null;
                })()),
                priorityFee: ((async () => {
                    try {
                        const value = await this.#perform({ method: "getPriorityFee" });
                        return getBigInt(value, "%response");
                    }
                    catch (error) { }
                    return null;
                })())
            });
            let maxFeePerGas = null;
            let maxPriorityFeePerGas = null;
            // These are the recommended EIP-1559 heuristics for fee data
            const block = this._wrapBlock(_block, network);
            if (block && block.baseFeePerGas) {
                maxPriorityFeePerGas = (priorityFee != null) ? priorityFee : BigInt("1000000000");
                maxFeePerGas = (block.baseFeePerGas * BN_2) + maxPriorityFeePerGas;
            }
            return new FeeData(gasPrice, maxFeePerGas, maxPriorityFeePerGas);
        };
        // Check for a FeeDataNetWorkPlugin
        const plugin = network.getPlugin("org.ethers.plugins.network.FetchUrlFeeDataPlugin");
        if (plugin) {
            const req = new FetchRequest(plugin.url);
            const feeData = await plugin.processFunc(getFeeDataFunc, this, req);
            return new FeeData(feeData.gasPrice, feeData.maxFeePerGas, feeData.maxPriorityFeePerGas);
        }
        return await getFeeDataFunc();
    }
    async estimateGas(_tx) {
        let tx = this._getTransactionRequest(_tx);
        if (isPromise(tx)) {
            tx = await tx;
        }
        return getBigInt(await this.#perform({
            method: "estimateGas", transaction: tx
        }), "%response");
    }
    async #call(tx, blockTag, attempt) {
        assert(attempt < MAX_CCIP_REDIRECTS, "CCIP read exceeded maximum redirections", "OFFCHAIN_FAULT", {
            reason: "TOO_MANY_REDIRECTS",
            transaction: Object.assign({}, tx, { blockTag, enableCcipRead: true })
        });
        // This came in as a PerformActionTransaction, so to/from are safe; we can cast
        const transaction = copyRequest(tx);
        try {
            return hexlify(await this._perform({ method: "call", transaction, blockTag }));
        }
        catch (error) {
            // CCIP Read OffchainLookup
            if (!this.disableCcipRead && isCallException(error) && error.data && attempt >= 0 && blockTag === "latest" && transaction.to != null && dataSlice(error.data, 0, 4) === "0x556f1830") {
                const data = error.data;
                const txSender = await resolveAddress(transaction.to, this);
                // Parse the CCIP Read Arguments
                let ccipArgs;
                try {
                    ccipArgs = parseOffchainLookup(dataSlice(error.data, 4));
                }
                catch (error) {
                    assert(false, error.message, "OFFCHAIN_FAULT", {
                        reason: "BAD_DATA", transaction, info: { data }
                    });
                }
                // Check the sender of the OffchainLookup matches the transaction
                assert(ccipArgs.sender.toLowerCase() === txSender.toLowerCase(), "CCIP Read sender mismatch", "CALL_EXCEPTION", {
                    action: "call",
                    data,
                    reason: "OffchainLookup",
                    transaction: transaction,
                    invocation: null,
                    revert: {
                        signature: "OffchainLookup(address,string[],bytes,bytes4,bytes)",
                        name: "OffchainLookup",
                        args: ccipArgs.errorArgs
                    }
                });
                const ccipResult = await this.ccipReadFetch(transaction, ccipArgs.calldata, ccipArgs.urls);
                assert(ccipResult != null, "CCIP Read failed to fetch data", "OFFCHAIN_FAULT", {
                    reason: "FETCH_FAILED", transaction, info: { data: error.data, errorArgs: ccipArgs.errorArgs }
                });
                const tx = {
                    to: txSender,
                    data: concat([ccipArgs.selector, encodeBytes([ccipResult, ccipArgs.extraData])])
                };
                this.emit("debug", { action: "sendCcipReadCall", transaction: tx });
                try {
                    const result = await this.#call(tx, blockTag, attempt + 1);
                    this.emit("debug", { action: "receiveCcipReadCallResult", transaction: Object.assign({}, tx), result });
                    return result;
                }
                catch (error) {
                    this.emit("debug", { action: "receiveCcipReadCallError", transaction: Object.assign({}, tx), error });
                    throw error;
                }
            }
            throw error;
        }
    }
    async #checkNetwork(promise) {
        const { value } = await resolveProperties({
            network: this.getNetwork(),
            value: promise
        });
        return value;
    }
    async call(_tx) {
        const { tx, blockTag } = await resolveProperties({
            tx: this._getTransactionRequest(_tx),
            blockTag: this._getBlockTag(_tx.blockTag)
        });
        return await this.#checkNetwork(this.#call(tx, blockTag, _tx.enableCcipRead ? 0 : -1));
    }
    // Account
    async #getAccountValue(request, _address, _blockTag) {
        let address = this._getAddress(_address);
        let blockTag = this._getBlockTag(_blockTag);
        if (typeof (address) !== "string" || typeof (blockTag) !== "string") {
            [address, blockTag] = await Promise.all([address, blockTag]);
        }
        return await this.#checkNetwork(this.#perform(Object.assign(request, { address, blockTag })));
    }
    async getBalance(address, blockTag) {
        return getBigInt(await this.#getAccountValue({ method: "getBalance" }, address, blockTag), "%response");
    }
    async getTransactionCount(address, blockTag) {
        return getNumber(await this.#getAccountValue({ method: "getTransactionCount" }, address, blockTag), "%response");
    }
    async getCode(address, blockTag) {
        return hexlify(await this.#getAccountValue({ method: "getCode" }, address, blockTag));
    }
    async getStorage(address, _position, blockTag) {
        const position = getBigInt(_position, "position");
        return hexlify(await this.#getAccountValue({ method: "getStorage", position }, address, blockTag));
    }
    // Write
    async broadcastTransaction(signedTx) {
        const { blockNumber, hash, network } = await resolveProperties({
            blockNumber: this.getBlockNumber(),
            hash: this._perform({
                method: "broadcastTransaction",
                signedTransaction: signedTx
            }),
            network: this.getNetwork()
        });
        const tx = Transaction.from(signedTx);
        if (tx.hash !== hash) {
            throw new Error("@TODO: the returned hash did not match");
        }
        return this._wrapTransactionResponse(tx, network).replaceableTransaction(blockNumber);
    }
    async #getBlock(block, includeTransactions) {
        // @TODO: Add CustomBlockPlugin check
        if (isHexString(block, 32)) {
            return await this.#perform({
                method: "getBlock", blockHash: block, includeTransactions
            });
        }
        let blockTag = this._getBlockTag(block);
        if (typeof (blockTag) !== "string") {
            blockTag = await blockTag;
        }
        return await this.#perform({
            method: "getBlock", blockTag, includeTransactions
        });
    }
    // Queries
    async getBlock(block, prefetchTxs) {
        const { network, params } = await resolveProperties({
            network: this.getNetwork(),
            params: this.#getBlock(block, !!prefetchTxs)
        });
        if (params == null) {
            return null;
        }
        return this._wrapBlock(params, network);
    }
    async getTransaction(hash) {
        const { network, params } = await resolveProperties({
            network: this.getNetwork(),
            params: this.#perform({ method: "getTransaction", hash })
        });
        if (params == null) {
            return null;
        }
        return this._wrapTransactionResponse(params, network);
    }
    async getTransactionReceipt(hash) {
        const { network, params } = await resolveProperties({
            network: this.getNetwork(),
            params: this.#perform({ method: "getTransactionReceipt", hash })
        });
        if (params == null) {
            return null;
        }
        // Some backends did not backfill the effectiveGasPrice into old transactions
        // in the receipt, so we look it up manually and inject it.
        if (params.gasPrice == null && params.effectiveGasPrice == null) {
            const tx = await this.#perform({ method: "getTransaction", hash });
            if (tx == null) {
                throw new Error("report this; could not find tx or effectiveGasPrice");
            }
            params.effectiveGasPrice = tx.gasPrice;
        }
        return this._wrapTransactionReceipt(params, network);
    }
    async getTransactionResult(hash) {
        const { result } = await resolveProperties({
            network: this.getNetwork(),
            result: this.#perform({ method: "getTransactionResult", hash })
        });
        if (result == null) {
            return null;
        }
        return hexlify(result);
    }
    // Bloom-filter Queries
    async getLogs(_filter) {
        let filter = this._getFilter(_filter);
        if (isPromise(filter)) {
            filter = await filter;
        }
        const { network, params } = await resolveProperties({
            network: this.getNetwork(),
            params: this.#perform({ method: "getLogs", filter })
        });
        return params.map((p) => this._wrapLog(p, network));
    }
    // ENS
    _getProvider(chainId) {
        assert(false, "provider cannot connect to target network", "UNSUPPORTED_OPERATION", {
            operation: "_getProvider()"
        });
    }
    async getResolver(name) {
        return await EnsResolver.fromName(this, name);
    }
    async getAvatar(name) {
        const resolver = await this.getResolver(name);
        if (resolver) {
            return await resolver.getAvatar();
        }
        return null;
    }
    async resolveName(name) {
        const resolver = await this.getResolver(name);
        if (resolver) {
            return await resolver.getAddress();
        }
        return null;
    }
    async lookupAddress(address) {
        address = getAddress(address);
        const node = namehash(address.substring(2).toLowerCase() + ".addr.reverse");
        try {
            const ensAddr = await EnsResolver.getEnsAddress(this);
            const ensContract = new Contract(ensAddr, [
                "function resolver(bytes32) view returns (address)"
            ], this);
            const resolver = await ensContract.resolver(node);
            if (resolver == null || resolver === ZeroAddress) {
                return null;
            }
            const resolverContract = new Contract(resolver, [
                "function name(bytes32) view returns (string)"
            ], this);
            const name = await resolverContract.name(node);
            // Failed forward resolution
            const check = await this.resolveName(name);
            if (check !== address) {
                return null;
            }
            return name;
        }
        catch (error) {
            // No data was returned from the resolver
            if (isError(error, "BAD_DATA") && error.value === "0x") {
                return null;
            }
            // Something reerted
            if (isError(error, "CALL_EXCEPTION")) {
                return null;
            }
            throw error;
        }
        return null;
    }
    async waitForTransaction(hash, _confirms, timeout) {
        const confirms = (_confirms != null) ? _confirms : 1;
        if (confirms === 0) {
            return this.getTransactionReceipt(hash);
        }
        return new Promise(async (resolve, reject) => {
            let timer = null;
            const listener = (async (blockNumber) => {
                try {
                    const receipt = await this.getTransactionReceipt(hash);
                    if (receipt != null) {
                        if (blockNumber - receipt.blockNumber + 1 >= confirms) {
                            resolve(receipt);
                            //this.off("block", listener);
                            if (timer) {
                                clearTimeout(timer);
                                timer = null;
                            }
                            return;
                        }
                    }
                }
                catch (error) {
                    console.log("EEE", error);
                }
                this.once("block", listener);
            });
            if (timeout != null) {
                timer = setTimeout(() => {
                    if (timer == null) {
                        return;
                    }
                    timer = null;
                    this.off("block", listener);
                    reject(makeError("timeout", "TIMEOUT", { reason: "timeout" }));
                }, timeout);
            }
            listener(await this.getBlockNumber());
        });
    }
    async waitForBlock(blockTag) {
        assert(false, "not implemented yet", "NOT_IMPLEMENTED", {
            operation: "waitForBlock"
        });
    }
    /**
     *  Clear a timer created using the [[_setTimeout]] method.
     */
    _clearTimeout(timerId) {
        const timer = this.#timers.get(timerId);
        if (!timer) {
            return;
        }
        if (timer.timer) {
            clearTimeout(timer.timer);
        }
        this.#timers.delete(timerId);
    }
    /**
     *  Create a timer that will execute %%func%% after at least %%timeout%%
     *  (in ms). If %%timeout%% is unspecified, then %%func%% will execute
     *  in the next event loop.
     *
     *  [Pausing](AbstractProvider-paused) the provider will pause any
     *  associated timers.
     */
    _setTimeout(_func, timeout) {
        if (timeout == null) {
            timeout = 0;
        }
        const timerId = this.#nextTimer++;
        const func = () => {
            this.#timers.delete(timerId);
            _func();
        };
        if (this.paused) {
            this.#timers.set(timerId, { timer: null, func, time: timeout });
        }
        else {
            const timer = setTimeout(func, timeout);
            this.#timers.set(timerId, { timer, func, time: getTime() });
        }
        return timerId;
    }
    /**
     *  Perform %%func%% on each subscriber.
     */
    _forEachSubscriber(func) {
        for (const sub of this.#subs.values()) {
            func(sub.subscriber);
        }
    }
    /**
     *  Sub-classes may override this to customize subscription
     *  implementations.
     */
    _getSubscriber(sub) {
        switch (sub.type) {
            case "debug":
            case "error":
            case "network":
                return new UnmanagedSubscriber(sub.type);
            case "block": {
                const subscriber = new PollingBlockSubscriber(this);
                subscriber.pollingInterval = this.pollingInterval;
                return subscriber;
            }
            case "safe":
            case "finalized":
                return new PollingBlockTagSubscriber(this, sub.type);
            case "event":
                return new PollingEventSubscriber(this, sub.filter);
            case "transaction":
                return new PollingTransactionSubscriber(this, sub.hash);
            case "orphan":
                return new PollingOrphanSubscriber(this, sub.filter);
        }
        throw new Error(`unsupported event: ${sub.type}`);
    }
    /**
     *  If a [[Subscriber]] fails and needs to replace itself, this
     *  method may be used.
     *
     *  For example, this is used for providers when using the
     *  ``eth_getFilterChanges`` method, which can return null if state
     *  filters are not supported by the backend, allowing the Subscriber
     *  to swap in a [[PollingEventSubscriber]].
     */
    _recoverSubscriber(oldSub, newSub) {
        for (const sub of this.#subs.values()) {
            if (sub.subscriber === oldSub) {
                if (sub.started) {
                    sub.subscriber.stop();
                }
                sub.subscriber = newSub;
                if (sub.started) {
                    newSub.start();
                }
                if (this.#pausedState != null) {
                    newSub.pause(this.#pausedState);
                }
                break;
            }
        }
    }
    async #hasSub(event, emitArgs) {
        let sub = await getSubscription(event, this);
        // This is a log that is removing an existing log; we actually want
        // to emit an orphan event for the removed log
        if (sub.type === "event" && emitArgs && emitArgs.length > 0 && emitArgs[0].removed === true) {
            sub = await getSubscription({ orphan: "drop-log", log: emitArgs[0] }, this);
        }
        return this.#subs.get(sub.tag) || null;
    }
    async #getSub(event) {
        const subscription = await getSubscription(event, this);
        // Prevent tampering with our tag in any subclass' _getSubscriber
        const tag = subscription.tag;
        let sub = this.#subs.get(tag);
        if (!sub) {
            const subscriber = this._getSubscriber(subscription);
            const addressableMap = new WeakMap();
            const nameMap = new Map();
            sub = { subscriber, tag, addressableMap, nameMap, started: false, listeners: [] };
            this.#subs.set(tag, sub);
        }
        return sub;
    }
    async on(event, listener) {
        const sub = await this.#getSub(event);
        sub.listeners.push({ listener, once: false });
        if (!sub.started) {
            sub.subscriber.start();
            sub.started = true;
            if (this.#pausedState != null) {
                sub.subscriber.pause(this.#pausedState);
            }
        }
        return this;
    }
    async once(event, listener) {
        const sub = await this.#getSub(event);
        sub.listeners.push({ listener, once: true });
        if (!sub.started) {
            sub.subscriber.start();
            sub.started = true;
            if (this.#pausedState != null) {
                sub.subscriber.pause(this.#pausedState);
            }
        }
        return this;
    }
    async emit(event, ...args) {
        const sub = await this.#hasSub(event, args);
        // If there is not subscription or if a recent emit removed
        // the last of them (which also deleted the sub) do nothing
        if (!sub || sub.listeners.length === 0) {
            return false;
        }
        const count = sub.listeners.length;
        sub.listeners = sub.listeners.filter(({ listener, once }) => {
            const payload = new EventPayload(this, (once ? null : listener), event);
            try {
                listener.call(this, ...args, payload);
            }
            catch (error) { }
            return !once;
        });
        if (sub.listeners.length === 0) {
            if (sub.started) {
                sub.subscriber.stop();
            }
            this.#subs.delete(sub.tag);
        }
        return (count > 0);
    }
    async listenerCount(event) {
        if (event) {
            const sub = await this.#hasSub(event);
            if (!sub) {
                return 0;
            }
            return sub.listeners.length;
        }
        let total = 0;
        for (const { listeners } of this.#subs.values()) {
            total += listeners.length;
        }
        return total;
    }
    async listeners(event) {
        if (event) {
            const sub = await this.#hasSub(event);
            if (!sub) {
                return [];
            }
            return sub.listeners.map(({ listener }) => listener);
        }
        let result = [];
        for (const { listeners } of this.#subs.values()) {
            result = result.concat(listeners.map(({ listener }) => listener));
        }
        return result;
    }
    async off(event, listener) {
        const sub = await this.#hasSub(event);
        if (!sub) {
            return this;
        }
        if (listener) {
            const index = sub.listeners.map(({ listener }) => listener).indexOf(listener);
            if (index >= 0) {
                sub.listeners.splice(index, 1);
            }
        }
        if (!listener || sub.listeners.length === 0) {
            if (sub.started) {
                sub.subscriber.stop();
            }
            this.#subs.delete(sub.tag);
        }
        return this;
    }
    async removeAllListeners(event) {
        if (event) {
            const { tag, started, subscriber } = await this.#getSub(event);
            if (started) {
                subscriber.stop();
            }
            this.#subs.delete(tag);
        }
        else {
            for (const [tag, { started, subscriber }] of this.#subs) {
                if (started) {
                    subscriber.stop();
                }
                this.#subs.delete(tag);
            }
        }
        return this;
    }
    // Alias for "on"
    async addListener(event, listener) {
        return await this.on(event, listener);
    }
    // Alias for "off"
    async removeListener(event, listener) {
        return this.off(event, listener);
    }
    /**
     *  If this provider has been destroyed using the [[destroy]] method.
     *
     *  Once destroyed, all resources are reclaimed, internal event loops
     *  and timers are cleaned up and no further requests may be sent to
     *  the provider.
     */
    get destroyed() {
        return this.#destroyed;
    }
    /**
     *  Sub-classes may use this to shutdown any sockets or release their
     *  resources and reject any pending requests.
     *
     *  Sub-classes **must** call ``super.destroy()``.
     */
    destroy() {
        // Stop all listeners
        this.removeAllListeners();
        // Shut down all tiemrs
        for (const timerId of this.#timers.keys()) {
            this._clearTimeout(timerId);
        }
        this.#destroyed = true;
    }
    /**
     *  Whether the provider is currently paused.
     *
     *  A paused provider will not emit any events, and generally should
     *  not make any requests to the network, but that is up to sub-classes
     *  to manage.
     *
     *  Setting ``paused = true`` is identical to calling ``.pause(false)``,
     *  which will buffer any events that occur while paused until the
     *  provider is unpaused.
     */
    get paused() { return (this.#pausedState != null); }
    set paused(pause) {
        if (!!pause === this.paused) {
            return;
        }
        if (this.paused) {
            this.resume();
        }
        else {
            this.pause(false);
        }
    }
    /**
     *  Pause the provider. If %%dropWhilePaused%%, any events that occur
     *  while paused are dropped, otherwise all events will be emitted once
     *  the provider is unpaused.
     */
    pause(dropWhilePaused) {
        this.#lastBlockNumber = -1;
        if (this.#pausedState != null) {
            if (this.#pausedState == !!dropWhilePaused) {
                return;
            }
            assert(false, "cannot change pause type; resume first", "UNSUPPORTED_OPERATION", {
                operation: "pause"
            });
        }
        this._forEachSubscriber((s) => s.pause(dropWhilePaused));
        this.#pausedState = !!dropWhilePaused;
        for (const timer of this.#timers.values()) {
            // Clear the timer
            if (timer.timer) {
                clearTimeout(timer.timer);
            }
            // Remaining time needed for when we become unpaused
            timer.time = getTime() - timer.time;
        }
    }
    /**
     *  Resume the provider.
     */
    resume() {
        if (this.#pausedState == null) {
            return;
        }
        this._forEachSubscriber((s) => s.resume());
        this.#pausedState = null;
        for (const timer of this.#timers.values()) {
            // Remaining time when we were paused
            let timeout = timer.time;
            if (timeout < 0) {
                timeout = 0;
            }
            // Start time (in cause paused, so we con compute remaininf time)
            timer.time = getTime();
            // Start the timer
            setTimeout(timer.func, timeout);
        }
    }
}
function _parseString(result, start) {
    try {
        const bytes = _parseBytes(result, start);
        if (bytes) {
            return toUtf8String(bytes);
        }
    }
    catch (error) { }
    return null;
}
function _parseBytes(result, start) {
    if (result === "0x") {
        return null;
    }
    try {
        const offset = getNumber(dataSlice(result, start, start + 32));
        const length = getNumber(dataSlice(result, offset, offset + 32));
        return dataSlice(result, offset + 32, offset + 32 + length);
    }
    catch (error) { }
    return null;
}
function numPad(value) {
    const result = toBeArray(value);
    if (result.length > 32) {
        throw new Error("internal; should not happen");
    }
    const padded = new Uint8Array(32);
    padded.set(result, 32 - result.length);
    return padded;
}
function bytesPad(value) {
    if ((value.length % 32) === 0) {
        return value;
    }
    const result = new Uint8Array(Math.ceil(value.length / 32) * 32);
    result.set(value);
    return result;
}
const empty = new Uint8Array([]);
// ABI Encodes a series of (bytes, bytes, ...)
function encodeBytes(datas) {
    const result = [];
    let byteCount = 0;
    // Add place-holders for pointers as we add items
    for (let i = 0; i < datas.length; i++) {
        result.push(empty);
        byteCount += 32;
    }
    for (let i = 0; i < datas.length; i++) {
        const data = getBytes(datas[i]);
        // Update the bytes offset
        result[i] = numPad(byteCount);
        // The length and padded value of data
        result.push(numPad(data.length));
        result.push(bytesPad(data));
        byteCount += 32 + Math.ceil(data.length / 32) * 32;
    }
    return concat(result);
}
const zeros = "0x0000000000000000000000000000000000000000000000000000000000000000";
function parseOffchainLookup(data) {
    const result = {
        sender: "", urls: [], calldata: "", selector: "", extraData: "", errorArgs: []
    };
    assert(dataLength(data) >= 5 * 32, "insufficient OffchainLookup data", "OFFCHAIN_FAULT", {
        reason: "insufficient OffchainLookup data"
    });
    const sender = dataSlice(data, 0, 32);
    assert(dataSlice(sender, 0, 12) === dataSlice(zeros, 0, 12), "corrupt OffchainLookup sender", "OFFCHAIN_FAULT", {
        reason: "corrupt OffchainLookup sender"
    });
    result.sender = dataSlice(sender, 12);
    // Read the URLs from the response
    try {
        const urls = [];
        const urlsOffset = getNumber(dataSlice(data, 32, 64));
        const urlsLength = getNumber(dataSlice(data, urlsOffset, urlsOffset + 32));
        const urlsData = dataSlice(data, urlsOffset + 32);
        for (let u = 0; u < urlsLength; u++) {
            const url = _parseString(urlsData, u * 32);
            if (url == null) {
                throw new Error("abort");
            }
            urls.push(url);
        }
        result.urls = urls;
    }
    catch (error) {
        assert(false, "corrupt OffchainLookup urls", "OFFCHAIN_FAULT", {
            reason: "corrupt OffchainLookup urls"
        });
    }
    // Get the CCIP calldata to forward
    try {
        const calldata = _parseBytes(data, 64);
        if (calldata == null) {
            throw new Error("abort");
        }
        result.calldata = calldata;
    }
    catch (error) {
        assert(false, "corrupt OffchainLookup calldata", "OFFCHAIN_FAULT", {
            reason: "corrupt OffchainLookup calldata"
        });
    }
    // Get the callbackSelector (bytes4)
    assert(dataSlice(data, 100, 128) === dataSlice(zeros, 0, 28), "corrupt OffchainLookup callbaackSelector", "OFFCHAIN_FAULT", {
        reason: "corrupt OffchainLookup callbaackSelector"
    });
    result.selector = dataSlice(data, 96, 100);
    // Get the extra data to send back to the contract as context
    try {
        const extraData = _parseBytes(data, 128);
        if (extraData == null) {
            throw new Error("abort");
        }
        result.extraData = extraData;
    }
    catch (error) {
        assert(false, "corrupt OffchainLookup extraData", "OFFCHAIN_FAULT", {
            reason: "corrupt OffchainLookup extraData"
        });
    }
    result.errorArgs = "sender,urls,calldata,selector,extraData".split(/,/).map((k) => result[k]);
    return result;
}

/**
 *  Generally the [[Wallet]] and [[JsonRpcSigner]] and their sub-classes
 *  are sufficent for most developers, but this is provided to
 *  fascilitate more complex Signers.
 *
 *  @_section: api/providers/abstract-signer: Subclassing Signer [abstract-signer]
 */
function checkProvider(signer, operation) {
    if (signer.provider) {
        return signer.provider;
    }
    assert(false, "missing provider", "UNSUPPORTED_OPERATION", { operation });
}
async function populate(signer, tx) {
    let pop = copyRequest(tx);
    if (pop.to != null) {
        pop.to = resolveAddress(pop.to, signer);
    }
    if (pop.from != null) {
        const from = pop.from;
        pop.from = Promise.all([
            signer.getAddress(),
            resolveAddress(from, signer)
        ]).then(([address, from]) => {
            assertArgument(address.toLowerCase() === from.toLowerCase(), "transaction from mismatch", "tx.from", from);
            return address;
        });
    }
    else {
        pop.from = signer.getAddress();
    }
    return await resolveProperties(pop);
}
/**
 *  An **AbstractSigner** includes most of teh functionality required
 *  to get a [[Signer]] working as expected, but requires a few
 *  Signer-specific methods be overridden.
 *
 */
class AbstractSigner {
    /**
     *  The provider this signer is connected to.
     */
    provider;
    /**
     *  Creates a new Signer connected to %%provider%%.
     */
    constructor(provider) {
        defineProperties(this, { provider: (provider || null) });
    }
    async getNonce(blockTag) {
        return checkProvider(this, "getTransactionCount").getTransactionCount(await this.getAddress(), blockTag);
    }
    async populateCall(tx) {
        const pop = await populate(this, tx);
        return pop;
    }
    async populateTransaction(tx) {
        const provider = checkProvider(this, "populateTransaction");
        const pop = await populate(this, tx);
        if (pop.nonce == null) {
            pop.nonce = await this.getNonce("pending");
        }
        if (pop.gasLimit == null) {
            pop.gasLimit = await this.estimateGas(pop);
        }
        // Populate the chain ID
        const network = await (this.provider).getNetwork();
        if (pop.chainId != null) {
            const chainId = getBigInt(pop.chainId);
            assertArgument(chainId === network.chainId, "transaction chainId mismatch", "tx.chainId", tx.chainId);
        }
        else {
            pop.chainId = network.chainId;
        }
        // Do not allow mixing pre-eip-1559 and eip-1559 properties
        const hasEip1559 = (pop.maxFeePerGas != null || pop.maxPriorityFeePerGas != null);
        if (pop.gasPrice != null && (pop.type === 2 || hasEip1559)) {
            assertArgument(false, "eip-1559 transaction do not support gasPrice", "tx", tx);
        }
        else if ((pop.type === 0 || pop.type === 1) && hasEip1559) {
            assertArgument(false, "pre-eip-1559 transaction do not support maxFeePerGas/maxPriorityFeePerGas", "tx", tx);
        }
        if ((pop.type === 2 || pop.type == null) && (pop.maxFeePerGas != null && pop.maxPriorityFeePerGas != null)) {
            // Fully-formed EIP-1559 transaction (skip getFeeData)
            pop.type = 2;
        }
        else if (pop.type === 0 || pop.type === 1) {
            // Explicit Legacy or EIP-2930 transaction
            // We need to get fee data to determine things
            const feeData = await provider.getFeeData();
            assert(feeData.gasPrice != null, "network does not support gasPrice", "UNSUPPORTED_OPERATION", {
                operation: "getGasPrice"
            });
            // Populate missing gasPrice
            if (pop.gasPrice == null) {
                pop.gasPrice = feeData.gasPrice;
            }
        }
        else {
            // We need to get fee data to determine things
            const feeData = await provider.getFeeData();
            if (pop.type == null) {
                // We need to auto-detect the intended type of this transaction...
                if (feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null) {
                    // The network supports EIP-1559!
                    // Upgrade transaction from null to eip-1559
                    pop.type = 2;
                    if (pop.gasPrice != null) {
                        // Using legacy gasPrice property on an eip-1559 network,
                        // so use gasPrice as both fee properties
                        const gasPrice = pop.gasPrice;
                        delete pop.gasPrice;
                        pop.maxFeePerGas = gasPrice;
                        pop.maxPriorityFeePerGas = gasPrice;
                    }
                    else {
                        // Populate missing fee data
                        if (pop.maxFeePerGas == null) {
                            pop.maxFeePerGas = feeData.maxFeePerGas;
                        }
                        if (pop.maxPriorityFeePerGas == null) {
                            pop.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                        }
                    }
                }
                else if (feeData.gasPrice != null) {
                    // Network doesn't support EIP-1559...
                    // ...but they are trying to use EIP-1559 properties
                    assert(!hasEip1559, "network does not support EIP-1559", "UNSUPPORTED_OPERATION", {
                        operation: "populateTransaction"
                    });
                    // Populate missing fee data
                    if (pop.gasPrice == null) {
                        pop.gasPrice = feeData.gasPrice;
                    }
                    // Explicitly set untyped transaction to legacy
                    // @TODO: Maybe this shold allow type 1?
                    pop.type = 0;
                }
                else {
                    // getFeeData has failed us.
                    assert(false, "failed to get consistent fee data", "UNSUPPORTED_OPERATION", {
                        operation: "signer.getFeeData"
                    });
                }
            }
            else if (pop.type === 2 || pop.type === 3) {
                // Explicitly using EIP-1559 or EIP-4844
                // Populate missing fee data
                if (pop.maxFeePerGas == null) {
                    pop.maxFeePerGas = feeData.maxFeePerGas;
                }
                if (pop.maxPriorityFeePerGas == null) {
                    pop.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
                }
            }
        }
        //@TOOD: Don't await all over the place; save them up for
        // the end for better batching
        return await resolveProperties(pop);
    }
    async estimateGas(tx) {
        return checkProvider(this, "estimateGas").estimateGas(await this.populateCall(tx));
    }
    async call(tx) {
        return checkProvider(this, "call").call(await this.populateCall(tx));
    }
    async resolveName(name) {
        const provider = checkProvider(this, "resolveName");
        return await provider.resolveName(name);
    }
    async sendTransaction(tx) {
        const provider = checkProvider(this, "sendTransaction");
        const pop = await this.populateTransaction(tx);
        delete pop.from;
        const txObj = Transaction.from(pop);
        return await provider.broadcastTransaction(await this.signTransaction(txObj));
    }
}

function copy(obj) {
    return JSON.parse(JSON.stringify(obj));
}
/**
 *  Some backends support subscribing to events using a Filter ID.
 *
 *  When subscribing with this technique, the node issues a unique
 *  //Filter ID//. At this point the node dedicates resources to
 *  the filter, so that periodic calls to follow up on the //Filter ID//
 *  will receive any events since the last call.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class FilterIdSubscriber {
    #provider;
    #filterIdPromise;
    #poller;
    #running;
    #network;
    #hault;
    /**
     *  Creates a new **FilterIdSubscriber** which will used [[_subscribe]]
     *  and [[_emitResults]] to setup the subscription and provide the event
     *  to the %%provider%%.
     */
    constructor(provider) {
        this.#provider = provider;
        this.#filterIdPromise = null;
        this.#poller = this.#poll.bind(this);
        this.#running = false;
        this.#network = null;
        this.#hault = false;
    }
    /**
     *  Sub-classes **must** override this to begin the subscription.
     */
    _subscribe(provider) {
        throw new Error("subclasses must override this");
    }
    /**
     *  Sub-classes **must** override this handle the events.
     */
    _emitResults(provider, result) {
        throw new Error("subclasses must override this");
    }
    /**
     *  Sub-classes **must** override this handle recovery on errors.
     */
    _recover(provider) {
        throw new Error("subclasses must override this");
    }
    async #poll(blockNumber) {
        try {
            // Subscribe if necessary
            if (this.#filterIdPromise == null) {
                this.#filterIdPromise = this._subscribe(this.#provider);
            }
            // Get the Filter ID
            let filterId = null;
            try {
                filterId = await this.#filterIdPromise;
            }
            catch (error) {
                if (!isError(error, "UNSUPPORTED_OPERATION") || error.operation !== "eth_newFilter") {
                    throw error;
                }
            }
            // The backend does not support Filter ID; downgrade to
            // polling
            if (filterId == null) {
                this.#filterIdPromise = null;
                this.#provider._recoverSubscriber(this, this._recover(this.#provider));
                return;
            }
            const network = await this.#provider.getNetwork();
            if (!this.#network) {
                this.#network = network;
            }
            if (this.#network.chainId !== network.chainId) {
                throw new Error("chaid changed");
            }
            if (this.#hault) {
                return;
            }
            const result = await this.#provider.send("eth_getFilterChanges", [filterId]);
            await this._emitResults(this.#provider, result);
        }
        catch (error) {
            console.log("@TODO", error);
        }
        this.#provider.once("block", this.#poller);
    }
    #teardown() {
        const filterIdPromise = this.#filterIdPromise;
        if (filterIdPromise) {
            this.#filterIdPromise = null;
            filterIdPromise.then((filterId) => {
                if (this.#provider.destroyed) {
                    return;
                }
                this.#provider.send("eth_uninstallFilter", [filterId]);
            });
        }
    }
    start() {
        if (this.#running) {
            return;
        }
        this.#running = true;
        this.#poll(-2);
    }
    stop() {
        if (!this.#running) {
            return;
        }
        this.#running = false;
        this.#hault = true;
        this.#teardown();
        this.#provider.off("block", this.#poller);
    }
    pause(dropWhilePaused) {
        if (dropWhilePaused) {
            this.#teardown();
        }
        this.#provider.off("block", this.#poller);
    }
    resume() { this.start(); }
}
/**
 *  A **FilterIdSubscriber** for receiving contract events.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class FilterIdEventSubscriber extends FilterIdSubscriber {
    #event;
    /**
     *  Creates a new **FilterIdEventSubscriber** attached to %%provider%%
     *  listening for %%filter%%.
     */
    constructor(provider, filter) {
        super(provider);
        this.#event = copy(filter);
    }
    _recover(provider) {
        return new PollingEventSubscriber(provider, this.#event);
    }
    async _subscribe(provider) {
        const filterId = await provider.send("eth_newFilter", [this.#event]);
        return filterId;
    }
    async _emitResults(provider, results) {
        for (const result of results) {
            provider.emit(this.#event, provider._wrapLog(result, provider._network));
        }
    }
}
/**
 *  A **FilterIdSubscriber** for receiving pending transactions events.
 *
 *  @_docloc: api/providers/abstract-provider
 */
class FilterIdPendingSubscriber extends FilterIdSubscriber {
    async _subscribe(provider) {
        return await provider.send("eth_newPendingTransactionFilter", []);
    }
    async _emitResults(provider, results) {
        for (const result of results) {
            provider.emit("pending", result);
        }
    }
}

/**
 *  One of the most common ways to interact with the blockchain is
 *  by a node running a JSON-RPC interface which can be connected to,
 *  based on the transport, using:
 *
 *  - HTTP or HTTPS - [[JsonRpcProvider]]
 *  - WebSocket - [[WebSocketProvider]]
 *  - IPC - [[IpcSocketProvider]]
 *
 * @_section: api/providers/jsonrpc:JSON-RPC Provider  [about-jsonrpcProvider]
 */
// @TODO:
// - Add the batching API
// https://playground.open-rpc.org/?schemaUrl=https://raw.githubusercontent.com/ethereum/eth1.0-apis/assembled-spec/openrpc.json&uiSchema%5BappBar%5D%5Bui:splitView%5D=true&uiSchema%5BappBar%5D%5Bui:input%5D=false&uiSchema%5BappBar%5D%5Bui:examplesDropdown%5D=false
const Primitive = "bigint,boolean,function,number,string,symbol".split(/,/g);
//const Methods = "getAddress,then".split(/,/g);
function deepCopy(value) {
    if (value == null || Primitive.indexOf(typeof (value)) >= 0) {
        return value;
    }
    // Keep any Addressable
    if (typeof (value.getAddress) === "function") {
        return value;
    }
    if (Array.isArray(value)) {
        return (value.map(deepCopy));
    }
    if (typeof (value) === "object") {
        return Object.keys(value).reduce((accum, key) => {
            accum[key] = value[key];
            return accum;
        }, {});
    }
    throw new Error(`should not happen: ${value} (${typeof (value)})`);
}
function stall(duration) {
    return new Promise((resolve) => { setTimeout(resolve, duration); });
}
function getLowerCase(value) {
    if (value) {
        return value.toLowerCase();
    }
    return value;
}
function isPollable(value) {
    return (value && typeof (value.pollingInterval) === "number");
}
const defaultOptions = {
    polling: false,
    staticNetwork: null,
    batchStallTime: 10,
    batchMaxSize: (1 << 20),
    batchMaxCount: 100,
    cacheTimeout: 250,
    pollingInterval: 4000
};
// @TODO: Unchecked Signers
class JsonRpcSigner extends AbstractSigner {
    address;
    constructor(provider, address) {
        super(provider);
        address = getAddress(address);
        defineProperties(this, { address });
    }
    connect(provider) {
        assert(false, "cannot reconnect JsonRpcSigner", "UNSUPPORTED_OPERATION", {
            operation: "signer.connect"
        });
    }
    async getAddress() {
        return this.address;
    }
    // JSON-RPC will automatially fill in nonce, etc. so we just check from
    async populateTransaction(tx) {
        return await this.populateCall(tx);
    }
    // Returns just the hash of the transaction after sent, which is what
    // the bare JSON-RPC API does;
    async sendUncheckedTransaction(_tx) {
        const tx = deepCopy(_tx);
        const promises = [];
        // Make sure the from matches the sender
        if (tx.from) {
            const _from = tx.from;
            promises.push((async () => {
                const from = await resolveAddress(_from, this.provider);
                assertArgument(from != null && from.toLowerCase() === this.address.toLowerCase(), "from address mismatch", "transaction", _tx);
                tx.from = from;
            })());
        }
        else {
            tx.from = this.address;
        }
        // The JSON-RPC for eth_sendTransaction uses 90000 gas; if the user
        // wishes to use this, it is easy to specify explicitly, otherwise
        // we look it up for them.
        if (tx.gasLimit == null) {
            promises.push((async () => {
                tx.gasLimit = await this.provider.estimateGas({ ...tx, from: this.address });
            })());
        }
        // The address may be an ENS name or Addressable
        if (tx.to != null) {
            const _to = tx.to;
            promises.push((async () => {
                tx.to = await resolveAddress(_to, this.provider);
            })());
        }
        // Wait until all of our properties are filled in
        if (promises.length) {
            await Promise.all(promises);
        }
        const hexTx = this.provider.getRpcTransaction(tx);
        return this.provider.send("eth_sendTransaction", [hexTx]);
    }
    async sendTransaction(tx) {
        // This cannot be mined any earlier than any recent block
        const blockNumber = await this.provider.getBlockNumber();
        // Send the transaction
        const hash = await this.sendUncheckedTransaction(tx);
        // Unfortunately, JSON-RPC only provides and opaque transaction hash
        // for a response, and we need the actual transaction, so we poll
        // for it; it should show up very quickly
        return await (new Promise((resolve, reject) => {
            const timeouts = [1000, 100];
            let invalids = 0;
            const checkTx = async () => {
                try {
                    // Try getting the transaction
                    const tx = await this.provider.getTransaction(hash);
                    if (tx != null) {
                        resolve(tx.replaceableTransaction(blockNumber));
                        return;
                    }
                }
                catch (error) {
                    // If we were cancelled: stop polling.
                    // If the data is bad: the node returns bad transactions
                    // If the network changed: calling again will also fail
                    // If unsupported: likely destroyed
                    if (isError(error, "CANCELLED") || isError(error, "BAD_DATA") ||
                        isError(error, "NETWORK_ERROR" )) {
                        if (error.info == null) {
                            error.info = {};
                        }
                        error.info.sendTransactionHash = hash;
                        reject(error);
                        return;
                    }
                    // Stop-gap for misbehaving backends; see #4513
                    if (isError(error, "INVALID_ARGUMENT")) {
                        invalids++;
                        if (error.info == null) {
                            error.info = {};
                        }
                        error.info.sendTransactionHash = hash;
                        if (invalids > 10) {
                            reject(error);
                            return;
                        }
                    }
                    // Notify anyone that cares; but we will try again, since
                    // it is likely an intermittent service error
                    this.provider.emit("error", makeError("failed to fetch transation after sending (will try again)", "UNKNOWN_ERROR", { error }));
                }
                // Wait another 4 seconds
                this.provider._setTimeout(() => { checkTx(); }, timeouts.pop() || 4000);
            };
            checkTx();
        }));
    }
    async signTransaction(_tx) {
        const tx = deepCopy(_tx);
        // Make sure the from matches the sender
        if (tx.from) {
            const from = await resolveAddress(tx.from, this.provider);
            assertArgument(from != null && from.toLowerCase() === this.address.toLowerCase(), "from address mismatch", "transaction", _tx);
            tx.from = from;
        }
        else {
            tx.from = this.address;
        }
        const hexTx = this.provider.getRpcTransaction(tx);
        return await this.provider.send("eth_signTransaction", [hexTx]);
    }
    async signMessage(_message) {
        const message = ((typeof (_message) === "string") ? toUtf8Bytes(_message) : _message);
        return await this.provider.send("personal_sign", [
            hexlify(message), this.address.toLowerCase()
        ]);
    }
    async signTypedData(domain, types, _value) {
        const value = deepCopy(_value);
        // Populate any ENS names (in-place)
        const populated = await TypedDataEncoder.resolveNames(domain, types, value, async (value) => {
            const address = await resolveAddress(value);
            assertArgument(address != null, "TypedData does not support null address", "value", value);
            return address;
        });
        return await this.provider.send("eth_signTypedData_v4", [
            this.address.toLowerCase(),
            JSON.stringify(TypedDataEncoder.getPayload(populated.domain, types, populated.value))
        ]);
    }
    async unlock(password) {
        return this.provider.send("personal_unlockAccount", [
            this.address.toLowerCase(), password, null
        ]);
    }
    // https://github.com/ethereum/wiki/wiki/JSON-RPC#eth_sign
    async _legacySignMessage(_message) {
        const message = ((typeof (_message) === "string") ? toUtf8Bytes(_message) : _message);
        return await this.provider.send("eth_sign", [
            this.address.toLowerCase(), hexlify(message)
        ]);
    }
}
/**
 *  The JsonRpcApiProvider is an abstract class and **MUST** be
 *  sub-classed.
 *
 *  It provides the base for all JSON-RPC-based Provider interaction.
 *
 *  Sub-classing Notes:
 *  - a sub-class MUST override _send
 *  - a sub-class MUST call the `_start()` method once connected
 */
class JsonRpcApiProvider extends AbstractProvider {
    #options;
    // The next ID to use for the JSON-RPC ID field
    #nextId;
    // Payloads are queued and triggered in batches using the drainTimer
    #payloads;
    #drainTimer;
    #notReady;
    #network;
    #pendingDetectNetwork;
    #scheduleDrain() {
        if (this.#drainTimer) {
            return;
        }
        // If we aren't using batching, no harm in sending it immediately
        const stallTime = (this._getOption("batchMaxCount") === 1) ? 0 : this._getOption("batchStallTime");
        this.#drainTimer = setTimeout(() => {
            this.#drainTimer = null;
            const payloads = this.#payloads;
            this.#payloads = [];
            while (payloads.length) {
                // Create payload batches that satisfy our batch constraints
                const batch = [(payloads.shift())];
                while (payloads.length) {
                    if (batch.length === this.#options.batchMaxCount) {
                        break;
                    }
                    batch.push((payloads.shift()));
                    const bytes = JSON.stringify(batch.map((p) => p.payload));
                    if (bytes.length > this.#options.batchMaxSize) {
                        payloads.unshift((batch.pop()));
                        break;
                    }
                }
                // Process the result to each payload
                (async () => {
                    const payload = ((batch.length === 1) ? batch[0].payload : batch.map((p) => p.payload));
                    this.emit("debug", { action: "sendRpcPayload", payload });
                    try {
                        const result = await this._send(payload);
                        this.emit("debug", { action: "receiveRpcResult", result });
                        // Process results in batch order
                        for (const { resolve, reject, payload } of batch) {
                            if (this.destroyed) {
                                reject(makeError("provider destroyed; cancelled request", "UNSUPPORTED_OPERATION", { operation: payload.method }));
                                continue;
                            }
                            // Find the matching result
                            const resp = result.filter((r) => (r.id === payload.id))[0];
                            // No result; the node failed us in unexpected ways
                            if (resp == null) {
                                const error = makeError("missing response for request", "BAD_DATA", {
                                    value: result, info: { payload }
                                });
                                this.emit("error", error);
                                reject(error);
                                continue;
                            }
                            // The response is an error
                            if ("error" in resp) {
                                reject(this.getRpcError(payload, resp));
                                continue;
                            }
                            // All good; send the result
                            resolve(resp.result);
                        }
                    }
                    catch (error) {
                        this.emit("debug", { action: "receiveRpcError", error });
                        for (const { reject } of batch) {
                            // @TODO: augment the error with the payload
                            reject(error);
                        }
                    }
                })();
            }
        }, stallTime);
    }
    constructor(network, options) {
        super(network, options);
        this.#nextId = 1;
        this.#options = Object.assign({}, defaultOptions, options || {});
        this.#payloads = [];
        this.#drainTimer = null;
        this.#network = null;
        this.#pendingDetectNetwork = null;
        {
            let resolve = null;
            const promise = new Promise((_resolve) => {
                resolve = _resolve;
            });
            this.#notReady = { promise, resolve };
        }
        const staticNetwork = this._getOption("staticNetwork");
        if (typeof (staticNetwork) === "boolean") {
            assertArgument(!staticNetwork || network !== "any", "staticNetwork cannot be used on special network 'any'", "options", options);
            if (staticNetwork && network != null) {
                this.#network = Network.from(network);
            }
        }
        else if (staticNetwork) {
            // Make sure any static network is compatbile with the provided netwrok
            assertArgument(network == null || staticNetwork.matches(network), "staticNetwork MUST match network object", "options", options);
            this.#network = staticNetwork;
        }
    }
    /**
     *  Returns the value associated with the option %%key%%.
     *
     *  Sub-classes can use this to inquire about configuration options.
     */
    _getOption(key) {
        return this.#options[key];
    }
    /**
     *  Gets the [[Network]] this provider has committed to. On each call, the network
     *  is detected, and if it has changed, the call will reject.
     */
    get _network() {
        assert(this.#network, "network is not available yet", "NETWORK_ERROR");
        return this.#network;
    }
    /**
     *  Resolves to the non-normalized value by performing %%req%%.
     *
     *  Sub-classes may override this to modify behavior of actions,
     *  and should generally call ``super._perform`` as a fallback.
     */
    async _perform(req) {
        // Legacy networks do not like the type field being passed along (which
        // is fair), so we delete type if it is 0 and a non-EIP-1559 network
        if (req.method === "call" || req.method === "estimateGas") {
            let tx = req.transaction;
            if (tx && tx.type != null && getBigInt(tx.type)) {
                // If there are no EIP-1559 or newer properties, it might be pre-EIP-1559
                if (tx.maxFeePerGas == null && tx.maxPriorityFeePerGas == null) {
                    const feeData = await this.getFeeData();
                    if (feeData.maxFeePerGas == null && feeData.maxPriorityFeePerGas == null) {
                        // Network doesn't know about EIP-1559 (and hence type)
                        req = Object.assign({}, req, {
                            transaction: Object.assign({}, tx, { type: undefined })
                        });
                    }
                }
            }
        }
        const request = this.getRpcRequest(req);
        if (request != null) {
            return await this.send(request.method, request.args);
        }
        return super._perform(req);
    }
    /**
     *  Sub-classes may override this; it detects the *actual* network that
     *  we are **currently** connected to.
     *
     *  Keep in mind that [[send]] may only be used once [[ready]], otherwise the
     *  _send primitive must be used instead.
     */
    async _detectNetwork() {
        const network = this._getOption("staticNetwork");
        if (network) {
            if (network === true) {
                if (this.#network) {
                    return this.#network;
                }
            }
            else {
                return network;
            }
        }
        if (this.#pendingDetectNetwork) {
            return await this.#pendingDetectNetwork;
        }
        // If we are ready, use ``send``, which enabled requests to be batched
        if (this.ready) {
            this.#pendingDetectNetwork = (async () => {
                try {
                    const result = Network.from(getBigInt(await this.send("eth_chainId", [])));
                    this.#pendingDetectNetwork = null;
                    return result;
                }
                catch (error) {
                    this.#pendingDetectNetwork = null;
                    throw error;
                }
            })();
            return await this.#pendingDetectNetwork;
        }
        // We are not ready yet; use the primitive _send
        this.#pendingDetectNetwork = (async () => {
            const payload = {
                id: this.#nextId++, method: "eth_chainId", params: [], jsonrpc: "2.0"
            };
            this.emit("debug", { action: "sendRpcPayload", payload });
            let result;
            try {
                result = (await this._send(payload))[0];
                this.#pendingDetectNetwork = null;
            }
            catch (error) {
                this.#pendingDetectNetwork = null;
                this.emit("debug", { action: "receiveRpcError", error });
                throw error;
            }
            this.emit("debug", { action: "receiveRpcResult", result });
            if ("result" in result) {
                return Network.from(getBigInt(result.result));
            }
            throw this.getRpcError(payload, result);
        })();
        return await this.#pendingDetectNetwork;
    }
    /**
     *  Sub-classes **MUST** call this. Until [[_start]] has been called, no calls
     *  will be passed to [[_send]] from [[send]]. If it is overridden, then
     *  ``super._start()`` **MUST** be called.
     *
     *  Calling it multiple times is safe and has no effect.
     */
    _start() {
        if (this.#notReady == null || this.#notReady.resolve == null) {
            return;
        }
        this.#notReady.resolve();
        this.#notReady = null;
        (async () => {
            // Bootstrap the network
            while (this.#network == null && !this.destroyed) {
                try {
                    this.#network = await this._detectNetwork();
                }
                catch (error) {
                    if (this.destroyed) {
                        break;
                    }
                    console.log("JsonRpcProvider failed to detect network and cannot start up; retry in 1s (perhaps the URL is wrong or the node is not started)");
                    this.emit("error", makeError("failed to bootstrap network detection", "NETWORK_ERROR", { event: "initial-network-discovery", info: { error } }));
                    await stall(1000);
                }
            }
            // Start dispatching requests
            this.#scheduleDrain();
        })();
    }
    /**
     *  Resolves once the [[_start]] has been called. This can be used in
     *  sub-classes to defer sending data until the connection has been
     *  established.
     */
    async _waitUntilReady() {
        if (this.#notReady == null) {
            return;
        }
        return await this.#notReady.promise;
    }
    /**
     *  Return a Subscriber that will manage the %%sub%%.
     *
     *  Sub-classes may override this to modify the behavior of
     *  subscription management.
     */
    _getSubscriber(sub) {
        // Pending Filters aren't availble via polling
        if (sub.type === "pending") {
            return new FilterIdPendingSubscriber(this);
        }
        if (sub.type === "event") {
            if (this._getOption("polling")) {
                return new PollingEventSubscriber(this, sub.filter);
            }
            return new FilterIdEventSubscriber(this, sub.filter);
        }
        // Orphaned Logs are handled automatically, by the filter, since
        // logs with removed are emitted by it
        if (sub.type === "orphan" && sub.filter.orphan === "drop-log") {
            return new UnmanagedSubscriber("orphan");
        }
        return super._getSubscriber(sub);
    }
    /**
     *  Returns true only if the [[_start]] has been called.
     */
    get ready() { return this.#notReady == null; }
    /**
     *  Returns %%tx%% as a normalized JSON-RPC transaction request,
     *  which has all values hexlified and any numeric values converted
     *  to Quantity values.
     */
    getRpcTransaction(tx) {
        const result = {};
        // JSON-RPC now requires numeric values to be "quantity" values
        ["chainId", "gasLimit", "gasPrice", "type", "maxFeePerGas", "maxPriorityFeePerGas", "nonce", "value"].forEach((key) => {
            if (tx[key] == null) {
                return;
            }
            let dstKey = key;
            if (key === "gasLimit") {
                dstKey = "gas";
            }
            result[dstKey] = toQuantity(getBigInt(tx[key], `tx.${key}`));
        });
        // Make sure addresses and data are lowercase
        ["from", "to", "data"].forEach((key) => {
            if (tx[key] == null) {
                return;
            }
            result[key] = hexlify(tx[key]);
        });
        // Normalize the access list object
        if (tx.accessList) {
            result["accessList"] = accessListify(tx.accessList);
        }
        if (tx.blobVersionedHashes) {
            // @TODO: Remove this <any> case once EIP-4844 added to prepared tx
            result["blobVersionedHashes"] = tx.blobVersionedHashes.map(h => h.toLowerCase());
        }
        // @TODO: blobs should probably also be copied over, optionally
        // accounting for the kzg property to backfill blobVersionedHashes
        // using the commitment. Or should that be left as an exercise to
        // the caller?
        return result;
    }
    /**
     *  Returns the request method and arguments required to perform
     *  %%req%%.
     */
    getRpcRequest(req) {
        switch (req.method) {
            case "chainId":
                return { method: "eth_chainId", args: [] };
            case "getBlockNumber":
                return { method: "eth_blockNumber", args: [] };
            case "getGasPrice":
                return { method: "eth_gasPrice", args: [] };
            case "getPriorityFee":
                return { method: "eth_maxPriorityFeePerGas", args: [] };
            case "getBalance":
                return {
                    method: "eth_getBalance",
                    args: [getLowerCase(req.address), req.blockTag]
                };
            case "getTransactionCount":
                return {
                    method: "eth_getTransactionCount",
                    args: [getLowerCase(req.address), req.blockTag]
                };
            case "getCode":
                return {
                    method: "eth_getCode",
                    args: [getLowerCase(req.address), req.blockTag]
                };
            case "getStorage":
                return {
                    method: "eth_getStorageAt",
                    args: [
                        getLowerCase(req.address),
                        ("0x" + req.position.toString(16)),
                        req.blockTag
                    ]
                };
            case "broadcastTransaction":
                return {
                    method: "eth_sendRawTransaction",
                    args: [req.signedTransaction]
                };
            case "getBlock":
                if ("blockTag" in req) {
                    return {
                        method: "eth_getBlockByNumber",
                        args: [req.blockTag, !!req.includeTransactions]
                    };
                }
                else if ("blockHash" in req) {
                    return {
                        method: "eth_getBlockByHash",
                        args: [req.blockHash, !!req.includeTransactions]
                    };
                }
                break;
            case "getTransaction":
                return {
                    method: "eth_getTransactionByHash",
                    args: [req.hash]
                };
            case "getTransactionReceipt":
                return {
                    method: "eth_getTransactionReceipt",
                    args: [req.hash]
                };
            case "call":
                return {
                    method: "eth_call",
                    args: [this.getRpcTransaction(req.transaction), req.blockTag]
                };
            case "estimateGas": {
                return {
                    method: "eth_estimateGas",
                    args: [this.getRpcTransaction(req.transaction)]
                };
            }
            case "getLogs":
                if (req.filter && req.filter.address != null) {
                    if (Array.isArray(req.filter.address)) {
                        req.filter.address = req.filter.address.map(getLowerCase);
                    }
                    else {
                        req.filter.address = getLowerCase(req.filter.address);
                    }
                }
                return { method: "eth_getLogs", args: [req.filter] };
        }
        return null;
    }
    /**
     *  Returns an ethers-style Error for the given JSON-RPC error
     *  %%payload%%, coalescing the various strings and error shapes
     *  that different nodes return, coercing them into a machine-readable
     *  standardized error.
     */
    getRpcError(payload, _error) {
        const { method } = payload;
        const { error } = _error;
        if (method === "eth_estimateGas" && error.message) {
            const msg = error.message;
            if (!msg.match(/revert/i) && msg.match(/insufficient funds/i)) {
                return makeError("insufficient funds", "INSUFFICIENT_FUNDS", {
                    transaction: (payload.params[0]),
                    info: { payload, error }
                });
            }
        }
        if (method === "eth_call" || method === "eth_estimateGas") {
            const result = spelunkData(error);
            const e = AbiCoder.getBuiltinCallException((method === "eth_call") ? "call" : "estimateGas", (payload.params[0]), (result ? result.data : null));
            e.info = { error, payload };
            return e;
        }
        // Only estimateGas and call can return arbitrary contract-defined text, so now we
        // we can process text safely.
        const message = JSON.stringify(spelunkMessage(error));
        if (typeof (error.message) === "string" && error.message.match(/user denied|ethers-user-denied/i)) {
            const actionMap = {
                eth_sign: "signMessage",
                personal_sign: "signMessage",
                eth_signTypedData_v4: "signTypedData",
                eth_signTransaction: "signTransaction",
                eth_sendTransaction: "sendTransaction",
                eth_requestAccounts: "requestAccess",
                wallet_requestAccounts: "requestAccess",
            };
            return makeError(`user rejected action`, "ACTION_REJECTED", {
                action: (actionMap[method] || "unknown"),
                reason: "rejected",
                info: { payload, error }
            });
        }
        if (method === "eth_sendRawTransaction" || method === "eth_sendTransaction") {
            const transaction = (payload.params[0]);
            if (message.match(/insufficient funds|base fee exceeds gas limit/i)) {
                return makeError("insufficient funds for intrinsic transaction cost", "INSUFFICIENT_FUNDS", {
                    transaction, info: { error }
                });
            }
            if (message.match(/nonce/i) && message.match(/too low/i)) {
                return makeError("nonce has already been used", "NONCE_EXPIRED", { transaction, info: { error } });
            }
            // "replacement transaction underpriced"
            if (message.match(/replacement transaction/i) && message.match(/underpriced/i)) {
                return makeError("replacement fee too low", "REPLACEMENT_UNDERPRICED", { transaction, info: { error } });
            }
            if (message.match(/only replay-protected/i)) {
                return makeError("legacy pre-eip-155 transactions not supported", "UNSUPPORTED_OPERATION", {
                    operation: method, info: { transaction, info: { error } }
                });
            }
        }
        let unsupported = !!message.match(/the method .* does not exist/i);
        if (!unsupported) {
            if (error && error.details && error.details.startsWith("Unauthorized method:")) {
                unsupported = true;
            }
        }
        if (unsupported) {
            return makeError("unsupported operation", "UNSUPPORTED_OPERATION", {
                operation: payload.method, info: { error, payload }
            });
        }
        return makeError("could not coalesce error", "UNKNOWN_ERROR", { error, payload });
    }
    /**
     *  Requests the %%method%% with %%params%% via the JSON-RPC protocol
     *  over the underlying channel. This can be used to call methods
     *  on the backend that do not have a high-level API within the Provider
     *  API.
     *
     *  This method queues requests according to the batch constraints
     *  in the options, assigns the request a unique ID.
     *
     *  **Do NOT override** this method in sub-classes; instead
     *  override [[_send]] or force the options values in the
     *  call to the constructor to modify this method's behavior.
     */
    send(method, params) {
        // @TODO: cache chainId?? purge on switch_networks
        // We have been destroyed; no operations are supported anymore
        if (this.destroyed) {
            return Promise.reject(makeError("provider destroyed; cancelled request", "UNSUPPORTED_OPERATION", { operation: method }));
        }
        const id = this.#nextId++;
        const promise = new Promise((resolve, reject) => {
            this.#payloads.push({
                resolve, reject,
                payload: { method, params, id, jsonrpc: "2.0" }
            });
        });
        // If there is not a pending drainTimer, set one
        this.#scheduleDrain();
        return promise;
    }
    /**
     *  Resolves to the [[Signer]] account for  %%address%% managed by
     *  the client.
     *
     *  If the %%address%% is a number, it is used as an index in the
     *  the accounts from [[listAccounts]].
     *
     *  This can only be used on clients which manage accounts (such as
     *  Geth with imported account or MetaMask).
     *
     *  Throws if the account doesn't exist.
     */
    async getSigner(address) {
        if (address == null) {
            address = 0;
        }
        const accountsPromise = this.send("eth_accounts", []);
        // Account index
        if (typeof (address) === "number") {
            const accounts = (await accountsPromise);
            if (address >= accounts.length) {
                throw new Error("no such account");
            }
            return new JsonRpcSigner(this, accounts[address]);
        }
        const { accounts } = await resolveProperties({
            network: this.getNetwork(),
            accounts: accountsPromise
        });
        // Account address
        address = getAddress(address);
        for (const account of accounts) {
            if (getAddress(account) === address) {
                return new JsonRpcSigner(this, address);
            }
        }
        throw new Error("invalid account");
    }
    async listAccounts() {
        const accounts = await this.send("eth_accounts", []);
        return accounts.map((a) => new JsonRpcSigner(this, a));
    }
    destroy() {
        // Stop processing requests
        if (this.#drainTimer) {
            clearTimeout(this.#drainTimer);
            this.#drainTimer = null;
        }
        // Cancel all pending requests
        for (const { payload, reject } of this.#payloads) {
            reject(makeError("provider destroyed; cancelled request", "UNSUPPORTED_OPERATION", { operation: payload.method }));
        }
        this.#payloads = [];
        // Parent clean-up
        super.destroy();
    }
}
// @TODO: remove this in v7, it is not exported because this functionality
// is exposed in the JsonRpcApiProvider by setting polling to true. It should
// be safe to remove regardless, because it isn't reachable, but just in case.
/**
 *  @_ignore:
 */
class JsonRpcApiPollingProvider extends JsonRpcApiProvider {
    #pollingInterval;
    constructor(network, options) {
        super(network, options);
        let pollingInterval = this._getOption("pollingInterval");
        if (pollingInterval == null) {
            pollingInterval = defaultOptions.pollingInterval;
        }
        this.#pollingInterval = pollingInterval;
    }
    _getSubscriber(sub) {
        const subscriber = super._getSubscriber(sub);
        if (isPollable(subscriber)) {
            subscriber.pollingInterval = this.#pollingInterval;
        }
        return subscriber;
    }
    /**
     *  The polling interval (default: 4000 ms)
     */
    get pollingInterval() { return this.#pollingInterval; }
    set pollingInterval(value) {
        if (!Number.isInteger(value) || value < 0) {
            throw new Error("invalid interval");
        }
        this.#pollingInterval = value;
        this._forEachSubscriber((sub) => {
            if (isPollable(sub)) {
                sub.pollingInterval = this.#pollingInterval;
            }
        });
    }
}
/**
 *  The JsonRpcProvider is one of the most common Providers,
 *  which performs all operations over HTTP (or HTTPS) requests.
 *
 *  Events are processed by polling the backend for the current block
 *  number; when it advances, all block-base events are then checked
 *  for updates.
 */
class JsonRpcProvider extends JsonRpcApiPollingProvider {
    #connect;
    constructor(url, network, options) {
        if (url == null) {
            url = "http:/\/localhost:8545";
        }
        super(network, options);
        if (typeof (url) === "string") {
            this.#connect = new FetchRequest(url);
        }
        else {
            this.#connect = url.clone();
        }
    }
    _getConnection() {
        return this.#connect.clone();
    }
    async send(method, params) {
        // All requests are over HTTP, so we can just start handling requests
        // We do this here rather than the constructor so that we don't send any
        // requests to the network (i.e. eth_chainId) until we absolutely have to.
        await this._start();
        return await super.send(method, params);
    }
    async _send(payload) {
        // Configure a POST connection for the requested method
        const request = this._getConnection();
        request.body = JSON.stringify(payload);
        request.setHeader("content-type", "application/json");
        const response = await request.send();
        response.assertOk();
        let resp = response.bodyJson;
        if (!Array.isArray(resp)) {
            resp = [resp];
        }
        return resp;
    }
}
function spelunkData(value) {
    if (value == null) {
        return null;
    }
    // These *are* the droids we're looking for.
    if (typeof (value.message) === "string" && value.message.match(/revert/i) && isHexString(value.data)) {
        return { message: value.message, data: value.data };
    }
    // Spelunk further...
    if (typeof (value) === "object") {
        for (const key in value) {
            const result = spelunkData(value[key]);
            if (result) {
                return result;
            }
        }
        return null;
    }
    // Might be a JSON string we can further descend...
    if (typeof (value) === "string") {
        try {
            return spelunkData(JSON.parse(value));
        }
        catch (error) { }
    }
    return null;
}
function _spelunkMessage(value, result) {
    if (value == null) {
        return;
    }
    // These *are* the droids we're looking for.
    if (typeof (value.message) === "string") {
        result.push(value.message);
    }
    // Spelunk further...
    if (typeof (value) === "object") {
        for (const key in value) {
            _spelunkMessage(value[key], result);
        }
    }
    // Might be a JSON string we can further descend...
    if (typeof (value) === "string") {
        try {
            return _spelunkMessage(JSON.parse(value), result);
        }
        catch (error) { }
    }
}
function spelunkMessage(value) {
    const result = [];
    _spelunkMessage(value, result);
    return result;
}

/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
const _abi$1 = [
    {
        inputs: [
            {
                internalType: "uint256",
                name: "blocksPerEpoch_",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "deployDelay_",
                type: "uint256",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "InvalidSubmission",
        type: "error",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "price",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "paid",
                type: "uint256",
            },
        ],
        name: "NotEnoughFee",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "index",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "startMerkleRoot",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "submissionIndex",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "flowLength",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "context",
                type: "bytes32",
            },
        ],
        name: "NewEpoch",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "Paused",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "previousAdminRole",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "newAdminRole",
                type: "bytes32",
            },
        ],
        name: "RoleAdminChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleGranted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleRevoked",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "identity",
                type: "bytes32",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "submissionIndex",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "startPos",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "length",
                type: "uint256",
            },
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "length",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes",
                        name: "tags",
                        type: "bytes",
                    },
                    {
                        components: [
                            {
                                internalType: "bytes32",
                                name: "root",
                                type: "bytes32",
                            },
                            {
                                internalType: "uint256",
                                name: "height",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct SubmissionNode[]",
                        name: "nodes",
                        type: "tuple[]",
                    },
                ],
                indexed: false,
                internalType: "struct Submission",
                name: "submission",
                type: "tuple",
            },
        ],
        name: "Submit",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "Unpaused",
        type: "event",
    },
    {
        inputs: [],
        name: "DEFAULT_ADMIN_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "PAUSER_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "length",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes",
                        name: "tags",
                        type: "bytes",
                    },
                    {
                        components: [
                            {
                                internalType: "bytes32",
                                name: "root",
                                type: "bytes32",
                            },
                            {
                                internalType: "uint256",
                                name: "height",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct SubmissionNode[]",
                        name: "nodes",
                        type: "tuple[]",
                    },
                ],
                internalType: "struct Submission[]",
                name: "submissions",
                type: "tuple[]",
            },
        ],
        name: "batchSubmit",
        outputs: [
            {
                internalType: "uint256[]",
                name: "indexes",
                type: "uint256[]",
            },
            {
                internalType: "bytes32[]",
                name: "digests",
                type: "bytes32[]",
            },
            {
                internalType: "uint256[]",
                name: "startIndexes",
                type: "uint256[]",
            },
            {
                internalType: "uint256[]",
                name: "lengths",
                type: "uint256[]",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [],
        name: "blocksPerEpoch",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "epoch",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "epochStartPosition",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "firstBlock",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getContext",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "epoch",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "mineStart",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "flowRoot",
                        type: "bytes32",
                    },
                    {
                        internalType: "uint256",
                        name: "flowLength",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "blockDigest",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "digest",
                        type: "bytes32",
                    },
                ],
                internalType: "struct MineContext",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "digest",
                type: "bytes32",
            },
        ],
        name: "getEpochRange",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint128",
                        name: "start",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "end",
                        type: "uint128",
                    },
                ],
                internalType: "struct EpochRange",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
        ],
        name: "getRoleAdmin",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256",
            },
        ],
        name: "getRoleMember",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
        ],
        name: "getRoleMemberCount",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "grantRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "hasRole",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "market_",
                type: "address",
            },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "initialized",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "makeContext",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "cnt",
                type: "uint256",
            },
        ],
        name: "makeContextFixedTimes",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "makeContextWithResult",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "epoch",
                        type: "uint256",
                    },
                    {
                        internalType: "uint256",
                        name: "mineStart",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "flowRoot",
                        type: "bytes32",
                    },
                    {
                        internalType: "uint256",
                        name: "flowLength",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes32",
                        name: "blockDigest",
                        type: "bytes32",
                    },
                    {
                        internalType: "bytes32",
                        name: "digest",
                        type: "bytes32",
                    },
                ],
                internalType: "struct MineContext",
                name: "",
                type: "tuple",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "market",
        outputs: [
            {
                internalType: "address payable",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "numSubmissions",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "pause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "paused",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint128",
                name: "targetPosition",
                type: "uint128",
            },
        ],
        name: "queryContextAtPosition",
        outputs: [
            {
                components: [
                    {
                        internalType: "uint128",
                        name: "start",
                        type: "uint128",
                    },
                    {
                        internalType: "uint128",
                        name: "end",
                        type: "uint128",
                    },
                    {
                        internalType: "bytes32",
                        name: "digest",
                        type: "bytes32",
                    },
                ],
                internalType: "struct EpochRangeWithContextDigest",
                name: "range",
                type: "tuple",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "renounceRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "revokeRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "rootHistory",
        outputs: [
            {
                internalType: "contract IDigestHistory",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "submissionIndex",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                components: [
                    {
                        internalType: "uint256",
                        name: "length",
                        type: "uint256",
                    },
                    {
                        internalType: "bytes",
                        name: "tags",
                        type: "bytes",
                    },
                    {
                        components: [
                            {
                                internalType: "bytes32",
                                name: "root",
                                type: "bytes32",
                            },
                            {
                                internalType: "uint256",
                                name: "height",
                                type: "uint256",
                            },
                        ],
                        internalType: "struct SubmissionNode[]",
                        name: "nodes",
                        type: "tuple[]",
                    },
                ],
                internalType: "struct Submission",
                name: "submission",
                type: "tuple",
            },
        ],
        name: "submit",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "payable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "tree",
        outputs: [
            {
                internalType: "uint256",
                name: "currentLength",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "unstagedHeight",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "unpause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
];
const _bytecode$1 = "0x60e06040523480156200001157600080fd5b5060405162003fe838038062003fe88339810160408190526200003491620000b1565b6000805460ff1916905560a0829052604051829082906103e8906200005990620000a3565b908152602001604051809103906000f0801580156200007c573d6000803e3d6000fd5b506001600160a01b0316608052620000958143620000d6565b60c05250620000fe92505050565b610670806200397883390190565b60008060408385031215620000c557600080fd5b505080516020909101519092909150565b80820180821115620000f857634e487b7160e01b600052601160045260246000fd5b92915050565b60805160a05160c05161380b6200016d600039600081816102cc015281816107a401528181610a6401528181610b4b01528181610da801528181610ebd0152818161105101526114e30152600081816106ba01526110290152600081816105f101526110bc015261380b6000f3fe6080604052600436106101e35760003560e01c8063900cf0cf11610102578063c4d66de811610095578063e63ab1e911610064578063e63ab1e914610653578063ef3e12dc14610675578063f0682054146106a8578063fd54b228146106dc57600080fd5b8063c4d66de8146105bf578063c7dd5221146105df578063ca15c87314610613578063d547741f1461063357600080fd5b80639e62a38e116100d15780639e62a38e1461055c578063a217fddf1461057f578063b464b53e14610594578063b8a409ac146105a957600080fd5b8063900cf0cf146104f05780639010d07c1461050657806391d148541461052657806393e405a01461054657600080fd5b806336568abe1161017a57806377e198241161014957806377e19824146103ff5780637d5907081461041457806380f55605146104a35780638456cb59146104db57600080fd5b806336568abe1461039d57806338d45e10146103bd5780633f4ba83a146103d25780635c975abb146103e757600080fd5b8063231b0268116101b6578063231b0268146102ba578063248a9ca3146102fc5780632f2ff15d1461032d57806331bae1741461034d57600080fd5b806301ffc9a7146101e8578063127f0f071461021d578063158ef93e1461027e57806318a641ef14610298575b600080fd5b3480156101f457600080fd5b5061020861020336600461302c565b61070c565b60405190151581526020015b60405180910390f35b34801561022957600080fd5b50610232610737565b6040516102149190600060c082019050825182526020830151602083015260408301516040830152606083015160608301526080830151608083015260a083015160a083015292915050565b34801561028a57600080fd5b506003546102089060ff1681565b3480156102a457600080fd5b506102b86102b3366004613056565b6107a2565b005b3480156102c657600080fd5b506102ee7f000000000000000000000000000000000000000000000000000000000000000081565b604051908152602001610214565b34801561030857600080fd5b506102ee610317366004613056565b6000908152600160208190526040909120015490565b34801561033957600080fd5b506102b8610348366004613086565b61081a565b34801561035957600080fd5b5061036d6103683660046130b2565b610845565b6040805182516001600160801b039081168252602080850151909116908201529181015190820152606001610214565b3480156103a957600080fd5b506102b86103b8366004613086565b6109e8565b3480156103c957600080fd5b506102b8610a62565b3480156103de57600080fd5b506102b8610ab1565b3480156103f357600080fd5b5060005460ff16610208565b34801561040b57600080fd5b50603a546102ee565b34801561042057600080fd5b5061047c61042f366004613056565b6040805180820190915260008082526020820152506000908152604360209081526040918290208251808401909352546001600160801b038082168452600160801b909104169082015290565b6040805182516001600160801b039081168252602093840151169281019290925201610214565b3480156104af57600080fd5b506036546104c3906001600160a01b031681565b6040516001600160a01b039091168152602001610214565b3480156104e757600080fd5b506102b8610ad1565b3480156104fc57600080fd5b506102ee603b5481565b34801561051257600080fd5b506104c36105213660046130db565b610af1565b34801561053257600080fd5b50610208610541366004613086565b610b10565b34801561055257600080fd5b506102ee603c5481565b61056f61056a366004613310565b610b3b565b60405161021494939291906133fc565b34801561058b57600080fd5b506102ee600081565b3480156105a057600080fd5b50610232610d74565b3480156105b557600080fd5b506102ee603a5481565b3480156105cb57600080fd5b506102b86105da36600461347b565b610dfb565b3480156105eb57600080fd5b506104c37f000000000000000000000000000000000000000000000000000000000000000081565b34801561061f57600080fd5b506102ee61062e366004613056565b610e70565b34801561063f57600080fd5b506102b861064e366004613086565b610e87565b34801561065f57600080fd5b506102ee6000805160206137b683398151915281565b610688610683366004613496565b610ead565b604080519485526020850193909352918301526060820152608001610214565b3480156106b457600080fd5b506102ee7f000000000000000000000000000000000000000000000000000000000000000081565b3480156106e857600080fd5b506037546038546106f7919082565b60408051928352602083019190915201610214565b60006001600160e01b03198216635a05180f60e01b1480610731575061073182610fef565b92915050565b6040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a0810191909152506040805160c081018252603d548152603e546020820152603f548183015290546060820152604154608082015260425460a082015290565b7f00000000000000000000000000000000000000000000000000000000000000004310156107eb5760405162461bcd60e51b81526004016107e2906134d3565b60405180910390fd5b60005b818111610815576107fd611024565b610805575050565b61080e81613520565b90506107ee565b505b50565b6000828152600160208190526040909120015461083681611348565b6108408383611352565b505050565b604080516060810182526000808252602082018190529181019190915261086a610a62565b6037546001600160801b038316106108d05760405162461bcd60e51b8152602060048201526024808201527f5175657269656420706f736974696f6e206578636565647320757070657220626044820152631bdd5b9960e21b60648201526084016107e2565b6044546000905b818111156109a057600060026108ed8484613539565b6108f79190613562565b90506044818154811061090c5761090c613576565b600091825260209182902060408051606081018252600290930290910180546001600160801b038082168552600160801b9091048116948401859052600190910154918301919091529095508616106109715761096a816001613539565b925061099a565b83600001516001600160801b0316856001600160801b03161061099657505050919050565b8091505b506108d7565b60405162461bcd60e51b815260206004820152601b60248201527f43616e206e6f742066696e642070726f70657220636f6e74657874000000000060448201526064016107e2565b6001600160a01b0381163314610a585760405162461bcd60e51b815260206004820152602f60248201527f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636560448201526e103937b632b9903337b91039b2b63360891b60648201526084016107e2565b6108158282611374565b7f0000000000000000000000000000000000000000000000000000000000000000431015610aa25760405162461bcd60e51b81526004016107e2906134d3565b610aaa611024565b610aa2575b565b6000805160206137b6833981519152610ac981611348565b610817611396565b6000805160206137b6833981519152610ae981611348565b6108176113e8565b6000828152600260205260408120610b099083611425565b9392505050565b60009182526001602090815260408084206001600160a01b0393909316845291905290205460ff1690565b606080606080610b49611431565b7f0000000000000000000000000000000000000000000000000000000000000000431015610b895760405162461bcd60e51b81526004016107e2906134d3565b84518067ffffffffffffffff811115610ba457610ba46130fd565b604051908082528060200260200182016040528015610bcd578160200160208202803683370190505b5094508067ffffffffffffffff811115610be957610be96130fd565b604051908082528060200260200182016040528015610c12578160200160208202803683370190505b5093508067ffffffffffffffff811115610c2e57610c2e6130fd565b604051908082528060200260200182016040528015610c57578160200160208202803683370190505b5092508067ffffffffffffffff811115610c7357610c736130fd565b604051908082528060200260200182016040528015610c9c578160200160208202803683370190505b50915060005b81811015610d6b57600080600080610cd28b8681518110610cc557610cc5613576565b6020026020010151610ead565b9350935093509350838a8681518110610ced57610ced613576565b60200260200101818152505082898681518110610d0c57610d0c613576565b60200260200101818152505081888681518110610d2b57610d2b613576565b60200260200101818152505080878681518110610d4a57610d4a613576565b6020026020010181815250505050505080610d6490613520565b9050610ca2565b50509193509193565b6040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a08101919091527f0000000000000000000000000000000000000000000000000000000000000000431015610de65760405162461bcd60e51b81526004016107e2906134d3565b610dee610a62565b610df6610737565b905090565b60035460ff1615610e5a5760405162461bcd60e51b8152602060048201526024808201527f5a67496e697469616c697a61626c653a20616c726561647920696e697469616c6044820152631a5e995960e21b60648201526084016107e2565b6003805460ff1916600117905561081781611477565b60008181526002602052604081206107319061159d565b60008281526001602081905260409091200154610ea381611348565b6108408383611374565b600080600080610ebb611431565b7f0000000000000000000000000000000000000000000000000000000000000000431015610efb5760405162461bcd60e51b81526004016107e2906134d3565b610f04856115a7565b610f455760405162461bcd60e51b815260206004820152601260248201527124b73b30b634b21039bab136b4b9b9b4b7b760711b60448201526064016107e2565b6000610f50866117be565b9050610f5b8161181c565b610f63610a62565b6000610f6e8761190e565b90506000610f7b88611a42565b603a80549192506001906000610f918385613539565b9250508190555081336001600160a01b03167f167ce04d2aa1981994d3a31695da0d785373335b1078cec239a1a3a2c76755558386888e604051610fd89493929190613617565b60405180910390a396509450925090509193509193565b60006001600160e01b03198216637965db0b60e01b148061073157506301ffc9a760e01b6001600160e01b0319831614610731565b6000807f0000000000000000000000000000000000000000000000000000000000000000603b54600101027f000000000000000000000000000000000000000000000000000000000000000001905043811061108257600091505090565b61108c6037611a76565b60006110986037611ba5565b604051632d287e4360e01b8152600481018290529091506000906001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690632d287e43906024016020604051808303816000875af1158015611105573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906111299190613678565b9050603b54811461113c5761113c613691565b6000804361114c86610100613539565b101561117c57507fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a47090508061128b565b506037546040805186406020820181905291810186905260608101929092529060800160408051808303601f190181528282528051602091820120603c80546037805487870187526001600160801b039283168089529083168689018181526000878152604389528981209a519151918616600160801b928716830217909a558851606081018a529283529682019081529681018581526044805460018101825599529051965196831696909216909402949094177f9b22d3d61959b4d3528b1d8ba932c96fbe302b36a1aad1d95cab54f9e0a135ea60029096029586015592517f9b22d3d61959b4d3528b1d8ba932c96fbe302b36a1aad1d95cab54f9e0a135eb9094019390935554905591505b6001603b600082825461129e9190613539565b90915550506040805160c081018252603b5480825260208083018990528284018890526037546060808501829052608080860188905260a0909501889052603d849055603e8b9055603f8a905581865560418790556042889055603a5486518b815293840152948201529283018590529133917fbc8a3fd82465d43f1709e44ed882f7e1af0147274196ef1ec009f5d52ff4e993910160405180910390a360019550505050505090565b6108178133611bdd565b61135c8282611c36565b60008281526002602052604090206108409082611ca1565b61137e8282611cb6565b60008281526002602052604090206108409082611d1d565b61139e611d32565b6000805460ff191690557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa335b6040516001600160a01b03909116815260200160405180910390a1565b6113f0611431565b6000805460ff191660011790557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586113cb3390565b6000610b098383611d7b565b60005460ff1615610aaf5760405162461bcd60e51b815260206004820152601060248201526f14185d5cd8589b194e881c185d5cd95960821b60448201526064016107e2565b6001603781905560398054808301825560009182527fdc16fef70f8d5ddbc01ee3d903d1e69c18a3c7be080eb86a81e0578814ee58d30155603855603680546001600160a01b0319166001600160a01b0383161790556000603b8190556040805160c0810182529182527f0000000000000000000000000000000000000000000000000000000000000000602083015281016115136037611ba5565b815260016020808301919091527fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a47060408084018290526060938401919091528351603d5590830151603e5582810151603f55908201519055608081015160415560a00151604255611585600033611da5565b6108176000805160206137b683398151915233611da5565b6000610731825490565b60008160400151516000036115be57506000919050565b60408201518051600491906115d5906001906136a7565b815181106115e5576115e5613576565b602002602001015160200151836040015160008151811061160857611608613576565b60200260200101516020015161161e91906136a7565b1061162b57506000919050565b6040826040015160008151811061164457611644613576565b6020026020010151602001511061165d57506000919050565b60005b600183604001515161167291906136a7565b8110156116e9578260400151818151811061168f5761168f613576565b60200260200101516020015183604001518260016116ad9190613539565b815181106116bd576116bd613576565b602002602001015160200151106116d75750600092915050565b806116e181613520565b915050611660565b5060006116f5836117be565b9050611703610100826136ba565b835111156117145750600092915050565b600060108210156117315761172a6001836136a7565b9050611797565b83604001515160010361174c5761172a600483901c836136a7565b6004846040015160008151811061176557611765613576565b60200260200101516020015161177b91906136a7565b611786906001613539565b611794906001901b836136a7565b90505b6117a3610100826136ba565b8451116117b4575060009392505050565b5060019392505050565b600080805b83604001515181101561181557836040015181815181106117e6576117e6613576565b6020026020010151602001516001901b826118019190613539565b91508061180d81613520565b9150506117c3565b5092915050565b603654604080516330f6284160e11b815290516000926001600160a01b0316916361ec50829160048083019260209291908290030181865afa158015611866573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061188a9190613678565b9050600061189882846136ba565b905047478211156118cd57604051637c2e324160e11b81526004810184905260248101859052604481018290526064016107e2565b6036546040516001600160a01b039091169083156108fc029084906000818181858888f19350505050158015611907573d6000803e3d6000fd5b5050505050565b603754600090815b8360400151518110156119ab5760008460400151828151811061193b5761193b613576565b602002602001015160000151905060008560400151838151811061196157611961613576565b6020026020010151602001519050600061198783836037611daf9092919063ffffffff16565b905083600003611995578095505b50505080806119a390613520565b915050611916565b5060006119b882846136a7565b90506000836037600001546119cd91906136a7565b603654604051636d3759b560e11b81526004810186905260248101839052604481018590529192506001600160a01b03169063da6eb36a90606401600060405180830381600087803b158015611a2257600080fd5b505af1158015611a36573d6000803e3d6000fd5b50505050505050919050565b60008160400151604051602001611a5991906136d9565b604051602081830303815290604052805190602001209050919050565b6002810154600182015403611a885750565b60028101805460018084015491926000929091611aa4916136a7565b81548110611ab457611ab4613576565b906000526020600020015490506000611adc60018560010154611ad791906136a7565b611f38565b60018501549091505b83811015611b9a57604080516020808201869052818301859052825180830384018152606090920190925280519101208554611b2590600290841c6136ec565b600003611b6157809350611b3882611f38565b925080866002018381548110611b5057611b50613576565b600091825260209091200155611b87565b856002018281548110611b7657611b76613576565b906000526020600020015493508092505b5080611b9281613520565b915050611ae5565b505050600190910155565b60028101805460009190611bbb906001906136a7565b81548110611bcb57611bcb613576565b90600052602060002001549050919050565b611be78282610b10565b61081557611bf481612b3c565b611bff836020612b4e565b604051602001611c10929190613700565b60408051601f198184030181529082905262461bcd60e51b82526107e291600401613775565b611c408282610b10565b6108155760008281526001602081815260408084206001600160a01b0386168086529252808420805460ff19169093179092559051339285917f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d9190a45050565b6000610b09836001600160a01b038416612cea565b611cc08282610b10565b156108155760008281526001602090815260408083206001600160a01b0385168085529252808320805460ff1916905551339285917ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9190a45050565b6000610b09836001600160a01b038416612d39565b60005460ff16610aaf5760405162461bcd60e51b815260206004820152601460248201527314185d5cd8589b194e881b9bdd081c185d5cd95960621b60448201526064016107e2565b6000826000018281548110611d9257611d92613576565b9060005260206000200154905092915050565b6108158282611352565b600080611dc0856000015484612e2c565b90506000611dd16001851b83613539565b6002870154909150611de5906001906136a7565b6001901b811115611e3757611df986611a76565b611e0286612e64565b6002860154611e13906001906136a7565b6001901b811115611e2c57611e2786612e64565b611e02565b600286015460018701555b6002860154611e468786612ef7565b60008087875b84811015611f1a57611e61600288831c6136ec565b600003611eae57818b6002018281548110611e7e57611e7e613576565b600091825260209091200155611e95816001613539565b6001808d0191909155611ea890866136a7565b50611f1a565b8a6002018181548110611ec357611ec3613576565b906000526020600020015493508192508383604051602001611eef929190918252602082015260400190565b6040516020818303038152906040528051906020012091508080611f1290613520565b915050611e4c565b50611f286001891b87613539565b9099555092979650505050505050565b600081600003611f6957507fd397b3b043d87fcd6fad1291ff0bfd16401c274896d8c63a923727f077b8e0b5919050565b81600103611f9857507ff73e6947d7d1628b9976a6e40d7b278a8a16405e96324a68df45b12a51b7cfde919050565b81600203611fc757507fa1520264ae93cac619e22e8718fc4fa7ebdd23f493cad602434d2a58ff4868fb919050565b81600303611ff657507fde5747106ac1194a1fa9071dbd6cf19dc2bc7964497ef0afec7e4bdbcf08c47e919050565b8160040361202557507f09c7082879180d28c789c05fafe7030871c76cedbe82c948b165d6a1d66ac15b919050565b8160050361205457507faa7a02bcf29fba687f84123c808b5b48834ff5395abe98e622fadc14e4180c95919050565b8160060361208357507f7608fd46b710b589e0f2ee5a13cd9c41d432858a30d524f84c6d5db37f66273a919050565b816007036120b257507fa5d9a2f7f3573ac9a1366bc484688b4daf934b87ea9b3bf2e703da8fd9f09708919050565b816008036120e157507f6c1779477f4c3fca26b4607398859a43b90a286ce8062500744bd4949981757f919050565b8160090361211057507f45c22df3d952c33d5edce122eed85e5cda3fd61939e7ad7b3e03b6927bb598ea919050565b81600a0361213f57507fe68d02859bb6211cec64f52368b77d422de3b8eac34bf615942b814b643301b5919050565b81600b0361216e57507f62d78399b954d51cb9728601738ad13ddc43b2300064660716bb661d2f4d686f919050565b81600c0361219d57507f6e250d9abdbbb3993fce08de0395cdb56f0483e67d8762a798de011f6a50866a919050565b81600d036121cc57507f1d1a3a74062fd94078617e33eb901eaf16a830f67c387d8eed342db2ac5e2cc5919050565b81600e036121fb57507f19b3b3886526917eae8650223d0be20a0301be960eb339696e673ad8a804440f919050565b81600f0361222a57507fee9e05df53f10e62a897e5140a3f58732dd849e69cd1d62b21ed80ead711a014919050565b8160100361225957507f2cc7aa6e611a113a34505dc1c96b220f14909b70e2c2c7b1a74655da21013c5e919050565b8160110361228857507f949b52dfece7ca3bad3cb27f7750ecaee64cedb6243a275c35984e92956c530a919050565b816012036122b757507fb2680d060b763b932c150434c3812ba9fbc50937e0ebcf5758de884be81bab65919050565b816013036122e657507f523aebf4a085edbc9c8cdc99c83f46262e5f029b395ff7bf561a48a3f387e6b8919050565b8160140361231557507fc9ab73827ab33c0cedb7ecf0ed2e6e32583c0fe887133a7f381ea4ba84d95b76919050565b8160150361234457507f23eb397dec7e564ebe97f160a5e1081a77d9861f316807079b6be4731beb331e919050565b8160160361237357507fdfa44a274c60f090df034aaf75539fd40e94cfd6362dd53d26ed20c8ad529563919050565b816017036123a257507f15b13ee358e1044a53381243c094e54bf7aceb9b5325a0313d6b85fd44e8b3a5919050565b816018036123d157507f1a7a93871e2daa0f1860aa91d4ece4ccd012dac5fe581176a21b155cfeca6d40919050565b8160190361240057507fb12665fd0b884a7c7d1e0294d369170d7e672d9e125eb87784556305f98292df919050565b81601a0361242f57507f2a5543b0b2f8cf550524390291774f4d6c8c0a25ff5393b09c44d75c92a5bd8e919050565b81601b0361245e57507ff9df1841a6e7164b67a1242f1c74975137085ffd9721831f6c469d3a4d5ba42e919050565b81601c0361248d57507fba24736b1b48246c1f7803be967be43ca0dddc9c2c0687a2957952249bc89371919050565b81601d036124bc57507ff3f706b73790c73ca0a8f0460ac3a2a102e280415586b520e70cd5e8264388b4919050565b81601e036124eb57507fc1f5a9a9f357e1c37814688cf7290c87a264ed3d6174a12b978da1c586f53825919050565b81601f0361251a57507f766f7702e19ce23d426cdad03e4292a5a42c4669420101fed74400ec7cda3ac6919050565b8160200361254957507f070fec213e105b3e4d9b0434ac2fc7ca721d35093dc741fb9419797003e2394a919050565b8160210361257857507f9a7aade05b49e43f5fd3782571cc8c90eadacd5d660b53842b4e5b63d675ae0c919050565b816022036125a757507fb27b35a8236d0f9b6692820429c025ed58ed378dc98d316b762f0c865c68be6f919050565b816023036125d657507fdc567ad38d9b90cc9bea4e0f82ec05eca10b3aa94eddc7b63c4fd20c001bb53b919050565b8160240361260557507fb208dfc457c8b30661ae49544c8e57399818095aab8dd7a426fb8dd56bb8c559919050565b8160250361263457507fc4a72e1ff84f7a22631f3f95c61c392f98f52050360215a9d7e75d79b0bcd2ca919050565b8160260361266357507fbb093ec8c0d7defb1de668b5b5dd4f2619e5cd92d29cc144862364a83ab993a8919050565b8160270361269257507fe341796f2fe3975012c1e6badfa2e9c4523e43f911dc845082c3f4d7b4ff871d919050565b816028036126c157507f42d356a11a0b39243eca3c3263299cb6f8c3e9728af6d9d8b0ddb6d354f1890d919050565b816029036126f057507f0ce506e834e3a50a33f80074bc7fa16cf3c0712b36a41b69699177ea25de6c30919050565b81602a0361271f57507fd8fa5bf130aeb7756b1ed09090cc80ed78dae0617978540f0fabd06dfb978938919050565b81602b0361274e57507feed69a20fe36eb604f2153efa3b01c0e143cdf02229a1b8f741c9c2719059eb0919050565b81602c0361277d57507f303c9c566ebf5bfe252796e5c131a99801226152a514688b5ca6883e99031d88919050565b81602d036127ac57507fc7c3765ba96cfbccf3ae718393fa89791070cc8cd85f280b6ac46aea10d96042919050565b81602e036127db57507f1ca65b0a2b8034ee6bfb1fa4526832304e393af835c2c42b4dace58048746800919050565b81602f0361280a57507f957add5e02350fd47de3a8e1da38fd774ceb31214d5897ed6315740a83cd634a919050565b8160300361283957507f787892cb439d5d358870774e163557cf02ec3cb87be6fde11abf1acee14eeaa4919050565b8160310361286857507f047c0962d4f5c8f60692c587de07739528c4d2059240d61dd34d2a547a438ee6919050565b8160320361289757507fc18727efc9e4df63020dcd90edc17dfd2ad14f02328c912b13898e0b53735556919050565b816033036128c657507fe38b9218987e451effe1648c3c9851ad03b64b052a5a3f5ca30f4d7b1ecf7120919050565b816034036128f557507f0e48ecb1a5418e6218289acc8cf723e67ac6eae3ecb80f644336ab4365a2f2b2919050565b8160350361292457507fd60e66f5b8cd08d71a1a4d7798952a7afa5a6e93a886c587a46a5500ebef4a60919050565b8160360361295357507f5162aa9c31d9105f689cf6e71e19548bc9f0218b7d0f99ff7fa8bc2f19c68462919050565b8160370361298257507f6fa8519b4b0e8fb97a9b618e97627d97b9b9d29d04521fd96472e9c502700568919050565b816038036129b157507f41f5dcf0cdee270a2ad9a5f8130aaaab94b237463e09757c28b0321f09e24eb0919050565b816039036129e057507f87a119239fa90732197108adfd029938b4743874d959d3da79b3a30f4832899e919050565b81603a03612a0f57507f8e96dbaa5c72e84a5297b040ccc1a60750a3201166e3b7740d352837233608a1919050565b81603b03612a3e57507f01605058d167ce967af8c475d2f6c341c3e0b437babf899c9da73a520aa4ecb5919050565b81603c03612a6d57507f04529eb80532c5118949d700d8dfd2aa86850b1c6479b26276b9486784a145ff919050565b81603d03612a9c57507fd191814ad13f27361ae20a46cbac8f6e76c10ebe9af0806d6720492ee2f296f0919050565b81603e03612acb57507fa28df63f78821060570da371c0be1312188346b92a7965cc4b980b26c134a4d7919050565b81603f03612afa57507fb48a92d40b61dc995ceecee4cded6415050dcece448b1e0b5e5b6a0e6981f3ef919050565b60405162461bcd60e51b8152602060048201526012602482015271125b99195e081bdd5d081bd988189bdd5b9960721b60448201526064016107e2565b919050565b60606107316001600160a01b03831660145b60606000612b5d8360026136ba565b612b68906002613539565b67ffffffffffffffff811115612b8057612b806130fd565b6040519080825280601f01601f191660200182016040528015612baa576020820181803683370190505b509050600360fc1b81600081518110612bc557612bc5613576565b60200101906001600160f81b031916908160001a905350600f60fb1b81600181518110612bf457612bf4613576565b60200101906001600160f81b031916908160001a9053506000612c188460026136ba565b612c23906001613539565b90505b6001811115612c9b576f181899199a1a9b1b9c1cb0b131b232b360811b85600f1660108110612c5757612c57613576565b1a60f81b828281518110612c6d57612c6d613576565b60200101906001600160f81b031916908160001a90535060049490941c93612c9481613788565b9050612c26565b508315610b095760405162461bcd60e51b815260206004820181905260248201527f537472696e67733a20686578206c656e67746820696e73756666696369656e7460448201526064016107e2565b6000818152600183016020526040812054612d3157508154600181810184556000848152602080822090930184905584548482528286019093526040902091909155610731565b506000610731565b60008181526001830160205260408120548015612e22576000612d5d6001836136a7565b8554909150600090612d71906001906136a7565b9050818114612dd6576000866000018281548110612d9157612d91613576565b9060005260206000200154905080876000018481548110612db457612db4613576565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080612de757612de761379f565b600190038181906000526020600020016000905590558560010160008681526020019081526020016000206000905560019350505050610731565b6000915050610731565b600082808203612e40576000915050610731565b612e4b6001826136a7565b831c9050612e5a600182613539565b90921b9392505050565b60028101805490600090612e796001846136a7565b81548110612e8957612e89613576565b60009182526020822001549150612ea4611ad76001856136a7565b9050836002018282604051602001612ec6929190918252602082015260400190565b60408051601f1981840301815291905280516020918201208254600181018455600093845291909220015550505050565b8082600101541115612f07575050565b60028201805460018085015491926000929091612f23916136a7565b81548110612f3357612f33613576565b906000526020600020015490506000612f5660018660010154611ad791906136a7565b60018601549091505b8381101561302457604080516020808201869052818301859052825180830384018152606090920190925280519101208654612f9f90600290841c6136ec565b600003612feb57809350612fb282611f38565b9250858210612fe65780876002018381548110612fd157612fd1613576565b60009182526020909120015550505050505050565b613011565b86600201828154811061300057613000613576565b906000526020600020015493508092505b508061301c81613520565b915050612f5f565b505050505050565b60006020828403121561303e57600080fd5b81356001600160e01b031981168114610b0957600080fd5b60006020828403121561306857600080fd5b5035919050565b80356001600160a01b0381168114612b3757600080fd5b6000806040838503121561309957600080fd5b823591506130a96020840161306f565b90509250929050565b6000602082840312156130c457600080fd5b81356001600160801b0381168114610b0957600080fd5b600080604083850312156130ee57600080fd5b50508035926020909101359150565b634e487b7160e01b600052604160045260246000fd5b6040805190810167ffffffffffffffff81118282101715613136576131366130fd565b60405290565b6040516060810167ffffffffffffffff81118282101715613136576131366130fd565b604051601f8201601f1916810167ffffffffffffffff81118282101715613188576131886130fd565b604052919050565b600067ffffffffffffffff8211156131aa576131aa6130fd565b5060051b60200190565b600082601f8301126131c557600080fd5b813560206131da6131d583613190565b61315f565b82815260069290921b840181019181810190868411156131f957600080fd5b8286015b8481101561323857604081890312156132165760008081fd5b61321e613113565b8135815284820135858201528352918301916040016131fd565b509695505050505050565b60006060828403121561325557600080fd5b61325d61313c565b90508135815260208083013567ffffffffffffffff8082111561327f57600080fd5b818501915085601f83011261329357600080fd5b8135818111156132a5576132a56130fd565b6132b7601f8201601f1916850161315f565b81815287858386010111156132cb57600080fd5b818585018683013760008583830101528085870152505060408501359250808311156132f657600080fd5b5050613304848285016131b4565b60408301525092915050565b6000602080838503121561332357600080fd5b823567ffffffffffffffff8082111561333b57600080fd5b818501915085601f83011261334f57600080fd5b813561335d6131d582613190565b81815260059190911b8301840190848101908883111561337c57600080fd5b8585015b838110156133b4578035858111156133985760008081fd5b6133a68b89838a0101613243565b845250918601918601613380565b5098975050505050505050565b600081518084526020808501945080840160005b838110156133f1578151875295820195908201906001016133d5565b509495945050505050565b60808152600061340f60808301876133c1565b82810360208481019190915286518083528782019282019060005b818110156134465784518352938301939183019160010161342a565b5050848103604086015261345a81886133c1565b92505050828103606084015261347081856133c1565b979650505050505050565b60006020828403121561348d57600080fd5b610b098261306f565b6000602082840312156134a857600080fd5b813567ffffffffffffffff8111156134bf57600080fd5b6134cb84828501613243565b949350505050565b6020808252601a908201527f436f6e747261637420686173206e6f74206c61756e636865642e000000000000604082015260600190565b634e487b7160e01b600052601160045260246000fd5b6000600182016135325761353261350a565b5060010190565b808201808211156107315761073161350a565b634e487b7160e01b600052601260045260246000fd5b6000826135715761357161354c565b500490565b634e487b7160e01b600052603260045260246000fd5b60005b838110156135a757818101518382015260200161358f565b50506000910152565b600081518084526135c881602086016020860161358c565b601f01601f19169290920160200192915050565b600081518084526020808501945080840160005b838110156133f15781518051885283015183880152604090960195908201906001016135f0565b848152836020820152826040820152608060608201528151608082015260006020830151606060a084015261364f60e08401826135b0565b90506040840151607f198483030160c085015261366c82826135dc565b98975050505050505050565b60006020828403121561368a57600080fd5b5051919050565b634e487b7160e01b600052600160045260246000fd5b818103818111156107315761073161350a565b60008160001904831182151516156136d4576136d461350a565b500290565b602081526000610b0960208301846135dc565b6000826136fb576136fb61354c565b500690565b7f416363657373436f6e74726f6c3a206163636f756e742000000000000000000081526000835161373881601785016020880161358c565b7001034b99036b4b9b9b4b733903937b6329607d1b601791840191820152835161376981602884016020880161358c565b01602801949350505050565b602081526000610b0960208301846135b0565b6000816137975761379761350a565b506000190190565b634e487b7160e01b600052603160045260246000fdfe65d7a28e3265b37a6474929f336521b332c1681b933f6cb9f3376673440d862aa2646970667358221220b817395a09c78411b81f0830a1380707dab6222545310a1c74577851f2d44a7a64736f6c63430008100033608060405234801561001057600080fd5b5060405161067038038061067083398101604081905261002f9161014a565b6100383361009a565b806001600160401b0381111561005057610050610163565b604051908082528060200260200182016040528015610079578160200160208202803683370190505b50805161008e916001916020909101906100ea565b50506000600255610179565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b828054828255906000526020600020908101928215610125579160200282015b8281111561012557825182559160200191906001019061010a565b50610131929150610135565b5090565b5b808211156101315760008155600101610136565b60006020828403121561015c57600080fd5b5051919050565b634e487b7160e01b600052604160045260246000fd5b6104e8806101886000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80638da5cb5b1161005b5780638da5cb5b146100d557806396e494e8146100f0578063e0886f9014610103578063f2fde38b1461011657600080fd5b80631d1a696d146100825780632d287e43146100aa578063715018a6146100cb575b600080fd5b6100956100903660046103e3565b610129565b60405190151581526020015b60405180910390f35b6100bd6100b83660046103e3565b610194565b6040519081526020016100a1565b6100d36101ee565b005b6000546040516001600160a01b0390911681526020016100a1565b6100956100fe3660046103e3565b610202565b6100bd6101113660046103e3565b610237565b6100d36101243660046103fc565b610297565b60008061013d600254600180549050610310565b905060005b8181101561018a57836001828154811061015e5761015e610425565b906000526020600020015403610178575060019392505050565b8061018281610451565b915050610142565b5060009392505050565b6002546001546000919082906101aa908361046a565b905083600182815481106101c0576101c0610425565b90600052602060002001819055506001600260008282546101e1919061048c565b9091555091949350505050565b6101f661032a565b6102006000610384565b565b6001546002546000919083108015610230575080610222600254836103d4565b61022c919061049f565b8310155b9392505050565b600061024282610202565b6102675760405163b52d71f360e01b8152600481018390526024015b60405180910390fd5b60018054610275908461046a565b8154811061028557610285610425565b90600052602060002001549050919050565b61029f61032a565b6001600160a01b0381166103045760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b606482015260840161025e565b61030d81610384565b50565b600081831061031f5781610321565b825b90505b92915050565b6000546001600160a01b031633146102005760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260640161025e565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b600081831161031f5781610321565b6000602082840312156103f557600080fd5b5035919050565b60006020828403121561040e57600080fd5b81356001600160a01b038116811461023057600080fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b6000600182016104635761046361043b565b5060010190565b60008261048757634e487b7160e01b600052601260045260246000fd5b500690565b808201808211156103245761032461043b565b818103818111156103245761032461043b56fea2646970667358221220e8ca9fd7cf1cda9c87af618488dd664329a5f2e0ac050a78694b39389150ab1e64736f6c63430008100033";
const isSuperArgs$1 = (xs) => xs.length > 1;
class FixedPriceFlow__factory extends ContractFactory {
    constructor(...args) {
        if (isSuperArgs$1(args)) {
            super(...args);
        }
        else {
            super(_abi$1, _bytecode$1, args[0]);
        }
    }
    getDeployTransaction(blocksPerEpoch_, deployDelay_, overrides) {
        return super.getDeployTransaction(blocksPerEpoch_, deployDelay_, overrides || {});
    }
    deploy(blocksPerEpoch_, deployDelay_, overrides) {
        return super.deploy(blocksPerEpoch_, deployDelay_, overrides || {});
    }
    connect(runner) {
        return super.connect(runner);
    }
    static bytecode = _bytecode$1;
    static abi = _abi$1;
    static createInterface() {
        return new Interface(_abi$1);
    }
    static connect(address, runner) {
        return new Contract(address, _abi$1, runner);
    }
}

/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

var index = /*#__PURE__*/Object.freeze({
	__proto__: null,
	FixedPriceFlow__factory: FixedPriceFlow__factory
});

/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
const _abi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "previousAdminRole",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "bytes32",
                name: "newAdminRole",
                type: "bytes32",
            },
        ],
        name: "RoleAdminChanged",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleGranted",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "sender",
                type: "address",
            },
        ],
        name: "RoleRevoked",
        type: "event",
    },
    {
        inputs: [],
        name: "DEFAULT_ADMIN_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "PARAMS_ADMIN_ROLE",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "beforeLength",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "uploadSectors",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "paddingSectors",
                type: "uint256",
            },
        ],
        name: "chargeFee",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "flow",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
        ],
        name: "getRoleAdmin",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "uint256",
                name: "index",
                type: "uint256",
            },
        ],
        name: "getRoleMember",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
        ],
        name: "getRoleMemberCount",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "grantRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "hasRole",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "pricePerSector_",
                type: "uint256",
            },
            {
                internalType: "address",
                name: "flow_",
                type: "address",
            },
            {
                internalType: "address",
                name: "reward_",
                type: "address",
            },
        ],
        name: "initialize",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "initialized",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "pricePerSector",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "renounceRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "role",
                type: "bytes32",
            },
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
        ],
        name: "revokeRole",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "reward",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "pricePerSector_",
                type: "uint256",
            },
        ],
        name: "setPricePerSector",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        stateMutability: "payable",
        type: "receive",
    },
];
const _bytecode = "0x608060405234801561001057600080fd5b50610fca806100206000396000f3fe6080604052600436106101025760003560e01c806361ec508211610095578063b15d20da11610064578063b15d20da146102c1578063b4988fd0146102f5578063ca15c87314610315578063d547741f14610335578063da6eb36a1461035557600080fd5b806361ec5082146102565780639010d07c1461026c57806391d148541461028c578063a217fddf146102ac57600080fd5b8063248a9ca3116100d1578063248a9ca3146101b75780632f2ff15d146101f6578063343aad821461021657806336568abe1461023657600080fd5b806301ffc9a71461010e57806314aa90a114610143578063158ef93e14610165578063228cb7331461017f57600080fd5b3661010957005b600080fd5b34801561011a57600080fd5b5061012e610129366004610cdd565b610375565b60405190151581526020015b60405180910390f35b34801561014f57600080fd5b5061016361015e366004610d07565b6103a0565b005b34801561017157600080fd5b5060005461012e9060ff1681565b34801561018b57600080fd5b5060375461019f906001600160a01b031681565b6040516001600160a01b03909116815260200161013a565b3480156101c357600080fd5b506101e86101d2366004610d07565b6000908152600160208190526040909120015490565b60405190815260200161013a565b34801561020257600080fd5b50610163610211366004610d3c565b6103d0565b34801561022257600080fd5b5060365461019f906001600160a01b031681565b34801561024257600080fd5b50610163610251366004610d3c565b6103fb565b34801561026257600080fd5b506101e860355481565b34801561027857600080fd5b5061019f610287366004610d68565b61047e565b34801561029857600080fd5b5061012e6102a7366004610d3c565b61049d565b3480156102b857600080fd5b506101e8600081565b3480156102cd57600080fd5b506101e87fb9d69e0ca90be54a40811e436234a7f7908b87ff2bec27e64f878b166da8e8e581565b34801561030157600080fd5b50610163610310366004610d8a565b6104c8565b34801561032157600080fd5b506101e8610330366004610d07565b6105a2565b34801561034157600080fd5b50610163610350366004610d3c565b6105b9565b34801561036157600080fd5b50610163610370366004610dc6565b6105df565b60006001600160e01b03198216635a05180f60e01b148061039a575061039a826107d2565b92915050565b7fb9d69e0ca90be54a40811e436234a7f7908b87ff2bec27e64f878b166da8e8e56103ca81610807565b50603555565b600082815260016020819052604090912001546103ec81610807565b6103f68383610814565b505050565b6001600160a01b03811633146104705760405162461bcd60e51b815260206004820152602f60248201527f416363657373436f6e74726f6c3a2063616e206f6e6c792072656e6f756e636560448201526e103937b632b9903337b91039b2b63360891b60648201526084015b60405180910390fd5b61047a8282610836565b5050565b60008281526002602052604081206104969083610858565b9392505050565b60009182526001602090815260408084206001600160a01b0393909316845291905290205460ff1690565b60005460ff16156105275760405162461bcd60e51b8152602060048201526024808201527f5a67496e697469616c697a61626c653a20616c726561647920696e697469616c6044820152631a5e995960e21b6064820152608401610467565b6000805460ff191660011781556105449061053f3390565b610814565b61056e7fb9d69e0ca90be54a40811e436234a7f7908b87ff2bec27e64f878b166da8e8e533610814565b603592909255603680546001600160a01b039283166001600160a01b03199182161790915560378054929093169116179055565b600081815260026020526040812061039a90610864565b600082815260016020819052604090912001546105d581610807565b6103f68383610836565b6036546001600160a01b0316336001600160a01b0316146106425760405162461bcd60e51b815260206004820152601f60248201527f53656e64657220646f6573206e6f742068617665207065726d697373696f6e006044820152606401610467565b600061064e8284610e08565b90506000836035546106609190610e1b565b9050478111156106a85760405162461bcd60e51b81526020600482015260136024820152724e6f7420656e6f75676820706169642066656560681b6044820152606401610467565b60006106b48247610e3a565b90506000836106c38685610e1b565b6106cd9190610e4d565b905060006106db8285610e3a565b9050851561074a576037546040516259e96760e81b8152600481018a9052602481018890526001600160a01b03909116906359e967009084906044016000604051808303818588803b15801561073057600080fd5b505af1158015610744573d6000803e3d6000fd5b50505050505b6037546001600160a01b03166359e967006107658386610e08565b61076f898c610e08565b8a6040518463ffffffff1660e01b8152600401610796929190918252602082015260400190565b6000604051808303818588803b1580156107af57600080fd5b505af11580156107c3573d6000803e3d6000fd5b50505050505050505050505050565b60006001600160e01b03198216637965db0b60e01b148061039a57506301ffc9a760e01b6001600160e01b031983161461039a565b610811813361086e565b50565b61081e82826108c7565b60008281526002602052604090206103f69082610932565b6108408282610947565b60008281526002602052604090206103f690826109ae565b600061049683836109c3565b600061039a825490565b610878828261049d565b61047a57610885816109ed565b6108908360206109ff565b6040516020016108a1929190610e93565b60408051601f198184030181529082905262461bcd60e51b825261046791600401610f08565b6108d1828261049d565b61047a5760008281526001602081815260408084206001600160a01b0386168086529252808420805460ff19169093179092559051339285917f2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d9190a45050565b6000610496836001600160a01b038416610b9b565b610951828261049d565b1561047a5760008281526001602090815260408083206001600160a01b0385168085529252808320805460ff1916905551339285917ff6391f5c32d9c69d2a47ea670b442974b53935d1edc7fd64eb21e047a839171b9190a45050565b6000610496836001600160a01b038416610bea565b60008260000182815481106109da576109da610f3b565b9060005260206000200154905092915050565b606061039a6001600160a01b03831660145b60606000610a0e836002610e1b565b610a19906002610e08565b67ffffffffffffffff811115610a3157610a31610f51565b6040519080825280601f01601f191660200182016040528015610a5b576020820181803683370190505b509050600360fc1b81600081518110610a7657610a76610f3b565b60200101906001600160f81b031916908160001a905350600f60fb1b81600181518110610aa557610aa5610f3b565b60200101906001600160f81b031916908160001a9053506000610ac9846002610e1b565b610ad4906001610e08565b90505b6001811115610b4c576f181899199a1a9b1b9c1cb0b131b232b360811b85600f1660108110610b0857610b08610f3b565b1a60f81b828281518110610b1e57610b1e610f3b565b60200101906001600160f81b031916908160001a90535060049490941c93610b4581610f67565b9050610ad7565b5083156104965760405162461bcd60e51b815260206004820181905260248201527f537472696e67733a20686578206c656e67746820696e73756666696369656e746044820152606401610467565b6000818152600183016020526040812054610be25750815460018181018455600084815260208082209093018490558454848252828601909352604090209190915561039a565b50600061039a565b60008181526001830160205260408120548015610cd3576000610c0e600183610e3a565b8554909150600090610c2290600190610e3a565b9050818114610c87576000866000018281548110610c4257610c42610f3b565b9060005260206000200154905080876000018481548110610c6557610c65610f3b565b6000918252602080832090910192909255918252600188019052604090208390555b8554869080610c9857610c98610f7e565b60019003818190600052602060002001600090559055856001016000868152602001908152602001600020600090556001935050505061039a565b600091505061039a565b600060208284031215610cef57600080fd5b81356001600160e01b03198116811461049657600080fd5b600060208284031215610d1957600080fd5b5035919050565b80356001600160a01b0381168114610d3757600080fd5b919050565b60008060408385031215610d4f57600080fd5b82359150610d5f60208401610d20565b90509250929050565b60008060408385031215610d7b57600080fd5b50508035926020909101359150565b600080600060608486031215610d9f57600080fd5b83359250610daf60208501610d20565b9150610dbd60408501610d20565b90509250925092565b600080600060608486031215610ddb57600080fd5b505081359360208301359350604090920135919050565b634e487b7160e01b600052601160045260246000fd5b8082018082111561039a5761039a610df2565b6000816000190483118215151615610e3557610e35610df2565b500290565b8181038181111561039a5761039a610df2565b600082610e6a57634e487b7160e01b600052601260045260246000fd5b500490565b60005b83811015610e8a578181015183820152602001610e72565b50506000910152565b7f416363657373436f6e74726f6c3a206163636f756e7420000000000000000000815260008351610ecb816017850160208801610e6f565b7001034b99036b4b9b9b4b733903937b6329607d1b6017918401918201528351610efc816028840160208801610e6f565b01602801949350505050565b6020815260008251806020840152610f27816040850160208701610e6f565b601f01601f19169190910160400192915050565b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052604160045260246000fd5b600081610f7657610f76610df2565b506000190190565b634e487b7160e01b600052603160045260246000fdfea26469706673582212206c18e30f17a0145ebc7fa4f6e736d2773235480154bb1e2086402acd2b9bf91b64736f6c63430008100033";
const isSuperArgs = (xs) => xs.length > 1;
class FixedPrice__factory extends ContractFactory {
    constructor(...args) {
        if (isSuperArgs(args)) {
            super(...args);
        }
        else {
            super(_abi, _bytecode, args[0]);
        }
    }
    getDeployTransaction(overrides) {
        return super.getDeployTransaction(overrides || {});
    }
    deploy(overrides) {
        return super.deploy(overrides || {});
    }
    connect(runner) {
        return super.connect(runner);
    }
    static bytecode = _bytecode;
    static abi = _abi;
    static createInterface() {
        return new Interface(_abi);
    }
    static connect(address, runner) {
        return new Contract(address, _abi, runner);
    }
}

function getFlowContract(address, signer) {
    return FixedPriceFlow__factory.connect(address, signer);
}
function getMarketContract(address, runner) {
    return FixedPrice__factory.connect(address, runner);
}
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
function checkExist(inputPath) {
    const dirName = path.dirname(inputPath);
    if (!fs.existsSync(dirName)) {
        return true;
    }
    if (fs.existsSync(inputPath) && fs.lstatSync(inputPath).isDirectory()) {
        return true;
    }
    // Check if the directory exists and the file does not exist
    if (!fs.existsSync(inputPath)) {
        return false;
    }
    return true;
}
function GetSplitNum(total, unit) {
    return Math.floor((total - 1) / unit + 1);
}
/**
 * Calculates the start and end segment indices for a file,
 * given the file's start chunk index and file size.
 *
 * @param startChunkIndex - the starting chunk index (integer)
 * @param fileSize - the file size (number of chunks, as an integer)
 * @returns a tuple [startSegmentIndex, endSegmentIndex]
 */
function SegmentRange(startChunkIndex, fileSize) {
    // Calculate total number of chunks for the file
    const totalChunks = GetSplitNum(fileSize, DEFAULT_CHUNK_SIZE);
    // Calculate the starting segment index using integer division
    const startSegmentIndex = Math.floor(startChunkIndex / DEFAULT_SEGMENT_MAX_CHUNKS);
    // Calculate the ending chunk index and then the segment index
    const endChunkIndex = startChunkIndex + totalChunks - 1;
    const endSegmentIndex = Math.floor(endChunkIndex / DEFAULT_SEGMENT_MAX_CHUNKS);
    return [startSegmentIndex, endSegmentIndex];
}
async function txWithGasAdjustment(contract, provider, method, params, txOpts, retryOpts) {
    let current_gas_price = txOpts.gasPrice; // gas price is required in txOpts
    let maxGasPrice = current_gas_price;
    if (retryOpts !== undefined && retryOpts.MaxGasPrice > 0) {
        maxGasPrice = BigInt(retryOpts.MaxGasPrice);
    }
    while (current_gas_price <= maxGasPrice) {
        console.log(`Sending transaction with gas price ${current_gas_price}`);
        txOpts.gasPrice = current_gas_price;
        try {
            let resp = await contract
                .getFunction(method)
                .send(...params, txOpts);
            const tx = (await Promise.race([
                resp.wait(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Transaction timeout')), TIMEOUT_MS)),
            ]));
            if (tx === null) {
                throw new Error('Send transaction timeout');
            }
            let receipt = await waitForReceipt(provider, tx.hash, retryOpts);
            if (receipt === null) {
                throw new Error('Get transaction receipt timeout');
            }
            return receipt;
        }
        catch (e) {
            console.log(`Failed to send transaction with gas price ${current_gas_price}, with error ${e}, retrying with higher gas price`);
            current_gas_price =
                (BigInt(11) * BigInt(current_gas_price)) / BigInt(10);
        }
    }
    return null;
}
async function waitForReceipt(provider, txHash, opts) {
    var receipt = null;
    if (opts === undefined) {
        opts = { Retries: 10, Interval: 5, MaxGasPrice: 0 };
    }
    if (opts.Retries === undefined || opts.Retries === 0) {
        opts.Retries = 10;
    }
    if (opts.Interval === undefined || opts.Interval === 0) {
        opts.Interval = 5;
    }
    let nTries = 0;
    while (nTries < opts.Retries) {
        receipt = await provider.getTransactionReceipt(txHash);
        if (receipt !== null && receipt.status == 1) {
            return receipt;
        }
        await delay(opts.Interval * 1000);
        nTries++;
    }
    return null;
}

class JsonRpcError extends Error {
    constructor(message, code, data) {
        super(message);
        this.code = code;
        this.data = data;
    }
}
class BaseProvider {
    constructor(options) {
        // super();
        this.url = options.url;
        this.timeout = options.timeout || 30000; // 30 seconds
        this.retry = options.retry || 3;
    }
    _transport(data) {
        throw new Error('_transport not implemented');
    }
    _transportBatch(data) {
        throw new Error('_transportBatch not implemented');
    }
    id() {
        const id = (Date.now() + Math.random()) * 10000;
        return Number(id);
    }
    buildRpcPayload(req) {
        return {
            jsonrpc: '2.0',
            method: req.method,
            params: req.params,
            id: this.id(),
        };
    }
    async request(req) {
        const data = await this._transport(this.buildRpcPayload(req));
        const { result, error } = data;
        if (error)
            throw new JsonRpcError(error.message, error.code, error.data);
        return result;
    }
    async requestBatch(batch) {
        const data = await this._transportBatch(batch.map(this.buildRpcPayload));
        return data.map(({ result, error }) => {
            return error ? new JsonRpcError(error.message, error.code, error.data) : result;
        });
    }
    // legacy methods
    send(method, params) {
        return this.request({ method, params });
    }
    sendAsync(payload, callback) {
        this._transport(payload)
            .then(data => callback(null, data))
            .catch(err => callback(err));
    }
    call(method, ...args) {
        return this.request({ method, params: args });
    }
    close() { }
}

var axios$3 = {exports: {}};

var bind$2 = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

var bind$1 = bind$2;

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

// eslint-disable-next-line func-names
var kindOf = (function(cache) {
  // eslint-disable-next-line func-names
  return function(thing) {
    var str = toString.call(thing);
    return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
  };
})(Object.create(null));

function kindOfTest(type) {
  type = type.toLowerCase();
  return function isKindOf(thing) {
    return kindOf(thing) === type;
  };
}

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return Array.isArray(val);
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is a Buffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Buffer, otherwise false
 */
function isBuffer(val) {
  return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
    && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
var isArrayBuffer = kindOfTest('ArrayBuffer');


/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (isArrayBuffer(val.buffer));
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a plain Object
 *
 * @param {Object} val The value to test
 * @return {boolean} True if value is a plain Object, otherwise false
 */
function isPlainObject(val) {
  if (kindOf(val) !== 'object') {
    return false;
  }

  var prototype = Object.getPrototypeOf(val);
  return prototype === null || prototype === Object.prototype;
}

/**
 * Determine if a value is a Date
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
var isDate = kindOfTest('Date');

/**
 * Determine if a value is a File
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
var isFile = kindOfTest('File');

/**
 * Determine if a value is a Blob
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
var isBlob = kindOfTest('Blob');

/**
 * Determine if a value is a FileList
 *
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
var isFileList = kindOfTest('FileList');

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} thing The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(thing) {
  var pattern = '[object FormData]';
  return thing && (
    (typeof FormData === 'function' && thing instanceof FormData) ||
    toString.call(thing) === pattern ||
    (isFunction(thing.toString) && thing.toString() === pattern)
  );
}

/**
 * Determine if a value is a URLSearchParams object
 * @function
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
var isURLSearchParams = kindOfTest('URLSearchParams');

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.trim ? str.trim() : str.replace(/^\s+|\s+$/g, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (isPlainObject(result[key]) && isPlainObject(val)) {
      result[key] = merge(result[key], val);
    } else if (isPlainObject(val)) {
      result[key] = merge({}, val);
    } else if (isArray(val)) {
      result[key] = val.slice();
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind$1(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

/**
 * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
 *
 * @param {string} content with BOM
 * @return {string} content value without BOM
 */
function stripBOM(content) {
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }
  return content;
}

/**
 * Inherit the prototype methods from one constructor into another
 * @param {function} constructor
 * @param {function} superConstructor
 * @param {object} [props]
 * @param {object} [descriptors]
 */

function inherits(constructor, superConstructor, props, descriptors) {
  constructor.prototype = Object.create(superConstructor.prototype, descriptors);
  constructor.prototype.constructor = constructor;
  props && Object.assign(constructor.prototype, props);
}

/**
 * Resolve object with deep prototype chain to a flat object
 * @param {Object} sourceObj source object
 * @param {Object} [destObj]
 * @param {Function} [filter]
 * @returns {Object}
 */

function toFlatObject(sourceObj, destObj, filter) {
  var props;
  var i;
  var prop;
  var merged = {};

  destObj = destObj || {};

  do {
    props = Object.getOwnPropertyNames(sourceObj);
    i = props.length;
    while (i-- > 0) {
      prop = props[i];
      if (!merged[prop]) {
        destObj[prop] = sourceObj[prop];
        merged[prop] = true;
      }
    }
    sourceObj = Object.getPrototypeOf(sourceObj);
  } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);

  return destObj;
}

/*
 * determines whether a string ends with the characters of a specified string
 * @param {String} str
 * @param {String} searchString
 * @param {Number} [position= 0]
 * @returns {boolean}
 */
function endsWith(str, searchString, position) {
  str = String(str);
  if (position === undefined || position > str.length) {
    position = str.length;
  }
  position -= searchString.length;
  var lastIndex = str.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}


/**
 * Returns new array from array like object
 * @param {*} [thing]
 * @returns {Array}
 */
function toArray(thing) {
  if (!thing) return null;
  var i = thing.length;
  if (isUndefined(i)) return null;
  var arr = new Array(i);
  while (i-- > 0) {
    arr[i] = thing[i];
  }
  return arr;
}

// eslint-disable-next-line func-names
var isTypedArray = (function(TypedArray) {
  // eslint-disable-next-line func-names
  return function(thing) {
    return TypedArray && thing instanceof TypedArray;
  };
})(typeof Uint8Array !== 'undefined' && Object.getPrototypeOf(Uint8Array));

var utils$9 = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isPlainObject: isPlainObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  extend: extend,
  trim: trim,
  stripBOM: stripBOM,
  inherits: inherits,
  toFlatObject: toFlatObject,
  kindOf: kindOf,
  kindOfTest: kindOfTest,
  endsWith: endsWith,
  toArray: toArray,
  isTypedArray: isTypedArray,
  isFileList: isFileList
};

var utils$8 = utils$9;

function encode(val) {
  return encodeURIComponent(val).
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
var buildURL$1 = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils$8.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils$8.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils$8.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils$8.forEach(val, function parseValue(v) {
        if (utils$8.isDate(v)) {
          v = v.toISOString();
        } else if (utils$8.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

var utils$7 = utils$9;

function InterceptorManager$1() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager$1.prototype.use = function use(fulfilled, rejected, options) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected,
    synchronous: options ? options.synchronous : false,
    runWhen: options ? options.runWhen : null
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager$1.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager$1.prototype.forEach = function forEach(fn) {
  utils$7.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

var InterceptorManager_1 = InterceptorManager$1;

var utils$6 = utils$9;

var normalizeHeaderName$1 = function normalizeHeaderName(headers, normalizedName) {
  utils$6.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

var AxiosError_1;
var hasRequiredAxiosError;

function requireAxiosError () {
	if (hasRequiredAxiosError) return AxiosError_1;
	hasRequiredAxiosError = 1;

	var utils = utils$9;

	/**
	 * Create an Error with the specified message, config, error code, request and response.
	 *
	 * @param {string} message The error message.
	 * @param {string} [code] The error code (for example, 'ECONNABORTED').
	 * @param {Object} [config] The config.
	 * @param {Object} [request] The request.
	 * @param {Object} [response] The response.
	 * @returns {Error} The created error.
	 */
	function AxiosError(message, code, config, request, response) {
	  Error.call(this);
	  this.message = message;
	  this.name = 'AxiosError';
	  code && (this.code = code);
	  config && (this.config = config);
	  request && (this.request = request);
	  response && (this.response = response);
	}

	utils.inherits(AxiosError, Error, {
	  toJSON: function toJSON() {
	    return {
	      // Standard
	      message: this.message,
	      name: this.name,
	      // Microsoft
	      description: this.description,
	      number: this.number,
	      // Mozilla
	      fileName: this.fileName,
	      lineNumber: this.lineNumber,
	      columnNumber: this.columnNumber,
	      stack: this.stack,
	      // Axios
	      config: this.config,
	      code: this.code,
	      status: this.response && this.response.status ? this.response.status : null
	    };
	  }
	});

	var prototype = AxiosError.prototype;
	var descriptors = {};

	[
	  'ERR_BAD_OPTION_VALUE',
	  'ERR_BAD_OPTION',
	  'ECONNABORTED',
	  'ETIMEDOUT',
	  'ERR_NETWORK',
	  'ERR_FR_TOO_MANY_REDIRECTS',
	  'ERR_DEPRECATED',
	  'ERR_BAD_RESPONSE',
	  'ERR_BAD_REQUEST',
	  'ERR_CANCELED'
	// eslint-disable-next-line func-names
	].forEach(function(code) {
	  descriptors[code] = {value: code};
	});

	Object.defineProperties(AxiosError, descriptors);
	Object.defineProperty(prototype, 'isAxiosError', {value: true});

	// eslint-disable-next-line func-names
	AxiosError.from = function(error, code, config, request, response, customProps) {
	  var axiosError = Object.create(prototype);

	  utils.toFlatObject(error, axiosError, function filter(obj) {
	    return obj !== Error.prototype;
	  });

	  AxiosError.call(axiosError, error.message, code, config, request, response);

	  axiosError.name = error.name;

	  customProps && Object.assign(axiosError, customProps);

	  return axiosError;
	};

	AxiosError_1 = AxiosError;
	return AxiosError_1;
}

var transitional = {
  silentJSONParsing: true,
  forcedJSONParsing: true,
  clarifyTimeoutError: false
};

var toFormData_1;
var hasRequiredToFormData;

function requireToFormData () {
	if (hasRequiredToFormData) return toFormData_1;
	hasRequiredToFormData = 1;

	var utils = utils$9;

	/**
	 * Convert a data object to FormData
	 * @param {Object} obj
	 * @param {?Object} [formData]
	 * @returns {Object}
	 **/

	function toFormData(obj, formData) {
	  // eslint-disable-next-line no-param-reassign
	  formData = formData || new FormData();

	  var stack = [];

	  function convertValue(value) {
	    if (value === null) return '';

	    if (utils.isDate(value)) {
	      return value.toISOString();
	    }

	    if (utils.isArrayBuffer(value) || utils.isTypedArray(value)) {
	      return typeof Blob === 'function' ? new Blob([value]) : Buffer.from(value);
	    }

	    return value;
	  }

	  function build(data, parentKey) {
	    if (utils.isPlainObject(data) || utils.isArray(data)) {
	      if (stack.indexOf(data) !== -1) {
	        throw Error('Circular reference detected in ' + parentKey);
	      }

	      stack.push(data);

	      utils.forEach(data, function each(value, key) {
	        if (utils.isUndefined(value)) return;
	        var fullKey = parentKey ? parentKey + '.' + key : key;
	        var arr;

	        if (value && !parentKey && typeof value === 'object') {
	          if (utils.endsWith(key, '{}')) {
	            // eslint-disable-next-line no-param-reassign
	            value = JSON.stringify(value);
	          } else if (utils.endsWith(key, '[]') && (arr = utils.toArray(value))) {
	            // eslint-disable-next-line func-names
	            arr.forEach(function(el) {
	              !utils.isUndefined(el) && formData.append(fullKey, convertValue(el));
	            });
	            return;
	          }
	        }

	        build(value, fullKey);
	      });

	      stack.pop();
	    } else {
	      formData.append(parentKey, convertValue(data));
	    }
	  }

	  build(obj);

	  return formData;
	}

	toFormData_1 = toFormData;
	return toFormData_1;
}

var settle;
var hasRequiredSettle;

function requireSettle () {
	if (hasRequiredSettle) return settle;
	hasRequiredSettle = 1;

	var AxiosError = requireAxiosError();

	/**
	 * Resolve or reject a Promise based on response status.
	 *
	 * @param {Function} resolve A function that resolves the promise.
	 * @param {Function} reject A function that rejects the promise.
	 * @param {object} response The response.
	 */
	settle = function settle(resolve, reject, response) {
	  var validateStatus = response.config.validateStatus;
	  if (!response.status || !validateStatus || validateStatus(response.status)) {
	    resolve(response);
	  } else {
	    reject(new AxiosError(
	      'Request failed with status code ' + response.status,
	      [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
	      response.config,
	      response.request,
	      response
	    ));
	  }
	};
	return settle;
}

var cookies;
var hasRequiredCookies;

function requireCookies () {
	if (hasRequiredCookies) return cookies;
	hasRequiredCookies = 1;

	var utils = utils$9;

	cookies = (
	  utils.isStandardBrowserEnv() ?

	  // Standard browser envs support document.cookie
	    (function standardBrowserEnv() {
	      return {
	        write: function write(name, value, expires, path, domain, secure) {
	          var cookie = [];
	          cookie.push(name + '=' + encodeURIComponent(value));

	          if (utils.isNumber(expires)) {
	            cookie.push('expires=' + new Date(expires).toGMTString());
	          }

	          if (utils.isString(path)) {
	            cookie.push('path=' + path);
	          }

	          if (utils.isString(domain)) {
	            cookie.push('domain=' + domain);
	          }

	          if (secure === true) {
	            cookie.push('secure');
	          }

	          document.cookie = cookie.join('; ');
	        },

	        read: function read(name) {
	          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
	          return (match ? decodeURIComponent(match[3]) : null);
	        },

	        remove: function remove(name) {
	          this.write(name, '', Date.now() - 86400000);
	        }
	      };
	    })() :

	  // Non standard browser env (web workers, react-native) lack needed support.
	    (function nonStandardBrowserEnv() {
	      return {
	        write: function write() {},
	        read: function read() { return null; },
	        remove: function remove() {}
	      };
	    })()
	);
	return cookies;
}

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
var isAbsoluteURL$1 = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
};

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
var combineURLs$1 = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

var isAbsoluteURL = isAbsoluteURL$1;
var combineURLs = combineURLs$1;

/**
 * Creates a new URL by combining the baseURL with the requestedURL,
 * only when the requestedURL is not already an absolute URL.
 * If the requestURL is absolute, this function returns the requestedURL untouched.
 *
 * @param {string} baseURL The base URL
 * @param {string} requestedURL Absolute or relative URL to combine
 * @returns {string} The combined full path
 */
var buildFullPath$1 = function buildFullPath(baseURL, requestedURL) {
  if (baseURL && !isAbsoluteURL(requestedURL)) {
    return combineURLs(baseURL, requestedURL);
  }
  return requestedURL;
};

var parseHeaders;
var hasRequiredParseHeaders;

function requireParseHeaders () {
	if (hasRequiredParseHeaders) return parseHeaders;
	hasRequiredParseHeaders = 1;

	var utils = utils$9;

	// Headers whose duplicates are ignored by node
	// c.f. https://nodejs.org/api/http.html#http_message_headers
	var ignoreDuplicateOf = [
	  'age', 'authorization', 'content-length', 'content-type', 'etag',
	  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
	  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
	  'referer', 'retry-after', 'user-agent'
	];

	/**
	 * Parse headers into an object
	 *
	 * ```
	 * Date: Wed, 27 Aug 2014 08:58:49 GMT
	 * Content-Type: application/json
	 * Connection: keep-alive
	 * Transfer-Encoding: chunked
	 * ```
	 *
	 * @param {String} headers Headers needing to be parsed
	 * @returns {Object} Headers parsed into an object
	 */
	parseHeaders = function parseHeaders(headers) {
	  var parsed = {};
	  var key;
	  var val;
	  var i;

	  if (!headers) { return parsed; }

	  utils.forEach(headers.split('\n'), function parser(line) {
	    i = line.indexOf(':');
	    key = utils.trim(line.substr(0, i)).toLowerCase();
	    val = utils.trim(line.substr(i + 1));

	    if (key) {
	      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
	        return;
	      }
	      if (key === 'set-cookie') {
	        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
	      } else {
	        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
	      }
	    }
	  });

	  return parsed;
	};
	return parseHeaders;
}

var isURLSameOrigin;
var hasRequiredIsURLSameOrigin;

function requireIsURLSameOrigin () {
	if (hasRequiredIsURLSameOrigin) return isURLSameOrigin;
	hasRequiredIsURLSameOrigin = 1;

	var utils = utils$9;

	isURLSameOrigin = (
	  utils.isStandardBrowserEnv() ?

	  // Standard browser envs have full support of the APIs needed to test
	  // whether the request URL is of the same origin as current location.
	    (function standardBrowserEnv() {
	      var msie = /(msie|trident)/i.test(navigator.userAgent);
	      var urlParsingNode = document.createElement('a');
	      var originURL;

	      /**
	    * Parse a URL to discover it's components
	    *
	    * @param {String} url The URL to be parsed
	    * @returns {Object}
	    */
	      function resolveURL(url) {
	        var href = url;

	        if (msie) {
	        // IE needs attribute set twice to normalize properties
	          urlParsingNode.setAttribute('href', href);
	          href = urlParsingNode.href;
	        }

	        urlParsingNode.setAttribute('href', href);

	        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
	        return {
	          href: urlParsingNode.href,
	          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
	          host: urlParsingNode.host,
	          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
	          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
	          hostname: urlParsingNode.hostname,
	          port: urlParsingNode.port,
	          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
	            urlParsingNode.pathname :
	            '/' + urlParsingNode.pathname
	        };
	      }

	      originURL = resolveURL(window.location.href);

	      /**
	    * Determine if a URL shares the same origin as the current location
	    *
	    * @param {String} requestURL The URL to test
	    * @returns {boolean} True if URL shares the same origin, otherwise false
	    */
	      return function isURLSameOrigin(requestURL) {
	        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
	        return (parsed.protocol === originURL.protocol &&
	            parsed.host === originURL.host);
	      };
	    })() :

	  // Non standard browser envs (web workers, react-native) lack needed support.
	    (function nonStandardBrowserEnv() {
	      return function isURLSameOrigin() {
	        return true;
	      };
	    })()
	);
	return isURLSameOrigin;
}

var CanceledError_1;
var hasRequiredCanceledError;

function requireCanceledError () {
	if (hasRequiredCanceledError) return CanceledError_1;
	hasRequiredCanceledError = 1;

	var AxiosError = requireAxiosError();
	var utils = utils$9;

	/**
	 * A `CanceledError` is an object that is thrown when an operation is canceled.
	 *
	 * @class
	 * @param {string=} message The message.
	 */
	function CanceledError(message) {
	  // eslint-disable-next-line no-eq-null,eqeqeq
	  AxiosError.call(this, message == null ? 'canceled' : message, AxiosError.ERR_CANCELED);
	  this.name = 'CanceledError';
	}

	utils.inherits(CanceledError, AxiosError, {
	  __CANCEL__: true
	});

	CanceledError_1 = CanceledError;
	return CanceledError_1;
}

var parseProtocol;
var hasRequiredParseProtocol;

function requireParseProtocol () {
	if (hasRequiredParseProtocol) return parseProtocol;
	hasRequiredParseProtocol = 1;

	parseProtocol = function parseProtocol(url) {
	  var match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url);
	  return match && match[1] || '';
	};
	return parseProtocol;
}

var xhr;
var hasRequiredXhr;

function requireXhr () {
	if (hasRequiredXhr) return xhr;
	hasRequiredXhr = 1;

	var utils = utils$9;
	var settle = requireSettle();
	var cookies = requireCookies();
	var buildURL = buildURL$1;
	var buildFullPath = buildFullPath$1;
	var parseHeaders = requireParseHeaders();
	var isURLSameOrigin = requireIsURLSameOrigin();
	var transitionalDefaults = transitional;
	var AxiosError = requireAxiosError();
	var CanceledError = requireCanceledError();
	var parseProtocol = requireParseProtocol();

	xhr = function xhrAdapter(config) {
	  return new Promise(function dispatchXhrRequest(resolve, reject) {
	    var requestData = config.data;
	    var requestHeaders = config.headers;
	    var responseType = config.responseType;
	    var onCanceled;
	    function done() {
	      if (config.cancelToken) {
	        config.cancelToken.unsubscribe(onCanceled);
	      }

	      if (config.signal) {
	        config.signal.removeEventListener('abort', onCanceled);
	      }
	    }

	    if (utils.isFormData(requestData) && utils.isStandardBrowserEnv()) {
	      delete requestHeaders['Content-Type']; // Let the browser set it
	    }

	    var request = new XMLHttpRequest();

	    // HTTP basic authentication
	    if (config.auth) {
	      var username = config.auth.username || '';
	      var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
	      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
	    }

	    var fullPath = buildFullPath(config.baseURL, config.url);

	    request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

	    // Set the request timeout in MS
	    request.timeout = config.timeout;

	    function onloadend() {
	      if (!request) {
	        return;
	      }
	      // Prepare the response
	      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
	      var responseData = !responseType || responseType === 'text' ||  responseType === 'json' ?
	        request.responseText : request.response;
	      var response = {
	        data: responseData,
	        status: request.status,
	        statusText: request.statusText,
	        headers: responseHeaders,
	        config: config,
	        request: request
	      };

	      settle(function _resolve(value) {
	        resolve(value);
	        done();
	      }, function _reject(err) {
	        reject(err);
	        done();
	      }, response);

	      // Clean up request
	      request = null;
	    }

	    if ('onloadend' in request) {
	      // Use onloadend if available
	      request.onloadend = onloadend;
	    } else {
	      // Listen for ready state to emulate onloadend
	      request.onreadystatechange = function handleLoad() {
	        if (!request || request.readyState !== 4) {
	          return;
	        }

	        // The request errored out and we didn't get a response, this will be
	        // handled by onerror instead
	        // With one exception: request that using file: protocol, most browsers
	        // will return status as 0 even though it's a successful request
	        if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
	          return;
	        }
	        // readystate handler is calling before onerror or ontimeout handlers,
	        // so we should call onloadend on the next 'tick'
	        setTimeout(onloadend);
	      };
	    }

	    // Handle browser request cancellation (as opposed to a manual cancellation)
	    request.onabort = function handleAbort() {
	      if (!request) {
	        return;
	      }

	      reject(new AxiosError('Request aborted', AxiosError.ECONNABORTED, config, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle low level network errors
	    request.onerror = function handleError() {
	      // Real errors are hidden from us by the browser
	      // onerror should only fire if it's a network error
	      reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, request, request));

	      // Clean up request
	      request = null;
	    };

	    // Handle timeout
	    request.ontimeout = function handleTimeout() {
	      var timeoutErrorMessage = config.timeout ? 'timeout of ' + config.timeout + 'ms exceeded' : 'timeout exceeded';
	      var transitional = config.transitional || transitionalDefaults;
	      if (config.timeoutErrorMessage) {
	        timeoutErrorMessage = config.timeoutErrorMessage;
	      }
	      reject(new AxiosError(
	        timeoutErrorMessage,
	        transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
	        config,
	        request));

	      // Clean up request
	      request = null;
	    };

	    // Add xsrf header
	    // This is only done if running in a standard browser environment.
	    // Specifically not if we're in a web worker, or react-native.
	    if (utils.isStandardBrowserEnv()) {
	      // Add xsrf header
	      var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
	        cookies.read(config.xsrfCookieName) :
	        undefined;

	      if (xsrfValue) {
	        requestHeaders[config.xsrfHeaderName] = xsrfValue;
	      }
	    }

	    // Add headers to the request
	    if ('setRequestHeader' in request) {
	      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
	        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
	          // Remove Content-Type if data is undefined
	          delete requestHeaders[key];
	        } else {
	          // Otherwise add header to the request
	          request.setRequestHeader(key, val);
	        }
	      });
	    }

	    // Add withCredentials to request if needed
	    if (!utils.isUndefined(config.withCredentials)) {
	      request.withCredentials = !!config.withCredentials;
	    }

	    // Add responseType to request if needed
	    if (responseType && responseType !== 'json') {
	      request.responseType = config.responseType;
	    }

	    // Handle progress if needed
	    if (typeof config.onDownloadProgress === 'function') {
	      request.addEventListener('progress', config.onDownloadProgress);
	    }

	    // Not all browsers support upload events
	    if (typeof config.onUploadProgress === 'function' && request.upload) {
	      request.upload.addEventListener('progress', config.onUploadProgress);
	    }

	    if (config.cancelToken || config.signal) {
	      // Handle cancellation
	      // eslint-disable-next-line func-names
	      onCanceled = function(cancel) {
	        if (!request) {
	          return;
	        }
	        reject(!cancel || (cancel && cancel.type) ? new CanceledError() : cancel);
	        request.abort();
	        request = null;
	      };

	      config.cancelToken && config.cancelToken.subscribe(onCanceled);
	      if (config.signal) {
	        config.signal.aborted ? onCanceled() : config.signal.addEventListener('abort', onCanceled);
	      }
	    }

	    if (!requestData) {
	      requestData = null;
	    }

	    var protocol = parseProtocol(fullPath);

	    if (protocol && [ 'http', 'https', 'file' ].indexOf(protocol) === -1) {
	      reject(new AxiosError('Unsupported protocol ' + protocol + ':', AxiosError.ERR_BAD_REQUEST, config));
	      return;
	    }


	    // Send the request
	    request.send(requestData);
	  });
	};
	return xhr;
}

var _null;
var hasRequired_null;

function require_null () {
	if (hasRequired_null) return _null;
	hasRequired_null = 1;
	// eslint-disable-next-line strict
	_null = null;
	return _null;
}

var utils$5 = utils$9;
var normalizeHeaderName = normalizeHeaderName$1;
var AxiosError$1 = requireAxiosError();
var transitionalDefaults = transitional;
var toFormData = requireToFormData();

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils$5.isUndefined(headers) && utils$5.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = requireXhr();
  } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = requireXhr();
  }
  return adapter;
}

function stringifySafely(rawValue, parser, encoder) {
  if (utils$5.isString(rawValue)) {
    try {
      (parser || JSON.parse)(rawValue);
      return utils$5.trim(rawValue);
    } catch (e) {
      if (e.name !== 'SyntaxError') {
        throw e;
      }
    }
  }

  return (encoder || JSON.stringify)(rawValue);
}

var defaults$3 = {

  transitional: transitionalDefaults,

  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');

    if (utils$5.isFormData(data) ||
      utils$5.isArrayBuffer(data) ||
      utils$5.isBuffer(data) ||
      utils$5.isStream(data) ||
      utils$5.isFile(data) ||
      utils$5.isBlob(data)
    ) {
      return data;
    }
    if (utils$5.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils$5.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }

    var isObjectPayload = utils$5.isObject(data);
    var contentType = headers && headers['Content-Type'];

    var isFileList;

    if ((isFileList = utils$5.isFileList(data)) || (isObjectPayload && contentType === 'multipart/form-data')) {
      var _FormData = this.env && this.env.FormData;
      return toFormData(isFileList ? {'files[]': data} : data, _FormData && new _FormData());
    } else if (isObjectPayload || contentType === 'application/json') {
      setContentTypeIfUnset(headers, 'application/json');
      return stringifySafely(data);
    }

    return data;
  }],

  transformResponse: [function transformResponse(data) {
    var transitional = this.transitional || defaults$3.transitional;
    var silentJSONParsing = transitional && transitional.silentJSONParsing;
    var forcedJSONParsing = transitional && transitional.forcedJSONParsing;
    var strictJSONParsing = !silentJSONParsing && this.responseType === 'json';

    if (strictJSONParsing || (forcedJSONParsing && utils$5.isString(data) && data.length)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        if (strictJSONParsing) {
          if (e.name === 'SyntaxError') {
            throw AxiosError$1.from(e, AxiosError$1.ERR_BAD_RESPONSE, this, null, this.response);
          }
          throw e;
        }
      }
    }

    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,
  maxBodyLength: -1,

  env: {
    FormData: require_null()
  },

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  },

  headers: {
    common: {
      'Accept': 'application/json, text/plain, */*'
    }
  }
};

utils$5.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults$3.headers[method] = {};
});

utils$5.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults$3.headers[method] = utils$5.merge(DEFAULT_CONTENT_TYPE);
});

var defaults_1 = defaults$3;

var utils$4 = utils$9;
var defaults$2 = defaults_1;

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
var transformData$1 = function transformData(data, headers, fns) {
  var context = this || defaults$2;
  /*eslint no-param-reassign:0*/
  utils$4.forEach(fns, function transform(fn) {
    data = fn.call(context, data, headers);
  });

  return data;
};

var isCancel$1;
var hasRequiredIsCancel;

function requireIsCancel () {
	if (hasRequiredIsCancel) return isCancel$1;
	hasRequiredIsCancel = 1;

	isCancel$1 = function isCancel(value) {
	  return !!(value && value.__CANCEL__);
	};
	return isCancel$1;
}

var utils$3 = utils$9;
var transformData = transformData$1;
var isCancel = requireIsCancel();
var defaults$1 = defaults_1;
var CanceledError = requireCanceledError();

/**
 * Throws a `CanceledError` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }

  if (config.signal && config.signal.aborted) {
    throw new CanceledError();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
var dispatchRequest$1 = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData.call(
    config,
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils$3.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers
  );

  utils$3.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults$1.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData.call(
      config,
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData.call(
          config,
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

var utils$2 = utils$9;

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
var mergeConfig$2 = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  function getMergedValue(target, source) {
    if (utils$2.isPlainObject(target) && utils$2.isPlainObject(source)) {
      return utils$2.merge(target, source);
    } else if (utils$2.isPlainObject(source)) {
      return utils$2.merge({}, source);
    } else if (utils$2.isArray(source)) {
      return source.slice();
    }
    return source;
  }

  // eslint-disable-next-line consistent-return
  function mergeDeepProperties(prop) {
    if (!utils$2.isUndefined(config2[prop])) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (!utils$2.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function valueFromConfig2(prop) {
    if (!utils$2.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function defaultToConfig2(prop) {
    if (!utils$2.isUndefined(config2[prop])) {
      return getMergedValue(undefined, config2[prop]);
    } else if (!utils$2.isUndefined(config1[prop])) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  // eslint-disable-next-line consistent-return
  function mergeDirectKeys(prop) {
    if (prop in config2) {
      return getMergedValue(config1[prop], config2[prop]);
    } else if (prop in config1) {
      return getMergedValue(undefined, config1[prop]);
    }
  }

  var mergeMap = {
    'url': valueFromConfig2,
    'method': valueFromConfig2,
    'data': valueFromConfig2,
    'baseURL': defaultToConfig2,
    'transformRequest': defaultToConfig2,
    'transformResponse': defaultToConfig2,
    'paramsSerializer': defaultToConfig2,
    'timeout': defaultToConfig2,
    'timeoutMessage': defaultToConfig2,
    'withCredentials': defaultToConfig2,
    'adapter': defaultToConfig2,
    'responseType': defaultToConfig2,
    'xsrfCookieName': defaultToConfig2,
    'xsrfHeaderName': defaultToConfig2,
    'onUploadProgress': defaultToConfig2,
    'onDownloadProgress': defaultToConfig2,
    'decompress': defaultToConfig2,
    'maxContentLength': defaultToConfig2,
    'maxBodyLength': defaultToConfig2,
    'beforeRedirect': defaultToConfig2,
    'transport': defaultToConfig2,
    'httpAgent': defaultToConfig2,
    'httpsAgent': defaultToConfig2,
    'cancelToken': defaultToConfig2,
    'socketPath': defaultToConfig2,
    'responseEncoding': defaultToConfig2,
    'validateStatus': mergeDirectKeys
  };

  utils$2.forEach(Object.keys(config1).concat(Object.keys(config2)), function computeConfigValue(prop) {
    var merge = mergeMap[prop] || mergeDeepProperties;
    var configValue = merge(prop);
    (utils$2.isUndefined(configValue) && merge !== mergeDirectKeys) || (config[prop] = configValue);
  });

  return config;
};

var data;
var hasRequiredData;

function requireData () {
	if (hasRequiredData) return data;
	hasRequiredData = 1;
	data = {
	  "version": "0.27.2"
	};
	return data;
}

var VERSION = requireData().version;
var AxiosError = requireAxiosError();

var validators$1 = {};

// eslint-disable-next-line func-names
['object', 'boolean', 'number', 'function', 'string', 'symbol'].forEach(function(type, i) {
  validators$1[type] = function validator(thing) {
    return typeof thing === type || 'a' + (i < 1 ? 'n ' : ' ') + type;
  };
});

var deprecatedWarnings = {};

/**
 * Transitional option validator
 * @param {function|boolean?} validator - set to false if the transitional option has been removed
 * @param {string?} version - deprecated version / removed since version
 * @param {string?} message - some message with additional info
 * @returns {function}
 */
validators$1.transitional = function transitional(validator, version, message) {
  function formatMessage(opt, desc) {
    return '[Axios v' + VERSION + '] Transitional option \'' + opt + '\'' + desc + (message ? '. ' + message : '');
  }

  // eslint-disable-next-line func-names
  return function(value, opt, opts) {
    if (validator === false) {
      throw new AxiosError(
        formatMessage(opt, ' has been removed' + (version ? ' in ' + version : '')),
        AxiosError.ERR_DEPRECATED
      );
    }

    if (version && !deprecatedWarnings[opt]) {
      deprecatedWarnings[opt] = true;
      // eslint-disable-next-line no-console
      console.warn(
        formatMessage(
          opt,
          ' has been deprecated since v' + version + ' and will be removed in the near future'
        )
      );
    }

    return validator ? validator(value, opt, opts) : true;
  };
};

/**
 * Assert object's properties type
 * @param {object} options
 * @param {object} schema
 * @param {boolean?} allowUnknown
 */

function assertOptions(options, schema, allowUnknown) {
  if (typeof options !== 'object') {
    throw new AxiosError('options must be an object', AxiosError.ERR_BAD_OPTION_VALUE);
  }
  var keys = Object.keys(options);
  var i = keys.length;
  while (i-- > 0) {
    var opt = keys[i];
    var validator = schema[opt];
    if (validator) {
      var value = options[opt];
      var result = value === undefined || validator(value, opt, options);
      if (result !== true) {
        throw new AxiosError('option ' + opt + ' must be ' + result, AxiosError.ERR_BAD_OPTION_VALUE);
      }
      continue;
    }
    if (allowUnknown !== true) {
      throw new AxiosError('Unknown option ' + opt, AxiosError.ERR_BAD_OPTION);
    }
  }
}

var validator$1 = {
  assertOptions: assertOptions,
  validators: validators$1
};

var utils$1 = utils$9;
var buildURL = buildURL$1;
var InterceptorManager = InterceptorManager_1;
var dispatchRequest = dispatchRequest$1;
var mergeConfig$1 = mergeConfig$2;
var buildFullPath = buildFullPath$1;
var validator = validator$1;

var validators = validator.validators;
/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios$1(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager(),
    response: new InterceptorManager()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios$1.prototype.request = function request(configOrUrl, config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof configOrUrl === 'string') {
    config = config || {};
    config.url = configOrUrl;
  } else {
    config = configOrUrl || {};
  }

  config = mergeConfig$1(this.defaults, config);

  // Set config.method
  if (config.method) {
    config.method = config.method.toLowerCase();
  } else if (this.defaults.method) {
    config.method = this.defaults.method.toLowerCase();
  } else {
    config.method = 'get';
  }

  var transitional = config.transitional;

  if (transitional !== undefined) {
    validator.assertOptions(transitional, {
      silentJSONParsing: validators.transitional(validators.boolean),
      forcedJSONParsing: validators.transitional(validators.boolean),
      clarifyTimeoutError: validators.transitional(validators.boolean)
    }, false);
  }

  // filter out skipped interceptors
  var requestInterceptorChain = [];
  var synchronousRequestInterceptors = true;
  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    if (typeof interceptor.runWhen === 'function' && interceptor.runWhen(config) === false) {
      return;
    }

    synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;

    requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  var responseInterceptorChain = [];
  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
  });

  var promise;

  if (!synchronousRequestInterceptors) {
    var chain = [dispatchRequest, undefined];

    Array.prototype.unshift.apply(chain, requestInterceptorChain);
    chain = chain.concat(responseInterceptorChain);

    promise = Promise.resolve(config);
    while (chain.length) {
      promise = promise.then(chain.shift(), chain.shift());
    }

    return promise;
  }


  var newConfig = config;
  while (requestInterceptorChain.length) {
    var onFulfilled = requestInterceptorChain.shift();
    var onRejected = requestInterceptorChain.shift();
    try {
      newConfig = onFulfilled(newConfig);
    } catch (error) {
      onRejected(error);
      break;
    }
  }

  try {
    promise = dispatchRequest(newConfig);
  } catch (error) {
    return Promise.reject(error);
  }

  while (responseInterceptorChain.length) {
    promise = promise.then(responseInterceptorChain.shift(), responseInterceptorChain.shift());
  }

  return promise;
};

Axios$1.prototype.getUri = function getUri(config) {
  config = mergeConfig$1(this.defaults, config);
  var fullPath = buildFullPath(config.baseURL, config.url);
  return buildURL(fullPath, config.params, config.paramsSerializer);
};

// Provide aliases for supported request methods
utils$1.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios$1.prototype[method] = function(url, config) {
    return this.request(mergeConfig$1(config || {}, {
      method: method,
      url: url,
      data: (config || {}).data
    }));
  };
});

utils$1.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(mergeConfig$1(config || {}, {
        method: method,
        headers: isForm ? {
          'Content-Type': 'multipart/form-data'
        } : {},
        url: url,
        data: data
      }));
    };
  }

  Axios$1.prototype[method] = generateHTTPMethod();

  Axios$1.prototype[method + 'Form'] = generateHTTPMethod(true);
});

var Axios_1 = Axios$1;

var CancelToken_1;
var hasRequiredCancelToken;

function requireCancelToken () {
	if (hasRequiredCancelToken) return CancelToken_1;
	hasRequiredCancelToken = 1;

	var CanceledError = requireCanceledError();

	/**
	 * A `CancelToken` is an object that can be used to request cancellation of an operation.
	 *
	 * @class
	 * @param {Function} executor The executor function.
	 */
	function CancelToken(executor) {
	  if (typeof executor !== 'function') {
	    throw new TypeError('executor must be a function.');
	  }

	  var resolvePromise;

	  this.promise = new Promise(function promiseExecutor(resolve) {
	    resolvePromise = resolve;
	  });

	  var token = this;

	  // eslint-disable-next-line func-names
	  this.promise.then(function(cancel) {
	    if (!token._listeners) return;

	    var i;
	    var l = token._listeners.length;

	    for (i = 0; i < l; i++) {
	      token._listeners[i](cancel);
	    }
	    token._listeners = null;
	  });

	  // eslint-disable-next-line func-names
	  this.promise.then = function(onfulfilled) {
	    var _resolve;
	    // eslint-disable-next-line func-names
	    var promise = new Promise(function(resolve) {
	      token.subscribe(resolve);
	      _resolve = resolve;
	    }).then(onfulfilled);

	    promise.cancel = function reject() {
	      token.unsubscribe(_resolve);
	    };

	    return promise;
	  };

	  executor(function cancel(message) {
	    if (token.reason) {
	      // Cancellation has already been requested
	      return;
	    }

	    token.reason = new CanceledError(message);
	    resolvePromise(token.reason);
	  });
	}

	/**
	 * Throws a `CanceledError` if cancellation has been requested.
	 */
	CancelToken.prototype.throwIfRequested = function throwIfRequested() {
	  if (this.reason) {
	    throw this.reason;
	  }
	};

	/**
	 * Subscribe to the cancel signal
	 */

	CancelToken.prototype.subscribe = function subscribe(listener) {
	  if (this.reason) {
	    listener(this.reason);
	    return;
	  }

	  if (this._listeners) {
	    this._listeners.push(listener);
	  } else {
	    this._listeners = [listener];
	  }
	};

	/**
	 * Unsubscribe from the cancel signal
	 */

	CancelToken.prototype.unsubscribe = function unsubscribe(listener) {
	  if (!this._listeners) {
	    return;
	  }
	  var index = this._listeners.indexOf(listener);
	  if (index !== -1) {
	    this._listeners.splice(index, 1);
	  }
	};

	/**
	 * Returns an object that contains a new `CancelToken` and a function that, when called,
	 * cancels the `CancelToken`.
	 */
	CancelToken.source = function source() {
	  var cancel;
	  var token = new CancelToken(function executor(c) {
	    cancel = c;
	  });
	  return {
	    token: token,
	    cancel: cancel
	  };
	};

	CancelToken_1 = CancelToken;
	return CancelToken_1;
}

var spread;
var hasRequiredSpread;

function requireSpread () {
	if (hasRequiredSpread) return spread;
	hasRequiredSpread = 1;

	/**
	 * Syntactic sugar for invoking a function and expanding an array for arguments.
	 *
	 * Common use case would be to use `Function.prototype.apply`.
	 *
	 *  ```js
	 *  function f(x, y, z) {}
	 *  var args = [1, 2, 3];
	 *  f.apply(null, args);
	 *  ```
	 *
	 * With `spread` this example can be re-written.
	 *
	 *  ```js
	 *  spread(function(x, y, z) {})([1, 2, 3]);
	 *  ```
	 *
	 * @param {Function} callback
	 * @returns {Function}
	 */
	spread = function spread(callback) {
	  return function wrap(arr) {
	    return callback.apply(null, arr);
	  };
	};
	return spread;
}

var isAxiosError;
var hasRequiredIsAxiosError;

function requireIsAxiosError () {
	if (hasRequiredIsAxiosError) return isAxiosError;
	hasRequiredIsAxiosError = 1;

	var utils = utils$9;

	/**
	 * Determines whether the payload is an error thrown by Axios
	 *
	 * @param {*} payload The value to test
	 * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
	 */
	isAxiosError = function isAxiosError(payload) {
	  return utils.isObject(payload) && (payload.isAxiosError === true);
	};
	return isAxiosError;
}

var utils = utils$9;
var bind = bind$2;
var Axios = Axios_1;
var mergeConfig = mergeConfig$2;
var defaults = defaults_1;

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios(defaultConfig);
  var instance = bind(Axios.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  // Factory for creating new instances
  instance.create = function create(instanceConfig) {
    return createInstance(mergeConfig(defaultConfig, instanceConfig));
  };

  return instance;
}

// Create the default instance to be exported
var axios$2 = createInstance(defaults);

// Expose Axios class to allow class inheritance
axios$2.Axios = Axios;

// Expose Cancel & CancelToken
axios$2.CanceledError = requireCanceledError();
axios$2.CancelToken = requireCancelToken();
axios$2.isCancel = requireIsCancel();
axios$2.VERSION = requireData().version;
axios$2.toFormData = requireToFormData();

// Expose AxiosError class
axios$2.AxiosError = requireAxiosError();

// alias for CanceledError for backward compatibility
axios$2.Cancel = axios$2.CanceledError;

// Expose all/spread
axios$2.all = function all(promises) {
  return Promise.all(promises);
};
axios$2.spread = requireSpread();

// Expose isAxiosError
axios$2.isAxiosError = requireIsAxiosError();

axios$3.exports = axios$2;

// Allow use of default import syntax in TypeScript
axios$3.exports.default = axios$2;

var axiosExports = axios$3.exports;

var axios = axiosExports;

var axios$1 = /*@__PURE__*/getDefaultExportFromCjs(axios);

function sleep(time = 1000) {
    return new Promise((resolve, reject) => setTimeout(resolve, time));
}

class HttpProvider extends BaseProvider {
    constructor(options) {
        super(options);
    }
    /**
     * @param data
     * @returns
     */
    async _transport(data) {
        let leftTries = this.retry;
        let error = null;
        while (leftTries > 0) {
            try {
                const response = await axios$1({
                    url: this.url,
                    method: 'post',
                    data,
                    timeout: this.timeout,
                });
                return response.data;
            }
            catch (_error) {
                error = _error;
            }
            await sleep(1000); // sleep 1 second
            leftTries--;
        }
        throw error;
    }
    _transportBatch(data) {
        // @ts-ignore
        return this._transport(data);
    }
}

class StorageNode extends HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getStatus() {
        const res = await super.request({ method: 'zgs_getStatus' });
        return res;
    }
    async uploadSegment(seg) {
        const res = await super.request({
            method: 'zgs_uploadSegment',
            params: [seg],
        });
        return res;
    }
    async uploadSegments(segs) {
        const res = await super.request({
            method: 'zgs_uploadSegments',
            params: [segs],
        });
        return res;
    }
    // UploadSegmentByTxSeq Call zgs_uploadSegmentByTxSeq RPC to upload a segment to the node.
    async uploadSegmentByTxSeq(seg, txSeq) {
        const res = await super.request({
            method: 'zgs_uploadSegmentByTxSeq',
            params: [seg, txSeq],
        });
        return res;
    }
    // UploadSegmentsByTxSeq Call zgs_uploadSegmentsByTxSeq RPC to upload a slice of segments to the node.
    async uploadSegmentsByTxSeq(segs, txSeq) {
        const res = await super.request({
            method: 'zgs_uploadSegmentsByTxSeq',
            params: [segs, txSeq],
        });
        return res;
    }
    async downloadSegment(root, startIndex, endIndx) {
        var seg = await super.request({
            method: 'zgs_downloadSegment',
            params: [root, startIndex, endIndx],
        });
        return seg;
    }
    async downloadSegmentWithProof(root, index) {
        const seg = await super.request({
            method: 'zgs_downloadSegmentWithProof',
            params: [root, index],
        });
        return seg;
    }
    // DownloadSegmentByTxSeq Call zgs_downloadSegmentByTxSeq RPC to download a segment from the node.
    async downloadSegmentByTxSeq(txSeq, startIndex, endIndex) {
        const seg = await super.request({
            method: 'zgs_downloadSegmentByTxSeq',
            params: [txSeq, startIndex, endIndex],
        });
        return seg;
    }
    // DownloadSegmentWithProofByTxSeq Call zgs_downloadSegmentWithProofByTxSeq RPC to download a segment along with its merkle proof from the node.
    async downloadSegmentWithProofByTxSeq(txSeq, index) {
        const seg = await super.request({
            method: 'zgs_downloadSegmentWithProofByTxSeq',
            params: [txSeq, index],
        });
        return seg;
    }
    // GetSectorProof Call zgs_getSectorProof RPC to get the proof of a sector.
    async getSectorProof(sectorIndex, root) {
        const seg = await super.request({
            method: 'zgs_getSectorProof',
            params: [sectorIndex, root],
        });
        return seg;
    }
    async getFileInfo(root, needAvailable) {
        const info = await super.request({
            method: 'zgs_getFileInfo',
            params: [root, needAvailable],
        });
        return info;
    }
    async getFileInfoByTxSeq(txSeq) {
        const info = await super.request({
            method: 'zgs_getFileInfoByTxSeq',
            params: [txSeq],
        });
        return info;
    }
    async getShardConfig() {
        const config = await super.request({
            method: 'zgs_getShardConfig',
        });
        return config;
    }
}

class StorageKv extends HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getValue(streamId, key, startIndex, length, version) {
        let params = [streamId, key, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getValue',
            params: params,
        });
        return res;
    }
    async getNext(streamId, key, startIndex, length, inclusive, version) {
        let params = [streamId, key, startIndex, length, inclusive];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getNext',
            params: params,
        });
        return res;
    }
    async getPrev(streamId, key, startIndex, length, inclusive, version) {
        let params = [streamId, key, startIndex, length, inclusive];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getPrev',
            params: params,
        });
        return res;
    }
    async getFirst(streamId, startIndex, length, version) {
        let params = [streamId, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getFirst',
            params: params,
        });
        return res;
    }
    async getLast(streamId, startIndex, length, version) {
        let params = [streamId, startIndex, length];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_getLast',
            params: params,
        });
        return res;
    }
    async getTransactionResult(txSeq) {
        const res = await super.request({
            method: 'kv_getTransactionResult',
            params: [txSeq.toString()],
        });
        return res;
    }
    async getHoldingStreamIds() {
        const res = await super.request({
            method: 'kv_getHoldingStreamIds',
        });
        return res;
    }
    async hasWritePermission(account, streamId, key, version) {
        let params = [account, streamId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_hasWritePermission',
            params: params,
        });
        return res;
    }
    async isAdmin(account, streamId, version) {
        let params = [account, streamId];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_IsAdmin',
            params: params,
        });
        return res;
    }
    async isSpecialKey(stremId, key, version) {
        let params = [stremId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isSpecialKey',
            params: params,
        });
        return res;
    }
    async isWriterOfKey(account, streamId, key, version) {
        let params = [account, streamId, key];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isWriterOfKey',
            params: params,
        });
        return res;
    }
    async isWriterOfStream(account, streamId, version) {
        let params = [account, streamId];
        if (version !== undefined) {
            params.push(version);
        }
        const res = await super.request({
            method: 'kv_isWriterOfStream',
            params: params,
        });
        return res;
    }
}

function isValidConfig(config) {
    // NumShard should be larger than zero and be power of 2
    return (config.numShard > 0 &&
        (config.numShard & (config.numShard - 1)) === 0 &&
        config.shardId < config.numShard);
}

async function getShardConfigs(nodes) {
    var configs = [];
    for (const cNode of nodes) {
        const cConfig = await cNode.getShardConfig();
        if (!isValidConfig(cConfig)) {
            return null;
        }
        configs.push(cConfig);
    }
    return configs;
}
function calculatePrice(submission, pricePerSector) {
    let sectors = 0;
    for (const node of submission.nodes) {
        sectors += 1 << Number(node.height.toString());
    }
    return BigInt(sectors) * pricePerSector;
}

class Downloader {
    nodes;
    shardConfigs;
    startSegmentIndex;
    endSegmentIndex;
    constructor(nodes) {
        this.nodes = nodes;
        this.shardConfigs = [];
        this.startSegmentIndex = 0;
        this.endSegmentIndex = 0;
    }
    async downloadFile(root, filePath, proof) {
        var [info, err] = await this.queryFile(root);
        if (err != null || info === null) {
            return new Error(err?.message);
        }
        if (!info.finalized) {
            return new Error('File not finalized');
        }
        if (checkExist(filePath)) {
            return new Error('Wrong path, provide a file path which does not exist.');
        }
        let shardConfigs = await getShardConfigs(this.nodes);
        if (shardConfigs === null) {
            return new Error('Failed to get shard configs');
        }
        this.shardConfigs = shardConfigs;
        err = await this.downloadFileHelper(filePath, info, proof);
        return err;
    }
    async queryFile(root) {
        let fileInfo = null;
        for (let node of this.nodes) {
            const currInfo = await node.getFileInfo(root, true);
            if (currInfo === null) {
                return [null, new Error('File not found on node ' + node.url)];
            }
            else if (fileInfo === null) {
                fileInfo = currInfo;
            }
        }
        return [fileInfo, null];
    }
    // TODO: add proof check
    async downloadTask(info, segmentOffset, taskInd, numChunks, proof) {
        const segmentIndex = segmentOffset + taskInd;
        const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
        var endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS;
        if (endIndex > numChunks) {
            endIndex = numChunks;
        }
        let segment = null;
        for (let i = 0; i < this.shardConfigs.length; i++) {
            let nodeIndex = (taskInd + i) % this.shardConfigs.length;
            if ((this.startSegmentIndex + segmentIndex) %
                this.shardConfigs[nodeIndex].numShard !=
                this.shardConfigs[nodeIndex].shardId) {
                continue;
            }
            // try download from current node
            segment = await this.nodes[nodeIndex].downloadSegmentByTxSeq(info.tx.seq, startIndex, endIndex);
            if (segment === null) {
                continue;
            }
            var segArray = decodeBase64(segment);
            if (this.startSegmentIndex + segmentIndex == this.endSegmentIndex) {
                const lastChunkSize = info.tx.size % DEFAULT_CHUNK_SIZE;
                if (lastChunkSize > 0) {
                    const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize;
                    segArray = segArray.slice(0, segArray.length - paddings);
                }
            }
            return [segArray, null];
        }
        return [
            new Uint8Array(),
            new Error('No storage node holds segment with index ' + segmentIndex),
        ];
    }
    async downloadFileHelper(filePath, info, proof) {
        const shardConfigs = await getShardConfigs(this.nodes);
        if (shardConfigs == null) {
            return new Error('Failed to get shard configs');
        }
        const segmentOffset = 0;
        const numChunks = GetSplitNum(info.tx.size, DEFAULT_CHUNK_SIZE);
        this.startSegmentIndex = Math.floor(info.tx.startEntryIndex / DEFAULT_SEGMENT_MAX_CHUNKS);
        this.endSegmentIndex = Math.floor((info.tx.startEntryIndex +
            GetSplitNum(info.tx.size, DEFAULT_CHUNK_SIZE) -
            1) /
            DEFAULT_SEGMENT_MAX_CHUNKS);
        const numTasks = this.endSegmentIndex - this.startSegmentIndex + 1;
        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
            let [segArray, err] = await this.downloadTask(info, segmentOffset, taskInd, numChunks, proof);
            if (err != null) {
                return err;
            }
            fs.appendFileSync(filePath, segArray);
        }
        return null;
    }
}

function pushdown(node) {
    if (node.childs === null) {
        node.childs = [];
        for (let i = 0; i < 2; i += 1) {
            node.childs.push({
                childs: null,
                numShard: node.numShard << 1,
                replica: 0,
                lazyTags: 0,
            });
        }
    }
    for (let i = 0; i < 2; i += 1) {
        node.childs[i].replica += node.lazyTags;
        node.childs[i].lazyTags += node.lazyTags;
    }
    node.lazyTags = 0;
}
// insert a shard if it contributes to the replica
function insert(node, numShard, shardId, expectedReplica) {
    if (node.replica >= expectedReplica) {
        return false;
    }
    if (node.numShard === numShard) {
        node.replica += 1;
        node.lazyTags += 1;
        return true;
    }
    pushdown(node);
    if (node.childs === null) {
        throw new Error('node.childs is null');
    }
    let inserted = insert(node.childs[shardId % 2], numShard, shardId >> 1, expectedReplica);
    node.replica = Math.min(node.childs[0].replica, node.childs[1].replica);
    return inserted;
}

function selectNodes(nodes, expectedReplica) {
    if (expectedReplica === 0) {
        return [[], false];
    }
    nodes.sort((a, b) => {
        if (a.config.numShard === b.config.numShard) {
            return a.config.shardId - b.config.shardId;
        }
        return a.config.numShard - b.config.numShard;
    });
    let root = {
        childs: null,
        numShard: 1,
        replica: 0,
        lazyTags: 0,
    };
    let selectedNodes = [];
    for (let i = 0; i < nodes.length; i += 1) {
        let node = nodes[i];
        if (insert(root, node.config.numShard, node.config.shardId, expectedReplica)) {
            selectedNodes.push(node);
        }
        if (root.replica >= expectedReplica) {
            return [selectedNodes, true];
        }
    }
    return [[], false];
}
function checkReplica(shardConfigs, expectedReplica) {
    let shardedNodes = [];
    for (let i = 0; i < shardConfigs.length; i += 1) {
        shardedNodes.push({
            url: '',
            config: {
                numShard: shardConfigs[i].numShard,
                shardId: shardConfigs[i].shardId,
            },
            latency: 0,
            since: 0,
        });
    }
    let [_, ok] = selectNodes(shardedNodes, expectedReplica);
    return ok;
}

class Uploader {
    nodes;
    provider;
    flow;
    gasPrice;
    gasLimit;
    constructor(nodes, providerRpc, flow, gasPrice = BigInt('0'), gasLimit = BigInt('0')) {
        this.nodes = nodes;
        this.provider = new JsonRpcProvider(providerRpc);
        this.flow = flow;
        this.gasPrice = gasPrice;
        this.gasLimit = gasLimit;
    }
    async checkExistence(root) {
        for (let client of this.nodes) {
            let info = await client.getFileInfo(root, true);
            if (info !== null && info.finalized) {
                return true;
            }
        }
        return false;
    }
    async uploadFile(file, opts, retryOpts) {
        var [tree, err] = await file.merkleTree();
        if (err != null || tree == null || tree.rootHash() == null) {
            return ['', new Error('Failed to create Merkle tree')];
        }
        console.log('Data prepared to upload', 'root=' + tree.rootHash(), 'size=' + file.size(), 'numSegments=' + file.numSegments(), 'numChunks=' + file.numChunks());
        const exist = await this.checkExistence(tree.rootHash());
        if (exist) {
            return ['', new Error('Data already exists')];
        }
        var [submission, err] = await file.createSubmission(opts.tags);
        if (err !== null || submission === null) {
            return ['', new Error('Failed to create submission')];
        }
        let marketAddr = await this.flow.market();
        let marketContract = getMarketContract(marketAddr, this.provider);
        let pricePerSector = await marketContract.pricePerSector();
        let fee = BigInt('0');
        if (opts.fee > 0) {
            fee = opts.fee;
        }
        else {
            fee = calculatePrice(submission, pricePerSector);
        }
        var txOpts = {
            value: fee,
            nonce: opts.nonce,
        };
        if (this.gasPrice > 0) {
            txOpts.gasPrice = this.gasPrice;
        }
        else {
            let suggestedGasPrice = (await this.provider.getFeeData()).gasPrice;
            if (suggestedGasPrice === null) {
                return [
                    '',
                    new Error('Failed to get suggested gas price, set your own gas price'),
                ];
            }
            txOpts.gasPrice = suggestedGasPrice;
        }
        if (this.gasLimit > 0) {
            txOpts.gasLimit = this.gasLimit;
        }
        console.log('Submitting transaction with storage fee:', fee);
        let receipt = await txWithGasAdjustment(this.flow, this.provider, 'submit', [submission], txOpts, retryOpts);
        if (receipt === null) {
            return ['', new Error('Failed to submit transaction')];
        }
        console.log('Transaction hash:', receipt.hash);
        const txSeqs = await this.processLogs(receipt);
        if (txSeqs.length === 0) {
            return ['', new Error('Failed to get txSeqs')];
        }
        console.log('Transaction sequence number:', txSeqs[0]);
        let info = await this.waitForLogEntry(txSeqs[0], false);
        if (info === null) {
            return ['', new Error('Failed to get log entry')];
        }
        const tasks = await this.segmentUpload(info, file, tree, opts);
        if (tasks === null) {
            return ['', new Error('Failed to get upload tasks')];
        }
        console.log('Processing tasks in parallel with ', tasks.length, ' tasks...');
        err = await this.processTasksInParallel(file, tree, tasks)
            .then(() => console.log('All tasks processed'))
            .catch((error) => {
            return error;
        });
        if (err !== undefined) {
            return ['', err];
        }
        await this.waitForLogEntry(info.tx.seq, true);
        return [receipt.hash, null];
    }
    async processLogs(receipt) {
        const contractAddress = (await this.flow.getAddress()).toLowerCase();
        const signature = this.flow.interface.getEvent('Submit');
        var txSeqs = [];
        for (const log of receipt.logs) {
            // Only process logs that are emitted by this contract.
            if (log.address.toLowerCase() !== contractAddress) {
                continue;
            }
            if (log.topics[0] !== signature.topicHash) {
                continue;
            }
            try {
                // Use the contract's interface to parse the log.
                const parsedLog = this.flow.interface.parseLog(log);
                if (!parsedLog) {
                    continue;
                }
                // Check if the event name is "Submit"
                if (parsedLog.name === 'Submit') {
                    const event = parsedLog.args;
                    txSeqs.push(Number(event.submissionIndex));
                }
            }
            catch (error) {
                // If parseLog fails, this log is not one of our events.
                // You can log the error if needed.
                // console.error("Error decoding log:", error);
                continue;
            }
        }
        return txSeqs;
    }
    async waitForReceipt(txHash, opts) {
        var receipt = null;
        if (opts === undefined) {
            opts = { Retries: 10, Interval: 5, MaxGasPrice: 0 };
        }
        let nTries = 0;
        while (nTries < opts.Retries) {
            receipt = await this.provider.getTransactionReceipt(txHash);
            if (receipt !== null && receipt.status == 1) {
                return receipt;
            }
            await delay(opts.Interval * 1000);
            nTries++;
        }
        return null;
    }
    async waitForLogEntry(txSeq, finalityRequired) {
        console.log('Wait for log entry on storage node');
        let info = null;
        while (true) {
            await delay(1000);
            let ok = true;
            for (let client of this.nodes) {
                info = await client.getFileInfoByTxSeq(txSeq);
                if (info === null) {
                    let logMsg = 'Log entry is unavailable yet';
                    let status = await client.getStatus();
                    if (status !== null) {
                        const logSyncHeight = status.logSyncHeight;
                        logMsg = `Log entry is unavailable yet, zgsNodeSyncHeight=${logSyncHeight}`;
                    }
                    console.log(logMsg);
                    ok = false;
                    break;
                }
                if (finalityRequired && !info.finalized) {
                    console.log('Log entry is available, but not finalized yet, ', client, info);
                    ok = false;
                    break;
                }
            }
            if (ok) {
                break;
            }
        }
        return info;
    }
    // Function to process all tasks in parallel
    async processTasksInParallel(file, tree, tasks) {
        const taskPromises = tasks.map((task) => this.uploadTask(file, tree, task));
        return await Promise.all(taskPromises);
    }
    nextSgmentIndex(config, startIndex) {
        if (config.numShard < 2) {
            return startIndex;
        }
        return (Math.floor((startIndex + config.numShard - 1 - config.shardId) /
            config.numShard) *
            config.numShard +
            config.shardId);
    }
    async segmentUpload(info, file, tree, opts) {
        const shardConfigs = await getShardConfigs(this.nodes);
        if (shardConfigs === null) {
            console.log('Failed to get shard configs');
            return null;
        }
        if (!checkReplica(shardConfigs, opts.expectedReplica)) {
            console.log('Not enough replicas');
            return null;
        }
        let txSeq = info.tx.seq;
        let [startSegmentIndex, endSegmentIndex] = SegmentRange(info.tx.startEntryIndex, info.tx.size);
        var uploadTasks = [];
        for (let clientIndex = 0; clientIndex < shardConfigs.length; clientIndex++) {
            const shardConfig = shardConfigs[clientIndex];
            let cInfo = await this.nodes[clientIndex].getFileInfo(tree.rootHash(), true);
            if (cInfo !== null && cInfo.finalized) {
                console.log('File already exists on node', this.nodes[clientIndex].url, cInfo);
                continue;
            }
            var tasks = [];
            let segIndex = this.nextSgmentIndex(shardConfig, startSegmentIndex);
            while (segIndex <= endSegmentIndex) {
                tasks.push({
                    clientIndex,
                    taskSize: opts.taskSize,
                    segIndex: segIndex - startSegmentIndex,
                    numShard: shardConfig.numShard,
                    txSeq,
                });
                segIndex += shardConfig.numShard * opts.taskSize;
            }
            if (tasks.length > 0) {
                uploadTasks.push(tasks);
            }
        }
        if (uploadTasks.length === 0) {
            return null;
        }
        console.log('Tasks created:', uploadTasks);
        var tasks = [];
        if (uploadTasks.length > 0) {
            uploadTasks.sort((a, b) => a.length - b.length);
            for (let taskIndex = 0; taskIndex < uploadTasks[0].length; taskIndex += 1) {
                for (let i = 0; i < uploadTasks.length && taskIndex < uploadTasks[i].length; i += 1) {
                    tasks.push(uploadTasks[i][taskIndex]);
                }
            }
        }
        return tasks;
    }
    async getSegment(file, tree, segIndex) {
        let numChunks = file.numChunks();
        let startSegIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
        if (startSegIndex >= numChunks) {
            return [true, null, null];
        }
        const iter = file.iterateWithOffsetAndBatch(segIndex * DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_SIZE, true);
        let [ok, err] = await iter.next();
        if (!ok) {
            return [false, null, err];
        }
        let segment = iter.current();
        const proof = tree.proofAt(segIndex);
        const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
        let allDataUploaded = false;
        if (startIndex + segment.length / DEFAULT_CHUNK_SIZE >= numChunks) {
            const expectedLen = DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
            segment = segment.slice(0, expectedLen);
            allDataUploaded = true;
        }
        const segWithProof = {
            root: tree.rootHash(),
            data: encodeBase64(segment),
            index: segIndex,
            proof: proof,
            fileSize: file.size(),
        };
        return [allDataUploaded, segWithProof, null];
    }
    async uploadTask(file, tree, uploadTask) {
        let segIndex = uploadTask.segIndex;
        var segments = [];
        for (let i = 0; i < uploadTask.taskSize; i += 1) {
            let [allDataUploaded, segWithProof, err] = await this.getSegment(file, tree, segIndex);
            if (err !== null) {
                return err;
            }
            if (segWithProof !== null) {
                segments.push(segWithProof);
            }
            if (allDataUploaded) {
                break;
            }
            segIndex += uploadTask.numShard;
        }
        let res = await this.nodes[uploadTask.clientIndex].uploadSegmentsByTxSeq(segments, uploadTask.txSeq);
        if (res === null) {
            return new Error('Failed to upload segments');
        }
        return res;
    }
}

var defaultUploadOption = {
    tags: '0x',
    finalityRequired: true,
    taskSize: 1,
    expectedReplica: 1,
    skipTx: false,
    fee: BigInt(0),
};

class Indexer extends HttpProvider {
    constructor(url) {
        super({ url });
    }
    async getShardedNodes() {
        const res = await super.request({
            method: 'indexer_getShardedNodes',
        });
        return res;
    }
    async getNodeLocations() {
        const res = await super.request({
            method: 'indexer_getNodeLocations',
        });
        return res;
    }
    async getFileLocations(rootHash) {
        const res = await super.request({
            method: 'indexer_getFileLocations',
            params: [rootHash],
        });
        return res;
    }
    async newUploaderFromIndexerNodes(blockchain_rpc, signer, expectedReplica, opts) {
        let [clients, err] = await this.selectNodes(expectedReplica);
        if (err != null) {
            return [null, err];
        }
        let status = await clients[0].getStatus();
        if (status == null) {
            return [
                null,
                new Error('failed to get status from the selected node'),
            ];
        }
        console.log('First selected node status :', status);
        let flow = getFlowContract(status.networkIdentity.flowAddress, signer);
        console.log('Selected nodes:', clients);
        let uploader = new Uploader(clients, blockchain_rpc, flow, opts?.gasPrice, opts?.gasLimit);
        return [uploader, null];
    }
    async selectNodes(expectedReplica) {
        let nodes = await this.getShardedNodes();
        let [trusted, ok] = selectNodes(nodes.trusted, expectedReplica);
        if (!ok) {
            return [
                [],
                new Error('cannot select a subset from the returned nodes that meets the replication requirement'),
            ];
        }
        let clients = [];
        trusted.forEach((node) => {
            let sn = new StorageNode(node.url);
            clients.push(sn);
        });
        return [clients, null];
    }
    async upload(file, blockchain_rpc, signer, uploadOpts, retryOpts, opts) {
        var expectedReplica = 1;
        if (uploadOpts != undefined && uploadOpts.expectedReplica != null) {
            expectedReplica = Math.max(1, uploadOpts.expectedReplica);
        }
        let [uploader, err] = await this.newUploaderFromIndexerNodes(blockchain_rpc, signer, expectedReplica, opts);
        if (err != null || uploader == null) {
            return ['', err];
        }
        if (uploadOpts === undefined) {
            uploadOpts = {
                tags: '0x',
                finalityRequired: true,
                taskSize: 10,
                expectedReplica: 1,
                skipTx: false,
                fee: BigInt('0'),
            };
        }
        return await uploader.uploadFile(file, uploadOpts, retryOpts);
    }
    async download(rootHash, filePath, proof) {
        let locations = await this.getFileLocations(rootHash);
        if (locations.length == 0) {
            return new Error('failed to get file locations');
        }
        let clients = [];
        locations.forEach((node) => {
            let sn = new StorageNode(node.url);
            clients.push(sn);
        });
        let downloader = new Downloader(clients);
        return await downloader.downloadFile(rootHash, filePath, proof);
    }
}

var AccessControlType;
(function (AccessControlType) {
    AccessControlType[AccessControlType["GrantAdminRole"] = 0] = "GrantAdminRole";
    AccessControlType[AccessControlType["RenounceAdminRole"] = 1] = "RenounceAdminRole";
    AccessControlType[AccessControlType["SetKeyToSpecial"] = 16] = "SetKeyToSpecial";
    AccessControlType[AccessControlType["SetKeyToNormal"] = 17] = "SetKeyToNormal";
    AccessControlType[AccessControlType["GrantWriteRole"] = 32] = "GrantWriteRole";
    AccessControlType[AccessControlType["RevokeWriteRole"] = 33] = "RevokeWriteRole";
    AccessControlType[AccessControlType["RenounceWriteRole"] = 34] = "RenounceWriteRole";
    AccessControlType[AccessControlType["GrantSpecialWriteRole"] = 48] = "GrantSpecialWriteRole";
    AccessControlType[AccessControlType["RevokeSpecialWriteRole"] = 49] = "RevokeSpecialWriteRole";
    AccessControlType[AccessControlType["RenounceSpecialWriteRole"] = 50] = "RenounceSpecialWriteRole";
})(AccessControlType || (AccessControlType = {}));
class StreamData {
    Version;
    Reads = [];
    Writes = [];
    Controls = [];
    constructor(version) {
        this.Version = version;
    }
    size() {
        let size = 8; // version size in bytes
        size += 4; // Reads size prefix
        for (const v of this.Reads) {
            size += 32 + 3 + v.Key.length;
        }
        size += 4; // Writes size prefix
        for (const v of this.Writes) {
            size += 32 + 3 + v.Key.length + 8 + v.Data.length;
        }
        size += 4; // Controls size prefix
        for (const v of this.Controls) {
            size += 1 + 32; // Type + StreamId
            if (v.Account) {
                size += 20; // Address length
            }
            if (v.Key) {
                size += 3 + v.Key.length;
            }
        }
        return size;
    }
    encodeSize24(size) {
        if (size === 0) {
            throw new Error('errKeyIsEmpty');
        }
        const buf = new Uint8Array(4);
        const view = new DataView(buf.buffer);
        view.setUint32(0, size, false);
        if (buf[0] !== 0) {
            throw new Error('errKeyTooLarge');
        }
        return buf.slice(1);
    }
    encodeSize32(size) {
        const buf = new Uint8Array(4);
        const view = new DataView(buf.buffer);
        view.setUint32(0, size, false);
        return buf;
    }
    encodeSize64(size) {
        const buf = new Uint8Array(8);
        const view = new DataView(buf.buffer);
        view.setBigUint64(0, BigInt(size), false);
        return buf;
    }
    encode() {
        const encoded = new Uint8Array(this.size());
        let offset = 0;
        // version
        encoded.set(this.encodeSize64(this.Version), offset);
        offset += 8;
        // reads
        encoded.set(this.encodeSize32(this.Reads.length), offset);
        offset += 4;
        for (const v of this.Reads) {
            encoded.set(getBytes(v.StreamId), offset);
            offset += 32;
            const keySize = this.encodeSize24(v.Key.length);
            encoded.set(keySize, offset);
            offset += keySize.length;
            encoded.set(v.Key, offset);
            offset += v.Key.length;
        }
        // writes
        encoded.set(this.encodeSize32(this.Writes.length), offset);
        offset += 4;
        for (const v of this.Writes) {
            // add stream id
            encoded.set(getBytes(v.StreamId), offset);
            offset += 32;
            const keySize = this.encodeSize24(v.Key.length);
            // add key size
            encoded.set(keySize, offset);
            offset += keySize.length;
            // add key
            encoded.set(v.Key, offset);
            offset += v.Key.length;
            // add value size, add value later
            const dataSize = this.encodeSize64(v.Data.length);
            encoded.set(dataSize, offset);
            offset += dataSize.length;
        }
        // add all values
        for (const v of this.Writes) {
            encoded.set(v.Data, offset);
            offset += v.Data.length;
        }
        // controls
        encoded.set(this.encodeSize32(this.Controls.length), offset);
        offset += 4;
        for (const v of this.Controls) {
            encoded[offset] = v.Type;
            offset += 1;
            encoded.set(getBytes(v.StreamId), offset);
            offset += 32;
            if (v.Key !== undefined) {
                const keySize = this.encodeSize24(v.Key.length);
                encoded.set(keySize, offset);
                offset += keySize.length;
                encoded.set(v.Key, offset);
                offset += v.Key.length;
            }
            if (v.Account !== undefined) {
                encoded.set(getBytes(v.Account), offset);
                offset += 20;
            }
        }
        return encoded;
    }
}

const MAX_SET_SIZE = 1 << 16; // 64K
const MAX_KEY_SIZE = 1 << 24; // 16.7M
const MAX_QUERY_SIZE = 1024 * 256;
// df2ff3bb0af36c6384e6206552a4ed807f6f6a26e7d0aa6bff772ddc9d4307aa
const STREAM_DOMAIN = createHash$1('sha256').update('STREAM').digest();

class StreamDataBuilder {
    version;
    streamIds;
    controls;
    reads;
    writes;
    constructor(version) {
        this.version = version;
        this.streamIds = new Map();
        this.controls = [];
        this.reads = new Map();
        this.writes = new Map();
    }
    hexToBytes(hex) {
        // Remove '0x' prefix if it exists
        if (hex.startsWith('0x')) {
            hex = hex.slice(2);
        }
        return Buffer.from(hex, 'hex');
    }
    build(sorted = false) {
        const data = new StreamData(this.version);
        // controls
        data.Controls = this.buildAccessControl();
        // reads
        data.Reads = [];
        for (const [streamId, keys] of this.reads.entries()) {
            for (const k of keys.keys()) {
                const key = this.hexToBytes(k);
                if (key.length > MAX_KEY_SIZE) {
                    throw new Error('errKeyTooLarge');
                }
                if (key.length === 0) {
                    throw new Error('errKeyIsEmpty');
                }
                data.Reads.push({
                    StreamId: streamId,
                    Key: key,
                });
                if (data.Reads.length > MAX_SET_SIZE) {
                    throw new Error('errSizeTooLarge');
                }
            }
        }
        // writes
        data.Writes = [];
        for (const [streamId, keys] of this.writes.entries()) {
            for (const [k, d] of keys.entries()) {
                const key = this.hexToBytes(k);
                if (key.length > MAX_KEY_SIZE) {
                    throw new Error('errKeyTooLarge');
                }
                if (key.length === 0) {
                    throw new Error('errKeyIsEmpty');
                }
                data.Writes.push({
                    StreamId: streamId,
                    Key: key,
                    Data: Uint8Array.from(d),
                });
                if (data.Writes.length > MAX_SET_SIZE) {
                    throw new Error('errSizeTooLarge');
                }
            }
        }
        if (sorted) {
            data.Reads.sort((a, b) => {
                const streamIdI = a.StreamId;
                const streamIdJ = b.StreamId;
                if (streamIdI === streamIdJ) {
                    return hexlify(a.Key) < hexlify(b.Key)
                        ? -1
                        : 1;
                }
                else {
                    return streamIdI < streamIdJ ? -1 : 1;
                }
            });
            data.Writes.sort((a, b) => {
                const streamIdI = a.StreamId;
                const streamIdJ = b.StreamId;
                if (streamIdI === streamIdJ) {
                    return hexlify(a.Key) < hexlify(b.Key)
                        ? -1
                        : 1;
                }
                else {
                    return streamIdI < streamIdJ ? -1 : 1;
                }
            });
        }
        return data;
    }
    set(streamId, key, data) {
        this.addStreamId(streamId);
        if (!this.writes.has(streamId)) {
            this.writes.set(streamId, new Map());
        }
        let maps = this.writes.get(streamId);
        maps.set(Buffer.from(key).toString('hex'), data);
        this.writes.set(streamId, maps);
    }
    addStreamId(streamId) {
        this.streamIds.set(streamId, true);
    }
    buildTags(sorted = false) {
        let ids = Array.from(this.streamIds.keys());
        if (sorted) {
            ids.sort((a, b) => (a < b ? -1 : 1));
        }
        return this.createTags(ids);
    }
    createTags(streamIds) {
        let result = new Uint8Array((1 + streamIds.length) * 32); // Assuming Hash is 32 bytes
        result.set(STREAM_DOMAIN, 0);
        streamIds.forEach((id, index) => {
            result.set(getBytes(id), 32 * (index + 1));
        });
        return result;
    }
    buildAccessControl() {
        if (this.controls.length > MAX_SET_SIZE) {
            throw new Error('errSizeTooLarge');
        }
        return this.controls;
    }
}

function numSplits(total, unit) {
    return Math.floor((total - 1) / unit) + 1;
}
function nextPow2(input) {
    let x = input;
    x -= 1;
    x |= x >> 32;
    x |= x >> 16;
    x |= x >> 8;
    x |= x >> 4;
    x |= x >> 2;
    x |= x >> 1;
    x += 1;
    return x;
}
function computePaddedSize(chunks) {
    let chunksNextPow2 = nextPow2(chunks);
    if (chunksNextPow2 === chunks) {
        return [chunksNextPow2, chunksNextPow2];
    }
    let minChunk;
    if (chunksNextPow2 >= 16) {
        minChunk = Math.floor(chunksNextPow2 / 16);
    }
    else {
        minChunk = 1;
    }
    const paddedChunks = numSplits(chunks, minChunk) * minChunk;
    return [paddedChunks, chunksNextPow2];
}

class BlobIterator {
    file = null; // browser file
    buf;
    bufSize = 0; // buffer content size
    fileSize;
    paddedSize; // total size including padding zeros
    offset = 0;
    batchSize;
    constructor(file, fileSize, offset, batch, flowPadding) {
        if (batch % DEFAULT_CHUNK_SIZE > 0) {
            throw new Error("batch size should align with chunk size");
        }
        const buf = new Uint8Array(batch);
        const chunks = numSplits(fileSize, DEFAULT_CHUNK_SIZE);
        let paddedSize;
        if (flowPadding) {
            const [paddedChunks,] = computePaddedSize(chunks);
            paddedSize = paddedChunks * DEFAULT_CHUNK_SIZE;
        }
        else {
            paddedSize = chunks * DEFAULT_CHUNK_SIZE;
        }
        this.file = file;
        this.buf = buf;
        this.fileSize = fileSize;
        this.paddedSize = paddedSize;
        this.batchSize = batch;
        this.offset = offset;
    }
    static NewSegmentIterator(file, fileSize, offset, flowPadding) {
        return new BlobIterator(file, fileSize, offset, DEFAULT_SEGMENT_SIZE, flowPadding);
    }
    async readFromFile(start, end) {
        if (start < 0 || start >= this.fileSize) {
            throw new Error("invalid start offset");
        }
        if (end > this.fileSize) {
            end = this.fileSize;
        }
        const buf = (await this.file?.slice(start, end).arrayBuffer());
        const buffer = new Uint8Array(this.batchSize);
        buffer.set(new Uint8Array(buf));
        return {
            bytesRead: buf.byteLength,
            buffer
        };
    }
    clearBuffer() {
        this.bufSize = 0;
    }
    paddingZeros(length) {
        const startOffset = this.bufSize;
        this.buf = this.buf.fill(0, startOffset, startOffset + length);
        this.bufSize += length;
        this.offset += length;
    }
    async next() {
        if (this.offset < 0 || this.offset >= this.paddedSize) {
            return [false, null];
        }
        let expectedBufSize;
        let maxAvailableLength = this.paddedSize - this.offset; // include padding zeros
        if (maxAvailableLength >= this.batchSize) {
            expectedBufSize = this.batchSize;
        }
        else {
            expectedBufSize = maxAvailableLength;
        }
        this.clearBuffer();
        if (this.offset >= this.fileSize) {
            this.paddingZeros(expectedBufSize);
            return [true, null];
        }
        const { bytesRead: n, buffer } = await this.readFromFile(this.offset, this.offset + this.batchSize);
        this.buf = buffer;
        this.bufSize = n;
        this.offset += n;
        // not reach EOF
        if (n === expectedBufSize) {
            return [true, null];
        }
        if (n > expectedBufSize) {
            // should never happen
            throw new Error("load more data from file than expected");
        }
        if (expectedBufSize > n) {
            this.paddingZeros(expectedBufSize - n);
        }
        return [true, null];
    }
    current() {
        return this.buf.subarray(0, this.bufSize);
    }
}

class NodeFdIterator extends BlobIterator {
    fd = null; // node file descriptor
    constructor(fd, fileSize, offset, batch, flowPadding) {
        super(null, fileSize, offset, batch, flowPadding);
        this.fd = fd;
    }
    // override BlobIterator.readFromFile
    async readFromFile(start, end) {
        if (start < 0 || start >= this.fileSize) {
            throw new Error("invalid start offset");
        }
        if (end > this.fileSize) {
            end = this.fileSize;
        }
        const res = await this.fd?.read({
            buffer: this.buf,
            offset: this.bufSize,
            length: end - start,
            position: start
        });
        return res;
    }
}

class MemIterator {
    dataArray = null; // browser file
    buf;
    bufSize = 0; // buffer content size
    fileSize;
    paddedSize; // total size including padding zeros
    offset = 0;
    batchSize;
    constructor(data, fileSize, offset, batch, flowPadding) {
        if (batch % DEFAULT_CHUNK_SIZE > 0) {
            throw new Error("batch size should align with chunk size");
        }
        const buf = new Uint8Array(batch);
        const chunks = numSplits(fileSize, DEFAULT_CHUNK_SIZE);
        let paddedSize;
        if (flowPadding) {
            const [paddedChunks,] = computePaddedSize(chunks);
            paddedSize = paddedChunks * DEFAULT_CHUNK_SIZE;
        }
        else {
            paddedSize = chunks * DEFAULT_CHUNK_SIZE;
        }
        this.dataArray = data;
        this.buf = buf;
        this.fileSize = fileSize;
        this.paddedSize = paddedSize;
        this.batchSize = batch;
        this.offset = offset;
    }
    async readFromFile(start, end) {
        if (start < 0 || start >= this.fileSize) {
            throw new Error("invalid start offset");
        }
        if (end > this.fileSize) {
            end = this.fileSize;
        }
        const buf = this.dataArray?.slice(start, end);
        const buffer = new Uint8Array(this.batchSize);
        buffer.set(new Uint8Array(buf));
        return {
            bytesRead: buf.byteLength,
            buffer
        };
    }
    clearBuffer() {
        this.bufSize = 0;
    }
    paddingZeros(length) {
        const startOffset = this.bufSize;
        this.buf = this.buf.fill(0, startOffset, startOffset + length);
        this.bufSize += length;
        this.offset += length;
    }
    async next() {
        if (this.offset < 0 || this.offset >= this.paddedSize) {
            return [false, null];
        }
        let expectedBufSize;
        let maxAvailableLength = this.paddedSize - this.offset; // include padding zeros
        if (maxAvailableLength >= this.batchSize) {
            expectedBufSize = this.batchSize;
        }
        else {
            expectedBufSize = maxAvailableLength;
        }
        this.clearBuffer();
        if (this.offset >= this.fileSize) {
            this.paddingZeros(expectedBufSize);
            return [true, null];
        }
        const { bytesRead: n, buffer } = await this.readFromFile(this.offset, this.offset + this.batchSize);
        this.buf = buffer;
        this.bufSize = n;
        this.offset += n;
        // not reach EOF
        if (n === expectedBufSize) {
            return [true, null];
        }
        if (n > expectedBufSize) {
            // should never happen
            throw new Error("load more data from file than expected");
        }
        if (expectedBufSize > n) {
            this.paddingZeros(expectedBufSize - n);
        }
        return [true, null];
    }
    current() {
        return this.buf.subarray(0, this.bufSize);
    }
}

class LeafNode {
    hash; // hex string
    parent = null;
    left = null;
    right = null;
    constructor(hash) {
        this.hash = hash;
    }
    // content should be a hex string
    static fromContent(content) {
        return new LeafNode(keccak256$1(content));
    }
    static fromLeftAndRight(left, right) {
        const node = new LeafNode(keccak256Hash(left.hash, right.hash));
        node.left = left;
        node.right = right;
        left.parent = node;
        right.parent = node;
        return node;
    }
    isLeftSide() {
        return this.parent !== null && this.parent.left === this;
    }
}
var ProofErrors;
(function (ProofErrors) {
    ProofErrors["WRONG_FORMAT"] = "invalid merkle proof format";
    ProofErrors["ROOT_MISMATCH"] = "merkle proof root mismatch";
    ProofErrors["CONTENT_MISMATCH"] = "merkle proof content mismatch";
    ProofErrors["POSITION_MISMATCH"] = "merkle proof position mismatch";
    ProofErrors["VALIDATION_FAILURE"] = "failed to validate merkle proof";
})(ProofErrors || (ProofErrors = {}));
// Proof represents a merkle tree proof of target content, e.g. chunk or segment of file.
class Proof {
    // Lemma is made up of 3 parts to keep consistent with zerog-rust:
    // 1. Target content hash (leaf node).
    // 2. Hashes from bottom to top of sibling nodes.
    // 3. Root hash.
    lemma = [];
    // Path contains flags to indicate that whether the corresponding node is on the left side.
    // All true for the left most leaf node, and all false for the right most leaf node.
    path = [];
    constructor(lemma = [], path = []) {
        this.lemma = lemma;
        this.path = path;
    }
    validateFormat() {
        const numSiblings = this.path.length;
        if (numSiblings === 0) {
            if (this.lemma.length !== 1) {
                return ProofErrors.WRONG_FORMAT;
            }
            return null;
        }
        if (numSiblings + 2 !== this.lemma.length) {
            return ProofErrors.WRONG_FORMAT;
        }
        return null;
    }
    validate(rootHash, content, position, numLeafNodes) {
        const contentHash = keccak256$1(content);
        return this.validateHash(rootHash, contentHash, position, numLeafNodes);
    }
    validateHash(rootHash, contentHash, position, numLeafNodes) {
        const formatError = this.validateFormat();
        if (formatError !== null) {
            return formatError;
        }
        if (contentHash !== this.lemma[0]) {
            return ProofErrors.CONTENT_MISMATCH;
        }
        if (this.lemma.length > 1 &&
            rootHash !== this.lemma[this.lemma.length - 1]) {
            return ProofErrors.ROOT_MISMATCH;
        }
        const proofPosition = this.calculateProofPosition(numLeafNodes);
        if (proofPosition !== position) {
            return ProofErrors.POSITION_MISMATCH;
        }
        if (!this.validateRoot()) {
            return ProofErrors.VALIDATION_FAILURE;
        }
        return null;
    }
    validateRoot() {
        let hash = this.lemma[0];
        for (let i = 0; i < this.path.length; i++) {
            const isLeft = this.path[i];
            if (isLeft) {
                hash = keccak256Hash(hash, this.lemma[i + 1]);
            }
            else {
                hash = keccak256Hash(this.lemma[i + 1], hash);
            }
        }
        return hash === this.lemma[this.lemma.length - 1];
    }
    // numLeafNodes should bigger than 0
    calculateProofPosition(numLeafNodes) {
        let position = 0;
        for (let i = this.path.length - 1; i >= 0; i--) {
            const leftSideDepth = Math.ceil(Math.log2(numLeafNodes));
            const leftSideLeafNodes = Math.pow(2, leftSideDepth) / 2;
            const isLeft = this.path[i];
            if (isLeft) {
                numLeafNodes = leftSideLeafNodes;
            }
            else {
                position += leftSideLeafNodes;
                numLeafNodes -= leftSideLeafNodes;
            }
        }
        return position;
    }
}
class MerkleTree {
    root = null;
    leaves = [];
    constructor(root = null, leaves = []) {
        this.root = root;
        this.leaves = leaves;
    }
    rootHash() {
        return this.root ? this.root.hash : null;
    }
    proofAt(i) {
        if (i < 0 || i >= this.leaves.length) {
            throw new Error('Index out of range');
        }
        if (this.leaves.length === 1) {
            return new Proof([this.rootHash()], []);
        }
        const proof = new Proof();
        // append the target leaf node hash
        proof.lemma.push(this.leaves[i].hash);
        let current = this.leaves[i];
        while (current !== this.root) {
            if (current.isLeftSide()) {
                proof.lemma.push(current.parent?.right?.hash);
                proof.path.push(true);
            }
            else {
                proof.lemma.push(current.parent?.left?.hash);
                proof.path.push(false);
            }
            current = current.parent;
        }
        // append the root node hash
        proof.lemma.push(this.rootHash());
        return proof;
    }
    addLeaf(leafContent) {
        this.leaves.push(LeafNode.fromContent(leafContent));
    }
    addLeafByHash(leafHash) {
        this.leaves.push(new LeafNode(leafHash));
    }
    // build root
    build() {
        const numLeafNodes = this.leaves.length;
        if (numLeafNodes === 0) {
            return null;
        }
        let queue = [];
        for (let i = 0; i < numLeafNodes; i += 2) {
            // last single leaf node
            if (i === numLeafNodes - 1) {
                queue.push(this.leaves[i]);
                continue;
            }
            const node = LeafNode.fromLeftAndRight(this.leaves[i], this.leaves[i + 1]);
            queue.push(node);
        }
        while (true) {
            const numNodes = queue.length;
            if (numNodes <= 1) {
                break;
            }
            for (let i = 0; i < Math.floor(numNodes / 2); i++) {
                const left = queue[0];
                const right = queue[1];
                queue.splice(0, 2); // remove first two elements
                queue.push(LeafNode.fromLeftAndRight(left, right));
            }
            if (numNodes % 2 === 1) {
                const first = queue[0];
                queue.splice(0, 1); // remove first element
                queue.push(first);
            }
        }
        this.root = queue[0];
        return this;
    }
}
function keccak256Hash(...hashes) {
    return keccak256$1(hexConcat(hashes));
}

class AbstractFile {
    fileSize = 0;
    // constructor() {}
    // split a segment into chunks and compute the root hash
    static segmentRoot(segment, emptyChunksPadded = 0) {
        const tree = new MerkleTree();
        const dataLength = segment.length;
        for (let offset = 0; offset < dataLength; offset += DEFAULT_CHUNK_SIZE) {
            const chunk = segment.subarray(offset, offset + DEFAULT_CHUNK_SIZE);
            tree.addLeaf(chunk);
        }
        if (emptyChunksPadded > 0) {
            for (let i = 0; i < emptyChunksPadded; i++) {
                tree.addLeafByHash(EMPTY_CHUNK_HASH);
            }
        }
        tree.build();
        if (tree.root !== null) {
            return tree.rootHash();
        }
        return ZERO_HASH; // TODO check this
    }
    size() {
        return this.fileSize;
    }
    iterate(flowPadding) {
        return this.iterateWithOffsetAndBatch(0, DEFAULT_SEGMENT_SIZE, flowPadding);
    }
    async merkleTree() {
        const iter = this.iterate(true);
        const tree = new MerkleTree();
        while (true) {
            let [ok, err] = await iter.next();
            if (err != null) {
                return [null, err];
            }
            if (!ok) {
                break;
            }
            const current = iter.current();
            const segRoot = AbstractFile.segmentRoot(current);
            tree.addLeafByHash(segRoot);
        }
        return [tree.build(), null];
    }
    numChunks() {
        return numSplits(this.size(), DEFAULT_CHUNK_SIZE);
    }
    numSegments() {
        return numSplits(this.size(), DEFAULT_SEGMENT_SIZE);
    }
    async createSubmission(tags) {
        const submission = {
            length: this.size(),
            tags: tags,
            nodes: [],
        };
        const nodes = this.splitNodes();
        let offset = 0;
        for (let chunks of nodes) {
            let [node, err] = await this.createNode(offset, chunks);
            if (err != null) {
                return [null, err];
            }
            submission.nodes.push(node);
            offset += chunks * DEFAULT_CHUNK_SIZE;
        }
        return [submission, null];
    }
    splitNodes() {
        let nodes = [];
        let chunks = this.numChunks();
        let [paddedChunks, chunksNextPow2] = computePaddedSize(chunks);
        let nextChunkSize = chunksNextPow2;
        while (paddedChunks > 0) {
            if (paddedChunks >= nextChunkSize) {
                paddedChunks -= nextChunkSize;
                nodes.push(nextChunkSize);
            }
            nextChunkSize /= 2;
        }
        return nodes;
    }
    async createNode(offset, chunks) {
        let batch = chunks;
        if (chunks > DEFAULT_SEGMENT_MAX_CHUNKS) {
            batch = DEFAULT_SEGMENT_MAX_CHUNKS;
        }
        return this.createSegmentNode(offset, DEFAULT_CHUNK_SIZE * batch, DEFAULT_CHUNK_SIZE * chunks);
    }
    async createSegmentNode(offset, batch, size) {
        const iter = this.iterateWithOffsetAndBatch(offset, batch, true);
        const tree = new MerkleTree();
        for (let i = 0; i < size;) {
            let [ok, err] = await iter.next();
            if (err != null) {
                return [null, err];
            }
            if (!ok) {
                break;
            }
            const current = iter.current();
            const segRoot = AbstractFile.segmentRoot(current);
            tree.addLeafByHash(segRoot);
            i += current.length;
        }
        tree.build();
        const numChunks = size / DEFAULT_CHUNK_SIZE;
        const height = Math.log2(numChunks);
        const node = {
            height: height,
            root: tree.rootHash(),
        };
        return [node, null];
    }
}

let Blob$1 = class Blob extends AbstractFile {
    blob = null; // @see https://developer.mozilla.org/en-US/docs/Web/API/File/File
    fileSize = 0;
    constructor(blob) {
        super();
        this.blob = blob;
        this.fileSize = blob.size;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new BlobIterator(this.blob, this.size(), offset, batch, flowPadding);
    }
};

class ZgFile extends AbstractFile {
    fd = null;
    fileSize = 0;
    constructor(fd, fileSize) {
        super();
        this.fd = fd;
        this.fileSize = fileSize;
    }
    static async fromNodeFileHandle(fd) {
        const stat = await fd.stat();
        return new ZgFile(fd, stat.size);
    }
    // NOTE: need manually close fd after use
    static async fromFilePath(path) {
        const fd = await open(path, 'r'); // if fail, throw error
        return await ZgFile.fromNodeFileHandle(fd);
    }
    async close() {
        await this.fd?.close();
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        return new NodeFdIterator(this.fd, this.size(), offset, batch, flowPadding);
    }
}

class MemData extends AbstractFile {
    fileSize = 0;
    data;
    constructor(data) {
        super();
        this.data = data;
        this.fileSize = data.length;
    }
    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
        const data = new Uint8Array(this.data);
        return new MemIterator(data, this.size(), offset, batch, flowPadding);
    }
}

class Batcher {
    streamDataBuilder;
    clients;
    flow;
    blockchainRpc;
    constructor(version, clients, flow, provider) {
        this.streamDataBuilder = new StreamDataBuilder(version);
        this.clients = clients;
        this.flow = flow;
        this.blockchainRpc = provider;
    }
    async exec(opts) {
        // build stream data
        const streamData = this.streamDataBuilder.build();
        const encoded = streamData.encode();
        const data = new MemData(encoded);
        const uploader = new Uploader(this.clients, this.blockchainRpc, this.flow);
        if (opts === undefined) {
            opts = defaultUploadOption;
        }
        opts.tags = this.streamDataBuilder.buildTags();
        return await uploader.uploadFile(data, opts);
    }
}

class KvIterator {
    // client is the client to use for requests.
    client;
    // streamId is the stream ID.
    streamId;
    // version is the version of the stream.
    version;
    // currentPair is the current key-value pair.
    currentPair;
    // NewIterator creates an iterator.
    constructor(client, streamId, version) {
        this.client = client;
        this.streamId = streamId;
        this.version = version;
    }
    // Valid check if current position is exist
    valid() {
        return this.currentPair !== undefined;
    }
    getCurrentPair() {
        return this.currentPair;
    }
    async move(kv) {
        if (kv === null) {
            this.currentPair = undefined;
            return null;
        }
        let value = await this.client.getValue(this.streamId, kv.key, kv.version);
        if (value === null) {
            return new Error('errValueNotFound');
        }
        this.currentPair = {
            key: kv.key,
            data: value.data,
            size: value.size,
            version: kv.version,
        };
        return null;
    }
    async seekBefore(key) {
        let kv = await this.client.getPrev(this.streamId, key, 0, 0, true, this.version);
        return this.move(kv);
    }
    async seekAfter(key) {
        let kv = await this.client.getNext(this.streamId, key, 0, 0, true, this.version);
        return this.move(kv);
    }
    async seekToFirst() {
        let kv = await this.client.getFirst(this.streamId, 0, 0, this.version);
        return this.move(kv);
    }
    async seekToLast() {
        let kv = await this.client.getLast(this.streamId, 0, 0, this.version);
        return this.move(kv);
    }
    async next() {
        if (!this.valid()) {
            return new Error('errIteratorInvalid');
        }
        let kv = await this.client.getNext(this.streamId, this.currentPair.key, 0, 0, false, this.version);
        return this.move(kv);
    }
    async prev() {
        if (!this.valid()) {
            return new Error('errIteratorInvalid');
        }
        let kv = await this.client.getPrev(this.streamId, this.currentPair.key, 0, 0, false, this.version);
        return this.move(kv);
    }
}

class KvClient {
    inner;
    constructor(rpc) {
        const client = new StorageKv(rpc);
        this.inner = client;
    }
    newIterator(streamId, version) {
        return new KvIterator(this, streamId, version);
    }
    async getValue(streamId, key, version) {
        let val = {
            data: '',
            size: 0,
            version: version || 0,
        };
        while (true) {
            const seg = await this.inner.getValue(streamId, key, val.data.length, MAX_QUERY_SIZE, version);
            if (seg === undefined) {
                return null;
            }
            if (val.version === Number.MAX_SAFE_INTEGER) {
                val.version = seg.version;
            }
            else if (val.version !== seg.version) {
                val.version = seg.version;
                val.data = '';
            }
            val.size = seg.size;
            const segData = Buffer.from(seg.data, 'base64');
            const valData = Buffer.from(val.data, 'base64');
            val.data = Buffer.concat([valData, segData]).toString('base64');
            if (seg.size == segData.length + valData.length) {
                return val;
            }
        }
    }
    async get(streamId, key, startIndex, length, version) {
        return this.inner.getValue(streamId, key, startIndex, length, version);
    }
    async getNext(streamId, key, startIndex, length, inclusive, version) {
        return this.inner.getNext(streamId, key, startIndex, length, inclusive, version);
    }
    async getPrev(streamId, key, startIndex, length, inclusive, version) {
        return this.inner.getPrev(streamId, key, startIndex, length, inclusive, version);
    }
    async getFirst(streamId, startIndex, length, version) {
        return this.inner.getFirst(streamId, startIndex, length, version);
    }
    async getLast(streamId, startIndex, length, version) {
        return this.inner.getLast(streamId, startIndex, length, version);
    }
    async getTransactionResult(txSeq) {
        return this.inner.getTransactionResult(txSeq);
    }
    async getHoldingStreamIds() {
        return this.inner.getHoldingStreamIds();
    }
    async hasWritePermission(account, streamId, key, version) {
        return this.inner.hasWritePermission(account, streamId, key, version);
    }
    async isAdmin(account, streamId, version) {
        return this.inner.isAdmin(account, streamId, version);
    }
    async isSpecialKey(streamId, key, version) {
        return this.inner.isSpecialKey(streamId, key, version);
    }
    async isWriterOfKey(account, streamId, key, version) {
        return this.inner.isWriterOfKey(account, streamId, key, version);
    }
    async isWriterOfStream(account, streamId, version) {
        return this.inner.isWriterOfStream(account, streamId, version);
    }
}

export { Batcher, Blob$1 as Blob, DEFAULT_CHUNK_SIZE, DEFAULT_SEGMENT_MAX_CHUNKS, DEFAULT_SEGMENT_SIZE, Downloader, EMPTY_CHUNK, EMPTY_CHUNK_HASH, FixedPriceFlow__factory, GetSplitNum, Indexer, KvClient, KvIterator, LeafNode, MAX_KEY_SIZE, MAX_QUERY_SIZE, MAX_SET_SIZE, MemData, MerkleTree, Proof, ProofErrors, SMALL_FILE_SIZE_THRESHOLD, STREAM_DOMAIN, SegmentRange, StorageKv, StorageNode, StreamData, StreamDataBuilder, TIMEOUT_MS, Uploader, ZERO_HASH, ZgFile, calculatePrice, checkExist, computePaddedSize, defaultUploadOption, delay, index as factories, getFlowContract, getMarketContract, getShardConfigs, isValidConfig, nextPow2, numSplits, txWithGasAdjustment };
