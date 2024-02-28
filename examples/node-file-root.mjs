import { NHFile } from '../lib.esm/index.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = join(__dirname, '../tests/README.md');

const nhFile = await NHFile.fromFilePath(file);
console.log('fileSize: ', nhFile.fileSize);
const [tree, err] = await nhFile.merkleTree();
if (err) {
    console.error(err);
}
console.log('Merkle tree root: ', tree.rootHash());
