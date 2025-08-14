import { notifyDebug, notifyError, notifyInfo } from './notification';

class GoogleDocsManager {
  private accessToken: string | null = null;

  /**
   * Check if the current tab is a Google Docs document
   */
  async checkGoogleDocsTab(): Promise<boolean> {
    try {
      if (!chrome.tabs) { return false; }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return (tab && tab.url && tab.url.includes('docs.google.com/document')) || false;
    } catch (error) {
      notifyDebug('Error checking Google Docs tab', error);
      return false;
    }
  }

  /**
   * Authenticate with Google and get access token
   */
  private async authenticateGoogle(): Promise<string> {
    try {
      if (!chrome.identity) {
        throw new Error('Chrome identity API not available');
      }

      notifyInfo('Authenticating with Google');

      const authResponse = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/documents.readonly']
      });

      if (!authResponse || typeof authResponse !== 'object' || !authResponse.token) {
        notifyError('Failed to get access token', authResponse);
        throw new Error('Failed to get access token');
      }

      this.accessToken = authResponse.token;
      notifyInfo('Google authentication successful');
      return authResponse.token;
    } catch (error) {
      notifyError('Authentication failed', error);
      throw error;
    }
  }

  /**
   * Extract document ID from Google Docs URL
   */
  private extractDocumentId(url: string): string | null {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  /**
   * Fetch content from Google Docs using API
   * Note: This runs in the extension context, not as a content script
   */
  async fetchGoogleDocsContent(isRetry: boolean = false): Promise<string> {
    try {
      if (!chrome.tabs) {
        throw new Error('Chrome extension APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url || !tab.url.includes('docs.google.com/document')) {
        throw new Error('No Google Docs document tab found');
      }

      const documentId = this.extractDocumentId(tab.url);
      if (!documentId) {
        throw new Error('Could not extract document ID from URL');
      }

      notifyInfo('Fetching Google Docs content', { documentId });

      if (!this.accessToken) {
        await this.authenticateGoogle();
      }

      const apiUrl = `https://docs.googleapis.com/v1/documents/${documentId}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 && !isRetry) {
          notifyInfo('Token expired, re-authenticating');
          this.accessToken = null;
          await this.authenticateGoogle();
          return this.fetchGoogleDocsContent(true);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const document = await response.json();
      
      const extractTextFromContent = (content: any): string => {
        if (!content || !content.content) return '';
        
        let text = '';
        for (const element of content.content) {
          if (element.paragraph) {
            for (const paragraphElement of element.paragraph.elements || []) {
              if (paragraphElement.textRun) {
                text += paragraphElement.textRun.content || '';
              }
            }
          } else if (element.table) {
            for (const row of element.table.tableRows || []) {
              for (const cell of row.tableCells || []) {
                text += extractTextFromContent(cell);
              }
            }
          }
        }
        return text;
      };

      const textContent = extractTextFromContent(document.body);
      
      if (!textContent.trim()) {
        throw new Error('No text content found in document');
      }

      notifyInfo('Google Docs content extracted successfully', { 
        length: textContent.length 
      });

      return textContent;
    } catch (error) {
      notifyError('Error fetching Google Docs content', error);
      throw error;
    }
  }
}

// Export the manager instance for UI/popup use
export const googleDocsManager = new GoogleDocsManager();

/**
 * Content script functions (used when injected by service worker).
 * Extract content from Google Docs by parsing the DOM.
 * This function is used when injected as a content script.
 * Note: This is a fallback method when API access is not available.
 */
export function extractGoogleDocsContentFromDOM(): string {
  try {
    notifyDebug('Starting Google Docs DOM extraction');
    
    // Try to find the main content container
    const contentSelectors = [
      '.kix-page-content-wrapper',
      '.kix-document-top-shadow-inner',
      '.kix-page',
      '[role="textbox"]',
      '.docs-texteventtarget-iframe'
    ];
    
    let content = '';
    
    for (const selector of contentSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        notifyDebug(`Found Google Docs content with selector: ${selector}`, { 
          count: elements.length 
        });
        
        elements.forEach(element => {
          const text = element.textContent?.trim();
          if (text) {
            content += text + '\n\n';
          }
        });
        
        if (content.trim()) {
          break;
        }
      }
    }
    
    // If no content found with specific selectors, try fallback
    if (!content.trim()) {
      notifyDebug('Using fallback extraction for Google Docs');
      content = document.body?.innerText || document.body?.textContent || '';
    }
    
    notifyInfo('Google Docs DOM extraction completed', { 
      length: content.length 
    });
    
    return content;
  } catch (error) {
    notifyError('Failed to extract Google Docs content from DOM', error);
    throw error;
  }
}

/**
 * Check if the current page is a Google Docs document
 */
export function isGoogleDocsDocument(): boolean {
  return document.location.hostname === 'docs.google.com' && 
         document.location.pathname.includes('/document/');
}

/**
 * Main extraction function for Google Docs when injected as content script
 * This tries DOM extraction as a fallback when API is not available
 */
export function extractGoogleDocsDocumentContent(): string {
  try {
    if (!isGoogleDocsDocument()) {
      throw new Error('Not a Google Docs document');
    }
    
    const content = extractGoogleDocsContentFromDOM();
    
    // Add document title if available
    const title = document.title.replace(' - Google Docs', '').trim();
    if (title && title !== 'Untitled document') {
      return `# ${title}\n\n${content}`;
    }
    
    return content;
  } catch (error) {
    notifyError('Failed to extract Google Docs document content', error);
    throw error;
  }
}