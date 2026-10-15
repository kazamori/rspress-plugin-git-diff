import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      // The plugin, loaded by Rspress in Node.js.
      format: 'esm',
      syntax: 'es2022',
      dts: { distPath: './dist/types' },
      source: { entry: { index: './src/node/index.ts' }, tsconfigPath: './tsconfig.build.json' },
      output: { target: 'node', distPath: { root: './dist' } },
    },
    {
      // Components and styles, compiled again by the site's Rsbuild.
      format: 'esm',
      syntax: 'es2022',
      bundle: false,
      source: { entry: { index: ['./src/runtime/**/*.{ts,tsx}', '!./src/runtime/**/*.css'] } },
      output: {
        target: 'web',
        distPath: { root: './dist/runtime' },
        copy: [{ from: './src/runtime/style.css', to: 'style.css' }],
      },
      plugins: [pluginReact()],
    },
  ],
});
