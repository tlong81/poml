import { extractPdfContent, isPdfDocument } from '../functions/pdf';
import { extractHtmlContent } from '../functions/html';
import { extractWordContent, convertWordBlocksToContent, isWordDocument } from '../functions/msword';
import { notifyInfo, notifyError } from '../functions/notification';

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  debug: string;
}

/**
 * Main content extraction function that determines the appropriate extraction method
 */
async function extractContent(): Promise<ExtractedContent> {
  try {
    notifyInfo('Content extractor script loaded', {
      url: document.location.href,
      title: document.title
    });
    
    // Check if this is a PDF document
    if (isPdfDocument()) {
      notifyInfo('PDF detected, attempting PDF text extraction');
      const pdfResult = await extractPdfContent(document.location.href);
      return {
        title: pdfResult.title,
        content: pdfResult.content,
        excerpt: pdfResult.excerpt,
        debug: `PDF extraction successful - ${pdfResult.pageCount} pages processed`
      };
    }
    
    // Check if this is a Word document
    if (isWordDocument()) {
      notifyInfo('Word document detected, extracting content');
      const blocks = extractWordContent();
      const wordContent = convertWordBlocksToContent(blocks);
      return {
        title: wordContent.title,
        content: wordContent.content,
        excerpt: wordContent.excerpt,
        debug: `Word extraction successful - ${blocks.length} blocks processed`
      };
    }
    
    // Otherwise, extract as regular HTML
    notifyInfo('Extracting HTML content');
    const htmlResult = await extractHtmlContent();
    return {
      title: htmlResult.title,
      content: htmlResult.content,
      excerpt: htmlResult.excerpt,
      debug: `HTML extraction successful - ${htmlResult.method} method used`
    };
    
  } catch (error) {
    notifyError('Error in content extractor', error);
    
    // Emergency fallback
    const emergencyTitle = document.title || 'Error extracting title';
    const emergencyContent = document.body ? 
      (document.body.innerText || document.body.textContent || 'Error extracting content') : 
      'No body element found';
    
    return {
      title: emergencyTitle,
      content: emergencyContent,
      excerpt: '',
      debug: `Script error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

// Make the function globally available when loaded as a script
declare global {
  interface Window {
    extractContent: () => Promise<ExtractedContent>;
    convertDomToMarkup: () => any;
  }
}

(window as any).extractContent = extractContent;

// Keep the convertDomToMarkup for backward compatibility (it's now in msword.ts)
(window as any).convertDomToMarkup = () => {
  notifyInfo('convertDomToMarkup called - delegating to Word extraction');
  const blocks = extractWordContent();
  return blocks;
};