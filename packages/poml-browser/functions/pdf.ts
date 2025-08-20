import * as pdfjsLib from 'pdfjs-dist';
import { base64ToBinary } from './utils';
import { notifyDebug, notifyError, notifyInfo } from './notification';
import { CardModel, CardModelSlim, TextContent, BinaryContent, createCardFromSlim } from './cardModel';

/**
 * Extracts structured content from a PDF document
 * Returns an array of CardModel objects with proper text structure and images
 */
export async function extractPdfContent(pdfUrl?: string): Promise<CardModel[]> {
  try {
    const targetUrl = pdfUrl || document.location.href;
    notifyDebug('Starting PDF structured extraction', { url: targetUrl });
    
    // Set worker source
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('external/pdf.worker.min.mjs');
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
    }
    
    // Load PDF
    let loadingTask;
    if (targetUrl.startsWith('file://')) {
      const response = await chrome.runtime.sendMessage({
        action: 'readFile',
        filePath: targetUrl,
        binary: true
      }) as {success: boolean, base64Data?: string, error?: string};
      
      if (!response.success || !response.base64Data) {
        throw new Error(`Failed to read PDF file: ${response.error || 'Unknown error'}`);
      }
      
      const uint8Array = base64ToBinary(response.base64Data);
      loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    } else {
      loadingTask = pdfjsLib.getDocument(targetUrl);
    }
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    notifyInfo(`PDF loaded successfully`, { pages: pageCount });
    
    // Extract content as cards directly
    const cards: CardModelSlim[] = [];
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Extract text blocks
      const textBlocks = await extractTextBlocks(page);
      
      // Convert blocks to cards
      for (const block of textBlocks) {
        cards.push({
          content: { type: 'text', value: block.text } as TextContent,
          componentType: block.isHeading ? 'Header' : 'Paragraph'
        });
      }
      
      // Extract images (simplified)
      const images = await extractImages(page);
      for (const imageData of images) {
        cards.push({
          content: {
            type: 'binary',
            value: imageData.base64,
            mimeType: imageData.mimeType,
            encoding: 'base64'
          } as BinaryContent,
          componentType: 'Image'
        });
      }
      
      notifyDebug(`Processed page ${pageNum}/${pageCount}`);
    }
    
    // Filter out empty text cards
    const cleanCards = cards.filter(card => {
      return card.content.type !== 'text' || (card.content as TextContent).value.trim().length > 0;
    });
    
    notifyInfo('PDF extraction completed', { cardsCount: cleanCards.length, pages: pageCount });
    
    // Convert slim cards to full CardModel objects
    const timestamp = new Date();
    const finalCards = cleanCards.length > 0 ? cleanCards : [{
      content: { type: 'text', value: 'No content found in PDF' } as TextContent,
      componentType: 'Paragraph'
    } as CardModelSlim];
    
    return finalCards.map(slim => createCardFromSlim(slim, {
      timestamp,
      metadata: {
        source: 'file',
        url: targetUrl,
        tags: ['pdf']
      }
    }));
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    notifyError('PDF extraction failed', error);
    
    const slimCard: CardModelSlim = {
      content: { 
        type: 'text', 
        value: `Failed to extract PDF: ${errorMsg}`
      } as TextContent,
      componentType: 'Paragraph'
    };
    
    return [createCardFromSlim(slimCard, {
      metadata: {
        source: 'file',
        url: pdfUrl || document.location.href,
        tags: ['error', 'pdf']
      }
    })];
  }
}

// Simplified text extraction - just get raw text and detect basic headings
async function extractTextBlocks(page: any): Promise<Array<{
  text: string;
  isHeading: boolean;
}>> {
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{
    str: string;
    transform: number[];
  }>;
  
  if (items.length === 0) {
    return [];
  }
  
  // Group text by lines
  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;
  
  for (const item of items) {
    const y = item.transform[5];
    
    if (lastY === null || Math.abs(y - lastY) > 2) {
      // New line
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = item.str;
      lastY = y;
    } else {
      // Same line
      currentLine += item.str;
    }
  }
  
  // Add last line
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  // Simple heading detection: short lines with numbers/capitals at start
  return lines.map(text => ({
    text,
    isHeading: text.length < 80 && (
      /^\d+\.?\s/.test(text) || // "1. Title" or "1 Title"
      /^[A-Z][A-Z\s]{3,}$/.test(text) || // "ALL CAPS TITLE"
      /^(Chapter|Section|Part)\s+\d+/i.test(text) // "Chapter 1"
    )
  })).filter(block => block.text.length > 0);
}

// Simplified image extraction - try basic approach or skip on error
async function extractImages(page: any): Promise<Array<{
  base64: string;
  mimeType: string;
}>> {
  const images: Array<{ base64: string; mimeType: string; }> = [];
  
  try {
    const ops = await page.getOperatorList();
    
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i];
      const args = ops.argsArray[i];
      
      // Look for image operations (simplified)
      if (fn === 82 || fn === 83) {
        try {
          const imageName = args[0];
          const imageObj = await (page as any).objs.get(imageName);
          
          if (imageObj?.width && imageObj?.height && imageObj.data) {
            // Create a simple placeholder for complex image extraction
            // In a real implementation, you might want more sophisticated image handling
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(imageObj.width, 200); // Limit size
            canvas.height = Math.min(imageObj.height, 200);
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Simple fill as placeholder - actual image data processing is complex
              ctx.fillStyle = '#f0f0f0';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#999';
              ctx.font = '12px Arial';
              ctx.fillText('Image', canvas.width/2 - 20, canvas.height/2);
              
              const dataUrl = canvas.toDataURL('image/png');
              const base64 = dataUrl.split(',')[1];
              
              if (base64) {
                images.push({ base64, mimeType: 'image/png' });
              }
            }
          }
        } catch (e) {
          // Skip problematic images silently
          continue;
        }
      }
    }
  } catch (error) {
    // Skip image extraction on any error
    notifyDebug('Skipping image extraction due to error', error);
  }
  
  return images;
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
 */
export async function extractPdfDocumentContent(): Promise<CardModel[]> {
  try {
    return await extractPdfContent();
  } catch (error) {
    notifyError('Failed to extract PDF document content', error);
    throw error;
  }
}