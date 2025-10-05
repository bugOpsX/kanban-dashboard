import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Avatar,
  IconButton,
  Stack,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useState } from 'react';

const TAG_COLORS = {
  bug: '#ff4444',
  feature: '#00C851',
  improvement: '#33b5e5',
  task: '#ffbb33',
  documentation: '#aa66cc',
  default: '#666666'
};

const TaskCard = ({ task, onEdit }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const cardStyles = {
    backgroundColor: isDark ? '#2A2A2A' : '#ffffff',
    color: isDark ? '#ffffff' : '#000000',
    '&:hover': {
      backgroundColor: isDark ? '#333333' : '#f5f5f5',
    },
    transition: 'all 0.2s ease',
    opacity: task.status === 'done' ? 0.8 : 1,
    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffbb33';
      case 'low': return '#00C851';
      default: return isDark ? '#757575' : '#9e9e9e';
    }
  };

  const getDeadlineStatus = (deadline) => {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffHours = (deadlineDate - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return { status: 'overdue', color: '#ff4444', icon: true };
    } else if (diffHours <= 24) {
      return { status: 'due-soon', color: '#ffbb33', icon: true };
    }
    return { status: 'upcoming', color: isDark ? '#666' : '#9e9e9e', icon: false };
  };

  const deadlineStatus = task.deadline ? getDeadlineStatus(task.deadline) : null;

  const getTagDisplay = (tag) => {
    if (typeof tag === 'object' && tag.text && tag.color) {
      return {
        text: tag.text,
        color: TAG_COLORS[tag.color] || TAG_COLORS.default
      };
    }
    return {
      text: tag,
      color: TAG_COLORS.default
    };
  };

  return (
    <>
      <Card
        elevation={isDark ? 0 : 1}
        sx={cardStyles}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {task.status === 'done' ? (
                  <CheckCircleIcon sx={{ color: '#00C851', fontSize: '1.2rem' }} />
                ) : (
                  deadlineStatus?.icon && (
                    <NotificationsActiveIcon 
                      sx={{ 
                        color: deadlineStatus.color,
                        fontSize: '1.2rem',
                        animation: deadlineStatus.status === 'overdue' ? 'pulse 1.5s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.5 },
                          '100%': { opacity: 1 },
                        }
                      }} 
                    />
                  )
                )}
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: '1rem', 
                    fontWeight: 500,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    color: isDark ? '#ffffff' : '#000000',
                  }}
                >
                  {task.title}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <IconButton 
                  size="small" 
                  onClick={onEdit} 
                  sx={{ 
                    color: isDark ? '#ffffff' : '#000000',
                    p: 0.5,
                    '&:hover': { 
                      bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    }
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{ 
                    color: isDark ? '#ff4444' : '#d32f2f',
                    p: 0.5,
                    '&:hover': { 
                      bgcolor: isDark ? 'rgba(255, 68, 68, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {task.description && (
              <Typography 
                variant="body2" 
                sx={{ 
                  color: isDark ? '#aaa' : '#666',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  fontSize: '0.875rem'
                }}
              >
                {task.description}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={task.priority}
                sx={{
                  bgcolor: getPriorityColor(task.priority),
                  color: '#fff',
                  height: '24px'
                }}
              />
              {task.deadline && (
                <Chip
                  size="small"
                  icon={<AccessTimeIcon sx={{ fontSize: '16px !important', color: 'inherit' }} />}
                  label={new Date(task.deadline).toLocaleString()}
                  sx={{
                    bgcolor: deadlineStatus?.color,
                    color: '#fff',
                    height: '24px',
                    '& .MuiChip-icon': { ml: 0.5 }
                  }}
                />
              )}
            </Box>

            {task.tags && task.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {task.tags.map((tag, index) => {
                  const { text, color } = getTagDisplay(tag);
                  return (
                    <Chip
                      key={index}
                      label={text}
                      size="small"
                      sx={{
                        bgcolor: color,
                        color: '#fff',
                        height: '20px',
                        fontSize: '0.75rem'
                      }}
                    />
                  );
                })}
              </Box>
            )}

            {task.assignee && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                mt: 0.5 
              }}>
                <Avatar
                  sx={{ 
                    width: 24, 
                    height: 24,
                    fontSize: '0.875rem',
                    bgcolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                    color: isDark ? '#ffffff' : '#000000'
                  }}
                >
                  {task.assignee[0].toUpperCase()}
                </Avatar>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: isDark ? '#aaa' : '#666',
                    fontSize: '0.75rem'
                  }}
                >
                  {task.assignee}
                </Typography>
              </Box>
            )}

            {task.status === 'done' && task.completedAt && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#00C851',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <CheckCircleIcon sx={{ fontSize: '0.875rem' }} />
                Completed on {new Date(task.completedAt.toDate()).toLocaleDateString()}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: isDark ? '#2A2A2A' : '#ffffff',
            color: isDark ? '#ffffff' : '#000000',
          }
        }}
      >
        <DialogTitle sx={{ color: isDark ? '#ffffff' : '#000000' }}>
          Delete Task
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: isDark ? '#aaa' : '#666' }}>
            Are you sure you want to delete "{task.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ color: isDark ? '#aaa' : '#666' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDelete}
            variant="contained" 
            color="error"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TaskCard;