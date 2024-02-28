# zerog-ts-sdk

This is the JavaScript SDK for zerog-storage. Features include:

- [x] File Merkle Tree Class
- [x] Flow Contract Types
- [x] RPC methods support
- [x] File upload
- [x] Support browser environment
- [ ] Tests for different environments
- [ ] File download

## Install

```sh
npm install zerog-da-sdk ethers
```

`ethers` is a peer dependency of this project.

## Usage

### Node.js environment ESM example:

Use `NHFile` to create a file object, then call `merkleTree` method to get the merkle tree of the file.

```js
import { NHFile } from 'zerog-da-sdk';

const file = await NHFile.fromFilePath('path/to/file');
const [tree, err] = await file.merkleTree();
if (err === null) {
  console.log("File Root Hash: ", tree.rootHash());
}
await file.close();
```

Create and submit submission:

```js
import { getFlowContract, TESTNET_FLOW_ADDRESS } from 'zerog-da-sdk';
import { ethers } from 'ethers';

// create ethers signer from private key and rpc endpoint
const evmRpc = 'https://evmtestnet.confluxrpc.com';
const provider = new ethers.JsonRpcProvider(evmRpc);
const privateKey = 'your-private-key'; // with balance to pay for gas
const signer = new ethers.Wallet(privateKey, provider);

// get flow contract instance
const flowContract = getFlowContract(TESTNET_FLOW_ADDRESS, signer);

const tagBytes = '0x';
const [submission, err] = await file.createSubmission(tagBytes); // check previous example for file
if (err != null) {
    console.log('create submission error: ', err);
    return;
}
let tx = await flowContract.submit(submission);
await tx.wait();
console.log(tx.hash);
```

Upload file to zerog-storage:

```js
import { NHProvider } from 'zerog-da-sdk';

const nhRpc = 'http://54.193.124.127:5678';
const nhProvider = new NHProvider(nhRpc);

await nhProvider.uploadFile(file);
```

### Browser environment example:

Import `zerogda.esm.js` in your html file:

```html
<script type="module">
  import { NHBlob, NHProvider, getFlowContract } from "./dist/zerogda.esm.js";
  // Your code here...
</script>
```

Create file object from blob:

```js
const file = new NHBlob(blob);
const [tree, err] = await file.merkleTree();
if (err === null) {
  console.log("File Root Hash: ", tree.rootHash());
}
```

Create and submit submission:

```js
// create ethers signer from private key and rpc endpoint
import { BrowserProvider } from 'ethers';  // or from ethers.js url
import { getFlowContract, TESTNET_FLOW_ADDRESS } from 'zerog-da-sdk';
let provider = new BrowserProvider(window.ethereum) // metamask need to be installed
let signer = await provider.getSigner();

// get flow contract instance
const flowContract = getFlowContract(TESTNET_FLOW_ADDRESS, signer);

const tagBytes = '0x';
const [submission, err] = await file.createSubmission(tagBytes); // check previous example for file
if (err != null) {
    console.log('create submission error: ', err);
    return;
}
let tx = await flowContract.submit(submission);
await tx.wait();
console.log(tx.hash);
```

File upload is same with node.js environment.

Check codes in [examples](./examples) for more details.

## Contribute

This project uses [pnpm](https://pnpm.js.org/) as package manager. After cloning the project, run `pnpm install` to install dependencies.

### Generate Contract Flow Types

Make sure [zerog-contracts](https://github.com/zero-gravity-labs/zerog-storage-contracts) is in project sibling directory.

```sh
pnpm gen-contract-type-flow
```