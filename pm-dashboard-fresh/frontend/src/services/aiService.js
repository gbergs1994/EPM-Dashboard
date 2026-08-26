import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

class AIService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api/ai`,
      timeout: 30000, 
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async sendChatMessage(message, context = null) {
    try {
      const response = await this.api.post('/chat', {
        message,
        context
      });
      return response.data;
    } catch (error) {
      console.error('AI chat error:', error);
      throw new Error('Failed to send message to AI');
    }
  }

  async processDocument(file) {
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await this.api.post('/process-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Document processing error:', error);
      throw new Error('Failed to process document');
    }
  }

  async getProjectInsights(projectId) {
    try {
      const response = await this.api.get(`/insights/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('Project insights error:', error);
      throw new Error('Failed to get project insights');
    }
  }
}

export default new AIService();