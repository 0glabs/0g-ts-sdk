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
npm install 0g-ts-sdk ethers
```

`ethers` is a peer dependency of this project.

## Usage

### Node.js environment ESM example:

Use `NHFile` to create a file object, then call `merkleTree` method to get the merkle tree of the file.

```js
import { NHFile } from '0g-ts-sdk';

const file = await NHFile.fromFilePath('path/to/file');
const [tree, err] = await file.merkleTree();
if (err === null) {
  console.log("File Root Hash: ", tree.rootHash());
}
await file.close();
```

Upload file to 0g-storage:

```js
import { StorageNode, Uploader } from "0g-ts-sdk";
import { ethers } from 'ethers';

const evmRpc = 'https://rpc-testnet.0g.ai';
const provider = new ethers.JsonRpcProvider(evmRpc);
const privateKey = ''; // with balance to pay for gas

const nhRpc = 'https://rpc-storage-testnet.0g.ai';
const node = new StorageNode(nhRpc);
const uploader = new Uploader(node, evmRpc, privateKey);

err = await uploader.uploadFile(file, '0x', 0, {value: ethers.parseEther('0.1'), gasLimit: 1000000});
if (err === null) {
  console.log("File uploaded successfully");
} else {
  console.log("Error uploading file: ", err);
}
```

Download file from 0g-storage

```js
import { Downloader } from "0g-ts-sdk";

const downloader = new Downloader(node)
await downloader.downloadFile(<file_root_hash>, <file_path>, false);
```

### Browser environment example:

Import `zgstorage.esm.js` in your html file:

```html
<script type="module">
  import { Blob, NHProvider, getFlowContract } from "./dist/zgstorage.esm.js";
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
```
