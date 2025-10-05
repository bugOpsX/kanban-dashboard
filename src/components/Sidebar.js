import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box
} from '@mui/material';
import {
  Add as AddIcon,
  Category as CategoryIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';

const Sidebar = ({ userId, onCategorySelect }) => {
  const [categories, setCategories] = useState([]);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [editCategoryDialog, setEditCategoryDialog] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    // Subscribe to categories changes
    const q = query(
      collection(db, 'categories'),
      where('userId', '==', userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const categoriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategories(categoriesData);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;

    try {
      await addDoc(collection(db, 'categories'), {
        name: categoryName,
        userId: userId,
        createdAt: new Date().toISOString()
      });
      setCategoryName('');
      setNewCategoryDialog(false);
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Error adding category');
    }
  };

  const handleEditCategory = async () => {
    if (!categoryName.trim() || !selectedCategory) return;

    try {
      await updateDoc(doc(db, 'categories', selectedCategory.id), {
        name: categoryName
      });
      setCategoryName('');
      setEditCategoryDialog(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Error updating category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? All tasks in this category will also be deleted.')) {
      try {
        // First, delete all tasks in this category
        const tasksRef = collection(db, 'tasks');
        const q = query(tasksRef, where('categoryId', '==', categoryId));
        const querySnapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        
        querySnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        // Delete the category
        batch.delete(doc(db, 'categories', categoryId));
        
        // Commit the batch
        await batch.commit();
        
        // If the deleted category was selected, clear the selection
        if (selectedCategory?.id === categoryId) {
          onCategorySelect(null);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category and its tasks');
      }
    }
  };

  const openEditDialog = (category) => {
    setSelectedCategory(category);
    setCategoryName(category.name);
    setEditCategoryDialog(true);
  };

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: 240,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: 240,
            boxSizing: 'border-box',
            marginTop: '64px', // Height of AppBar
          },
        }}
      >
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setNewCategoryDialog(true)}
                fullWidth
                variant="contained"
              >
                Add Category
              </Button>
            </ListItem>
            {categories.map((category) => (
              <ListItem
                key={category.id}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'action.hover' }
                }}
              >
                <ListItemIcon>
                  <CategoryIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={category.name}
                  onClick={() => onCategorySelect(category)}
                />
                <IconButton 
                  size="small"
                  onClick={() => openEditDialog(category)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteCategory(category.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Add Category Dialog */}
      <Dialog open={newCategoryDialog} onClose={() => setNewCategoryDialog(false)}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>Cancel</Button>
          <Button onClick={handleAddCategory}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={editCategoryDialog} onClose={() => setEditCategoryDialog(false)}>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCategoryDialog(false)}>Cancel</Button>
          <Button onClick={handleEditCategory}>Update</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Sidebar; 