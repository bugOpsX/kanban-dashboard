import React from 'react';
import { Paper, Typography, Box, IconButton, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TaskCard from './TaskCard';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';

const Column = ({ id, title, tasks = [], color, onAddTask, onEditTask, onDeleteTask }) => {
  const { setNodeRef } = useDroppable({
    id: id
  });

  return (
    <Paper 
      elevation={0}
      sx={{ 
        minWidth: 300,
        maxWidth: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: '16px',
        border: (theme) => `1px solid ${theme.palette.divider}`,
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 2,
          borderColor: color,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: (theme) => theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.paper, 0.5)
            : alpha(theme.palette.background.paper, 0.8),
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
          {title}
        </Typography>
        <IconButton 
          size="small" 
          onClick={() => onAddTask(id)}
          sx={{
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            '&:hover': {
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
            }
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>

      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          p: 2,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: (theme) => theme.palette.mode === 'dark' 
              ? alpha(theme.palette.primary.main, 0.2)
              : alpha(theme.palette.primary.main, 0.1),
            borderRadius: '3px',
            '&:hover': {
              background: (theme) => theme.palette.mode === 'dark' 
                ? alpha(theme.palette.primary.main, 0.3)
                : alpha(theme.palette.primary.main, 0.2),
            }
          }
        }}
      >
        <SortableContext
          items={tasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
      </Box>
    </Paper>
  );
};

export default Column; 