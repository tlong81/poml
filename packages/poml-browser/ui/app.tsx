import React, { useState, useEffect } from 'react';
import { MantineProvider, Stack, Button, Group } from '@mantine/core';
import { useListState } from '@mantine/hooks';
import { IconClipboard } from '@tabler/icons-react';
import EditableCardList from './components/EditableCardList';
import CardModal from './components/CardModal';
import { ExtractedContent } from '@functions/types';
import { CardModel, createCard, isTextContent } from '@functions/cardModel';
import { shadcnTheme } from './themes/zinc';
import { googleDocsManager } from '@functions/gdoc';
import { msWordManager } from '@functions/msword';
import {
  readFileContent,
  useGlobalPasteListener,
  arrayBufferToDataUrl
} from '@functions/clipboard';
import { extractPageContent } from '@functions/html';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import TopNotifications from './components/TopNotifications';
import BottomNotifications from './components/BottomNotifications';

import '@mantine/core/styles.css';
import pomlHelper from '@functions/pomlHelper';

// Inner component that uses the notification system
const AppContent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [cards, cardsHandlers] = useListState<CardModel>([]);
  const [selectedCard, setSelectedCard] = useState<ExtractedContent | null>(null);
  const [modalOpened, setModalOpened] = useState(false);
  
  // Use the notification system
  const { showError, showSuccess, showWarning, showInfo } = useNotifications();

  // Add global paste listener
  useGlobalPasteListener((textContent, files) => {
    handlePastedContent(textContent, files);
  });

  const showLoading = () => {
    setLoading(true);
  };

  const hideLoading = () => {
    setLoading(false);
  };

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
        const newCard = createCard({
          title,
          content: { type: 'text', value: content },
          metadata: {
            source: 'web',
            excerpt,
            url: currentUrl
          }
        });

        // Add to card list
        cardsHandlers.append(newCard);
        hideLoading();
        showSuccess('Page content extracted successfully');
      } else {
        throw new Error('No readable content found');
      }
    } catch (error) {
      hideLoading();
      showError((error as Error).message, 'Extract Content Failed');
    }
  };

  const handleCardsChange = (newCards: CardModel[]) => {
    cardsHandlers.setState(newCards);
  };

  const handleCopyAllCards = async () => {
    try {
      if (cards.length === 0) {
        showWarning('No cards to copy');
        return;
      }

      // Use pomlHelper to convert cards to POML format
      const pomlContent = await pomlHelper(cards);
      console.log('POML content:', pomlContent);

      // Copy to clipboard
      await navigator.clipboard.writeText(pomlContent);
      showSuccess(`Copied ${cards.length} cards to clipboard`, 'POML Content Copied', undefined, 'bottom');
    } catch (error) {
      showError(`Failed to copy cards: ${(error as Error).message}`, 'Copy Failed');
    }
  };

  const handleCardClick = (card: CardModel) => {
    // Convert CardModel back to ExtractedContent for modal compatibility
    const extractedContent: ExtractedContent = {
      id: card.id,
      title: card.title || '',
      content: isTextContent(card.content) ? card.content.value : '',
      excerpt: card.metadata?.excerpt || '',
      url: card.metadata?.url,
      timestamp: card.timestamp || new Date(),
      isManual: card.metadata?.source === 'manual',
      debug: card.metadata?.debug
    };
    
    setSelectedCard(extractedContent);
    setModalOpened(true);
  };

  const handleSaveCard = (id: string, newContent: string) => {
    const index = cards.findIndex(card => card.id === id);
    if (index !== -1) {
      const updatedCard: CardModel = {
        ...cards[index],
        content: { type: 'text', value: newContent }
      };
      cardsHandlers.setItem(index, updatedCard);
    }
  };

  const handleDeleteCard = (id: string) => {
    const index = cards.findIndex(card => card.id === id);
    if (index !== -1) {
      cardsHandlers.remove(index);
    }
  };

  const handlePastedContent = async (textContent: string, files: File[]) => {
    try {
      if (!textContent && (!files || files.length === 0)) {
        return;
      }

      const createCardHelper = (title: string, content: string, metadata: any = {}): CardModel => 
        createCard({
          title,
          content: { type: 'text', value: content },
          metadata: {
            source: 'clipboard',
            excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
            ...metadata
          }
        });

      // Handle text content
      if (textContent) {
        const lines = textContent.split('\n').filter(line => line.trim());
        const title = lines[0]?.substring(0, 100) || 'Pasted Content';
        cardsHandlers.append(createCardHelper(title, textContent));
      }

      // Handle files
      if (files && files.length > 0) {
        for (const file of files) {
          try {
            if (file.type.startsWith('image/')) {
              const dataUrl = await arrayBufferToDataUrl(await file.arrayBuffer(), file.type);
              const card = createCard({
                title: file.name,
                content: { 
                  type: 'binary', 
                  value: dataUrl.split(',')[1], // Remove data:image/...;base64, prefix
                  mimeType: file.type,
                  encoding: 'base64'
                },
                metadata: {
                  source: 'clipboard'
                }
              });
              cardsHandlers.append(card);
            } else {
              const content = await readFileContent(file);
              const title = file.name || 'Pasted File';
              cardsHandlers.append(createCardHelper(title, content, { fileName: file.name }));
            }
          } catch (error) {
            console.error('Failed to process file:', error);
            showError(`Failed to process file: ${file.name}`, 'File Processing Error');
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle pasted content:', error);
      showError('Failed to process pasted content', 'Paste Error');
    }
  };

  const handleDropFile = async (file: File, insertIndex?: number) => {
    try {
      const content = await readFileContent(file);
      const title = file.name || 'Dropped File';
      const newCard = createCard({
        title,
        content: { type: 'text', value: content },
        metadata: {
          source: 'file',
          fileName: file.name,
          excerpt: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        }
      });

      if (insertIndex !== undefined) {
        cardsHandlers.insert(insertIndex, newCard);
      } else {
        cardsHandlers.append(newCard);
      }
    } catch (error) {
      console.error('Failed to handle dropped file:', error);
      showError(`Failed to process dropped file: ${file.name}`, 'Drop Error');
    }
  };

  return (
    <Stack
      style={{
        width: '100%',
        minWidth: '200px',
        height: '100vh',
        padding: '16px',
        overflow: 'auto'
      }}
    >
      <EditableCardList
        cards={cards}
        onChange={handleCardsChange}
        onCardClick={handleCardClick}
        editable={true}
        nestingLevel={0}
        maxNestingLevel={3}
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
          leftSection={<IconClipboard size={16} />}
          disabled={cards.length === 0}
          onClick={handleCopyAllCards}
        >
          Copy All Cards ({cards.length})
        </Button>
      </Group>

      {/* Card Modal */}
      <CardModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        content={selectedCard}
        onSave={handleSaveCard}
      />

      {/* Bottom notifications appended to content */}
      <BottomNotifications />
    </Stack>
  );
};

// Main App component with providers
const App: React.FC = () => {
  return (
    <MantineProvider theme={shadcnTheme} defaultColorScheme="light">
      <NotificationProvider>
        <AppContent />
        {/* Top notifications overlay */}
        <TopNotifications />
      </NotificationProvider>
    </MantineProvider>
  );
};

export default App;