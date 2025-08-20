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
  return targetUrl.toLowerCase().includes('.pdf') || document.contentType === 'application/pdf';
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

// Types
interface LineItem {
  text: string;
  y: number;
  x: number;
  fontSize: number;
  width: number;
}

interface TextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

interface PageNumberDetectionResult {
  shouldFilter: boolean;
  pattern: 'top' | 'bottom' | 'both' | null;
  yThresholdTop?: number;
  yThresholdBottom?: number;
}

interface ContentBlock {
  type: 'text' | 'image' | 'vector';
  y: number; // vertical position for ordering
  x: number; // horizontal position
  width?: number;
  height?: number;
  content: any; // Text block or image data
}

interface TextBlock {
  text: string;
  isHeading: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageBlock {
  base64: string;
  mimeType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isVector?: boolean;
}

/**
 * Extracts structured content from a PDF document with proper image/text interleaving
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

    // Process all pages and collect content blocks
    const allCards: CardModelSlim[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      // Extract all content blocks with positions
      const contentBlocks = await extractPageContent(page, viewport);

      // Sort blocks by position (top to bottom, left to right)
      contentBlocks.sort((a, b) => {
        // First sort by Y position (with some tolerance for same line)
        const yDiff = b.y - a.y; // Note: PDF Y coordinates are bottom-up
        if (Math.abs(yDiff) > 5) return yDiff;
        // Then by X position for items on same line
        return a.x - b.x;
      });

      // Convert blocks to cards
      for (const block of contentBlocks) {
        if (block.type === 'text') {
          const textBlock = block.content as TextBlock;
          if (textBlock.text.trim()) {
            allCards.push({
              content: { type: 'text', value: textBlock.text } as TextContent,
              componentType: textBlock.isHeading ? 'Header' : 'Paragraph'
            });
          }
        } else if (block.type === 'image' || block.type === 'vector') {
          const imageBlock = block.content as ImageBlock;
          allCards.push({
            content: {
              type: 'binary',
              value: imageBlock.base64,
              mimeType: imageBlock.mimeType,
              encoding: 'base64'
            } as BinaryContent,
            componentType: 'Image'
          });
        }
      }

      notifyDebug(`Processed page ${pageNum}/${pageCount}`, {
        contentBlocks: contentBlocks.length
      });
    }

    notifyInfo('PDF extraction completed', { cardsCount: allCards.length, pages: pageCount });

    // Convert slim cards to full CardModel objects
    const timestamp = new Date();
    const finalCards =
      allCards.length > 0
        ? allCards
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

/**
 * Extract page content with enhanced graphics region extraction
 */
async function extractPageContent(page: any, viewport: any): Promise<ContentBlock[]> {
  const contentBlocks: ContentBlock[] = [];

  // First, detect graphics regions to use for text filtering
  const graphicsRegions = await detectGraphicsRegions(page);
  
  // Extract text with filtering for embedded graphics text
  const textBlocks = await extractTextBlocks(page, viewport, graphicsRegions);
  for (const textBlock of textBlocks) {
    contentBlocks.push({
      type: 'text',
      y: textBlock.y,
      x: textBlock.x,
      width: textBlock.width,
      height: textBlock.height,
      content: textBlock
    });
  }

  // Extract images and rendered graphics regions
  const imageBlocks = await extractImagesWithPositions(page, viewport);
  for (const imageBlock of imageBlocks) {
    contentBlocks.push({
      type: imageBlock.isVector ? 'vector' : 'image',
      y: imageBlock.y,
      x: imageBlock.x,
      width: imageBlock.width,
      height: imageBlock.height,
      content: imageBlock
    });
  }

  return contentBlocks;
}

/**
 * Enhanced text extraction with better filtering
 */
async function extractTextBlocks(page: any, viewport: any, graphicsRegions?: Array<{x: number, y: number, width: number, height: number}>): Promise<TextBlock[]> {
  const textContent = await page.getTextContent();
  const items = textContent.items as TextItem[];

  if (items.length === 0) {
    notifyDebug('No text items found in page');
    return [];
  }

  // Use provided graphics regions or detect them
  const regions = graphicsRegions || await detectGraphicsRegions(page);
  
  // Detect page numbers
  const pageNumberInfo = detectPageNumbers(items, viewport);

  // Filter and extract lines
  const lines = extractFilteredLines(items, viewport, pageNumberInfo, regions);

  // Group into text blocks with position info
  const blocks = groupLinesIntoBlocks(lines, viewport);

  return blocks;
}

/**
 * Detect regions that contain vector graphics or embedded images
 */
async function detectGraphicsRegions(page: any): Promise<Array<{x: number, y: number, width: number, height: number}>> {
  const regions: Array<{x: number, y: number, width: number, height: number}> = [];
  
  try {
    const operators = await page.getOperatorList();
    const viewport = page.getViewport({ scale: 1.0 });
    
    // Track graphics state
    let graphicsStack: any[] = [];
    let currentGraphics: {
      paths: any[];
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
      hasContent: boolean;
    } | null = null;
    
    // OPS enum values
    const OPS = {
      save: 91,
      restore: 92,
      transform: 44,
      moveTo: 13,
      lineTo: 14,
      curveTo: 15,
      curveTo2: 16,
      curveTo3: 17,
      closePath: 9,
      rectangle: 83,
      stroke: 84,
      fill: 85,
      fillStroke: 86,
      beginText: 11,
      endText: 12,
      clip: 7,
      eoClip: 8,
      paintImageXObject: 82,
      paintInlineImageXObject: 83,
      constructPath: 56
    };
    
    let inTextBlock = false;
    let pathDepth = 0;
    
    for (let i = 0; i < operators.fnArray.length; i++) {
      const fn = operators.fnArray[i];
      const args = operators.argsArray[i];
      
      // Track text blocks to avoid including them
      if (fn === OPS.beginText) {
        inTextBlock = true;
        continue;
      } else if (fn === OPS.endText) {
        inTextBlock = false;
        continue;
      }
      
      // Skip if we're in a text block
      if (inTextBlock) continue;
      
      // Handle save/restore for graphics state
      if (fn === OPS.save) {
        if (currentGraphics && currentGraphics.hasContent) {
          graphicsStack.push(currentGraphics);
        }
        currentGraphics = {
          paths: [],
          minX: Infinity,
          minY: Infinity,
          maxX: -Infinity,
          maxY: -Infinity,
          hasContent: false
        };
        pathDepth++;
      } else if (fn === OPS.restore) {
        pathDepth = Math.max(0, pathDepth - 1);
        
        // If we have a complete graphics region, add it
        if (currentGraphics && currentGraphics.hasContent && 
            currentGraphics.minX !== Infinity) {
          const region = {
            x: currentGraphics.minX,
            y: currentGraphics.minY,
            width: currentGraphics.maxX - currentGraphics.minX,
            height: currentGraphics.maxY - currentGraphics.minY
          };
          
          // Only add meaningful regions (not too small)
          if (region.width > 5 && region.height > 5) {
            regions.push(region);
          }
        }
        
        currentGraphics = graphicsStack.pop() || null;
      }
      
      // Track path operations to find graphics bounds
      if (currentGraphics) {
        if (fn === OPS.moveTo || fn === OPS.lineTo) {
          if (args && args.length >= 2) {
            updateBounds(currentGraphics, args[0], args[1]);
            currentGraphics.hasContent = true;
          }
        } else if (fn === OPS.curveTo || fn === OPS.curveTo2 || fn === OPS.curveTo3) {
          if (args && args.length >= 2) {
            // For curves, check all control points
            for (let j = 0; j < args.length; j += 2) {
              if (j + 1 < args.length) {
                updateBounds(currentGraphics, args[j], args[j + 1]);
              }
            }
            currentGraphics.hasContent = true;
          }
        } else if (fn === OPS.rectangle) {
          if (args && args.length >= 4) {
            const [x, y, width, height] = args;
            updateBounds(currentGraphics, x, y);
            updateBounds(currentGraphics, x + width, y + height);
            currentGraphics.hasContent = true;
          }
        } else if (fn === OPS.constructPath) {
          // Handle complex path construction
          if (args && args[0] && Array.isArray(args[0])) {
            const ops = args[0];
            const data = args[1];
            let dataIndex = 0;
            
            for (const op of ops) {
              switch (op) {
                case OPS.moveTo:
                case OPS.lineTo:
                  if (dataIndex + 1 < data.length) {
                    updateBounds(currentGraphics, data[dataIndex], data[dataIndex + 1]);
                    dataIndex += 2;
                    currentGraphics.hasContent = true;
                  }
                  break;
                case OPS.curveTo:
                  if (dataIndex + 5 < data.length) {
                    for (let k = 0; k < 6; k += 2) {
                      updateBounds(currentGraphics, data[dataIndex + k], data[dataIndex + k + 1]);
                    }
                    dataIndex += 6;
                    currentGraphics.hasContent = true;
                  }
                  break;
                case OPS.rectangle:
                  if (dataIndex + 3 < data.length) {
                    const x = data[dataIndex];
                    const y = data[dataIndex + 1];
                    const w = data[dataIndex + 2];
                    const h = data[dataIndex + 3];
                    updateBounds(currentGraphics, x, y);
                    updateBounds(currentGraphics, x + w, y + h);
                    dataIndex += 4;
                    currentGraphics.hasContent = true;
                  }
                  break;
                case OPS.closePath:
                  // No data consumed
                  break;
              }
            }
          }
        } else if (fn === OPS.stroke || fn === OPS.fill || fn === OPS.fillStroke) {
          // These operations indicate actual drawing
          if (currentGraphics) {
            currentGraphics.hasContent = true;
          }
        }
      }
    }
    
    // Add any remaining graphics region
    if (currentGraphics && currentGraphics.hasContent && 
        currentGraphics.minX !== Infinity) {
      const region = {
        x: currentGraphics.minX,
        y: currentGraphics.minY,
        width: currentGraphics.maxX - currentGraphics.minX,
        height: currentGraphics.maxY - currentGraphics.minY
      };
      
      if (region.width > 5 && region.height > 5) {
        regions.push(region);
      }
    }
    
    // Merge overlapping regions
    const mergedRegions = mergeOverlappingRegions(regions);
    
    notifyDebug('Graphics regions detected', {
      rawCount: regions.length,
      mergedCount: mergedRegions.length,
      samples: mergedRegions.slice(0, 3).map(r => ({
        x: r.x.toFixed(1),
        y: r.y.toFixed(1),
        w: r.width.toFixed(1),
        h: r.height.toFixed(1)
      }))
    });
    
    return mergedRegions;
  } catch (error) {
    notifyDebug('Could not detect graphics regions', error);
  }
  
  return regions;
}

/**
 * Update bounds for a graphics region
 */
function updateBounds(graphics: any, x: number, y: number): void {
  graphics.minX = Math.min(graphics.minX, x);
  graphics.minY = Math.min(graphics.minY, y);
  graphics.maxX = Math.max(graphics.maxX, x);
  graphics.maxY = Math.max(graphics.maxY, y);
}

/**
 * Merge overlapping regions to avoid duplicates
 */
function mergeOverlappingRegions(
  regions: Array<{x: number, y: number, width: number, height: number}>
): Array<{x: number, y: number, width: number, height: number}> {
  if (regions.length <= 1) return regions;
  
  const merged: Array<{x: number, y: number, width: number, height: number}> = [];
  const used = new Set<number>();
  
  for (let i = 0; i < regions.length; i++) {
    if (used.has(i)) continue;
    
    let current = { ...regions[i] };
    let didMerge = true;
    
    while (didMerge) {
      didMerge = false;
      
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue;
        
        if (regionsOverlap(current, regions[j])) {
          // Merge regions
          const minX = Math.min(current.x, regions[j].x);
          const minY = Math.min(current.y, regions[j].y);
          const maxX = Math.max(current.x + current.width, regions[j].x + regions[j].width);
          const maxY = Math.max(current.y + current.height, regions[j].y + regions[j].height);
          
          current = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          };
          
          used.add(j);
          didMerge = true;
        }
      }
    }
    
