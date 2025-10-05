import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard';
import { Box } from '@mui/material';

export function SortableTask({ id, task, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <Box
        ref={setNodeRef}
        sx={{
          mb: 1,
          height: '100px', // Adjust based on your TaskCard height
          bgcolor: 'rgba(255,255,255,0.1)',
          borderRadius: 1,
          border: '2px dashed rgba(255,255,255,0.2)',
        }}
      />
    );
  }

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        mb: 1,
        '&:last-child': { mb: 0 },
        cursor: 'grab',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
        transition: 'transform 0.2s ease',
      }}
    >
      <TaskCard task={task} onEdit={onEdit} />
    </Box>
  );
} 