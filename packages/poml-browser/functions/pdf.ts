import * as pdfjsLib from 'pdfjs-dist';
import { base64ToBinary } from './utils';
import { notifyDebug, notifyError, notifyInfo } from './notification';
import {
  CardModel,
  CardModelSlim,
  TextContent,
  BinaryContent,
  createCardFromSlim
} from './cardModel';

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
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.4.54/pdf.worker.min.mjs';
    }

    // Load PDF
    let loadingTask;
    if (targetUrl.startsWith('file://')) {
      const response = (await chrome.runtime.sendMessage({
        action: 'readFile',
        filePath: targetUrl,
        binary: true
      })) as { success: boolean; base64Data?: string; error?: string };

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
    const finalCards =
      cleanCards.length > 0
        ? cleanCards
        : [
            {
              content: { type: 'text', value: 'No content found in PDF' } as TextContent,
              componentType: 'Paragraph'
            } as CardModelSlim
          ];

    return finalCards.map(slim =>
      createCardFromSlim(slim, {
        timestamp,
        metadata: {
          source: 'file',
          url: targetUrl,
          tags: ['pdf']
        }
      })
    );
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

    return [
      createCardFromSlim(slimCard, {
        metadata: {
          source: 'file',
          url: pdfUrl || document.location.href,
          tags: ['error', 'pdf']
        }
      })
    ];
  }
}
// Types
interface LineItem {
  text: string;
  y: number;
  x: number;
  fontSize: number;
}

interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

interface MarginDetectionResult {
  shouldFilter: boolean;
  leftThreshold: number;
  rightThreshold: number;
}

// Main text extraction function with paragraph detection and margin filtering
async function extractTextBlocks(page: any): Promise<
  Array<{
    text: string;
    isHeading: boolean;
  }>
> {
  const textContent = await page.getTextContent();
  const items = textContent.items as TextItem[];

  if (items.length === 0) {
    return [];
  }

  // Get page dimensions and margin info
  const viewport = page.getViewport({ scale: 1.0 });
  const marginInfo = detectLineNumbersInMargins(items, viewport.width);

  // Extract and filter lines
  const lines = extractLines(items, marginInfo);

  // Sort lines by Y position (top to bottom)
  lines.sort((a, b) => b.y - a.y);

  // Group lines into paragraphs
  const blocks = groupLinesIntoParagraphs(lines);

  return blocks.filter(block => block.text.length > 0);
}

// Detect if document has line numbers in margins
function detectLineNumbersInMargins(items: TextItem[], pageWidth: number): MarginDetectionResult {
  const leftThreshold = pageWidth * 0.15;
  const rightThreshold = pageWidth * 0.85;

  let marginNumberCount = 0;

  for (const item of items) {
    const x = item.transform[4];
    const isInMargin = x < leftThreshold || x > rightThreshold;
    const trimmedStr = item.str.trim();

    if (isInMargin && /^\d+$/.test(trimmedStr)) {
      marginNumberCount++;
    }
  }

  // Only filter line numbers if we found at least 20 numbers in margins
  return {
    shouldFilter: marginNumberCount >= 20,
    leftThreshold,
    rightThreshold
  };
}

