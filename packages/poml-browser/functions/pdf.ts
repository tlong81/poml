import * as pdfjsLib from 'pdfjs-dist';
import { base64ToBinary } from './utils';
import { notifyDebug, notifyError, notifyInfo } from './notification';

export interface PdfExtractResult {
  title: string;
  content: string;
  excerpt: string;
  pageCount: number;
}

// PDF manager functions moved to unified contentManager in html.ts

/**
 * Content script functions (used when injected by service worker).
 * Extracts text content from a PDF document.
 * This function is used by the content script when injected.
 */
export async function extractPdfContent(pdfUrl?: string): Promise<PdfExtractResult> {
  try {
    const targetUrl = pdfUrl || document.location.href;
    notifyDebug('Starting PDF text extraction', { url: targetUrl });
    
    // Set worker source to use the local worker file
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('external/pdf.worker.min.mjs');
    
    notifyDebug('PDF worker configured');
    
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
    
    let fullText = '';
    const title = document.title || 'PDF Document';
    
    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
      
      notifyDebug(`Extracted page ${pageNum}/${pageCount}`, { 
        textLength: pageText.length 
      });
    }
    
    // Clean up the text
    fullText = fullText.trim();
    
    notifyInfo('PDF extraction completed', { 
      totalLength: fullText.length,
      pages: pageCount 
    });
    
    return {
      title: title,
      content: fullText,
      excerpt: fullText.substring(0, 200) + (fullText.length > 200 ? '...' : ''),
      pageCount: pageCount
    };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    notifyError('PDF extraction failed', error);
    
    return {
      title: document.title || 'PDF Document',
      content: 'Error extracting PDF content: ' + errorMsg,
      excerpt: '',
      pageCount: 0
    };
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
 * This is called when the content script is injected by the service worker
 */
export async function extractPdfDocumentContent(): Promise<string> {
  try {
    const result = await extractPdfContent();
    return result.content;
  } catch (error) {
    notifyError('Failed to extract PDF document content', error);
    throw error;
  }
}