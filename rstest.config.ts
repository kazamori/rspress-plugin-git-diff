import { defineConfig } from '@rstest/core';

export default defineConfig({
  projects: [
    {
      name: 'node',
      include: ['tests/**/*.test.ts'],
      exclude: ['tests/**/*.dom.test.ts'],
      testEnvironment: 'node',
    },
    {
      // Marking changes on a rendered page needs a DOM.
      name: 'dom',
      include: ['tests/**/*.dom.test.ts'],
      testEnvironment: 'happy-dom',
    },
  ],
});
