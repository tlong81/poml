import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'sidepanel/index.ts',
    output: {
      dir: 'dist/sidepanel',
      format: 'iife',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['sidepanel/**/*']
      }),
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs(),
      copy({
        targets: [
          {
            src: ['manifest.json', 'sidepanel/*.html', 'sidepanel/*.css', 'images'],
            dest: 'dist'
          }
        ]
      })
    ]
  },
  {
    input: 'background.ts',
    output: {
      file: 'dist/background.js',
      format: 'es',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      }),
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs()
    ]
  },
  {
    input: 'contentExtractor.ts',
    output: {
      file: 'dist/contentExtractor.js',
      format: 'iife',
      name: 'ContentExtractor'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      }),
      nodeResolve({
        jsnext: true,
        main: true,
        browser: true
      }),
      commonjs()
    ]
  }
];
