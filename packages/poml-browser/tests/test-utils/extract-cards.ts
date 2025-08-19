#!/usr/bin/env node

/**
 * Test utility script to extract content cards from HTML pages and PDF files
 * for use in automated tests. Runs in a mocked browser environment.
 */

import { extractHtmlContent } from '../../functions/html';
import { extractPdfContent } from '../../functions/pdf';
import * as fs from 'fs';
import * as path from 'path';
import { Window } from 'happy-dom';

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

async function fetchUrl(url: string): Promise<string> {
  // Use built-in fetch if available, otherwise fall back to https module
  if (typeof fetch !== 'undefined') {
    const response = await fetch(url);
    return await response.text();
  }
  
  // Fallback for Node.js without fetch
  const https = await import('https');
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function extractHtmlCards(): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  const assetsDir = path.join(__dirname, '..', 'assets');
  
  // Ensure assets directory exists
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  for (const url of htmlPages) {
    console.log(`Extracting from: ${url}`);
    
    try {
      // Fetch the HTML content
      const html = await fetchUrl(url);
      
      // Create a DOM environment with happy-dom
      const window = new Window({
        url,
        settings: {
          disableJavaScriptEvaluation: true,
          disableComputedStyleRendering: true,
          disableCSSFileLoading: true,
          disableIframePageLoading: true,
        }
      });
      const document = window.document;
      
      // Set the HTML content
      document.write(html);
      
      // Make document available globally for extraction function
      (global as any).document = document;
      (global as any).window = window;
      
      // Extract content
      const cards = await extractHtmlContent();
      
      results.push({
        url,
        cards,
        extractedAt: new Date().toISOString(),
      });
      
      console.log(`  ✓ Extracted ${cards.length} cards`);
      
      // Clean up
      window.close();
      
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
  
  // Save HTML cards to JSON
  const outputPath = path.join(assetsDir, 'html-cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nHTML cards saved to: ${outputPath}`);
  
  return results;
}

async function extractPdfCards(): Promise<ExtractionResult[]> {
  const results: ExtractionResult[] = [];
  const assetsDir = path.join(__dirname, '..', 'assets');
  
  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(assetsDir, pdfFile);
    console.log(`Extracting from: ${pdfFile}`);
    
    try {
      // Check if PDF file exists
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file not found: ${pdfPath}`);
      }
      
      // Read PDF file
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfUrl = `file://${pdfPath}`;
      
      // Mock document for PDF extraction
      (global as any).document = {
        location: { href: pdfUrl },
        title: pdfFile,
        contentType: 'application/pdf',
      };
      
      // Mock chrome runtime for file reading
      (global as any).chrome = {
        runtime: {
          getURL: (path: string) => path,
          sendMessage: async (message: any) => {
            if (message.action === 'readFile') {
              return {
                success: true,
                base64Data: pdfBuffer.toString('base64'),
              };
            }
          },
        },
      };
      
      // Extract content
      const cards = await extractPdfContent(pdfUrl);
      
      results.push({
        file: pdfFile,
        path: pdfPath,
        cards,
        extractedAt: new Date().toISOString(),
      });
      
      console.log(`  ✓ Extracted ${cards.length} cards`);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Error extracting ${pdfFile}:`, errorMessage);
      results.push({
        file: pdfFile,
        path: pdfPath,
        error: errorMessage,
        extractedAt: new Date().toISOString(),
      });
    }
  }
  
  // Save PDF cards to JSON
  const outputPath = path.join(assetsDir, 'pdf-cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\nPDF cards saved to: ${outputPath}`);
  
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
  
  const summaryPath = path.join(__dirname, '..', 'assets', 'extraction-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  console.log('\n=== Extraction Summary ===');
  console.log(`HTML: ${summary.html.successful}/${summary.html.total} successful`);
  console.log(`PDF: ${summary.pdf.successful}/${summary.pdf.total} successful`);
  console.log(`\nSummary saved to: ${summaryPath}`);
}

// Check if running as script
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in tests
export { extractHtmlCards, extractPdfCards, main as extractCards };