import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SunMedium } from 'lucide-react'

import { updatePassword } from './authApi.js'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState({ busy: false, error: '', note: '' })

  async function submit(event) {
    event.preventDefault()
    if (password.length < 12) {
      setStatus({ busy: false, error: 'Use at least 12 characters for your password.', note: '' })
      return
    }
    setStatus({ busy: true, error: '', note: '' })
    const { error } = await updatePassword(password)
    if (error) {
      setStatus({ busy: false, error: 'We could not update your password. Request a new link and try again.', note: '' })
      return
    }
    setStatus({ busy: false, error: '', note: 'Your password is updated.' })
    setTimeout(() => navigate('/'), 600)
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="reset-title">
        <div className="auth-brand">
          <span className="auth-mark" aria-hidden="true"><SunMedium size={28} strokeWidth={1.7} /></span>
          <span className="auth-brand-copy"><strong>Life management</strong><small>A little room for what matters</small></span>
        </div>
        <p className="eyebrow auth-eyebrow">Password reset</p>
        <h1 id="reset-title">Choose a new password</h1>
        <p className="auth-note">A fresh start can be a very small thing.</p>
        <form onSubmit={submit}>
          <label>New password<input aria-label="New password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
          {status.error && <p className="form-error" role="alert">{status.error}</p>}
          {status.note && <p className="form-note" role="status">{status.note}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={status.busy}>{status.busy ? 'Saving…' : 'Update password'}</button>
        </form>
        <Link className="auth-secondary-link" to="/login">Return to sign in</Link>
      </section>
    </main>
  )
}
