import React, { useState } from 'react';
import {
  TextField,
  InputAdornment,
  Box,
  List,
  ListItem,
  ListItemText,
  Paper,
  Popper,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { collection, query, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

const SearchBar = ({ onSelectResult }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setAnchorEl(e.currentTarget);

    if (value.length < 2) {
      setResults([]);
      return;
    }

    try {
      // Get all tasks and filter in memory
      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef);
      
      const snapshot = await getDocs(q);
      const searchResults = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(task => 
          task.title.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 5); // Limit to 5 results

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    }
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        placeholder="Search tasks..."
        value={searchTerm}
        onChange={handleSearch}
        size="small"
        sx={{
          width: 250,
          bgcolor: 'background.paper',
          borderRadius: 1,
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />
      
      <Popper
        open={results.length > 0}
        anchorEl={anchorEl}
        placement="bottom-start"
        style={{ width: 250, zIndex: 1300 }}
      >
        <Paper elevation={3}>
          <List>
            {results.map((result) => (
              <ListItem
                key={result.id}
                button
                onClick={() => {
                  onSelectResult(result);
                  setSearchTerm('');
                  setResults([]);
                }}
              >
                <ListItemText 
                  primary={result.title}
                  secondary={result.priority ? `Priority: ${result.priority}` : null}
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
};

export default SearchBar; 