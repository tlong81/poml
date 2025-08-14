import { Readability } from '@mozilla/readability';
import { notifyDebug, notifyError, notifyInfo, notifyWarning } from './notification';

export interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  method: 'readability' | 'fallback';
}

/**
 * Unified content manager for all document types (HTML, PDF, Word)
 * Used by UI/popup to extract content from any supported document type
 */
export const contentManager = {
  /**
   * Request content extraction from the current tab via background service worker
   * The content script will automatically detect the document type (HTML, PDF, Word)
   */
  async fetchContent(): Promise<string> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }
      
      if (!tab.url) {
        throw new Error('No URL found for current tab');
      }
      
      // Check for restricted URLs
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot extract content from chrome:// or extension pages');
      }
      
      notifyInfo('Requesting content extraction');
      
      // Send message to background script to extract content
      // The background script will inject content script which auto-detects document type
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'extractContent',
          tabId: tab.id
        }, {}, (response?: any) => {
          if ((chrome.runtime as any).lastError) {
            reject(new Error(`Background script error: ${(chrome.runtime as any).lastError.message}`));
            return;
          }
          
          if (response && response.success) {
            notifyInfo('Content extracted successfully');
            resolve(response.content);
          } else {
            reject(new Error(response?.error || 'Unknown error extracting content'));
          }
        });
      });
    } catch (error) {
      notifyError('Error fetching content', error);
      throw error;
    }
  }
};

// Export for backward compatibility - will be removed
export const extractPageContent = contentManager.fetchContent;

/**
 * Content script functions (used when injected by service worker).
 * Extract content from a regular HTML page using Readability.
 * This function is used by the content script when injected.
 */
export async function extractHtmlContent(): Promise<ExtractedContent> {
  try {
    notifyDebug('Starting HTML content extraction', {
      url: document.location.href,
      title: document.title
    });
    
    // Get fallback content first
    const fallbackTitle = document.title || 'Untitled';
    const fallbackContent = document.body ? 
      (document.body.innerText || document.body.textContent || '') : '';
    
    notifyDebug('Fallback content prepared', { 
      contentLength: fallbackContent.length 
    });
    
    // If we have no fallback content, return early
    if (!fallbackContent.trim()) {
      notifyWarning('No text content found on this page');
      return {
        title: fallbackTitle,
        content: 'No text content found on this page',
        excerpt: '',
        method: 'fallback'
      };
    }
    
    // Try to use Readability for better extraction
    notifyDebug('Attempting Readability extraction');
    
    // Create a clone of the document to avoid modifying the original
    const documentClone = document.cloneNode(true) as Document;
    
    // Use Readability to extract main content
    const reader = new Readability(documentClone, {
      debug: false,
      nbTopCandidates: 5,
      charThreshold: 500,
      classesToPreserve: []
    });
    
    const article = reader.parse();
    
    if (article && article.textContent && article.textContent.trim()) {
      notifyInfo('Readability extraction successful', {
        titleLength: article.title?.length || 0,
        contentLength: article.textContent.length,
        hasExcerpt: !!article.excerpt
      });
      
      return {
        title: article.title || fallbackTitle,
        content: article.textContent,
        excerpt: article.excerpt || '',
        method: 'readability'
      };
    } else {
      notifyWarning('Readability failed, using fallback text extraction');
      
      return {
        title: fallbackTitle,
        content: fallbackContent,
        excerpt: fallbackContent.substring(0, 200) + 
                 (fallbackContent.length > 200 ? '...' : ''),
        method: 'fallback'
      };
    }
    
  } catch (error) {
    notifyError('Error in HTML content extraction', error);
    
    // Emergency fallback
    const emergencyTitle = document.title || 'Error extracting title';
    const emergencyContent = document.body ? 
      (document.body.innerText || document.body.textContent || 'Error extracting content') : 
      'No body element found';
    
    return {
      title: emergencyTitle,
      content: emergencyContent,
      excerpt: '',
      method: 'fallback'
    };
  }
}

/**
 * Main extraction function for HTML documents
 * This is called when the content script is injected by the service worker
 */
export async function extractHtmlDocumentContent(): Promise<string> {
  try {
    const result = await extractHtmlContent();
    
    // Format the output with title if available
    let extractedText = '';
    if (result.title && result.title !== 'Untitled') {
      extractedText += `# ${result.title}\n\n`;
    }
    extractedText += result.content;
    
    return extractedText;
  } catch (error) {
    notifyError('Failed to extract HTML document content', error);
    throw error;
  }
}