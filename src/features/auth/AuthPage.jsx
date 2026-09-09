import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SunMedium } from 'lucide-react'

import { requestPasswordReset, signIn, signUp } from './authApi.js'

const messages = {
  login: { title: 'Welcome back', submit: 'Sign in', prompt: 'New here?', link: 'Create an account' },
  signup: { title: 'Make a little room', submit: 'Create account', prompt: 'Already have an account?', link: 'Sign in' },
}

function validationError(message) {
  const error = new Error(message)
  error.name = 'ValidationError'
  return error
}

export default function AuthPage({ mode = 'login' }) {
  const navigate = useNavigate()
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [status, setStatus] = useState({ busy: false, error: '', note: '' })
  const isForgot = mode === 'forgot'
  const copy = messages[mode] ?? messages.login

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setStatus({ busy: true, error: '', note: '' })
    try {
      if (isForgot) {
        const { error } = await requestPasswordReset(values.email.trim())
        if (error) throw error
        setStatus({ busy: false, error: '', note: 'If an account uses that email, a reset link is on its way.' })
        return
      }
      if (mode === 'signup') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
          throw validationError('Enter a valid email address.')
        }
        if (values.name.trim().length < 1) throw validationError('Please add your name.')
        if (values.name.trim().length > 80) throw validationError('Names can be up to 80 characters.')
        if (values.password.length < 12) throw validationError('Use at least 12 characters for your password.')
        const { data, error } = await signUp({
          email: values.email.trim(),
          password: values.password,
          displayName: values.name.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        })
        if (error) throw error
        if (data?.session) {
          navigate('/')
          return
        }
        setStatus({ busy: false, error: '', note: 'Check your email to verify your account, then come back to sign in.' })
        return
      }
      const { error } = await signIn({ email: values.email.trim(), password: values.password })
      if (error) throw error
      navigate('/')
    } catch (error) {
      setStatus({
        busy: false,
        error: error?.name === 'ValidationError'
          ? error.message
          : 'We could not complete that request. Check your details and try again.',
        note: '',
      })
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true"><SunMedium size={28} strokeWidth={1.7} /></span>
          <span className="auth-brand-copy"><strong>Life management</strong><small>A little room for what matters</small></span>
        </div>
        <p className="eyebrow auth-eyebrow">{isForgot ? 'Password reset' : mode === 'signup' ? 'Start gently' : 'Sign in'}</p>
        <h1 id="auth-title">{isForgot ? 'Find your way back' : copy.title}</h1>
        <p className="auth-note">
          {isForgot ? 'We will send a quiet little link to reset your password.' : 'A private place to notice what is helping.'}
        </p>
        <form onSubmit={submit} noValidate>
          {mode === 'signup' && <label>Name<input aria-label="Name" value={values.name} onChange={(event) => update('name', event.target.value)} autoComplete="name" required /></label>}
          <label>Email<input aria-label="Email" type="email" value={values.email} onChange={(event) => update('email', event.target.value)} autoComplete="email" required /></label>
          {!isForgot && <label>Password<input aria-label="Password" type="password" value={values.password} onChange={(event) => update('password', event.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required /></label>}
          {status.error && <p className="form-error" role="alert">{status.error}</p>}
          {status.note && <p className="form-note" role="status">{status.note}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={status.busy}>
            {status.busy ? 'Saving…' : isForgot ? 'Send reset link' : copy.submit}
          </button>
        </form>
        {!isForgot && <p className="auth-switch">{copy.prompt} <Link to={mode === 'login' ? '/signup' : '/login'}>{copy.link}</Link></p>}
        {mode === 'login' && <Link className="auth-secondary-link" to="/forgot-password">Forgot your password?</Link>}
        {isForgot && <Link className="auth-secondary-link" to="/login">Return to sign in</Link>}
      </section>
    </main>
  )
}
