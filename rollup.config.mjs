import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'sidepanel/index.js',
    output: {
      dir: 'dist/sidepanel',
      format: 'iife',
    },
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs(),
      copy({
        targets: [
          {
            src: ['manifest.json', 'sidepanel', 'images'],
            dest: 'dist'
          }
        ]
      })
    ]
  },
  {
    input: 'background.js',
    output: {
      file: 'dist/background.js',
      format: 'es',
    },
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs()
    ]
  },
  {
    input: 'contentExtractor.js',
    output: {
      file: 'dist/contentExtractor.js',
      format: 'iife',
      name: 'ContentExtractor'
    },
    plugins: [
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs()
    ]
  }
];
