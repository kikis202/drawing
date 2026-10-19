import type { ComponentType } from 'preact'
import { createContext } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { modes, resolveMode } from './modes'

/** The element in the app header where a mode can portal its own buttons. Null until mounted. */
export const HeaderActionsContext = createContext<HTMLElement | null>(null)

export function App() {
  const [hash, setHash] = useState(window.location.hash)
  const [headerActions, setHeaderActions] = useState<HTMLElement | null>(null)
  const [loaded, setLoaded] = useState<{ id: string; Mode: ComponentType } | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)
  const mode = resolveMode(hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    let current = true
    setFailedId(null)
    mode
      .load()
      .then((module) => {
        if (current) setLoaded({ id: mode.id, Mode: module.default })
      })
      .catch(() => {
        if (current) setFailedId(mode.id)
      })
    return () => {
      current = false
    }
  }, [mode])

  const Mode = loaded?.id === mode.id ? loaded.Mode : null

  return (
    <HeaderActionsContext.Provider value={headerActions}>
      <header role="banner" class="app-header">
        <span class="app-name">Turnaround</span>
        {modes.length > 1 && (
          <nav aria-label="Practice modes">
            {modes.map((m) => (
              <a href={`#/${m.id}`} aria-current={m.id === mode.id ? 'page' : undefined}>
                {m.title}
              </a>
            ))}
          </nav>
        )}
        <div class="header-actions" ref={setHeaderActions} />
      </header>
      <main class="app-main">
        {failedId === mode.id ? <p role="alert">Couldn't load this mode. Reload to try again.</p> : Mode && <Mode />}
      </main>
    </HeaderActionsContext.Provider>
  )
}
