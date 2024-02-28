const { NHFile } = require('../lib.commonjs');
const path = require('path');

const file = path.join(__dirname, '../tests/example.md');

async function main() {
    const nhFile = await NHFile.fromFilePath(file);
    const [tree, err] = await nhFile.merkleTree();
    if (err) {
        console.error(err);
        return;
    }
    console.log('Merkle tree root: ', tree.rootHash());
}

main().catch(console.error);