// Extract lines from PDF items
function extractLines(items: TextItem[], marginInfo: MarginDetectionResult): LineItem[] {
  const lines: LineItem[] = [];
  let currentLine: LineItem | null = null;

  for (const item of items) {
    const x = item.transform[4];
    const y = item.transform[5];
    const fontSize = Math.abs(item.transform[0]); // Approximate font size from transform matrix

    // Skip line numbers if detected
    if (shouldSkipItem(item, x, marginInfo)) {
      continue;
    }

    // Check if this is a new line (vertical position difference > 2)
    if (!currentLine || Math.abs(y - currentLine.y) > 2) {
      // Save previous line if it exists
      if (currentLine && currentLine.text.trim()) {
        lines.push(currentLine);
      }
      // Start new line
      currentLine = {
        text: item.str,
        y: y,
        x: x,
        fontSize: fontSize
      };
    } else {
      // Append to current line
      if (currentLine) {
        currentLine.text = appendToLine(currentLine.text, item.str);
      }
    }
  }

  // Add last line
  if (currentLine && currentLine.text.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

// Check if an item should be skipped (e.g., line number)
function shouldSkipItem(item: TextItem, x: number, marginInfo: MarginDetectionResult): boolean {
  if (!marginInfo.shouldFilter) {
    return false;
  }

  const isInMargin = x < marginInfo.leftThreshold || x > marginInfo.rightThreshold;
  const isLikelyLineNumber = isInMargin && /^\d+$/.test(item.str.trim());

  return isLikelyLineNumber;
}

// Append text to current line with proper spacing
function appendToLine(currentText: string, newText: string): string {
  const needsSpace = currentText && !currentText.endsWith(' ') && !newText.startsWith(' ');
  return currentText + (needsSpace ? ' ' : '') + newText;
}

// Group lines into paragraphs
function groupLinesIntoParagraphs(lines: LineItem[]): Array<{
  text: string;
  isHeading: boolean;
}> {
  const blocks: Array<{ text: string; isHeading: boolean }> = [];
  let currentParagraph: string[] = [];
  let lastY: number | null = null;
  let lastFontSize: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.text.trim();

    if (!text) continue;

    // Detect headings
    const isHeading = detectHeading(text, line.fontSize, lastFontSize);

    // Determine if this starts a new paragraph
    const startsNewParagraph = shouldStartNewParagraph(
      text,
      isHeading,
      line.y,
      lastY,
      currentParagraph
    );

    if (startsNewParagraph && currentParagraph.length > 0) {
      // Save current paragraph
      blocks.push({
        text: joinParagraphLines(currentParagraph),
        isHeading: false
      });
      currentParagraph = [];
    }

    if (isHeading) {
      // Add heading as its own block
      blocks.push({
        text: text,
        isHeading: true
      });
    } else {
      // Add to current paragraph
      currentParagraph.push(text);
    }

    lastY = line.y;
    lastFontSize = line.fontSize;
  }

  // Add remaining paragraph
  if (currentParagraph.length > 0) {
    blocks.push({
      text: joinParagraphLines(currentParagraph),
      isHeading: false
    });
  }

  return blocks;
}

// Determine if a new paragraph should start
function shouldStartNewParagraph(
  text: string,
  isHeading: boolean,
  currentY: number,
  lastY: number | null,
  currentParagraph: string[]
): boolean {
  if (isHeading) return true;
  if (isParagraphBoundary(text)) return true;
  if (lastY !== null && Math.abs(currentY - lastY) > 15) return true; // Large vertical gap

  // Check if previous line ended with punctuation
  if (currentParagraph.length > 0) {
    const lastLine = currentParagraph[currentParagraph.length - 1];
    if (endsWithPunctuation(lastLine)) return true;
  }

  return false;
}

// Helper function to detect headings
function detectHeading(text: string, fontSize: number, lastFontSize: number | null): boolean {
  // Font size change indicates heading
  const fontSizeIndicatesHeading = lastFontSize !== null && fontSize > lastFontSize * 1.2;

  // Pattern-based heading detection
  const patternIndicatesHeading = isHeadingPattern(text);

  return fontSizeIndicatesHeading || patternIndicatesHeading;
}

// Check if text matches common heading patterns
function isHeadingPattern(text: string): boolean {
  if (text.length >= 100) return false; // Too long for a heading

  const headingPatterns = [
    /^\d+\.?\d*\.?\s/, // "1.2.3 Title" or "1. Title"
    /^[A-Z][A-Z\s]{3,}$/, // "ALL CAPS TITLE"
    /^(Chapter|Section|Part|Article|Appendix)\s+\d+/i, // "Chapter 1"
    /^(Introduction|Conclusion|Abstract|Summary|References|Bibliography)$/i, // Common headings
    /^[IVXLCDM]+\.\s/ // Roman numerals "IV. Title"
  ];

  return headingPatterns.some(pattern => pattern.test(text));
}

// Helper function to detect paragraph boundaries
function isParagraphBoundary(text: string): boolean {
  const boundaryPatterns = [
    /^[\•\-\*\d]+[\.\)]\s/, // Bullet points or numbered lists
    /^[a-z]\)\s/, // Lettered lists "a) item"
    /^(Figure|Table|Example)\s/ // Special elements
  ];

  return boundaryPatterns.some(pattern => pattern.test(text));
}

