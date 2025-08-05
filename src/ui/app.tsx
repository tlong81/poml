import React, { useState, useEffect, useRef } from 'react';
import { createTheme, MantineProvider, Stack, Button, Group, Alert } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { IconClipboard } from '@tabler/icons-react';
import CardList from './components/CardList';
import CardModal from './components/CardModal';
import { ExtractedContent } from './types';

import '@mantine/core/styles.css';

const theme = createTheme({
  /** Put your mantine theme override here */
});

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState(''); // For edit errors
  const [bottomError, setBottomError] = useState(''); // For command errors
  const [copySuccess, setCopySuccess] = useState(false);
  const [gdocsEnabled, setGdocsEnabled] = useState(false);
  const [msWordEnabled, setMsWordEnabled] = useState(false);
  const [extractedContents, extractedContentsHandlers] = useListState<ExtractedContent>([]);
  const [selectedCard, setSelectedCard] = useState<ExtractedContent | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  const preloadedFilesRef = useRef<File[] | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    updateButtonStates();
    const interval = setInterval(updateButtonStates, 2000);
    preloadDragFiles();
    
    // Add global keyboard shortcut for paste
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey && !e.altKey) {
        // Only trigger if not focused on an input/textarea
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' || 
          (activeElement as HTMLElement).contentEditable === 'true'
        )) {
          return; // Let browser handle normal paste
        }
        
        e.preventDefault();
        handlePasteFromClipboard();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const showLoading = () => {
    setLoading(true);
    setBottomError('');
    setCopySuccess(false);
  };

  const showError = (errorMsg: string) => {
    setBottomError(errorMsg);
    setLoading(false);
  };

  // Auto-hide alerts after 5 seconds
  useEffect(() => {
    if (copySuccess) {
      const timer = setTimeout(() => setCopySuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [copySuccess]);

  useEffect(() => {
    if (bottomError) {
      const timer = setTimeout(() => setBottomError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [bottomError]);

  useEffect(() => {
    if (topError) {
      const timer = setTimeout(() => setTopError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [topError]);

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

  const authenticateGoogle = async (): Promise<any> => {
    try {
      if (!chrome.identity) {
        throw new Error('Chrome identity API not available');
      }

      const authResponse = await chrome.identity.getAuthToken({ 
        interactive: true,
        scopes: ['https://www.googleapis.com/auth/documents.readonly']
      });

      if (!authResponse || typeof authResponse !== 'object' || !authResponse.token) {
        console.error('Failed to get access token:', authResponse);
        throw new Error('Failed to get access token');
      }

      accessTokenRef.current = authResponse.token;
      return authResponse;
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
        const title = lines[0]?.substring(0, 100) || 'Google Docs Content';
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
        setLoading(false);
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
        const title = lines[0]?.substring(0, 100) || 'MS Word Content';
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
        setLoading(false);
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
        setLoading(false);
      } else {
        throw new Error('No readable content found');
      }
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleTestChatGPT = async () => {
    try {
      showLoading();
      await testSendToChatGPT();
      setLoading(false);
    } catch (error) {
      showError((error as Error).message);
    }
  };


  const handleReorderContents = (from: number, to: number) => {
    extractedContentsHandlers.reorder({ from, to });
  };

  const handleAddContent = (content: string, insertIndex: number) => {
    try {
      const newContent: ExtractedContent = {
        id: Date.now().toString(),
        title: content.split('\n')[0]?.substring(0, 100) || 'Manual Entry',
        content,
        excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        timestamp: new Date(),
        isManual: true
      };
      
      extractedContentsHandlers.insert(insertIndex, newContent);
      setTopError(''); // Clear any previous errors
    } catch (error) {
      console.error('Failed to add content:', error);
      setTopError('Failed to add content to card list');
    }
  };

  const handleCopyAllCards = async () => {
    try {
      if (extractedContents.length === 0) {
        setBottomError('No cards to copy');
        return;
      }

      // Concatenate all card contents
      const allContent = extractedContents
        .map(card => card.content)
        .join('\n\n---\n\n');

      // Copy to clipboard
      await navigator.clipboard.writeText(allContent);
      setCopySuccess(true);
      setBottomError('');
    } catch (error) {
      console.error('Copy failed:', error);
      setBottomError('Failed to copy cards to clipboard');
    }
  };

  const handleCardClick = (content: ExtractedContent) => {
    setSelectedCard(content);
    setModalOpened(true);
  };

  const handleModalClose = () => {
    setModalOpened(false);
    setSelectedCard(null);
  };

  const handleSaveCard = (id: string, newContent: string) => {
    const index = extractedContents.findIndex(card => card.id === id);
    if (index !== -1) {
      const updatedCard = {
        ...extractedContents[index],
        content: newContent,
        // Update excerpt when content changes
        excerpt: newContent.substring(0, 200) + (newContent.length > 200 ? '...' : ''),
        // Update title if it's a manual card or if the first line changed
        title: extractedContents[index].isManual || !extractedContents[index].title
          ? newContent.split('\n')[0]?.substring(0, 100) || 'Updated Content'
          : extractedContents[index].title
      };
      extractedContentsHandlers.setItem(index, updatedCard);
    }
  };

  const handleDeleteCard = (id: string) => {
    const index = extractedContents.findIndex(card => card.id === id);
    if (index !== -1) {
      extractedContentsHandlers.remove(index);
      // Close modal if the deleted card was being viewed
      if (selectedCard?.id === id) {
        setModalOpened(false);
        setSelectedCard(null);
      }
    }
  };

  const createCardFromContent = (title: string, content: string, insertIndex?: number) => {
    const newContent: ExtractedContent = {
      id: Date.now().toString(),
      title,
      content,
      excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      timestamp: new Date(),
      isManual: false
    };
    
    // Insert at specified index or append to end
    if (insertIndex !== undefined) {
      extractedContentsHandlers.insert(insertIndex, newContent);
    } else {
      extractedContentsHandlers.append(newContent);
    }
  };

  const handleDropFile = async (file: File, insertIndex?: number) => {
    try {
      // Read file content
      const content = await readFileContent(file);
      createCardFromContent(file.name, content, insertIndex);
      setTopError(''); // Clear any previous errors
    } catch (error) {
      console.error('Failed to read file:', error);
      setTopError(`Failed to read file: ${file.name}`);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      
      // Try to read as text, but handle different file types
      if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || 
          file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') ||
          file.name.endsWith('.tsx') || file.name.endsWith('.jsx') || file.name.endsWith('.css') ||
          file.name.endsWith('.html') || file.name.endsWith('.xml') || file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        // For other file types, show file info instead of content
        resolve(`File: ${file.name}\nType: ${file.type || 'Unknown'}\nSize: ${file.size} bytes\nLast Modified: ${new Date(file.lastModified).toLocaleString()}\n\n[Binary file content not displayed]`);
      }
    });
  };

  const handlePasteFromClipboard = async () => {
    try {
      showLoading();
      
      // Create a hidden input element to capture paste events
      const pasteInput = document.createElement('input');
      pasteInput.style.position = 'absolute';
      pasteInput.style.left = '-9999px';
      pasteInput.style.opacity = '0';
      document.body.appendChild(pasteInput);
      
      // Focus the input to make it the target for paste
      pasteInput.focus();
      
      let hasProcessedContent = false;
      
      // Add paste event listener
      const handlePasteEvent = async (event: ClipboardEvent) => {
        try {
          event.preventDefault();
          console.log('Paste event triggered in sidebar');
          
          const clipboardData = event.clipboardData;
          if (!clipboardData) {
            throw new Error('No clipboard data available');
          }
          
          const items = clipboardData.items;
          console.log('Clipboard items count:', items.length);
          
          // Process files first
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(`Item ${i}: type=${item.type}, kind=${item.kind}`);
            
            if (item.kind === 'file') {
              const file = item.getAsFile();
              if (file) {
                console.log('Processing file:', file.name, 'type:', file.type, 'size:', file.size);
                await handleDropFile(file);
                hasProcessedContent = true;
              }
            }
          }
          
          // Fall back to text if no files found
          if (!hasProcessedContent) {
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type === 'text/plain') {
                const text = await new Promise<string>((resolve) => {
                  item.getAsString(resolve);
                });
                if (text.trim()) {
                  createCardFromContent('Pasted Text', text.trim());
                  hasProcessedContent = true;
                  break;
                }
              }
            }
          }
          
          if (!hasProcessedContent) {
            throw new Error('No readable content found in clipboard');
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Paste event failed:', error);
          showError(`Failed to paste from clipboard: ${(error as Error).message}`);
        } finally {
          // Clean up
          pasteInput.removeEventListener('paste', handlePasteEvent);
          document.body.removeChild(pasteInput);
        }
      };
      
      // Add the event listener
      pasteInput.addEventListener('paste', handlePasteEvent);
      
      // Try to trigger paste programmatically
      try {
        const success = document.execCommand('paste');
        console.log('execCommand paste result:', success);
        
        // If execCommand didn't work, try the Clipboard API as fallback
        if (!success) {
          console.log('execCommand failed, trying Clipboard API fallback');
          
          if (!navigator.clipboard) {
            throw new Error('Clipboard API not available');
          }

          // Try to read clipboard items (supports both text and files)
          const clipboardItems = await navigator.clipboard.read();
          
          for (const item of clipboardItems) {
            // Check for files first
            for (const type of item.types) {
              console.log('Clipboard item:', item);
              console.log(`Item type: ${type}`);
              if (type.startsWith('image/') || type.startsWith('application/') || type.startsWith('text/') && type !== 'text/plain') {
                try {
                  const blob = await item.getType(type);
                  const file = new File([blob], `clipboard-${Date.now()}.${getFileExtensionFromType(type)}`, { type });
                  await handleDropFile(file);
                  hasProcessedContent = true;
                  break;
                } catch (error) {
                  console.warn('Failed to read clipboard file:', error);
                }
              }
            }
            
            if (hasProcessedContent) break;
            
            // Fall back to text content
            if (item.types.includes('text/plain')) {
              try {
                const text = await navigator.clipboard.readText();
                if (text.trim()) {
                  createCardFromContent('Pasted Text', text.trim());
                  hasProcessedContent = true;
                }
              } catch (error) {
                console.warn('Failed to read clipboard text:', error);
              }
            }
          }
          
          if (!hasProcessedContent) {
            throw new Error('No readable content found in clipboard');
          }
          
          setLoading(false);
          
          // Clean up fallback
          pasteInput.removeEventListener('paste', handlePasteEvent);
          document.body.removeChild(pasteInput);
        }
      } catch (error) {
        // Clean up on error
        pasteInput.removeEventListener('paste', handlePasteEvent);
        document.body.removeChild(pasteInput);
        throw error;
      }
      
    } catch (error) {
      console.error('Paste failed:', error);
      showError(`Failed to paste from clipboard: ${(error as Error).message}`);
    }
  };

  const getFileExtensionFromType = (mimeType: string): string => {
    const typeMap: { [key: string]: string } = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'text/plain': 'txt',
      'text/html': 'html',
      'application/json': 'json',
      'application/pdf': 'pdf',
      'application/zip': 'zip'
    };
    return typeMap[mimeType] || 'bin';
  };

  return (
    <MantineProvider theme={theme}>
      <Stack gap="lg" p="md">
        {topError && (
          <Alert variant="light" color="red" title="Edit Error" withCloseButton onClose={() => setTopError('')}>
            {topError}
          </Alert>
        )}
        
        <Group>
          <Button
            variant="filled"
            disabled={!gdocsEnabled}
            loading={loading}
            onClick={handleFetchGdocs}
          >
            Fetch Google Docs
          </Button>
          
          <Button
            variant="filled"
            disabled={!msWordEnabled}
            loading={loading}
            onClick={handleFetchMsWord}
          >
            Fetch MS Word
          </Button>
          
          <Button
            variant="filled"
            loading={loading}
            onClick={handleExtractContent}
          >
            Extract Page Content
          </Button>
          
          <Button
            variant="outline"
            loading={loading}
            onClick={handleTestChatGPT}
          >
            Test sendToChatGPT
          </Button>
          
          <Button
            variant="outline"
            leftSection={<IconClipboard size={16} />}
            loading={loading}
            onClick={handlePasteFromClipboard}
            title="Paste from clipboard (Ctrl+V)"
          >
            Paste
          </Button>
        </Group>

        <CardList
          contents={extractedContents}
          onReorder={handleReorderContents}
          onAddContent={handleAddContent}
          onCardClick={handleCardClick}
          onDeleteCard={handleDeleteCard}
          onDropFile={handleDropFile}
        />

        {extractedContents.length > 0 && (
          <Group justify="center">
            <Button
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 45 }}
              size="lg"
              onClick={handleCopyAllCards}
            >
              Copy All Cards ({extractedContents.length})
            </Button>
          </Group>
        )}
        
        {copySuccess && (
          <Alert variant="light" color="green" title="Success" withCloseButton onClose={() => setCopySuccess(false)}>
            All cards copied to clipboard successfully!
          </Alert>
        )}
        
        {bottomError && !loading && (
          <Alert variant="light" color="red" title="Command Error" withCloseButton onClose={() => setBottomError('')}>
            {bottomError}
          </Alert>
        )}

        <CardModal
          content={selectedCard}
          opened={modalOpened}
          onClose={handleModalClose}
          onSave={handleSaveCard}
        />
      </Stack>
    </MantineProvider>
  );
};

export default App;