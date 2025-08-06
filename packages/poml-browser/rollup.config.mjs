import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import replace from '@rollup/plugin-replace';
import postcss from 'rollup-plugin-postcss';

export default [
  {
    input: 'ui/index.ts',
    output: {
      dir: 'dist/ui',
      format: 'iife',
    },
    onwarn(warning, warn) {
      // https://github.com/TanStack/query/issues/5175
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
        return
      }
      warn(warning)
    },
    plugins: [
      replace({
        // https://stackoverflow.com/questions/70368760/react-uncaught-referenceerror-process-is-not-defined
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
      }),
      postcss({
        extract: true,
        minimize: true
      }),
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
            src: ['ui/*.html', 'ui/custom.css'],
            dest: 'dist/ui'
          }
        ]
      })
    ]
  },
  {
    input: 'background/index.ts',
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
    input: 'contentScript/index.ts',
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
