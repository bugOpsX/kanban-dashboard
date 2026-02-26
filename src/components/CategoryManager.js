import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  ListItem,
  ListItemText,
  List,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Share as ShareIcon,
} from '@mui/icons-material';
import {
  deleteDoc,
  doc,
  addDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
  or,
  updateDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { collaborationService } from '../services/CollaborationService';

const CategoryManager = ({ onCategorySelect }) => {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const categoriesRef = collection(db, 'categories');
    const qOwned = query(categoriesRef, where('createdBy', '==', auth.currentUser.uid));
    const qShared = query(categoriesRef, where('sharedWith', 'array-contains', auth.currentUser.email));

    const ownedCats = new Map();
    const sharedCats = new Map();

    const updateCategories = () => {
      const allCats = [...ownedCats.values(), ...sharedCats.values()];
      // Remove duplicates by id
      const uniqueCats = Array.from(new Map(allCats.map(c => [c.id, c])).values());
      console.log('Fetched categories:', uniqueCats);
      setCategories(uniqueCats);
    };

    const unsubOwned = onSnapshot(qOwned, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          ownedCats.delete(change.doc.id);
        } else {
          ownedCats.set(change.doc.id, {
            id: change.doc.id,
            ...change.doc.data(),
            isOwner: change.doc.data().createdBy === auth.currentUser.uid
          });
        }
      });
      updateCategories();
    });

    const unsubShared = onSnapshot(qShared, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          sharedCats.delete(change.doc.id);
        } else {
          sharedCats.set(change.doc.id, {
            id: change.doc.id,
            ...change.doc.data(),
            isOwner: change.doc.data().createdBy === auth.currentUser.uid
          });
        }
      });
      updateCategories();
    });

    return () => {
      unsubOwned();
      unsubShared();
    };
  }, []);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (onCategorySelect) {
      onCategorySelect(category);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim() || loading) return;

    try {
      setLoading(true);

      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      const categoryData = {
        name: newCategoryName.trim(),
        createdBy: auth.currentUser.uid,
        createdByEmail: auth.currentUser.email || 'Unknown',
        createdAt: serverTimestamp(),
        type: 'custom',
        isDefault: false,
        tasks: [],
        sharedWith: []
      };

      setNewCategoryName('');
      setAddDialogOpen(false);
      setLoading(false);

      await addDoc(collection(db, 'categories'), categoryData);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to create category: ' + error.message);
      setLoading(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setLoading(true);

      const categoryIdTarget = categoryToDelete.id;

      // Optimitically close the modal and update state
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      if (onCategorySelect) {
        onCategorySelect(null); // Clear selected category in parent
      }
      setLoading(false);

      // Delete all tasks in the category first
      const tasksRef = collection(db, 'tasks');
      const tasksQuery = query(tasksRef, where('categoryId', '==', categoryIdTarget));
      const tasksSnapshot = await getDocs(tasksQuery);

      const deletePromises = tasksSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Delete the category
      await deleteDoc(doc(db, 'categories', categoryIdTarget));

      console.log('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category: ' + error.message);
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!shareEmail.trim() || !selectedCategory) return;

    try {
      setLoading(true);
      const emailToShare = shareEmail.trim();
      console.log('Sharing category:', selectedCategory.name, 'with:', emailToShare);

      const categoryRef = doc(db, 'categories', selectedCategory.id);

      setShareDialogOpen(false);
      setShareEmail('');
      setLoading(false);
      alert(`Category shared with ${emailToShare}`);

      await updateDoc(categoryRef, {
        sharedWith: arrayUnion(emailToShare),
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error sharing category:', error);
      alert('Failed to share category: ' + error.message);
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: 280, bgcolor: 'background.paper' }}>
      <List sx={{ p: 0 }}>
        {categories.map((category) => (
          <ListItem
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            sx={{
              cursor: 'pointer',
              bgcolor: selectedCategory?.id === category.id ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
              },
            }}
            secondaryAction={
              category.isOwner ? (
                <Box sx={{ display: 'flex' }}>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory(category);
                      setShareDialogOpen(true);
                    }}
                  >
                    <ShareIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory(category);
                      setMenuAnchor(e.currentTarget);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Shared
                </Typography>
              )
            }
          >
            <ListItemText
              primary={category.name}
              secondary={category.sharedWith?.includes(auth.currentUser?.email) ? 'Shared with you' : null}
            />
          </ListItem>
        ))}

        <ListItem>
          <Button
            fullWidth
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
            variant="contained"
            sx={{ mt: 1 }}
          >
            Add Category
          </Button>
        </ListItem>
      </List>

      {/* Add Category Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setNewCategoryName('');
        }}
      >
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={loading}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newCategoryName.trim()) {
                handleAddCategory();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setAddDialogOpen(false);
              setNewCategoryName('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddCategory}
            variant="contained"
            disabled={!newCategoryName.trim() || loading}
          >
            {loading ? 'Creating...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          setCategoryToDelete(null);
        }}
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{categoryToDelete?.name}"?
            This will also delete all tasks in this category. This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              setCategoryToDelete(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteCategory}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={shareDialogOpen}
        onClose={() => {
          setShareDialogOpen(false);
          setShareEmail('');
        }}
      >
        <DialogTitle>Share Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={shareEmail}
            onChange={(e) => setShareEmail(e.target.value)}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShareDialogOpen(false);
              setShareEmail('');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            variant="contained"
            disabled={!shareEmail.trim() || loading}
          >
            {loading ? 'Sharing...' : 'Share'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setCategoryToDelete(selectedCategory);
            setDeleteDialogOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default CategoryManager;