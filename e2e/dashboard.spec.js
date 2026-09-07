import { expect, test } from '@playwright/test'

import { signUp, uniqueUser } from './helpers/auth.js'

test('a signed-in user can save a highlight and a mood', async ({ page }) => {
  const user = uniqueUser('dashboard')
  await signUp(page, user)
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible()

  await page.getByRole('button', { name: 'Tender' }).click()
  await page.getByRole('button', { name: 'Add a highlight' }).click()
  await page.getByLabel('What felt good or moved forward?').fill('I took a real lunch break.')
  await page.getByRole('button', { name: 'Save highlight' }).click()
  await expect(page.getByRole('heading', { name: 'I took a real lunch break.' })).toBeVisible()
})
