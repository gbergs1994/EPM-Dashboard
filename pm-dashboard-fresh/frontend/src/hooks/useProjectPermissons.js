import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';
import aiService from '../services/aiService';
import apiService from '../services/apiService';

const Chatbot = ({ currentUser = null, currentProject = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentUser) {
      setMessages([{
        id: 1,
        sender: 'ai', 
        text: `Hi ${currentUser.name}! I'm your AI assistant. I can help you with project management, provide insights, and answer questions about your projects. ${currentProject ? `I can see you're working on "${currentProject.name}".` : ''}`,
        timestamp: new Date(),
        model: 'assistant'
      }]);
    } else {
      setMessages([]);
    }
  }, [currentUser, currentProject]);

  const formatMessage = (text) => {
    if (!text) return [];
    
    return text
      .replace(/([0-9/])\s*\*\*?\s*\n\s*\*\*?([0-9])/g, '$1$2')
      .replace(/(to)\s*\n\s*\*\*([0-9])\*\*/g, '$1 $2')
      .replace(/\*\*/g, '')
      .replace(/(\s)-(\s+[A-Z])/g, '$1•$2')
      .replace(/(•\s+)/g, '\n\n$1')
      .replace(/(\d+\.)\s+/g, '\n\n$1 ')
      .replace(/#{1,6}\s+/g, '\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .split('\n\n')
      .filter(para => para.trim())
      .map(para => {
        const trimmed = para.trim();
        
        if (trimmed.match(/^\d+\./)) {
          return { type: 'numbered', content: trimmed };
        }
        
        if (trimmed.startsWith('•')) {
          return { type: 'bullet', content: trimmed };
        }
        
        if (trimmed.endsWith(':')) {
          return { type: 'header', content: trimmed };
        }
        
        return { type: 'paragraph', content: trimmed };
      });
  };

  const renderFormattedContent = (paragraphs) => {
    return paragraphs.map((para, index) => {
      const content = para.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      switch (para.type) {
        case 'header':
          return (
            <div key={index} className="message-header" 
                 dangerouslySetInnerHTML={{ __html: content }} />
          );
        case 'numbered':
          return (
            <div key={index} className="message-numbered" 
                 dangerouslySetInnerHTML={{ __html: content }} />
          );
        case 'bullet':
          return (
            <div key={index} className="message-bullet" 
                 dangerouslySetInnerHTML={{ __html: content }} />
          );
        default:
          return (
            <p key={index} className="message-paragraph" 
               dangerouslySetInnerHTML={{ __html: content }} />
          );
      }
    });
  };

  const toggleChat = () => {
    if (!currentUser) return;
    setIsOpen(!isOpen);
    setError(null);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !currentUser) return;
  
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input.trim(),
      timestamp: new Date()
    };
  
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);
  
    try {
      const messageText = userMessage.text.toLowerCase();
      
      const isAllProjectsRequest = (
        messageText.includes('current projects') ||
        messageText.includes('all projects') ||
        messageText.includes('my projects') ||
        (messageText.includes('projects') && messageText.includes('summary'))
      );
      
      const isCareerGoalsRequest = (
        messageText.includes('career goal') ||
        messageText.includes('career development') ||
        messageText.includes('career progress') ||
        messageText.includes('goals') ||
        messageText.includes('skill development') ||
        messageText.includes('professional development') ||
        (messageText.includes('career') && (messageText.includes('track') || messageText.includes('plan')))
      );
      
      const isProjectInsightRequest = currentProject && (
        messageText.includes('analyze') ||
        messageText.includes('insight') ||
        messageText.includes('summary') ||
        messageText.includes('progress') ||
        messageText.includes('status') ||
        messageText.includes('how is') ||
        messageText.includes('what about') ||
        (messageText.includes('project') && (messageText.includes('doing') || messageText.includes('going')))
      );

      let response;
      
      if (isAllProjectsRequest) {
        const projectsResponse = await apiService.getProjects();
        if (projectsResponse.success && projectsResponse.data) {
          const projects = projectsResponse.data;
          let projectSummary = `You currently have ${projects.length} project(s):\n\n`;
          
          projects.forEach(project => {
            projectSummary += `**${project.name}**\n`;
            projectSummary += `Status: ${project.status || 'Unknown'}\n`;
            projectSummary += `Priority: ${project.priority || 'Unknown'}\n`;
            if (project.deadline) {
              projectSummary += `Deadline: ${new Date(project.deadline).toLocaleDateString()}\n`;
            }
            projectSummary += `PM Progress: ${project.pm_progress || 0}/7\n`;
            projectSummary += `Leadership Progress: ${project.leadership_progress || 0}/7\n\n`;
          });
          
          projectSummary += "Select a specific project to get detailed insights and analysis!";
          
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: projectSummary,
            timestamp: new Date(),
            model: 'database-projects',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);
        } else {
          throw new Error('Failed to fetch projects');
        }
      } else if (isCareerGoalsRequest) {
        const careerGoalsResponse = await apiService.getCareerGoals();
        if (careerGoalsResponse.success && careerGoalsResponse.data) {
          const goals = careerGoalsResponse.data;
          
          console.log('Career Goals Data Retrieved:', goals.length, 'goals');
          console.log('Goals Details:', goals);
          
          const careerContext = {
            user: {
              name: currentUser.name,
              role: currentUser.role,
              id: currentUser.id
            },
            careerGoals: goals.map(goal => ({
              title: goal.title,
              category: goal.category,
              currentLevel: goal.currentLevel,
              targetLevel: goal.targetLevel,
              status: goal.status,
              priority: goal.priority,
              progress: goal.progress,
              targetDate: goal.targetDate
            })),
            analysisType: 'career_insights',
            requestType: 'CAREER_ANALYSIS' 
          };
          
          console.log('Sending Career Context to AI:', careerContext);
          
          const aiPrompt = `Please analyze my career development goals and provide insights. Focus ONLY on career goals, not projects. My question was: "${userMessage.text}"`;
          
          response = await apiService.sendAIChat({
            message: aiPrompt,
            context: careerContext,
            projectId: null
          });
      
          if (response.success) {
            console.log('AI Career Response:', response.response.substring(0, 200) + '...');
            const aiMessage = {
              id: Date.now() + 1,
              sender: 'ai',
              text: response.response,
              timestamp: new Date(),
              model: response.model || 'ai-career-insights',
              tokensUsed: response.tokensUsed
            };
            setMessages([...newMessages, aiMessage]);
          } else {
            throw new Error(response.error || 'Failed to get career insights');
          }
        } else {
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: "You don't have any career goals set up yet. I'd recommend creating some goals to track your professional development! Career goals help you focus your growth and measure progress over time.",
            timestamp: new Date(),
            model: 'career-guidance',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);
        }
      } else if (isProjectInsightRequest) {
        response = await apiService.getProjectInsights(currentProject.id);
        
        if (response.success) {
          const insights = response.insights;
          let insightText = `**Insights for "${currentProject.name}"**\n\n`;
          insightText += `**Summary:** ${insights.summary}\n\n`;
          insightText += `**Project Metrics:**\n`;
          insightText += `- Status: ${insights.metrics.status}\n`;
          insightText += `- Priority: ${insights.metrics.priority}\n`;
          insightText += `- Team Size: ${insights.metrics.teamSize} members\n`;
          insightText += `- PM Progress: ${insights.metrics.progressScores.pm}/7\n`;
          insightText += `- Leadership Progress: ${insights.metrics.progressScores.leadership}/7\n`;
          insightText += `- Change Management: ${insights.metrics.progressScores.changeManagement}/7\n`;
          insightText += `- Career Development: ${insights.metrics.progressScores.careerDev}/7\n\n`;
          
          if (insights.metrics.avgFeedback) {
            insightText += `- Average Feedback Score: ${insights.metrics.avgFeedback}/7\n\n`;
          }
          
          insightText += `**Recommendations:**\n`;
          insightText += insights.recommendations.map(rec => `- ${rec}`).join('\n');
          
          if (insights.recentActivity && insights.recentActivity.length > 0) {
            insightText += `\n\n**Recent Activity:**\n`;
            insights.recentActivity.slice(0, 3).forEach(activity => {
              const date = new Date(activity.created_at).toLocaleDateString();
              insightText += `- ${activity.description} (${date})\n`;
            });
          }
          
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: insightText,
            timestamp: new Date(),
            model: 'database-insights',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);
        } else {
          throw new Error('Failed to get project insights');
        }
      } else {
        let careerGoalsData = null;
        try {
          const careerGoalsResponse = await apiService.getCareerGoals();
          if (careerGoalsResponse.success) {
            careerGoalsData = careerGoalsResponse.data;
          }
        } catch (error) {
          console.warn('Could not fetch career goals for context:', error);
        }
        
        const enhancedContext = {
          user: {
            name: currentUser.name,
            role: currentUser.role,
            id: currentUser.id
          },
          project: currentProject ? {
            id: currentProject.id,
            name: currentProject.name,
            status: currentProject.status,
            progress: currentProject.progress
          } : null,
          careerGoals: careerGoalsData ? careerGoalsData.map(goal => ({
            title: goal.title,
            category: goal.category,
            currentLevel: goal.currentLevel,
            targetLevel: goal.targetLevel,
            status: goal.status,
            priority: goal.priority
          })) : null,
          hasCurrentProject: !!currentProject,
          hasCareerGoals: !!(careerGoalsData && careerGoalsData.length > 0)
        };
        
        response = await apiService.sendAIChat({
          message: userMessage.text,
          context: enhancedContext,
          projectId: currentProject?.id || null
        });
    
        if (response.success) {
          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: response.response,
            timestamp: new Date(),
            model: response.model || 'ai-assistant',
            tokensUsed: response.tokensUsed
          };
          setMessages([...newMessages, aiMessage]);
        } else {
          throw new Error(response.error || 'Failed to get AI response');
        }
      }
  
    } catch (error) {
      console.error('AI Chat Error:', error);
      setError(error.message);
  
      const errorMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `I apologize, but I'm having trouble right now. ${error.message.includes('401') ? 'Please try logging out and back in.' : 'Please try again.'}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (!currentUser) return;
    
    setMessages([{
      id: 1,
      sender: 'ai',
      text: `Chat cleared! How else can I help you with your projects, ${currentUser.name}?`,
      timestamp: new Date()
    }]);
    setError(null);
  };

  const formatTimestamp = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  const getQuickActions = () => {
    if (!currentUser) return [];
    
    const actions = [
      'How can I improve my project management?',
      'What should I prioritize this week?',
      'Give me a summary of my current projects',
      'Show me my career development progress',
      'What career goals should I focus on?'
    ];

    if (currentProject) {
      actions.unshift(`Analyze the "${currentProject.name}" project`);
    }

    return actions.slice(0, 4);
  };

  const quickActions = getQuickActions();

  if (!currentUser) {
    return null;
  }

  return (
    <div className="chatbot-container">
      <button 
        className={`chat-toggle ${isOpen ? 'open' : ''}`} 
        onClick={toggleChat}
        title="AI Assistant"
      >
        {isLoading ? 'Loading...' : 'Ask AI For Help'}
      </button>
      
      {isOpen && (
        <div className="chatbox">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-title">
              <span className="ai-icon">🤖</span>
              <span>AI Assistant</span>
              {currentProject && (
                <span className="project-context">
                  {currentProject.name}
                </span>
              )}
            </div>
            <div className="chat-actions">
              <button onClick={clearChat} className="clear-button" title="Clear chat">
                Clear
              </button>
              <button onClick={() => setIsOpen(false)} className="close-button" title="Close chat">
                X
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="chat-error">
              <span className="error-icon">error</span>
              <span className="error-text">{error}</span>
              <button onClick={() => setError(null)} className="error-dismiss">X</button>
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.sender} ${msg.isError ? 'error' : ''}`}>
                <div className="message-content">
                  <div className="message-text">
                    {renderFormattedContent(formatMessage(msg.text))}
                  </div>
                  <div className="message-meta">
                    <span className="message-time">{formatTimestamp(msg.timestamp)}</span>
                    {msg.model && msg.model !== 'assistant' && (
                      <span className="message-model">{msg.model}</span>
                    )}
                    {msg.tokensUsed && (
                      <span className="message-tokens">{msg.tokensUsed} tokens</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="chat-message ai">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {quickActions.length > 0 && messages.length <= 2 && (
            <div className="quick-actions">
              <div className="quick-actions-title">Quick suggestions:</div>
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="quick-action-button"
                  onClick={() => setInput(action)}
                  disabled={isLoading}
                >
                  {action}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chat-input">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your projects..."
                disabled={isLoading}
              />
              <button 
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="send-button"
              >
                {isLoading ? '...' : '✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;