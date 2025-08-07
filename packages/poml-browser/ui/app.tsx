import React, { useState, useEffect, useRef } from 'react';
import { MantineProvider, Stack, Button, Group, Alert } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { IconClipboard } from '@tabler/icons-react';
import CardList from './components/CardList';
import CardModal from './components/CardModal';
import { ExtractedContent } from '@functions/types';
import { shadcnTheme } from './themes/zinc';
import { googleDocsManager } from '@functions/gdoc';
import { msWordManager } from '@functions/msword';
import {
  readFileContent,
  useGlobalPasteListener,
  getFileExtensionFromType,
  arrayBufferToDataUrl,
  pastedFileToFile,
  PastedPayload,
  handlePasteEvent
} from '@functions/clipboard';
import { extractPageContent } from '@functions/html';

import '@mantine/core/styles.css';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [topError, setTopError] = useState(''); // For edit errors
  const [bottomError, setBottomError] = useState(''); // For command errors
  const [copySuccess, setCopySuccess] = useState(false);
  const [extractedContents, extractedContentsHandlers] = useListState<ExtractedContent>([]);
  const [selectedCard, setSelectedCard] = useState<ExtractedContent | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  // Add global paste listener
  useGlobalPasteListener((textContent, files) => {
    handlePastedContent(textContent, files);
  });

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

  const handleExtractContent = async () => {
    try {
      showLoading();
      let content: string;
      if (await googleDocsManager.checkGoogleDocsTab()) {
        content = await googleDocsManager.fetchGoogleDocsContent();
      } else if (await msWordManager.checkMsWordTab()) {
        content = await msWordManager.fetchMsWordContent();
      } else {
        content = await extractPageContent();
      }

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
      const allContent = extractedContents.map(card => card.content).join('\n\n---\n\n');

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
        title:
          extractedContents[index].isManual || !extractedContents[index].title
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

  const handlePastedContent = (textContent: string, files: File[]) => {
    if (files.length > 0) {
      files.forEach(file => handleDropFile(file));
    } else if (textContent.trim()) {
      createCardFromContent('Pasted Text', textContent.trim());
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
      let content: string;
      let title: string = file.name;

      // Handle images specially
      if (file.type.startsWith('image/')) {
        const arrayBuffer = await file.arrayBuffer();
        const dataUrl = arrayBufferToDataUrl(arrayBuffer, file.type);
        content = `![${file.name}](${dataUrl})`;
        title = `Image: ${file.name}`;
      } else {
        // Read file content for text files
        content = await readFileContent(file);
      }

      createCardFromContent(title, content, insertIndex);
      setTopError(''); // Clear any previous errors
    } catch (error) {
      console.error('Failed to read file:', error);
      setTopError(`Failed to read file: ${file.name}`);
    }
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

      const handlePaste = async (event: ClipboardEvent) => {
        try {
          event.preventDefault();
          const payload = await handlePasteEvent(event);

          if (payload.files.length > 0) {
            // Convert PastedFiles to Files and handle them
            for (const pastedFile of payload.files) {
              const file = pastedFileToFile(pastedFile);
              await handleDropFile(file);
            }
            hasProcessedContent = true;
          } else if (payload.plainText) {
            createCardFromContent('Pasted Text', payload.plainText);
            hasProcessedContent = true;
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
          pasteInput.removeEventListener('paste', handlePaste);
          document.body.removeChild(pasteInput);
        }
      };

      // Add the event listener
      pasteInput.addEventListener('paste', handlePaste);

      // Try to trigger paste programmatically
      const success = document.execCommand('paste');
      if (!success) {
        // Fallback to Clipboard API
        try {
          const clipboardItems = await navigator.clipboard.read();
          const files: File[] = [];
          let textContent = '';

          for (const item of clipboardItems) {
            // Check for files first (including images)
            for (const type of item.types) {
              if (
                type.startsWith('image/') ||
                type.startsWith('application/') ||
                type !== 'text/plain'
              ) {
                try {
                  const blob = await item.getType(type);
                  const file = new File(
                    [blob],
                    `clipboard-${Date.now()}.${getFileExtensionFromType(type)}`,
                    { type }
                  );
                  files.push(file);
                } catch (error) {
                  console.warn('Failed to read clipboard file:', error);
                }
              }
            }

            if (files.length === 0 && item.types.includes('text/plain')) {
              try {
                textContent = await navigator.clipboard.readText();
              } catch (error) {
                console.warn('Failed to read clipboard text:', error);
              }
            }
          }

          handlePastedContent(textContent, files);
          setLoading(false);
        } catch (error) {
          throw new Error('Clipboard API failed and execCommand paste also failed');
        }

        // Clean up fallback
        pasteInput.removeEventListener('paste', handlePaste);
        document.body.removeChild(pasteInput);
      }
    } catch (error) {
      console.error('Paste failed:', error);
      showError(`Failed to paste from clipboard: ${(error as Error).message}`);
    }
  };

  return (
    <MantineProvider theme={shadcnTheme}>
      <Stack gap="md" p="md">
        {topError && (
          <Alert
            variant="light"
            color="red"
            title="Edit Error"
            withCloseButton
            onClose={() => setTopError('')}
          >
            {topError}
          </Alert>
        )}

        <CardList
          contents={extractedContents}
          onReorder={handleReorderContents}
          onAddContent={handleAddContent}
          onCardClick={handleCardClick}
          onDeleteCard={handleDeleteCard}
          onDropFile={handleDropFile}
        />

        <Group>
          <Button
            fullWidth
            variant="outline"
            color="primary"
            loading={loading}
            onClick={handleExtractContent}
          >
            Extract Page Content
          </Button>
          <Button
            fullWidth
            variant="filled"
            color="primary"
            onClick={handleCopyAllCards}
            disabled={extractedContents.length === 0}
          >
            Copy All Cards ({extractedContents.length})
          </Button>
        </Group>

        {copySuccess && (
          <Alert
            variant="light"
            color="green"
            title="Success"
            withCloseButton
            onClose={() => setCopySuccess(false)}
          >
            All cards copied to clipboard successfully!
          </Alert>
        )}

        {bottomError && !loading && (
          <Alert
            variant="light"
            color="red"
            title="Command Error"
            withCloseButton
            onClose={() => setBottomError('')}
          >
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
