import React, { useState, useRef, useEffect } from 'react';
import aiService from '../../services/ai/aiService';
import './AIChat.css';

const AIChat = ({ projectId = null, onClose }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. How can I help you with your projects today?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await aiService.sendChatMessage(userMessage.content, {
        projectId
      });

      if (response.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: response.response,
          timestamp: new Date(),
          model: response.model
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(response.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      setError(error.message);
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again in a moment.',
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: 'Chat cleared. How can I help you?',
        timestamp: new Date()
      }
    ]);
    setError(null);
  };

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <span>🤖</span>
          <h3>AI Assistant</h3>
          {projectId && <span className="project-badge">Project Context</span>}
        </div>
        <div className="ai-chat-actions">
          <button onClick={clearChat} className="clear-btn" title="Clear chat">
            🗑️
          </button>
          {onClose && (
            <button onClick={onClose} className="close-button" title="Close">
              ✕
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="ai-chat-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      <div className="ai-chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}-message ${message.isError ? 'error' : ''}`}>
            <div className="message-content">
              <div className="message-text">{message.content}</div>
              <div className="message-meta">
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                </span>
                {message.model && (
                  <span className="message-model">{message.model}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="ai-chat-input-form">
        <div className="input-wrapper">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask me anything about your projects..."
            className="message-input"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="send-button"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIChat;
