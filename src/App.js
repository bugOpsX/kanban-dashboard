import React, { useState, useEffect } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Box,
  CircularProgress,
  alpha
} from '@mui/material';
import { collection, query, where, onSnapshot, or } from 'firebase/firestore';
import { auth, db } from './firebase';
import Navbar from './components/Navbar';
import CategoryManager from './components/CategoryManager';
import KanbanBoard from './components/KanbanBoard';
import TaskNotifications from './components/TaskNotifications';
import Login from './components/Login';
import { Typography } from '@mui/material';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const savedMode = localStorage.getItem('darkMode');
      return savedMode ? JSON.parse(savedMode) : false;
    } catch (error) {
      console.warn('Failed to parse dark mode preference:', error);
      return false;
    }
  });

  // Theme setup with more modern colors and shadows
  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: '1px solid',
            borderColor: darkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
  });

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Auth listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Categories listener
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
      setCategories(uniqueCats);
    };

    const unsubOwned = onSnapshot(qOwned, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          ownedCats.delete(change.doc.id);
        } else {
          ownedCats.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
        }
      });
      updateCategories();
    });

    const unsubShared = onSnapshot(qShared, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'removed') {
          sharedCats.delete(change.doc.id);
        } else {
          sharedCats.set(change.doc.id, { id: change.doc.id, ...change.doc.data() });
        }
      });
      updateCategories();
    });

    // Cleanup subscription
    return () => {
      unsubOwned();
      unsubShared();
    };
  }, []);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleSearchResult = (result) => {
    if (result.type === 'category') {
      setSelectedCategory(result.data);
    } else {
      setSelectedCategory(result.data.categoryId);
      // Optionally scroll to or highlight the task
    }
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default'
          }}
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        }}
      >
        <Navbar
          user={user}
          darkMode={darkMode}
          onThemeToggle={toggleTheme}
          onSearchResult={handleSearchResult}
        />

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            gap: 2,
            p: 2,
            bgcolor: (theme) => alpha(theme.palette.background.default, 0.8)
          }}
        >
          <Box
            sx={{
              width: 280,
              flexShrink: 0,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.shadows[1],
            }}
          >
            <CategoryManager onCategorySelect={handleCategorySelect} />
          </Box>

          <Box
            sx={{
              flex: 1,
              borderRadius: 2,
              overflow: 'hidden',
              bgcolor: 'background.paper',
              boxShadow: (theme) => theme.shadows[1],
            }}
          >
            {selectedCategory ? (
              <KanbanBoard
                selectedCategory={selectedCategory}
                userId={user.uid}
              />
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 2,
                  p: 3,
                }}
              >
                <Typography variant="h5" color="text.secondary">
                  Select a category to view tasks
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Or create a new category to get started
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
