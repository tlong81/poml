import { test, expect } from '@playwright/test';
import { htmlPages, pdfFiles } from '../constants';

import { extractPdfContent } from '@functions/pdf';
import { extractHtmlContent } from '@functions/html';

test.describe('generate cards with pdfs', () => {
  for (const pdfFile of pdfFiles) {
    test(`extract content from ${pdfFile}`, async ({ page }) => {
      await page.goto(`file://${pdfFile}`);

      const content = await page.evaluate(???);
      
      console.log(`Extracted content from ${pdfFile}:`, content);
    });
  }
});

test.describe('generate cards with html pages', () => {
  for (const htmlPage of htmlPages) {
    test(`extract content from ${htmlPage}`, async ({ page }) => {
      await page.goto(htmlPage);

      const content = await page.evaluate(???);

      console.log(`Extracted content from ${htmlPage}:`, content);
    });
  }
});
