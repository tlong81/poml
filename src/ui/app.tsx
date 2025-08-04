import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { createTheme, MantineProvider, Stack } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import CardList from './components/CardList';
import { ExtractedContent } from './types';

import '@mantine/core/styles.css';

const theme = createTheme({
  /** Put your mantine theme override here */
});

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [temperature, setTemperature] = useState(1);
  const [topK, setTopK] = useState(1);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gdocsEnabled, setGdocsEnabled] = useState(false);
  const [msWordEnabled, setMsWordEnabled] = useState(false);
  const [extractedContents, extractedContentsHandlers] = useListState<ExtractedContent>([]);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const dragFilesPreviewRef = useRef<HTMLDivElement | null>(null);
  const preloadedFilesRef = useRef<File[] | null>(null);
  const accessTokenRef = useRef<string | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    updateButtonStates();
    const interval = setInterval(updateButtonStates, 2000);
    preloadDragFiles();
    return () => clearInterval(interval);
  }, []);

  const showLoading = () => {
    setLoading(true);
    setResponse('');
    setError('');
  };

  const showResponse = async (responseText: string) => {
    setLoading(false);
    const parsedMarkdown = await marked.parse(responseText);
    setResponse(DOMPurify.sanitize(parsedMarkdown));
  };

  const showError = (errorMsg: string) => {
    setError(errorMsg);
    setResponse('');
    setLoading(false);
  };

  const checkGoogleDocsTab = async (): Promise<boolean> => {
    try {
      if (!chrome.tabs) return false;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab && tab.url && tab.url.includes('docs.google.com/document') || false;
    } catch (error) {
      console.error('Error checking tab:', error);
      return false;
    }
  };

  const checkMsWordTab = async (): Promise<boolean> => {
    try {
      if (!chrome.tabs) return false;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) return false;

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
  };

  const updateButtonStates = async () => {
    try {
      const isGoogleDocs = await checkGoogleDocsTab();
      const isMsWord = await checkMsWordTab();
      setGdocsEnabled(isGoogleDocs);
      setMsWordEnabled(isMsWord);
    } catch (error) {
      console.error('Error updating button states:', error);
      setGdocsEnabled(false);
      setMsWordEnabled(false);
    }
  };

  const authenticateGoogle = async (): Promise<string> => {
    try {
      if (!chrome.identity) {
        throw new Error('Chrome identity API not available');
      }

      const token = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/documents.readonly']
      });

      if (!token || typeof token !== 'string') {
        console.error('Failed to get access token:', token);
        throw new Error('Failed to get access token');
      }

      accessTokenRef.current = token;
      return token;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  };

  const extractDocumentId = (url: string): string | null => {
    const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const fetchGoogleDocsContent = async (isRetry: boolean = false): Promise<string> => {
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

      if (!accessTokenRef.current) {
        await authenticateGoogle();
      }

      const apiUrl = `https://docs.googleapis.com/v1/documents/${documentId}`;
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${accessTokenRef.current}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401 && !isRetry) {
          accessTokenRef.current = null;
          await authenticateGoogle();
          return fetchGoogleDocsContent(true);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const document = await response.json();
      
      const extractTextFromContent = (content: any): string => {
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
      };

      const textContent = extractTextFromContent(document.body);
      
      if (!textContent.trim()) {
        throw new Error('No text content found in document');
      }

      return textContent;
    } catch (error) {
      console.error('Error fetching Google Docs content:', error);
      throw error;
    }
  };

  const fetchMsWordContent = async (): Promise<string> => {
    try {
      if (!chrome.tabs || !chrome.runtime) {
        throw new Error('Chrome extension APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        throw new Error('No active tab found');
      }

      const isMsWordTab = await checkMsWordTab();
      if (!isMsWordTab) {
        throw new Error('No MS Word document tab found');
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot extract content from chrome:// or extension pages');
      }

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
  };

  const extractPageContent = async (): Promise<string> => {
    try {
      if (!chrome.tabs || !chrome.runtime) {
        throw new Error('Chrome extension APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.url) {
        throw new Error('No active tab found');
      }

      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot extract content from chrome:// or extension pages');
      }

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
  };

  const createFilesArray = async (): Promise<File[]> => {
    return await Promise.all([
      createFileFromPath('test.pdf', 'application/pdf'),
      createFileFromPath('test.png', 'image/png')
    ]);
  };

  const createFileFromPath = async (filename: string, mimeType: string): Promise<File> => {
    const response = await fetch(filename);
    const content = await response.bytes();
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  };

  const preloadDragFiles = async () => {
    try {
      preloadedFilesRef.current = await createFilesArray();
      console.log('Files preloaded for drag operations:', preloadedFilesRef.current.map(f => ({ name: f.name, type: f.type, size: f.size })));
    } catch (error) {
      console.error('Error preloading files:', error);
    }
  };

  const testSendToChatGPT = async () => {
    try {
      if (!chrome.tabs || !chrome.runtime) {
        throw new Error('Chrome extension APIs not available');
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        throw new Error('No active tab found');
      }

      const files = await createFilesArray();
      console.log('Created files for testing:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
      
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
  };

  const handleFetchGdocs = async () => {
    try {
      showLoading();
      const content = await fetchGoogleDocsContent();
      
      if (content.trim()) {
        const newValue = prompt + (prompt ? '\n\n' : '') + content;
        setPrompt(newValue);
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        throw new Error('No content found in Google Docs');
      }
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleFetchMsWord = async () => {
    try {
      showLoading();
      const content = await fetchMsWordContent();
      
      if (content.trim()) {
        const newValue = prompt + (prompt ? '\n\n' : '') + content;
        setPrompt(newValue);
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        throw new Error('No content found in MS Word document');
      }
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleExtractContent = async () => {
    try {
      showLoading();
      const content = await extractPageContent();
      
      if (content.trim()) {
        // Get current tab URL
        let currentUrl = '';
        try {
          if (chrome.tabs) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            currentUrl = tab?.url || '';
          }
        } catch (e) {
          // Ignore URL extraction errors
        }

        // Extract title and create excerpt
        const lines = content.split('\n').filter(line => line.trim());
        const title = lines[0]?.substring(0, 100) || 'Extracted Content';
        const excerpt = content.substring(0, 200) + (content.length > 200 ? '...' : '');
        
        // Create new content card
        const newContent: ExtractedContent = {
          id: Date.now().toString(),
          title,
          content,
          excerpt,
          url: currentUrl,
          timestamp: new Date()
        };
        
        // Add to card list
        extractedContentsHandlers.append(newContent);
        
        // Also add to prompt as before
        const newValue = prompt + (prompt ? '\n\n' : '') + content;
        setPrompt(newValue);
        setLoading(false);
        if (inputRef.current) {
          inputRef.current.focus();
        }
      } else {
        throw new Error('No readable content found');
      }
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleTestChatGPT = async () => {
    if (!isDraggingRef.current) {
      try {
        showLoading();
        await testSendToChatGPT();
        setLoading(false);
        await showResponse('Successfully sent test.pdf and test.png files to clipboard!');
      } catch (error) {
        showError((error as Error).message);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.style.backgroundColor = '#f0f8ff';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.style.backgroundColor = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      inputRef.current.style.backgroundColor = '';
    }
    
    if (dragPreviewRef.current) {
      document.body.removeChild(dragPreviewRef.current);
      dragPreviewRef.current = null;
    }

    console.log('[DEBUG] Drop event triggered', e.dataTransfer);
    
    const draggedText = e.dataTransfer?.getData('text/plain');
    if (draggedText && inputRef.current) {
      const isPath = /^[\/~][\w\/\-\.]+\.[a-zA-Z0-9]+$/.test(draggedText.trim()) || 
                     /^[a-zA-Z]:[\\\/][\w\\\/\-\.]+\.[a-zA-Z0-9]+$/.test(draggedText.trim());
      
      const insertContent = (content: string) => {
        if (!inputRef.current) return;
        
        const currentValue = inputRef.current.value;
        const cursorPosition = inputRef.current.selectionStart;
        
        const newValue = currentValue.slice(0, cursorPosition) + content + currentValue.slice(cursorPosition);
        setPrompt(newValue);
        
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(cursorPosition + content.length, cursorPosition + content.length);
            inputRef.current.focus();
          }
        }, 0);
      };
      
      if (isPath) {
        if (typeof chrome !== 'undefined' && chrome.runtime) {
          try {
            chrome.runtime.sendMessage({
              action: 'readFile',
              filePath: draggedText.trim()
            }, {}, (response?: any) => {
              if ((chrome.runtime as any).lastError) {
                console.log('Background script connection failed:', (chrome.runtime as any).lastError.message);
                const contentToInsert = `File path detected: ${draggedText}\n(Note: No background script available to read file)\n`;
                insertContent(contentToInsert);
                return;
              }
              
              if (response && response.success && response.content) {
                insertContent(response.content);
              } else {
                const errorMsg = response && response.error ? response.error : 'Unknown error reading file';
                const contentToInsert = `File path detected: ${draggedText}\n(Error: ${errorMsg})\n`;
                insertContent(contentToInsert);
              }
            });
          } catch (error) {
            const contentToInsert = `File path detected: ${draggedText}\n(Note: Chrome extension API error)\n`;
            insertContent(contentToInsert);
          }
        } else {
          const contentToInsert = `File path detected: ${draggedText}\n(Note: Cannot read file content in this environment)\n`;
          insertContent(contentToInsert);
        }
      } else {
        insertContent(draggedText);
      }
    }
  };

  const handleReorderContents = (from: number, to: number) => {
    extractedContentsHandlers.reorder({ from, to });
  };

  return (
    <MantineProvider theme={theme}>
      <Stack gap="lg" p="md">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Type something, e.g. "Write a haiku about Chrome Extensions"'
          cols={30}
          rows={5}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
        
        <div>
          <input
            type="range"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            min="0"
            max="2"
            step="0.01"
          />
          <label>Temperature: <span>{temperature}</span></label>
        </div>
        
        <div>
          <input
            type="range"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            min="1"
            max="8"
            step="1"
          />
          <label>Top-k: <span>{topK}</span></label>
        </div>
        
        <button className="primary" disabled={!prompt.trim()}>
          Run
        </button>
        <button className="secondary" disabled={!loading && !response && !error}>
          Reset
        </button>
        <button className="secondary" disabled={!gdocsEnabled} onClick={handleFetchGdocs}>
          Fetch Google Docs
        </button>
        <button className="secondary" disabled={!msWordEnabled} onClick={handleFetchMsWord}>
          Fetch MS Word
        </button>
        <button className="secondary" onClick={handleExtractContent}>
          Extract Page Content
        </button>
        <button className="secondary" draggable="true" onClick={handleTestChatGPT}>
          Test sendToChatGPT
        </button>

        <CardList
          contents={extractedContents}
          onReorder={handleReorderContents}
        />
        
        {response && !loading && !error && (
          <div className="text" dangerouslySetInnerHTML={{ __html: response }} />
        )}
        
        {loading && (
          <div className="text">
            <span className="blink">...</span>
          </div>
        )}
        
        {error && !loading && (
          <div className="text">{error}</div>
        )}
      </Stack>
    </MantineProvider>
  );
};

export default App;