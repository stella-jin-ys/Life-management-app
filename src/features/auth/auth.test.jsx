import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  signOut: vi.fn(),
}))

const supabaseState = vi.hoisted(() => ({
  client: null,
  configured: true,
}))

vi.mock('./authApi.js', () => authMocks)
vi.mock('../../lib/supabase/client.js', () => ({
  get supabase() {
    return supabaseState.client
  },
  get isSupabaseConfigured() {
    return supabaseState.configured
  },
}))

import AuthPage from './AuthPage.jsx'
import { AuthProvider, useAuth } from './AuthProvider.jsx'
import { ProtectedRoute, PublicOnlyRoute } from './ProtectedRoute.jsx'
import ResetPasswordPage from './ResetPasswordPage.jsx'

function renderPage(page) {
  return render(<MemoryRouter initialEntries={[page]}>{page === '/reset-password' ? <ResetPasswordPage /> : <AuthPage mode={page.slice(1) || 'login'} />}</MemoryRouter>)
}

function createSupabaseClient(session, profiles = [], initialEvent) {
  let profileIndex = 0
  const listener = vi.fn()
  const single = vi.fn(() => Promise.resolve({ data: profiles[profileIndex++] ?? null, error: null }))

  return {
    listener,
    single,
    client: {
      auth: {
        getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
        onAuthStateChange: vi.fn((callback) => {
          listener.mockImplementation(callback)
          if (initialEvent) callback(initialEvent, session)
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single })),
        })),
      })),
    },
  }
}

function AuthSnapshot() {
  const { loading, profile, refreshProfile } = useAuth()
  return (
    <>
      <p role="status">{loading ? 'Loading' : profile?.display_name ?? 'No profile'}</p>
      <button type="button" onClick={() => refreshProfile()}>Refresh profile</button>
    </>
  )
}

function RouteFixture({ initialPath }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route path="/login" element={<p>Auth route</p>} />
            <Route path="/signup" element={<p>Auth route</p>} />
            <Route path="/forgot-password" element={<p>Auth route</p>} />
          </Route>
          <Route element={<PublicOnlyRoute allowPasswordRecovery />}>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>Private route</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('authentication forms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.signUp.mockResolvedValue({ error: null })
    authMocks.signIn.mockResolvedValue({ error: null })
    authMocks.requestPasswordReset.mockResolvedValue({ error: null })
    authMocks.updatePassword.mockResolvedValue({ error: null })
    authMocks.signOut.mockResolvedValue({ error: null })
    supabaseState.configured = true
    supabaseState.client = null
  })

  test('submits signup metadata with the local timezone', async () => {
    renderPage('/signup')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Stella' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'stella@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await waitFor(() => expect(authMocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Stella' })))
    expect(authMocks.signUp.mock.calls[0][0]).toEqual(expect.objectContaining({ timezone: expect.any(String) }))
  })

  test('takes a confirmed signup directly to the dashboard', async () => {
    authMocks.signUp.mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null })
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <Routes>
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/" element={<p>Dashboard</p>} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Stella' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'stella@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  })

  test('shows signup validation details instead of a generic provider error', async () => {
    renderPage('/signup')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Stella' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'stella@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Use at least 12 characters')
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  test('rejects an invalid signup email before calling the provider', async () => {
    renderPage('/signup')
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Stella' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address')
    expect(authMocks.signUp).not.toHaveBeenCalled()
  })

  test('shows a generic sign-in error', async () => {
    authMocks.signIn.mockResolvedValue({ error: new Error('provider detail') })
    renderPage('/login')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'stella@example.test' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct horse battery staple' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not complete that request. Check your details and try again.')
    expect(screen.getByRole('alert')).not.toHaveTextContent('provider detail')
  })

  test('confirms forgot-password requests without revealing account existence', async () => {
    renderPage('/forgot')
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'stella@example.test' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('status')).toHaveTextContent('If an account uses that email, a reset link is on its way.')
  })

  test('updates a password only after local strength validation', async () => {
    renderPage('/reset-password')
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 12 characters')
    expect(authMocks.updatePassword).not.toHaveBeenCalled()
  })
})

describe('authentication session and routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseState.configured = true
  })

  test('restores the session profile and refreshes it after a save', async () => {
    const session = { user: { id: 'user-1', email: 'stella@example.test' } }
    const fake = createSupabaseClient(session, [
      { id: 'user-1', display_name: 'Stella', timezone: 'Europe/Stockholm' },
      { id: 'user-1', display_name: 'Nova', timezone: 'Europe/Stockholm' },
    ])
    supabaseState.client = fake.client

    render(<AuthProvider><AuthSnapshot /></AuthProvider>)

    expect(await screen.findByRole('status')).toHaveTextContent('Stella')
    fireEvent.click(screen.getByRole('button', { name: 'Refresh profile' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Nova')
    expect(fake.single).toHaveBeenCalledTimes(2)
  })

  test.each(['/login', '/signup', '/forgot-password'])(
    'redirects a signed-in user away from %s',
    async (path) => {
      const session = { user: { id: 'user-1', email: 'stella@example.test' } }
      const fake = createSupabaseClient(session, [{ id: 'user-1', display_name: 'Stella', timezone: 'Europe/Stockholm' }])
      supabaseState.client = fake.client

      render(<RouteFixture initialPath={path} />)

      expect(await screen.findByText('Private route')).toBeInTheDocument()
    },
  )

  test('redirects a regular signed-in session away from password reset', async () => {
    const session = { user: { id: 'user-1', email: 'stella@example.test' } }
    const fake = createSupabaseClient(session, [{ id: 'user-1', display_name: 'Stella', timezone: 'Europe/Stockholm' }])
    supabaseState.client = fake.client

    render(<RouteFixture initialPath="/reset-password" />)

    expect(await screen.findByText('Private route')).toBeInTheDocument()
  })

  test('allows a password recovery session to reach the reset form', async () => {
    const session = { user: { id: 'user-1', email: 'stella@example.test' } }
    const fake = createSupabaseClient(
      session,
      [{ id: 'user-1', display_name: 'Stella', timezone: 'Europe/Stockholm' }],
      'PASSWORD_RECOVERY',
    )
    supabaseState.client = fake.client

    render(<RouteFixture initialPath="/reset-password" />)

    expect(await screen.findByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
  })

  test('sends a signed-out user to login and follows the logout session event', async () => {
    const fake = createSupabaseClient(null)
    supabaseState.client = fake.client

    render(<RouteFixture initialPath="/" />)

    expect(await screen.findByText('Auth route')).toBeInTheDocument()
    await act(async () => fake.listener('SIGNED_IN', { user: { id: 'user-1', email: 'stella@example.test' } }))
    expect(await screen.findByText('Private route')).toBeInTheDocument()
    await act(async () => fake.listener('SIGNED_OUT', null))
    expect(await screen.findByText('Auth route')).toBeInTheDocument()
  })
})
