/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Type definitions for LanguageModel API
declare global {
  interface Window {
    LanguageModel: {
      create(params: LanguageModelParams): Promise<LanguageModelSession>;
      params(): Promise<LanguageModelDefaults>;
    };
  }
  const LanguageModel: {
    create(params: LanguageModelParams): Promise<LanguageModelSession>;
    params(): Promise<LanguageModelDefaults>;
  };
}

interface LanguageModelParams {
  initialPrompts?: Array<{ role: string; content: string }>;
  temperature?: number;
  topK?: number;
}

interface LanguageModelSession {
  prompt(text: string): Promise<string>;
  destroy(): void;
}

interface LanguageModelDefaults {
  defaultTemperature: number;
  maxTemperature: number;
  defaultTopK: number;
  maxTopK: number;
}

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  debug?: string;
}

// DOM Elements
const inputPrompt = document.body.querySelector('#input-prompt') as HTMLTextAreaElement;
const buttonPrompt = document.body.querySelector('#button-prompt') as HTMLButtonElement;
const buttonReset = document.body.querySelector('#button-reset') as HTMLButtonElement;
const buttonFetchGdocs = document.body.querySelector('#button-fetch-gdocs') as HTMLButtonElement;
const buttonExtractContent = document.body.querySelector('#button-extract-content') as HTMLButtonElement;
const elementResponse = document.body.querySelector('#response') as HTMLDivElement;
const elementLoading = document.body.querySelector('#loading') as HTMLDivElement;
const elementError = document.body.querySelector('#error') as HTMLDivElement;
const sliderTemperature = document.body.querySelector('#temperature') as HTMLInputElement;
const sliderTopK = document.body.querySelector('#top-k') as HTMLInputElement;
const labelTemperature = document.body.querySelector('#label-temperature') as HTMLSpanElement;
const labelTopK = document.body.querySelector('#label-top-k') as HTMLSpanElement;

let session: LanguageModelSession | null = null;
let accessToken: string | null = null;

async function runPrompt(prompt: string, params: LanguageModelParams): Promise<string> {
  try {
    if (!session) {
      session = await LanguageModel.create(params);
    }
    return session.prompt(prompt);
  } catch (e) {
    console.log('Prompt failed');
    console.error(e);
    console.log('Prompt:', prompt);
    // Reset session
    reset();
    throw e;
  }
}

async function reset(): Promise<void> {
  if (session) {
    session.destroy();
  }
  session = null;
}

async function initDefaults(): Promise<void> {
  const defaults = await LanguageModel.params();
  console.log('Model default:', defaults);
  if (!('LanguageModel' in self)) {
    await showResponse('Model not available');
    return;
  }
  sliderTemperature.value = defaults.defaultTemperature.toString();
  // Pending https://issues.chromium.org/issues/367771112.
  // sliderTemperature.max = defaults.maxTemperature;
  if (defaults.defaultTopK > 3) {
    // limit default topK to 3
    sliderTopK.value = '3';
    labelTopK.textContent = '3';
  } else {
    sliderTopK.value = defaults.defaultTopK.toString();
    labelTopK.textContent = defaults.defaultTopK.toString();
  }
  sliderTopK.max = defaults.maxTopK.toString();
  labelTemperature.textContent = defaults.defaultTemperature.toString();
}

initDefaults();

buttonReset.addEventListener('click', () => {
  hide(elementLoading);
  hide(elementError);
  hide(elementResponse);
  reset();
  buttonReset.setAttribute('disabled', '');
});

sliderTemperature.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement;
  labelTemperature.textContent = target.value;
  reset();
});

sliderTopK.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement;
  labelTopK.textContent = target.value;
  reset();
});

inputPrompt.addEventListener('input', () => {
  if (inputPrompt.value.trim()) {
    buttonPrompt.removeAttribute('disabled');
  } else {
    buttonPrompt.setAttribute('disabled', '');
  }
});

