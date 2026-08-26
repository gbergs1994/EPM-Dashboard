const axios = require('axios');
const { Pool } = require('pg');

class AIService {
  constructor() {
    console.log('🔍 Raw process.env.OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
    console.log('🔍 Type:', typeof process.env.OPENAI_API_KEY);
  
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.documentsLoaded = false;
    
    // Database connection
    this.dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'project_manager',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
    
    console.log('🤖 Intelligent AI Service initializing...');
    console.log('🔑 OpenAI API Key present:', !!this.openaiApiKey);
    console.log('🔑 API Key valid format:', this.openaiApiKey?.startsWith('sk-') || false);
    
    if (!this.openaiApiKey) {
      console.warn('⚠️ No OpenAI API key found - AI will use fallback mode');
      console.log('💡 Add OPENAI_API_KEY to your .env file to enable full AI capabilities');
    } else if (!this.openaiApiKey.startsWith('sk-')) {
      console.error('❌ Invalid OpenAI API key format - should start with sk-');
      this.openaiApiKey = null;
    } else {
      console.log('✅ OpenAI API key loaded successfully');
    }
    
    this.initializeDocuments().catch(error => {
      console.warn('⚠️ Document initialization failed:', error.message);
    });
  }

  async initializeDocuments() {
    try {
      console.log('🚀 Initializing AI service with training documents...');
      const documentLoader = require('../documentLoader');
      await documentLoader.loadAllDocuments();
      this.documentsLoaded = true;
      
      const stats = documentLoader.getStats();
      console.log('📊 Training documents loaded:', stats);
      
    } catch (error) {
      console.error('❌ Failed to load training documents:', error.message);
      this.documentsLoaded = false;
    }
  }

  // NEW: Intelligent query intent classification
  analyzeQueryIntent(message) {
    const lowerMessage = message.toLowerCase();
    const intents = [];

    // Project-related intent detection
    const projectKeywords = ['project', 'projects', 'progress', 'deadline', 'status', 'team members', 'budget', 'milestone', 'deliverable', 'scope', 'schedule', 'task', 'work', 'assignment'];
    const projectScore = projectKeywords.reduce((score, keyword) => {
      return score + (lowerMessage.includes(keyword) ? 1 : 0);
    }, 0);
    if (projectScore > 0) intents.push({ type: 'projects', score: projectScore, priority: 1 });

    // Career-related intent detection
    const careerKeywords = ['career', 'goal', 'goals', 'development', 'skill', 'skills', 'growth', 'learning', 'certification', 'training', 'advancement', 'promotion'];
    const careerScore = careerKeywords.reduce((score, keyword) => {
      return score + (lowerMessage.includes(keyword) ? 1 : 0);
    }, 0);
    if (careerScore > 0) intents.push({ type: 'career', score: careerScore, priority: 2 });

    // Leadership/Assessment intent detection
    const leadershipKeywords = ['leadership', 'assessment', 'diamond', 'value', 'vision', 'ethics', 'reality', 'courage', 'task', 'team', 'individual', 'organization'];
    const leadershipScore = leadershipKeywords.reduce((score, keyword) => {
      return score + (lowerMessage.includes(keyword) ? 1 : 0);
    }, 0);
    if (leadershipScore > 0) intents.push({ type: 'leadership', score: leadershipScore, priority: 3 });

    // Team-related intent detection
    const teamKeywords = ['team', 'member', 'members', 'colleague', 'coworker', 'collaboration', 'communication', 'feedback', 'performance', 'role', 'responsibility'];
    const teamScore = teamKeywords.reduce((score, keyword) => {
      return score + (lowerMessage.includes(keyword) ? 1 : 0);
    }, 0);
    if (teamScore > 0) intents.push({ type: 'team', score: teamScore, priority: 4 });

    // General/multiple intent detection
    const generalKeywords = ['overview', 'summary', 'everything', 'all', 'status', 'update', 'what', 'how', 'help'];
    const generalScore = generalKeywords.reduce((score, keyword) => {
      return score + (lowerMessage.includes(keyword) ? 1 : 0);
    }, 0);
    if (generalScore > 0 || intents.length === 0) intents.push({ type: 'general', score: generalScore, priority: 5 });

    // Sort by score (highest first) and then by priority (lowest first for ties)
    intents.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.priority - b.priority;
    });

