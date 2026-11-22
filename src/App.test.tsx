// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

// En jsdom no hay animaciones reales y las salidas de AnimatePresence no terminan:
// en las pruebas se muestra el contenido sin esa transición (en el navegador sí funciona).
vi.mock('motion/react', async (original) => ({
  ...(await original<typeof import('motion/react')>()),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

type User = ReturnType<typeof userEvent.setup>

beforeEach(() => {
  localStorage.clear()
  window.history.pushState({}, '', '/')
})
afterEach(cleanup)

const option = (label: string) => document.querySelector<HTMLButtonElement>(`[data-option="${label}"]`)
const root = () => document.querySelector<HTMLElement>('.fa')!

const pick = async (user: User, label: string) => {
  await waitFor(() => expect(option(label), `opción ${label}`).toBeTruthy())
  await user.click(option(label)!)
}

const start = async (user: User) => {
  await user.click(screen.getByRole('button', { name: 'Identificar cangrejos' }))
  await user.click(screen.getByRole('button', { name: 'Empezar la clave' }))
}

const toggleTheme = (user: User) => user.click(screen.getByRole('switch', { name: 'Tema oscuro' }))

describe('recorrido de la clave', () => {
  it('la pantalla principal lleva al sistema con "Identificar cangrejos"', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Identificador de Especies' })).toBeTruthy()
    expect(screen.queryByText('Identifica tu cangrejo')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Identificar cangrejos' }))
    expect(screen.getByText('Identifica tu cangrejo')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Empezar la clave' }))
    await waitFor(() => expect(option('1a')).toBeTruthy())
    expect(option('1b')).toBeTruthy()
  })

  it('el título del proyecto es un botón que vuelve a la pantalla principal', async () => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)
    await user.click(screen.getByRole('button', { name: 'Identificador de Especies' }))
    expect(screen.getByRole('button', { name: 'Identificar cangrejos' })).toBeTruthy()
  })

  it('recorre la clave hasta una especie con ficha y vuelve con el árbol', async () => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)

    for (const l of ['1b', '2a', '3b', '5b']) await pick(user, l)
    expect(screen.getByRole('navigation', { name: 'Clasificación' })).toBeTruthy()
    expect(screen.getAllByText('Calappidae').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /Continuar con la clave/ }))
    for (const l of ['1b', '2b', '3b', '5a', '6b']) await pick(user, l)
    expect(screen.getAllByText('Hepatus lineatus').length).toBeGreaterThan(0)
    expect(screen.getByText('Caracteres distintivos')).toBeTruthy()

    // el árbol permite volver al primer paso: la primera rama elegida
    await user.click(document.querySelector<HTMLButtonElement>('button[aria-label^="Volver al paso"]')!)
    await waitFor(() => expect(option('1a')).toBeTruthy())
    expect(document.querySelectorAll('[data-past]')).toHaveLength(0)
  })

  it('una rama descartada permite cambiar de camino', async () => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)
    await pick(user, '1b')
    await user.click(screen.getByRole('button', { name: 'Cambiar a la rama 1a' }))
    expect(screen.getAllByText('Raninidae').length).toBeGreaterThan(0)
  })

  it('una familia sin clave propia lista sus especies', async () => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)
    for (const l of ['1b', '2b', '6b', '9b', '19a']) await pick(user, l)
    expect(screen.getByText(/Especies registradas en la guía/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Continuar con la clave/ })).toBeNull()
  })

  it('"Empezar de nuevo" regresa al inicio', async () => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)
    await pick(user, '1a')
    await user.click(screen.getAllByRole('button', { name: 'Empezar de nuevo' })[0])
    expect(screen.getByText('Identifica tu cangrejo')).toBeTruthy()
  })
})

describe('tema claro y oscuro', () => {
  it('el interruptor cambia entre claro y oscuro y recuerda la elección', async () => {
    const user = userEvent.setup()
    render(<App />)
    const sw = () => screen.getByRole('switch', { name: 'Tema oscuro' })
    expect(root().dataset.mode).toBe('light')
    expect(sw().getAttribute('aria-checked')).toBe('false')
    await toggleTheme(user)
    expect(root().dataset.mode).toBe('dark')
    expect(sw().getAttribute('aria-checked')).toBe('true')
    expect(localStorage.getItem('identificador:modo')).toBe('dark')
    cleanup()
    render(<App />)
    expect(root().dataset.mode).toBe('dark')
    await toggleTheme(user)
    expect(root().dataset.mode).toBe('light')
  })

  it('el interruptor también está dentro del sistema y no reinicia el punto de la clave', async () => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)
    await pick(user, '1b')
    await toggleTheme(user)
    expect(root().dataset.mode).toBe('dark')
    await waitFor(() => expect(option('2a')).toBeTruthy())
  })
})

describe('criterio de aceptación: identificar 5 especies conocidas usando solo la interfaz', () => {
  // Rutas de la clave impresa; "→" es el botón "Continuar con la clave".
  const species: [string, string[]][] = [
    ['Hepatus lineatus', ['1b', '2a', '3b', '5b', '→', '1b', '2b', '3b', '5a', '6b']],
    ['Calappa saussurei', ['1b', '2a', '3b', '5b', '→', '1b', '2b', '3a', '4b']],
    ['Callinectes toxotes', ['1b', '2b', '6b', '9a', '10b', '11a', '12a', '→', '1b', '3b', '4b', '5b', '6b', '7b', '8b']],
    ['Gecarcinus planatus', ['1b', '2b', '6b', '9a', '10b', '11b', '16b', '17a', '18b', '→', '1b', '2b', '3a']],
    ['Cancer antennarius', ['1b', '2b', '6b', '9a', '10b', '11a', '12b', '13a', '14b', '→', '1b', '2b']],
  ]
  it.each(species)('%s', async (name, path) => {
    const user = userEvent.setup()
    render(<App />)
    await start(user)
    for (const step of path) {
      if (step === '→') await user.click(screen.getByRole('button', { name: /Continuar con la clave/ }))
      else await pick(user, step)
    }
    expect(screen.getByRole('heading', { level: 2, name })).toBeTruthy()
    expect(screen.getByText('Caracteres distintivos')).toBeTruthy()
  })
})
