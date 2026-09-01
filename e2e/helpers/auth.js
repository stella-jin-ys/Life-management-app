import { expect } from '@playwright/test'

export function uniqueUser(prefix = 'life') {
  const localPart = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return { email: `${localPart}@example.test`, password: 'correct horse battery staple', name: 'Test Friend' }
}

export async function signUp(page, user) {
  await page.goto('/signup')
  await page.getByLabel('Name').fill(user.name)
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('status')).toContainText(/verification|way/i)
}

export async function getLatestInbucketLink(email, pathFragment) {
  const localPart = email.split('@')[0]
  const response = await fetch(`http://127.0.0.1:54324/api/v1/mailbox/${localPart}`)
  if (!response.ok) return null
  const messages = await response.json()
  const newest = messages.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
  if (!newest) return null
  const detail = await fetch(`http://127.0.0.1:54324/api/v1/mailbox/${localPart}/${newest.id}`).then((result) => result.json())
  return detail.body?.match(new RegExp(`https?://[^\\s<>"']*${pathFragment}[^\\s<>"']*`))?.[0] || null
}
