/**
 * PomlReader handles the original POML parsing logic for XML-structured content.
 * This class wraps the existing PomlFile functionality to provide a consistent
 * interface for the extended POML reader system.
 */

import * as React from 'react';
import { PomlFile, PomlReaderOptions } from '../file';

export interface PomlReaderConfig extends PomlReaderOptions {
  sourcePath?: string;
}

export class PomlReader {
  private config: PomlReaderConfig;

  constructor(config: PomlReaderConfig = {}) {
    this.config = {
      trim: true,
      autoAddPoml: true,
      crlfToLf: true,
      ...config
    };
  }

  /**
   * Reads POML content and returns it as a React element
   * @param content The POML content to parse
   * @param startIndex Starting index in the content (optional)
   * @param endIndex Ending index in the content (optional)
   * @param context Optional context variables
   * @returns React element containing parsed POML
   */
  read(
    content: string, 
    startIndex?: number, 
    endIndex?: number, 
    context?: { [key: string]: any }
  ): React.ReactElement {
    let pomlContent = content;
    
    // Extract substring if indices are provided
    if (startIndex !== undefined && endIndex !== undefined) {
      pomlContent = content.substring(startIndex, endIndex + 1);
    } else if (startIndex !== undefined) {
      pomlContent = content.substring(startIndex);
    } else if (endIndex !== undefined) {
      pomlContent = content.substring(0, endIndex + 1);
    }

    // Check if this is a <text> element and handle it specially
    if (this.isTextElement(pomlContent)) {
      return this.handleTextElement(pomlContent);
    }

    try {
      // Use existing PomlFile logic to parse the content
      const pomlFile = new PomlFile(pomlContent, this.config, this.config.sourcePath);
      return pomlFile.react(context);
    } catch (error) {
      // Return error content wrapped in a fragment
      console.error('PomlReader parsing error:', error);
      return React.createElement(
        React.Fragment,
        { key: `error-${startIndex || 0}` },
        `Error parsing POML content: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Checks if content is a <text> element
   * @param content The content to check
   * @returns true if content is a text element
   */
  private isTextElement(content: string): boolean {
    const trimmed = content.trim();
    return trimmed.toLowerCase().startsWith('<text') && trimmed.toLowerCase().endsWith('</text>');
  }

  /**
   * Handles <text> element by extracting its content and returning it as pure text
   * @param content The <text> element content
   * @returns React element with pure text content
   */
  private handleTextElement(content: string): React.ReactElement {
    // Extract content between <text> and </text> tags
    const textMatch = content.match(/<text[^>]*>([\s\S]*)<\/text>/i);
    if (!textMatch) {
      return React.createElement(React.Fragment, {}, content);
    }

    const textContent = textMatch[1];
    
    // Return the text content wrapped in a poml element with text syntax
    return React.createElement(
      'poml',
      { 
        syntax: 'text',
        whiteSpace: 'pre',
        key: 'text-content'
      },
      textContent
    );
  }

  /**
   * Checks if this reader can handle the content at the given index
   * PomlReader handles content that looks like XML/POML
   * @param content The full content string
   * @param index The current index being examined
   * @returns true if content appears to be POML/XML
   */
  canHandle(content: string, index: number): boolean {
    // Look ahead from the current index to see if this looks like XML/POML
    const remainingContent = content.substring(index).trim();
    
    // Check if it starts with an XML tag
    return remainingContent.startsWith('<') && remainingContent.includes('>');
  }

  /**
   * Detects POML elements in content starting from a given index
   * @param content The content to analyze
   * @param startIndex The index to start looking from
   * @returns Object with element info or null if no element found
   */
  detectPomlElement(content: string, startIndex: number): {
    element: string;
    startIndex: number;
    endIndex: number;
  } | null {
    const remainingContent = content.substring(startIndex);
    
    // Find opening tag
    const openTagMatch = remainingContent.match(/^<([a-zA-Z][a-zA-Z0-9-]*)/);
    if (!openTagMatch) {
      return null;
    }

    const elementName = openTagMatch[1];
    const openTagStart = startIndex;
    
    // Find the end of the opening tag
    const openTagEnd = remainingContent.indexOf('>');
    if (openTagEnd === -1) {
      return null;
    }

    // Check if it's a self-closing tag
    if (remainingContent.substring(openTagEnd - 1, openTagEnd + 1) === '/>') {
      return {
        element: elementName,
        startIndex: openTagStart,
        endIndex: startIndex + openTagEnd
      };
    }

    // Find matching closing tag
    const closingTag = `</${elementName}>`;
    let depth = 1;
    let searchIndex = openTagEnd + 1;
    
    while (depth > 0 && searchIndex < remainingContent.length) {
      const nextOpen = remainingContent.indexOf(`<${elementName}`, searchIndex);
      const nextClose = remainingContent.indexOf(closingTag, searchIndex);
      
      if (nextClose === -1) {
        // No closing tag found
        return null;
      }
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Found another opening tag before the closing tag
        const nextOpenEnd = remainingContent.indexOf('>', nextOpen);
        if (nextOpenEnd !== -1 && remainingContent.substring(nextOpenEnd - 1, nextOpenEnd + 1) !== '/>') {
          depth++;
        }
        searchIndex = nextOpen + elementName.length + 1;
      } else {
        // Found closing tag
        depth--;
        if (depth === 0) {
          return {
            element: elementName,
            startIndex: openTagStart,
            endIndex: startIndex + nextClose + closingTag.length - 1
          };
        }
        searchIndex = nextClose + closingTag.length;
      }
    }

    return null;
  }

  /**
   * Creates a PomlReader with specific configuration
   * @param options Configuration options
   * @returns Configured PomlReader instance
   */
  static create(options: PomlReaderConfig = {}): PomlReader {
    return new PomlReader(options);
  }
}