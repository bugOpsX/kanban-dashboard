import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  serverTimestamp,
  addDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

export const useRealtimeCollaboration = (categoryId, userId) => {
  const [activeUsers, setActiveUsers] = useState([]);
  const [lastActivity, setLastActivity] = useState(null);

  useEffect(() => {
    if (!categoryId || !userId) return;

    // Reference to the category document
    const categoryRef = doc(db, 'categories', categoryId);
    const userPresenceRef = doc(db, 'presence', userId);
    const categoryPresenceRef = doc(db, `categories/${categoryId}/presence/${userId}`);

    // Add user to active users
    const updatePresence = async () => {
      try {
        const presenceData = {
          userId,
          lastSeen: serverTimestamp(),
          status: 'online'
        };

        // Update user's presence in both collections
        await Promise.all([
          updateDoc(categoryRef, {
            activeUsers: arrayUnion(presenceData)
          }),
          setDoc(userPresenceRef, presenceData),
          setDoc(categoryPresenceRef, presenceData)
        ]);
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    // Remove user from active users
    const removePresence = async () => {
      try {
        await Promise.all([
          updateDoc(categoryRef, {
            activeUsers: arrayRemove({ userId, status: 'online' })
          }),
          deleteDoc(userPresenceRef),
          deleteDoc(categoryPresenceRef)
        ]);
      } catch (error) {
        console.error('Error removing presence:', error);
      }
    };

    // Subscribe to active users changes
    const unsubscribeUsers = onSnapshot(categoryRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const users = data.activeUsers || [];
        // Filter out users who haven't been seen in the last 5 minutes
        const activeUsersList = users.filter(user => {
          if (!user.lastSeen) return false;
          const lastSeen = user.lastSeen.toDate();
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          return lastSeen > fiveMinutesAgo;
        });
        setActiveUsers(activeUsersList);
      }
    });

    // Update presence periodically
    const interval = setInterval(updatePresence, 30000); // every 30 seconds

    // Set up presence
    updatePresence();

    // Clean up
    return () => {
      unsubscribeUsers();
      clearInterval(interval);
      removePresence();
    };
  }, [categoryId, userId]);

  // Function to record activity
  const recordActivity = async (action, taskId, details = {}) => {
    if (!categoryId || !userId) return;

    try {
      const activitiesRef = collection(db, 'categories', categoryId, 'activities');
      await addDoc(activitiesRef, {
        userId,
        action,
        taskId,
        details,
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error('Error recording activity:', error);
    }
  };

  return {
    activeUsers,
    lastActivity,
    recordActivity
  };
};

export default useRealtimeCollaboration; 