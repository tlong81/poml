/**
 * DroppableDivider Component
 * A double-line divider with plus sign that transforms into a droppable area when dragging
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Text
} from '@mantine/core';
import {
  IconPlus
} from '@tabler/icons-react';

interface DroppableDividerProps {
  index: number;
  isVisible: boolean;
  nestingLevel: number;
  onAddCard: (index: number) => void;
}

export const DroppableDivider: React.FC<DroppableDividerProps> = ({
  index,
  isVisible,
  nestingLevel,
  onAddCard
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  
  return (
    <Box
      style={{
        position: 'relative',
        height: isVisible || isHovered || isDragActive ? '40px' : '12px',
        transition: 'all 0.2s ease',
        marginLeft: nestingLevel * 20,
        marginTop: '8px',
        marginBottom: '8px',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onAddCard(index)}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragActive(false);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
        // Handle card drop here if needed
      }}
    >
      {/* Single line when not active, double line with plus when active */}
      {!isVisible && !isHovered && !isDragActive ? (
        // Single line with very low opacity when inactive
        <Box
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            height: '1px',
            backgroundColor: '#e0e0e0',
            opacity: 0.3
          }}
        />
      ) : (
        // Double line divider with plus sign when active
        <Box
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {/* First line */}
          <Box
            style={{
              flex: 1,
              height: '1px',
              backgroundColor: isDragActive ? '#228be6' : (isHovered ? '#666' : '#ddd'),
              transition: 'background-color 0.2s ease'
            }}
          />
          
          {/* Plus sign */}
          <Box
            style={{
              margin: '0 12px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: isDragActive ? '#228be6' : (isHovered ? '#666' : '#ddd'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              transform: isDragActive ? 'scale(1.2)' : 'scale(1)'
            }}
          >
            <IconPlus 
              size={12} 
              color="white"
              style={{
                transform: isDragActive ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease'
              }}
            />
          </Box>
          
          {/* Second line */}
          <Box
            style={{
              flex: 1,
              height: '1px',
              backgroundColor: isDragActive ? '#228be6' : (isHovered ? '#666' : '#ddd'),
              transition: 'background-color 0.2s ease'
            }}
          />
        </Box>
      )}
      
      {/* Droppable area overlay when dragging */}
      {isDragActive && (
        <Paper
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(34, 139, 230, 0.1)',
            border: '2px dashed #228be6',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Text size="xs" c="blue" fw={500}>
            Drop to add card here
          </Text>
        </Paper>
      )}

    </Box>
  );
};

export default DroppableDivider;