import * as pdfjsLib from 'pdfjs-dist';
import { base64ToBinary } from './utils';
import { notifyDebug, notifyError, notifyInfo } from './notification';
import { CardModel, TextContent, createCard } from './cardModel';

// PDF manager functions moved to unified contentManager in html.ts

/**
 * Extracts text content from a PDF document
 * Returns an array of CardModel objects (single parent with nested children)
 */
export async function extractPdfContent(pdfUrl?: string): Promise<CardModel[]> {
  const childCards: CardModel[] = [];
  
  try {
    const targetUrl = pdfUrl || document.location.href;
    notifyDebug('Starting PDF text extraction', { url: targetUrl });
    
    // Set worker source to use the local worker file with fallback
    // Try to use chrome.runtime.getURL if available (extension context)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('external/pdf.worker.min.mjs');
    } else {
      // Fallback for content script or when chrome.runtime.getURL is unavailable
      // Try to construct the URL using the extension ID if available
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
    }
    notifyDebug('PDF worker configured: ' + pdfjsLib.GlobalWorkerOptions.workerSrc);
    
    // Handle different PDF loading scenarios
    let loadingTask;
    
    if (targetUrl.startsWith('file://')) {
      notifyDebug('Local file detected, requesting binary data from background script');
      
      // Send message to background script to read the file as binary
      const response = await chrome.runtime.sendMessage({
        action: 'readFile',
        filePath: targetUrl,
        binary: true
      }) as {success: boolean, base64Data?: string, error?: string};
      
      if (!response.success || !response.base64Data) {
        const errorMsg = `Failed to read PDF file: ${response.error || 'Unknown error'}`;
        notifyError(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Convert base64 back to ArrayBuffer
      const uint8Array = base64ToBinary(response.base64Data);
      
      notifyDebug('Converted base64 to Uint8Array', { size: uint8Array.byteLength });
      loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    } else {
      // Load the PDF document directly from URL
      notifyDebug('Loading PDF from URL');
      loadingTask = pdfjsLib.getDocument(targetUrl);
    }
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    
    notifyInfo(`PDF loaded successfully`, { pages: pageCount });
    
    // Extract document title
    const title = document.title || 'PDF Document';
    const documentTitle = title && title !== 'about:blank' ? title : 'PDF Document';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
        .trim();
      
      if (pageText) {
        // Create a card for each page
        childCards.push(createCard({
          content: { type: 'text', value: pageText } as TextContent,
          componentType: 'Paragraph',
          title: `Page ${pageNum}`,
          metadata: {
            source: 'file',
            url: targetUrl,
            tags: ['pdf', `page-${pageNum}`]
          }
        }));
      }
      
      notifyDebug(`Extracted page ${pageNum}/${pageCount}`, { 
        textLength: pageText.length 
      });
    }
    
    // Create a single parent card with all pages as nested children
    const parentCard = createCard({
      content: childCards.length > 0 ? 
        { type: 'nested', children: childCards } : 
        { type: 'text', value: 'No text content found in PDF' } as TextContent,
      componentType: 'CaptionedParagraph',
      title: documentTitle,
      metadata: {
        source: 'file',
        url: targetUrl,
        tags: ['pdf', 'document']
      }
    });

    notifyInfo('PDF extraction completed', { 
      childCardsCount: childCards.length,
      pages: pageCount 
    });
    
    return [parentCard];
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    notifyError('PDF extraction failed', error);
    
    // Return error card
    return [createCard({
      content: { 
        type: 'text', 
        value: `Failed to extract PDF: ${errorMsg}`
      } as TextContent,
      componentType: 'Paragraph',
      metadata: {
        source: 'file',
        url: pdfUrl || document.location.href,
        tags: ['error', 'pdf']
      }
    })];
  }
}

/**
 * Check if the current URL is a PDF document
 */
export function isPdfDocument(url?: string): boolean {
  const targetUrl = url || document.location.href;
  return targetUrl.toLowerCase().includes('.pdf') || 
         document.contentType === 'application/pdf';
}

/**
 * Main extraction function for PDF documents
 * Returns CardModel array
 */
export async function extractPdfDocumentContent(): Promise<CardModel[]> {
  try {
    return await extractPdfContent();
  } catch (error) {
    notifyError('Failed to extract PDF document content', error);
    throw error;
  }
}