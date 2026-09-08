import { expect, test } from '@playwright/test'

import { signUp, uniqueUser } from './helpers/auth.js'

test('each account starts with its own empty highlight feed', async ({ browser }) => {
  const first = uniqueUser('one')
  const second = uniqueUser('two')
  const firstPage = await browser.newPage()
  const secondPage = await browser.newPage()

  await signUp(firstPage, first)
  await firstPage.goto('/login')
  await firstPage.getByLabel('Email').fill(first.email)
  await firstPage.getByLabel('Password').fill(first.password)
  await firstPage.getByRole('button', { name: 'Sign in' }).click()
  await expect(firstPage.getByRole('heading', { name: /Good morning/ })).toBeVisible()
  await firstPage.getByLabel('Quick highlight').fill('Private account note')
  await firstPage.getByRole('button', { name: 'Save quick highlight' }).click()

  await signUp(secondPage, second)
  await secondPage.goto('/login')
  await secondPage.getByLabel('Email').fill(second.email)
  await secondPage.getByLabel('Password').fill(second.password)
  await secondPage.getByRole('button', { name: 'Sign in' }).click()
  await expect(secondPage.getByRole('heading', { name: /Good morning/ })).toBeVisible()
  await expect(secondPage.getByLabel('Quick highlight')).toHaveValue('')

  await firstPage.close()
  await secondPage.close()
})
