import React from 'react';
import { Card, Text, Group, Badge, Stack } from '@mantine/core';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ExtractedContent } from '../types';

interface CardListProps {
  contents: ExtractedContent[];
  onReorder: (from: number, to: number) => void;
}

const ContentCard = ({ content, index }: { content: ExtractedContent; index: number }) => (
  <Draggable key={content.id} index={index} draggableId={content.id}>
    {(provided, snapshot) => (
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{
          marginBottom: '1rem',
          opacity: snapshot.isDragging ? 0.8 : 1,
          transform: snapshot.isDragging ? 'rotate(2deg)' : 'none',
          cursor: snapshot.isDragging ? 'grabbing' : 'grab'
        }}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        ref={provided.innerRef}
      >
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
      </Card>
    )}
  </Draggable>
);

export const CardList: React.FC<CardListProps> = ({ contents, onReorder }) => {
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    onReorder(result.source.index, result.destination.index);
  };

  if (contents.length === 0) {
    return (
      <Card withBorder radius="md" p="xl" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <Text c="dimmed" size="sm">
          No extracted content yet. Click "Extract Page Content" to add cards here.
        </Text>
      </Card>
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
            <div {...provided.droppableProps} ref={provided.innerRef}>
              {contents.map((content, index) => (
                <ContentCard key={content.id} content={content} index={index} />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </Stack>
  );
};

export default CardList;