// Add drag and drop support for text
let dragPreviewElement: HTMLDivElement | null = null;

// Create drag preview bubble when dragging starts outside the textarea
document.addEventListener('dragstart', (e) => {
  const selectedText = window.getSelection()?.toString();
  if (selectedText && e.target !== inputPrompt) {
    // Create preview element
    dragPreviewElement = document.createElement('div');
    dragPreviewElement.className = 'drag-preview';
    dragPreviewElement.textContent = selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText;
    document.body.appendChild(dragPreviewElement);
    
    // Initially hide it
    dragPreviewElement.style.display = 'none';
  }
});

// Update drag preview position during drag
document.addEventListener('dragover', (e) => {
  if (dragPreviewElement) {
    dragPreviewElement.style.display = 'block';
    dragPreviewElement.style.left = e.clientX + 'px';
    dragPreviewElement.style.top = e.clientY + 'px';
  }
});

// Clean up drag preview when drag ends
document.addEventListener('dragend', () => {
  if (dragPreviewElement) {
    document.body.removeChild(dragPreviewElement);
    dragPreviewElement = null;
  }
});

inputPrompt.addEventListener('dragover', (e) => {
  e.preventDefault();
  inputPrompt.style.backgroundColor = '#f0f8ff';
});

inputPrompt.addEventListener('dragleave', (e) => {
  e.preventDefault();
  inputPrompt.style.backgroundColor = '';
});

inputPrompt.addEventListener('drop', (e) => {
  e.preventDefault();
  inputPrompt.style.backgroundColor = '';
  
  // Clean up drag preview
  if (dragPreviewElement) {
    document.body.removeChild(dragPreviewElement);
    dragPreviewElement = null;
  }
  
  const draggedText = e.dataTransfer?.getData('text/plain');
  if (draggedText) {
    // Check if the dragged text looks like a file path
    const isPath = /^[\/~][\w\/\-\.]+\.[a-zA-Z0-9]+$/.test(draggedText.trim()) || 
                   /^[a-zA-Z]:[\\\/][\w\\\/\-\.]+\.[a-zA-Z0-9]+$/.test(draggedText.trim());
    
    if (isPath) {
      // Helper function to insert content
      const insertContent = (content: string) => {
        const currentValue = inputPrompt.value;
        const cursorPosition = inputPrompt.selectionStart;
        
        const newValue = currentValue.slice(0, cursorPosition) + content + currentValue.slice(cursorPosition);
        inputPrompt.value = newValue;
        
        // Set cursor position after the inserted content
        inputPrompt.setSelectionRange(cursorPosition + content.length, cursorPosition + content.length);
        
        // Trigger input event to enable the run button if needed
        inputPrompt.dispatchEvent(new Event('input'));
        
        // Focus the textarea
        inputPrompt.focus();
      };
      
      // Try to read the file content using chrome extension APIs
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          // Send message to background script to read file
          chrome.runtime.sendMessage({
            action: 'readFile',
            filePath: draggedText.trim()
          }, {}, (response?: any) => {
            // Check for chrome.runtime.lastError first to avoid unchecked error
            if ((chrome.runtime as any).lastError) {
              console.log('Background script connection failed:', (chrome.runtime as any).lastError.message);
              // No background script or connection failed, fallback to path insertion
              const contentToInsert = `File path detected: ${draggedText}\n(Note: No background script available to read file)\n`;
              insertContent(contentToInsert);
              return;
            }
            
            if (response && response.success && response.content) {
              // Successfully read file content
              insertContent(response.content);
            } else {
              // File reading failed, show error message with path
              const errorMsg = response && response.error ? response.error : 'Unknown error reading file';
              const contentToInsert = `File path detected: ${draggedText}\n(Error: ${errorMsg})\n`;
              insertContent(contentToInsert);
            }
          });
        } catch (error) {
          // Chrome extension API not available, use fallback
          const contentToInsert = `File path detected: ${draggedText}\n(Note: Chrome extension API error)\n`;
          insertContent(contentToInsert);
        }
      } else {
        // Fallback: just insert the path as text with a note
        const contentToInsert = `File path detected: ${draggedText}\n(Note: Cannot read file content in this environment)\n`;
        insertContent(contentToInsert);
      }
    } else {
      // Not a path, insert as regular text
      const currentValue = inputPrompt.value;
      const cursorPosition = inputPrompt.selectionStart;
      
      const newValue = currentValue.slice(0, cursorPosition) + draggedText + currentValue.slice(cursorPosition);
      inputPrompt.value = newValue;
      
      // Set cursor position after the inserted text
      inputPrompt.setSelectionRange(cursorPosition + draggedText.length, cursorPosition + draggedText.length);
      
      // Trigger input event to enable the run button if needed
      inputPrompt.dispatchEvent(new Event('input'));
      
      // Focus the textarea
      inputPrompt.focus();
    }
  }
});

