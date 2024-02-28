import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import nodePolyfills from 'rollup-plugin-polyfill-node';

/**
 * @type {import('rollup').RollupOptions}
 */
export default [
    {
        input: 'lib.esm/index.js',
        output: {
            file: 'dist/neurahive.esm.js',
            format: 'esm'
        },
        treeshake: true,
        plugins: [nodeResolve({
            mainFields: [ "browser", "module", "main" ],
            browser: true
        }), commonjs()],
    }, 
    {
        input: 'lib.esm/index.js',
        output: {
            file: 'dist/neurahive.umd.js',
            format: 'umd',
            name: 'neurahive'
        },
        treeshake: true,
        plugins: [
            nodeResolve({
                mainFields: [ "browser", "module", "main" ],
                browser: true
            }), 
            commonjs(), 
            nodePolyfills({
                include: ['events']
            })
        ],
    }
];