import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  LinearProgress,
  Divider,
  Avatar,
  IconButton,
  Stack,
  Autocomplete,
  CircularProgress,
  Slider,
} from '@mui/material';
import {
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  Tag as TagIcon,
  Comment as CommentIcon,
  Note as NoteIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import {
  doc,
  addDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  getDocs,
  setDoc,
  onSnapshot,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { debounce } from 'lodash';
import CircleIcon from '@mui/icons-material/Circle';

// Tag color options
const TAG_COLORS = {
  red: '#ff4444',
  orange: '#ffbb33',
  green: '#00C851',
  blue: '#33b5e5',
  purple: '#aa66cc',
  gray: '#666666'
};

const TaskDialog = ({ open, onClose, task, columnId, categoryId, userId }) => {
  const initialState = {
    title: '',
    description: '',
    priority: 'medium',
    status: columnId || 'todo',
    assignee: '',
    deadline: '',
    tags: [],
    notes: [],
    comments: [],
    assignedUsers: [],
    progress: 0,
    newTag: '',
    tagColor: 'blue',
    newNote: '',
    newComment: '',
    loading: false,
    activeEditors: new Set(),
    availableUsers: [],
  };

  const [formData, setFormData] = useState(initialState);
  const [users, setUsers] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('blue');

  useEffect(() => {
    if (task) {
      // Convert old tag format to new format if necessary
      const convertedTags = Array.isArray(task.tags)
        ? task.tags.map(tag => {
          // If tag is already in the new format
          if (typeof tag === 'object' && tag.text && tag.color) {
            return tag;
          }
          // If tag is in the old format (string)
          return {
            text: tag,
            color: 'blue' // default color
          };
        })
        : [];

      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || columnId || 'todo',
        assignee: task.assignee || '',
        deadline: task.deadline || '',
        tags: convertedTags,
        notes: task.notes || [],
        comments: task.comments || [],
        assignedUsers: task.assignedUsers || [],
        progress: task.progress || 0,
        newTag: '',
        tagColor: task.tags?.find(t => t.text === task.title)?.color || 'blue',
        newNote: '',
        newComment: '',
        loading: false,
        activeEditors: new Set(task.editors?.map(e => e.email) || []),
        availableUsers: task.assignedUsers?.map(u => ({
          id: u.id,
          email: u.email
        })) || [],
      });
    } else {
      setFormData(initialState);
    }
  }, [task, columnId]);

  // Load available users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('active', '==', true)
        );
        const snapshot = await getDocs(usersQuery);
        const userData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(userData);
      } catch (error) {
        console.error('Error loading users:', error);
      }
    };

    loadUsers();
  }, []);

  // Fetch available users (category owner and shared users)
  useEffect(() => {
    const fetchUsers = async () => {
      if (categoryId) {
        const categoryDocRef = doc(db, 'categories', categoryId);
        const categorySnapshot = await getDoc(categoryDocRef);

        if (categorySnapshot.exists()) {
          const sharedWith = categorySnapshot.data()?.sharedWith || [];
          if (sharedWith.length > 0) {
            const usersQuery = query(collection(db, 'users'), where('email', 'in', sharedWith));
            const usersSnapshot = await getDocs(usersQuery);
            setFormData(prev => ({
              ...prev,
              availableUsers: usersSnapshot.docs.map(doc => ({
                id: doc.id,
                email: doc.data().email
              }))
            }));
          }
        }
      }
    };

    fetchUsers();
  }, [categoryId]);

  // Track who's editing this task
  useEffect(() => {
    if (!task || !open) return;

    const presenceRef = doc(db, 'tasks', task.id, 'editors', userId);

    // Mark user as editing
    const markEditing = async () => {
      await setDoc(presenceRef, {
        email: auth.currentUser?.email,
        timestamp: serverTimestamp()
      });
    };

    markEditing();
    const interval = setInterval(markEditing, 15000);

    // Listen to other editors
    const unsubscribe = onSnapshot(
      collection(db, 'tasks', task.id, 'editors'),
      (snapshot) => {
        const editors = new Set();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate();
          if (timestamp && (new Date() - timestamp) < 30000) {
            editors.add(data.email);
          }
        });
        setFormData(prev => ({
          ...prev,
          activeEditors: editors
        }));
      }
    );

    return () => {
      clearInterval(interval);
      unsubscribe();
      // Clean up presence
      deleteDoc(presenceRef);
    };
  }, [task, open, userId]);

  const debouncedUpdate = debounce(async (taskData) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        ...taskData,
        updatedAt: serverTimestamp(),
        lastModifiedBy: userId,
        lastModifiedByEmail: auth.currentUser?.email || 'Unknown'
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, 1000);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const newTag = {
      text: tagInput.trim(),
      color: selectedColor
    };

    if (newTag.text && !formData.tags.some(tag => tag.text === newTag.text)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setTagInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(e);
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.text !== tagToRemove.text)
    }));
  };

  const handleAddNote = () => {
    if (formData.newNote.trim()) {
      const note = {
        text: formData.newNote.trim(),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.email,
      };
      setFormData(prev => ({
        ...prev,
        notes: [...prev.notes, note],
        newNote: '',
      }));
    }
  };

  const handleDeleteNote = (noteToDelete) => {
    setFormData(prev => ({
      ...prev,
      notes: prev.notes.filter(note => note.createdAt !== noteToDelete.createdAt)
    }));
  };

  const handleAddComment = () => {
    if (formData.newComment.trim()) {
      const comment = {
        text: formData.newComment.trim(),
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser?.email,
      };
      setFormData(prev => ({
        ...prev,
        comments: [...prev.comments, comment],
        newComment: '',
      }));
    }
  };

  const handleClose = () => {
    setFormData(initialState);
    onClose();
  };

  const isFormValid = () => {
    return formData.title.trim().length > 0 && !formData.loading;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormData(prev => ({ ...prev, loading: true }));

    const taskData = {
      title: formData.title,
      description: formData.description || '',
      priority: formData.priority || 'medium',
      status: columnId || formData.status || 'todo',
      assignee: formData.assignee || null,
      deadline: formData.deadline || null,
      tags: formData.tags || [],
      categoryId: categoryId || 'unassigned',
      progress: formData.progress || 0,
      lastModifiedBy: userId || 'Unknown',
      lastModifiedByEmail: auth.currentUser?.email || 'Unknown',
      lastModifiedAt: serverTimestamp(),
    };

    setFormData(initialState);
    onClose();

    try {
      if (task) {
        await updateDoc(doc(db, 'tasks', task.id), taskData);
      } else {
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdBy: userId || 'Unknown',
          createdByEmail: auth.currentUser?.email || 'Unknown',
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Failed to save task: ' + error.message);
    }
  };

  const getTagColor = (tag) => {
    const normalizedTag = tag.text.toLowerCase().trim();
    return TAG_COLORS[normalizedTag] || TAG_COLORS.gray;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 24,
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Typography variant="h6">
              {task ? 'Edit Task' : 'New Task'}
            </Typography>
            {formData.loading && (
              <LinearProgress
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                }}
              />
            )}
          </Box>
          {Array.from(formData.activeEditors).size > 1 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Also editing:
              </Typography>
              {Array.from(formData.activeEditors).map(editor => (
                editor !== auth.currentUser?.email && (
                  <Chip
                    key={editor}
                    size="small"
                    label={editor}
                    avatar={<Avatar>{editor && editor[0] ? editor[0].toUpperCase() : 'U'}</Avatar>}
                    sx={{ ml: 1 }}
                  />
                )
              ))}
            </Box>
          )}
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              autoFocus
              label="Title"
              fullWidth
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              error={formData.title.trim().length === 0}
              helperText={formData.title.trim().length === 0 ? "Title is required" : ""}
              disabled={formData.loading}
            />

            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              name="description"
              value={formData.description}
              onChange={handleChange}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="todo">To Do</MenuItem>
                  <MenuItem value="inProgress">In Progress</MenuItem>
                  <MenuItem value="done">Done</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Divider />

            {/* Tags Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag.text}
                    label={tag.text}
                    onDelete={() => handleRemoveTag(tag)}
                    sx={{
                      bgcolor: getTagColor(tag),
                      color: 'white'
                    }}
                    size="small"
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Box sx={{ display: 'flex', flexGrow: 1, gap: 1 }}>
                  <TextField
                    label="Add Tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    fullWidth
                    placeholder="Press Enter to add tag"
                  />
                  <FormControl sx={{ minWidth: 120 }}>
                    <InputLabel>Color</InputLabel>
                    <Select
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      label="Color"
                      size="small"
                    >
                      {Object.entries(TAG_COLORS).map(([name, color]) => (
                        <MenuItem key={name} value={name}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CircleIcon sx={{ color: color, fontSize: 16 }} />
                            {name.charAt(0).toUpperCase() + name.slice(1)}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                <Button
                  onClick={handleAddTag}
                  variant="outlined"
                  disabled={!tagInput.trim()}
                >
                  Add
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* Notes Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Notes
              </Typography>
              {formData.notes.map((note) => (
                <Box
                  key={note.createdAt}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {note.createdBy}
                    </Typography>
                    <IconButton size="small" onClick={() => handleDeleteNote(note)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography variant="body2">{note.text}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Add note"
                  name="newNote"
                  value={formData.newNote}
                  onChange={handleChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNote()}
                />
                <IconButton onClick={handleAddNote}>
                  <NoteIcon />
                </IconButton>
              </Box>
            </Box>

            <Divider />

            {/* Comments Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Comments
              </Typography>
              {formData.comments.map((comment) => (
                <Box
                  key={comment.createdAt}
                  sx={{
                    p: 1,
                    mb: 1,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Avatar sx={{ width: 24, height: 24 }}>
                      {comment.createdBy && comment.createdBy[0] ? comment.createdBy[0].toUpperCase() : 'U'}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      {comment.createdBy}
                    </Typography>
                  </Box>
                  <Typography variant="body2">{comment.text}</Typography>
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Add comment"
                  name="newComment"
                  value={formData.newComment}
                  onChange={handleChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <IconButton onClick={handleAddComment}>
                  <SendIcon />
                </IconButton>
              </Box>
            </Box>

            <Divider />

            {/* Assigned Users Section */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Assigned Users
              </Typography>
              <Autocomplete
                multiple
                options={formData.availableUsers}
                value={formData.assignedUsers}
                onChange={(_, newValue) => setFormData(prev => ({
                  ...prev,
                  assignedUsers: newValue
                }))}
                getOptionLabel={(option) => option.email}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="outlined"
                    placeholder="Assign users"
                    size="small"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      key={option.email}
                      label={option.email}
                      {...getTagProps({ index })}
                      avatar={<Avatar>{option.email && option.email[0] ? option.email[0].toUpperCase() : 'U'}</Avatar>}
                    />
                  ))
                }
              />
            </Box>

            <Box>
              <Typography gutterBottom>Progress</Typography>
              <Slider
                value={formData.progress}
                onChange={(e, newValue) => setFormData(prev => ({ ...prev, progress: newValue }))}
                valueLabelDisplay="auto"
                step={10}
                marks
                min={0}
                max={100}
                disabled={formData.loading}
              />
            </Box>

            <Autocomplete
              value={formData.assignee}
              onChange={(e, newValue) => setFormData(prev => ({ ...prev, assignee: newValue }))}
              options={formData.availableUsers}
              getOptionLabel={(option) => option?.email || ''}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Avatar
                    sx={{ width: 24, height: 24, mr: 1 }}
                    alt={option.email}
                  >
                    {option.email && option.email[0] ? option.email[0].toUpperCase() : 'U'}
                  </Avatar>
                  {option.email}
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assignee"
                  disabled={formData.loading}
                />
              )}
            />

            <TextField
              label="Deadline"
              type="datetime-local"
              name="deadline"
              value={formData.deadline}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button
            onClick={handleClose}
            disabled={formData.loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!isFormValid()}
            sx={{
              minWidth: 100,
              position: 'relative',
              '& .MuiCircularProgress-root': {
                position: 'absolute',
                left: '50%',
                marginLeft: '-12px',
              }
            }}
          >
            {formData.loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : task ? (
              'Update'
            ) : (
              'Create'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default TaskDialog;
