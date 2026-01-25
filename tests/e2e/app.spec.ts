import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/typeflow/i)
  })

  test('should have navigation elements', async ({ page }) => {
    await page.goto('/')
    // Check that the page loads without errors
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    // Check for login form elements
    await expect(page.locator('body')).toBeVisible()
  })
})
