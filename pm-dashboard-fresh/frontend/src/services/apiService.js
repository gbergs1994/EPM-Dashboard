// frontend/src/services/apiService.js - COMPLETE VERSION WITH ALL METHODS
class ApiService {
  constructor() {
    this.baseURL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    this.token = localStorage.getItem('token');
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async handleResponse(response) {
    if (!response.ok) {
      // try to parse body, the API often returns { success:false, error:..., details:? }
      const errBody = await response.json().catch(() => ({}));
      const message = errBody.message || errBody.error || errBody.details || `HTTP ${response.status}`;
      // log server error for debugging
      console.error('🚨 API responded with error status', response.status, errBody);
      if (response.status === 401) {
        this.logout();
        window.dispatchEvent(new Event('auth-expired'));
      }
      throw new Error(message);
    }
    return await response.json();
  }

  // AUTHENTICATION METHODS
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data = await this.handleResponse(response);
      
      if (data.success && (data.user || data.data)) {
          // Handle both response formats: { user: ... } or { data: ... }
          const userData = data.user || data.data;
         
          // Create a simple token from user ID since your backend doesn't use JWT
          this.token = `user_${userData.id}`;
          localStorage.setItem('token', this.token);
          localStorage.setItem('user', JSON.stringify(userData));
          
          console.log('✅ Login successful');
          console.log('👤 User:', userData.name, `(${userData.role})`);
          
          return {
            success: true,
            user: userData,
            message: data.message
          };
        } else {
          throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await this.handleResponse(response);

      if (data.success && (data.user || data.data)) {
        // Handle both response formats: { user: ... } or { data: ... }
        const userData = data.user || data.data;

        // Create a simple token from user ID since your backend doesn't use JWT
        this.token = `user_${userData.id}`;
        localStorage.setItem('token', this.token);
        localStorage.setItem('user', JSON.stringify(userData));

        console.log('✅ Registration successful');
        console.log('👤 User:', userData.name, `(${userData.role})`);

        return {
          success: true,
          user: userData,
          message: data.message
        };
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getCurrentUser() {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    console.log('👤 Current user:', user?.name || 'None');
    return user;
  }

  isAuthenticated() {
    const hasToken = !!this.token && !!localStorage.getItem('token');
    const hasUser = !!localStorage.getItem('user');
    return hasToken && hasUser;
  }

  // BASIC HTTP METHODS
  async get(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with GET ${endpoint}:`, error);
      throw error;
    }
  }

  async post(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with POST ${endpoint}:`, error);
      throw error;
    }
  }

  async put(endpoint, data) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with PUT ${endpoint}:`, error);
      throw error;
    }
  }

  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error(`Error with DELETE ${endpoint}:`, error);
      throw error;
    }
  }

  // PROJECT MANAGEMENT METHODS
  async getProjects() {
    try {
      const response = await fetch(`${this.baseURL}/api/projects`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw error;
    }
  }

  async getAllProjects() {
    try {
      console.log('📡 Fetching all projects...');
      const response = await fetch(`${this.baseURL}/api/projects`, {
        headers: this.getHeaders(),
      });

      const result = await this.handleResponse(response);
      
      return {
        success: true,
        data: result.data || result.projects || result || []
      };
      
    } catch (error) {
      console.error('❌ Error fetching all projects:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async createProject(projectData) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(projectData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async updateProject(projectId, projectData) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(projectData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async getProjectHistory(projectId) {
    try {
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/history`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching project history:', error);
      throw error;
    }
  }
  async getProjectInsights(projectId) {
      try {
        return await this.get(`/api/ai/insights/${projectId}`);
      } catch (error) {
        console.error('Error getting project insights:', error);
        return {
          success: false,
          error: error.message,
          insights: { summary: 'Project insights temporarily unavailable' }
        };
      }
    }

  // PROJECT TEAM METHODS - FIXED: These were missing!
  async getProjectTeam(projectId) {
      try {
       console.log('📡 Fetching project team for project:', projectId);
        const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team`, {
          headers: this.getHeaders(),
        });
    
        return await this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error fetching project team:', error);
        return {
          success: false,
          error: error.message,
          team: []
        };
      }
    }

    async addTeamMember(projectId, memberData) {
        try {
          console.log('➕ Adding team member to project:', projectId, memberData);

          const workloadAllocation = Number.parseInt(
            memberData.workload_allocation ?? memberData.contribution,
            10
          );
          
          // Backend expects: { id, role, skills, joinedDate, status, workload_allocation }
          const payload = {
            id: memberData.user_id || memberData.id,
            role: memberData.role_in_project || memberData.role || 'Team Member',
            skills: memberData.skills || [],
            joinedDate: memberData.joinedDate || new Date().toISOString(),
            status: memberData.status || 'active',
            workload_allocation: workloadAllocation
          };
      
          const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(payload),
          });
      
          return await this.handleResponse(response);
        } catch (error) {
          console.error('❌ Error adding project team member:', error);
          throw error;
        }
      }

      async removeTeamMember(projectId, memberId) {
        try {
          if (!projectId || !memberId) {
            throw new Error('Project ID and team member ID are required');
          }

          console.log('➖ Removing team member from project:', projectId, memberId);
          const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team/${memberId}`, {
            method: 'DELETE',
            headers: this.getHeaders(),
          });
      
          return await this.handleResponse(response);
        } catch (error) {
          console.error('❌ Error removing project team member:', error);
          throw error;
        }
      }

  async updateTeamMember(projectId, memberId, memberData) {
      try {
        console.log('✏️ Updating team member in project:', projectId, memberId, memberData);
        
        // Backend expects: { role, skills, status, joinedDate, workload_allocation }
        const payload = {
          role: memberData.role_in_project || memberData.role || 'Team Member',
          skills: memberData.skills || [],
          status: memberData.status || 'active',
          joinedDate: memberData.joinedDate,
          contribution: Number.parseInt(memberData.contribution ?? memberData.workload_allocation, 10),
          workload_allocation: Number.parseInt(memberData.workload_allocation ?? memberData.contribution, 10)
        };
    
        const response = await fetch(`${this.baseURL}/api/projects/${projectId}/team/${memberId}`, {
          method: 'PUT',
          headers: this.getHeaders(),
          body: JSON.stringify(payload),
        });
    
        return await this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error updating project team member:', error);
        throw error;
      }
    }
    // Add this method to your frontend/src/services/apiService.js class

