/**
 * ExtendedPomlReader orchestrates between PureTextReader and PomlReader
 * to handle mixed content files that contain both pure text and POML elements.
 */

import * as React from 'react';
import { PureTextReader } from './PureTextReader';
import { PomlReader, PomlReaderConfig } from './PomlReader';
import { listComponents } from '../base';
import componentDocsJson from '../assets/componentDocs.json';

export interface ExtendedPomlReaderOptions extends PomlReaderConfig {
  defaultTextSyntax?: 'text' | 'markdown';
  preserveWhitespace?: boolean;
}

interface ContentSegment {
  type: 'text' | 'poml';
  content: string;
  startIndex: number;
  endIndex: number;
  element?: string;
}

export class ExtendedPomlReader {
  private options: ExtendedPomlReaderOptions;
  private pureTextReader: PureTextReader;
  private pomlReader: PomlReader;
  private componentRegistry: Set<string>;

  constructor(options: ExtendedPomlReaderOptions = {}) {
    this.options = {
      defaultTextSyntax: 'markdown',
      preserveWhitespace: true,
      ...options
    };

    this.pureTextReader = new PureTextReader({
      syntax: this.options.defaultTextSyntax,
      preserveWhitespace: this.options.preserveWhitespace
    });

    this.pomlReader = new PomlReader(this.options);
    this.componentRegistry = this.buildComponentRegistry();
  }

  /**
   * Builds a registry of valid POML component names from componentDocs.json
   * @returns Set of valid component names and aliases
   */
  private buildComponentRegistry(): Set<string> {
    const registry = new Set<string>();
    
    // Add components from componentDocs.json
    for (const component of componentDocsJson) {
      registry.add(component.name.toLowerCase());
    }

    // Add components from runtime registry
    try {
      for (const component of listComponents()) {
        registry.add(component.name.toLowerCase());
        // Add aliases
        for (const alias of component.getAliases()) {
          registry.add(alias.toLowerCase());
        }
      }
    } catch (error) {
      console.warn('Could not load runtime component registry:', error);
    }

    // Add built-in elements
    const builtInElements = ['poml', 'text', 'include', 'let'];
    for (const element of builtInElements) {
      registry.add(element.toLowerCase());
    }

    return registry;
  }

  /**
   * Main entry point for reading mixed content
   * @param content The full content to process
   * @param context Optional context variables
   * @returns React element containing the processed content
   */
  read(content: string, context?: { [key: string]: any }): React.ReactElement {
    // Check if this is a traditional POML file (starts with <poml>)
    const trimmedContent = content.trim();
    if (trimmedContent.toLowerCase().startsWith('<poml')) {
      return this.pomlReader.read(content, undefined, undefined, context);
    }

    // Detect and segment the mixed content
    const segments = this.segmentContent(content);
    
    if (segments.length === 0) {
      // No content, return empty fragment
      return React.createElement(React.Fragment);
    }

    if (segments.length === 1 && segments[0].type === 'text') {
      // Pure text content, use PureTextReader
      return this.pureTextReader.read(content);
    }

    // Mixed content - process each segment
    const processedSegments = segments.map((segment, index) => {
      const key = `segment-${index}-${segment.type}`;
      
      if (segment.type === 'text') {
        return React.cloneElement(
          this.pureTextReader.read(segment.content),
          { key }
        );
      } else {
        return React.cloneElement(
          this.pomlReader.read(segment.content, undefined, undefined, context),
          { key }
        );
      }
    });

    // Return all segments in a fragment
    return React.createElement(React.Fragment, {}, ...processedSegments);
  }

  /**
   * Segments content into text and POML parts
   * @param content The content to segment
   * @returns Array of content segments
   */
  private segmentContent(content: string): ContentSegment[] {
    const segments: ContentSegment[] = [];
    let currentIndex = 0;

    while (currentIndex < content.length) {
      // Look for the next POML element
      const pomlElement = this.findNextPomlElement(content, currentIndex);
      
      if (!pomlElement) {
        // No more POML elements, rest is text
        if (currentIndex < content.length) {
          segments.push({
            type: 'text',
            content: content.substring(currentIndex),
            startIndex: currentIndex,
            endIndex: content.length - 1
          });
        }
        break;
      }

      // Add text segment before POML element (if any)
      if (pomlElement.startIndex > currentIndex) {
        segments.push({
          type: 'text',
          content: content.substring(currentIndex, pomlElement.startIndex),
          startIndex: currentIndex,
          endIndex: pomlElement.startIndex - 1
        });
      }

      // Add POML segment
      segments.push({
        type: 'poml',
        content: content.substring(pomlElement.startIndex, pomlElement.endIndex + 1),
        startIndex: pomlElement.startIndex,
        endIndex: pomlElement.endIndex,
        element: pomlElement.element
      });

      currentIndex = pomlElement.endIndex + 1;
    }

    return segments;
  }

