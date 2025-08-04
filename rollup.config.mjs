import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';

export default [
  {
    input: 'src/ui/index.ts',
    output: {
      dir: 'dist/ui',
      format: 'iife',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['ui/**/*']
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
            src: ['src/ui/*.html', 'src/ui/*.css'],
            dest: 'dist/ui'
          }
        ]
      })
    ]
  },
  {
    input: 'src/background/index.ts',
    output: {
      file: 'dist/background.js',
      format: 'es',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['background/**/*']
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
            src: ['manifest.json', 'images'],
            dest: 'dist'
          }
        ]
      })
    ]
  },
  {
    input: 'src/contentScript/index.ts',
    output: {
      file: 'dist/contentScript.js',
      format: 'iife',
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['contentScript/**/*']
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
            src: 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
            dest: 'dist/external'
          }
        ]
      })
    ]
  }
];
