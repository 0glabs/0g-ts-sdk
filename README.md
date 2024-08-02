# 0g-ts-sdk

This is the JavaScript SDK for 0g-storage. Features include:

- [x] File Merkle Tree Class
- [x] Flow Contract Types
- [x] RPC methods support
- [x] File upload
- [x] Support browser environment
- [ ] Tests for different environments
- [x] File download

## Install

```sh
npm install @0glabs/0g-ts-sdk ethers
```

`ethers` is a peer dependency of this project.

## Usage

### Node.js environment ESM example:

Use `ZgFile` to create a file object, then call `merkleTree` method to get the merkle tree of the file.

```js
import { Indexer, ZgFile }  from '@0glabs/0g-ts-sdk';
import { ethers } from 'ethers';
import { exit } from 'process';

const file = await ZgFile.fromFilePath(<file_path>);
var [tree, err] = await file.merkleTree();
if (err === null) {
  console.log("File Root Hash: ", tree.rootHash());
} else {
  exit(1);
}
await file.close();
```

Upload file to 0g-storage:

```js
const evmRpc = 'https://rpc-testnet.0g.ai';
const privateKey = ''; // with balance to pay for gas

const indRpc = ''; // indexer rpc

const indexer = new Indexer(indRpc, evmRpc, privateKey, "0xB7e39604f47c0e4a6Ad092a281c1A8429c2440d3");
// need to pay fees to store data in storage nodes
var [tx, err] = await indexer.upload(file, 0);
if (err === null) {
  console.log("File uploaded successfully, tx: ", tx);
} else {
  console.log("Error uploading file: ", err);
}
```

Download file from 0g-storage

```js
err = await indexer.download(<root_hash>, <output_file>, <with_proof>);
if (err !== null) {
  console.log("Error downloading file: ", err);
}
```

### Browser environment example:

Import `zgstorage.esm.js` in your html file:

```html
<script type="module">
  import { Blob, Indexer } from "./dist/zgstorage.esm.js";
  // Your code here...
</script>
```

Create file object from blob:

```js
const file = new Blob(blob);
const [tree, err] = await file.merkleTree();
if (err === null) {
  console.log("File Root Hash: ", tree.rootHash());
}
```

File upload is same with node.js environment with the following provider change

```js
import { BrowserProvider } from 'ethers';  // or from ethers.js url

let provider = new BrowserProvider(window.ethereum) // metamask need to be installed
```

Check codes in [examples](./examples) for more details.

## Contribute

This project uses [pnpm](https://pnpm.js.org/) as package manager. After cloning the project, run `pnpm install` to install dependencies.

### Generate Contract Flow Types

Make sure [0g-storage-contracts](https://github.com/0glabs/0g-storage-contracts) is in project sibling directory.

```sh
pnpm gen-contract-type-flow
pnpm gen-contract-type-market
```
