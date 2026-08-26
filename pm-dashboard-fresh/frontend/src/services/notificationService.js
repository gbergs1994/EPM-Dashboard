// notificationService.js - Add this to your services folder

class NotificationService {
    constructor() {
      this.preferences = this.loadPreferences();
      this.setupEmailSimulation();
    }
  
    // Load notification preferences
    loadPreferences() {
      try {
        const saved = localStorage.getItem('userPreferences');
        if (saved) {
          const prefs = JSON.parse(saved);
          return {
            emailNotifications: prefs.emailNotifications ?? true,
            pushNotifications: prefs.pushNotifications ?? true,
            projectUpdates: prefs.projectUpdates ?? true,
            weeklyDigest: prefs.weeklyDigest ?? false
          };
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
      
      return {
        emailNotifications: true,
        pushNotifications: true,
        projectUpdates: true,
        weeklyDigest: false
      };
    }
  
    // Update preferences
    updatePreferences(newPrefs) {
      this.preferences = { ...this.preferences, ...newPrefs };
      
      // Save to localStorage
      const currentPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
      const updatedPrefs = { ...currentPrefs, ...newPrefs };
      localStorage.setItem('userPreferences', JSON.stringify(updatedPrefs));
      
      console.log('📢 Notification preferences updated:', this.preferences);
    }
  
    // Request push notification permission
    async requestPushPermission() {
      if (!('Notification' in window)) {
        console.warn('Push notifications not supported');
        return false;
      }
  
      if (Notification.permission === 'granted') {
        return true;
      }
  
      if (Notification.permission === 'denied') {
        console.warn('Push notifications denied by user');
        return false;
      }
  
      try {
        const permission = await Notification.requestPermission();
        console.log('Push notification permission:', permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
  
    // Send push notification
    async sendPushNotification(title, options = {}) {
      if (!this.preferences.pushNotifications) {
        console.log('Push notifications disabled by user');
        return;
      }
  
      if (!('Notification' in window)) {
        console.log('Push notifications not supported, showing alert instead');
        alert(`${title}: ${options.body || ''}`);
        return;
      }
  
      const hasPermission = await this.requestPushPermission();
      if (!hasPermission) {
        console.log('No push notification permission');
        return;
      }
  
      try {
        const notification = new Notification(title, {
          body: options.body || '',
          icon: options.icon || '/favicon.ico',
          badge: options.badge || '/favicon.ico',
          tag: options.tag || 'app-notification',
          requireInteraction: options.requireInteraction || false,
          ...options
        });
  
        // Auto-close after 5 seconds unless requireInteraction is true
        if (!options.requireInteraction) {
          setTimeout(() => notification.close(), 5000);
        }
  
        // Handle click events
        notification.onclick = () => {
          window.focus();
          if (options.onClick) {
            options.onClick();
          }
          notification.close();
        };
  
        console.log('📱 Push notification sent:', title);
      } catch (error) {
        console.error('Error sending push notification:', error);
      }
    }
  
    // Simulate email notification (in real app, this would call your email API)
    sendEmailNotification(subject, body, recipient) {
      if (!this.preferences.emailNotifications) {
        console.log('Email notifications disabled by user');
        return;
      }
  
      // Simulate email sending
      console.log('📧 Email notification sent:', {
        to: recipient,
        subject: subject,
        body: body,
        timestamp: new Date().toISOString()
      });
  
      // Store in "sent emails" for demo purposes
      this.storeEmailLog(subject, body, recipient);
    }
  
    // Project update notifications
    notifyProjectUpdate(project, updateType, details) {
      if (!this.preferences.projectUpdates) {
        console.log('Project update notifications disabled');
        return;
      }
  
      const title = `Project Update: ${project.name}`;
      const body = this.getProjectUpdateMessage(updateType, details);
  
      // Send both push and email if enabled
      this.sendPushNotification(title, {
        body: body,
        tag: `project-${project.id}`,
        onClick: () => {
          // Navigate to project (you'd implement this based on your routing)
          console.log('Navigate to project:', project.id);
        }
      });
  
      this.sendEmailNotification(title, body, 'user@example.com');
    }
  
    // Weekly digest simulation
    setupWeeklyDigest() {
      if (!this.preferences.weeklyDigest) {
        console.log('Weekly digest disabled');
        return;
      }
  
      // In a real app, this would be handled by your backend
      // For demo, we'll just log that it's set up
      console.log('📅 Weekly digest scheduled');
      
      // Simulate weekly digest (for demo, we'll trigger it after 10 seconds)
      setTimeout(() => {
        this.sendWeeklyDigest();
      }, 10000);
    }
  
    // Send weekly digest
    sendWeeklyDigest() {
      const digestData = this.generateWeeklyDigest();
      
      this.sendEmailNotification(
        'Your Weekly Progress Digest',
        digestData,
        'user@example.com'
      );
  
      this.sendPushNotification('Weekly Digest Ready', {
        body: 'Your weekly progress summary is available',
        requireInteraction: true
      });
    }
  
    // Helper methods
    getProjectUpdateMessage(updateType, details) {
      const messages = {
        'progress': `Progress updated to ${details.progress}%`,
        'status': `Status changed to ${details.status}`,
        'deadline': `Deadline updated to ${details.deadline}`,
        'assigned': `Assigned to ${details.assignedTo}`,
        'comment': `New comment: ${details.comment.substring(0, 50)}...`,
        'milestone': `Milestone reached: ${details.milestone}`
      };
      
      return messages[updateType] || `Project updated: ${updateType}`;
    }
  
    generateWeeklyDigest() {
      // In a real app, this would aggregate actual user data
      return `
      Your Weekly Summary:
      • 3 projects updated
      • 2 goals progressed
      • 5 tasks completed
      • 85% average progress
      
      Keep up the great work!
      `;
    }
  
    storeEmailLog(subject, body, recipient) {
      const emailLog = JSON.parse(localStorage.getItem('emailLog') || '[]');
      emailLog.push({
        id: Date.now(),
        subject,
        body,
        recipient,
        timestamp: new Date().toISOString(),
        read: false
      });
      
      // Keep only last 50 emails
      if (emailLog.length > 50) {
        emailLog.splice(0, emailLog.length - 50);
      }
      
      localStorage.setItem('emailLog', JSON.stringify(emailLog));
    }
  
    // Get email log for debugging/demo purposes
    getEmailLog() {
      return JSON.parse(localStorage.getItem('emailLog') || '[]');
    }
  
    // Setup email simulation
    setupEmailSimulation() {
      // Simulate periodic project updates for demo
      setInterval(() => {
        if (Math.random() > 0.8) { // 20% chance every interval
          this.simulateProjectUpdate();
        }
      }, 30000); // Every 30 seconds
    }
  
    simulateProjectUpdate() {
      const sampleProjects = [
        { id: 1, name: 'Website Redesign' },
        { id: 2, name: 'Mobile App Development' },
        { id: 3, name: 'Database Migration' }
      ];
      
      const updateTypes = ['progress', 'comment', 'status'];
      const project = sampleProjects[Math.floor(Math.random() * sampleProjects.length)];
      const updateType = updateTypes[Math.floor(Math.random() * updateTypes.length)];
      
      const details = {
        progress: Math.floor(Math.random() * 100),
        comment: 'Great progress on this milestone!',
        status: 'In Progress'
      };
      
      this.notifyProjectUpdate(project, updateType, details);
    }
  
    // Timezone formatting helper
    formatDateForTimezone(date, timezone) {
      try {
        return new Intl.DateTimeFormat('en-US', {
          timeZone: timezone || 'America/Chicago',
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(date));
      } catch (error) {
        console.error('Error formatting date:', error);
        return new Date(date).toLocaleString();
      }
    }
  
    // Language-specific notification messages
    getLocalizedMessage(messageKey, language = 'en') {
      const messages = {
        en: {
          projectUpdated: 'Project updated',
          goalCompleted: 'Goal completed!',
          weeklyDigest: 'Your weekly digest',
          newAssignment: 'New project assigned'
        },
        es: {
          projectUpdated: 'Proyecto actualizado',
          goalCompleted: '¡Meta completada!',
          weeklyDigest: 'Tu resumen semanal',
          newAssignment: 'Nuevo proyecto asignado'
        },
        fr: {
          projectUpdated: 'Projet mis à jour',
          goalCompleted: 'Objectif atteint!',
          weeklyDigest: 'Votre résumé hebdomadaire',
          newAssignment: 'Nouveau projet assigné'
        }
      };
      
      return messages[language]?.[messageKey] || messages.en[messageKey] || messageKey;
    }
  }
  
  // Create singleton instance
  const notificationService = new NotificationService();
  
  // Export for use in other components
  export default notificationService;

// Export class for testing
export { NotificationService };
    emailNotifications: true,
    pushNotifications: false
  });
  
  // Send project update
  notificationService.notifyProjectUpdate(
    { id: 1, name: 'My Project' },
    'progress',
    { progress: 75 }
  );
  
  // Send custom notification
  notificationService.sendPushNotification('Custom Alert', {
    body: 'This is a custom message',
    onClick: () => console.log('Notification clicked!')
  });
  
  // Get email log for debugging
  console.log(notificationService.getEmailLog());
  */