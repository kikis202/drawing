// @vitest-environment jsdom
import { render, screen } from '@testing-library/preact'
import { afterEach, expect, it, vi } from 'vitest'

vi.mock('../../../src/shell/modes', () => {
  const mode = {
    id: 'broken',
    title: 'Broken',
    load: () => Promise.reject(new Error('chunk failed')),
  }
  return { modes: [mode], resolveMode: () => mode }
})

import { App } from '../../../src/shell/App'

afterEach(() => vi.restoreAllMocks())

it('shows a message when the mode fails to load, without an unhandled rejection', async () => {
  const unhandled = vi.fn()
  process.on('unhandledRejection', unhandled)
  render(<App />)
  expect(await screen.findByText("Couldn't load this mode. Reload to try again.")).toBeTruthy()
  await new Promise((resolve) => setTimeout(resolve, 0))
  process.off('unhandledRejection', unhandled)
  expect(unhandled).not.toHaveBeenCalled()
})