    merged.push(current);
  }
  
  return merged;
}

/**
 * Check if two regions overlap
 */
function regionsOverlap(
  r1: {x: number, y: number, width: number, height: number},
  r2: {x: number, y: number, width: number, height: number}
): boolean {
  return !(r1.x + r1.width < r2.x || 
           r2.x + r2.width < r1.x || 
           r1.y + r1.height < r2.y || 
           r2.y + r2.height < r1.y);
}

/**
 * Detect page numbers in the document
 */
function detectPageNumbers(items: TextItem[], viewport: any): PageNumberDetectionResult {
  const pageHeight = viewport.height;
  const topThreshold = pageHeight * 0.9; // Top 10% of page
  const bottomThreshold = pageHeight * 0.1; // Bottom 10% of page
  
  let topNumbers = 0;
  let bottomNumbers = 0;
  const pageNumberCandidates: Array<{text: string, y: number}> = [];

  for (const item of items) {
    const y = item.transform[5];
    const text = item.str.trim();
    
    // Check if it looks like a page number
    if (isLikelyPageNumber(text)) {
      if (y > topThreshold) {
        topNumbers++;
        pageNumberCandidates.push({text, y});
      } else if (y < bottomThreshold) {
        bottomNumbers++;
        pageNumberCandidates.push({text, y});
      }
    }
  }

  // Determine pattern
  let pattern: 'top' | 'bottom' | 'both' | null = null;
  if (topNumbers > 0 && bottomNumbers > 0) pattern = 'both';
  else if (topNumbers > 0) pattern = 'top';
  else if (bottomNumbers > 0) pattern = 'bottom';

  const shouldFilter = pattern !== null;

  notifyDebug('Page number detection', {
    pattern,
    topNumbers,
    bottomNumbers,
    candidates: pageNumberCandidates.slice(0, 3)
  });

  return {
    shouldFilter,
    pattern,
    yThresholdTop: topThreshold,
    yThresholdBottom: bottomThreshold
  };
}