  /**
   * Finds the next POML element in the content starting from a given index
   * @param content The content to search
   * @param startIndex The index to start searching from
   * @returns Element info or null if none found
   */
  private findNextPomlElement(content: string, startIndex: number): {
    element: string;
    startIndex: number;
    endIndex: number;
  } | null {
    const searchContent = content.substring(startIndex);
    
    // Find opening tag pattern
    const tagPattern = /<([a-zA-Z][a-zA-Z0-9-]*)/g;
    let match;
    
    while ((match = tagPattern.exec(searchContent)) !== null) {
      const elementName = match[1];
      const absoluteStartIndex = startIndex + match.index;
      
      // Check if this is a valid POML component
      if (!this.isValidPomlElement(elementName)) {
        continue;
      }

      // Find the complete element boundaries
      const elementBounds = this.findElementBounds(content, absoluteStartIndex, elementName);
      if (elementBounds) {
        return {
          element: elementName,
          startIndex: elementBounds.startIndex,
          endIndex: elementBounds.endIndex
        };
      }
    }

    return null;
  }

  /**
   * Checks if an element name is a valid POML component
   * @param elementName The element name to check
   * @returns true if it's a valid POML element
   */
  private isValidPomlElement(elementName: string): boolean {
    return this.componentRegistry.has(elementName.toLowerCase());
  }

  /**
   * Finds the complete bounds of an element including its closing tag
   * @param content The full content
   * @param startIndex The start index of the opening tag
   * @param elementName The element name
   * @returns Element bounds or null if not found
   */
  private findElementBounds(content: string, startIndex: number, elementName: string): {
    startIndex: number;
    endIndex: number;
  } | null {
    const remainingContent = content.substring(startIndex);
    
    // Find the end of the opening tag
    const openTagEnd = remainingContent.indexOf('>');
    if (openTagEnd === -1) {
      return null;
    }

    // Check if it's a self-closing tag
    const openTagContent = remainingContent.substring(0, openTagEnd + 1);
    if (openTagContent.trim().endsWith('/>')) {
      return {
        startIndex,
        endIndex: startIndex + openTagEnd
      };
    }

    // Find matching closing tag with proper nesting support
    const closingTag = `</${elementName}>`;
    let depth = 1;
    let searchIndex = openTagEnd + 1;
    
    while (depth > 0 && searchIndex < remainingContent.length) {
      const nextOpen = remainingContent.indexOf(`<${elementName}`, searchIndex);
      const nextClose = remainingContent.indexOf(closingTag, searchIndex);
      
      if (nextClose === -1) {
        // No closing tag found - treat as malformed but still process
        console.warn(`No closing tag found for <${elementName}> at index ${startIndex}`);
        return {
          startIndex,
          endIndex: startIndex + remainingContent.length - 1
        };
      }
      
      if (nextOpen !== -1 && nextOpen < nextClose) {
        // Check if it's a self-closing tag
        const nextOpenEnd = remainingContent.indexOf('>', nextOpen);
        if (nextOpenEnd !== -1) {
          const nextOpenContent = remainingContent.substring(nextOpen, nextOpenEnd + 1);
          if (!nextOpenContent.trim().endsWith('/>')) {
            depth++;
          }
        }
        searchIndex = nextOpen + elementName.length + 1;
      } else {
        depth--;
        if (depth === 0) {
          return {
            startIndex,
            endIndex: startIndex + nextClose + closingTag.length - 1
          };
        }
        searchIndex = nextClose + closingTag.length;
      }
    }

    return null;
  }

  /**
   * Detects POML elements in content
   * @param content The content to analyze
   * @returns Array of detected POML elements
   */
  detectPomlElements(content: string): Array<{element: string, start: number, end: number}> {
    const segments = this.segmentContent(content);
    return segments
      .filter(segment => segment.type === 'poml')
      .map(segment => ({
        element: segment.element || 'unknown',
        start: segment.startIndex,
        end: segment.endIndex
      }));
  }

  /**
   * Creates an ExtendedPomlReader with content-specific configuration
   * @param content The content to analyze for optimal configuration
   * @param options Additional options
   * @returns Configured ExtendedPomlReader instance
   */
  static createForContent(content: string, options: ExtendedPomlReaderOptions = {}): ExtendedPomlReader {
    // Detect if content appears to be markdown
    const isMarkdown = PureTextReader.isMarkdown(content);
    
    return new ExtendedPomlReader({
      defaultTextSyntax: isMarkdown ? 'markdown' : 'text',
      ...options
    });
  }
}