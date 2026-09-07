import { expect, test } from '@playwright/test'

import { signUp, uniqueUser } from './helpers/auth.js'

test('a signed-out visitor is sent to sign in', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})

test('a user can create an account and sign in', async ({ page }) => {
  const user = uniqueUser('auth')
  await signUp(page, user)
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
})
