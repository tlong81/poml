import React, { useState } from 'react';
import { Card, Text, Group, Badge, Stack, Box, Center, Divider } from '@mantine/core';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ExtractedContent } from '../types';
import InlineEditor from './InlineEditor';

interface CardListProps {
  contents: ExtractedContent[];
  onReorder: (from: number, to: number) => void;
  onAddContent: (content: string, insertIndex: number) => void;
}

const InteractiveDivider = ({ 
  insertIndex, 
  onAddContent 
}: { 
  insertIndex: number; 
  onAddContent: (content: string, insertIndex: number) => void;
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
        opacity: 0,
        transition: 'opacity 0.2s ease, max-height 0.2s ease',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.maxHeight = 'none';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0';
        e.currentTarget.style.maxHeight = '8px';
      }}
      onClick={() => setIsEditing(true)}
    >
      <Center style={{ width: '100%' }}>
        <Divider
          style={{ flex: 1, maxWidth: '100px' }}
          color="gray.4"
        />
        <Text 
          size="sm" 
          c="gray.6" 
          mx="md"
          style={{
            background: '#f8f9fa',
            padding: '4px 8px',
            borderRadius: '12px',
            border: '1px solid #e9ecef'
          }}
        >
          +
        </Text>
        <Divider
          style={{ flex: 1, maxWidth: '100px' }}
          color="gray.4"
        />
      </Center>
    </Box>
  );
};

const ContentCard = ({ content, index }: { content: ExtractedContent; index: number }) => (
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
          cursor: snapshot.isDragging ? 'grabbing' : 'grab'
        }}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        ref={provided.innerRef}
      >
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

export const CardList: React.FC<CardListProps> = ({ contents, onReorder, onAddContent }) => {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  if (contents.length === 0) {
    return (
      <Stack gap="md" style={{ marginBottom: '1rem' }}>
        <Text fw={500} size="lg">
          Extracted Content (0)
        </Text>
        <InteractiveDivider insertIndex={0} onAddContent={onAddContent} />
        <Card withBorder radius="md" p="xl" style={{ textAlign: 'center' }}>
          <Text c="dimmed" size="sm">
            No extracted content yet. Click "Extract Page Content" or use the divider above to add cards.
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
              <InteractiveDivider insertIndex={0} onAddContent={onAddContent} />
              {contents.map((content, index) => (
                <React.Fragment key={content.id}>
                  <ContentCard content={content} index={index} />
                  <InteractiveDivider insertIndex={index + 1} onAddContent={onAddContent} />
                </React.Fragment>
              ))}
              {provided.placeholder}
            </Stack>
          )}
        </Droppable>
      </DragDropContext>
    </Stack>
  );
};

export default CardList;