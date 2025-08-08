/**
 * Editable Card List Component
 * Provides an editable, reorderable, nestable list of cards
 */

import React, { useCallback } from 'react';
import {
  Stack,
  Box,
  Button,
  Group
} from '@mantine/core';
import {
  IconPlus
} from '@tabler/icons-react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import {
  CardModel,
  isNestedContent,
  generateId
} from '@functions/cardModel';
import { CardItem } from './CardItem';

interface EditableCardListProps {
  cards: CardModel[];
  onChange: (cards: CardModel[]) => void;
  onSave?: (cards: CardModel[]) => void;
  onCardClick?: (card: CardModel) => void;
  editable?: boolean;
  nestingLevel?: number;
  maxNestingLevel?: number;
}

export const EditableCardList: React.FC<EditableCardListProps> = ({
  cards,
  onChange,
  onSave,
  onCardClick,
  editable = true,
  nestingLevel = 0,
  maxNestingLevel = 3
}) => {
  const handleDragEnd = useCallback((result: DropResult) => {
    if (!result.destination) return;
    
    const newCards = Array.from(cards);
    const [reorderedItem] = newCards.splice(result.source.index, 1);
    newCards.splice(result.destination.index, 0, reorderedItem);
    
    // Update order property
    const updatedCards = newCards.map((card, index) => ({
      ...card,
      order: index
    }));
    
    onChange(updatedCards);
  }, [cards, onChange]);
  
  const handleUpdateCard = useCallback((updatedCard: CardModel) => {
    const newCards = cards.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    );
    onChange(newCards);
  }, [cards, onChange]);
  
  const handleDeleteCard = useCallback((id: string) => {
    const newCards = cards.filter(card => card.id !== id);
    onChange(newCards);
  }, [cards, onChange]);
  
  const handleAddCard = useCallback(() => {
    const newCard: CardModel = {
      id: generateId(),
      content: { type: 'text', value: '' },
      timestamp: new Date(),
      order: cards.length
    };
    onChange([...cards, newCard]);
  }, [cards, onChange]);
  
  const handleAddChild = useCallback((parentId: string, child: CardModel) => {
    const updateCardRecursive = (cardList: CardModel[]): CardModel[] => {
      return cardList.map(card => {
        if (card.id === parentId) {
          if (isNestedContent(card.content)) {
            return {
              ...card,
              content: {
                ...card.content,
                children: [...card.content.children, child]
              }
            };
          } else {
            return {
              ...card,
              content: {
                type: 'nested',
                children: [child]
              },
              componentType: 'List'
            };
          }
        } else if (isNestedContent(card.content)) {
          return {
            ...card,
            content: {
              ...card.content,
              children: updateCardRecursive(card.content.children)
            }
          };
        }
        return card;
      });
    };
    
    onChange(updateCardRecursive(cards));
  }, [cards, onChange]);
  
  return (
    <Stack gap="sm">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`cards-${nestingLevel}`}>
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {cards.map((card, index) => (
                <Box key={card.id} mb="sm">
                  <CardItem
                    card={card}
                    index={index}
                    onUpdate={handleUpdateCard}
                    onDelete={handleDeleteCard}
                    onCardClick={onCardClick}
                    onAddChild={nestingLevel < maxNestingLevel ? handleAddChild : undefined}
                    editable={editable}
                    nestingLevel={nestingLevel}
                    maxNestingLevel={maxNestingLevel}
                    EditableCardListComponent={EditableCardList}
                  />
                </Box>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      {editable && nestingLevel === 0 && (
        <Group justify="space-between">
          <Button
            variant="light"
            leftSection={<IconPlus size={16} />}
            onClick={handleAddCard}
          >
            Add Card
          </Button>
          
          {onSave && (
            <Button onClick={() => onSave(cards)}>
              Save Collection
            </Button>
          )}
        </Group>
      )}
    </Stack>
  );
};

export default EditableCardList;