import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

export default {
  input: 'src/extension.ts',
  output: {
    file: 'dist/extension.js',
    format: 'cjs',
    sourcemap: false,
    exports: 'named'
  },
  external: [
    'vscode',
    // Keep Node.js built-ins external
    'fs', 'path', 'os', 'crypto', 'events', 'stream', 'util', 'url', 'http', 'https', 'net', 'tls', 'zlib'
  ],
  plugins: [
    resolve({
      preferBuiltins: true,
      exportConditions: ['node']
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.build.json'
    }),
    json(),
    copy({
      targets: [
        { src: 'package.json', dest: 'dist' },
        { src: 'README.md', dest: 'dist' }
      ]
    })
  ]
};