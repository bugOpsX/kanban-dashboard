import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  AvatarGroup,
  Divider,
  Paper,
  useTheme,
} from '@mui/material';
import {
  DndContext,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverlay,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import TaskCard from './TaskCard';
import TaskDialog from './TaskDialog';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import AddIcon from '@mui/icons-material/Add';
import { Droppable } from './Droppable';
import { SortableTask } from './SortableTask';
import { requestNotificationPermission } from '../utils/notifications';
import TaskNotifications from './TaskNotifications';

const KanbanBoard = ({ selectedCategory, userId }) => {
  const [tasks, setTasks] = useState([]);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (!selectedCategory) return;

    const q = query(
      collection(db, 'tasks'),
      where('categoryId', '==', selectedCategory.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
    });

    // Fetch collaborators
    const fetchCollaborators = async () => {
      const categoryDoc = await getDoc(doc(db, 'categories', selectedCategory.id));
      const sharedWith = categoryDoc.data()?.sharedWith || [];
      setCollaborators(sharedWith);
    };

    fetchCollaborators();
    return () => unsubscribe();
  }, [selectedCategory]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const getTasksByStatus = (status) => {
    return tasks.filter(task => task.status === status);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    setActiveTask(tasks.find(task => task.id === active.id));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const taskId = active.id;
    const newStatus = over.id;
    
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        completedAt: newStatus === 'done' ? serverTimestamp() : null,
        lastModified: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TaskNotifications tasks={tasks} />
      {/* Task Bar */}
      <Paper 
        elevation={0}
        sx={{ 
          bgcolor: isDark ? '#1E1E1E' : '#f5f5f5',
          p: 2,
          mb: 2,
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ color: isDark ? '#fff' : '#000' }}>
            {selectedCategory?.name || 'Tasks'}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ bgcolor: isDark ? '#333' : '#ddd' }} />
          <Typography variant="body2" sx={{ color: isDark ? '#888' : '#666' }}>
            {tasks.length} tasks
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: isDark ? '#888' : '#666' }}>
            Collaborators:
          </Typography>
          <AvatarGroup max={4} sx={{ 
            '& .MuiAvatar-root': { 
              width: 30, 
              height: 30, 
              fontSize: '0.875rem',
              bgcolor: '#333',
              color: '#fff'
            }
          }}>
            {collaborators.map((email, index) => (
              <Avatar key={index}>
                {email[0].toUpperCase()}
              </Avatar>
            ))}
          </AvatarGroup>
        </Box>
      </Paper>

      {/* Kanban Board */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          p: 2,
          bgcolor: isDark ? '#1a1a1a' : '#f0f0f0',
          flexGrow: 1,
          overflowX: 'auto',
          minHeight: 'calc(100vh - 180px)', // Adjusted for task bar
        }}
      >
        <DndContext 
          sensors={sensors} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {['todo', 'inProgress', 'done'].map((status) => (
            <Box
              key={status}
              sx={{
                width: '33%',
                minWidth: 300,
                bgcolor: isDark ? '#1E1E1E' : '#fff',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: isDark ? 'none' : 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: status === 'todo' ? '#0088ff' : 
                             status === 'inProgress' ? '#FFA500' : '#00C853',
                }}
              >
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: isDark ? '#fff' : '#000',
                    fontSize: '1rem',
                    fontWeight: 500,
                  }}
                >
                  {status === 'todo' && 'To Do'}
                  {status === 'inProgress' && 'In Progress'}
                  {status === 'done' && 'Done'}
                </Typography>
                <IconButton
                  onClick={() => {
                    setSelectedColumn(status);
                    setOpenTaskDialog(true);
                  }}
                  sx={{ 
                    color: isDark ? '#fff' : '#000',
                    p: 0,
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Box>

              <Droppable id={status}>
                <SortableContext items={getTasksByStatus(status).map(t => t.id)}>
                  <Box sx={{ minHeight: 'calc(100vh - 130px)', p: 2 }}>
                    {getTasksByStatus(status).map((task) => (
                      <SortableTask
                        key={task.id}
                        id={task.id}
                        task={task}
                        onEdit={() => {
                          setSelectedTask(task);
                          setOpenTaskDialog(true);
                        }}
                      />
                    ))}
                  </Box>
                </SortableContext>
              </Droppable>
            </Box>
          ))}

          <DragOverlay>
            {activeTask ? (
              <Box
                sx={{
                  transform: 'rotate(3deg)',
                  cursor: 'grabbing',
                  opacity: 0.8,
                  boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                  width: '300px',
                }}
              >
                <TaskCard 
                  task={activeTask}
                  isDragging={true}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>

        <TaskDialog
          open={openTaskDialog}
          onClose={() => {
            setOpenTaskDialog(false);
            setSelectedTask(null);
            setSelectedColumn(null);
          }}
          task={selectedTask}
          columnId={selectedColumn}
          categoryId={selectedCategory?.id}
          userId={userId}
        />
      </Box>
    </Box>
  );
};

export default KanbanBoard;