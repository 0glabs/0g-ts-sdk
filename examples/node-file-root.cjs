const { ZgFile } = require('../lib.commonjs');
const path = require('path');

const file = path.join(__dirname, '../tests/example.md');

async function main() {
    const zgFile = await ZgFile.fromFilePath(file);
    const [tree, err] = await zgFile.merkleTree();
    if (err) {
        console.error(err);
        return;
    }
    console.log('Merkle tree root: ', tree.rootHash());
}

main().catch(console.error);