buttonPrompt.addEventListener('click', async () => {
  const prompt = inputPrompt.value.trim();
  showLoading();
  try {
    const params: LanguageModelParams = {
      initialPrompts: [
        { role: 'system', content: 'You are a helpful and friendly assistant.' }
      ],
      temperature: parseFloat(sliderTemperature.value),
      topK: parseInt(sliderTopK.value)
    };
    const response = await runPrompt(prompt, params);
    await showResponse(response);
  } catch (e) {
    showError(e as Error);
  }
});

function showLoading(): void {
  buttonReset.removeAttribute('disabled');
  hide(elementResponse);
  hide(elementError);
  show(elementLoading);
}

async function showResponse(response: string): Promise<void> {
  hide(elementLoading);
  show(elementResponse);
  const parsedMarkdown = await marked.parse(response);
  elementResponse.innerHTML = DOMPurify.sanitize(parsedMarkdown);
}

function showError(error: Error): void {
  show(elementError);
  hide(elementResponse);
  hide(elementLoading);
  elementError.textContent = error.message || error.toString();
}

function show(element: HTMLElement): void {
  element.removeAttribute('hidden');
}

function hide(element: HTMLElement): void {
  element.setAttribute('hidden', '');
}

async function checkGoogleDocsTab(): Promise<boolean> {
  try {
    if (!chrome.tabs) {
      return false;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab && tab.url && tab.url.includes('docs.google.com/document') || false;
  } catch (error) {
    console.error('Error checking tab:', error);
    return false;
  }
}

async function authenticateGoogle(): Promise<string> {
  try {
    if (!chrome.identity) {
      throw new Error('Chrome identity API not available');
    }

    // Use Chrome's identity.getAuthToken which works with the manifest oauth2 config
    const token = await chrome.identity.getAuthToken({ 
      interactive: true,
      scopes: ['https://www.googleapis.com/auth/documents.readonly']
    });

    if (!token) {
      throw new Error('Failed to get access token');
    }

    if (typeof token !== 'string') {
      throw new Error(`Invalid token format: ${JSON.stringify(token)}`);
    }

    accessToken = token;
    return accessToken;
  } catch (error) {
    console.error('Authentication failed:', error);
    throw error;
  }
}

function extractDocumentId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function fetchGoogleDocsContent(isRetry: boolean = false): Promise<string> {
  try {
    if (!chrome.tabs) {
      throw new Error('Chrome extension APIs not available');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url || !tab.url.includes('docs.google.com/document')) {
      throw new Error('No Google Docs document tab found');
    }

    const documentId = extractDocumentId(tab.url);
    if (!documentId) {
      throw new Error('Could not extract document ID from URL');
    }

    // Authenticate if we don't have a token
    if (!accessToken) {
      await authenticateGoogle();
    }

    // Fetch document content using Google Docs API
    const apiUrl = `https://docs.googleapis.com/v1/documents/${documentId}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401 && !isRetry) {
        console.error(response);
        // Log response body for debugging
        console.error(await response.json());
        // Token expired, re-authenticate (only retry once)
        accessToken = null; // Clear the invalid token
        await authenticateGoogle();
        return fetchGoogleDocsContent(true); // Retry with new token, mark as retry
      }
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const document = await response.json();
    
    // Extract text content from the document structure
    let textContent = '';
    
    function extractTextFromContent(content: any): string {
      if (!content || !content.content) return '';
      
      let text = '';
      for (const element of content.content) {
        if (element.paragraph) {
          for (const paragraphElement of element.paragraph.elements || []) {
            if (paragraphElement.textRun) {
              text += paragraphElement.textRun.content || '';
            }
          }
        } else if (element.table) {
          for (const row of element.table.tableRows || []) {
            for (const cell of row.tableCells || []) {
              text += extractTextFromContent(cell);
            }
          }
        }
      }
      return text;
    }

    textContent = extractTextFromContent(document.body);
    
    if (!textContent.trim()) {
      throw new Error('No text content found in document');
    }

    return textContent;
  } catch (error) {
    console.error('Error fetching Google Docs content:', error);
    throw error;
  }
}

async function updateGdocsButtonState(): Promise<void> {
  try {
    const isGoogleDocs = await checkGoogleDocsTab();
    if (isGoogleDocs) {
      buttonFetchGdocs.removeAttribute('disabled');
    } else {
      buttonFetchGdocs.setAttribute('disabled', '');
    }
  } catch (error) {
    console.error('Error updating button state:', error);
    buttonFetchGdocs.setAttribute('disabled', '');
  }
}

// Wait for DOM to be fully loaded and Chrome APIs to be available
document.addEventListener('DOMContentLoaded', () => {
  updateGdocsButtonState();
  setInterval(updateGdocsButtonState, 2000);
});

buttonFetchGdocs.addEventListener('click', async () => {
  try {
    showLoading();
    const content = await fetchGoogleDocsContent();
    
    if (content.trim()) {
      const currentValue = inputPrompt.value;
      const newValue = currentValue + (currentValue ? '\n\n' : '') + content;
      inputPrompt.value = newValue;
      inputPrompt.dispatchEvent(new Event('input'));
      inputPrompt.focus();
      hide(elementLoading);
    } else {
      throw new Error('No content found in Google Docs');
    }
  } catch (error) {
    showError(error as Error);
  }
});

async function extractPageContent(): Promise<string> {
  try {
    if (!chrome.tabs || !chrome.runtime) {
      throw new Error('Chrome extension APIs not available');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      throw new Error('No active tab found');
    }

    // Skip chrome:// pages and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot extract content from chrome:// or extension pages');
    }

    // Send message to background script to extract content
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'extractPageContent',
        tabId: tab.id
      }, {}, (response?: any) => {
        if ((chrome.runtime as any).lastError) {
          reject(new Error(`Background script error: ${(chrome.runtime as any).lastError.message}`));
          return;
        }
        
        if (response && response.success) {
          resolve(response.content);
        } else {
          reject(new Error(response?.error || 'Unknown error extracting content'));
        }
      });
    });
  } catch (error) {
    console.error('Error extracting page content:', error);
    throw error;
  }
}

buttonExtractContent.addEventListener('click', async () => {
  try {
    showLoading();
    const content = await extractPageContent();
    
    if (content.trim()) {
      const currentValue = inputPrompt.value;
      const newValue = currentValue + (currentValue ? '\n\n' : '') + content;
      inputPrompt.value = newValue;
      inputPrompt.dispatchEvent(new Event('input'));
      inputPrompt.focus();
      hide(elementLoading);
    } else {
      throw new Error('No readable content found');
    }
  } catch (error) {
    showError(error as Error);
  }
});