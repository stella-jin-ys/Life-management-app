import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  requestPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
}))

vi.mock('./authApi.js', () => authMocks)

import AuthPage from './AuthPage.jsx'
import ResetPasswordPage from './ResetPasswordPage.jsx'

function renderPage(page) {
  return render(<MemoryRouter initialEntries={[page]}>{page === '/reset-password' ? <ResetPasswordPage /> : <AuthPage mode={page.slice(1) || 'login'} />}</MemoryRouter>)
}

describe('authentication forms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.signUp.mockResolvedValue({ error: null })
    authMocks.signIn.mockResolvedValue({ error: null })
    authMocks.requestPasswordReset.mockResolvedValue({ error: null })
    authMocks.updatePassword.mockResolvedValue({ error: null })
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
