import React, { useState, useEffect, useRef } from 'react';
import { createTheme, MantineProvider, Stack, Button, Group } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import CardList from './components/CardList';
import { ExtractedContent } from './types';

import '@mantine/core/styles.css';

const theme = createTheme({
  /** Put your mantine theme override here */
});

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gdocsEnabled, setGdocsEnabled] = useState(false);
  const [msWordEnabled, setMsWordEnabled] = useState(false);
  const [extractedContents, extractedContentsHandlers] = useListState<ExtractedContent>([]);
  const preloadedFilesRef = useRef<File[] | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    updateButtonStates();
    const interval = setInterval(updateButtonStates, 2000);
    preloadDragFiles();
    return () => clearInterval(interval);
  }, []);

  const showLoading = () => {
    setLoading(true);
    setError('');
  };

  const showError = (errorMsg: string) => {
    setError(errorMsg);
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
    const newContent: ExtractedContent = {
      id: Date.now().toString(),
      title: content.split('\n')[0]?.substring(0, 100) || 'Manual Entry',
      content,
      excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      timestamp: new Date(),
      isManual: true
    };
    
    extractedContentsHandlers.insert(insertIndex, newContent);
  };

  return (
    <MantineProvider theme={theme}>
      <Stack gap="lg" p="md">
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
        </Group>

        <CardList
          contents={extractedContents}
          onReorder={handleReorderContents}
          onAddContent={handleAddContent}
        />
        
        {error && !loading && (
          <div className="text" style={{ color: 'red' }}>{error}</div>
        )}
      </Stack>
    </MantineProvider>
  );
};

export default App;