/**
 * Check if text is likely a page number
 */
function isLikelyPageNumber(text: string): boolean {
  // Simple page number
  if (/^\d{1,4}$/.test(text)) return true;
  
  // Page number with prefix/suffix: "Page 1", "- 1 -", "1 of 10"
  if (/^(Page\s+)?\d{1,4}(\s+of\s+\d{1,4})?$/i.test(text)) return true;
  if (/^[-–—]\s*\d{1,4}\s*[-–—]$/.test(text)) return true;
  
  // Roman numerals
  if (/^[ivxlcdm]+$/i.test(text) && text.length <= 10) return true;
  
  return false;
}

/**
 * Extract lines with filtering
 */
function extractFilteredLines(
  items: TextItem[], 
  viewport: any,
  pageNumberInfo: PageNumberDetectionResult,
  graphicsRegions: Array<{x: number, y: number, width: number, height: number}>
): LineItem[] {
  const lines: LineItem[] = [];
  let currentLine: LineItem | null = null;

  for (const item of items) {
    const x = item.transform[4];
    const y = item.transform[5];
    const fontSize = Math.abs(item.transform[0]);
    
    // Skip if it's a page number
    if (shouldSkipAsPageNumber(item, y, pageNumberInfo)) {
      continue;
    }
    
    // Skip if it's inside a graphics region (likely embedded text)
    if (isInsideGraphicsRegion(x, y, graphicsRegions)) {
      notifyDebug('Skipping text in graphics region', { text: item.str.substring(0, 20) });
      continue;
    }

    // Check if this is a new line
    if (!currentLine || Math.abs(y - currentLine.y) > 2) {
      if (currentLine && currentLine.text.trim()) {
        lines.push(currentLine);
      }
      currentLine = {
        text: item.str,
        y: y,
        x: x,
        fontSize: fontSize,
        width: item.width || 0
      };
    } else {
      // Append to current line
      if (currentLine) {
        currentLine.text = appendToLine(currentLine.text, item.str);
        currentLine.width += item.width || 0;
      }
    }
  }

  // Add last line
  if (currentLine && currentLine.text.trim()) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Check if text should be skipped as page number
 */
function shouldSkipAsPageNumber(item: TextItem, y: number, pageNumberInfo: PageNumberDetectionResult): boolean {
  if (!pageNumberInfo.shouldFilter) return false;
  
  const text = item.str.trim();
  if (!isLikelyPageNumber(text)) return false;
  
  if (pageNumberInfo.pattern === 'top' && pageNumberInfo.yThresholdTop && y > pageNumberInfo.yThresholdTop) {
    return true;
  }
  if (pageNumberInfo.pattern === 'bottom' && pageNumberInfo.yThresholdBottom && y < pageNumberInfo.yThresholdBottom) {
    return true;
  }
  if (pageNumberInfo.pattern === 'both') {
    if ((pageNumberInfo.yThresholdTop && y > pageNumberInfo.yThresholdTop) ||
        (pageNumberInfo.yThresholdBottom && y < pageNumberInfo.yThresholdBottom)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if position is inside a graphics region
 */
function isInsideGraphicsRegion(
  x: number, 
  y: number, 
  regions: Array<{x: number, y: number, width: number, height: number}>
): boolean {
  for (const region of regions) {
    if (x >= region.x && x <= region.x + region.width &&
        y >= region.y && y <= region.y + region.height) {
      return true;
    }
  }
  return false;
}

/**
 * Group lines into text blocks with position information
 */
function groupLinesIntoBlocks(lines: LineItem[], viewport: any): TextBlock[] {
  const blocks: TextBlock[] = [];
  let currentParagraph: LineItem[] = [];
  let lastY: number | null = null;
  let lastFontSize: number | null = null;

  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;

    const isHeading = detectHeading(text, line.fontSize, lastFontSize);
    const startsNewParagraph = shouldStartNewParagraph(
      text,
      isHeading,
      line.y,
      lastY,
      currentParagraph
    );

    if (startsNewParagraph && currentParagraph.length > 0) {
      // Create block from current paragraph
      const block = createTextBlock(currentParagraph, false);
      if (block) blocks.push(block);
      currentParagraph = [];
    }

    if (isHeading) {
      // Add heading as its own block
      blocks.push(createTextBlock([line], true)!);
    } else {
      currentParagraph.push(line);
    }

    lastY = line.y;
    lastFontSize = line.fontSize;
  }

  // Add remaining paragraph
  if (currentParagraph.length > 0) {
    const block = createTextBlock(currentParagraph, false);
    if (block) blocks.push(block);
  }

  return blocks;
}

/**
 * Create a text block from lines
 */
function createTextBlock(lines: LineItem[], isHeading: boolean): TextBlock | null {
  if (lines.length === 0) return null;
  
  const text = joinParagraphLines(lines.map(l => l.text));
  if (!text.trim()) return null;
  
  // Calculate bounding box
  const minX = Math.min(...lines.map(l => l.x));
  const maxX = Math.max(...lines.map(l => l.x + l.width));
  const minY = Math.min(...lines.map(l => l.y));
  const maxY = Math.max(...lines.map(l => l.y));
  
  return {
    text,
    isHeading,
    x: minX,
    y: (minY + maxY) / 2, // Use center Y for sorting
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Extract images with their positions on the page
 */
async function extractImagesWithPositions(page: any, viewport: any): Promise<ImageBlock[]> {
  const images: ImageBlock[] = [];

  try {
    // First extract regular raster images
    const rasterImages = await extractRasterImages(page, viewport);
    images.push(...rasterImages);
    
    // Then extract graphics regions as images
    const graphicsRegions = await detectGraphicsRegions(page);
    
    // Render each graphics region to an image
    for (const region of graphicsRegions) {
      // Skip very small regions or regions that overlap with raster images
      if (region.width < 10 || region.height < 10) continue;
      
      // Check if this region overlaps with a raster image (to avoid duplicates)
      const overlapsWithRaster = rasterImages.some(img => 
        regionsOverlap(region, {
          x: img.x,
          y: img.y,
          width: img.width,
          height: img.height
        })
      );
      
      if (overlapsWithRaster) continue;
      
      // Render the region to canvas
      const graphicImage = await renderGraphicsRegion(page, region, viewport);
      if (graphicImage) {
        images.push(graphicImage);
      }
    }
    
    notifyDebug('Total images extracted', {
      rasterCount: rasterImages.length,
      graphicsCount: images.length - rasterImages.length,
      total: images.length
    });
  } catch (error) {
    notifyDebug('Image extraction error:', error);
  }

  return images;
}

/**
 * Extract raster images from the page
 */
async function extractRasterImages(page: any, viewport: any): Promise<ImageBlock[]> {
  const images: ImageBlock[] = [];
  
  try {
    const operators = await page.getOperatorList();
    let currentTransform = [1, 0, 0, 1, 0, 0];
    
    for (let i = 0; i < operators.fnArray.length; i++) {
      const fn = operators.fnArray[i];
      const args = operators.argsArray[i];
      
      // Update transformation matrix
      if (fn === 44) { // OPS.transform
        currentTransform = multiplyTransforms(currentTransform, args[0]);
      }
      
      // Extract images with position
      if (fn === 82 || fn === 83) { // paintImageXObject or paintInlineImageXObject
        const image = await extractSingleImageWithPosition(
          page, 
          fn, 
          args, 
          currentTransform,
          viewport
        );
        if (image) {
          images.push(image);
        }
      }
    }
  } catch (error) {
    notifyDebug('Raster image extraction error:', error);
  }
  
  return images;
}

/**
 * Render a graphics region to a PNG image
 */
async function renderGraphicsRegion(
  page: any, 
  region: {x: number, y: number, width: number, height: number},
  viewport: any
): Promise<ImageBlock | null> {
  try {
    // Create a canvas for the specific region
    const scale = 2; // Higher scale for better quality
    const canvas = document.createElement('canvas');
    canvas.width = region.width * scale;
    canvas.height = region.height * scale;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return null;
    
    // Set up the rendering context
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Create a custom viewport for this region
    const customViewport = page.getViewport({
      scale: scale,
      offsetX: -region.x * scale,
      offsetY: -region.y * scale
    });
    
    // Render the page region to canvas
    const renderContext = {
      canvasContext: ctx,
      viewport: customViewport,
      // Only render the specific region
      transform: [scale, 0, 0, scale, -region.x * scale, -region.y * scale]
    };
    
    // Use a timeout to prevent hanging on complex graphics
    const renderTask = page.render(renderContext);
    await Promise.race([
      renderTask.promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Render timeout')), 5000)
      )
    ]);
    
    // Convert to base64
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    
    if (!base64) return null;
    
    return {
      base64,
      mimeType: 'image/png',
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      isVector: true
    };
  } catch (error) {
    notifyDebug('Failed to render graphics region', error);
    return null;
  }
}

/**
 * Extract single image with position information
 */
async function extractSingleImageWithPosition(
  page: any,
  fn: number,
  args: any[],
  transform: number[],
  viewport: any
): Promise<ImageBlock | null> {
  try {
    const imageName = args[0];
    const imageObj = await (page as any).objs.get(imageName);

    if (!imageObj || !imageObj.data || !imageObj.width || !imageObj.height) {
      return null;
    }

    const base64 = await convertImageToBase64(imageObj);
    if (!base64) return null;

    // Calculate position from transform matrix
    const x = transform[4];
    const y = transform[5];
    const width = imageObj.width * Math.abs(transform[0]);
    const height = imageObj.height * Math.abs(transform[3]);

    return {
      base64,
      mimeType: 'image/png',
      x,
      y,
      width,
      height,
      isVector: false
    };
  } catch (e) {
    notifyDebug('Failed to extract image with position:', e);
    return null;
  }
}

/**
 * Multiply transformation matrices
 */
function multiplyTransforms(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5]
  ];
}

// Helper functions (keeping the good ones from original)

function appendToLine(currentText: string, newText: string): string {
  const needsSpace = currentText && !currentText.endsWith(' ') && !newText.startsWith(' ');
  return currentText + (needsSpace ? ' ' : '') + newText;
}

function detectHeading(text: string, fontSize: number, lastFontSize: number | null): boolean {
  const fontSizeIndicatesHeading = lastFontSize !== null && fontSize > lastFontSize * 1.2;
  const patternIndicatesHeading = isHeadingPattern(text);
  return fontSizeIndicatesHeading || patternIndicatesHeading;
}

function isHeadingPattern(text: string): boolean {
  if (text.length >= 100) return false;

  const headingPatterns = [
    /^\d+\.?\d*\.?\s/,
    /^[A-Z][A-Z\s]{3,}$/,
    /^(Chapter|Section|Part|Article|Appendix)\s+\d+/i,
    /^(Introduction|Conclusion|Abstract|Summary|References|Bibliography)$/i,
    /^[IVXLCDM]+\.\s/
  ];

  return headingPatterns.some(pattern => pattern.test(text));
}

function shouldStartNewParagraph(
  text: string,
  isHeading: boolean,
  currentY: number,
  lastY: number | null,
  currentParagraph: LineItem[]
): boolean {
  if (isHeading) return true;
  if (isParagraphBoundary(text)) return true;
  if (lastY !== null && Math.abs(currentY - lastY) > 15) return true;

  if (currentParagraph.length > 0) {
    const lastLine = currentParagraph[currentParagraph.length - 1];
    if (endsWithPunctuation(lastLine.text)) return true;
  }

  return false;
}

function isParagraphBoundary(text: string): boolean {
  const boundaryPatterns = [
    /^[\•\-\*\d]+[\.\)]\s/,
    /^[a-z]\)\s/,
    /^(Figure|Table|Example)\s/
  ];

  return boundaryPatterns.some(pattern => pattern.test(text));
}

