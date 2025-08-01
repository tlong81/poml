import { Readability } from '@mozilla/readability';

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  debug: string;
}

// Content extraction function that will be injected into pages
function extractContent(): ExtractedContent {
  try {
    console.log('[DEBUG] Content extractor script loaded');
    console.log('[DEBUG] Document title:', document.title);
    console.log('[DEBUG] Document URL:', document.location.href);
    console.log('[DEBUG] Document body exists:', !!document.body);
    console.log('[DEBUG] Document body innerHTML length:', document.body ? document.body.innerHTML.length : 0);
    
    // Always provide fallback first, then try to enhance with Readability
    const fallbackTitle = document.title || 'Untitled';
    const fallbackContent = document.body ? (document.body.innerText || document.body.textContent || '') : '';
    
    console.log('[DEBUG] Fallback content length:', fallbackContent.length);
    
    // If we have no fallback content, return early
    if (!fallbackContent.trim()) {
      console.log('[DEBUG] No fallback content available');
      return {
        title: fallbackTitle,
        content: 'No text content found on this page',
        excerpt: '',
        debug: 'No text content available'
      };
    }
    
    console.log('[DEBUG] Readability is available, proceeding with extraction');
    
    // Create a clone of the document to avoid modifying the original
    const documentClone = document.cloneNode(true) as Document;
    console.log('[DEBUG] Document cloned successfully');
    
    // Use Readability to extract main content
    const reader = new Readability(documentClone, {
      debug: true,
      // maxElemsToDivide: 300,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: []
    });
    
    console.log('[DEBUG] Readability reader created');
    
    const article = reader.parse();
    console.log('[DEBUG] Readability parse completed');
    console.log('[DEBUG] Article result:', article ? 'success' : 'null');
    
    if (article && article.textContent && article.textContent.trim()) {
      console.log('[DEBUG] Article title:', article.title);
      console.log('[DEBUG] Article content length:', article.textContent.length);
      console.log('[DEBUG] Article excerpt length:', article.excerpt ? article.excerpt.length : 0);
      
      return {
        title: article.title || fallbackTitle,
        content: article.textContent,
        excerpt: article.excerpt || '',
        debug: 'Readability extraction successful'
      };
    } else {
      console.log('[DEBUG] Readability failed or returned empty content, using fallback');
      return {
        title: fallbackTitle,
        content: fallbackContent,
        excerpt: fallbackContent.substring(0, 200) + (fallbackContent.length > 200 ? '...' : ''),
        debug: 'Readability failed, used fallback text extraction'
      };
    }
    
  } catch (error) {
    console.error('[DEBUG] Error in content extractor:', error);
    
    // Emergency fallback
    const emergencyTitle = document.title || 'Error extracting title';
    const emergencyContent = document.body ? (document.body.innerText || document.body.textContent || 'Error extracting content') : 'No body element found';
    
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
    extractContent: () => ExtractedContent;
  }
}

(window as any).extractContent = extractContent;