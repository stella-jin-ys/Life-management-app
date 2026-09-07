import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const settingsMocks = vi.hoisted(() => ({
  updateProfile: vi.fn(),
  refreshProfile: vi.fn(),
  auth: {
    user: { id: 'user-1', email: 'stella@example.test' },
    profile: { id: 'user-1', display_name: 'Stella', timezone: 'Europe/Stockholm' },
    refreshProfile: null,
  },
}))

settingsMocks.auth.refreshProfile = settingsMocks.refreshProfile

vi.mock('../auth/AuthProvider.jsx', () => ({
  useAuth: () => settingsMocks.auth,
}))
vi.mock('../auth/authApi.js', async (importOriginal) => ({
  ...await importOriginal(),
  updateProfile: settingsMocks.updateProfile,
}))

import SettingsPage from './SettingsPage.jsx'

describe('profile settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    settingsMocks.updateProfile.mockResolvedValue({
      id: 'user-1', display_name: 'Nova', timezone: 'Europe/Stockholm',
    })
    settingsMocks.refreshProfile.mockResolvedValue({
      id: 'user-1', display_name: 'Nova', timezone: 'Europe/Stockholm',
    })
  })

  test('keeps an empty display name from reaching the profile API', () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Please add a display name.')
    expect(settingsMocks.updateProfile).not.toHaveBeenCalled()
  })

  test('rejects an invalid IANA timezone before saving', () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('Timezone'), { target: { value: 'Not/A-timezone' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Choose a valid IANA timezone.')
    expect(settingsMocks.updateProfile).not.toHaveBeenCalled()
  })

  test('trims the display name, saves it, and reports success', async () => {
    render(<SettingsPage />)
    fireEvent.change(screen.getByLabelText('Display name'), { target: { value: '  Nova  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(() => expect(settingsMocks.updateProfile).toHaveBeenCalledWith('user-1', {
      displayName: 'Nova',
      timezone: 'Europe/Stockholm',
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('Your settings are saved.')
    expect(settingsMocks.refreshProfile).toHaveBeenCalledTimes(1)
  })
})
