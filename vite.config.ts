/// <reference types="vitest/config" />
import preact from '@preact/preset-vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/drawing/',
  plugins: [preact()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.{ts,tsx}'],
  },
})
