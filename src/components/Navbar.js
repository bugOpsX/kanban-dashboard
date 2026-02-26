import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  Box,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  InputBase,
  alpha,
  useTheme,
  Paper,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip
} from '@mui/material';
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  AccountCircle as AccountIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Assignment as TaskIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { styled } from '@mui/material/styles';
import SearchBar from './SearchBar';

// Styled search component
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: theme.spacing(2),
  width: '100%',
  maxWidth: '500px',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}));

const SearchResultItem = styled(MenuItem)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing(0.5),
  padding: theme.spacing(1, 2),
}));

const emptyArray = [];

const Navbar = ({ user, tasks = emptyArray, categories = emptyArray, onTaskSelect, onCategorySelect, onThemeToggle, onSearchResult }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchAnchorEl, setSearchAnchorEl] = useState(null);
  const theme = useTheme();

  // Enhanced search function
  const handleSearch = (term) => {
    if (!term?.trim()) {
      setSearchResults([]);
      return;
    }

    const searchTermLower = term.toLowerCase();

    // Search in tasks
    const matchedTasks = Array.isArray(tasks)
      ? tasks.filter(task => {
        const titleMatch = task?.title?.toLowerCase().includes(searchTermLower);
        const descMatch = task?.description?.toLowerCase().includes(searchTermLower);
        const tagMatch = task?.tags?.some(tag => tag.toLowerCase().includes(searchTermLower));
        const priorityMatch = task?.priority?.toLowerCase().includes(searchTermLower);
        return titleMatch || descMatch || tagMatch || priorityMatch;
      }).map(task => ({
        ...task,
        type: 'task',
        category: categories.find(c => c.id === task.categoryId)?.name || 'Unknown'
      }))
      : [];

    // Search in categories
    const matchedCategories = Array.isArray(categories)
      ? categories.filter(category =>
        category?.name?.toLowerCase().includes(searchTermLower)
      ).map(category => ({
        ...category,
        type: 'category'
      }))
      : [];

    setSearchResults([...matchedTasks, ...matchedCategories]);
  };

  // Effect for search
  useEffect(() => {
    handleSearch(searchTerm);
  }, [searchTerm, tasks, categories]);

  const handleSearchClick = (result) => {
    if (result.type === 'task') {
      onTaskSelect?.(result);
    } else {
      onCategorySelect?.(result);
    }
    setSearchTerm('');
    setSearchResults([]);
    setSearchAnchorEl(null);
  };

  const renderSearchResult = (result) => (
    <SearchResultItem
      key={result.id}
      onClick={() => handleSearchClick(result)}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
        <ListItemIcon>
          {result.type === 'task' ? <TaskIcon /> : <CategoryIcon />}
        </ListItemIcon>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            {result.type === 'task' ? result.title : result.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {result.type === 'task' ? `Task in ${result.category}` : 'Category'}
          </Typography>
        </Box>
        {result.type === 'task' && result.priority && (
          <Chip
            label={result.priority}
            size="small"
            color={
              result.priority === 'High' || result.priority === 'Urgent'
                ? 'error'
                : result.priority === 'Medium'
                  ? 'warning'
                  : 'default'
            }
          />
        )}
      </Box>
      {result.type === 'task' && result.description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            width: '100%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {result.description}
        </Typography>
      )}
    </SearchResultItem>
  );

  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Left section */}
        <Box sx={{ display: 'flex', alignItems: 'center', width: '200px' }}>
          <Typography variant="h6">
            Kanban
          </Typography>
        </Box>

        {/* Center section */}
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          flex: 1,
          maxWidth: '600px'
        }}>
          {user && (
            <SearchBar
              onSelectResult={(result) => {
                if (result.type === 'category') {
                  // Handle category selection
                  onSearchResult({ type: 'category', data: result });
                } else {
                  // Handle task selection
                  onSearchResult({ type: 'task', data: result });
                }
              }}
            />
          )}
        </Box>

        {/* Right section */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          width: '200px',
          justifyContent: 'flex-end'
        }}>
          <Tooltip title="Toggle theme">
            <IconButton onClick={onThemeToggle} color="inherit">
              {theme.palette.mode === 'dark' ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Tooltip>

          {user ? (
            <>
              <Tooltip title={user.email}>
                <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} color="inherit">
                  {user.photoURL ? (
                    <Avatar src={user.photoURL} sx={{ width: 32, height: 32 }} />
                  ) : (
                    <AccountIcon />
                  )}
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
              >
                <MenuItem onClick={async () => {
                  try {
                    await signOut(auth);
                    setAnchorEl(null);
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                }}>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              color="inherit"
              onClick={async () => {
                try {
                  const provider = new GoogleAuthProvider();
                  await signInWithPopup(auth, provider);
                } catch (error) {
                  console.error('Error signing in:', error);
                }
              }}
            >
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;