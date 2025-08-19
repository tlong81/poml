/**
 * Test utility to extract content cards from HTML pages and PDF files
 * for use in automated tests. Runs in browser environment.
 */

import { contentManager } from '../../functions/html';
import { extractPdfContent } from '../../functions/pdf';

// HTML pages to extract
const htmlPages = [
  "https://en.wikipedia.org/wiki/Mad_Decent",
  "https://github.com/google/nsjail/issues/17", 
  "https://github.com/microsoft/nni",
  "https://stackoverflow.com/questions/39702871/gdb-kind-of-doesnt-work-on-macos-sierra",
  "https://www.cnbc.com/2025/08/18/intel-is-getting-a-2-billion-investment-from-softbank.html",
  "https://www.imdb.com/title/tt1182345/",
];

// Local PDFs to extract
const pdfFiles = [
  "google-doc-document.pdf",
  "linenumber-with-subfigures.pdf",
  "multicolumn.pdf",
  "pdflatex-4-pages.pdf",
  "pdflatex-image.pdf",
  "trivial-libre-office-writer.pdf",
];

interface ExtractionResult {
  url?: string;
  file?: string;
  path?: string;
  cards?: any[];
  error?: string;
  extractedAt: string;
}

async function extractHtmlCards(): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  
  for (const url of htmlPages) {
    console.log(`Extracting from: ${url}`);
    
    try {
      // Open URL in a new tab for extraction
      const tab = await chrome.tabs.create({ url, active: false });
      
      if (!tab.id) {
        throw new Error('Failed to create tab');
      }
      
      // Wait for tab to load
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: any) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // Extract content using content manager
      const cards = await contentManager.fetchContent();
      
      results.push({
        url,
        cards,
        extractedAt: new Date().toISOString(),
      });
      
      console.log(`  ✓ Extracted ${cards.length} cards`);
      
      // Close the tab
      await chrome.tabs.remove(tab.id);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Error extracting ${url}:`, errorMessage);
      results.push({
        url,
        error: errorMessage,
        extractedAt: new Date().toISOString(),
      });
    }
  }
  
  // Save results to browser storage
  await chrome.storage.local.set({ 'html-cards': results });
  console.log(`\nHTML cards saved to browser storage`);
  
  return results;
}

async function extractPdfCards(): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  
  for (const pdfFile of pdfFiles) {
    console.log(`Extracting from: ${pdfFile}`);
    
    try {
      // Create a local URL for the PDF file (assumes PDFs are in test assets)
      const pdfUrl = chrome.runtime.getURL(`tests/assets/${pdfFile}`);
      
      // Open PDF in a new tab for extraction
      const tab = await chrome.tabs.create({ url: pdfUrl, active: false });
      
      if (!tab.id) {
        throw new Error('Failed to create tab');
      }
      
      // Wait for tab to load
      await new Promise<void>((resolve) => {
        const listener = (tabId: number, changeInfo: any) => {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      });
      
      // Extract content using PDF extraction function
      const cards = await extractPdfContent(pdfUrl);
      
      results.push({
        file: pdfFile,
        url: pdfUrl,
        cards,
        extractedAt: new Date().toISOString(),
      });
      
      console.log(`  ✓ Extracted ${cards.length} cards`);
      
      // Close the tab
      await chrome.tabs.remove(tab.id);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Error extracting ${pdfFile}:`, errorMessage);
      results.push({
        file: pdfFile,
        error: errorMessage,
        extractedAt: new Date().toISOString(),
      });
    }
  }
  
  // Save results to browser storage
  await chrome.storage.local.set({ 'pdf-cards': results });
  console.log(`\nPDF cards saved to browser storage`);
  
  return results;
}

async function main() {
  console.log('=== Extracting Content Cards for Tests ===\n');
  console.log('This script prepares test assets by extracting content from HTML and PDF sources.\n');
  
  console.log('=== Extracting HTML Cards ===\n');
  const htmlResults = await extractHtmlCards();
  
  console.log('\n=== Extracting PDF Cards ===\n');
  const pdfResults = await extractPdfCards();
  
  // Create combined summary
  const summary = {
    timestamp: new Date().toISOString(),
    html: {
      total: htmlPages.length,
      successful: htmlResults.filter(r => !r.error).length,
      failed: htmlResults.filter(r => r.error).length,
    },
    pdf: {
      total: pdfFiles.length,
      successful: pdfResults.filter(r => !r.error).length,
      failed: pdfResults.filter(r => r.error).length,
    },
  };
  
  // Save summary to browser storage
  await chrome.storage.local.set({ 'extraction-summary': summary });
  
  console.log('\n=== Extraction Summary ===');
  console.log(`HTML: ${summary.html.successful}/${summary.html.total} successful`);
  console.log(`PDF: ${summary.pdf.successful}/${summary.pdf.total} successful`);
  console.log(`\nSummary saved to browser storage`);
}

// Export for use in tests
export { extractHtmlCards, extractPdfCards, main as extractCards };