function endsWithPunctuation(text: string): boolean {
  return /[.!?:]\s*$/.test(text);
}

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

  return result.replace(/\s+/g, ' ').trim();
}

function joinTwoLines(result: string, prevLine: string, currentLine: string): string {
  if (prevLine.endsWith('-')) {
    const lastWord = prevLine.slice(0, -1).split(' ').pop() || '';
    const firstWord = currentLine.split(' ')[0] || '';

    if (isHyphenatedWordSplit(lastWord, firstWord)) {
      return result.slice(0, -1) + currentLine;
    } else {
      return result + ' ' + currentLine;
    }
  } else {
    return result + ' ' + currentLine;
  }
}

function isHyphenatedWordSplit(lastWord: string, firstWord: string): boolean {
  return (
    lastWord.length > 0 &&
    firstWord.length > 0 &&
    lastWord[0].toLowerCase() === lastWord[0] &&
    firstWord[0].toLowerCase() === firstWord[0]
  );
}

async function convertImageToBase64(imageObj: any): Promise<string | null> {
  const canvas = document.createElement('canvas');
  canvas.width = imageObj.width;
  canvas.height = imageObj.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const imageData = ctx.createImageData(imageObj.width, imageObj.height);

  if (imageObj.data instanceof Uint8ClampedArray) {
    imageData.data.set(imageObj.data);
  } else {
    const data = new Uint8ClampedArray(imageObj.data);
    for (let j = 0; j < data.length; j++) {
      imageData.data[j] = data[j];
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];

  return base64 || null;
}