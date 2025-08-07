import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import replace from '@rollup/plugin-replace';
import postcss from 'rollup-plugin-postcss';
import alias from '@rollup/plugin-alias';
import json from '@rollup/plugin-json';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const aliasEntries = [
  { find: '@functions', replacement: path.resolve(__dirname, 'functions') },
  { find: '@ui', replacement: path.resolve(__dirname, 'ui') },
  { find: '@background', replacement: path.resolve(__dirname, 'background') },
  { find: '@contentScript', replacement: path.resolve(__dirname, 'contentScript') },
  { find: 'poml', replacement: path.resolve(__dirname, '../poml') },
];

export default [
  {
    input: 'ui/index.ts',
    output: {
      dir: 'dist/ui',
      format: 'iife',
      sourcemap: true
    },
    watch: {
      include: 'ui/**',
      exclude: 'node_modules/**'
    },
    onwarn(warning, warn) {
      // https://github.com/TanStack/query/issues/5175
      if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
        return;
      }
      warn(warning);
    },
    external: ['sharp'],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['poml-browser/ui/**/*', 'poml-browser/functions/**/*', 'poml/**/*'],
        exclude: ['poml/node_modules/**/*', 'poml/tests/**/*']
      }),
      alias({
        entries: aliasEntries
      }),
      json(),
      replace({
        // https://stackoverflow.com/questions/70368760/react-uncaught-referenceerror-process-is-not-defined
        'process.env.NODE_ENV': JSON.stringify('production'),
        preventAssignment: true
      }),
      postcss({
        extract: true,
        minimize: true
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
      sourcemap: true
    },
    watch: {
      include: 'background/**',
      exclude: 'node_modules/**'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['poml-browser/background/**/*', 'poml-browser/functions/**/*']
      }),
      alias({
        entries: aliasEntries
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
      sourcemap: true
    },
    watch: {
      include: 'contentScript/**',
      exclude: 'node_modules/**'
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        include: ['poml-browser/contentScript/**/*', 'poml-browser/functions/**/*']
      }),
      alias({
        entries: aliasEntries
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
