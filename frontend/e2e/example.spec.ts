import { test, expect } from '@playwright/test';

test.describe('Salary Calculator E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should load the salary calculator page', async ({ page }) => {
        await expect(page).toHaveTitle(/SalaryCalc/i);
        await expect(page.locator('h1')).toContainText('SalaryCalc');
    });

    test('should display salary calculator form', async ({ page }) => {
        await expect(page.locator('input[id="ctc"]')).toBeVisible();
        await expect(page.locator('select[id="city"]')).toBeVisible();
    });

    test('should calculate salary when form is submitted', async ({ page }) => {
        // Fill in the form
        await page.fill('input[id="ctc"]', '1000000');
        await page.selectOption('select[id="city"]', 'Mumbai');

        // Submit the form
        await page.click('button[type="submit"]');

        // Wait for result modal
        await expect(page.locator('.modal-content')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('.result-grid')).toBeVisible();
    });
});

