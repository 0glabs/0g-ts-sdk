const { StorageNode } = require("../lib.commonjs/index.js");

test("Provider", async () => {
    const provider = new StorageNode('http://47.92.4.77:5678');

    const status = await provider.getStatus();
    console.log(status);
});