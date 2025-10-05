// Request notification permission on load
export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === "granted";
};

// Send browser notification
export const sendNotification = (title, options = {}) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  return new Notification(title, {
    icon: '/logo192.png', // Make sure this exists in your public folder
    ...options
  });
}; 