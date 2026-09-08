import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const ORIGINAL_SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const ORIGINAL_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function loadClientModule(env = {}) {
  if ('VITE_SUPABASE_URL' in env) {
    import.meta.env.VITE_SUPABASE_URL = env.VITE_SUPABASE_URL
  } else {
    delete import.meta.env.VITE_SUPABASE_URL
  }

  if ('VITE_SUPABASE_ANON_KEY' in env) {
    import.meta.env.VITE_SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY
  } else {
    delete import.meta.env.VITE_SUPABASE_ANON_KEY
  }

  vi.resetModules()
  return import('./client.js')
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  if (ORIGINAL_SUPABASE_URL === undefined) {
    delete import.meta.env.VITE_SUPABASE_URL
  } else {
    import.meta.env.VITE_SUPABASE_URL = ORIGINAL_SUPABASE_URL
  }

  if (ORIGINAL_SUPABASE_ANON_KEY === undefined) {
    delete import.meta.env.VITE_SUPABASE_ANON_KEY
  } else {
    import.meta.env.VITE_SUPABASE_ANON_KEY = ORIGINAL_SUPABASE_ANON_KEY
  }
})

describe('getSupabaseConfig', () => {
  test('returns the public Supabase settings', async () => {
    const { getSupabaseConfig } = await loadClientModule({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })

    expect(
      getSupabaseConfig({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'public-anon-key',
      }),
    ).toEqual({
      url: 'http://127.0.0.1:54321',
      anonKey: 'public-anon-key',
    })
  })

  test('rejects incomplete browser configuration', async () => {
    const { getSupabaseConfig } = await loadClientModule({
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })

    expect(() => getSupabaseConfig({})).toThrow('Supabase browser configuration is missing')
  })

  test('normalizes a REST API URL for browser auth', async () => {
    const { getSupabaseConfig } = await loadClientModule({
      VITE_SUPABASE_URL: 'https://example.supabase.co/rest/v1/',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })

    expect(getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://example.supabase.co/rest/v1/',
      VITE_SUPABASE_ANON_KEY: 'public-anon-key',
    })).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'public-anon-key',
    })
  })
})
