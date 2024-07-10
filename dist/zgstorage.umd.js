(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('node:fs/promises')) :
	typeof define === 'function' && define.amd ? define(['exports', 'node:fs/promises'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.zgstorage = {}, global.promises));
})(this, (function (exports, promises) { 'use strict';

	var fs = {};

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

	const TESTNET_FLOW_ADDRESS = '0x8873cc79c5b3b5666535C825205C9a128B1D75F1';
	// not used anymore
	// export const TESTNET_USDT_ADDRESS = '0xe3a700dF2a8bEBeF2f0B1eE92f46d230b01401B1'; 
	const DEFAULT_CHUNK_SIZE = 256; // bytes
	const DEFAULT_SEGMENT_MAX_CHUNKS = 1024;
	const DEFAULT_SEGMENT_SIZE = DEFAULT_CHUNK_SIZE * DEFAULT_SEGMENT_MAX_CHUNKS;
	const EMPTY_CHUNK = new Uint8Array(DEFAULT_CHUNK_SIZE);
	const EMPTY_CHUNK_HASH = keccak256$1(EMPTY_CHUNK);
	const SMALL_FILE_SIZE_THRESHOLD = 256 * 1024;
	const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

	/* Do NOT modify this file; see /src.ts/_admin/update-version.ts */
	/**
	 *  The current version of Ethers.
	 */
	const version = "6.13.0";

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
	const BN_0$4 = BigInt(0);
	const BN_1$1 = BigInt(1);
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
	    assert((value >> width) === BN_0$4, "overflow", "NUMERIC_FAULT", {
	        operation: "fromTwos", fault: "overflow", value: _value
	    });
	    // Top bit set; treat as a negative value
	    if (value >> (width - BN_1$1)) {
	        const mask = (BN_1$1 << width) - BN_1$1;
	        return -(((~value) & mask) + BN_1$1);
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
	    const limit = (BN_1$1 << (width - BN_1$1));
	    if (value < BN_0$4) {
	        value = -value;
	        assert(value <= limit, "too low", "NUMERIC_FAULT", {
	            operation: "toTwos", fault: "overflow", value: _value
	        });
	        const mask = (BN_1$1 << width) - BN_1$1;
	        return ((~value) & mask) + BN_1$1;
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
	    return value & ((BN_1$1 << bits) - BN_1$1);
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
	    assert(result >= BN_0$4, "unsigned value cannot be negative", "NUMERIC_FAULT", {
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
	    if (value === BN_0$4) {
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
	const _guard$1 = {};
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
	        if (guard !== _guard$1) {
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
	        return new Result(_guard$1, result, names);
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
	        return new Result(_guard$1, result, names);
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
	        return new Result(_guard$1, items, keys);
	    }
	}
	function getValue(value) {
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
	        return this.#writeData(getValue(value));
	    }
	    // Inserts a numeric place-holder, returning a callback that can
	    // be used to asjust the value later
	    writeUpdatableValue() {
	        const offset = this.#data.length;
	        this.#data.push(Padding);
	        this.#dataLength += WordSize;
	        return (value) => {
	            this.#data[offset] = getValue(value);
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

	/*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
	// We use WebCrypto aka globalThis.crypto, which exists in browsers and node.js 16+.
	// node.js versions earlier than v19 don't declare it in global scope.
	// For node.js, package.json#exports field mapping rewrites import
	// from `crypto` to `cryptoNode`, which imports native module.
	// Makes the utils un-importable in browsers without a bundler.
	// Once node.js 18 is deprecated, we can just drop the import.
	const u8a = (a) => a instanceof Uint8Array;
	const u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
	// big-endian hardware is rare. Just in case someone still decides to run hashes:
	// early-throw an error because we don't support BE yet.
	const isLE = new Uint8Array(new Uint32Array([0x11223344]).buffer)[0] === 0x44;
	if (!isLE)
	    throw new Error('Non little-endian hardware is not supported');
	/**
	 * @example utf8ToBytes('abc') // new Uint8Array([97, 98, 99])
	 */
	function utf8ToBytes(str) {
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
	        data = utf8ToBytes(data);
	    if (!u8a(data))
	        throw new Error(`expected Uint8Array, got ${typeof data}`);
	    return data;
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

	const U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
	const _32n = /* @__PURE__ */ BigInt(32);
	// We are not using BigUint64Array, because they are extremely slow as per 2022
	function fromBig(n, le = false) {
	    if (le)
	        return { h: Number(n & U32_MASK64), l: Number((n >> _32n) & U32_MASK64) };
	    return { h: Number((n >> _32n) & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
	}
	function split(lst, le = false) {
	    let Ah = new Uint32Array(lst.length);
	    let Al = new Uint32Array(lst.length);
	    for (let i = 0; i < lst.length; i++) {
	        const { h, l } = fromBig(lst[i], le);
	        [Ah[i], Al[i]] = [h, l];
	    }
	    return [Ah, Al];
	}
	// Left rotate for Shift in [1, 32)
	const rotlSH = (h, l, s) => (h << s) | (l >>> (32 - s));
	const rotlSL = (h, l, s) => (l << s) | (h >>> (32 - s));
	// Left rotate for Shift in (32, 64), NOTE: 32 is special case.
	const rotlBH = (h, l, s) => (l << (s - 32)) | (h >>> (64 - s));
	const rotlBL = (h, l, s) => (h << (s - 32)) | (l >>> (64 - s));

	// SHA3 (keccak) is based on a new design: basically, the internal state is bigger than output size.
	// It's called a sponge function.
	// Various per round constants calculations
	const [SHA3_PI, SHA3_ROTL, _SHA3_IOTA] = [[], [], []];
	const _0n = /* @__PURE__ */ BigInt(0);
	const _1n = /* @__PURE__ */ BigInt(1);
	const _2n = /* @__PURE__ */ BigInt(2);
	const _7n = /* @__PURE__ */ BigInt(7);
	const _256n = /* @__PURE__ */ BigInt(256);
	const _0x71n = /* @__PURE__ */ BigInt(0x71);
	for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
	    // Pi
	    [x, y] = [y, (2 * x + 3 * y) % 5];
	    SHA3_PI.push(2 * (5 * y + x));
	    // Rotational
	    SHA3_ROTL.push((((round + 1) * (round + 2)) / 2) % 64);
	    // Iota
	    let t = _0n;
	    for (let j = 0; j < 7; j++) {
	        R = ((R << _1n) ^ ((R >> _7n) * _0x71n)) % _256n;
	        if (R & _2n)
	            t ^= _1n << ((_1n << /* @__PURE__ */ BigInt(j)) - _1n);
	    }
	    _SHA3_IOTA.push(t);
	}
	const [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split(_SHA3_IOTA, true);
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

	const BN_0$3 = BigInt(0);
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
	    let result = BN_0$3;
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

	const BN_0$2 = BigInt(0);
	const BN_1 = BigInt(1);
	const BN_MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
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
	        let maxUintValue = mask(BN_MAX_UINT256, WordSize * 8);
	        if (this.signed) {
	            let bounds = mask(maxUintValue, (this.size * 8) - 1);
	            if (value > bounds || value < -(bounds + BN_1)) {
	                this._throwError("value out-of-bounds", _value);
	            }
	            value = toTwos(value, 8 * WordSize);
	        }
	        else if (value < BN_0$2 || value > mask(maxUintValue, this.size * 8)) {
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
	const BN_0$1 = BigInt(0);
	function toJson(value) {
	    if (value == null) {
	        return null;
	    }
	    return value.toString();
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
	        let gasPrice = BN_0$1;
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
	                        else if (tx.data === "0x" && tx.from === tx.to && tx.value === BN_0$1) {
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

	const BN_0 = BigInt(0);
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
	        const noValue = (getBigInt((tx.value || BN_0), "overrides.value") === BN_0);
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

	/* Autogenerated file. Do not edit manually. */
	/* tslint:disable */
	/* eslint-disable */
	const _abi = [
	    {
	        inputs: [
	            {
	                internalType: "address",
	                name: "book_",
	                type: "address",
	            },
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
	        name: "book",
	        outputs: [
	            {
	                internalType: "contract AddressBook",
	                name: "",
	                type: "address",
	            },
	        ],
	        stateMutability: "view",
	        type: "function",
	    },
	    {
	        inputs: [],
	        name: "commitRoot",
	        outputs: [],
	        stateMutability: "nonpayable",
	        type: "function",
	    },
	    {
	        inputs: [],
	        name: "currentLength",
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
	        inputs: [
	            {
	                internalType: "uint256",
	                name: "_length",
	                type: "uint256",
	            },
	            {
	                internalType: "uint256",
	                name: "alignExp",
	                type: "uint256",
	            },
	        ],
	        name: "nextAlign",
	        outputs: [
	            {
	                internalType: "uint256",
	                name: "",
	                type: "uint256",
	            },
	        ],
	        stateMutability: "pure",
	        type: "function",
	    },
	    {
	        inputs: [
	            {
	                internalType: "uint256",
	                name: "_length",
	                type: "uint256",
	            },
	        ],
	        name: "nextPow2",
	        outputs: [
	            {
	                internalType: "uint256",
	                name: "",
	                type: "uint256",
	            },
	        ],
	        stateMutability: "pure",
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
	        inputs: [],
	        name: "root",
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
	        inputs: [],
	        name: "unstagedHeight",
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
	                internalType: "uint256",
	                name: "height",
	                type: "uint256",
	            },
	        ],
	        name: "zeros",
	        outputs: [
	            {
	                internalType: "bytes32",
	                name: "",
	                type: "bytes32",
	            },
	        ],
	        stateMutability: "pure",
	        type: "function",
	    },
	];
	const _bytecode = "0x6101006040523480156200001257600080fd5b506040516200353b3803806200353b833981016040819052620000359162000246565b6000805460ff1916815560018055604080518281526020810191829052516200006191600291620001d1565b50600280546001818101835560009283527f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace9091019290925560039190915560055560c0829052604051601490620000b99062000221565b908152602001604051809103906000f080158015620000dc573d6000803e3d6000fd5b506001600160a01b031660a052620000f58143620002a1565b60e09081526001600160a01b0384166080526040805160c081018252600081529151602083015281016200012862000198565b815260016020808301919091527fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a4706040808401829052606093840191909152835160075590830151600855820151600955810151600a556080810151600b5560a00151600c5550620002e9915050565b6002805460009190620001ae90600190620002bd565b81548110620001c157620001c1620002d3565b9060005260206000200154905090565b8280548282559060005260206000209081019282156200020f579160200282015b828111156200020f578251825591602001919060010190620001f2565b506200021d9291506200022f565b5090565b6106718062002eca83390190565b5b808211156200021d576000815560010162000230565b6000806000606084860312156200025c57600080fd5b83516001600160a01b03811681146200027457600080fd5b602085015160409095015190969495509392505050565b634e487b7160e01b600052601160045260246000fd5b80820180821115620002b757620002b76200028b565b92915050565b81810381811115620002b757620002b76200028b565b634e487b7160e01b600052603260045260246000fd5b60805160a05160c05160e051612b686200036260003960008181610236015281816105ce015281816107e8015281816108cb01528181610b28015281816118d50152611a2b01526000818161053b0152611a0301526000818161048a0152611a92015260008181610162015261208e0152612b686000f3fe60806040526004361061014b5760003560e01c8063900cf0cf116100b6578063c7dd52211161006f578063c7dd522114610478578063d34353c9146104ac578063e8295588146104c1578063ebf0c717146104e1578063ef3e12dc146104f6578063f06820541461052957600080fd5b8063900cf0cf146103e857806393e405a0146103fe5780639e62a38e14610414578063a3d35f3614610437578063b464b53e1461044d578063b8a409ac1461046257600080fd5b806338d45e101161010857806338d45e10146102cc5780633d75d9c2146102e1578063555430a1146103015780635c975abb1461032157806377e19824146103445780637d5907081461035957600080fd5b806305a8da7214610150578063127f0f07146101a157806318a641ef14610202578063231b02681461022457806331bae17414610266578063364800ec146102b6575b600080fd5b34801561015c57600080fd5b506101847f000000000000000000000000000000000000000000000000000000000000000081565b6040516001600160a01b0390911681526020015b60405180910390f35b3480156101ad57600080fd5b506101b661055d565b6040516101989190600060c082019050825182526020830151602083015260408301516040830152606083015160608301526080830151608083015260a083015160a083015292915050565b34801561020e57600080fd5b5061022261021d3660046124d7565b6105cc565b005b34801561023057600080fd5b506102587f000000000000000000000000000000000000000000000000000000000000000081565b604051908152602001610198565b34801561027257600080fd5b506102866102813660046124f0565b610643565b6040805182516001600160801b039081168252602080850151909116908201529181015190820152606001610198565b3480156102c257600080fd5b5061025860035481565b3480156102d857600080fd5b506102226107e6565b3480156102ed57600080fd5b506102586102fc3660046124d7565b610835565b34801561030d57600080fd5b5061025861031c366004612519565b610881565b34801561032d57600080fd5b5060005460ff166040519015158152602001610198565b34801561035057600080fd5b50600454610258565b34801561036557600080fd5b506103c16103743660046124d7565b6040805180820190915260008082526020820152506000908152600d60209081526040918290208251808401909352546001600160801b038082168452600160801b909104169082015290565b6040805182516001600160801b039081168252602093840151169281019290925201610198565b3480156103f457600080fd5b5061025860055481565b34801561040a57600080fd5b5061025860065481565b61042761042236600461274e565b6108bb565b604051610198949392919061283a565b34801561044357600080fd5b5061025860015481565b34801561045957600080fd5b506101b6610af4565b34801561046e57600080fd5b5061025860045481565b34801561048457600080fd5b506101847f000000000000000000000000000000000000000000000000000000000000000081565b3480156104b857600080fd5b50610222610b7b565b3480156104cd57600080fd5b506102586104dc3660046124d7565b610c92565b3480156104ed57600080fd5b50610258611891565b6105096105043660046128b9565b6118c5565b604080519485526020850193909352918301526060820152608001610198565b34801561053557600080fd5b506102587f000000000000000000000000000000000000000000000000000000000000000081565b6040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a0810191909152506040805160c0810182526007548152600854602082015260095491810191909152600a546060820152600b546080820152600c5460a082015290565b7f00000000000000000000000000000000000000000000000000000000000000004310156106155760405162461bcd60e51b815260040161060c906128f6565b60405180910390fd5b60005b81811161063f576106276119fe565b61062f575050565b61063881612943565b9050610618565b5050565b60408051606081018252600080825260208201819052918101919091526106686107e6565b600154826001600160801b0316106106ce5760405162461bcd60e51b8152602060048201526024808201527f5175657269656420706f736974696f6e206578636565647320757070657220626044820152631bdd5b9960e21b606482015260840161060c565b600e546000905b8181111561079e57600060026106eb848461295c565b6106f59190612985565b9050600e818154811061070a5761070a612999565b600091825260209182902060408051606081018252600290930290910180546001600160801b038082168552600160801b90910481169484018590526001909101549183019190915290955086161061076f5761076881600161295c565b9250610798565b83600001516001600160801b0316856001600160801b03161061079457505050919050565b8091505b506106d5565b60405162461bcd60e51b815260206004820152601b60248201527f43616e206e6f742066696e642070726f70657220636f6e746578740000000000604482015260640161060c565b7f00000000000000000000000000000000000000000000000000000000000000004310156108265760405162461bcd60e51b815260040161060c906128f6565b61082e6119fe565b610826575b565b6000818082036108485750600092915050565b600181811c909117600281901c17600481901c17600881901c17601081901c17602081901c179061087a90829061295c565b9392505050565b6000828082036108955760009150506108b5565b6108a06001826129af565b831c90506108af60018261295c565b831b9150505b92915050565b6060806060806108c9611d1f565b7f00000000000000000000000000000000000000000000000000000000000000004310156109095760405162461bcd60e51b815260040161060c906128f6565b84518067ffffffffffffffff8111156109245761092461253b565b60405190808252806020026020018201604052801561094d578160200160208202803683370190505b5094508067ffffffffffffffff8111156109695761096961253b565b604051908082528060200260200182016040528015610992578160200160208202803683370190505b5093508067ffffffffffffffff8111156109ae576109ae61253b565b6040519080825280602002602001820160405280156109d7578160200160208202803683370190505b5092508067ffffffffffffffff8111156109f3576109f361253b565b604051908082528060200260200182016040528015610a1c578160200160208202803683370190505b50915060005b81811015610aeb57600080600080610a528b8681518110610a4557610a45612999565b60200260200101516118c5565b9350935093509350838a8681518110610a6d57610a6d612999565b60200260200101818152505082898681518110610a8c57610a8c612999565b60200260200101818152505081888681518110610aab57610aab612999565b60200260200101818152505080878681518110610aca57610aca612999565b6020026020010181815250505050505080610ae490612943565b9050610a22565b50509193509193565b6040805160c081018252600080825260208201819052918101829052606081018290526080810182905260a08101919091527f0000000000000000000000000000000000000000000000000000000000000000431015610b665760405162461bcd60e51b815260040161060c906128f6565b610b6e6107e6565b610b7661055d565b905090565b60025460035403610b8857565b600280546003549091600091610ba0906001906129af565b81548110610bb057610bb0612999565b906000526020600020015490506000610bd160016003546104dc91906129af565b6003549091505b83811015610c8a5760408051602080820186905281830185905282518083038401815260609092019092528051910120600154610c1990600290841c6129c2565b600003610c5357809350610c2c82610c92565b92508060028381548110610c4257610c42612999565b600091825260209091200155610c77565b60028281548110610c6657610c66612999565b906000526020600020015493508092505b5080610c8281612943565b915050610bd8565b505050600355565b600081600003610cc357507fd397b3b043d87fcd6fad1291ff0bfd16401c274896d8c63a923727f077b8e0b5919050565b81600103610cf257507ff73e6947d7d1628b9976a6e40d7b278a8a16405e96324a68df45b12a51b7cfde919050565b81600203610d2157507fa1520264ae93cac619e22e8718fc4fa7ebdd23f493cad602434d2a58ff4868fb919050565b81600303610d5057507fde5747106ac1194a1fa9071dbd6cf19dc2bc7964497ef0afec7e4bdbcf08c47e919050565b81600403610d7f57507f09c7082879180d28c789c05fafe7030871c76cedbe82c948b165d6a1d66ac15b919050565b81600503610dae57507faa7a02bcf29fba687f84123c808b5b48834ff5395abe98e622fadc14e4180c95919050565b81600603610ddd57507f7608fd46b710b589e0f2ee5a13cd9c41d432858a30d524f84c6d5db37f66273a919050565b81600703610e0c57507fa5d9a2f7f3573ac9a1366bc484688b4daf934b87ea9b3bf2e703da8fd9f09708919050565b81600803610e3b57507f6c1779477f4c3fca26b4607398859a43b90a286ce8062500744bd4949981757f919050565b81600903610e6a57507f45c22df3d952c33d5edce122eed85e5cda3fd61939e7ad7b3e03b6927bb598ea919050565b81600a03610e9957507fe68d02859bb6211cec64f52368b77d422de3b8eac34bf615942b814b643301b5919050565b81600b03610ec857507f62d78399b954d51cb9728601738ad13ddc43b2300064660716bb661d2f4d686f919050565b81600c03610ef757507f6e250d9abdbbb3993fce08de0395cdb56f0483e67d8762a798de011f6a50866a919050565b81600d03610f2657507f1d1a3a74062fd94078617e33eb901eaf16a830f67c387d8eed342db2ac5e2cc5919050565b81600e03610f5557507f19b3b3886526917eae8650223d0be20a0301be960eb339696e673ad8a804440f919050565b81600f03610f8457507fee9e05df53f10e62a897e5140a3f58732dd849e69cd1d62b21ed80ead711a014919050565b81601003610fb357507f2cc7aa6e611a113a34505dc1c96b220f14909b70e2c2c7b1a74655da21013c5e919050565b81601103610fe257507f949b52dfece7ca3bad3cb27f7750ecaee64cedb6243a275c35984e92956c530a919050565b8160120361101157507fb2680d060b763b932c150434c3812ba9fbc50937e0ebcf5758de884be81bab65919050565b8160130361104057507f523aebf4a085edbc9c8cdc99c83f46262e5f029b395ff7bf561a48a3f387e6b8919050565b8160140361106f57507fc9ab73827ab33c0cedb7ecf0ed2e6e32583c0fe887133a7f381ea4ba84d95b76919050565b8160150361109e57507f23eb397dec7e564ebe97f160a5e1081a77d9861f316807079b6be4731beb331e919050565b816016036110cd57507fdfa44a274c60f090df034aaf75539fd40e94cfd6362dd53d26ed20c8ad529563919050565b816017036110fc57507f15b13ee358e1044a53381243c094e54bf7aceb9b5325a0313d6b85fd44e8b3a5919050565b8160180361112b57507f1a7a93871e2daa0f1860aa91d4ece4ccd012dac5fe581176a21b155cfeca6d40919050565b8160190361115a57507fb12665fd0b884a7c7d1e0294d369170d7e672d9e125eb87784556305f98292df919050565b81601a0361118957507f2a5543b0b2f8cf550524390291774f4d6c8c0a25ff5393b09c44d75c92a5bd8e919050565b81601b036111b857507ff9df1841a6e7164b67a1242f1c74975137085ffd9721831f6c469d3a4d5ba42e919050565b81601c036111e757507fba24736b1b48246c1f7803be967be43ca0dddc9c2c0687a2957952249bc89371919050565b81601d0361121657507ff3f706b73790c73ca0a8f0460ac3a2a102e280415586b520e70cd5e8264388b4919050565b81601e0361124557507fc1f5a9a9f357e1c37814688cf7290c87a264ed3d6174a12b978da1c586f53825919050565b81601f0361127457507f766f7702e19ce23d426cdad03e4292a5a42c4669420101fed74400ec7cda3ac6919050565b816020036112a357507f070fec213e105b3e4d9b0434ac2fc7ca721d35093dc741fb9419797003e2394a919050565b816021036112d257507f9a7aade05b49e43f5fd3782571cc8c90eadacd5d660b53842b4e5b63d675ae0c919050565b8160220361130157507fb27b35a8236d0f9b6692820429c025ed58ed378dc98d316b762f0c865c68be6f919050565b8160230361133057507fdc567ad38d9b90cc9bea4e0f82ec05eca10b3aa94eddc7b63c4fd20c001bb53b919050565b8160240361135f57507fb208dfc457c8b30661ae49544c8e57399818095aab8dd7a426fb8dd56bb8c559919050565b8160250361138e57507fc4a72e1ff84f7a22631f3f95c61c392f98f52050360215a9d7e75d79b0bcd2ca919050565b816026036113bd57507fbb093ec8c0d7defb1de668b5b5dd4f2619e5cd92d29cc144862364a83ab993a8919050565b816027036113ec57507fe341796f2fe3975012c1e6badfa2e9c4523e43f911dc845082c3f4d7b4ff871d919050565b8160280361141b57507f42d356a11a0b39243eca3c3263299cb6f8c3e9728af6d9d8b0ddb6d354f1890d919050565b8160290361144a57507f0ce506e834e3a50a33f80074bc7fa16cf3c0712b36a41b69699177ea25de6c30919050565b81602a0361147957507fd8fa5bf130aeb7756b1ed09090cc80ed78dae0617978540f0fabd06dfb978938919050565b81602b036114a857507feed69a20fe36eb604f2153efa3b01c0e143cdf02229a1b8f741c9c2719059eb0919050565b81602c036114d757507f303c9c566ebf5bfe252796e5c131a99801226152a514688b5ca6883e99031d88919050565b81602d0361150657507fc7c3765ba96cfbccf3ae718393fa89791070cc8cd85f280b6ac46aea10d96042919050565b81602e0361153557507f1ca65b0a2b8034ee6bfb1fa4526832304e393af835c2c42b4dace58048746800919050565b81602f0361156457507f957add5e02350fd47de3a8e1da38fd774ceb31214d5897ed6315740a83cd634a919050565b8160300361159357507f787892cb439d5d358870774e163557cf02ec3cb87be6fde11abf1acee14eeaa4919050565b816031036115c257507f047c0962d4f5c8f60692c587de07739528c4d2059240d61dd34d2a547a438ee6919050565b816032036115f157507fc18727efc9e4df63020dcd90edc17dfd2ad14f02328c912b13898e0b53735556919050565b8160330361162057507fe38b9218987e451effe1648c3c9851ad03b64b052a5a3f5ca30f4d7b1ecf7120919050565b8160340361164f57507f0e48ecb1a5418e6218289acc8cf723e67ac6eae3ecb80f644336ab4365a2f2b2919050565b8160350361167e57507fd60e66f5b8cd08d71a1a4d7798952a7afa5a6e93a886c587a46a5500ebef4a60919050565b816036036116ad57507f5162aa9c31d9105f689cf6e71e19548bc9f0218b7d0f99ff7fa8bc2f19c68462919050565b816037036116dc57507f6fa8519b4b0e8fb97a9b618e97627d97b9b9d29d04521fd96472e9c502700568919050565b8160380361170b57507f41f5dcf0cdee270a2ad9a5f8130aaaab94b237463e09757c28b0321f09e24eb0919050565b8160390361173a57507f87a119239fa90732197108adfd029938b4743874d959d3da79b3a30f4832899e919050565b81603a0361176957507f8e96dbaa5c72e84a5297b040ccc1a60750a3201166e3b7740d352837233608a1919050565b81603b0361179857507f01605058d167ce967af8c475d2f6c341c3e0b437babf899c9da73a520aa4ecb5919050565b81603c036117c757507f04529eb80532c5118949d700d8dfd2aa86850b1c6479b26276b9486784a145ff919050565b81603d036117f657507fd191814ad13f27361ae20a46cbac8f6e76c10ebe9af0806d6720492ee2f296f0919050565b81603e0361182557507fa28df63f78821060570da371c0be1312188346b92a7965cc4b980b26c134a4d7919050565b81603f0361185457507fb48a92d40b61dc995ceecee4cded6415050dcece448b1e0b5e5b6a0e6981f3ef919050565b60405162461bcd60e51b8152602060048201526012602482015271125b99195e081bdd5d081bd988189bdd5b9960721b604482015260640161060c565b60028054600091906118a5906001906129af565b815481106118b5576118b5612999565b9060005260206000200154905090565b6000806000806118d3611d1f565b7f00000000000000000000000000000000000000000000000000000000000000004310156119135760405162461bcd60e51b815260040161060c906128f6565b61191c85611d65565b61195d5760405162461bcd60e51b815260206004820152601260248201527124b73b30b634b21039bab136b4b9b9b4b7b760711b604482015260640161060c565b600061196886611f7c565b90506119726107e6565b600061197d87611fda565b9050600061198a88612180565b6004805491925060019060006119a0838561295c565b9250508190555081336001600160a01b03167f167ce04d2aa1981994d3a31695da0d785373335b1078cec239a1a3a2c76755558386888e6040516119e79493929190612a11565b60405180910390a396509450925090509193509193565b6000807f0000000000000000000000000000000000000000000000000000000000000000600554600101027f0000000000000000000000000000000000000000000000000000000000000000019050438110611a5c57600091505090565b611a64610b7b565b6000611a6e611891565b604051632d287e4360e01b8152600481018290529091506000906001600160a01b037f00000000000000000000000000000000000000000000000000000000000000001690632d287e43906024016020604051808303816000875af1158015611adb573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190611aff9190612aa8565b90506005548114611b1257611b12612ac1565b60008043611b228661010061295c565b1015611b5257507fc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470905080611c60565b506001546040805186406020820181905291810186905260608101929092529060800160408051808303601f190181528282528051602091820120600680546001805487870187526001600160801b039283168089529083168689018181526000878152600d89528981209a519151918616600160801b928716830217909a558851606081018a52928352968201908152968101858152600e8054808501825599529051965196831696909216909402949094177fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fd60029096029586015592517fbb7b4a454dc3493923482f07822329ed19e8244eff582cc204f8554c3620c3fe9094019390935554905591505b600160056000828254611c73919061295c565b90915550506040805160c08101825260055480825260208083018990528284018890526001546060808501829052608080860188905260a0909501889052600784905560088b905560098a9055600a829055600b879055600c88905560045486518b815293840152948201529283018590529133917fbc8a3fd82465d43f1709e44ed882f7e1af0147274196ef1ec009f5d52ff4e993910160405180910390a360019550505050505090565b60005460ff16156108335760405162461bcd60e51b815260206004820152601060248201526f14185d5cd8589b194e881c185d5cd95960821b604482015260640161060c565b6000816040015151600003611d7c57506000919050565b6040820151805160049190611d93906001906129af565b81518110611da357611da3612999565b6020026020010151602001518360400151600081518110611dc657611dc6612999565b602002602001015160200151611ddc91906129af565b10611de957506000919050565b60408260400151600081518110611e0257611e02612999565b60200260200101516020015110611e1b57506000919050565b60005b6001836040015151611e3091906129af565b811015611ea75782604001518181518110611e4d57611e4d612999565b6020026020010151602001518360400151826001611e6b919061295c565b81518110611e7b57611e7b612999565b60200260200101516020015110611e955750600092915050565b80611e9f81612943565b915050611e1e565b506000611eb383611f7c565b9050611ec161010082612ad7565b83511115611ed25750600092915050565b60006010821015611eef57611ee86001836129af565b9050611f55565b836040015151600103611f0a57611ee8600483901c836129af565b60048460400151600081518110611f2357611f23612999565b602002602001015160200151611f3991906129af565b611f4490600161295c565b611f52906001901b836129af565b90505b611f6161010082612ad7565b845111611f72575060009392505050565b5060019392505050565b600080805b836040015151811015611fd35783604001518181518110611fa457611fa4612999565b6020026020010151602001516001901b82611fbf919061295c565b915080611fcb81612943565b915050611f81565b5092915050565b600154600090815b83604001515181101561206b5760008460400151828151811061200757612007612999565b602002602001015160000151905060008560400151838151811061202d5761202d612999565b6020026020010151602001519050600061204783836121b4565b905083600003612055578095505b505050808061206390612943565b915050611fe2565b50600061207882846129af565b905060008360015461208a91906129af565b90507f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03166380f556056040518163ffffffff1660e01b8152600401602060405180830381865afa1580156120ea573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061210e9190612af6565b604051636d3759b560e11b81526004810185905260248101839052604481018490526001600160a01b03919091169063da6eb36a90606401600060405180830381600087803b15801561216057600080fd5b505af1158015612174573d6000803e3d6000fd5b50505050505050919050565b600081604001516040516020016121979190612b1f565b604051602081830303815290604052805190602001209050919050565b6000806121c360015484610881565b905060006121d46001851b8361295c565b6002549091506121e6906001906129af565b6001901b81111561222f576121f9610b7b565b612201612324565b600254612210906001906129af565b6001901b81111561222857612223612324565b612201565b6002546003555b60025461223b856123b2565b60008087875b8481101561230657612256600288831c6129c2565b60000361229c57816002828154811061227157612271612999565b60009182526020909120015561228881600161295c565b6003556122966001866129af565b50612306565b600281815481106122af576122af612999565b9060005260206000200154935081925083836040516020016122db929190918252602082015260400190565b60405160208183030381529060405280519060200120915080806122fe90612943565b915050612241565b506123146001891b8761295c565b6001555093979650505050505050565b60028054906000906123376001846129af565b8154811061234757612347612999565b600091825260208220015491506123626104dc6001856129af565b905060028282604051602001612382929190918252602082015260400190565b60408051601f19818403018152919052805160209182012082546001810184556000938452919092200155505050565b8060035411156123bf5750565b6002805460035490916000916123d7906001906129af565b815481106123e7576123e7612999565b90600052602060002001549050600061240860016003546104dc91906129af565b6003549091505b838110156124d0576040805160208082018690528183018590528251808303840181526060909201909252805191012060015461245090600290841c6129c2565b6000036124995780935061246382610c92565b925085821061249457806002838154811061248057612480612999565b600091825260209091200155505050505050565b6124bd565b600282815481106124ac576124ac612999565b906000526020600020015493508092505b50806124c881612943565b91505061240f565b5050505050565b6000602082840312156124e957600080fd5b5035919050565b60006020828403121561250257600080fd5b81356001600160801b038116811461087a57600080fd5b6000806040838503121561252c57600080fd5b50508035926020909101359150565b634e487b7160e01b600052604160045260246000fd5b6040805190810167ffffffffffffffff811182821017156125745761257461253b565b60405290565b6040516060810167ffffffffffffffff811182821017156125745761257461253b565b604051601f8201601f1916810167ffffffffffffffff811182821017156125c6576125c661253b565b604052919050565b600067ffffffffffffffff8211156125e8576125e861253b565b5060051b60200190565b600082601f83011261260357600080fd5b81356020612618612613836125ce565b61259d565b82815260069290921b8401810191818101908684111561263757600080fd5b8286015b8481101561267657604081890312156126545760008081fd5b61265c612551565b81358152848201358582015283529183019160400161263b565b509695505050505050565b60006060828403121561269357600080fd5b61269b61257a565b90508135815260208083013567ffffffffffffffff808211156126bd57600080fd5b818501915085601f8301126126d157600080fd5b8135818111156126e3576126e361253b565b6126f5601f8201601f1916850161259d565b818152878583860101111561270957600080fd5b8185850186830137600085838301015280858701525050604085013592508083111561273457600080fd5b5050612742848285016125f2565b60408301525092915050565b6000602080838503121561276157600080fd5b823567ffffffffffffffff8082111561277957600080fd5b818501915085601f83011261278d57600080fd5b813561279b612613826125ce565b81815260059190911b830184019084810190888311156127ba57600080fd5b8585015b838110156127f2578035858111156127d65760008081fd5b6127e48b89838a0101612681565b8452509186019186016127be565b5098975050505050505050565b600081518084526020808501945080840160005b8381101561282f57815187529582019590820190600101612813565b509495945050505050565b60808152600061284d60808301876127ff565b82810360208481019190915286518083528782019282019060005b8181101561288457845183529383019391830191600101612868565b5050848103604086015261289881886127ff565b9250505082810360608401526128ae81856127ff565b979650505050505050565b6000602082840312156128cb57600080fd5b813567ffffffffffffffff8111156128e257600080fd5b6128ee84828501612681565b949350505050565b6020808252601a908201527f436f6e747261637420686173206e6f74206c61756e636865642e000000000000604082015260600190565b634e487b7160e01b600052601160045260246000fd5b6000600182016129555761295561292d565b5060010190565b808201808211156108b5576108b561292d565b634e487b7160e01b600052601260045260246000fd5b6000826129945761299461296f565b500490565b634e487b7160e01b600052603260045260246000fd5b818103818111156108b5576108b561292d565b6000826129d1576129d161296f565b500690565b600081518084526020808501945080840160005b8381101561282f5781518051885283015183880152604090960195908201906001016129ea565b848152600060208581840152846040840152608060608401528351608084015280840151606060a085015280518060e086015260005b81811015612a645782810184015186820161010001528301612a47565b5061010092506000838287010152601f19601f8201168501915050604085015160808583030160c0860152612a9b838301826129d6565b9998505050505050505050565b600060208284031215612aba57600080fd5b5051919050565b634e487b7160e01b600052600160045260246000fd5b6000816000190483118215151615612af157612af161292d565b500290565b600060208284031215612b0857600080fd5b81516001600160a01b038116811461087a57600080fd5b60208152600061087a60208301846129d656fea2646970667358221220e377cee588fd799febc8e15969a547b0a21cc3e04618ae49bf1350bd131c5f7d64736f6c63430008100033608060405234801561001057600080fd5b5060405161067138038061067183398101604081905261002f9161014a565b6100383361009a565b806001600160401b0381111561005057610050610163565b604051908082528060200260200182016040528015610079578160200160208202803683370190505b50805161008e916001916020909101906100ea565b50506000600255610179565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b828054828255906000526020600020908101928215610125579160200282015b8281111561012557825182559160200191906001019061010a565b50610131929150610135565b5090565b5b808211156101315760008155600101610136565b60006020828403121561015c57600080fd5b5051919050565b634e487b7160e01b600052604160045260246000fd5b6104e9806101886000396000f3fe608060405234801561001057600080fd5b506004361061007d5760003560e01c80638da5cb5b1161005b5780638da5cb5b146100d557806396e494e8146100f0578063e0886f9014610103578063f2fde38b1461011657600080fd5b80631d1a696d146100825780632d287e43146100aa578063715018a6146100cb575b600080fd5b6100956100903660046103e4565b610129565b60405190151581526020015b60405180910390f35b6100bd6100b83660046103e4565b610194565b6040519081526020016100a1565b6100d36101ee565b005b6000546040516001600160a01b0390911681526020016100a1565b6100956100fe3660046103e4565b610202565b6100bd6101113660046103e4565b610237565b6100d36101243660046103fd565b610297565b60008061013d600254600180549050610310565b905060005b8181101561018a57836001828154811061015e5761015e610426565b906000526020600020015403610178575060019392505050565b8061018281610452565b915050610142565b5060009392505050565b6002546001546000919082906101aa908361046b565b905083600182815481106101c0576101c0610426565b90600052602060002001819055506001600260008282546101e1919061048d565b9091555091949350505050565b6101f661032a565b6102006000610384565b565b6001546002546000919083108015610230575080610222600254836103d4565b61022c91906104a0565b8310155b9392505050565b600061024282610202565b6102675760405163b52d71f360e01b8152600481018390526024015b60405180910390fd5b60018054610275908461046b565b8154811061028557610285610426565b90600052602060002001549050919050565b61029f61032a565b6001600160a01b0381166103045760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b606482015260840161025e565b61030d81610384565b50565b600081831061031f5781610321565b825b90505b92915050565b6000546001600160a01b031633146102005760405162461bcd60e51b815260206004820181905260248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604482015260640161025e565b600080546001600160a01b038381166001600160a01b0319831681178455604051919092169283917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e09190a35050565b60008183101561031f5781610321565b6000602082840312156103f657600080fd5b5035919050565b60006020828403121561040f57600080fd5b81356001600160a01b038116811461023057600080fd5b634e487b7160e01b600052603260045260246000fd5b634e487b7160e01b600052601160045260246000fd5b6000600182016104645761046461043c565b5060010190565b60008261048857634e487b7160e01b600052601260045260246000fd5b500690565b808201808211156103245761032461043c565b818103818111156103245761032461043c56fea26469706673582212202d7a75b8d01477d7b0dfd4de81e732d9f919a499a532643d0950277377b9966e64736f6c63430008100033";
	const isSuperArgs = (xs) => xs.length > 1;
	class Flow__factory extends ContractFactory {
	    constructor(...args) {
	        if (isSuperArgs(args)) {
	            super(...args);
	        }
	        else {
	            super(_abi, _bytecode, args[0]);
	        }
	    }
	    getDeployTransaction(book_, blocksPerEpoch_, deployDelay_, overrides) {
	        return super.getDeployTransaction(book_, blocksPerEpoch_, deployDelay_, overrides || {});
	    }
	    deploy(book_, blocksPerEpoch_, deployDelay_, overrides) {
	        return super.deploy(book_, blocksPerEpoch_, deployDelay_, overrides || {});
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

	/* Autogenerated file. Do not edit manually. */
	/* tslint:disable */
	/* eslint-disable */

	var index = /*#__PURE__*/Object.freeze({
		__proto__: null,
		Flow__factory: Flow__factory
	});

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	// resolves . and .. elements in a path array with directory names there
	// must be no slashes, empty elements, or device names (c:\) in the array
	// (so also no leading and trailing slashes - it does not distinguish
	// relative and absolute paths)
	function normalizeArray(parts, allowAboveRoot) {
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = parts.length - 1; i >= 0; i--) {
	    var last = parts[i];
	    if (last === '.') {
	      parts.splice(i, 1);
	    } else if (last === '..') {
	      parts.splice(i, 1);
	      up++;
	    } else if (up) {
	      parts.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (allowAboveRoot) {
	    for (; up--; up) {
	      parts.unshift('..');
	    }
	  }

	  return parts;
	}

	// Split a filename into [root, dir, basename, ext], unix version
	// 'root' is just a slash, or nothing.
	var splitPathRe =
	    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
	var splitPath = function(filename) {
	  return splitPathRe.exec(filename).slice(1);
	};

	// path.resolve([from ...], to)
	// posix version
	function resolve() {
	  var resolvedPath = '',
	      resolvedAbsolute = false;

	  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
	    var path = (i >= 0) ? arguments[i] : '/';

	    // Skip empty and invalid entries
	    if (typeof path !== 'string') {
	      throw new TypeError('Arguments to path.resolve must be strings');
	    } else if (!path) {
	      continue;
	    }

	    resolvedPath = path + '/' + resolvedPath;
	    resolvedAbsolute = path.charAt(0) === '/';
	  }

	  // At this point the path should be resolved to a full absolute path, but
	  // handle relative paths to be safe (might happen when process.cwd() fails)

	  // Normalize the path
	  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
	    return !!p;
	  }), !resolvedAbsolute).join('/');

	  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
	}
	// path.normalize(path)
	// posix version
	function normalize(path) {
	  var isPathAbsolute = isAbsolute(path),
	      trailingSlash = substr(path, -1) === '/';

	  // Normalize the path
	  path = normalizeArray(filter(path.split('/'), function(p) {
	    return !!p;
	  }), !isPathAbsolute).join('/');

	  if (!path && !isPathAbsolute) {
	    path = '.';
	  }
	  if (path && trailingSlash) {
	    path += '/';
	  }

	  return (isPathAbsolute ? '/' : '') + path;
	}
	// posix version
	function isAbsolute(path) {
	  return path.charAt(0) === '/';
	}

	// posix version
	function join() {
	  var paths = Array.prototype.slice.call(arguments, 0);
	  return normalize(filter(paths, function(p, index) {
	    if (typeof p !== 'string') {
	      throw new TypeError('Arguments to path.join must be strings');
	    }
	    return p;
	  }).join('/'));
	}


	// path.relative(from, to)
	// posix version
	function relative(from, to) {
	  from = resolve(from).substr(1);
	  to = resolve(to).substr(1);

	  function trim(arr) {
	    var start = 0;
	    for (; start < arr.length; start++) {
	      if (arr[start] !== '') break;
	    }

	    var end = arr.length - 1;
	    for (; end >= 0; end--) {
	      if (arr[end] !== '') break;
	    }

	    if (start > end) return [];
	    return arr.slice(start, end - start + 1);
	  }

	  var fromParts = trim(from.split('/'));
	  var toParts = trim(to.split('/'));

	  var length = Math.min(fromParts.length, toParts.length);
	  var samePartsLength = length;
	  for (var i = 0; i < length; i++) {
	    if (fromParts[i] !== toParts[i]) {
	      samePartsLength = i;
	      break;
	    }
	  }

	  var outputParts = [];
	  for (var i = samePartsLength; i < fromParts.length; i++) {
	    outputParts.push('..');
	  }

	  outputParts = outputParts.concat(toParts.slice(samePartsLength));

	  return outputParts.join('/');
	}

	var sep = '/';
	var delimiter = ':';

	function dirname(path) {
	  var result = splitPath(path),
	      root = result[0],
	      dir = result[1];

	  if (!root && !dir) {
	    // No dirname whatsoever
	    return '.';
	  }

	  if (dir) {
	    // It has a dirname, strip trailing slash
	    dir = dir.substr(0, dir.length - 1);
	  }

	  return root + dir;
	}

	function basename(path, ext) {
	  var f = splitPath(path)[2];
	  // TODO: make this comparison case-insensitive on windows?
	  if (ext && f.substr(-1 * ext.length) === ext) {
	    f = f.substr(0, f.length - ext.length);
	  }
	  return f;
	}


	function extname(path) {
	  return splitPath(path)[3];
	}
	var path = {
	  extname: extname,
	  basename: basename,
	  dirname: dirname,
	  sep: sep,
	  delimiter: delimiter,
	  relative: relative,
	  join: join,
	  isAbsolute: isAbsolute,
	  normalize: normalize,
	  resolve: resolve
	};
	function filter (xs, f) {
	    if (xs.filter) return xs.filter(f);
	    var res = [];
	    for (var i = 0; i < xs.length; i++) {
	        if (f(xs[i], i, xs)) res.push(xs[i]);
	    }
	    return res;
	}

	// String.prototype.substr - negative index don't work in IE8
	var substr = 'ab'.substr(-1) === 'b' ?
	    function (str, start, len) { return str.substr(start, len) } :
	    function (str, start, len) {
	        if (start < 0) start = str.length + start;
	        return str.substr(start, len);
	    }
	;

	function getFlowContract(address, signer) {
	    return Flow__factory.connect(address, signer);
	}
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

	class Downloader {
	    node;
	    constructor(node) {
	        this.node = node;
	    }
	    async downloadFileHelper(root, filePath, size, proof) {
	        const segmentOffset = 0;
	        const numChunks = GetSplitNum(size, DEFAULT_CHUNK_SIZE);
	        const numSegments = GetSplitNum(size, DEFAULT_SEGMENT_SIZE);
	        const numTasks = numSegments - segmentOffset;
	        for (let taskInd = 0; taskInd < numTasks; taskInd++) {
	            const segmentIndex = segmentOffset + taskInd;
	            const startIndex = segmentIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
	            var endIndex = startIndex + DEFAULT_SEGMENT_MAX_CHUNKS;
	            if (endIndex > numChunks) {
	                endIndex = numChunks;
	            }
	            var segment = await this.node.downloadSegment(root, startIndex, endIndex);
	            var segArray = decodeBase64(segment);
	            if (segment == null) {
	                return new Error('Failed to download segment');
	            }
	            if (segmentIndex == numSegments - 1) {
	                const lastChunkSize = size % DEFAULT_CHUNK_SIZE;
	                if (lastChunkSize > 0) {
	                    const paddings = DEFAULT_CHUNK_SIZE - lastChunkSize;
	                    segArray = segArray.slice(0, segArray.length - paddings);
	                }
	            }
	            fs.appendFileSync(filePath, segArray);
	        }
	        return null;
	    }
	    async downloadFile(root, filePath, proof) {
	        const info = await this.node.getFileInfo(root);
	        if (info == null) {
	            return new Error('File not found');
	        }
	        if (!info.finalized) {
	            return new Error('File not finalized');
	        }
	        if (checkExist(filePath)) {
	            return new Error('Wrong path, provide a file path which does not exist.');
	        }
	        let err = await this.downloadFileHelper(root, filePath, info.tx.size, proof);
	        return err;
	    }
	}

	class Uploader {
	    node;
	    constructor(node) {
	        this.node = node;
	    }
	    async uploadFile(file, segIndex = 0) {
	        const [tree, err] = await file.merkleTree();
	        if (tree == null || err != null) {
	            return err;
	        }
	        /*
	            todo: check if file is already uploaded
	            1. calculate root hash of file
	            2. get file info by root hash
	            3. check file is finalized
	        */
	        const iter = file.iterateWithOffsetAndBatch(segIndex * DEFAULT_SEGMENT_SIZE, DEFAULT_SEGMENT_SIZE, true);
	        const numChunks = file.numChunks();
	        const fileSize = file.size();
	        while (true) {
	            let [ok, err] = await iter.next();
	            if (err) {
	                return new Error('Failed to read segment');
	            }
	            if (!ok) {
	                break;
	            }
	            let segment = iter.current();
	            const proof = tree.proofAt(segIndex);
	            const startIndex = segIndex * DEFAULT_SEGMENT_MAX_CHUNKS;
	            let allDataUploaded = false;
	            if (startIndex >= numChunks) {
	                break;
	            }
	            else if (startIndex + segment.length / DEFAULT_CHUNK_SIZE >= numChunks) {
	                const expectedLen = DEFAULT_CHUNK_SIZE * (numChunks - startIndex);
	                segment = segment.slice(0, expectedLen);
	                allDataUploaded = true;
	            }
	            const segWithProof = {
	                root: tree.rootHash(),
	                data: encodeBase64(segment),
	                index: segIndex,
	                proof: proof,
	                fileSize,
	            };
	            try {
	                await this.node.uploadSegment(segWithProof); // todo check error
	            }
	            catch (e) {
	                return e;
	            }
	            if (allDataUploaded) {
	                break;
	            }
	            segIndex++;
	        }
	        return null;
	    }
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
	    async getFileInfo(root) {
	        const info = await super.request({
	            method: 'zgs_getFileInfo',
	            params: [root],
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
	}

	class StorageKv extends HttpProvider {
	    constructor(url) {
	        super({ url });
	    }
	    async getValue(streamId, key, startIndex, length, version) {
	        var params = [streamId, key, startIndex, length];
	        if (version !== undefined) {
	            params.push(version);
	        }
	        const res = await super.request({
	            method: 'kv_getValue',
	            params: params,
	        });
	        return res;
	    }
	    async GetNext(streamId, key, startIndex, length, inclusive, version) {
	        var params = [streamId, key, startIndex, length, inclusive];
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
	        var params = [streamId, key, startIndex, length, inclusive];
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
	        var params = [streamId, startIndex, length];
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
	        var params = [streamId, startIndex, length];
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
	            params: [txSeq],
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
	        var params = [account, streamId, key];
	        if (version !== undefined) {
	            params.push(version);
	        }
	        const res = await super.request({
	            method: 'kv_hasWritePermission',
	            params: params,
	        });
	        return res;
	    }
	    async IsAdmin(account, streamId, version) {
	        var params = [account, streamId];
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
	        var params = [stremId, key];
	        if (version !== undefined) {
	            params.push(version);
	        }
	        const res = await super.request({
	            method: 'kv_isSpecialKey',
	            params: params,
	        });
	        return res;
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
	exports.NHProofErrors = void 0;
	(function (NHProofErrors) {
	    NHProofErrors["WRONG_FORMAT"] = "invalid merkle proof format";
	    NHProofErrors["ROOT_MISMATCH"] = "merkle proof root mismatch";
	    NHProofErrors["CONTENT_MISMATCH"] = "merkle proof content mismatch";
	    NHProofErrors["POSITION_MISMATCH"] = "merkle proof position mismatch";
	    NHProofErrors["VALIDATION_FAILURE"] = "failed to validate merkle proof";
	})(exports.NHProofErrors || (exports.NHProofErrors = {}));
	// Proof represents a merkle tree proof of target content, e.g. chunk or segment of file.
	class NeuraProof {
	    // Lemma is made up of 3 parts to keep consistent with 0g-rust:
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
	                return exports.NHProofErrors.WRONG_FORMAT;
	            }
	            return null;
	        }
	        if (numSiblings + 2 !== this.lemma.length) {
	            return exports.NHProofErrors.WRONG_FORMAT;
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
	            return exports.NHProofErrors.CONTENT_MISMATCH;
	        }
	        if (this.lemma.length > 1 && rootHash !== this.lemma[this.lemma.length - 1]) {
	            return exports.NHProofErrors.ROOT_MISMATCH;
	        }
	        const proofPosition = this.calculateProofPosition(numLeafNodes);
	        if (proofPosition !== position) {
	            return exports.NHProofErrors.POSITION_MISMATCH;
	        }
	        if (!this.validateRoot()) {
	            return exports.NHProofErrors.VALIDATION_FAILURE;
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
	class NHMerkleTree {
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
	            return new NeuraProof([this.rootHash()], []);
	        }
	        const proof = new NeuraProof();
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

	class AbstractFile {
	    fileSize = 0;
	    // constructor() {}
	    // split a segment into chunks and compute the root hash
	    static segmentRoot(segment, emptyChunksPadded = 0) {
	        const tree = new NHMerkleTree();
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
	        const tree = new NHMerkleTree();
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
	            nodes: []
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
	        const tree = new NHMerkleTree();
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
	            root: tree.rootHash()
	        };
	        return [node, null];
	    }
	}

	class NHBlob extends AbstractFile {
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
	}

	class NHFile extends AbstractFile {
	    fd = null;
	    fileSize = 0;
	    constructor(fd, fileSize) {
	        super();
	        this.fd = fd;
	        this.fileSize = fileSize;
	    }
	    static async fromNodeFileHandle(fd) {
	        const stat = await fd.stat();
	        return new NHFile(fd, stat.size);
	    }
	    // NOTE: need manually close fd after use
	    static async fromFilePath(path) {
	        const fd = await promises.open(path, 'r'); // if fail, throw error
	        return await NHFile.fromNodeFileHandle(fd);
	    }
	    async close() {
	        await this.fd?.close();
	    }
	    iterateWithOffsetAndBatch(offset, batch, flowPadding) {
	        return new NodeFdIterator(this.fd, this.size(), offset, batch, flowPadding);
	    }
	}

	exports.DEFAULT_CHUNK_SIZE = DEFAULT_CHUNK_SIZE;
	exports.DEFAULT_SEGMENT_MAX_CHUNKS = DEFAULT_SEGMENT_MAX_CHUNKS;
	exports.DEFAULT_SEGMENT_SIZE = DEFAULT_SEGMENT_SIZE;
	exports.Downloader = Downloader;
	exports.EMPTY_CHUNK = EMPTY_CHUNK;
	exports.EMPTY_CHUNK_HASH = EMPTY_CHUNK_HASH;
	exports.Flow__factory = Flow__factory;
	exports.GetSplitNum = GetSplitNum;
	exports.LeafNode = LeafNode;
	exports.NHBlob = NHBlob;
	exports.NHFile = NHFile;
	exports.NHMerkleTree = NHMerkleTree;
	exports.NeuraProof = NeuraProof;
	exports.SMALL_FILE_SIZE_THRESHOLD = SMALL_FILE_SIZE_THRESHOLD;
	exports.StorageKv = StorageKv;
	exports.StorageNode = StorageNode;
	exports.TESTNET_FLOW_ADDRESS = TESTNET_FLOW_ADDRESS;
	exports.Uploader = Uploader;
	exports.ZERO_HASH = ZERO_HASH;
	exports.checkExist = checkExist;
	exports.computePaddedSize = computePaddedSize;
	exports.factories = index;
	exports.getFlowContract = getFlowContract;
	exports.nextPow2 = nextPow2;
	exports.numSplits = numSplits;

}));
