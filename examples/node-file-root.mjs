import { ZgFile } from '../lib.esm/index.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '../tests/README.md');

const zgFile = await ZgFile.fromFilePath(file);
console.log('fileSize: ', zgFile.fileSize);
const [tree, err] = await zgFile.merkleTree();
if (err) {
    console.error(err);
}
console.log('Merkle tree root: ', tree.rootHash());
