import apiService from '../apiService';

class AIService {
  constructor() {
    this.baseURL = '/api/ai';
  }

  async sendChatMessage(message, context = {}) {
    try {
      const response = await apiService.post(`${this.baseURL}/chat`, {
        message,
        context: context.context || null,
        projectId: context.projectId || null
      });
      return response.data;
    } catch (error) {
      console.error('AI chat error:', error);
      throw new Error(error.response?.data?.error || 'Failed to send message to AI');
    }
  }

  async getProjectInsights(projectId) {
    try {
      const response = await apiService.get(`${this.baseURL}/insights/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Project insights error:', error);
      throw new Error(error.response?.data?.error || 'Failed to get project insights');
    }
  }

  async checkHealth() {
    try {
      const response = await apiService.get(`${this.baseURL}/health`);
      return response.data;
    } catch (error) {
      console.warn('AI service health check failed:', error);
      return { success: false, error: 'AI service unavailable' };
    }
  }
}

export default new AIService();
