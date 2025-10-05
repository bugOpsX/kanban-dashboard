import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Box } from '@mui/material';

export function Droppable({ id, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <Box 
      ref={setNodeRef}
      sx={{
        transition: 'background-color 0.2s ease',
        bgcolor: isOver ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderRadius: 1,
      }}
    >
      {children}
    </Box>
  );
} 