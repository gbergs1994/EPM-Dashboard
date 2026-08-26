import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Mail, Phone, MapPin, Calendar, Camera, Save, Edit3, 
  Lock, Bell, Shield, Eye, EyeOff, Building, Briefcase, Plus, X
} from 'lucide-react';

// Notification Service (embedded for completeness)
class NotificationService {
  constructor() {
    this.preferences = this.loadPreferences();
    this.setupEmailSimulation();
  }

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

  updatePreferences(newPrefs) {
    this.preferences = { ...this.preferences, ...newPrefs };
    const currentPrefs = JSON.parse(localStorage.getItem('userPreferences') || '{}');
    const updatedPrefs = { ...currentPrefs, ...newPrefs };
    localStorage.setItem('userPreferences', JSON.stringify(updatedPrefs));
    console.log('📢 Notification preferences updated:', this.preferences);
  }

  async requestPushPermission() {
    if (!('Notification' in window)) {
      console.warn('Push notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  async sendPushNotification(title, options = {}) {
    if (!this.preferences.pushNotifications) return;

    if (!('Notification' in window)) {
      alert(`${title}: ${options.body || ''}`);
      return;
    }

    const hasPermission = await this.requestPushPermission();
    if (!hasPermission) return;

    try {
      const notification = new Notification(title, {
        body: options.body || '',
        icon: options.icon || '/favicon.ico',
        tag: options.tag || 'app-notification',
        requireInteraction: options.requireInteraction || false,
        ...options
      });

      if (!options.requireInteraction) {
        setTimeout(() => notification.close(), 5000);
      }

      notification.onclick = () => {
        window.focus();
        if (options.onClick) options.onClick();
        notification.close();
      };

      console.log('📱 Push notification sent:', title);
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  sendEmailNotification(subject, body, recipient) {
    if (!this.preferences.emailNotifications) return;

    console.log('📧 Email notification sent:', {
      to: recipient,
      subject: subject,
      body: body,
      timestamp: new Date().toISOString()
    });

    this.storeEmailLog(subject, body, recipient);
  }

  setupEmailSimulation() {
    setInterval(() => {
      if (Math.random() > 0.8) {
        this.simulateProjectUpdate();
      }
    }, 30000);
  }

  simulateProjectUpdate() {
    const sampleProjects = [
      { id: 1, name: 'Website Redesign' },
      { id: 2, name: 'Mobile App Development' },
      { id: 3, name: 'Database Migration' }
    ];
    
    const project = sampleProjects[Math.floor(Math.random() * sampleProjects.length)];
    this.sendPushNotification(`Project Update: ${project.name}`, {
      body: 'Progress has been updated',
      tag: `project-${project.id}`
    });
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
    
    if (emailLog.length > 50) {
      emailLog.splice(0, emailLog.length - 50);
    }
    
    localStorage.setItem('emailLog', JSON.stringify(emailLog));
  }
}

// Create notification service instance
const notificationService = new NotificationService();

const SettingsTab = ({ currentUser, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  
  // Profile form data
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    title: '',
    department: '',
    avatar: '',
    skills: [],
    joinedDate: '',
    lastLogin: ''
  });

  // Password form data
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Preferences data
  const [preferencesData, setPreferencesData] = useState({
    darkMode: false,
    emailNotifications: true,
    pushNotifications: true,
    projectUpdates: true,
    weeklyDigest: false
  });

  const [newSkill, setNewSkill] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Common skills for suggestions
  const commonSkills = [
    'JavaScript', 'React', 'Node.js', 'Python', 'Java', 'C#', 'PHP',
    'HTML/CSS', 'TypeScript', 'Vue.js', 'Angular', 'SQL', 'MongoDB',
    'Project Management', 'Agile', 'Scrum', 'Leadership', 'Communication',
    'Problem Solving', 'Team Collaboration', 'UI/UX Design', 'Figma',
    'Adobe Creative Suite', 'Testing', 'QA', 'DevOps', 'AWS', 'Docker'
  ];

  // Initialize form data with current user and load saved preferences
  useEffect(() => {
    if (currentUser) {
      console.log('Loading user data:', currentUser);
      
      // Load user data from localStorage if available, otherwise use currentUser
      const savedUserData = localStorage.getItem('currentUser');
      let userData = currentUser;
      
      if (savedUserData) {
        try {
          const parsedUserData = JSON.parse(savedUserData);
          userData = { ...currentUser, ...parsedUserData };
          console.log('Loaded saved user data:', userData);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
        }
      }
      
      setProfileData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        location: userData.location || '',
        bio: userData.bio || '',
        title: userData.title || userData.role || '',
        department: userData.department || '',
        avatar: userData.avatar || '',
        skills: userData.skills || [],
        joinedDate: userData.joinedDate || userData.created_at || '',
        lastLogin: userData.lastLogin || ''
      });
    }

    // Load saved preferences from localStorage
    const savedPreferences = localStorage.getItem('userPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        console.log('Loading saved preferences:', parsed);
        setPreferencesData(prev => {
          const newPrefs = { ...prev, ...parsed };
          // Apply preferences after loading (simplified)
          setTimeout(() => applyPreferences(newPrefs), 100);
          return newPrefs;
        });
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    }

    // Load persisted app theme and apply it immediately
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      setPreferencesData(prev => ({ ...prev, darkMode: savedTheme === 'dark' }));
      applyTheme(savedTheme);
    }

    // Apply settings theme CSS support
    addThemeCSS();
  }, [currentUser]);