async getProjectAnalytics(projectId) {
  try {
    console.log('📊 Fetching analytics for project:', projectId);
    const response = await fetch(`${this.baseURL}/api/projects/${projectId}/analytics`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse(response);
  } catch (error) {
    console.error('❌ Error fetching project analytics:', error);
    throw error;
  }
}
    async getProjectInsights(projectId) {
      try {
        console.log('📊 Getting project insights for project:', projectId);
        const response = await fetch(`${this.baseURL}/api/ai/insights/${projectId}`, {
          headers: this.getHeaders(),
        });
    
        return await this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error getting project insights:', error);
        throw error;
      }
    }

  // PROJECT COMMENT METHODS
  async getProjectComments(projectId) {
    try {
      console.log('📡 Fetching comments for project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching project comments:', error);
      throw error;
    }
  }

  async addProjectComment(projectId, commentData) {
    try {
      console.log('💬 Adding comment to project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(commentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error adding project comment:', error);
      throw error;
    }
  }

  async updateProjectComment(projectId, commentId, commentData) {
    try {
      console.log('✏️ Updating comment:', commentId, 'in project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments/${commentId}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(commentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error updating project comment:', error);
      throw error;
    }
  }

  async deleteProjectComment(projectId, commentId) {
    try {
      console.log('🗑️ Deleting comment:', commentId, 'from project:', projectId);
      const response = await fetch(`${this.baseURL}/api/projects/${projectId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error deleting project comment:', error);
      throw error;
    }
  }

  // ALIAS METHODS for backward compatibility
  async addProjectMember(projectId, memberData) {
    return this.addProjectTeamMember(projectId, memberData);
  }

  async removeProjectMember(projectId, memberId) {
    return this.removeProjectTeamMember(projectId, memberId);
  }

  async updateProjectMember(projectId, memberId, memberData) {
    return this.updateProjectTeamMember(projectId, memberId, memberData);
  }
  async submitProjectFeedback(projectId, feedbackData) {
    try {
      console.log('📝 Submitting project feedback for project:', projectId);
      const result = await this.post(`/api/projects/${projectId}/feedback`, feedbackData);
      return result;
    } catch (error) {
      console.error('❌ Error submitting project feedback:', error);
      throw new Error(error.message || 'Failed to submit project feedback');
    }
  }

  async assignTeamMembers(memberIds) {
    try {
      console.log('➕ Assigning multiple team members:', memberIds);
      const response = await fetch(`${this.baseURL}/api/team/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ memberIds }),
      });
  
      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error assigning team members:', error);
      return { success: false, error: error.message };
    }
  }
  async removeTeamMembers(memberIds) {
    try {
      console.log('➖ Removing multiple team members:', memberIds);
      const response = await fetch(`${this.baseURL}/api/team/remove`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ memberIds }),
      });
  
      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error removing team members:', error);
      return { success: false, error: error.message };
    }
  }

  async searchUsers(query) {
    try {
      console.log('🔍 Searching users with query:', query);
      const response = await fetch(`${this.baseURL}/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: this.getHeaders(),
      });
  
      const result = await this.handleResponse(response);
      console.log('🔍 Search result:', result);
      return result;
    } catch (error) {
      console.error('❌ Error searching users:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  // USER MANAGEMENT METHODS
  async getUsers() {
    try {
      const response = await fetch(`${this.baseURL}/api/users`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getAllUsers() {
      try {
        console.log('📡 Fetching all available users...');
        const response = await fetch(`${this.baseURL}/api/projects/users/available`, {
          headers: this.getHeaders(),
        });
    
        const result = await this.handleResponse(response);
        
        return {
          success: true,
          users: result.data || [],
          data: result.data || []
        };
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        return {
          success: false,
          error: error.message,
          users: [],
          data: []
        };
      }
    }

  async getAvailableUsers(projectId = null) {
    try {
      console.log('📡 Fetching available users for project:', projectId);
      const endpoint = projectId ? 
        `/api/projects/${projectId}/users/available` : 
        '/api/users/available';
        
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('❌ Error fetching available users:', error);
      return {
        success: false,
        error: error.message,
        users: []
      };
    }
  }

  async getUserProfile() {
    try {
      const response = await fetch(`${this.baseURL}/api/users/profile`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(profileData) {
    try {
      const response = await fetch(`${this.baseURL}/api/users/profile`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(profileData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // LEADERSHIP ASSESSMENT METHODS
  async submitLeadershipAssessment(assessmentData) {
    try {
      // endpoint updated to match backend mounting at /api/leadership
      const response = await fetch(`${this.baseURL}/api/leadership/assessments`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assessmentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error submitting leadership assessment:', error);
      throw error;
    }
  }

  async getLeadershipMetrics(userId = null, projectId = null) {
    try {
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (projectId) params.append('projectId', projectId);
      
      const url = `${this.baseURL}/api/leadership/metrics${
        params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching leadership metrics:', error);
      throw error;
    }
  }

  // TEAM MANAGEMENT METHODS (for Project Managers)
  async getTeamMembers() {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/members`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  }

  async assignTeamMember(assignmentData) {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/assign`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(assignmentData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error assigning team member:', error);
      throw error;
    }
  }

  async removeManagedTeamMember(teamMemberId) {
    try {
      const response = await fetch(`${this.baseURL}/api/team/remove`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ memberIds: [teamMemberId] }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error removing managed team member:', error);
      throw error;
    }
  }

  async getTeamMetrics() {
    try {
      const response = await fetch(`${this.baseURL}/api/team-management/metrics`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Error fetching team metrics:', error);
      throw error;
    }
  }

  // CAREER DEVELOPMENT METHODS
  async getCareerStats(targetUserId = null) {
    try {
      if (!targetUserId) {
        const user = this.getCurrentUser();
        if (!user?.id) {
          console.warn('No user ID available for career stats');
          return { success: false, error: 'No user available', data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
        }
        targetUserId = user.id;
      }
      
      if (!targetUserId) {
        console.warn('No target user ID provided for career stats');
        return { success: false, error: 'No user ID', data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
      }
      
      return this.get(`/api/career/stats/${targetUserId}`);
    } catch (error) {
      console.error('Error getting career stats:', error);
      return { success: false, error: error.message, data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
    }
  }

  async getUserProjects() {
    try {
      const result = await this.get('/api/projects');
      return {
        success: true,
        projects: result.data || result.projects || []
      };
    } catch (error) {
      console.error('Error getting user projects:', error);
      return { success: false, error: error.message, projects: [] };
    }
  }

  // PROJECT MANAGER METHODS
  async getProjectManagerTeam() {
      try {
        console.log('📡 Fetching project manager team...');
        const response = await fetch(`${this.baseURL}/api/team/project-manager`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          let errorPayload = null;
          try {
            errorPayload = await response.json();
          } catch (parseError) {
            console.warn('Unable to parse team API error payload:', parseError);
          }

          // Handle specific HTTP errors
          if (response.status === 403) {
            console.warn('⚠️ User not authorized to access project manager team');
            return { 
              success: false, 
              error: errorPayload?.message || errorPayload?.error || 'Not authorized', 
              data: { teamMembers: [], unassignedMembers: [], totalTeamSize: 0 } 
            };
          }

          return {
            success: false,
            error: errorPayload?.message || errorPayload?.error || `HTTP ${response.status}`,
            data: { teamMembers: [], unassignedMembers: [], totalTeamSize: 0 }
          };
        }

        const result = await response.json();
        const data = result?.data || {};
        const teamMembers = data.teamMembers || data.members || [];
        const unassignedMembers = data.unassignedMembers || [];

        return {
          success: result?.success !== false,
          message: result?.message,
          data: {
            teamMembers,
            unassignedMembers,
            totalTeamSize: typeof data.totalTeamSize === 'number' ? data.totalTeamSize : teamMembers.length
          }
        };
      } catch (error) {
        console.error('❌ Error fetching project manager team:', error);
        return { 
          success: false, 
          error: error.message, 
          data: { teamMembers: [], unassignedMembers: [], totalTeamSize: 0 } 
        };
      }
    }

  async getProjectManagerDashboard() {
    try {
      return this.get('/api/team/project-manager/dashboard');
    } catch (error) {
      console.error('Error getting project manager dashboard:', error);
      return { success: false, error: error.message, data: { teamSize: 0, totalProjects: 0, averageProgress: 0 } };
    }
  }
  async sendAIChat(chatData) {
      try {
        console.log('🤖 Sending AI chat request:', chatData);
        
        const response = await fetch(`${this.baseURL}/api/ai/chat`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            message: chatData.message,
            context: chatData.context || {},
            projectId: chatData.projectId || null
          })
        });
    
        const result = await this.handleResponse(response);
        return result;
    
      } catch (error) {
        console.error('❌ AI Chat API Error:', error);
        
        // Return a user-friendly error response
        return {
          success: false,
          error: error.message || 'AI chat is currently unavailable',
          fallback: true
        };
      }
    }
    // MISSING CAREER METHODS FOR API SERVICE
// Add these methods to your frontend/src/services/apiService.js

  // CAREER DEVELOPMENT METHODS (ADD THESE TO YOUR API SERVICE CLASS)
  async getCareerGoals(userId = null) {
    try {
      // Use current user if no userId specified
      if (!userId) {
        const user = this.getCurrentUser();
        userId = user?.id;
      }
      
      if (!userId) {
        return { success: false, error: 'No user ID available', data: [] };
      }
      
      console.log('🎯 Fetching career goals for user:', userId);
      const result = await this.get(`/api/career/goals/${userId}`);
      
      return {
        success: true,
        data: result.data || [],
        goals: result.data || [] // Also provide 'goals' for backward compatibility
      };
    } catch (error) {
      console.error('Error getting career goals:', error);
      return { 
        success: false, 
        error: error.message, 
        data: [],
        goals: []
      };
    }
  }

  async createCareerGoal(goalData) {
    try {
      console.log('🎯 Creating career goal:', goalData);
      const result = await this.post('/api/career/goals', goalData);
      return result;
    } catch (error) {
      console.error('Error creating career goal:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCareerGoal(goalId, goalData) {
    try {
      console.log('🎯 Updating career goal:', goalId, goalData);
      const result = await this.put(`/api/career/goals/${goalId}`, goalData);
      return result;
    } catch (error) {
      console.error('Error updating career goal:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteCareerGoal(goalId) {
    try {
      console.log('🎯 Deleting career goal:', goalId);
      const result = await this.delete(`/api/career/goals/${goalId}`);
      return result;
    } catch (error) {
      console.error('Error deleting career goal:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserCompletedGoals(userId = null) {
    try {
      if (!userId) {
        const user = this.getCurrentUser();
        userId = user?.id;
      }
      
      if (!userId) {
        return { success: false, error: 'No user ID available', completedGoals: [] };
      }
      
      console.log('🎯 Fetching completed career goals for user:', userId);
      const result = await this.get(`/api/career/completed-goals/${userId}`);
      
      return {
        success: true,
        completedGoals: result.data || result.completedGoals || []
      };
    } catch (error) {
      console.error('Error getting completed career goals:', error);
      return { 
        success: false, 
        error: error.message, 
        completedGoals: []
      };
    }
  }

  // This method already exists in your API service but make sure it's working
  async getCareerStats(userId = null) {
    try {
      if (!userId) {
        const user = this.getCurrentUser();
        userId = user?.id;
      }
      
      if (!userId) {
        console.warn('No user ID available for career stats');
        return { success: false, error: 'No user available', data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
      }
      
      console.log('📊 Fetching career stats for user:', userId);
      return this.get(`/api/career/stats/${userId}`);
    } catch (error) {
      console.error('Error getting career stats:', error);
      return { success: false, error: error.message, data: { activeGoals: 0, completedGoals: 0, avgProgress: 0 } };
    }
  }

  // Progress update method
  async updateCareerGoalProgress(goalId, progressData) {
    try {
      console.log('📈 Updating career goal progress:', goalId, progressData);
      const result = await this.put(`/api/career/goals/${goalId}/progress`, progressData);
      return result;
    } catch (error) {
      console.error('Error updating career goal progress:', error);
      return { success: false, error: error.message };
    }
  }
  // MISSING ORGANIZATIONAL CHANGE METHODS FOR API SERVICE
// Add these methods to your frontend/src/services/apiService.js

// ORGANIZATIONAL CHANGE ASSESSMENT METHODS (ADD THESE TO YOUR API SERVICE CLASS)

  async getOrganizationalChangeAssessments(projectId = null) {
    try {
      console.log('🔄 Fetching organizational change assessments for project:', projectId);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') {
        params.append('project_id', projectId);
      }
      
      const url = `/api/organizational-change/assessments${params.toString() ? '?' + params.toString() : ''}`;
      const result = await this.get(url);
      
      return {
        success: true,
        assessments: result.assessments || result.data || []
      };
    } catch (error) {
      console.error('Error getting organizational change assessments:', error);
      return { 
        success: false, 
        error: error.message, 
        assessments: [] 
      };
    }
  }

  async submitOrganizationalChangeAssessment(assessmentData) {
    try {
      console.log('🔄 Submitting organizational change assessment:', assessmentData);
      const result = await this.post('/api/organizational-change/assessments', assessmentData);
      return result;
    } catch (error) {
      console.error('Error submitting organizational change assessment:', error);
      return { success: false, error: error.message };
    }
  }

  async getOrganizationalChangeAnalytics(projectId = null) {
    try {
      console.log('📊 Fetching organizational change analytics for project:', projectId);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') {
        params.append('project_id', projectId);
      }
      
      const url = `/api/organizational-change/analytics${params.toString() ? '?' + params.toString() : ''}`;
      const result = await this.get(url);
      
      return {
        success: true,
        assessments: result.assessments || result.data || [],
        analytics: result.analytics || {}
      };
    } catch (error) {
      console.error('Error getting organizational change analytics:', error);
      return { 
        success: false, 
        error: error.message, 
        assessments: [],
        analytics: {}
      };
    }
  }

  async getOrganizationalChangeAssessmentDetails(assessmentId) {
    try {
      console.log('🔄 Fetching organizational change assessment details:', assessmentId);
      const result = await this.get(`/api/organizational-change/assessments/${assessmentId}`);
      return result;
    } catch (error) {
      console.error('Error getting organizational change assessment details:', error);
      return { success: false, error: error.message };
    }
  }

  async updateOrganizationalChangeAssessment(assessmentId, assessmentData) {
    try {
      console.log('🔄 Updating organizational change assessment:', assessmentId, assessmentData);
      const result = await this.put(`/api/organizational-change/assessments/${assessmentId}`, assessmentData);
      return result;
    } catch (error) {
      console.error('Error updating organizational change assessment:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteOrganizationalChangeAssessment(assessmentId) {
    try {
      console.log('🔄 Deleting organizational change assessment:', assessmentId);
      const result = await this.delete(`/api/organizational-change/assessments/${assessmentId}`);
      return result;
    } catch (error) {
      console.error('Error deleting organizational change assessment:', error);
      return { success: false, error: error.message };
    }
  }

  async getOrganizationalChangeTeamMetrics(projectId = null) {
    try {
      console.log('📊 Fetching organizational change team metrics for project:', projectId);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') {
        params.append('project_id', projectId);
      }
      
      const url = `/api/organizational-change/team-metrics${params.toString() ? '?' + params.toString() : ''}`;
      const result = await this.get(url);
      
      return {
        success: true,
        metrics: result.metrics || result.data || {}
      };
    } catch (error) {
      console.error('Error getting organizational change team metrics:', error);
      return { 
        success: false, 
        error: error.message, 
        metrics: {} 
      };
    }
  }

  // LEADERSHIP ASSESSMENT METHODS (if also missing)

  // In your API service
  async getLeadershipAssessments(projectIdOrParams = null) {
    try {
      let projectId = null;
      
      // Handle both formats: getLeadershipAssessments(projectId) or getLeadershipAssessments({project_id: projectId})
      if (typeof projectIdOrParams === 'object' && projectIdOrParams !== null) {
        projectId = projectIdOrParams.project_id;
      } else {
        projectId = projectIdOrParams;
      }
      
      console.log('💪 Fetching leadership assessments for project:', projectId);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') {
        params.append('project_id', projectId);
      }
      
      const url = `/api/leadership/assessments${params.toString() ? '?' + params.toString() : ''}`;
      const result = await this.get(url);
      
      return {
        success: true,
        assessments: result.assessments || result.data || []
      };
    } catch (error) {
      console.error('Error getting leadership assessments:', error);
      return { 
        success: false, 
        error: error.message, 
        assessments: [] 
      };
    }
  }

  async submitLeadershipAssessment(assessmentData) {
    try {
      console.log('💪 Submitting leadership assessment:', assessmentData);
      const result = await this.post('/api/leadership/assessments', assessmentData);
      return result;
    } catch (error) {
      console.error('Error submitting leadership assessment:', error);
      return { success: false, error: error.message };
    }
  }

  async getLeadershipAnalytics(projectId = null) {
    try {
      console.log('📊 Fetching leadership analytics for project:', projectId);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (projectId && projectId !== 'all') {
        params.append('project_id', projectId);
      }
      
      const url = `/api/leadership/analytics${params.toString() ? '?' + params.toString() : ''}`;
      const result = await this.get(url);
      
      return {
        success: true,
        assessments: result.assessments || result.data || [],
        analytics: result.analytics || {}
      };
    } catch (error) {
      console.error('Error getting leadership analytics:', error);
      return { 
        success: false, 
        error: error.message, 
        assessments: [],
        analytics: {}
      };
    }
  }

  async getLeadershipAssessmentDetails(assessmentId) {
    try {
      console.log('💪 Fetching leadership assessment details:', assessmentId);
      const result = await this.get(`/api/leadership/assessments/${assessmentId}`);
      return result;
    } catch (error) {
      console.error('Error getting leadership assessment details:', error);
      return { success: false, error: error.message };
    }
  }

  async updateLeadershipAssessment(assessmentId, assessmentData) {
    try {
      console.log('💪 Updating leadership assessment:', assessmentId, assessmentData);
      const result = await this.put(`/api/leadership/assessments/${assessmentId}`, assessmentData);
      return result;
    } catch (error) {
      console.error('Error updating leadership assessment:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteLeadershipAssessment(assessmentId) {
    try {
      console.log('💪 Deleting leadership assessment:', assessmentId);
      const result = await this.delete(`/api/leadership/assessments/${assessmentId}`);
      return result;
    } catch (error) {
      console.error('Error deleting leadership assessment:', error);
      return { success: false, error: error.message };
    }
  }

  async getMilestonesByProject(projectId) {
    try {
      return await this.get(`/api/milestones/project/${projectId}`);
    } catch (error) {
      console.error('Error fetching milestones:', error);
      return { success: false, error: error.message, milestones: [] };
    }
  }

  async createMilestones(projectId, milestones) {
    return await this.post(`/api/milestones/project/${projectId}/batch`, { milestones });
  }

  async updateMilestone(milestoneId, milestoneData) {
    return await this.put(`/api/milestones/${milestoneId}`, milestoneData);
  }

  async getMilestoneComments(milestoneId) {
    try {
      return await this.get(`/api/milestones/${milestoneId}/comments`);
    } catch (error) {
      console.error('Error fetching milestone comments:', error);
      return { success: false, error: error.message, comments: [] };
    }
  }

  async deleteMilestone(milestoneId) {
    return await this.delete(`/api/milestones/${milestoneId}`);
  }

  async getProjectMilestoneMetrics(projectId) {
    try {
      return await this.get(`/api/milestones/project/${projectId}/metrics`);
    } catch (error) {
      console.error('Error fetching milestone metrics:', error);
      return { success: false, error: error.message, metrics: null };
    }
  }
}

// Create and export a singleton instance
const apiService = new ApiService();
export default apiService;