// Helper function to check if line ends with punctuation
function endsWithPunctuation(text: string): boolean {
  return /[.!?:]\s*$/.test(text);
}

// Helper function to join paragraph lines intelligently
function joinParagraphLines(lines: string[]): string {
  if (lines.length === 0) return '';
  if (lines.length === 1) return lines[0];

  let result = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0) {
      result = line;
    } else {
      const prevLine = lines[i - 1];
      result = joinTwoLines(result, prevLine, line);
    }
  }

  // Clean up multiple spaces
  return result.replace(/\s+/g, ' ').trim();
}

// Join two lines handling hyphenation
function joinTwoLines(result: string, prevLine: string, currentLine: string): string {
  if (prevLine.endsWith('-')) {
    // Handle hyphenated words at line breaks
    const lastWord = prevLine.slice(0, -1).split(' ').pop() || '';
    const firstWord = currentLine.split(' ')[0] || '';

    // If it looks like a hyphenated word split across lines, join without space
    if (isHyphenatedWordSplit(lastWord, firstWord)) {
      return result.slice(0, -1) + currentLine; // Remove hyphen and join
    } else {
      return result + ' ' + currentLine; // Keep hyphen, add space
    }
  } else {
    // Normal line join with space
    return result + ' ' + currentLine;
  }
}

// Check if two words form a hyphenated word split
function isHyphenatedWordSplit(lastWord: string, firstWord: string): boolean {
  return (
    lastWord.length > 0 &&
    firstWord.length > 0 &&
    lastWord[0].toLowerCase() === lastWord[0] &&
    firstWord[0].toLowerCase() === firstWord[0]
  );
}

// Enhanced image extraction with better error handling
async function extractImages(page: any): Promise<
  Array<{
    base64: string;
    mimeType: string;
  }>
> {
  const images: Array<{ base64: string; mimeType: string }> = [];

  try {
    const ops = await page.getOperatorList();

    for (let i = 0; i < ops.fnArray.length; i++) {
      const image = await extractSingleImage(page, ops.fnArray[i], ops.argsArray[i]);
      if (image) {
        images.push(image);
      }
    }
  } catch (error) {
    console.debug('Image extraction not available for this PDF:', error);
  }

  return images;
}

// Extract a single image from PDF operations
async function extractSingleImage(
  page: any,
  fn: number,
  args: any[]
): Promise<{ base64: string; mimeType: string } | null> {
  // OPS.paintImageXObject = 82, OPS.paintInlineImageXObject = 83
  if (fn !== 82 && fn !== 83) {
    return null;
  }

  try {
    const imageName = args[0];
    const imageObj = await (page as any).objs.get(imageName);

    if (!imageObj || !imageObj.data || !imageObj.width || !imageObj.height) {
      return null;
    }

    const base64 = await convertImageToBase64(imageObj);
    if (base64) {
      return { base64, mimeType: 'image/png' };
    }
  } catch (e) {
    console.debug('Failed to extract individual image:', e);
  }

  return null;
}

// Convert image object to base64
async function convertImageToBase64(imageObj: any): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = imageObj.width;
  canvas.height = imageObj.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  // Create ImageData object
  const imageData = ctx.createImageData(imageObj.width, imageObj.height);

  // Handle different color spaces
  if (imageObj.data instanceof Uint8ClampedArray) {
    imageData.data.set(imageObj.data);
  } else {
    // Convert to RGBA if needed
    const data = new Uint8ClampedArray(imageObj.data);
    for (let j = 0; j < data.length; j++) {
      imageData.data[j] = data[j];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert to base64
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];

  return base64 || null;
}
