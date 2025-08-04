import React, { useState } from 'react';
import { Card, Text, Group, Badge, Stack, Box, Center, Divider, ActionIcon } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ExtractedContent } from '../types';
import InlineEditor from './InlineEditor';

interface CardListProps {
  contents: ExtractedContent[];
  onReorder: (from: number, to: number) => void;
  onAddContent: (content: string, insertIndex: number) => void;
  onCardClick: (content: ExtractedContent) => void;
  onDeleteCard: (id: string) => void;
  onDropFile: (file: File, insertIndex?: number) => void;
}

const InteractiveDivider = ({ 
  insertIndex, 
  onAddContent,
  onDropFile,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop
}: { 
  insertIndex: number; 
  onAddContent: (content: string, insertIndex: number) => void;
  onDropFile?: (file: File, insertIndex: number) => void;
  isDragOver?: boolean;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = (content: string) => {
    onAddContent(content, insertIndex);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <InlineEditor
        onSave={handleSave}
        onCancel={handleCancel}
        placeholder="Enter your content here..."
      />
    );
  }

  return (
    <Box
      style={{
        opacity: isDragOver ? 1 : 0,
        transition: 'opacity 0.2s ease, max-height 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: isDragOver ? '#e3f2fd' : 'transparent',
        borderRadius: isDragOver ? '8px' : '0',
        padding: isDragOver ? '12px' : '0'
      }}
      onMouseEnter={(e) => {
        if (!isDragOver) {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.maxHeight = 'none';
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragOver) {
          e.currentTarget.style.opacity = '0';
          e.currentTarget.style.maxHeight = '8px';
        }
      }}
      onClick={() => setIsEditing(true)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Center style={{ width: '100%' }}>
        <Divider
          style={{ flex: 1, maxWidth: '100px' }}
          color="gray.4"
        />
        <Text 
          size="sm" 
          c={isDragOver ? "blue.6" : "gray.6"}
          mx="md"
          style={{
            background: isDragOver ? '#e3f2fd' : '#f8f9fa',
            padding: '4px 8px',
            borderRadius: '12px',
            border: isDragOver ? '1px solid #2196f3' : '1px solid #e9ecef'
          }}
        >
          {isDragOver ? '📁' : '+'}
        </Text>
        <Divider
          style={{ flex: 1, maxWidth: '100px' }}
          color="gray.4"
        />
      </Center>
    </Box>
  );
};

const ContentCard = ({ content, index, onCardClick, onDeleteCard }: { content: ExtractedContent; index: number; onCardClick: (content: ExtractedContent) => void; onDeleteCard: (id: string) => void }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
  <Draggable key={content.id} index={index} draggableId={content.id}>
    {(provided, snapshot) => (
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{
          opacity: snapshot.isDragging ? 0.8 : 1,
          transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
          cursor: snapshot.isDragging ? 'grabbing' : 'pointer',
          position: 'relative'
        }}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        ref={provided.innerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCardClick(content);
        }}
      >
        {/* Delete button - visible on hover */}
        {isHovered && (
          <ActionIcon
            color="red"
            variant="subtle"
            size="sm"
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              zIndex: 10
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteCard(content.id);
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        )}

        {content.isManual ? (
          // Simple layout for manual content
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {content.content}
          </Text>
        ) : (
          // Full layout for extracted content
          <>
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="sm" truncate style={{ maxWidth: '70%' }}>
                {content.title}
              </Text>
              <Badge color="blue" variant="light" size="xs">
                {content.timestamp.toLocaleTimeString()}
              </Badge>
            </Group>

            <Text size="xs" c="dimmed" mb="sm" truncate>
              {content.url}
            </Text>

            <Text size="sm" lineClamp={3}>
              {content.excerpt}
            </Text>
          </>
        )}
      </Card>
    )}
  </Draggable>
  );
};

export const CardList: React.FC<CardListProps> = ({ contents, onReorder, onAddContent, onCardClick, onDeleteCard, onDropFile }) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDragOverEnd, setIsDragOverEnd] = useState(false);

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  const handleFileDragOver = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (index !== undefined) {
      setDragOverIndex(index);
      setIsDragOverEnd(false);
    } else {
      setIsDragOverEnd(true);
      setDragOverIndex(null);
    }
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the entire component
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
      setIsDragOverEnd(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    setIsDragOverEnd(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // For now, handle only the first file
      onDropFile(files[0], index);
    }
  };

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  if (contents.length === 0) {
    return (
      <Stack gap="md" style={{ marginBottom: '1rem' }}>
        <Text fw={500} size="lg">
          Extracted Content (0)
        </Text>
        <InteractiveDivider 
          insertIndex={0} 
          onAddContent={onAddContent}
          isDragOver={dragOverIndex === 0}
          onDragOver={(e) => handleFileDragOver(e, 0)}
          onDragLeave={handleFileDragLeave}
          onDrop={(e) => handleFileDrop(e, 0)}
        />
        <Card 
          withBorder 
          radius="md" 
          p="xl" 
          style={{ 
            textAlign: 'center',
            backgroundColor: isDragOverEnd ? '#e3f2fd' : 'transparent',
            border: isDragOverEnd ? '2px dashed #2196f3' : undefined
          }}
          onDragOver={(e) => handleFileDragOver(e)}
          onDragLeave={handleFileDragLeave}
          onDrop={(e) => handleFileDrop(e)}
        >
          <Text c={isDragOverEnd ? "blue.6" : "dimmed"} size="sm">
            {isDragOverEnd ? "📁 Drop files here to create cards" : "No extracted content yet. Click \"Extract Page Content\" or use the divider above to add cards."}
          </Text>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack gap="md" style={{ marginBottom: '1rem' }}>
      <Text fw={500} size="lg">
        Extracted Content ({contents.length})
      </Text>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="content-list" direction="vertical">
          {(provided) => (
            <Stack gap="md" {...provided.droppableProps} ref={provided.innerRef}>
              <InteractiveDivider 
                insertIndex={0} 
                onAddContent={onAddContent}
                isDragOver={dragOverIndex === 0}
                onDragOver={(e) => handleFileDragOver(e, 0)}
                onDragLeave={handleFileDragLeave}
                onDrop={(e) => handleFileDrop(e, 0)}
              />
              {contents.map((content, index) => (
                <React.Fragment key={content.id}>
                  <ContentCard content={content} index={index} onCardClick={onCardClick} onDeleteCard={onDeleteCard} />
                  <InteractiveDivider 
                    insertIndex={index + 1} 
                    onAddContent={onAddContent}
                    isDragOver={dragOverIndex === index + 1}
                    onDragOver={(e) => handleFileDragOver(e, index + 1)}
                    onDragLeave={handleFileDragLeave}
                    onDrop={(e) => handleFileDrop(e, index + 1)}
                  />
                </React.Fragment>
              ))}
              {provided.placeholder}
              
              {/* End drop zone */}
              {isDragOverEnd && (
                <Card 
                  withBorder
                  radius="md"
                  p="md"
                  style={{
                    backgroundColor: '#e3f2fd',
                    border: '2px dashed #2196f3',
                    textAlign: 'center'
                  }}
                  onDragOver={(e) => handleFileDragOver(e)}
                  onDragLeave={handleFileDragLeave}
                  onDrop={(e) => handleFileDrop(e)}
                >
                  <Text c="blue.6" size="sm">
                    📁 Drop files here to add to the end
                  </Text>
                </Card>
              )}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>
    </Stack>
  );
};

export default CardList;