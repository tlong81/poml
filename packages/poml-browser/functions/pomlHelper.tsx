import React from 'react';
import { Paragraph } from 'poml/essentials';
import { Markup } from 'poml/presentation';
import { renderToReadableStream } from 'react-dom/server';
import { RichContent, write } from 'poml';
import {
  CardModel,
  isTextContent,
  isBinaryContent,
  isFileContent,
  isNestedContent,
  getDefaultComponentType
} from './cardModel';

// Import POML components
import {
  Text,
  Code,
  Header,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListItem,
  SubContent,
  Inline,
  Newline,
  Object as POMLObject,
  Image,
  Audio
} from 'poml/essentials';

import {
  Task,
  Question,
  Hint,
  Role,
  OutputFormat,
  StepwiseInstructions,
  Example,
  ExampleInput,
  ExampleOutput,
  ExampleSet,
  Introducer,
  Document,
  Webpage,
  Folder,
  Tree,
  Table,
  AiMessage,
  Conversation,
  HumanMessage,
  SystemMessage,
  MessageContent,
  CaptionedParagraph
} from 'poml/components';
import { ErrorCollection } from 'poml/base';
import { binaryToBase64 } from './utils';

// Map component type strings to actual React components
const ComponentMap: Record<string, React.FC<any>> = {
  // Basic Components
  Text,
  Paragraph,
  CaptionedParagraph,
  Code,
  Header,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListItem,
  SubContent,
  Inline,
  Newline,
  Object: POMLObject,
  Audio,

  // Intentions
  Task,
  Question,
  Hint,
  Role,
  OutputFormat,
  StepwiseInstructions,
  Example,
  ExampleInput,
  ExampleOutput,
  ExampleSet,
  Introducer,

  // Data Displays
  Document,
  Folder,
  Image,
  Table,
  Tree,
  Webpage,

  // Chat Components
  AiMessage,
  Conversation,
  HumanMessage,
  SystemMessage,
  MessageContent
};

/**
 * Convert a CardModel to a POML React element
 */
export function cardToPOMLElement(card: CardModel): React.ReactElement {
  const Component = ComponentMap[card.componentType] || Text;

  const props = buildComponentProps(card);
  const children = buildComponentChildren(card);
  console.log(card.componentType, props, children);

  if (children === null || children === undefined) {
    return React.createElement(Component, props);
  } else {
    return React.createElement(Component, props, children);
  }
}

/**
 * Build props for the POML component based on card data
 */
function buildComponentProps(card: CardModel): Record<string, any> {
  const props: Record<string, any> = {
    key: card.id
  };

  // Add title for CaptionedParagraph
  if (card.componentType === 'CaptionedParagraph' && card.title) {
    props.caption = card.title;
  }

  // Add props based on content type
  if (isBinaryContent(card.content)) {
    if (card.content.mimeType) {
      props.type = card.content.mimeType;
    }
    if (card.content.encoding === 'base64') {
      props.base64 = card.content.value;
    } else if (card.content.encoding === 'binary') {
      // For binary encoding, value should be ArrayBuffer
      if (card.content.value instanceof ArrayBuffer) {
        props.base64 = binaryToBase64(card.content.value);
      } else if (typeof card.content.value === 'string') {
        // If it's already a base64 string, use it directly
        props.base64 = card.content.value;
      }
    }
  } else if (isFileContent(card.content)) {
    if (card.content.path) {
      props.src = card.content.path;
    }
    if (card.content.url) {
      props.url = card.content.url;
    }
    if (card.content.name) {
      props.name = card.content.name;
    }
  }

  // Add metadata as custom props (will be ignored by POML renderer)
  if (card.metadata && typeof card.metadata === 'object') {
    Object.entries(card.metadata).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        props[`data-${key}`] = value;
      }
    });
  }

  return props;
}

/**
 * Build children for the POML component based on card content
 */
function buildComponentChildren(card: CardModel): React.ReactNode {
  if (isTextContent(card.content)) {
    return card.content.value;
  } else if (isNestedContent(card.content)) {
    return card.content.children.map(child => cardToPOMLElement(child));
  } else if (isBinaryContent(card.content)) {
    // Binary uncontents are passed as base64 strings
    return null;
  }
  return null;
}

/**
 * Convert multiple cards to a POML document
 */
export function cardsToPOMLDocument(cards: CardModel[]): React.ReactElement {
  return <Text syntax="markdown">{cards.map(card => cardToPOMLElement(card))}</Text>;
}

/**
 * Render a React element to string using renderToReadableStream
 */
async function renderElementToString(
  element: React.ReactElement,
  onWarning?: (message: string) => void
): Promise<string> {
  ErrorCollection.clear(); // Clear any previous errors
  let renderError: any = null;
  const stream = await renderToReadableStream(element, {
    onError: error => {
      console.error('Error during rendering:', error);
      renderError = error;
    }
  });
  await stream.allReady;
  const reader = stream.getReader();

  if (renderError && onWarning) {
    onWarning(`Rendering error: ${renderError.toString()}`);
  }

  let result = '';
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    result += decoder.decode(value, { stream: true });
  }
  if (!ErrorCollection.empty()) {
    throw ErrorCollection.first();
  }

  // Final decode with stream: false to flush any remaining bytes
  result += decoder.decode();
  return result;
}

export const richContentToString = (content: RichContent): string => {
  // This is temporary and should be replaced with a proper display function
  if (typeof content === 'string') {
    return content;
  }

  return content
    .map(item => {
      if (typeof item === 'string') {
        return item;
      } else if (item && item.type) {
        return `<${item.type}>`;
      }
      return '<unknown>';
    })
    .join('\n\n');
};

/**
 * Convert a single card to POML string
 */
export async function cardToPOMLString(
  card: CardModel,
  onWarning?: (message: string) => void
): Promise<RichContent> {
  const element = cardToPOMLElement(card);
  const ir = await renderElementToString(element, onWarning);
  const written = await write(ir, { speaker: false });
  return written;
}

/**
 * Convert multiple cards to POML string
 */
export async function cardsToPOMLString(
  cards: CardModel[],
  onWarning?: (message: string) => void
): Promise<RichContent> {
  const document = cardsToPOMLDocument(cards);
  const ir = await renderElementToString(document, onWarning);
  console.log(ir);
  const written = await write(ir, { speaker: false });
  console.log(written);
  return written;
}

/**
 * Create a POML element with specific component type
 */
export function createPOMLElement(
  componentType: string,
  props: Record<string, any>,
  children?: React.ReactNode
): React.ReactElement {
  const Component = ComponentMap[componentType] || Text;
  return React.createElement(Component, props, children);
}

interface PomlHelperOptions {
  onWarning?: (message: string) => void;
  onError?: (message: string) => void;
}

export default async function pomlHelper(
  cards?: CardModel[],
  options?: PomlHelperOptions
): Promise<RichContent | undefined> {
  const { onWarning, onError } = options || {};
  
  try {
    // If cards are provided, render them as POML
    if (cards && cards.length > 0) {
      console.log('Rendering cards to POML:', cards);
      const results = await cardsToPOMLString(cards, onWarning);
      if (!results && onWarning) {
        onWarning('No POML content generated from cards. You may need some debugging.');
      }
      return results;
    } else {
      if (onError) {
        onError('No cards provided to render.');
      }
      return undefined;
    }
  } catch (error: any) {
    if (onError) {
      onError(`Error rendering POML: ${error.message}`);
    }
    return undefined;
  }
}
