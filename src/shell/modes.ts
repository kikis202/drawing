import type { ComponentType } from 'preact'

export interface PracticeMode {
  id: string
  title: string
  load: () => Promise<{ default: ComponentType }>
}

export const modes: PracticeMode[] = [
  {
    id: 'rotation',
    title: 'Rotation study',
    load: () => import('../modes/rotation'),
  },
]

/** Maps a location hash such as `#/rotation` to a mode; unknown or empty hashes give the first mode. */
export function resolveMode(hash: string): PracticeMode {
  const id = hash.replace(/^#\/?/, '')
  return modes.find((mode) => mode.id === id) ?? modes[0]
}
