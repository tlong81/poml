import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = process.env.OUTPUT_DIR ?? './extracted-cards';

async function saveCardsToFiles(results: any[], type: 'html' | 'pdf') {
  // Create output directory if it doesn't exist
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const typeDir = join(OUTPUT_DIR, type);
  mkdirSync(typeDir, { recursive: true });
  
  // Save individual card files
  for (const result of results) {
    if (result.error) {
      continue;
    }
    
    const filename = type === 'html' 
      ? `${result.url.replace(/[^a-zA-Z0-9]/g, '_')}.json`
      : `${result.file.replace('.pdf', '')}.json`;
    
    const filepath = join(typeDir, filename);
    writeFileSync(filepath, JSON.stringify(result, null, 2));
    console.log(`  Saved: ${filepath}`);
  }
  
  // Save summary file
  const summaryPath = join(typeDir, '_summary.json');
  const summary = {
    extractedAt: new Date().toISOString(),
    total: results.length,
    successful: results.filter(r => !r.error).length,
    failed: results.filter(r => r.error).length,
    results: results.map(r => ({
      ...(type === 'html' ? { url: r.url } : { file: r.file }),
      cardsCount: r.cards?.length || 0,
      error: r.error,
      extractedAt: r.extractedAt
    }))
  };
  writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`  Saved summary: ${summaryPath}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('=== Extracting Content Cards ===');
  
  try {
    // Run card extraction in browser context
    const extractionResults = await page.evaluate(async () => {
      // HTML pages to extract
      const htmlPages = [
        "https://en.wikipedia.org/wiki/Mad_Decent",
        "https://github.com/google/nsjail/issues/17", 
        "https://github.com/microsoft/nni",
        "https://stackoverflow.com/questions/39702871/gdb-kind-of-doesnt-work-on-macos-sierra",
        "https://www.cnbc.com/2025/08/18/intel-is-getting-a-2-billion-investment-from-softbank.html",
        "https://www.imdb.com/title/tt1182345/",
      ];

      // Mock extraction function for now - in a real scenario, this would use the actual contentManager
      async function extractFromUrl(url: string) {
        try {
          // This would normally use contentManager.fetchContent() but we'll simulate it
          return {
            url,
            cards: [
              {
                type: 'text',
                content: `Sample extracted content from ${url}`,
                metadata: { source: url, timestamp: new Date().toISOString() }
              }
            ],
            extractedAt: new Date().toISOString(),
          };
        } catch (error) {
          return {
            url,
            error: error instanceof Error ? error.message : String(error),
            extractedAt: new Date().toISOString(),
          };
        }
      }

      // Extract from HTML pages
      const htmlResults = [];
      for (const url of htmlPages) {
        const result = await extractFromUrl(url);
        htmlResults.push(result);
      }

      // Return results
      return {
        htmlResults,
        pdfResults: [] // PDF extraction would require actual browser extension context
      };
    });
    
    // Save HTML cards to local files
    if (extractionResults.htmlResults && extractionResults.htmlResults.length > 0) {
      console.log('\nSaving HTML cards to local files...');
      await saveCardsToFiles(extractionResults.htmlResults, 'html');
    }
    
    // Save PDF cards to local files
    if (extractionResults.pdfResults && extractionResults.pdfResults.length > 0) {
      console.log('\nSaving PDF cards to local files...');
      await saveCardsToFiles(extractionResults.pdfResults, 'pdf');
    }
    
    console.log(`\nAll cards saved to: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('Error extracting or saving cards:', error);
  }

  await browser.close();
  console.log('Seeded via headless browser with card extraction.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
