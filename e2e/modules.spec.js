import { expect, test } from '@playwright/test'

import { signUp, uniqueUser } from './helpers/auth.js'

async function signedInPage(page) {
  const user = uniqueUser('modules')
  await signUp(page, user)
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: /Good morning/ })).toBeVisible()
}

async function visit(page, destination) {
  await page.getByRole('button', { name: destination }).first().click()
  await expect(page.getByRole('heading', { name: destination })).toBeVisible()
}

test('a signed-in user can save each supporting module', async ({ page }) => {
  await signedInPage(page)

  await visit(page, 'Tasks')
  await page.getByLabel('Task title').fill('Book dentist appointment')
  await page.getByRole('button', { name: 'Save task' }).click()
  await expect(page.getByText('Book dentist appointment')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Book dentist appointment')).toBeVisible()

  await visit(page, 'Study')
  await page.getByLabel('Topic').fill('Spanish vocabulary')
  await page.getByLabel('Notes').fill('Five useful travel words.')
  await page.getByRole('button', { name: 'Save study log' }).click()
  await expect(page.getByText('Spanish vocabulary')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Spanish vocabulary')).toBeVisible()

  await visit(page, 'Workout')
  await page.getByLabel('Activity').fill('Walk')
  await page.getByLabel('Minutes').fill('30')
  await page.getByRole('button', { name: 'Save workout' }).click()
  await expect(page.getByRole('img', { name: 'Workout minutes for the last seven days' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: 'Workout minutes for the last seven days' })).toBeVisible()

  await visit(page, 'Sleeping')
  await page.getByLabel('Minutes').fill('450')
  await page.getByRole('button', { name: 'Save sleep' }).click()
  await expect(page.getByRole('img', { name: /Sleeping minutes for the last seven days/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: /Sleeping minutes for the last seven days/ })).toBeVisible()

  await visit(page, 'Diary')
  await page.getByLabel('Diary entry').fill('A quiet cup of tea helped today.')
  await page.getByRole('button', { name: 'Save diary entry' }).click()
  await expect(page.getByText('A quiet cup of tea helped today.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('A quiet cup of tea helped today.')).toBeVisible()

  await visit(page, 'Finance')
  await page.getByLabel('Label').fill('Lunch')
  await page.getByLabel('Amount').fill('-12.50')
  await page.getByRole('button', { name: 'Save finance entry' }).click()
  await expect(page.getByText('-$12.50')).toBeVisible()
  await page.reload()
  await expect(page.getByText('-$12.50')).toBeVisible()
})