  // Add scoped theme CSS for settings
  const addThemeCSS = () => {
    if (document.getElementById('settings-styles')) return;

    const style = document.createElement('style');
    style.id = 'settings-styles';
    style.textContent = `
      .settings-page {
        background-color: #ffffff !important;
      }

      .dark-theme .settings-page {
        background-color: #111827 !important;
      }

      .settings-card {
        background-color: #ffffff !important;
        border-color: #e5e7eb !important;
      }

      .settings-input {
        background-color: #ffffff !important;
        border-color: #d1d5db !important;
        color: #111827 !important;
      }

      .settings-input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1) !important;
      }

      .settings-text {
        color: #111827 !important;
      }

      .settings-text-secondary {
        color: #6b7280 !important;
      }

      .dark-theme .settings-card {
        background-color: #1f2937 !important;
        border-color: #374151 !important;
      }

      .dark-theme .settings-input {
        background-color: #374151 !important;
        border-color: #4b5563 !important;
        color: #f9fafb !important;
      }

      .dark-theme .settings-text {
        color: #f9fafb !important;
      }

      .dark-theme .settings-text-secondary {
        color: #d1d5db !important;
      }
    `;
    document.head.appendChild(style);
  };

  // Handle form changes
  const handleProfileChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePasswordChange = (field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePreferencesChange = (field, value) => {
    console.log(`🔧 Changing preference ${field} to:`, value);

    if (field === 'darkMode') {
      const theme = value ? 'dark' : 'light';
      applyTheme(theme);
      localStorage.setItem('appTheme', theme);
    }
    
    setPreferencesData(prev => {
      const newPrefs = { ...prev, [field]: value };
      console.log('📝 New preferences state:', newPrefs);
      
      // Update notification service preferences
      if (['emailNotifications', 'pushNotifications', 'projectUpdates', 'weeklyDigest'].includes(field)) {
        try {
          notificationService.updatePreferences({ [field]: value });
          console.log(`📢 ${field} updated in notification service:`, value);
        } catch (error) {
          console.error('Error updating notification service:', error);
        }
        
        // Test notification when enabling push notifications
        if (value && field === 'pushNotifications') {
          console.log('🧪 Testing push notification');
          testPushNotification();
        }
      }
      
      return newPrefs;
    });
  };

  // Test push notification
  const testPushNotification = () => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Settings Updated', {
          body: 'Push notifications are now enabled!',
          icon: '/favicon.ico'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Settings Updated', {
              body: 'Push notifications are now enabled!',
              icon: '/favicon.ico'
            });
          }
        });
      }
    }
  };

  // Apply theme function with better logging
  const applyTheme = (theme) => {
    console.log('🎨 Applying theme:', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.classList.remove('light-theme');
      console.log('🌙 Dark theme applied');
    } else if (theme === 'light') {
      document.documentElement.classList.add('light-theme');
      document.documentElement.classList.remove('dark-theme');
      console.log('☀️ Light theme applied');
    } else {
      // Auto theme
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.remove('dark-theme', 'light-theme');
      if (prefersDark) {
        document.documentElement.classList.add('dark-theme');
        console.log('🌙 Auto-detected dark theme applied');
      } else {
        document.documentElement.classList.add('light-theme');
        console.log('☀️ Auto-detected light theme applied');
      }
    }
    
    // Log current classes
    console.log('🏷️ Current document classes:', document.documentElement.className);
  };

  // Avatar upload handling with compression and better error handling
  const handleAvatarUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file type first
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG, GIF, WEBP)');
        return;
      }

      // Increased limit to 10MB for modern phone photos
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert('File size must be less than 10MB');
        return;
      }

      console.log('🖼️ Processing image file:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
        type: file.type
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Create image element for compression
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              // Set max dimensions (800x800 for profile photos)
              const maxSize = 800;
              let { width, height } = img;
              
              if (width > height) {
                if (width > maxSize) {
                  height = (height * maxSize) / width;
                  width = maxSize;
                }
              } else {
                if (height > maxSize) {
                  width = (width * maxSize) / height;
                  height = maxSize;
                }
              }
              
              canvas.width = width;
              canvas.height = height;
              
              // Draw and compress
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to base64 with compression
              const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
              
              console.log('🖼️ Image compressed successfully:', {
                originalSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
                compressedSize: `${(compressedDataUrl.length * 0.75 / 1024 / 1024).toFixed(2)}MB`,
                dimensions: `${width}x${height}`,
                dataUrlLength: compressedDataUrl.length
              });
              
              // Validate the data URL
              if (compressedDataUrl && compressedDataUrl.startsWith('data:image')) {
                setProfileData(prev => ({ ...prev, avatar: compressedDataUrl }));
                console.log('✅ Avatar updated in profileData');
              } else {
                console.error('❌ Invalid data URL generated');
                alert('Error processing image. Please try a different image.');
              }
              
            } catch (canvasError) {
              console.error('❌ Canvas processing error:', canvasError);
              alert('Error processing image. Please try a different image.');
            }
          };
          
          img.onerror = () => {
            console.error('❌ Image loading error');
            alert('Error loading image. Please try a different image.');
          };
          
          img.src = e.target.result;
          
        } catch (imageError) {
          console.error('❌ Image processing error:', imageError);
          alert('Error processing image. Please try again.');
        }
      };
      
      reader.onerror = () => {
        console.error('❌ File reading error');
        alert('Error reading the image file. Please try again.');
      };
      
      reader.readAsDataURL(file);
    }
    
    // Clear the input so the same file can be selected again if needed
    event.target.value = '';
  };

  // Skills management
  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };

  // Form validation
  const validateProfileForm = () => {
    const newErrors = {};
    
    if (!profileData.name.trim()) newErrors.name = 'Name is required';
    if (!profileData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    
    if (!passwordData.currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!passwordData.newPassword) newErrors.newPassword = 'New password is required';
    else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Apply preferences to the application
  const applyPreferences = (preferences) => {
    applyTheme(preferences.darkMode ? 'dark' : 'light');
    localStorage.setItem('appTheme', preferences.darkMode ? 'dark' : 'light');

    // Notification permissions
    if (preferences.pushNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      }
    }

    console.log('✅ Preferences applied:', preferences);
  };

  // Save handlers with extensive debugging
  const handleSaveProfile = async () => {
    if (!validateProfileForm()) return;

    try {
      setSaving(true);
      console.log('🔍 DEBUGGING - About to save profile data');
      console.log('🔍 DEBUGGING - Current user for save:', currentUser);
      console.log('🔍 DEBUGGING - Profile data to save:', profileData);
      
      // Try multiple possible user identifiers
      const userId = currentUser.id || currentUser.user_id || currentUser.userId || currentUser.email || currentUser.name;
      console.log('🔍 DEBUGGING - Using userId for save:', userId);
      
      if (!userId) {
        console.error('❌ Cannot save: No valid user identifier found!');
        alert('Cannot save: User ID not found');
        return;
      }
      
      // Create updated user object
      const updatedUser = { 
        ...currentUser, 
        ...profileData,
        // Ensure these fields are properly updated
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        location: profileData.location,
        bio: profileData.bio,
        title: profileData.title,
        department: profileData.department,
        avatar: profileData.avatar,
        skills: profileData.skills
      };
      
      console.log('📝 Updated user object for save:', updatedUser);
      
      // Save to localStorage with user-specific key
      const userProfileKey = `userProfile_${userId}`;
      console.log('🔍 DEBUGGING - Saving with key:', userProfileKey);
      
      try {
        // Save just the profile data, not the entire user object
        const dataToSave = {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          location: profileData.location,
          bio: profileData.bio,
          title: profileData.title,
          department: profileData.department,
          avatar: profileData.avatar,
          skills: profileData.skills,
          lastUpdated: new Date().toISOString()
        };
        
        console.log('🔍 DEBUGGING - Data being saved:', dataToSave);
        localStorage.setItem(userProfileKey, JSON.stringify(dataToSave));
        
        // Also update the current session data (if it exists)
        const currentUserData = localStorage.getItem('currentUser');
        if (currentUserData) {
          try {
            const currentParsed = JSON.parse(currentUserData);
            const updatedCurrentUser = { ...currentParsed, ...dataToSave };
            localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
            console.log('✅ Also updated currentUser in localStorage');
          } catch (e) {
            console.log('ℹ️ Could not update currentUser (normal if not using that key)');
          }
        }
        
        console.log('✅ Saved to localStorage successfully with key:', userProfileKey);
        
        // Verify it was saved
        const verification = localStorage.getItem(userProfileKey);
        console.log('🔍 VERIFICATION - localStorage now contains:', verification);
        console.log('🔍 VERIFICATION - Parsed back:', JSON.parse(verification));
        
        // Test immediate reload
        setTimeout(() => {
          const testLoad = localStorage.getItem(userProfileKey);
          console.log('🧪 TEST LOAD after 1 second:', testLoad);
        }, 1000);
        
      } catch (storageError) {
        console.error('❌ localStorage save failed:', storageError);
        throw new Error('Failed to save to local storage: ' + storageError.message);
      }
      
      // Update the user in parent component
      if (onUserUpdate) {
        console.log('📤 Updating parent component with user data');
        onUserUpdate(updatedUser);
      } else {
        console.warn('⚠️ onUserUpdate function not provided');
      }
      
      console.log('🎉 Profile save completed successfully');
      alert('Profile updated successfully! Check console for debug info.');
      
    } catch (error) {
      console.error('❌ Profile save failed:', error);
      alert(`Failed to update profile: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setSaving(true);
      console.log('🔐 Attempting password change');
      
      // Simulate password validation (demo mode)
      if (passwordData.currentPassword !== 'demo123') {
        console.log('❌ Password validation failed');
        alert('Current password is incorrect (hint: try "demo123")');
        return;
      }
      
      console.log('✅ Password validation passed');
      
      // Try to save to API if available
      try {
        // When you have an API, uncomment this:
        // await apiService.changePassword(currentUser.id, passwordData);
        console.log('🌐 API password change would happen here');
      } catch (apiError) {
        console.warn('⚠️ API password change failed:', apiError);
      }
      
      console.log('🎉 Password change completed');
      alert('Password changed successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('❌ Password change failed:', error);
      alert('Failed to change password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      console.log('⚙️ Saving preferences:', preferencesData);
      
      // Apply preferences immediately
      applyPreferences(preferencesData);
      
      // Save to localStorage with user-specific key
      const userPrefsKey = `userPreferences_${currentUser.id || currentUser.email}`;
      try {
        localStorage.setItem(userPrefsKey, JSON.stringify(preferencesData));
        console.log('✅ Preferences saved to localStorage with key:', userPrefsKey);
        
        // Verify save
        const savedPrefs = localStorage.getItem(userPrefsKey);
        console.log('🔍 Verified preferences in localStorage:', JSON.parse(savedPrefs));
      } catch (storageError) {
        console.error('❌ Preferences localStorage save failed:', storageError);
        throw new Error('Failed to save preferences to local storage');
      }
      
      // Update notification service
      try {
        notificationService.updatePreferences(preferencesData);
        console.log('📢 Notification service updated');
      } catch (notifError) {
        console.error('⚠️ Notification service update failed:', notifError);
      }
      
      // Try to save to API if available
      try {
        // When you have an API, uncomment this:
        // await apiService.updateUserPreferences(currentUser.id, preferencesData);
        console.log('🌐 API preferences save would happen here');
      } catch (apiError) {
        console.warn('⚠️ API preferences save failed, but localStorage succeeded:', apiError);
      }
      
      console.log('🎉 Preferences save completed');
      alert('Preferences updated successfully!');
      
    } catch (error) {
      console.error('❌ Preferences save failed:', error);
      alert(`Failed to update preferences: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'preferences', label: 'Preferences', icon: Bell }
  ];

  const renderAvatarSection = () => (
    <div className="settings-card" style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '24px'
    }}>
      <h4 className="settings-text" style={{ 
        fontSize: '16px', 
        fontWeight: '600', 
        marginBottom: '16px', 
        color: '#111827' 
      }}>
        Profile Picture
      </h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          backgroundColor: profileData.avatar && profileData.avatar.startsWith('data:image') ? 'transparent' : '#2563eb',
          backgroundImage: profileData.avatar && profileData.avatar.startsWith('data:image') ? `url("${profileData.avatar}")` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '24px',
          fontWeight: '600',
          border: '3px solid #e5e7eb',
          overflow: 'hidden'
        }}>
          {(!profileData.avatar || !profileData.avatar.startsWith('data:image')) && 
            profileData.name.split(' ').map(n => n[0]).join('').toUpperCase()
          }
        </div>
        <div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Camera size={16} />
            {profileData.avatar && profileData.avatar.startsWith('data:image') ? 'Change Photo' : 'Upload Photo'}
          </button>
          <p style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            margin: '4px 0 0 0' 
          }}>
            JPG, PNG, GIF, WEBP. Max size 10MB. Images will be automatically resized.
          </p>
          {profileData.avatar && profileData.avatar.startsWith('data:image') && (
            <p style={{ 
              fontSize: '11px', 
              color: '#10b981', 
              margin: '4px 0 0 0',
              fontWeight: '500'
            }}>
              ✓ Profile picture uploaded
            </p>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );

  const renderProfileTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {renderAvatarSection()}

      {/* Basic Information */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px', 
          color: '#111827' 
        }}>
          Basic Information
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Full Name *
            </label>
            <input
              type="text"
              value={profileData.name}
              onChange={(e) => handleProfileChange('name', e.target.value)}
              className="settings-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${errors.name ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {errors.name && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Email Address *
            </label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => handleProfileChange('email', e.target.value)}
              className="settings-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
            {errors.email && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={profileData.phone}
              onChange={(e) => handleProfileChange('phone', e.target.value)}
              className="settings-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Location
            </label>
            <input
              type="text"
              value={profileData.location}
              onChange={(e) => handleProfileChange('location', e.target.value)}
              placeholder="City, State"
              className="settings-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>

      {/* Professional Information */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px', 
          color: '#111827' 
        }}>
          Professional Information
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Job Title
            </label>
            <input
              type="text"
              value={profileData.title}
              onChange={(e) => handleProfileChange('title', e.target.value)}
              className="settings-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Department
            </label>
            <input
              type="text"
              value={profileData.department}
              onChange={(e) => handleProfileChange('department', e.target.value)}
              className="settings-input"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        <div>
          <label className="settings-text" style={{ 
            display: 'block', 
            fontSize: '14px', 
            fontWeight: '500', 
            color: '#374151', 
            marginBottom: '4px' 
          }}>
            Bio
          </label>
          <textarea
            value={profileData.bio}
            onChange={(e) => handleProfileChange('bio', e.target.value)}
            placeholder="Tell us about yourself..."
            rows={4}
            className="settings-input"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Skills Section */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px', 
          color: '#111827' 
        }}>
          Skills & Expertise
        </h4>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            placeholder="Add a skill..."
            onKeyPress={(e) => e.key === 'Enter' && addSkill()}
            className="settings-input"
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          />
          <button
            onClick={addSkill}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>

        {/* Skills Display */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '8px',
          marginBottom: '16px'
        }}>
          {profileData.skills.map((skill, index) => (
            <span
              key={index}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {skill}
              <button
                onClick={() => removeSkill(skill)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  cursor: 'pointer',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        {/* Skill Suggestions */}
        <div>
          <p className="settings-text-secondary" style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Popular skills:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {commonSkills
              .filter(skill => !profileData.skills.includes(skill))
              .slice(0, 10)
              .map((skill) => (
                <button
                  key={skill}
                  onClick={() => {
                    setProfileData(prev => ({
                      ...prev,
                      skills: [...prev.skills, skill]
                    }));
                  }}
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#f3f4f6',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    borderRadius: '12px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  + {skill}
                </button>
              ))
            }
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSaveProfile}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: saving ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Change Password */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px', 
          color: '#111827' 
        }}>
          Change Password
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Current Password * (demo: "demo123")
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
                className="settings-input"
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: `1px solid ${errors.currentPassword ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showPassword.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>
                {errors.currentPassword}
              </p>
            )}
          </div>

          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              New Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                className="settings-input"
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: `1px solid ${errors.newPassword ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showPassword.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>
                {errors.newPassword}
              </p>
            )}
          </div>

          <div>
            <label className="settings-text" style={{ 
              display: 'block', 
              fontSize: '14px', 
              fontWeight: '500', 
              color: '#374151', 
              marginBottom: '4px' 
            }}>
              Confirm New Password *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                className="settings-input"
                style={{
                  width: '100%',
                  padding: '8px 40px 8px 12px',
                  border: `1px solid ${errors.confirmPassword ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showPassword.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 0' }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            onClick={handleChangePassword}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              backgroundColor: saving ? '#9ca3af' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            <Lock size={16} />
            {saving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      {/* Security Info */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px', 
          color: '#111827' 
        }}>
          Account Security
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={20} style={{ color: '#10b981' }} />
            <div>
              <p className="settings-text" style={{ margin: 0, fontWeight: '500', color: '#111827' }}>
                Two-Factor Authentication
              </p>
              <p className="settings-text-secondary" style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                Disabled - Enhance your account security
              </p>
            </div>
            <button style={{
              marginLeft: 'auto',
              padding: '6px 12px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}>
              Enable
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} style={{ color: '#6b7280' }} />
            <div>
              <p className="settings-text" style={{ margin: 0, fontWeight: '500', color: '#111827' }}>
                Last Login
              </p>
              <p className="settings-text-secondary" style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
                {profileData.lastLogin ? new Date(profileData.lastLogin).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreferencesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Appearance */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#111827'
        }}>
          Appearance
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="settings-text" style={{ margin: 0, fontWeight: '500', color: '#111827' }}>
              Dark/Night Mode
            </p>
            <p className="settings-text-secondary" style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
              Use a darker interface theme for low-light viewing.
            </p>
          </div>
          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
            <input
              type="checkbox"
              checked={preferencesData.darkMode}
              onChange={(e) => handlePreferencesChange('darkMode', e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: preferencesData.darkMode ? '#2563eb' : '#ccc',
              borderRadius: '24px',
              transition: 'all 0.3s'
            }}>
              <span style={{
                position: 'absolute',
                content: '',
                height: '20px',
                width: '20px',
                left: preferencesData.darkMode ? '22px' : '2px',
                bottom: '2px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'all 0.3s'
              }} />
            </span>
          </label>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="settings-card" style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h4 className="settings-text" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '16px', 
          color: '#111827' 
        }}>
          Notification Preferences
        </h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive notifications via email' },
            { key: 'pushNotifications', label: 'Push Notifications', desc: 'Receive browser notifications' },
            { key: 'projectUpdates', label: 'Project Updates', desc: 'Get notified about project changes' },
            { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Receive weekly summary emails' }
          ].map(({ key, label, desc }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p className="settings-text" style={{ margin: 0, fontWeight: '500', color: '#111827' }}>{label}</p>
                <p className="settings-text-secondary" style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>{desc}</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                <input
                  type="checkbox"
                  checked={preferencesData[key]}
                  onChange={(e) => handlePreferencesChange(key, e.target.checked)}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  cursor: 'pointer',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: preferencesData[key] ? '#2563eb' : '#ccc',
                  borderRadius: '24px',
                  transition: 'all 0.3s'
                }}>
                  <span style={{
                    position: 'absolute',
                    content: '',
                    height: '20px',
                    width: '20px',
                    left: preferencesData[key] ? '22px' : '2px',
                    bottom: '2px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transition: 'all 0.3s'
                  }} />
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSavePreferences}
          disabled={saving}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: saving ? '#9ca3af' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="settings-page" style={{ padding: '24px', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2 className="settings-text" style={{ 
            fontSize: '28px', 
            fontWeight: '700', 
            color: '#111827', 
            marginBottom: '8px' 
          }}>
            Settings
          </h2>
          <p className="settings-text-secondary" style={{ color: '#6b7280', fontSize: '16px', margin: 0 }}>
            Manage your account information and preferences
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="settings-card" style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          padding: '8px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    border: 'none',
                    borderRadius: '8px',
                    background: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#2563eb' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div>
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'preferences' && renderPreferencesTab()}
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;