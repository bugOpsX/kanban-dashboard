import React, { useEffect } from 'react';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';

const TaskNotifications = ({ tasks }) => {
  useEffect(() => {
    const checkDeadlines = async () => {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      tasks.forEach(task => {
        if (!task.deadline) return;

        const deadlineDate = new Date(task.deadline);
        const now = new Date();
        const diffHours = (deadlineDate - now) / (1000 * 60 * 60);

        // Notify for tasks due within 24 hours
        if (diffHours > 0 && diffHours <= 24) {
          sendNotification(`Task Due Soon: ${task.title}`, {
            body: `Due in ${Math.round(diffHours)} hours`,
            tag: `task-${task.id}`,
          });
        }

        // Notify for overdue tasks
        if (diffHours < 0 && Math.abs(diffHours) <= 1) {
          sendNotification(`Task Overdue: ${task.title}`, {
            body: 'This task is now overdue!',
            tag: `task-${task.id}-overdue`,
          });
        }
      });
    };

    // Initial check
    checkDeadlines();

    // Check every 5 minutes
    const intervalId = setInterval(checkDeadlines, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [tasks]);

  return null; // This is a utility component, no UI needed
};

export default TaskNotifications; 