import { expect, it } from 'vitest'
import { resolveMode } from '../../../src/shell/modes'

it('resolves the rotation mode by hash', () => expect(resolveMode('#/rotation').id).toBe('rotation'))
it('falls back to the first mode for unknown or empty hashes', () => {
  expect(resolveMode('').id).toBe('rotation')
  expect(resolveMode('#/nope').id).toBe('rotation')
})
