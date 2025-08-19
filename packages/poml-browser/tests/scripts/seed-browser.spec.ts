import { test, expect } from '@playwright/test';
import { htmlPages, pdfFiles } from '../constants';
import * as path from 'path';

test.describe('generate cards with pdfs', () => {
  for (const pdfFile of pdfFiles) {
    test(`extract content from ${pdfFile}`, async ({ page }) => {
      const fullPath = path.resolve(process.cwd(), pdfFile);
      
      await page.goto(`file://${fullPath}`);
      
      // Inject the content script that contains the extraction functions
      await page.addScriptTag({ path: path.resolve(__dirname, '../../dist/contentScript.js') });
      
      // Call the extractContent function that's exposed by the content script
      const content = await page.evaluate(async () => {
        // The content script exposes window.extractContent
        return await (window as any).extractContent();
      });
      
      console.log(`Extracted content from ${pdfFile}:`, content);
      
      // Verify extraction was successful
      expect(content).toBeDefined();
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });
  }
});

test.describe('generate cards with html pages', () => {
  for (const htmlPage of htmlPages) {
    test(`extract content from ${htmlPage}`, async ({ page }) => {
      await page.goto(htmlPage, { waitUntil: 'networkidle' });
      
      // Inject the content script that contains the extraction functions
      await page.addScriptTag({ path: path.resolve(__dirname, '../../dist/contentScript.js') });
      
      // Call the extractContent function that's exposed by the content script
      const content = await page.evaluate(async () => {
        // The content script exposes window.extractContent
        return await (window as any).extractContent();
      });
      
      console.log(`Extracted content from ${htmlPage}:`, content);
      
      // Verify extraction was successful
      expect(content).toBeDefined();
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
    });
  }
});
