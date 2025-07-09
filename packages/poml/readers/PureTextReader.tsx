/**
 * PureTextReader handles reading and processing of pure text content 
 * without any POML parsing. It preserves formatting and returns content
 * wrapped in appropriate React elements.
 */

import * as React from 'react';

export interface PureTextReaderOptions {
  preserveWhitespace?: boolean;
  syntax?: 'text' | 'markdown';
}

export class PureTextReader {
  private options: PureTextReaderOptions;

  constructor(options: PureTextReaderOptions = {}) {
    this.options = {
      preserveWhitespace: true,
      syntax: 'text',
      ...options
    };
  }

  /**
   * Reads pure text content and returns it wrapped in a React element
   * @param content The text content to read
   * @param startIndex Starting index in the content (optional)
   * @param endIndex Ending index in the content (optional)
   * @returns React element containing the text content
   */
  read(content: string, startIndex?: number, endIndex?: number): React.ReactElement {
    let textContent = content;
    
    // Extract substring if indices are provided
    if (startIndex !== undefined && endIndex !== undefined) {
      textContent = content.substring(startIndex, endIndex + 1);
    } else if (startIndex !== undefined) {
      textContent = content.substring(startIndex);
    } else if (endIndex !== undefined) {
      textContent = content.substring(0, endIndex + 1);
    }

    // Determine the syntax based on options
    const syntax = this.options.syntax;
    const whiteSpace = this.options.preserveWhitespace ? 'pre' : undefined;

    // Return text wrapped in appropriate element
    // Using React.createElement to create a text element with proper syntax
    return React.createElement(
      'poml',
      { 
        syntax,
        whiteSpace,
        key: `text-${startIndex || 0}-${endIndex || content.length}`
      },
      textContent
    );
  }

  /**
   * Checks if this reader can handle the content at the given index
   * PureTextReader can handle any content, but it's typically used as a fallback
   * @param content The full content string
   * @param index The current index being examined
   * @returns Always true for PureTextReader
   */
  canHandle(content: string, index: number): boolean {
    return true; // PureTextReader can handle any content as fallback
  }

  /**
   * Detects if the content appears to be markdown
   * @param content The content to analyze
   * @returns true if content appears to be markdown
   */
  static isMarkdown(content: string): boolean {
    // Simple heuristics to detect markdown
    const markdownPatterns = [
      /^#+\s+/m,           // Headers
      /^\*\s+/m,           // Unordered lists
      /^\d+\.\s+/m,        // Ordered lists
      /\*\*.+\*\*/,        // Bold text
      /\*.+\*/,            // Italic text
      /\[.+\]\(.+\)/,      // Links
      /^```/m,             // Code blocks
      /^>/m,               // Blockquotes
      /^\|.+\|/m,          // Tables
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Creates a PureTextReader with appropriate options based on content analysis
   * @param content The content to analyze
   * @returns Configured PureTextReader instance
   */
  static createForContent(content: string): PureTextReader {
    const isMarkdown = PureTextReader.isMarkdown(content);
    
    return new PureTextReader({
      syntax: isMarkdown ? 'markdown' : 'text',
      preserveWhitespace: true
    });
  }
}