    console.log(`🧠 Query intent analysis for "${message}":`, intents);
    return intents;
  }

  // Enhanced method to fetch ALL relevant data based on intent
  async fetchContextualData(userId, intents, message) {
    const data = {
      projects: [],
      careerGoals: [],
      assessments: [],
      team: [],
      feedback: [],
      history: []
    };

    if (!userId) {
      console.warn('⚠️ No user ID provided for contextual data fetch');
      return data;
    }

    try {
      // Always fetch some basic user context
      console.log('🔍 Fetching contextual data based on intents:', intents.map(i => i.type));

      // Determine which data to fetch based on intents
      const shouldFetchProjects = intents.some(i => ['projects', 'general'].includes(i.type));
      const shouldFetchCareer = intents.some(i => ['career', 'general'].includes(i.type));
      const shouldFetchLeadership = intents.some(i => ['leadership', 'general'].includes(i.type));
      const shouldFetchTeam = intents.some(i => ['team', 'projects', 'general'].includes(i.type));

      const promises = [];

      // Fetch projects data
      if (shouldFetchProjects) {
        console.log('📂 Fetching projects data...');
        const projectsQuery = `
          SELECT 
            p.id,
            p.name,
            p.description,
            p.status,
            p.priority,
            p.deadline,
            p.pm_progress,
            p.leadership_progress,
            p.change_mgmt_progress,
            p.career_dev_progress,
            p.last_update,
            p.created_at,
            p.updated_at,
            COUNT(DISTINCT ptm.user_id) as team_size,
            COUNT(DISTINCT pf.id) as feedback_count,
            COALESCE(AVG(pf.overall_average), 0) as avg_rating
          FROM projects p
          LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
          LEFT JOIN project_feedback pf ON p.id = pf.project_id
          WHERE p.id IN (
            SELECT DISTINCT project_id FROM project_team_members WHERE user_id = $1
            UNION
            SELECT id FROM projects WHERE id IN (SELECT project_id FROM project_ownership WHERE user_id = $1)
          )
          OR p.name ILIKE $2
          OR p.description ILIKE $2
          GROUP BY p.id
          ORDER BY p.updated_at DESC
          LIMIT 10
        `;
        promises.push(
          this.dbPool.query(projectsQuery, [userId, `%${message}%`])
            .then(result => { data.projects = result.rows; })
            .catch(err => console.error('❌ Projects query error:', err.message))
        );
      }

      // Fetch career goals data
      if (shouldFetchCareer) {
        console.log('🎯 Fetching career goals data...');
        const careerQuery = `
          SELECT 
            id,
            title,
            description,
            category,
            current_level,
            target_level,
            priority,
            current_progress,
            status,
            target_date,
            notes,
            created_at,
            updated_at
          FROM career_development_goals 
          WHERE user_id = $1 
          AND status != 'cancelled'
          ORDER BY 
            CASE WHEN status = 'active' THEN 0 ELSE 1 END,
            priority DESC,
            created_at DESC
          LIMIT 10
        `;
        promises.push(
          this.dbPool.query(careerQuery, [userId])
            .then(result => { data.careerGoals = result.rows; })
            .catch(err => console.error('❌ Career goals query error:', err.message))
        );
      }

      // Fetch assessments data
      if (shouldFetchLeadership) {
        console.log('📊 Fetching assessment data...');
        const assessmentQuery = `
          SELECT 'leadership_diamond' as type, 
                 task_score, team_score, individual_score, organization_score,
                 created_at
          FROM leadership_diamond_assessments 
          WHERE user_id = $1
          UNION ALL
          SELECT 'value' as type,
                 vision_score, alignment_score, understanding_score, enactment_score,
                 created_at
          FROM value_assessments 
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 5
        `;
        promises.push(
          this.dbPool.query(assessmentQuery, [userId])
            .then(result => { data.assessments = result.rows; })
            .catch(err => console.error('❌ Assessments query error:', err.message))
        );
      }

      // Fetch team data
      if (shouldFetchTeam) {
        console.log('👥 Fetching team data...');
        const teamQuery = `
          SELECT DISTINCT 
            u.id,
            u.name,
            u.email,
            u.role,
            u.avatar,
            ptm.role_in_project,
            ptm.contribution_percentage,
            ptm.tasks_completed,
            p.name as project_name
          FROM users u
          JOIN project_team_members ptm ON u.id = ptm.user_id
          JOIN projects p ON ptm.project_id = p.id
          WHERE p.id IN (
            SELECT DISTINCT project_id FROM project_team_members WHERE user_id = $1
          )
          AND u.id != $1
          ORDER BY u.name
          LIMIT 15
        `;
        promises.push(
          this.dbPool.query(teamQuery, [userId])
            .then(result => { data.team = result.rows; })
            .catch(err => console.error('❌ Team query error:', err.message))
        );
      }

      // Wait for all queries to complete
      await Promise.all(promises);

      // Log what we found
      console.log(`📊 Contextual data gathered:`, {
        projects: data.projects.length,
        careerGoals: data.careerGoals.length,
        assessments: data.assessments.length,
        team: data.team.length
      });

      return data;

    } catch (error) {
      console.error('❌ Error fetching contextual data:', error.message);
      return data;
    }
  }

  async processChat(message, context = {}) {
    try {
      console.log('🧠 Processing intelligent chat request...');
      console.log('📝 Message:', message.substring(0, 100));
      console.log('👤 User:', context.user?.name, context.user?.id);
      
      // Step 1: Analyze query intent
      const intents = this.analyzeQueryIntent(message);
      const primaryIntent = intents[0]?.type || 'general';
      
      // Step 2: Fetch relevant training documents
      let relevantDocs = [];
      try {
        const documentLoader = require('../documentLoader');
        relevantDocs = documentLoader.searchDocuments(message, 3);
      } catch (error) {
        console.warn('⚠️ Document loader not available:', error.message);
      }

      // Step 3: Fetch contextual data based on intent
      const userId = context.user?.id;
      const contextualData = await this.fetchContextualData(userId, intents, message);

      // Step 4: Build comprehensive context
      const comprehensiveContext = this.buildIntelligentContext(
        message, 
        intents, 
        contextualData, 
        relevantDocs, 
        context
      );

      console.log(`🎯 Primary intent: ${primaryIntent}, Context length: ${comprehensiveContext.length} chars`);

      if (this.openaiApiKey && comprehensiveContext.trim().length > 0) {
        console.log('🚀 Using OpenAI with intelligent context');
        const response = await this.callOpenAI(comprehensiveContext, context, primaryIntent);
        
        const cleanedResponse = this.cleanResponse(response);
        
        return {
          content: cleanedResponse,
          model: 'gpt-3.5-turbo-intelligent',
          tokensUsed: this.estimateTokens(comprehensiveContext + response),
          primaryIntent: primaryIntent,
          dataSourcesUsed: {
            projects: contextualData.projects.length,
            careerGoals: contextualData.careerGoals.length,
            assessments: contextualData.assessments.length,
            team: contextualData.team.length,
            documents: relevantDocs.length
          }
        };
      } else {
        console.log('🔧 Using intelligent fallback');
        return this.getIntelligentFallbackResponse(message, primaryIntent, contextualData, context);
      }
      
    } catch (error) {
      console.error('❌ AI processing error:', error);
      throw new Error(`I apologize, but I'm experiencing some technical difficulties. Please try your question again.`);
    }
  }

  buildIntelligentContext(message, intents, contextualData, relevantDocs, userContext) {
    const contextParts = [];

    // Add user context
    if (userContext.user) {
      contextParts.push(`User: ${userContext.user.name} (${userContext.user.role})`);
    }

    // Add context based on primary intent and available data
    const primaryIntent = intents[0]?.type || 'general';

    if (primaryIntent === 'projects' && contextualData.projects.length > 0) {
      const projectsContext = contextualData.projects.map(proj => 
        `- ${proj.name}: ${proj.description || 'No description'} (Status: ${proj.status}, Priority: ${proj.priority}, Team: ${proj.team_size} members, PM Progress: ${proj.pm_progress}/7, Leadership: ${proj.leadership_progress}/7)`
      ).join('\n');
      contextParts.push(`CURRENT PROJECTS:\n${projectsContext}`);
    }

    if ((primaryIntent === 'career' || primaryIntent === 'general') && contextualData.careerGoals.length > 0) {
      const goalsContext = contextualData.careerGoals.map(goal => 
        `- ${goal.title}: ${goal.description} (Category: ${goal.category}, Status: ${goal.status}, Progress: ${goal.current_progress}%, Priority: ${goal.priority}, Target: ${goal.target_date})`
      ).join('\n');
      contextParts.push(`CAREER DEVELOPMENT GOALS:\n${goalsContext}`);
    }

    if ((primaryIntent === 'leadership' || primaryIntent === 'general') && contextualData.assessments.length > 0) {
      const assessmentContext = contextualData.assessments.map(assess => {
        if (assess.type === 'leadership_diamond') {
          return `Leadership Diamond Assessment: Task(${assess.task_score}/10), Team(${assess.team_score}/10), Individual(${assess.individual_score}/10), Organization(${assess.organization_score}/10)`;
        } else {
          return `VALUE Assessment: Vision(${assess.vision_score}/10), Alignment(${assess.alignment_score}/10), Understanding(${assess.understanding_score}/10), Enactment(${assess.enactment_score}/10)`;
        }
      }).join('\n');
      contextParts.push(`ASSESSMENT RESULTS:\n${assessmentContext}`);
    }

    if ((primaryIntent === 'team' || primaryIntent === 'projects') && contextualData.team.length > 0) {
      const teamContext = contextualData.team.slice(0, 10).map(member => 
        `- ${member.name} (${member.role}) - Role in project: ${member.role_in_project || 'Team Member'}, Project: ${member.project_name}`
      ).join('\n');
      contextParts.push(`TEAM MEMBERS:\n${teamContext}`);
    }

    // Add document context if relevant
    if (relevantDocs.length > 0) {
      const documentContext = relevantDocs.map(doc => doc.content.substring(0, 200)).join('\n');
      contextParts.push(`RELEVANT KNOWLEDGE:\n${documentContext}`);
    }

    const comprehensiveContext = contextParts.join('\n\n');

    const prompt = `You are a senior project management and leadership consultant. Provide personalized, actionable advice based on the specific data provided. Do NOT mention databases, data sources, or technical systems.

CONTEXT:
${comprehensiveContext}

USER QUESTION: ${message}

PRIMARY FOCUS: ${intents[0]?.type?.toUpperCase() || 'GENERAL'}

INSTRUCTIONS:
- Focus your response on the primary intent area (${intents[0]?.type || 'general information'})
- Use specific data from the context (actual project names, goal titles, progress percentages, team members)
- Provide actionable recommendations based on the user's actual situation
- Reference real deadlines, priorities, and status information when relevant
- Keep responses professional and encouraging
- Structure information clearly with bullet points or sections when helpful`;

    return prompt;
  }

  getIntelligentFallbackResponse(message, primaryIntent, contextualData, userContext) {
    const user = userContext?.user || { name: 'there' };
    const userName = user.name === 'there' ? 'there' : user.name;
    
    let response = `Hello ${userName}! `;

    // Respond based on primary intent and available data
    switch (primaryIntent) {
      case 'projects':
        if (contextualData.projects.length > 0) {
          response += `Here are your current projects:\n\n`;
          contextualData.projects.slice(0, 5).forEach(project => {
            response += `**${project.name}**\n`;
            response += `- Status: ${project.status}\n`;
            response += `- Priority: ${project.priority}\n`;
            if (project.deadline) response += `- Deadline: ${new Date(project.deadline).toLocaleDateString()}\n`;
            response += `- PM Progress: ${project.pm_progress}/7\n`;
            response += `- Leadership Progress: ${project.leadership_progress}/7\n`;
            if (project.team_size > 0) response += `- Team Size: ${project.team_size} members\n`;
            if (project.avg_rating > 0) response += `- Average Rating: ${Math.round(project.avg_rating * 10) / 10}/7\n`;
            response += `\n`;
          });
        } else {
          response += `I don't see any projects associated with your account. Projects help you track progress, manage teams, and achieve organizational goals. Would you like guidance on starting a new project?`;
        }
        break;

      case 'career':
        if (contextualData.careerGoals.length > 0) {
          response += `Based on your career development goals:\n\n`;
          contextualData.careerGoals.slice(0, 5).forEach(goal => {
            response += `**${goal.title}** (${goal.category})\n`;
            response += `- Progress: ${goal.current_progress}%\n`;
            response += `- Priority: ${goal.priority}\n`;
            response += `- Status: ${goal.status}\n`;
            if (goal.target_date) response += `- Target: ${new Date(goal.target_date).toLocaleDateString()}\n`;
            response += `\n`;
          });
          
          // Add intelligent recommendations
          const activeGoals = contextualData.careerGoals.filter(g => g.status === 'active');
          const highPriorityGoals = contextualData.careerGoals.filter(g => g.priority === 'high' || g.priority === 'critical');
          
          if (highPriorityGoals.length > 0) {
            response += `**Focus Areas:** ${highPriorityGoals.map(g => g.title).join(', ')}\n\n`;
          }
        } else {
          response += `I notice you don't have any career development goals set up yet. Career goals help track your professional growth and guide your development journey. Would you like help creating your first career goal?`;
        }
        break;

      case 'leadership':
        if (contextualData.assessments.length > 0) {
          response += `Based on your leadership assessments:\n\n`;
          contextualData.assessments.slice(0, 2).forEach(assessment => {
            if (assessment.type === 'leadership_diamond') {
              response += `**Leadership Diamond Assessment:**\n`;
              response += `- Task Focus: ${assessment.task_score}/10\n`;
              response += `- Team Focus: ${assessment.team_score}/10\n`;
              response += `- Individual Focus: ${assessment.individual_score}/10\n`;
              response += `- Organization Focus: ${assessment.organization_score}/10\n\n`;
            } else if (assessment.type === 'value') {
              response += `**VALUE Assessment:**\n`;
              response += `- Vision: ${assessment.vision_score}/10\n`;
              response += `- Alignment: ${assessment.alignment_score}/10\n`;
              response += `- Understanding: ${assessment.understanding_score}/10\n`;
              response += `- Enactment: ${assessment.enactment_score}/10\n\n`;
            }
          });
        } else {
          response += `I don't see any completed leadership assessments. These assessments provide valuable insights into your leadership style and development areas. Would you like to learn about available assessments?`;
        }
        break;

      case 'team':
        if (contextualData.team.length > 0) {
          response += `Your team members:\n\n`;
          contextualData.team.slice(0, 8).forEach(member => {
            response += `**${member.name}** (${member.role})\n`;
            if (member.role_in_project) response += `- Project Role: ${member.role_in_project}\n`;
            if (member.project_name) response += `- Current Project: ${member.project_name}\n`;
            response += `\n`;
          });
        } else {
          response += `I don't see team member information available. Effective team management involves clear communication, defined roles, and regular feedback. What specific team management guidance can I provide?`;
        }
        break;

      default:
        // General response with overview of available data
        response += `Here's an overview of your information:\n\n`;
        if (contextualData.projects.length > 0) {
          response += `📂 **Projects:** ${contextualData.projects.length} active projects\n`;
        }
        if (contextualData.careerGoals.length > 0) {
          response += `🎯 **Career Goals:** ${contextualData.careerGoals.length} development goals\n`;
        }
        if (contextualData.assessments.length > 0) {
          response += `📊 **Assessments:** ${contextualData.assessments.length} completed assessments\n`;
        }
        if (contextualData.team.length > 0) {
          response += `👥 **Team:** ${contextualData.team.length} team members\n`;
        }
        
        response += `\nI can help you with specific questions about any of these areas. What would you like to focus on?`;
    }

    return {
      content: response,
      model: 'intelligent-database-consultant',
      tokensUsed: 0,
      primaryIntent: primaryIntent,
      dataSourcesUsed: {
        projects: contextualData.projects.length,
        careerGoals: contextualData.careerGoals.length,
        assessments: contextualData.assessments.length,
        team: contextualData.team.length,
        documents: 0
      }
    };
  }

  async callOpenAI(message, context, primaryIntent) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not available');
    }
  
    try {
      console.log('📡 Calling OpenAI API with intelligent context...');
      
      const systemPrompt = `You are a senior project management and leadership consultant. You provide personalized advice based on specific user data and context.

Primary Focus Area: ${primaryIntent?.toUpperCase() || 'GENERAL'}

Key Guidelines:
- Focus primarily on the ${primaryIntent} area while being comprehensive
- Use specific data from the context (project names, goal titles, progress percentages, dates)
- Provide concrete, actionable recommendations
- Reference actual team members, deadlines, and priorities when available
- Use professional, encouraging language
- Structure responses clearly with sections or bullet points
- Use **bold text** for key points and names
- Do not mention databases, technical systems, or data sources`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: message
            }
          ],
          max_tokens: 1200, 
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
  
      console.log('✅ OpenAI API response received');
      return response.data.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ OpenAI API error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Authentication failed - please check your API configuration');
      } else if (error.response?.status === 429) {
        throw new Error('I\'m currently experiencing high demand. Please try again in a moment.');
      } else if (error.response?.status === 402) {
        throw new Error('Service temporarily unavailable due to quota limits');
      } else {
        throw new Error('I\'m experiencing technical difficulties. Please try again.');
      }
    }
  }

  cleanResponse(responseText) {
    if (!responseText) return 'I apologize, but I\'m unable to provide a response at this time.';

    let cleaned = responseText
      .replace(/\b(training materials?|knowledge base|document loader|document sources?|database|data source)\b/gi, 'my expertise')
      .replace(/\b(based on the (training|provided|available) (materials?|data|context))\b/gi, 'based on my analysis')
      .replace(/\b(according to|from) the (training|provided|available) (materials?|data|context)\b/gi, 'in my experience')
      .replace(/\bthe (training|provided|available) (materials?|data|context) (provide|show|indicate)\b/gi, 'my analysis shows')
      .replace(/\b(comprehensive context|context data|organizational data|database results)\b/gi, 'available information')
      .replace(/\b\w+\.(js|jsx|ts|tsx|json|md|txt|csv|pdf)\b/gi, '')
      .replace(/\b(API|endpoint|service|controller|database|query|schema)\b/gi, '')
      .replace(/\/api\/[a-zA-Z\/\-_]+/gi, '')
      .replace(/\b(function|method|console\.log|error|response|request|query)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/\s*[,;]\s*[,;]/g, ',')
      .trim();

    if (cleaned.length < 30) {
      return 'Thank you for your question. I\'d be happy to help you with project management, career development, or leadership guidance. Could you provide more specific details about what you\'d like assistance with?';
    }

    return cleaned;
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  getDocumentStats() {
    try {
      const documentLoader = require('../documentLoader');
      return documentLoader.getStats();
    } catch (error) {
      return {
        totalDocuments: 0,
        totalChunks: 0,
        categories: [],
        avgChunksPerDoc: 0
      };
    }
  }

  async reloadDocuments() {
    console.log('🔄 Reloading training documents...');
    try {
      const documentLoader = require('../documentLoader');
      await documentLoader.loadAllDocuments();
      return this.getDocumentStats();
    } catch (error) {
      console.error('❌ Failed to reload documents:', error.message);
      return this.getDocumentStats();
    }
  }

  async healthCheck() {
    return {
      status: 'healthy',
      hasOpenAIKey: !!this.openaiApiKey,
      documentsLoaded: this.documentsLoaded,
      databaseConnected: this.dbPool ? true : false,
      intelligent: true,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new AIService();