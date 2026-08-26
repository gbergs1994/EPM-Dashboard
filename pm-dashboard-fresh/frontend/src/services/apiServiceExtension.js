// frontend/src/services/apiServiceExtensions.js
// Extensions to apiService for leadership assessments

const leadershipAssessmentAPI = {
    // Get all leadership assessments for the current user
    async getLeadershipAssessments(userId = null) {
      try {
        const endpoint = userId ? `/leadership/assessments?user_id=${userId}` : '/leadership/assessments';
        console.log('🏆 API: Getting leadership assessments...', endpoint);
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error getting leadership assessments:', error);
        return { success: false, error: error.message, assessments: [] };
      }
    },
  
    // Submit new leadership assessment
    async submitLeadershipAssessment(assessmentData) {
      try {
        console.log('💎 API: Submitting leadership assessment...', assessmentData);
        
        const response = await fetch(`${this.baseURL}/leadership/assessments`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(assessmentData)
        });
        return this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error submitting leadership assessment:', error);
        return { success: false, error: error.message };
      }
    },
  
    // Get leadership assessment details by ID
    async getLeadershipAssessmentDetails(assessmentId) {
      try {
        console.log('📋 API: Getting assessment details...', assessmentId);
        
        const response = await fetch(`${this.baseURL}/leadership/assessments/${assessmentId}`, {
          headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error getting assessment details:', error);
        return { success: false, error: error.message };
      }
    },
  
    // Get leadership metrics/analytics
    async getLeadershipMetrics(projectId = null) {
      try {
        const endpoint = projectId 
          ? `/leadership/metrics?project_id=${projectId}` 
          : '/leadership/metrics';
        console.log('📊 API: Getting leadership metrics...', endpoint);
        
        const response = await fetch(`${this.baseURL}${endpoint}`, {
          headers: this.getAuthHeaders()
        });
        return this.handleResponse(response);
      } catch (error) {
        console.error('❌ Error getting leadership metrics:', error);
        return { success: false, error: error.message, metrics: {} };
      }
    }
  };
  
  // Export the extensions
  export default leadershipAssessmentAPI;