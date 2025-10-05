import { db, auth } from '../firebase';
import { 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  serverTimestamp, 
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove 
} from 'firebase/firestore';

export const collaborationService = {
  // Track user presence in a category
  async joinCategory(categoryId) {
    if (!auth.currentUser) return;
    
    const presenceRef = doc(db, 'categories', categoryId, 'presence', auth.currentUser.uid);
    await setDoc(presenceRef, {
      email: auth.currentUser.email,
      displayName: auth.currentUser.displayName,
      photoURL: auth.currentUser.photoURL,
      lastSeen: serverTimestamp(),
      status: 'online'
    });
  },

  // Remove presence when leaving
  async leaveCategory(categoryId) {
    if (!auth.currentUser) return;
    
    const presenceRef = doc(db, 'categories', categoryId, 'presence', auth.currentUser.uid);
    await deleteDoc(presenceRef);
  },

  // Share category with other users
  async shareCategory(categoryId, userEmail) {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      sharedWith: arrayUnion(userEmail)
    });
  },

  // Remove share access
  async unshareCategory(categoryId, userEmail) {
    const categoryRef = doc(db, 'categories', categoryId);
    await updateDoc(categoryRef, {
      sharedWith: arrayRemove(userEmail)
    });
  },

  // Listen to active users in a category
  subscribeToActiveUsers(categoryId, callback) {
    if (!categoryId) return () => {};

    const presenceRef = collection(db, 'categories', categoryId, 'presence');
    return onSnapshot(presenceRef, (snapshot) => {
      const activeUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(activeUsers);
    });
  },

  // Track task changes
  async logTaskActivity(categoryId, taskId, action, userId) {
    const activityRef = collection(db, 'categories', categoryId, 'activities');
    await setDoc(doc(activityRef), {
      taskId,
      action,
      userId,
      userEmail: auth.currentUser?.email,
      timestamp: serverTimestamp()
    });
  }
}; 