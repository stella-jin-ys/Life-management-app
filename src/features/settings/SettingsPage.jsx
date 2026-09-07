import { useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthProvider.jsx'
import { updateProfile, validateProfile } from '../auth/authApi.js'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [values, setValues] = useState({ displayName: profile?.display_name ?? '', timezone: profile?.timezone ?? 'UTC' })
  const [status, setStatus] = useState({ busy: false, error: '', note: '' })

  useEffect(() => {
    setValues({ displayName: profile?.display_name ?? '', timezone: profile?.timezone ?? 'UTC' })
  }, [profile])

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()

    let nextValues
    try {
      nextValues = validateProfile(values)
    } catch (error) {
      setStatus({ busy: false, error: error.message, note: '' })
      return
    }

    setStatus({ busy: true, error: '', note: '' })
    try {
      await updateProfile(user?.id, nextValues)
      await refreshProfile()
      setValues(nextValues)
      setStatus({ busy: false, error: '', note: 'Your settings are saved.' })
    } catch {
      setStatus({ busy: false, error: 'We could not save your settings. Please try again.', note: '' })
    }
  }

  return (
    <section className="settings-page panel" aria-labelledby="settings-title">
      <div className="settings-heading">
        <p className="eyebrow">Your space</p>
        <h1 id="settings-title">Settings</h1>
        <p>Keep the details that make your daily view feel like yours.</p>
      </div>
      <form className="settings-form" onSubmit={submit} noValidate>
        <label>
          Display name
          <input aria-label="Display name" value={values.displayName} onChange={(event) => update('displayName', event.target.value)} autoComplete="name" required />
        </label>
        <label>
          Timezone
          <input aria-label="Timezone" value={values.timezone} onChange={(event) => update('timezone', event.target.value)} autoComplete="off" required />
          <small>Use an IANA timezone, such as Europe/Stockholm.</small>
        </label>
        {status.error && <p className="form-error" role="alert">{status.error}</p>}
        {status.note && <p className="form-note" role="status">{status.note}</p>}
        <button className="primary-button" type="submit" disabled={status.busy || !user}>
          {status.busy ? 'Saving…' : 'Save settings'}
        </button>
      </form>
    </section>
  )
}
