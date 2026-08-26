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
        (messageText.includes('career development') && !messageText.includes('team')) ||
        (messageText.includes('career progress') && !messageText.includes('assessment')) ||
        (messageText.includes('goals') && !messageText.includes('leadership') && !messageText.includes('team')) ||
        messageText.includes('skill development') ||
        (messageText.includes('professional development') && !messageText.includes('leadership')) ||
        (messageText.includes('career') && (messageText.includes('track') || messageText.includes('plan')) && !messageText.includes('assessment'))
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

      // NEW: Check for specific project name in the message
      const isSpecificProjectRequest = (
        messageText.includes('analyze') ||
        messageText.includes('insight') ||
        messageText.includes('summary') ||
        messageText.includes('progress') ||
        messageText.includes('status')
      ) && messageText.includes('project');

      // NEW: Check for team-wide assessment analysis requests
      const isTeamAssessmentRequest = (
        // Combined assessment requests (both leadership and change management)
        (messageText.includes('team') && messageText.includes('assessment') && 
         (messageText.includes('both') || messageText.includes('all') || 
          (!messageText.includes('leadership') && !messageText.includes('change')))) ||
        (messageText.includes('overall') && messageText.includes('assessment')) ||
        (messageText.includes('how is the team') || messageText.includes('team performance') || messageText.includes('team progress'))
      );

      // NEW: Leadership-only assessment requests
      const isLeadershipOnlyRequest = (
        (messageText.includes('leadership') && messageText.includes('assessment')) ||
        (messageText.includes('my leadership') && messageText.includes('assessment')) ||
        (messageText.includes('tell me about') && messageText.includes('leadership') && !messageText.includes('change')) ||
        (messageText.includes('show me') && messageText.includes('leadership') && !messageText.includes('change')) ||
        messageText.includes('team leadership') ||
        (messageText.includes('leadership') && messageText.includes('progress') && !messageText.includes('change'))
      );

      // NEW: Change management-only assessment requests  
      const isChangeManagementOnlyRequest = (
        (messageText.includes('change management') && messageText.includes('assessment')) ||
        (messageText.includes('organizational change') && messageText.includes('assessment')) ||
        (messageText.includes('tell me about') && messageText.includes('change') && !messageText.includes('leadership')) ||
        (messageText.includes('show me') && messageText.includes('change') && !messageText.includes('leadership'))
      );

      let response;
      
      if (isAllProjectsRequest) {
        const projectsResponse = await apiService.getAllProjects();
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
      } else if (isLeadershipOnlyRequest) {
        // NEW: Handle leadership-only assessment analysis with actionable insights
        try {
          console.log('👑 Fetching leadership-only assessment analysis...');
          
          const [teamLeadershipData, allProjectsData] = await Promise.all([
            apiService.getLeadershipAssessments(), // All team leadership assessments
            apiService.getAllProjects() // All projects for context
          ]);

          console.log('📊 Leadership data fetched:', {
            leadership: teamLeadershipData.success,
            projects: allProjectsData.success
          });

          if (!teamLeadershipData.success || !teamLeadershipData.assessments || teamLeadershipData.assessments.length === 0) {
            const aiMessage = {
              id: Date.now() + 1,
              sender: 'ai',
              text: "No leadership assessments have been completed yet. I recommend starting with leadership assessments across your active projects to establish baseline metrics and identify development opportunities.",
              timestamp: new Date(),
              model: 'leadership-guidance',
              tokensUsed: 0
            };
            setMessages([...newMessages, aiMessage]);
            return;
          }

          const assessments = teamLeadershipData.assessments;
          let analysisText = `**Leadership Assessment Analysis**\n\n`;

          // Calculate comprehensive leadership metrics
          const leadershipFields = ['vision_score', 'reality_score', 'ethics_score', 'courage_score'];
          const projectGroups = {};
          const totals = { vision_score: 0, reality_score: 0, ethics_score: 0, courage_score: 0 };
          let totalCount = 0;
          let recentAssessments = [];

          // Group assessments by project and calculate totals
          assessments.forEach(assessment => {
            if (assessment) {
              const projectId = assessment.project_id || 'general';
              if (!projectGroups[projectId]) {
                projectGroups[projectId] = [];
              }
              projectGroups[projectId].push(assessment);

              leadershipFields.forEach(field => {
                const score = parseFloat(assessment[field] || 0);
                if (score > 0) {
                  totals[field] += score;
                }
              });
              totalCount++;

              // Track recent assessments (last 30 days)
              const assessmentDate = new Date(assessment.created_at);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              if (assessmentDate > thirtyDaysAgo) {
                recentAssessments.push(assessment);
              }
            }
          });

          // Calculate averages
          const averages = {};
          leadershipFields.forEach(field => {
            averages[field] = totalCount > 0 ? totals[field] / totalCount : 0;
          });
          const overallAverage = Object.values(averages).reduce((sum, val) => sum + val, 0) / leadershipFields.length;

          // Overall Leadership Summary
          analysisText += `**Leadership Performance Overview:**\n`;
          analysisText += `• Total Leadership Assessments: ${totalCount}\n`;
          analysisText += `• Recent Activity: ${recentAssessments.length} assessment${recentAssessments.length !== 1 ? 's' : ''} in last 30 days\n`;
          analysisText += `• **Overall Leadership Score: ${overallAverage.toFixed(1)}/7**\n\n`;

          // Detailed dimension analysis
          analysisText += `**Leadership Dimension Breakdown:**\n`;
          analysisText += `• Vision: ${averages.vision_score.toFixed(1)}/7\n`;
          analysisText += `• Reality: ${averages.reality_score.toFixed(1)}/7\n`;
          analysisText += `• Ethics: ${averages.ethics_score.toFixed(1)}/7\n`;
          analysisText += `• Courage: ${averages.courage_score.toFixed(1)}/7\n\n`;

          // Identify strengths and development areas
          const dimensionAnalysis = [
            { name: 'Vision', score: averages.vision_score, description: 'creating compelling direction' },
            { name: 'Reality', score: averages.reality_score, description: 'data-driven decision making' },
            { name: 'Ethics', score: averages.ethics_score, description: 'integrity and fairness' },
            { name: 'Courage', score: averages.courage_score, description: 'difficult decisions and risk-taking' }
          ].sort((a, b) => b.score - a.score);

          analysisText += `**Leadership Strengths & Development Areas:**\n`;
          analysisText += `🏆 **Strongest Area:** ${dimensionAnalysis[0].name} (${dimensionAnalysis[0].score.toFixed(1)}/7) - ${dimensionAnalysis[0].description}\n`;
          analysisText += `📈 **Primary Development Focus:** ${dimensionAnalysis[3].name} (${dimensionAnalysis[3].score.toFixed(1)}/7) - ${dimensionAnalysis[3].description}\n\n`;

          // Initialize projectScores array in broader scope
          let projectScores = [];

          // Project-specific analysis with actionable insights
          if (allProjectsData.success && allProjectsData.data) {
            const projects = allProjectsData.data;
            analysisText += `**Project Leadership Analysis:**\n`;

            projects.forEach(project => {
              const projectAssessments = projectGroups[project.id] || [];
              if (projectAssessments.length > 0) {
                // Calculate project average
                const projectTotals = { vision_score: 0, reality_score: 0, ethics_score: 0, courage_score: 0 };
                projectAssessments.forEach(assessment => {
                  leadershipFields.forEach(field => {
                    projectTotals[field] += parseFloat(assessment[field] || 0);
                  });
                });

                const projectAvg = Object.values(projectTotals).reduce((sum, val) => sum + val, 0) / (leadershipFields.length * projectAssessments.length);
                projectScores.push({
                  name: project.name,
                  score: projectAvg,
                  assessmentCount: projectAssessments.length,
                  status: project.status,
                  priority: project.priority
                });
              }
            });

            // Sort projects by leadership score
            projectScores.sort((a, b) => b.score - a.score);

            if (projectScores.length > 0) {
              analysisText += `*Projects Ranked by Leadership Performance:*\n`;
              projectScores.forEach((project, index) => {
                const indicator = index === 0 ? '🟢' : 
                                index === projectScores.length - 1 && projectScores.length > 1 ? '🔴' : '🟡';
                analysisText += `${indicator} ${project.name}: ${project.score.toFixed(1)}/7 (${project.assessmentCount} assessment${project.assessmentCount !== 1 ? 's' : ''})\n`;
              });
              analysisText += `\n`;

              // Identify projects needing attention
              const needsAttention = projectScores.filter(p => p.score < overallAverage - 0.3);
              const highPriorityNeeds = needsAttention.filter(p => p.priority === 'high' || p.status === 'at_risk');

              if (highPriorityNeeds.length > 0) {
                analysisText += `🚨 **High Priority Leadership Focus:** ${highPriorityNeeds[0].name} (Score: ${highPriorityNeeds[0].score.toFixed(1)}/7)\n`;
              } else if (needsAttention.length > 0) {
                analysisText += `⚠️ **Leadership Attention Needed:** ${needsAttention[0].name} (Score: ${needsAttention[0].score.toFixed(1)}/7)\n`;
              }
            }

            // Find projects missing leadership assessments
            const projectsWithoutAssessments = projects.filter(p => !projectGroups[p.id] || projectGroups[p.id].length === 0);
            if (projectsWithoutAssessments.length > 0) {
              analysisText += `📋 **Missing Leadership Assessments:** ${projectsWithoutAssessments.map(p => p.name).join(', ')}\n`;
            }
            analysisText += `\n`;
          }

          // Actionable recommendations based on data
          analysisText += `**Strategic Leadership Recommendations:**\n`;

          // Overall performance recommendations
          if (overallAverage >= 6) {
            analysisText += `• **Excellence Maintenance**: Your leadership scores are excellent! Focus on mentoring others and sharing best practices\n`;
          } else if (overallAverage >= 5) {
            analysisText += `• **Refinement Focus**: Strong leadership foundation. Target specific dimensions for breakthrough performance\n`;
          } else if (overallAverage >= 4) {
            analysisText += `• **Development Priority**: Systematic leadership development needed to reach high-performance levels\n`;
          } else {
            analysisText += `• **Urgent Development**: Consider comprehensive leadership coaching or training programs\n`;
          }

          // Specific dimension recommendations
          if (averages.vision_score < 4) {
            analysisText += `• **Vision Development**: Work on articulating clearer, more compelling project visions and strategic direction\n`;
          }
          if (averages.reality_score < 4) {
            analysisText += `• **Data-Driven Leadership**: Strengthen analytical skills and evidence-based decision making\n`;
          }
          if (averages.ethics_score < 4) {
            analysisText += `• **Integrity Focus**: Emphasize transparent communication and consistent ethical decision-making\n`;
          }
          if (averages.courage_score < 4) {
            analysisText += `• **Courage Building**: Practice making difficult decisions and taking calculated risks\n`;
          }

          // Project-specific recommendations
          if (projectScores.length > 0) {
            const lowestProject = projectScores[projectScores.length - 1];
            if (lowestProject.score < overallAverage - 0.5) {
              analysisText += `• **Project Focus**: "${lowestProject.name}" needs immediate leadership attention - consider additional support or resources\n`;
            }

            const gapBetweenBestWorst = projectScores[0].score - projectScores[projectScores.length - 1].score;
            if (gapBetweenBestWorst > 1.5) {
              analysisText += `• **Consistency Improvement**: Large performance gap between projects - standardize leadership approaches\n`;
            }
          }

          // Recent activity insights
          if (recentAssessments.length === 0) {
            analysisText += `• **Assessment Frequency**: No recent assessments completed - schedule regular leadership evaluations\n`;
          } else if (recentAssessments.length < totalCount * 0.3) {
            analysisText += `• **Assessment Cadence**: Consider more frequent leadership assessments to track progress\n`;
          }

          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: analysisText,
            timestamp: new Date(),
            model: 'leadership-insights',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);

        } catch (error) {
          console.error('Error in leadership assessment analysis:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: `I had trouble analyzing leadership assessment data: ${error.message}. Please try again.`,
            timestamp: new Date(),
            isError: true
          };
          setMessages([...newMessages, errorMessage]);
        }
      } else if (isChangeManagementOnlyRequest) {
        // NEW: Handle change management-only assessment analysis with actionable insights
        try {
          console.log('🔄 Fetching organizational change management-only assessment analysis...');
          
          const [teamOrgChangeData, allProjectsData] = await Promise.all([
            apiService.getOrganizationalChangeAssessments(), // All team org change assessments
            apiService.getAllProjects() // All projects for context
          ]);

          console.log('📊 Organizational change management data fetched:', {
            orgChange: teamOrgChangeData.success,
            projects: allProjectsData.success
          });

          if (!teamOrgChangeData.success || !teamOrgChangeData.assessments || teamOrgChangeData.assessments.length === 0) {
            const aiMessage = {
              id: Date.now() + 1,
              sender: 'ai',
              text: "No organizational change management assessments have been completed yet. I recommend conducting organizational change readiness assessments to understand how well your team adapts to organizational changes and manages transformation initiatives.",
              timestamp: new Date(),
              model: 'organizational-change-management-guidance',
              tokensUsed: 0
            };
            setMessages([...newMessages, aiMessage]);
            return;
          }

          const assessments = teamOrgChangeData.assessments;
          let analysisText = `**Organizational Change Management Assessment Analysis**\n\n`;

          // Calculate comprehensive organizational change management metrics
          const changeFields = ['vision_score', 'alignment_score', 'understanding_score', 'enactment_score'];
          const projectGroups = {};
          const totals = { vision_score: 0, alignment_score: 0, understanding_score: 0, enactment_score: 0 };
          let totalCount = 0;
          let recentAssessments = [];

          // Group assessments by project and calculate totals
          assessments.forEach(assessment => {
            if (assessment) {
              const projectId = assessment.project_id || 'general';
              if (!projectGroups[projectId]) {
                projectGroups[projectId] = [];
              }
              projectGroups[projectId].push(assessment);

              changeFields.forEach(field => {
                const score = parseFloat(assessment[field] || 0);
                if (score > 0) {
                  totals[field] += score;
                }
              });
              totalCount++;

              // Track recent assessments (last 30 days)
              const assessmentDate = new Date(assessment.created_at);
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              if (assessmentDate > thirtyDaysAgo) {
                recentAssessments.push(assessment);
              }
            }
          });

          // Calculate averages
          const averages = {};
          changeFields.forEach(field => {
            averages[field] = totalCount > 0 ? totals[field] / totalCount : 0;
          });
          const overallAverage = Object.values(averages).reduce((sum, val) => sum + val, 0) / changeFields.length;

          // Overall Organizational Change Management Summary
          analysisText += `**Organizational Change Management Performance Overview:**\n`;
          analysisText += `• Total Organizational Change Assessments: ${totalCount}\n`;
          analysisText += `• Recent Activity: ${recentAssessments.length} assessment${recentAssessments.length !== 1 ? 's' : ''} in last 30 days\n`;
          analysisText += `• **Overall Organizational Change Readiness Score: ${overallAverage.toFixed(1)}/7**\n\n`;

          // Detailed dimension analysis
          analysisText += `**Organizational Change Management Dimension Breakdown:**\n`;
          analysisText += `• Vision: ${averages.vision_score.toFixed(1)}/7\n`;
          analysisText += `• Alignment: ${averages.alignment_score.toFixed(1)}/7\n`;
          analysisText += `• Understanding: ${averages.understanding_score.toFixed(1)}/7\n`;
          analysisText += `• Enactment: ${averages.enactment_score.toFixed(1)}/7\n\n`;

          // Identify strengths and development areas
          const dimensionAnalysis = [
            { name: 'Vision', score: averages.vision_score, description: 'inspiring organizational change direction' },
            { name: 'Alignment', score: averages.alignment_score, description: 'organizational support systems' },
            { name: 'Understanding', score: averages.understanding_score, description: 'stakeholder perspectives and resistance' },
            { name: 'Enactment', score: averages.enactment_score, description: 'translating vision into action' }
          ].sort((a, b) => b.score - a.score);

          analysisText += `**Organizational Change Management Strengths & Development Areas:**\n`;
          analysisText += `🏆 **Strongest Area:** ${dimensionAnalysis[0].name} (${dimensionAnalysis[0].score.toFixed(1)}/7) - ${dimensionAnalysis[0].description}\n`;
          analysisText += `📈 **Primary Development Focus:** ${dimensionAnalysis[3].name} (${dimensionAnalysis[3].score.toFixed(1)}/7) - ${dimensionAnalysis[3].description}\n\n`;

          // Initialize projectScores array in broader scope
          let projectScores = [];

          // Project-specific analysis with actionable insights
          if (allProjectsData.success && allProjectsData.data) {
            const projects = allProjectsData.data;
            analysisText += `**Project Organizational Change Management Analysis:**\n`;

            projects.forEach(project => {
              const projectAssessments = projectGroups[project.id] || [];
              if (projectAssessments.length > 0) {
                // Calculate project average
                const projectTotals = { vision_score: 0, alignment_score: 0, understanding_score: 0, enactment_score: 0 };
                projectAssessments.forEach(assessment => {
                  changeFields.forEach(field => {
                    projectTotals[field] += parseFloat(assessment[field] || 0);
                  });
                });

                const projectAvg = Object.values(projectTotals).reduce((sum, val) => sum + val, 0) / (changeFields.length * projectAssessments.length);
                projectScores.push({
                  name: project.name,
                  score: projectAvg,
                  assessmentCount: projectAssessments.length,
                  status: project.status,
                  priority: project.priority
                });
              }
            });

            // Sort projects by organizational change management score
            projectScores.sort((a, b) => b.score - a.score);

            if (projectScores.length > 0) {
              analysisText += `*Projects Ranked by Organizational Change Management Performance:*\n`;
              projectScores.forEach((project, index) => {
                const indicator = index === 0 ? '🟢' : 
                                index === projectScores.length - 1 && projectScores.length > 1 ? '🔴' : '🟡';
                analysisText += `${indicator} ${project.name}: ${project.score.toFixed(1)}/7 (${project.assessmentCount} assessment${project.assessmentCount !== 1 ? 's' : ''})\n`;
              });
              analysisText += `\n`;

              // Identify projects needing attention
              const needsAttention = projectScores.filter(p => p.score < overallAverage - 0.3);
              const highPriorityNeeds = needsAttention.filter(p => p.priority === 'high' || p.status === 'at_risk');

              if (highPriorityNeeds.length > 0) {
                analysisText += `🚨 **High Priority Organizational Change Focus:** ${highPriorityNeeds[0].name} (Score: ${highPriorityNeeds[0].score.toFixed(1)}/7)\n`;
              } else if (needsAttention.length > 0) {
                analysisText += `⚠️ **Organizational Change Management Attention Needed:** ${needsAttention[0].name} (Score: ${needsAttention[0].score.toFixed(1)}/7)\n`;
              }
            }

            // Find projects missing organizational change management assessments
            const projectsWithoutAssessments = projects.filter(p => !projectGroups[p.id] || projectGroups[p.id].length === 0);
            if (projectsWithoutAssessments.length > 0) {
              analysisText += `📋 **Missing Organizational Change Management Assessments:** ${projectsWithoutAssessments.map(p => p.name).join(', ')}\n`;
            }
            analysisText += `\n`;
          }

          // Actionable recommendations based on data
          analysisText += `**Strategic Organizational Change Management Recommendations:**\n`;

          // Overall performance recommendations
          if (overallAverage >= 6) {
            analysisText += `• **Organizational Change Excellence**: Outstanding organizational change management capabilities! Consider leading organizational transformation initiatives\n`;
          } else if (overallAverage >= 5) {
            analysisText += `• **Organizational Change Maturity**: Strong organizational change management foundation. Focus on advanced organizational change leadership techniques\n`;
          } else if (overallAverage >= 4) {
            analysisText += `• **Organizational Change Development**: Systematic improvement needed in organizational change management practices\n`;
          } else {
            analysisText += `• **Organizational Change Management Priority**: Consider comprehensive organizational change management training and support\n`;
          }

          // Specific dimension recommendations
          if (averages.vision_score < 4) {
            analysisText += `• **Vision Development**: Strengthen ability to create and communicate compelling organizational change visions\n`;
          }
          if (averages.alignment_score < 4) {
            analysisText += `• **System Alignment**: Improve organizational structures and processes to support organizational change initiatives\n`;
          }
          if (averages.understanding_score < 4) {
            analysisText += `• **Stakeholder Focus**: Develop deeper understanding of resistance patterns and stakeholder concerns in organizational change\n`;
          }
          if (averages.enactment_score < 4) {
            analysisText += `• **Execution Excellence**: Strengthen ability to translate organizational change vision into concrete actions and results\n`;
          }

          // Project-specific recommendations
          if (projectScores.length > 0) {
            const lowestProject = projectScores[projectScores.length - 1];
            if (lowestProject.score < overallAverage - 0.5) {
              analysisText += `• **Project Focus**: "${lowestProject.name}" needs immediate organizational change management support - consider change champions or additional resources\n`;
            }

            const gapBetweenBestWorst = projectScores[0].score - projectScores[projectScores.length - 1].score;
            if (gapBetweenBestWorst > 1.5) {
              analysisText += `• **Organizational Change Consistency**: Large performance gap between projects - standardize organizational change management approaches\n`;
            }
          }

          // Recent activity insights
          if (recentAssessments.length === 0) {
            analysisText += `• **Assessment Frequency**: No recent organizational change assessments completed - schedule regular organizational change readiness evaluations\n`;
          } else if (recentAssessments.length < totalCount * 0.3) {
            analysisText += `• **Assessment Cadence**: Consider more frequent organizational change management assessments to monitor progress\n`;
          }

          // Organizational change-specific insights
          if (averages.vision_score > averages.enactment_score + 1) {
            analysisText += `• **Vision-Execution Gap**: Strong organizational change vision but weak execution - focus on implementation planning and follow-through\n`;
          }
          if (averages.understanding_score > averages.alignment_score + 1) {
            analysisText += `• **Understanding-Support Gap**: Good stakeholder insight but poor system support - align organizational processes with change needs\n`;
          }

          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: analysisText,
            timestamp: new Date(),
            model: 'organizational-change-management-insights',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);

        } catch (error) {
          console.error('Error in organizational change management assessment analysis:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: `I had trouble analyzing organizational change management assessment data: ${error.message}. Please try again.`,
            timestamp: new Date(),
            isError: true
          };
          setMessages([...newMessages, errorMessage]);
        }
      } else if (isTeamAssessmentRequest) {
        // NEW: Handle team-wide assessment analysis
        try {
          console.log('👥 Fetching team-wide assessment analysis...');
          
          const [teamLeadershipData, teamOrgChangeData, allProjectsData] = await Promise.all([
            apiService.getLeadershipAssessments(), // All team leadership assessments
            apiService.getOrganizationalChangeAssessments(), // All team org change assessments
            apiService.getAllProjects() // All projects for context
          ]);

          console.log('📊 Team-wide data fetched:', {
            leadership: teamLeadershipData.success,
            orgChange: teamOrgChangeData.success,
            projects: allProjectsData.success
          });

          let analysisText = `**Team-Wide Assessment Analysis**\n\n`;
          
          // Helper function to calculate comprehensive team metrics
          const calculateTeamMetrics = (assessments, scoreFields, assessmentType) => {
            if (!assessments || assessments.length === 0) {
              return { hasData: false };
            }

            // Group by project for project-level analysis
            const projectGroups = {};
            const totals = scoreFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
            let totalCount = 0;

            assessments.forEach(assessment => {
              if (assessment) {
                const projectId = assessment.project_id || 'general';
                if (!projectGroups[projectId]) {
                  projectGroups[projectId] = [];
                }
                projectGroups[projectId].push(assessment);

                scoreFields.forEach(field => {
                  const score = parseFloat(assessment[field] || 0);
                  if (score > 0) {
                    totals[field] += score;
                  }
                });
                totalCount++;
              }
            });

            const averages = {};
            scoreFields.forEach(field => {
              averages[field] = totalCount > 0 ? totals[field] / totalCount : 0;
            });

            const overallAverage = Object.values(averages).reduce((sum, val) => sum + val, 0) / scoreFields.length;

            return {
              hasData: true,
              averages,
              overallAverage,
              totalAssessments: totalCount,
              projectGroups,
              assessmentType
            };
          };

          // Analyze leadership assessments
          const leadershipFields = ['vision_score', 'reality_score', 'ethics_score', 'courage_score'];
          const leadershipMetrics = calculateTeamMetrics(
            teamLeadershipData.success ? teamLeadershipData.assessments : [],
            leadershipFields,
            'Leadership'
          );

          // Analyze organizational change assessments
          const orgChangeFields = ['vision_score', 'alignment_score', 'understanding_score', 'enactment_score'];
          const orgChangeMetrics = calculateTeamMetrics(
            teamOrgChangeData.success ? teamOrgChangeData.assessments : [],
            orgChangeFields,
            'Organizational Change'
          );

          // Leadership Analysis Section
          analysisText += `**Team Leadership Assessment Overview:**\n`;
          if (leadershipMetrics.hasData) {
            analysisText += `• Total Leadership Assessments: ${leadershipMetrics.totalAssessments}\n`;
            analysisText += `• Vision (Leadership): ${leadershipMetrics.averages.vision_score.toFixed(1)}/7\n`;
            analysisText += `• Reality: ${leadershipMetrics.averages.reality_score.toFixed(1)}/7\n`;
            analysisText += `• Ethics: ${leadershipMetrics.averages.ethics_score.toFixed(1)}/7\n`;
            analysisText += `• Courage: ${leadershipMetrics.averages.courage_score.toFixed(1)}/7\n`;
            analysisText += `• **Team Leadership Average: ${leadershipMetrics.overallAverage.toFixed(1)}/7**\n\n`;

            // Find strongest and weakest leadership areas
            const leadScores = leadershipMetrics.averages;
            const leadEntries = Object.entries(leadScores).map(([key, value]) => ({ 
              area: key.replace('_score', '').charAt(0).toUpperCase() + key.replace('_score', '').slice(1), 
              score: value 
            }));
            leadEntries.sort((a, b) => b.score - a.score);
            
            analysisText += `*Leadership Strengths:* ${leadEntries[0].area} (${leadEntries[0].score.toFixed(1)}/7)\n`;
            analysisText += `*Growth Area:* ${leadEntries[leadEntries.length - 1].area} (${leadEntries[leadEntries.length - 1].score.toFixed(1)}/7)\n\n`;
          } else {
            analysisText += `• No leadership assessments completed yet\n\n`;
          }

          // Organizational Change Analysis Section
          analysisText += `**Team Change Management Assessment Overview:**\n`;
          if (orgChangeMetrics.hasData) {
            analysisText += `• Total Change Assessments: ${orgChangeMetrics.totalAssessments}\n`;
            analysisText += `• Vision (Change): ${orgChangeMetrics.averages.vision_score.toFixed(1)}/7\n`;
            analysisText += `• Alignment: ${orgChangeMetrics.averages.alignment_score.toFixed(1)}/7\n`;
            analysisText += `• Understanding: ${orgChangeMetrics.averages.understanding_score.toFixed(1)}/7\n`;
            analysisText += `• Enactment: ${orgChangeMetrics.averages.enactment_score.toFixed(1)}/7\n`;
            analysisText += `• **Team Change Management Average: ${orgChangeMetrics.overallAverage.toFixed(1)}/7**\n\n`;

            // Find strongest and weakest change areas
            const changeScores = orgChangeMetrics.averages;
            const changeEntries = Object.entries(changeScores).map(([key, value]) => ({ 
              area: key.replace('_score', '').charAt(0).toUpperCase() + key.replace('_score', '').slice(1), 
              score: value 
            }));
            changeEntries.sort((a, b) => b.score - a.score);
            
            analysisText += `*Change Strengths:* ${changeEntries[0].area} (${changeEntries[0].score.toFixed(1)}/7)\n`;
            analysisText += `*Development Area:* ${changeEntries[changeEntries.length - 1].area} (${changeEntries[changeEntries.length - 1].score.toFixed(1)}/7)\n\n`;
          } else {
            analysisText += `• No change management assessments completed yet\n\n`;
          }

          // Project-specific breakdown if we have project data
          if (allProjectsData.success && allProjectsData.data && allProjectsData.data.length > 0) {
            const projects = allProjectsData.data;
            analysisText += `**Assessment Distribution Across Projects:**\n`;
            
            projects.forEach(project => {
              const projectLeadership = leadershipMetrics.hasData ? 
                (leadershipMetrics.projectGroups[project.id] || []).length : 0;
              const projectChange = orgChangeMetrics.hasData ? 
                (orgChangeMetrics.projectGroups[project.id] || []).length : 0;
              
              if (projectLeadership > 0 || projectChange > 0) {
                analysisText += `• ${project.name}: ${projectLeadership} leadership, ${projectChange} change assessments\n`;
              }
            });
            analysisText += `\n`;
          }

          // Team recommendations
          analysisText += `**Team Development Recommendations:**\n`;
          
          if (leadershipMetrics.hasData && orgChangeMetrics.hasData) {
            const combinedAverage = (leadershipMetrics.overallAverage + orgChangeMetrics.overallAverage) / 2;
            analysisText += `• **Overall Team Assessment Score: ${combinedAverage.toFixed(1)}/7**\n`;
            
            if (combinedAverage >= 6) {
              analysisText += `• Excellent performance! Focus on maintaining high standards and mentoring other teams\n`;
            } else if (combinedAverage >= 4.5) {
              analysisText += `• Strong performance with room for targeted improvements\n`;
            } else {
              analysisText += `• Consider comprehensive development programs to improve assessment scores\n`;
            }
          }

          if (leadershipMetrics.hasData && leadershipMetrics.overallAverage < 4) {
            analysisText += `• **Leadership Development Priority**: Consider leadership training or coaching programs\n`;
          }

          if (orgChangeMetrics.hasData && orgChangeMetrics.overallAverage < 4) {
            analysisText += `• **Change Management Focus**: Implement change management best practices and training\n`;
          }

          if (leadershipMetrics.hasData && orgChangeMetrics.hasData) {
            const diff = Math.abs(leadershipMetrics.overallAverage - orgChangeMetrics.overallAverage);
            if (diff > 1) {
              const stronger = leadershipMetrics.overallAverage > orgChangeMetrics.overallAverage ? 'leadership' : 'change management';
              const weaker = stronger === 'leadership' ? 'change management' : 'leadership';
              analysisText += `• **Balance Focus**: Strong ${stronger} but ${weaker} needs development for well-rounded capabilities\n`;
            }
          }

          const aiMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: analysisText,
            timestamp: new Date(),
            model: 'team-assessment-analysis',
            tokensUsed: 0
          };
          setMessages([...newMessages, aiMessage]);

        } catch (error) {
          console.error('Error in team assessment analysis:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: `I had trouble analyzing team assessment data: ${error.message}. Please try again.`,
            timestamp: new Date(),
            isError: true
          };
          setMessages([...newMessages, errorMessage]);
        }
      } else if (isSpecificProjectRequest) {
        // NEW: Handle specific project analysis by extracting project name from message
        try {
          // First get all projects to find the one mentioned in the message
          const allProjectsResponse = await apiService.getAllProjects();
          if (allProjectsResponse.success && allProjectsResponse.data) {
            const allProjects = allProjectsResponse.data;
            
            // Find project mentioned in the message
            let targetProject = null;
            for (const project of allProjects) {
              if (messageText.includes(project.name.toLowerCase())) {
                targetProject = project;
                break;
              }
            }
            
            if (targetProject) {
              console.log(`🎯 Found specific project: ${targetProject.name} (ID: ${targetProject.id})`);
              
              // Get comprehensive project data including assessments
              console.log('📊 Fetching comprehensive project analysis with team-wide data...');
              
              try {
                // Fetch all project-related data AND team-wide data concurrently
                const [
                  projectInsights, 
                  projectLeadershipData, 
                  projectOrgChangeData,
                  teamLeadershipData,
                  teamOrgChangeData
                ] = await Promise.all([
                  apiService.getProjectInsights(targetProject.id),
                  apiService.getLeadershipAssessments({ project_id: targetProject.id }),
                  apiService.getOrganizationalChangeAssessments(targetProject.id),
                  apiService.getLeadershipAssessments(), // All team leadership assessments
                  apiService.getOrganizationalChangeAssessments() // All team org change assessments
                ]);

                console.log('📊 Comprehensive data fetched:', {
                  projectInsights: projectInsights.success,
                  projectLeadership: projectLeadershipData.success,
                  projectOrgChange: projectOrgChangeData.success,
                  teamLeadership: teamLeadershipData.success,
                  teamOrgChange: teamOrgChangeData.success
                });

                if (projectInsights.success) {
                  const insights = projectInsights.insights;
                  let insightText = `**Comprehensive Analysis for "${targetProject.name}"**\n\n`;
                  
                  // Basic project info
                  insightText += `**Project Overview:**\n`;
                  insightText += `• Status: ${insights.metrics.status}\n`;
                  insightText += `• Priority: ${insights.metrics.priority}\n`;
                  insightText += `• Team Size: ${insights.metrics.teamSize} members\n`;
                  insightText += `• PM Progress: ${insights.metrics.progressScores.pm}/7\n\n`;
                  
                  // Helper function to calculate assessment averages
                  const calculateAssessmentAverages = (assessments, scoreFields) => {
                    if (!assessments || assessments.length === 0) return null;
                    
                    const totals = scoreFields.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
                    let count = 0;
                    
                    assessments.forEach(assessment => {
                      if (assessment) {
                        scoreFields.forEach(field => {
                          const score = parseFloat(assessment[field] || 0);
                          if (score > 0) {
                            totals[field] += score;
                          }
                        });
                        count++;
                      }
                    });
                    
                    if (count === 0) return null;
                    
                    const averages = {};
                    scoreFields.forEach(field => {
                      averages[field] = totals[field] / count;
                    });
                    
                    const overall = Object.values(averages).reduce((sum, val) => sum + val, 0) / scoreFields.length;
                    return { ...averages, overall, count };
                  };

                  // Leadership Assessment Analysis
                  const leadershipFields = ['vision_score', 'reality_score', 'ethics_score', 'courage_score'];
                  const projectLeadershipAvg = calculateAssessmentAverages(
                    projectLeadershipData.success ? projectLeadershipData.assessments : [], 
                    leadershipFields
                  );
                  const teamLeadershipAvg = calculateAssessmentAverages(
                    teamLeadershipData.success ? teamLeadershipData.assessments : [], 
                    leadershipFields
                  );

                  insightText += `**Leadership Assessment Analysis:**\n`;
                  if (projectLeadershipAvg) {
                    insightText += `*Project-Specific (${projectLeadershipAvg.count} assessment${projectLeadershipAvg.count !== 1 ? 's' : ''}):*\n`;
                    insightText += `• Vision: ${projectLeadershipAvg.vision_score.toFixed(1)}/7\n`;
                    insightText += `• Reality: ${projectLeadershipAvg.reality_score.toFixed(1)}/7\n`;
                    insightText += `• Ethics: ${projectLeadershipAvg.ethics_score.toFixed(1)}/7\n`;
                    insightText += `• Courage: ${projectLeadershipAvg.courage_score.toFixed(1)}/7\n`;
                    insightText += `• **Project Leadership Score: ${projectLeadershipAvg.overall.toFixed(1)}/7**\n\n`;
                  } else {
                    insightText += `*Project-Specific:* No leadership assessments completed for this project yet\n\n`;
                  }

                  if (teamLeadershipAvg) {
                    insightText += `*Team-Wide Average (${teamLeadershipAvg.count} total assessment${teamLeadershipAvg.count !== 1 ? 's' : ''}):*\n`;
                    insightText += `• Vision: ${teamLeadershipAvg.vision_score.toFixed(1)}/7\n`;
                    insightText += `• Reality: ${teamLeadershipAvg.reality_score.toFixed(1)}/7\n`;
                    insightText += `• Ethics: ${teamLeadershipAvg.ethics_score.toFixed(1)}/7\n`;
                    insightText += `• Courage: ${teamLeadershipAvg.courage_score.toFixed(1)}/7\n`;
                    insightText += `• **Team Leadership Average: ${teamLeadershipAvg.overall.toFixed(1)}/7**\n\n`;

                    // Add comparison if both project and team data exist
                    if (projectLeadershipAvg) {
                      const diff = projectLeadershipAvg.overall - teamLeadershipAvg.overall;
                      const comparison = diff > 0.5 ? "significantly above" : 
                                       diff < -0.5 ? "below" : "aligned with";
                      insightText += `*Comparison:* This project's leadership is **${comparison} team average** (${diff > 0 ? '+' : ''}${diff.toFixed(1)})\n\n`;
                    }
                  } else {
                    insightText += `*Team-Wide:* No team leadership assessment data available\n\n`;
                  }
                  
                  // Organizational Change Assessment Analysis
                  const orgChangeFields = ['vision_score', 'alignment_score', 'understanding_score', 'enactment_score'];
                  const projectOrgChangeAvg = calculateAssessmentAverages(
                    projectOrgChangeData.success ? projectOrgChangeData.assessments : [], 
                    orgChangeFields
                  );
                  const teamOrgChangeAvg = calculateAssessmentAverages(
                    teamOrgChangeData.success ? teamOrgChangeData.assessments : [], 
                    orgChangeFields
                  );

                  insightText += `**Organizational Change Management Analysis:**\n`;
                  if (projectOrgChangeAvg) {
                    insightText += `*Project-Specific (${projectOrgChangeAvg.count} assessment${projectOrgChangeAvg.count !== 1 ? 's' : ''}):*\n`;
                    insightText += `• Vision: ${projectOrgChangeAvg.vision_score.toFixed(1)}/7\n`;
                    insightText += `• Alignment: ${projectOrgChangeAvg.alignment_score.toFixed(1)}/7\n`;
                    insightText += `• Understanding: ${projectOrgChangeAvg.understanding_score.toFixed(1)}/7\n`;
                    insightText += `• Enactment: ${projectOrgChangeAvg.enactment_score.toFixed(1)}/7\n`;
                    insightText += `• **Project Change Management Score: ${projectOrgChangeAvg.overall.toFixed(1)}/7**\n\n`;
                  } else {
                    insightText += `*Project-Specific:* No change management assessments completed for this project yet\n\n`;
                  }

                  if (teamOrgChangeAvg) {
                    insightText += `*Team-Wide Average (${teamOrgChangeAvg.count} total assessment${teamOrgChangeAvg.count !== 1 ? 's' : ''}):*\n`;
                    insightText += `• Vision: ${teamOrgChangeAvg.vision_score.toFixed(1)}/7\n`;
                    insightText += `• Alignment: ${teamOrgChangeAvg.alignment_score.toFixed(1)}/7\n`;
                    insightText += `• Understanding: ${teamOrgChangeAvg.understanding_score.toFixed(1)}/7\n`;
                    insightText += `• Enactment: ${teamOrgChangeAvg.enactment_score.toFixed(1)}/7\n`;
                    insightText += `• **Team Change Management Average: ${teamOrgChangeAvg.overall.toFixed(1)}/7**\n\n`;

                    // Add comparison if both project and team data exist
                    if (projectOrgChangeAvg) {
                      const diff = projectOrgChangeAvg.overall - teamOrgChangeAvg.overall;
                      const comparison = diff > 0.5 ? "significantly above" : 
                                       diff < -0.5 ? "below" : "aligned with";
                      insightText += `*Comparison:* This project's change management is **${comparison} team average** (${diff > 0 ? '+' : ''}${diff.toFixed(1)})\n\n`;
                    }
                  } else {
                    insightText += `*Team-Wide:* No team change management assessment data available\n\n`;
                  }
                  
                  // Overall Project Health Summary
                  insightText += `**Comprehensive Project Health:**\n`;
                  insightText += `• PM Progress: ${insights.metrics.progressScores.pm}/7\n`;
                  
                  if (projectLeadershipAvg) {
                    insightText += `• Leadership Effectiveness: ${projectLeadershipAvg.overall.toFixed(1)}/7\n`;
                  }
                  
                  if (projectOrgChangeAvg) {
                    insightText += `• Change Readiness: ${projectOrgChangeAvg.overall.toFixed(1)}/7\n`;
                  }
                  
                  if (insights.metrics.avgFeedback) {
                    insightText += `• Team Satisfaction: ${insights.metrics.avgFeedback}/7\n`;
                  }

                  // Calculate overall project health score
                  let healthComponents = [insights.metrics.progressScores.pm];
                  if (projectLeadershipAvg) healthComponents.push(projectLeadershipAvg.overall);
                  if (projectOrgChangeAvg) healthComponents.push(projectOrgChangeAvg.overall);
                  if (insights.metrics.avgFeedback) healthComponents.push(parseFloat(insights.metrics.avgFeedback));
                  
                  const overallHealth = healthComponents.reduce((sum, score) => sum + score, 0) / healthComponents.length;
                  insightText += `• **Overall Project Health: ${overallHealth.toFixed(1)}/7**\n\n`;
                  
                  // Enhanced recommendations based on assessment data
                  insightText += `**Strategic Recommendations:**\n`;
                  insights.recommendations.forEach(rec => insightText += `• ${rec}\n`);
                  
                  // Add assessment-specific recommendations
                  if (projectLeadershipAvg && teamLeadershipAvg) {
                    const leadDiff = projectLeadershipAvg.overall - teamLeadershipAvg.overall;
                    if (leadDiff < -0.5) {
                      insightText += `• **Leadership Focus**: This project's leadership scores are below team average - consider additional leadership development\n`;
                    } else if (leadDiff > 0.5) {
                      insightText += `• **Leadership Strength**: This project shows strong leadership - consider sharing best practices with other teams\n`;
                    }
                  }
                  
                  if (projectOrgChangeAvg && teamOrgChangeAvg) {
                    const changeDiff = projectOrgChangeAvg.overall - teamOrgChangeAvg.overall;
                    if (changeDiff < -0.5) {
                      insightText += `• **Change Management**: Focus on improving change readiness - scores are below team average\n`;
                    } else if (changeDiff > 0.5) {
                      insightText += `• **Change Excellence**: Strong change management capabilities - leverage this for organizational initiatives\n`;
                    }
                  }

                  // Recent activity
                  if (insights.recentActivity && insights.recentActivity.length > 0) {
                    insightText += `\n**Recent Activity:**\n`;
                    insights.recentActivity.slice(0, 3).forEach(activity => {
                      const date = new Date(activity.created_at).toLocaleDateString();
                      insightText += `• ${activity.description} (${date})\n`;
                    });
                  }
                  
                  const aiMessage = {
                    id: Date.now() + 1,
                    sender: 'ai',
                    text: insightText,
                    timestamp: new Date(),
                    model: 'comprehensive-analysis',
                    tokensUsed: 0
                  };
                  setMessages([...newMessages, aiMessage]);
                } else {
                  throw new Error(`Failed to get comprehensive insights for project "${targetProject.name}"`);
                }
              } catch (analysisError) {
                console.error('Error in comprehensive project analysis:', analysisError);
                const errorMessage = {
                  id: Date.now() + 1,
                  sender: 'ai',
                  text: `I had trouble getting comprehensive analysis for "${targetProject.name}": ${analysisError.message}. Let me try a basic analysis instead.`,
                  timestamp: new Date(),
                  isError: true
                };
                setMessages([...newMessages, errorMessage]);
              }
            } else {
              // Project not found - show available projects
              const projectNames = allProjects.map(p => p.name).join(', ');
              const aiMessage = {
                id: Date.now() + 1,
                sender: 'ai',
                text: `I couldn't find a project with that name. Your available projects are: ${projectNames}. Please try again with the exact project name.`,
                timestamp: new Date(),
                model: 'project-helper',
                tokensUsed: 0
              };
              setMessages([...newMessages, aiMessage]);
            }
          } else {
            throw new Error('Failed to fetch projects for analysis');
          }
        } catch (error) {
          console.error('Error in specific project analysis:', error);
          const errorMessage = {
            id: Date.now() + 1,
            sender: 'ai',
            text: `I had trouble analyzing that project: ${error.message}. Please try again or check if the project name is correct.`,
            timestamp: new Date(),
            isError: true
          };
          setMessages([...newMessages, errorMessage]);
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