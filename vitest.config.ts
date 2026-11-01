import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    reporters: ['default'],
    coverage: {
      reporter: ['text', 'html'],
      include: [
        'src/lib/quiz/quiz-stats.ts',
        'src/lib/quiz/quiz-validator.ts',
        'src/lib/quiz/quiz-grader.ts',
        'src/lib/quiz/quiz-engine.ts',
        'src/lib/documents/text-normalizer.ts',
        'src/lib/security/file-validation.ts',
      ],
    },
  },
})
