const AIService = require('../services/ai/aiService');
const { Pool } = require('pg');

class AIController {
  constructor() {
    this.dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'project_manager',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });
  }

  async chat(req, res) {
    try {
      console.log('🤖 Enhanced AI Chat Request');
      console.log('📝 Request body:', JSON.stringify(req.body, null, 2));
      console.log('👤 User:', req.user?.name, req.user?.role);

      const { message, projectId } = req.body;
      
      // Validate input
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required and must be a non-empty string'
        });
      }

      if (message.trim().length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long. Please keep messages under 2000 characters.'
        });
      }

      // Build comprehensive context
      const context = await this.buildComprehensiveContext(req.user, projectId, message);
      
      console.log('🔍 Context built with:', {
        userId: context.user?.id,
        projectId: context.projectId,
        hasProjects: context.projects?.length > 0,
        hasAssessments: context.assessments?.length > 0,
        hasGoals: context.goals?.length > 0
      });

      // Process with enhanced AI service
      const aiResponse = await AIService.processChat(message.trim(), context);
      
      console.log('✅ AI Response generated:', {
        model: aiResponse.model,
        tokensUsed: aiResponse.tokensUsed,
        documentsUsed: aiResponse.documentsUsed,
        dataSourcesUsed: aiResponse.dataSourcesUsed
      });

      // Log comprehensive interaction
      await this.logEnhancedInteraction(
        req.user.id, 
        projectId, 
        message.trim(), 
        aiResponse.content, 
        {
          model: aiResponse.model,
          tokensUsed: aiResponse.tokensUsed,
          documentsUsed: aiResponse.documentsUsed,
          dataSourcesUsed: aiResponse.dataSourcesUsed,
          contextSources: this.getContextSources(context),
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      );

      res.json({
        success: true,
        response: aiResponse.content,
        model: aiResponse.model,
        metadata: {
          tokensUsed: aiResponse.tokensUsed,
          documentsUsed: aiResponse.documentsUsed,
          dataSourcesUsed: aiResponse.dataSourcesUsed,
          contextEnhanced: true,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Enhanced AI chat error:', error);
      
      // Log error for debugging
      try {
        if (req.user?.id) {
          await this.logEnhancedInteraction(
            req.user.id,
            req.body.projectId,
            req.body.message || 'Error before processing',
            'Error: ' + error.message,
            {
              error: true,
              errorType: error.constructor.name,
              errorMessage: error.message,
              timestamp: new Date().toISOString()
            }
          );
        }
      } catch (logError) {
        console.error('❌ Failed to log error interaction:', logError.message);
      }

      if (error.message.includes('API key')) {
        res.status(503).json({
          success: false,
          error: 'AI service temporarily unavailable. Please try again later.'
        });
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        res.status(429).json({
          success: false,
          error: 'Service temporarily busy. Please try again in a moment.'
        });
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        res.status(503).json({
          success: false,
          error: 'Network connectivity issue. Please check your connection and try again.'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'I apologize, but I\'m experiencing technical difficulties. Please try again.',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  }

  async buildComprehensiveContext(user, projectId, message) {
    const context = {
      user: user || null,
      project: null,
      teamMembers: [],
      assessments: [],
      feedback: [],
      goals: [] // Only project-related goals
    };
  
    try {
      // Get user info
      if (userId) {
        const userQuery = 'SELECT id, name, email, role FROM users WHERE id = $1';
        const userResult = await db.query(userQuery, [userId]);
        context.user = userResult.rows[0] || null;
      }
  
      // Get SPECIFIC PROJECT ONLY (not all projects)
      if (projectId && userId) {
        console.log(`🎯 Building context for SPECIFIC PROJECT: ${projectId}`);
        
        const projectQuery = `
          SELECT p.*, u.name as manager_name,
                 pm.pm_progress, pm.leadership_progress, pm.change_mgmt_progress, pm.career_dev_progress
          FROM projects p 
          LEFT JOIN users u ON p.manager_id = u.id 
          WHERE p.id = $1 AND (p.manager_id = $2 OR EXISTS(
            SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = $2
          ))
        `;
        const projectResult = await this.dbPool.query(projectQuery, [projectId, userId]);
        context.project = projectResult.rows[0] || null;
  
        if (!context.project) {
          console.log(`⚠️ User ${userId} doesn't have access to project ${projectId}`);
          return context;
        }
  
        // Get TEAM MEMBERS for this specific project only
        const teamQuery = `
          SELECT u.id, u.name, u.email, u.role,
                 ptm.role_in_project, ptm.joined_date
          FROM project_team_members ptm
          JOIN users u ON ptm.user_id = u.id
          WHERE ptm.project_id = $1
          ORDER BY u.name
        `;
        const teamResult = await db.query(teamQuery, [projectId]);
        context.teamMembers = teamResult.rows || [];
  
        // Get ASSESSMENTS for this specific project only
        const assessmentQueries = [
          `SELECT 'leadership' as type, vision_score, reality_score, ethics_score, courage_score, created_at, u.name as user_name
           FROM leadership_assessments la 
           JOIN users u ON la.user_id = u.id
           WHERE la.project_id = $1 ORDER BY la.created_at DESC LIMIT 10`,
          `SELECT 'organizational_change' as type, vision_score, alignment_score, understanding_score, enactment_score, created_at, u.name as user_name
           FROM organizational_change_assessments oca 
           JOIN users u ON oca.user_id = u.id
           WHERE oca.project_id = $1 ORDER BY oca.created_at DESC LIMIT 10`
        ];
  
        for (const query of assessmentQueries) {
          try {
            const result = await db.query(query, [projectId]);
            context.assessments = [...context.assessments, ...result.rows];
          } catch (tableError) {
            console.log(`⚠️ Assessment table not found: ${tableError.message}`);
          }
        }
  
        // Get FEEDBACK for this specific project only
        const feedbackQuery = `
          SELECT pf.*, u.name as user_name
          FROM project_feedback pf
          JOIN users u ON pf.user_id = u.id
          WHERE pf.project_id = $1
          ORDER BY pf.created_at DESC LIMIT 10
        `;
        const feedbackResult = await db.query(feedbackQuery, [projectId]);
        context.feedback = feedbackResult.rows || [];
  
        // Get PROJECT-RELATED CAREER GOALS only (goals that mention this project or are relevant)
        const goalsQuery = `
          SELECT cdg.*
          FROM career_development_goals cdg
          WHERE cdg.user_id IN (SELECT user_id FROM project_team_members WHERE project_id = $1)
          AND cdg.status = 'active'
          ORDER BY cdg.priority DESC, cdg.created_at DESC LIMIT 5
        `;
        const goalsResult = await db.query(goalsQuery, [projectId]);
        context.goals = goalsResult.rows || [];
  
        console.log(`✅ Project-scoped context built:`, {
          project: context.project?.name,
          teamMembers: context.teamMembers.length,
          assessments: context.assessments.length,
          feedback: context.feedback.length,
          goals: context.goals.length
        });
      }
  
    } catch (error) {
      console.log('⚠️ Context building error:', error.message);
    }
  
    return context;
  }

  getContextSources(context) {
    return {
      projects: context.projects?.length || 0,
      assessments: context.assessments?.length || 0,
      goals: context.goals?.length || 0,
      teamMembers: context.team?.length || 0,
      interactions: context.interactions?.length || 0
    };
  }

  async logEnhancedInteraction(userId, projectId, query, response, metadata = {}) {
    try {
      if (!userId) return;
      
      await this.dbPool.query(
        `INSERT INTO ai_interactions (user_id, project_id, query, response, model_used, tokens_used, context_data, document_context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId, 
          projectId || null, 
          query, 
          response, 
          metadata.model || 'enhanced-ai-service',
          metadata.tokensUsed || 0,
          JSON.stringify(metadata),
          JSON.stringify(metadata.dataSourcesUsed || {})
        ]
      );
    } catch (error) {
      console.warn('⚠️ Failed to log enhanced interaction:', error.message);
    }
  }

  async getProjectInsights(req, res) {
    try {
      const { projectId } = req.params;
      
      if (!projectId || isNaN(parseInt(projectId))) {
        return res.status(400).json({
          success: false,
          error: 'Valid project ID is required'
        });
      }
  
      console.log(`🔍 Getting AI insights for project ${projectId}`);
  
      // Simple project data fetch using this.dbPool
      const projectQuery = `
        SELECT p.*, u.name as creator_name,
               COUNT(DISTINCT ptm.user_id) as team_size
        FROM projects p 
        LEFT JOIN users u ON p.created_by = u.id 
        LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
        WHERE p.id = $1 AND (p.created_by = $2 OR EXISTS(
          SELECT 1 FROM project_team_members ptm2 WHERE ptm2.project_id = p.id AND ptm2.user_id = $2
        ))
        GROUP BY p.id, u.name
      `;
  
      const projectResult = await this.dbPool.query(projectQuery, [projectId, req.user.id]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found or access denied'
        });
      }
  
      const project = projectResult.rows[0];
  
      // Generate simple insights
      const insights = {
        summary: `Analysis of ${project.name}`,
        metrics: {
          status: project.status || 'active',
          priority: project.priority || 'medium',
          teamSize: parseInt(project.team_size) || 0,
          progressScores: {
            pm: 5,
            leadership: 5,
            changeManagement: 5,
            careerDev: 5
          }
        },
        recommendations: [
          'Project is performing well with balanced progress scores',
          'Continue current development approach',
          'Monitor team collaboration and communication'
        ]
      };
  
      res.json({
        success: true,
        insights: insights,
        metadata: {
          generatedAt: new Date().toISOString(),
          projectId: parseInt(projectId),
          projectName: project.name
        }
      });
  
    } catch (error) {
      console.error('❌ Project insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate project insights',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async getProjectData(projectId, userId) {
    const data = { project: null, team: [], feedback: [], progress: [], risks: [] };

    try {
      // Get project details
      const projectQuery = `
        SELECT p.*, u.name as creator_name, u.role as creator_role,
               COUNT(DISTINCT pt.user_id) as team_size,
               COUNT(DISTINCT f.id) as feedback_count,
               AVG(f.rating) as avg_rating
        FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN project_teams pt ON p.id = pt.project_id
        LEFT JOIN feedback f ON p.id = f.project_id
        WHERE p.id = $1
        AND (p.user_id = $2 OR pt.user_id = $2 OR $3 = 'Project Manager' OR $3 = 'AI Lead')
        GROUP BY p.id, u.name, u.role
      `;
      const projectResult = await this.dbPool.query(projectQuery, [projectId, userId, req.user?.role || 'Team Member']);
      
      if (projectResult.rows.length === 0) {
        return data;
      }
      
      data.project = projectResult.rows[0];

      // Get team members
      const teamQuery = `
        SELECT u.id, u.name, u.role, u.avatar, pt.joined_at,
               COUNT(DISTINCT f.id) as feedback_given
        FROM project_teams pt
        JOIN users u ON pt.user_id = u.id
        LEFT JOIN feedback f ON pt.user_id = f.user_id AND f.project_id = $1
        WHERE pt.project_id = $1
        GROUP BY u.id, u.name, u.role, u.avatar, pt.joined_at
        ORDER BY pt.joined_at ASC
      `;
      const teamResult = await this.dbPool.query(teamQuery, [projectId]);
      data.team = teamResult.rows;

      // Get recent feedback
      const feedbackQuery = `
        SELECT f.*, u.name as user_name, u.role as user_role
        FROM feedback f
        JOIN users u ON f.user_id = u.id
        WHERE f.project_id = $1
        ORDER BY f.created_at DESC
        LIMIT 10
      `;
      const feedbackResult = await this.dbPool.query(feedbackQuery, [projectId]);
      data.feedback = feedbackResult.rows;

      // Get progress data if available
      // Note: This would depend on your specific progress tracking implementation

    } catch (error) {
      console.error('❌ Error getting project data:', error.message);
    }

    return data;
  }

  async generateProjectInsights(projectData) {
    try {
      const { project, team, feedback } = projectData;
      
      // Build insights prompt
      const insightsPrompt = `Analyze this project data and provide actionable insights:

PROJECT: ${project.name}
Description: ${project.description}
Status: ${project.status}
Team Size: ${team.length}
Feedback Count: ${feedback.length}
Average Rating: ${project.avg_rating ? project.avg_rating.toFixed(1) : 'N/A'}

TEAM COMPOSITION:
${team.map(member => `- ${member.name} (${member.role})`).join('\n')}

RECENT FEEDBACK:
${feedback.slice(0, 5).map(f => `- Rating: ${f.rating}/5, Comment: "${f.feedback_text}"`).join('\n')}

Provide specific insights about:
1. Project health and momentum
2. Team dynamics and engagement
3. Risk areas requiring attention
4. Recommendations for improvement
5. Success indicators and trends`;

      const context = {
        user: { name: 'Project Analyst', role: 'AI Lead' },
        projectId: project.id,
        projects: [project],
        team: team,
        feedback: feedback
      };

      const aiResponse = await AIService.processChat(insightsPrompt, context);
      
      return {
        summary: this.extractInsightsSummary(aiResponse.content),
        detailed: aiResponse.content,
        recommendations: this.extractRecommendations(aiResponse.content),
        riskAreas: this.extractRiskAreas(projectData),
        successMetrics: this.calculateSuccessMetrics(projectData)
      };

    } catch (error) {
      console.error('❌ Error generating insights:', error.message);
      return {
        summary: 'Unable to generate insights at this time',
        detailed: 'Insights generation temporarily unavailable',
        recommendations: [],
        riskAreas: [],
        successMetrics: {}
      };
    }
  }

  extractInsightsSummary(content) {
    // Extract first paragraph or first 200 characters as summary
    const firstParagraph = content.split('\n\n')[0];
    return firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
  }

  extractRecommendations(content) {
    // Extract bullet points or numbered items as recommendations
    const recommendations = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[\d\-\*\•]\s+/) || line.toLowerCase().includes('recommend')) {
        recommendations.push(line.replace(/^[\d\-\*\•]\s+/, '').trim());
      }
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  extractRiskAreas(projectData) {
    const risks = [];
    const { project, team, feedback } = projectData;
    
    // Analyze for potential risks based on data
    if (team.length < 2) {
      risks.push({ type: 'team', level: 'medium', description: 'Small team size may limit project capacity' });
    }
    
    if (feedback.length > 0) {
      const avgRating = feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length;
      if (avgRating < 3) {
        risks.push({ type: 'satisfaction', level: 'high', description: 'Low satisfaction ratings require attention' });
      }
    }
    
    if (project.status === 'active' && !project.target_date) {
      risks.push({ type: 'timeline', level: 'medium', description: 'No target completion date set' });
    }
    
    return risks;
  }

  calculateSuccessMetrics(projectData) {
    const { project, team, feedback } = projectData;
    
    return {
      teamEngagement: team.length > 0 ? Math.min(100, team.length * 25) : 0,
      feedbackScore: feedback.length > 0 ? 
        (feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length) * 20 : 0,
      projectMomentum: project.status === 'active' ? 75 : project.status === 'completed' ? 100 : 25,
      overallHealth: 0 // Calculate based on other metrics
    };
  }

  countDataPoints(projectData) {
    return {
      projectDetails: projectData.project ? 1 : 0,
      teamMembers: projectData.team?.length || 0,
      feedbackEntries: projectData.feedback?.length || 0,
      totalDataPoints: (projectData.project ? 1 : 0) + 
                      (projectData.team?.length || 0) + 
                      (projectData.feedback?.length || 0)
    };
  }

  calculateConfidenceLevel(projectData) {
    const dataPoints = this.countDataPoints(projectData);
    
    if (dataPoints.totalDataPoints >= 10) return 'high';
    if (dataPoints.totalDataPoints >= 5) return 'medium';
    return 'low';
  }

  async healthCheck(req, res) {
    try {
      const aiHealth = await AIService.healthCheck();
      
      // Test database connection
      await this.dbPool.query('SELECT 1');
      
      res.json({
        success: true,
        data: {
          ...aiHealth,
          controllerStatus: 'healthy',
          databaseConnected: true,
          enhancedFeatures: true,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error('❌ Health check error:', error);
      res.status(503).json({
        success: false,
        error: 'Health check failed',
        details: error.message
      });
    }
  }
}

module.exports = new AIController();