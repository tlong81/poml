import { notifyDebug, notifyInfo, notifyError } from './notification';

/**
 * Block types for structured content in Word documents
 */
export interface HeaderBlock {
  type: 'header';
  level: number;
  content: string;
}

export interface ParagraphBlock {
  type: 'paragraph';
  content: string;
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt: string;
}

export type Block = HeaderBlock | ParagraphBlock | ImageBlock;

/**
 * Cleans and normalizes text by replacing non-breaking spaces,
 * collapsing multiple whitespace characters, and trimming the result.
 */
export function cleanText(text: string | null): string {
  if (!text) {
    return '';
  }
  // Replace non-breaking spaces with regular spaces and collapse whitespace
  return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extract content from Microsoft Word Online documents
 * This function is used by the content script when injected
 */
export function extractWordContent(): Block[] {
  const blocks: Block[] = [];
  
  notifyDebug('Starting Word document extraction', {
    url: document.location.href,
    title: document.title
  });
  
  // Select all primary content containers, which seem to be '.OutlineElement'
  const elements = document.querySelectorAll('.OutlineElement');
  
  notifyDebug('Found OutlineElement elements', { count: elements.length });
  
  // If no OutlineElements found, try alternative selectors for Word content
  if (elements.length === 0) {
    notifyDebug('No OutlineElement found, trying alternative selectors');
    
    // Try other common Word Online selectors
    const alternativeSelectors = [
      '.Paragraph',
      '[role="document"] p',
      '.DocumentFragment p',
      '.Page p',
      'p',
      'div[contenteditable="true"] *',
      '[data-automation-id="documentCanvas"] *'
    ];
    
    for (const selector of alternativeSelectors) {
      const altElements = document.querySelectorAll(selector);
      
      if (altElements.length > 0) {
        notifyDebug(`Found elements with selector: ${selector}`, { 
          count: altElements.length 
        });
        
        // Process these elements directly as paragraphs
        altElements.forEach(element => {
          const content = cleanText(element.textContent);
          if (content) {
            // Check if it's a heading
            if (element.getAttribute('role') === 'heading' || 
                element.tagName.match(/^H[1-6]$/)) {
              const level = element.tagName.match(/^H([1-6])$/) ? 
                parseInt(element.tagName.charAt(1)) : 
                parseInt(element.getAttribute('aria-level') || '1', 10);
              
              blocks.push({
                type: 'header',
                level: isNaN(level) ? 1 : level,
                content: content,
              });
            } else {
              blocks.push({
                type: 'paragraph',
                content: content,
              });
            }
          }
        });
        break; // Stop after finding the first working selector
      }
    }
  } else {
    // Process OutlineElements as originally intended
    elements.forEach(element => {
      // Check for Images
      const imageEl = element.querySelector('image');
      if (imageEl && imageEl.getAttribute('href')) {
        blocks.push({
          type: 'image',
          src: imageEl.getAttribute('href')!,
          alt: 'Document image'
        });
        return;
      }

      // Check for Paragraphs and Headers
      const p = element.querySelector('p.Paragraph');
      if (p) {
        const content = cleanText(p.textContent);

        // Skip empty or whitespace-only paragraphs
        if (!content) {
          return;
        }
        
        // Check if the paragraph is a header
        if (p.getAttribute('role') === 'heading') {
          const level = parseInt(p.getAttribute('aria-level') || '1', 10);
          blocks.push({
            type: 'header',
            level: isNaN(level) ? 1 : level,
            content: content,
          });
        } else {
          // Otherwise, it's a standard paragraph (or list item)
          blocks.push({
            type: 'paragraph',
            content: content,
          });
        }
      }
    });
  }

  notifyInfo('Word document extraction completed', { 
    blocksCount: blocks.length 
  });
  
  return blocks;
}

/**
 * Convert Word document blocks to structured content format
 */
export function convertWordBlocksToContent(blocks: Block[]): {
  title: string;
  content: string;
  excerpt: string;
} {
  const title = document.title || 'Word Document';
  
  // Convert blocks to text content
  const contentParts: string[] = [];
  
  blocks.forEach(block => {
    switch (block.type) {
      case 'header':
        // Add headers with markdown-style formatting
        const headerPrefix = '#'.repeat(block.level);
        contentParts.push(`${headerPrefix} ${block.content}`);
        break;
      case 'paragraph':
        contentParts.push(block.content);
        break;
      case 'image':
        contentParts.push(`[Image: ${block.alt}]`);
        break;
    }
  });
  
  const content = contentParts.join('\n\n');
  const excerpt = content.substring(0, 200) + (content.length > 200 ? '...' : '');
  
  return {
    title,
    content,
    excerpt
  };
}

/**
 * Check if the current page is a Word Online document
 */
export function isWordDocument(): boolean {
  // Check for Word Online specific indicators
  try {
    const wordPatterns = [
      /sharepoint\.com.*\/_layouts\/15\/Doc.aspx/,
      /office\.com.*\/edit/,
      /onedrive\.live\.com.*\/edit/,
      /sharepoint\.com.*\/edit/,
      /officeapps\.live\.com\/we\/wordeditorframe\.aspx/,
      /word-edit\.officeapps\.live\.com/
    ];

    return wordPatterns.some(pattern => pattern.test(document.location.pathname));
  } catch (error) {
    notifyError('Error checking for Word document.', error);
    return false;
  }
}

/**
 * Main extraction function for Word documents
 * This is called when the content script is injected by the service worker
 */
export function extractWordDocumentContent(): string {
  try {
    const blocks = extractWordContent();
    const result = convertWordBlocksToContent(blocks);
    return result.content;
  } catch (error) {
    notifyError('Failed to extract Word document content', error);
    throw error;
  }
}