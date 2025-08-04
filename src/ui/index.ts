/* global LanguageModel */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

interface ExtractedContent {
  title: string;
  content: string;
  excerpt: string;
  debug?: string;
}

// DOM Elements
const elementResponse = document.body.querySelector('#response') as HTMLDivElement;
const elementLoading = document.body.querySelector('#loading') as HTMLDivElement;
const elementError = document.body.querySelector('#error') as HTMLDivElement;
const inputPrompt = document.body.querySelector('#input-prompt') as HTMLTextAreaElement;
const buttonPrompt = document.body.querySelector('#button-prompt') as HTMLButtonElement;
const buttonReset = document.body.querySelector('#button-reset') as HTMLButtonElement;
const buttonFetchGdocs = document.body.querySelector('#button-fetch-gdocs') as HTMLButtonElement;
const buttonFetchMsWord = document.body.querySelector('#button-fetch-msword') as HTMLButtonElement;
const buttonExtractContent = document.body.querySelector('#button-extract-content') as HTMLButtonElement;
const buttonTestChatGPT = document.body.querySelector('#button-test-chatgpt') as HTMLButtonElement;

let accessToken: string | null = null;

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

  console.log('[DEBUG] Drop event triggered', e.dataTransfer);
  console.log('[DEBUG] DataTransfer files:', e.dataTransfer?.files);
  console.log('[DEBUG] DataTransfer items:', e.dataTransfer?.items);
  
  // Check for files in dataTransfer.files
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    console.log('[DEBUG] Found files in dataTransfer.files:', e.dataTransfer.files);
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i];
      console.log(`[DEBUG] File ${i}:`, { name: file.name, type: file.type, size: file.size });
    }
  }
  
  // Check for files in dataTransfer.items
  if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
    console.log('[DEBUG] Found items in dataTransfer.items:', e.dataTransfer.items);
    for (let i = 0; i < e.dataTransfer.items.length; i++) {
      const item = e.dataTransfer.items[i];
      console.log(`[DEBUG] Item ${i}:`, { kind: item.kind, type: item.type });
      if (item.kind === 'file') {
        const file = item.getAsFile();
        console.log(`[DEBUG] File from item ${i}:`, file);
      }
    }
  }
  
  for (const type of e.dataTransfer?.types ?? []) {
    console.log('[DEBUG] Dragged type:', type);
    console.log('[DEBUG] Dragged data:', e.dataTransfer?.getData(type));
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

// Add paste event listener for debugging
inputPrompt.addEventListener('paste', (e) => {
  console.log('[DEBUG] Paste event triggered');
  console.log('[DEBUG] Clipboard data:', e.clipboardData);
  if (e.clipboardData && e.clipboardData.files.length > 0) {
    console.log('[DEBUG] Pasted files:', e.clipboardData.files);
  }
  for (const type of e.clipboardData?.types ?? []) {
    console.log('[DEBUG] Pasted type:', type);
    console.log('[DEBUG] Pasted data:', e.clipboardData?.getData(type));
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

async function checkMsWordTab(): Promise<boolean> {
  try {
    if (!chrome.tabs) {
      return false;
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      return false;
    }

    // Check for various Word Online patterns
    const wordPatterns = [
      /sharepoint\.com.*\/_layouts\/15\/Doc.aspx/,
      /office\.com.*\/edit/,
      /onedrive\.live\.com.*\/edit/,
      /sharepoint\.com.*\/edit/,
      /officeapps\.live\.com\/we\/wordeditorframe\.aspx/,
      /word-edit\.officeapps\.live\.com/
    ];
    
    return wordPatterns.some(pattern => pattern.test(tab.url!));
  } catch (error) {
    console.error('Error checking MS Word tab:', error);
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

async function fetchMsWordContent(): Promise<string> {
  try {
    if (!chrome.tabs || !chrome.runtime) {
      throw new Error('Chrome extension APIs not available');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      throw new Error('No active tab found');
    }

    // Check if it's a valid MS Word document tab
    const isMsWordTab = await checkMsWordTab();
    if (!isMsWordTab) {
      throw new Error('No MS Word document tab found');
    }

    // Skip chrome:// pages and extension pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      throw new Error('Cannot extract content from chrome:// or extension pages');
    }

    // Send message to background script to extract MS Word content
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'extractMsWordContent',
        tabId: tab.id
      }, {}, (response?: any) => {
        if ((chrome.runtime as any).lastError) {
          reject(new Error(`Background script error: ${(chrome.runtime as any).lastError.message}`));
          return;
        }
        
        if (response && response.success) {
          resolve(response.content);
        } else {
          reject(new Error(response?.error || 'Unknown error extracting MS Word content'));
        }
      });
    });
  } catch (error) {
    console.error('Error fetching MS Word content:', error);
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

async function updateMsWordButtonState(): Promise<void> {
  try {
    const isMsWord = await checkMsWordTab();
    if (isMsWord) {
      buttonFetchMsWord.removeAttribute('disabled');
    } else {
      buttonFetchMsWord.setAttribute('disabled', '');
    }
  } catch (error) {
    console.error('Error updating MS Word button state:', error);
    buttonFetchMsWord.setAttribute('disabled', '');
  }
}

// Wait for DOM to be fully loaded and Chrome APIs to be available
document.addEventListener('DOMContentLoaded', () => {
  updateGdocsButtonState();
  updateMsWordButtonState();
  setInterval(() => {
    updateGdocsButtonState();
    updateMsWordButtonState();
  }, 2000);
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

buttonFetchMsWord.addEventListener('click', async () => {
  try {
    showLoading();
    const content = await fetchMsWordContent();
    
    if (content.trim()) {
      const currentValue = inputPrompt.value;
      const newValue = currentValue + (currentValue ? '\n\n' : '') + content;
      inputPrompt.value = newValue;
      inputPrompt.dispatchEvent(new Event('input'));
      inputPrompt.focus();
      hide(elementLoading);
    } else {
      throw new Error('No content found in MS Word document');
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

async function testSendToChatGPT(): Promise<void> {
  try {
    if (!chrome.tabs || !chrome.runtime) {
      throw new Error('Chrome extension APIs not available');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    // Create files array for testing
    const files = await createFilesArray();

    console.log('Created files for testing:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    
    // For testing, we can still use clipboard to verify the files are created correctly
    const clipboardItems = files.map(file => new ClipboardItem({
      [`web ${file.type}`]: file
    }));

    try {
      await navigator.clipboard.write(clipboardItems);
      console.log('Files written to clipboard for testing');
    } catch (clipboardError) {
      console.error('Failed to write files to clipboard:', clipboardError);
    }

    const res = await navigator.clipboard.read();
    console.log('Clipboard contents:', res);
    for (const item of res) {
      for (const type of item.types) {
        console.log(`Clipboard item type: ${type}`);
        const blob = await item.getType(type);
        console.log(`Blob for type ${type}:`, blob);
      }
    }
  } catch (error) {
    console.error('Error testing sendToChatGPT:', error);
    throw error;
  }
}

async function createFileClipboardItems(): Promise<ClipboardItem[]> {
  const files = await Promise.all([
    createFileFromPath('test.pdf', 'application/pdf'),
    createFileFromPath('test.png', 'image/png')
  ]);

  return files.map(file => new ClipboardItem({
    [`web ${file.type}`]: file
  }));
}

async function createFilesArray(): Promise<File[]> {
  return await Promise.all([
    createFileFromPath('test.pdf', 'application/pdf'),
    createFileFromPath('test.png', 'image/png')
  ]);
}

async function createFileFromPath(filename: string, mimeType: string): Promise<File> {
  const response = await fetch(filename);
  const content = await response.bytes();
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

let dragFilesPreviewElement: HTMLDivElement | null = null;
let preloadedFiles: File[] | null = null;

// Preload files when the page loads
async function preloadDragFiles(): Promise<void> {
  try {
    preloadedFiles = await createFilesArray();
    console.log('Files preloaded for drag operations:', preloadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
  } catch (error) {
    console.error('Error preloading files:', error);
  }
}

// Preload files on page load
preloadDragFiles();

// Add drag event handlers for the Test ChatGPT button
buttonTestChatGPT.addEventListener('dragstart', (e) => {
  console.log('[DEBUG] Dragstart event triggered', e);
  console.log('[DEBUG] DataTransfer object:', e.dataTransfer);
  console.log('[DEBUG] Preloaded files available:', preloadedFiles ? preloadedFiles.length : 'None');
  
  if (!e.dataTransfer || !preloadedFiles) {
    console.log('[DEBUG] Missing dataTransfer or preloaded files');
    return;
  }
  
  try {
    console.log('[DEBUG] Adding files to dataTransfer...');
    // Add preloaded files to dataTransfer (must be synchronous)
    e.dataTransfer.setData('text/plain', 'Files ready for drag');
    for (let i = 0; i < preloadedFiles.length; i++) {
      const file = preloadedFiles[i];
      console.log(`[DEBUG] Adding file ${i}:`, { name: file.name, type: file.type, size: file.size });
      e.dataTransfer.items.add(file);
    }
    
    console.log('[DEBUG] DataTransfer after adding files:', e.dataTransfer);
    console.log('[DEBUG] DataTransfer items length:', e.dataTransfer.items.length);
    console.log('[DEBUG] DataTransfer files length:', e.dataTransfer.files.length);
    
    // Also add as text for broader compatibility
    // const fileNames = preloadedFiles.map(f => f.name).join(', ');
    // e.dataTransfer.setData('text/plain', `Files: ${fileNames}`);
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'all';
    
    console.log('[DEBUG] Final dataTransfer state:', {
      effectAllowed: e.dataTransfer.effectAllowed,
      types: e.dataTransfer.types,
      itemsLength: e.dataTransfer.items.length,
      filesLength: e.dataTransfer.files.length
    });
    
    // Create visual feedback element
    dragFilesPreviewElement = document.createElement('div');
    dragFilesPreviewElement.className = 'drag-files-preview';
    dragFilesPreviewElement.innerHTML = `
      <div>📎 Dragging Files</div>
      <div class="file-list">
        <div class="file-item">test.pdf</div>
        <div class="file-item">test.png</div>
      </div>
    `;
    document.body.appendChild(dragFilesPreviewElement);
    
    // Initially hide it
    dragFilesPreviewElement.style.display = 'none';
    
    console.log('Files added to dataTransfer for drag operation:', preloadedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
  } catch (error) {
    console.error('Error preparing files for drag:', error);
  }
});

// Show preview during drag
buttonTestChatGPT.addEventListener('drag', (e) => {
  if (dragFilesPreviewElement) {
    dragFilesPreviewElement.style.display = 'block';
    dragFilesPreviewElement.style.left = e.clientX + 'px';
    dragFilesPreviewElement.style.top = e.clientY + 'px';
  }
});

// Clean up when drag ends
buttonTestChatGPT.addEventListener('dragend', () => {
  if (dragFilesPreviewElement) {
    document.body.removeChild(dragFilesPreviewElement);
    dragFilesPreviewElement = null;
  }
  console.log('Drag operation ended');
});

// Handle mouse events for manual drag simulation
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;

buttonTestChatGPT.addEventListener('mousedown', async (e) => {
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  isDragging = false;
});

buttonTestChatGPT.addEventListener('mousemove', async (e) => {
  if (e.buttons === 1) { // Left mouse button is down
    const distance = Math.sqrt(
      Math.pow(e.clientX - dragStartX, 2) + Math.pow(e.clientY - dragStartY, 2)
    );
    
    if (distance > 5 && !isDragging) { // Start drag if moved more than 5 pixels
      isDragging = true;
      
      try {
        // Create visual feedback element for manual drag
        if (!dragFilesPreviewElement) {
          dragFilesPreviewElement = document.createElement('div');
          dragFilesPreviewElement.className = 'drag-files-preview';
          dragFilesPreviewElement.innerHTML = `
            <div>📎 Dragging Files</div>
            <div class="file-list">
              <div class="file-item">test.pdf</div>
              <div class="file-item">test.png</div>
            </div>
          `;
          document.body.appendChild(dragFilesPreviewElement);
        }
        
        dragFilesPreviewElement.style.display = 'block';
        dragFilesPreviewElement.style.left = e.clientX + 'px';
        dragFilesPreviewElement.style.top = e.clientY + 'px';
        
        console.log('Manual drag preview shown');
      } catch (error) {
        console.error('Error preparing manual drag preview:', error);
      }
    } else if (isDragging && dragFilesPreviewElement) {
      // Update preview position
      dragFilesPreviewElement.style.left = e.clientX + 'px';
      dragFilesPreviewElement.style.top = e.clientY + 'px';
    }
  }
});

buttonTestChatGPT.addEventListener('mouseup', () => {
  if (isDragging) {
    isDragging = false;
    
    // Clean up drag preview
    if (dragFilesPreviewElement) {
      document.body.removeChild(dragFilesPreviewElement);
      dragFilesPreviewElement = null;
    }
    
    console.log('Drag operation completed');
  }
});

// Clean up on mouse leave
buttonTestChatGPT.addEventListener('mouseleave', () => {
  if (isDragging) {
    isDragging = false;
    
    // Clean up drag preview
    if (dragFilesPreviewElement) {
      document.body.removeChild(dragFilesPreviewElement);
      dragFilesPreviewElement = null;
    }
  }
});

buttonTestChatGPT.addEventListener('click', async () => {
  // Only trigger click if not dragging
  if (!isDragging) {
    try {
      showLoading();
      await testSendToChatGPT();
      hide(elementLoading);
      await showResponse('Successfully sent test.pdf and test.png files to clipboard!');
    } catch (error) {
      showError(error as Error);
    }
  }
});