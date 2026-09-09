import { afterEach, describe, expect, test, vi } from 'vitest'

const supabaseState = vi.hoisted(() => ({ client: null }))

vi.mock('../../lib/supabase/client.js', () => ({
  get supabase() {
    return supabaseState.client
  },
}))

import { signUp, updateProfile } from './authApi.js'

function createSupabaseClient(result) {
  const request = {}
  const single = vi.fn(() => Promise.resolve(result))
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn((column, value) => {
    request.filter = [column, value]
    return { select }
  })
  const update = vi.fn((payload) => {
    request.payload = payload
    return { eq }
  })

  return {
    request,
    client: { from: vi.fn(() => ({ update })) },
  }
}

afterEach(() => {
  supabaseState.client = null
})

describe('updateProfile', () => {
  test('normalizes profile fields, scopes the update, and returns the saved row', async () => {
    const savedProfile = { id: 'user-1', display_name: 'Nova', timezone: 'Europe/Stockholm' }
    const fake = createSupabaseClient({ data: savedProfile, error: null })
    supabaseState.client = fake.client

    await expect(updateProfile('user-1', {
      displayName: '  Nova  ',
      timezone: 'Europe/Stockholm',
    })).resolves.toEqual(savedProfile)

    expect(fake.request).toEqual({
      payload: { display_name: 'Nova', timezone: 'Europe/Stockholm' },
      filter: ['id', 'user-1'],
    })
  })

  test('rejects empty names and unknown timezones before issuing an update', async () => {
    const fake = createSupabaseClient({ data: null, error: null })
    supabaseState.client = fake.client

    await expect(updateProfile('user-1', { displayName: ' ', timezone: 'Europe/Stockholm' }))
      .rejects.toThrow('Please add a display name.')
    await expect(updateProfile('user-1', { displayName: 'Nova', timezone: 'Not/A-timezone' }))
      .rejects.toThrow('Choose a valid IANA timezone.')
    await expect(updateProfile('user-1', { displayName: 'Nova', timezone: undefined }))
      .rejects.toThrow('Choose a valid IANA timezone.')
    expect(fake.client.from).not.toHaveBeenCalled()
  })
})

describe('signUp', () => {
  test('sends confirmation links back to the deployed app', async () => {
    const request = vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }))
    supabaseState.client = { auth: { signUp: request } }

    await signUp({
      email: 'stella@example.test',
      password: 'correct horse battery staple',
      displayName: 'Stella',
      timezone: 'Europe/Stockholm',
    })

    expect(request).toHaveBeenCalledWith(expect.objectContaining({
      email: 'stella@example.test',
      options: expect.objectContaining({
        emailRedirectTo: expect.stringMatching(/\/$/),
      }),
    }))
  })
})
