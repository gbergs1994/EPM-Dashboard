// Enhanced ProjectDetailsOverview.jsx with Auto-loading AI Insights
import React, { useState, useEffect } from 'react';
import { Target, Award, Activity, Edit, CheckCircle, AlertCircle, TrendingUp, Brain, Loader, Save, RefreshCw } from 'lucide-react';
import apiService from '../services/apiService';

const ProjectDetailsOverview = ({ 
  project, 
  statusColors, 
  priorityColors, 
  PriorityIcon, 
  avgProgress, 
  teamMembersDetailed, 
  projectHistory, 
  formatTimestamp, 
  getActionIcon, 
  getActionColor, 
  onEditProject,
  onUpdateProject,
  setActiveTab,
  currentUser
}) => {
  // AI Insights State
  const [aiInsights, setAiInsights] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [evmDraft, setEvmDraft] = useState({ planned_value: 0, actual_cost: 0, earned_value: 0 });
  const [evmSaving, setEvmSaving] = useState(false);
  const [evmError, setEvmError] = useState('');
  const [milestoneMetrics, setMilestoneMetrics] = useState(null);

  const isProjectManager = currentUser?.role === 'Project Manager';
  const isAssignedToProject = teamMembersDetailed.some(member => Number(member.id) === Number(currentUser?.id));
  const isProjectCreator = Number(project?.created_by) === Number(currentUser?.id);
  const canEditEvm = isProjectManager && (isAssignedToProject || isProjectCreator);

  const loadMilestoneMetrics = async () => {
    if (!project?.id) {
      setMilestoneMetrics(null);
      return;
    }

    try {
      const result = await apiService.getProjectMilestoneMetrics(project.id);
      if (result?.success && result.metrics) {
        setMilestoneMetrics(result.metrics);
      } else {
        setMilestoneMetrics(null);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load milestone metrics for overview:', error.message);
      setMilestoneMetrics(null);
    }
  };

  // AUTO-LOAD AI insights when component mounts or project changes
  useEffect(() => {
    if (project?.id) {
      console.log('🔄 ProjectDetailsOverview mounted/project changed, auto-loading insights...');
      loadAIInsights();
    }
  }, [project?.id]);

  useEffect(() => {
    loadMilestoneMetrics();
  }, [project?.id, project?.updated_at, project?.milestone_count]);

  useEffect(() => {
    const handleMilestoneRefresh = (event) => {
      const updatedProjectId = Number(event?.detail?.projectId);
      if (!Number.isNaN(updatedProjectId) && updatedProjectId === Number(project?.id)) {
        loadMilestoneMetrics();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('project-milestones-updated', handleMilestoneRefresh);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('project-milestones-updated', handleMilestoneRefresh);
      }
    };
  }, [project?.id]);

  useEffect(() => {
    setEvmDraft({
      planned_value: Number(project?.evm?.planned_value ?? project?.planned_value ?? 0),
      actual_cost: Number(project?.evm?.actual_cost ?? project?.actual_cost ?? 0),
      earned_value: Number(project?.evm?.earned_value ?? project?.earned_value ?? 0)
    });
    setEvmError('');
  }, [project?.id, project?.evm, project?.planned_value, project?.actual_cost, project?.earned_value]);

  const toDraftNumber = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const formatCurrency = (value) => `$${Number(value || 0).toLocaleString()}`;
  const formatIndex = (value) => (value == null ? 'N/A' : value.toFixed(2));

  const handleEvmInputChange = (field, value) => {
    setEvmDraft(prev => ({ ...prev, [field]: toDraftNumber(value) }));
    setEvmError('');
  };

  const handleSaveEvm = async () => {
    if (!project?.id || !onUpdateProject) return;

    try {
      setEvmSaving(true);
      setEvmError('');

      const payload = {
        evm: {
          actual_cost: evmDraft.actual_cost,
          earned_value: evmDraft.earned_value
        },
        actual_cost: evmDraft.actual_cost,
        earned_value: evmDraft.earned_value
      };

      await onUpdateProject(payload);
    } catch (error) {
      console.error('❌ Failed to update EVM:', error);
      setEvmError(error.message || 'Failed to update Earned Value metrics');
    } finally {
      setEvmSaving(false);
    }
  };

  const loadAIInsights = async () => {
    if (!project?.id) {
      console.log('⚠️ No project ID for insights');
      return;
    }

    try {
      setInsightsLoading(true);
      setInsightsError(null);
      
      console.log('🧠 Loading BASIC AI insights for project:', project.name);
      
      // First try the dedicated insights endpoint for BASIC insights
      try {
        const response = await apiService.getAIInsights(project.id);
        
        if (response && response.success && response.insights) {
          console.log('✅ Dedicated insights loaded:', response.insights);
          setAiInsights(formatInsightsFromAPI(response.insights));
          setLastUpdated(new Date());
          return;
        }
      } catch (insightsError) {
        console.log('⚠️ Dedicated insights failed, trying basic AI chat:', insightsError.message);
      }

      // Fallback: Generate BASIC insights using AI chat
      await generateBasicInsights();
      
    } catch (error) {
      console.error('❌ Failed to load AI insights:', error);
      setInsightsError(error.message);
      
      // Final fallback to basic insights based on project data
      const fallbackInsights = generateFallbackInsights();
      setAiInsights(fallbackInsights);
      setLastUpdated(new Date());
    } finally {
      setInsightsLoading(false);
    }
  };

  // NEW: Generate BASIC insights using AI chat
  const generateBasicInsights = async () => {
    try {
      console.log('🔍 Generating basic AI insights...');
      
      const insightContext = {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          teamSize: teamMembersDetailed.length
        },
        user: currentUser,
        analysisType: 'basic_overview'
      };
      
      const pmProgress = project.progress?.PM || 0;
      const leadershipProgress = project.progress?.Leadership || 0;
      const changeMgmtProgress = project.progress?.ChangeMgmt || 0;
      const careerDevProgress = project.progress?.CareerDev || 0;
      const avgProgress = (pmProgress + leadershipProgress + changeMgmtProgress + careerDevProgress) / 4;
      
      // Basic prompt for overview insights
      const message = `Provide a basic overview analysis of this project with exactly 3 high-level insights in JSON format:

PROJECT OVERVIEW:
- Name: "${project.name}"
- Status: ${project.status}
- Priority: ${project.priority}
- Team Size: ${teamMembersDetailed.length} members
- Average Progress: ${avgProgress.toFixed(1)}/7

PROGRESS SCORES:
- PM Skills: ${pmProgress}/7
- Leadership: ${leadershipProgress}/7  
- Change Management: ${changeMgmtProgress}/7
- Career Development: ${careerDevProgress}/7

Provide response as JSON:
{
  "insights": [
    {"type": "success|warning|info", "message": "high-level observation 1"},
    {"type": "success|warning|info", "message": "high-level observation 2"},
    {"type": "success|warning|info", "message": "high-level observation 3"}
  ]
}

Guidelines for BASIC insights:
- Focus on overall project health and status
- Identify general strengths and areas needing attention
- Keep observations high-level and descriptive
- success: Overall strong performance or good status
- warning: General areas that need attention
- info: Neutral observations about project state
- Keep messages under 70 characters
- Avoid specific implementation details`;
      
      const response = await apiService.sendAIChat({
        message,
        context: insightContext,
        projectId: project.id
      });
      
      if (response && response.success) {
        console.log('✅ Basic AI response received');
        const parsedInsights = parseAIInsights(response.response);
        
        if (parsedInsights.length > 0) {
          // Mark as basic insights (not enhanced)
          const basicInsights = parsedInsights.map(insight => ({
            ...insight,
            isEnhanced: false
          }));
          
          setAiInsights(basicInsights);
          setLastUpdated(new Date());
          console.log('✅ Basic AI insights generated:', basicInsights.length);
        } else {
          throw new Error('Could not parse basic AI insights');
        }
      } else {
        throw new Error('AI service unavailable for basic insights');
      }
    } catch (error) {
      console.error('❌ Basic insights failed, using fallback:', error);
      
      // Use rule-based fallback
      const fallbackInsights = generateFallbackInsights();
      setAiInsights(fallbackInsights.map(insight => ({ ...insight, isEnhanced: false })));
      setLastUpdated(new Date());
    }
  };

  // Format insights from API response
  const formatInsightsFromAPI = (insights) => {
    if (insights.detailedInsights && Array.isArray(insights.detailedInsights)) {
      return insights.detailedInsights.map(insight => ({
        type: insight.type,
        icon: getInsightIcon(insight.type),
        message: insight.message
      }));
    }
    
    if (insights.recommendations && Array.isArray(insights.recommendations)) {
      return insights.recommendations.map((rec, index) => ({
        type: index === 0 ? 'success' : index === 1 ? 'warning' : 'info',
        icon: getInsightIcon(index === 0 ? 'success' : index === 1 ? 'warning' : 'info'),
        message: rec
      }));
    }
    
    return [];
  };

  // Get appropriate icon for insight type
  const getInsightIcon = (type) => {
    const icons = {
      success: CheckCircle,
      warning: AlertCircle,
      info: TrendingUp,
      error: AlertCircle
    };
    return icons[type] || TrendingUp;
  };

  // Generate fallback insights based on project data - BASIC LEVEL
  const generateFallbackInsights = () => {
    const insights = [];
    
    // Analyze progress scores
    const pmProgress = project.progress?.PM || 0;
    const leadershipProgress = project.progress?.Leadership || 0;
    const changeMgmtProgress = project.progress?.ChangeMgmt || 0;
    const careerDevProgress = project.progress?.CareerDev || 0;
    
    const avgScore = (pmProgress + leadershipProgress + changeMgmtProgress + careerDevProgress) / 4;
    
    // BASIC Progress insights - high level observations
    if (avgScore >= 5.5) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        message: `Strong overall performance with ${avgScore.toFixed(1)}/7 average score`
      });
    } else if (avgScore >= 4) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `Moderate progress across areas - room for improvement`
      });
    } else {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: `Multiple areas need attention - focus on skill development`
      });
    }
    
    // BASIC Team size insights - general observations
    if (teamMembersDetailed.length === 0) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: 'Project lacks team members - consider staffing'
      });
    } else if (teamMembersDetailed.length <= 3) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `Small team of ${teamMembersDetailed.length} - good for agility`
      });
    } else if (teamMembersDetailed.length > 8) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `Large team of ${teamMembersDetailed.length} members - coordination important`
      });
    }
    
    // BASIC Status and priority insights
    if (project.priority === 'critical' && avgScore < 4.5) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: 'Critical priority project showing low progress scores'
      });
    } else if (project.status === 'active' && avgScore >= 5) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        message: 'Active project showing positive momentum'
      });
    } else if (project.status === 'planning') {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: 'Project in planning phase - good foundation building'
      });
    }
    
    // BASIC Career development insight
    if (careerDevProgress === 0 && teamMembersDetailed.length > 0) {
      insights.push({
        type: 'info',
        icon: Award,
        message: 'No career development tracking - opportunity for growth'
      });
    }
    
    // BASIC Activity insight
    if (projectHistory.length === 0) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: 'Limited activity recorded - consider regular updates'
      });
    } else if (projectHistory.length > 15) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        message: 'High activity level - team appears engaged'
      });
    }
    
    return insights.slice(0, 3); // Limit to 3 insights
  };

  // Enhanced AI insights with OpenAI - DEEPER ANALYSIS
  const generateEnhancedInsights = async () => {
    try {
      setInsightsLoading(true);
      setInsightsError(null);
      
      console.log('🚀 Generating ENHANCED deeper AI insights...');
      
      // Create comprehensive context for AI with more detail
      const insightContext = {
        project: {
          id: project.id,
          name: project.name,
          status: project.status,
          priority: project.priority,
          progress: project.progress,
          teamSize: teamMembersDetailed.length,
          teamMembers: teamMembersDetailed.map(member => ({
            name: member.name,
            role: member.role,
            contribution: member.contribution
          })),
          recentActivity: projectHistory.slice(0, 10).map(h => ({
            action: h.action,
            description: h.description,
            type: h.type,
            timestamp: h.timestamp
          })),
          deadline: project.deadline
        },
        user: currentUser,
        analysisType: 'enhanced_deep_dive'
      };
      
      // Calculate additional metrics for deeper analysis
      const pmProgress = project.progress?.PM || 0;
      const leadershipProgress = project.progress?.Leadership || 0;
      const changeMgmtProgress = project.progress?.ChangeMgmt || 0;
      const careerDevProgress = project.progress?.CareerDev || 0;
      const avgProgress = (pmProgress + leadershipProgress + changeMgmtProgress + careerDevProgress) / 4;
      
      // Identify specific improvement areas
      const lowestScore = Math.min(pmProgress, leadershipProgress, changeMgmtProgress, careerDevProgress);
      const highestScore = Math.max(pmProgress, leadershipProgress, changeMgmtProgress, careerDevProgress);
      const progressGap = highestScore - lowestScore;
      
      // Enhanced prompt for DEEPER insights with improvement focus
      const message = `As a senior project management consultant, provide a DEEP DIVE analysis of this project with exactly 3 specific improvement-focused insights in JSON format:

DETAILED PROJECT ANALYSIS:
Project: "${project.name}"
Status: ${project.status} | Priority: ${project.priority}
Overall Progress Average: ${avgProgress.toFixed(1)}/7

PROGRESS BREAKDOWN:
- PM Skills: ${pmProgress}/7 ${pmProgress < 4 ? '(NEEDS IMPROVEMENT)' : pmProgress >= 6 ? '(EXCELLENT)' : '(GOOD)'}
- Leadership: ${leadershipProgress}/7 ${leadershipProgress < 4 ? '(NEEDS IMPROVEMENT)' : leadershipProgress >= 6 ? '(EXCELLENT)' : '(GOOD)'}
- Change Management: ${changeMgmtProgress}/7 ${changeMgmtProgress < 4 ? '(NEEDS IMPROVEMENT)' : changeMgmtProgress >= 6 ? '(EXCELLENT)' : '(GOOD)'}
- Career Development: ${careerDevProgress}/7 ${careerDevProgress < 4 ? '(NEEDS IMPROVEMENT)' : careerDevProgress >= 6 ? '(EXCELLENT)' : '(GOOD)'}

PERFORMANCE ANALYSIS:
- Progress Variance: ${progressGap.toFixed(1)} points gap between highest and lowest scores
- Team Size: ${teamMembersDetailed.length} members
- Activity Level: ${projectHistory.length} recorded activities
- Deadline Pressure: ${project.deadline ? 'Has deadline' : 'No deadline set'}

${teamMembersDetailed.length > 0 ? `TEAM COMPOSITION:
${teamMembersDetailed.slice(0, 5).map(member => `- ${member.name}: ${member.role} (${member.contribution || 'Unknown'}% contribution)`).join('\n')}` : '- No team members assigned'}

${projectHistory.length > 0 ? `RECENT ACTIVITY PATTERNS:
${projectHistory.slice(0, 5).map(h => `- ${h.description} (${h.type})`).join('\n')}` : '- No recent activity recorded'}

PROVIDE STRATEGIC IMPROVEMENT INSIGHTS as JSON:
{
  "insights": [
    {"type": "success|warning|info", "message": "improvement strategy 1"},
    {"type": "success|warning|info", "message": "improvement strategy 2"}, 
    {"type": "success|warning|info", "message": "improvement strategy 3"}
  ]
}

INSIGHT REQUIREMENTS:
- Focus on SPECIFIC, ACTIONABLE improvement strategies
- Identify skill gaps and provide concrete solutions
- Address the lowest-performing areas with targeted recommendations
- Include team optimization suggestions if applicable
- Mention specific tools, techniques, or approaches
- Each insight should be implementable within 1-2 weeks
- Keep messages under 80 characters but be specific
- Use these types strategically:
  * warning: Critical areas needing immediate attention (scores <4)
  * info: Strategic improvements and optimizations
  * success: Leverage strengths to improve other areas

Examples of GOOD enhanced insights:
- "Implement daily standups to boost PM score from ${pmProgress} to 6+"
- "Assign mentorship pairs to improve leadership feedback scores"
- "Use change management framework like ADKAR for better adoption"
- "Create skill development plans to address career growth gaps"`;
      
      const response = await apiService.sendAIChat({
        message,
        context: insightContext,
        projectId: project.id
      });
      
      if (response && response.success) {
        console.log('✅ Enhanced AI response received for deeper insights');
        
        // Try to parse AI response into structured insights
        const parsedInsights = parseAIInsights(response.response);
        
        if (parsedInsights.length > 0) {
          // Mark insights as enhanced for visual distinction
          const enhancedInsights = parsedInsights.map(insight => ({
            ...insight,
            isEnhanced: true
          }));
          
          setAiInsights(enhancedInsights);
          setLastUpdated(new Date());
          console.log('✅ Enhanced deeper AI insights generated:', enhancedInsights.length);
        } else {
          throw new Error('Could not parse enhanced AI insights');
        }
      } else {
        throw new Error('AI service unavailable');
      }
    } catch (error) {
      console.error('❌ Enhanced insights failed:', error);
      setInsightsError('Enhanced AI insights temporarily unavailable');
      
      // Fall back to generated improvement insights
      const improvementInsights = generateImprovementInsights();
      setAiInsights(improvementInsights);
      setLastUpdated(new Date());
    } finally {
      setInsightsLoading(false);
    }
  };

  // Generate improvement-focused fallback insights
  const generateImprovementInsights = () => {
    const insights = [];
    
    const pmProgress = project.progress?.PM || 0;
    const leadershipProgress = project.progress?.Leadership || 0;
    const changeMgmtProgress = project.progress?.ChangeMgmt || 0;
    const careerDevProgress = project.progress?.CareerDev || 0;
    
    // Find the lowest scoring area for targeted improvement
    const scores = [
      { area: 'PM', score: pmProgress, label: 'traditional project management' },
      { area: 'Leadership', score: leadershipProgress, label: 'leadership' },
      { area: 'ChangeMgmt', score: changeMgmtProgress, label: 'change management' },
      { area: 'CareerDev', score: careerDevProgress, label: 'career development' }
    ];
    
    const lowestScore = scores.reduce((min, current) => current.score < min.score ? current : min);
    const highestScore = scores.reduce((max, current) => current.score > max.score ? current : max);
    
    // Improvement insight for lowest scoring area
    if (lowestScore.score < 4) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: `Focus on ${lowestScore.label} - implement daily check-ins to boost from ${lowestScore.score} to 5+`,
        isEnhanced: true
      });
    } else if (lowestScore.score < 6) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: `Strengthen ${lowestScore.label} with structured framework approach`,
        isEnhanced: true
      });
    }
    
    // Leverage strength insight
    if (highestScore.score >= 5) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        message: `Leverage strong ${highestScore.label} (${highestScore.score}/7) to mentor weaker areas`,
        isEnhanced: true
      });
    }
    
    // Team-specific improvement
    if (teamMembersDetailed.length === 0) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: 'Recruit 2-3 key team members with complementary skills immediately',
        isEnhanced: true
      });
    } else if (teamMembersDetailed.length < 3) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: 'Cross-train team members to reduce single points of failure',
        isEnhanced: true
      });
    } else if (teamMembersDetailed.length > 8) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: 'Create sub-teams with clear leads to improve coordination',
        isEnhanced: true
      });
    }
    
    // Priority-based improvement
    if (project.priority === 'critical' && pmProgress < 5) {
      insights.push({
        type: 'warning',
        icon: AlertCircle,
        message: 'Implement war room sessions for critical project acceleration',
        isEnhanced: true
      });
    }
    
    // Activity improvement
    if (projectHistory.length < 3) {
      insights.push({
        type: 'info',
        icon: TrendingUp,
        message: 'Set up weekly progress reviews to increase visibility and momentum',
        isEnhanced: true
      });
    }
    
    // Career development improvement
    if (careerDevProgress === 0 && teamMembersDetailed.length > 0) {
      insights.push({
        type: 'info',
        icon: Award,
        message: 'Launch 30-60-90 day development plans for each team member',
        isEnhanced: true
      });
    }
    
    return insights.slice(0, 3);
  };

  // Parse AI response into structured insights
  const parseAIInsights = (aiText) => {
    const insights = [];
    
    try {
      // Try to parse as JSON first
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.insights && Array.isArray(parsed.insights)) {
          return parsed.insights.map(insight => ({
            type: insight.type || 'info',
            icon: getInsightIcon(insight.type || 'info'),
            message: insight.message || 'AI analysis completed'
          }));
        }
      }
    } catch (jsonError) {
      console.log('⚠️ JSON parsing failed, extracting from text');
    }
    
    // Fallback: Extract insights from text
    const lines = aiText.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^\d+\./) || trimmedLine.includes('insight') || trimmedLine.includes('recommendation')) {
        let type = 'info';
        
        // Determine type based on keywords
        if (trimmedLine.toLowerCase().includes('excellent') || 
            trimmedLine.toLowerCase().includes('strong') ||
            trimmedLine.toLowerCase().includes('good') ||
            trimmedLine.toLowerCase().includes('performing well')) {
          type = 'success';
        } else if (trimmedLine.toLowerCase().includes('warning') || 
                   trimmedLine.toLowerCase().includes('attention') ||
                   trimmedLine.toLowerCase().includes('concern') ||
                   trimmedLine.toLowerCase().includes('needs')) {
          type = 'warning';
        }
        
        // Clean the message
        let message = trimmedLine
          .replace(/^\d+\.\s*/, '')
          .replace(/\[Type:.*?\]\s*/, '')
          .replace(/^(insight|recommendation):\s*/i, '');
        
        if (message.length > 10 && message.length < 150) {
          insights.push({
            type,
            icon: getInsightIcon(type),
            message: message.substring(0, 80) + (message.length > 80 ? '...' : '')
          });
        }
      }
    });
    
    return insights.slice(0, 3); // Limit to 3 insights
  };

  const getInsightColor = (type) => {
    const colors = {
      success: '#10b981',
      warning: '#f59e0b',
      info: '#3b82f6',
      error: '#ef4444'
    };
    return colors[type] || '#6b7280';
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    console.log('🔄 Manual refresh requested...');
    await loadAIInsights();
  };

  const plannedValue = Number(evmDraft.planned_value) || 0;
  const actualCost = Number(evmDraft.actual_cost) || 0;
  const earnedValue = Number(evmDraft.earned_value) || 0;
  const projectBeneficiary =
    (typeof project.stakeholder === 'string' && project.stakeholder.trim()) ||
    (typeof project.beneficiary === 'string' && project.beneficiary.trim()) ||
    (typeof project.who_benefits_from_this_project === 'string' && project.who_benefits_from_this_project.trim()) ||
    (typeof project.whoBenefitsFromThisProject === 'string' && project.whoBenefitsFromThisProject.trim()) ||
    'Not specified';
  const hasMilestones = (Number(milestoneMetrics?.total_milestones) || 0) > 0;
  const hasCurrentMilestoneMetrics = hasMilestones && (Number(milestoneMetrics?.current_milestone_id) || 0) > 0;
  const effectivePlannedValue = hasCurrentMilestoneMetrics
    ? Number(milestoneMetrics?.current_planned_value) || 0
    : hasMilestones
      ? Number(milestoneMetrics?.total_planned_value) || 0
      : plannedValue;
  const effectiveActualCost = hasCurrentMilestoneMetrics
    ? Number(milestoneMetrics?.current_actual_cost) || 0
    : hasMilestones
      ? Number(milestoneMetrics?.total_actual_cost) || 0
      : actualCost;
  const effectiveEarnedValue = hasCurrentMilestoneMetrics
    ? Number(milestoneMetrics?.current_earned_value) || 0
    : hasMilestones
      ? Number(milestoneMetrics?.total_earned_value) || 0
      : earnedValue;
  const scheduleVariance = effectiveEarnedValue - effectivePlannedValue;
  const costVariance = effectiveEarnedValue - effectiveActualCost;
  const originalSpi = effectivePlannedValue > 0 ? effectiveEarnedValue / effectivePlannedValue : null;
  const currentMilestoneCompletionRatio = hasCurrentMilestoneMetrics
    ? (Number(milestoneMetrics?.current_milestone_completion_percentage) || 0) / 100
    : null;
  const completionBasedEarnedValue = hasCurrentMilestoneMetrics
    ? currentMilestoneCompletionRatio * effectivePlannedValue
    : null;
  const spi = hasCurrentMilestoneMetrics
    ? (effectivePlannedValue > 0 ? completionBasedEarnedValue / effectivePlannedValue : null)
    : originalSpi;
  const cpi = effectiveActualCost > 0 ? effectiveEarnedValue / effectiveActualCost : null;
  const displayActualCost = effectiveEarnedValue;
  const displayEarnedValue = originalSpi;
  const displaySpi = spi;

  const getVarianceInterpretation = (value, positiveLabel, negativeLabel) => {
    if (value > 0) return positiveLabel;
    if (value < 0) return negativeLabel;
    return 'On Target';
  };

  const getIndexInterpretation = (
    value,
    aboveOneLabel,
    belowOneLabel,
    exceptionallyAboveLabel,
    extremelyBelowLabel
  ) => {
    if (value == null) return 'Unavailable';
    if (value > 1.5) return exceptionallyAboveLabel;
    if (value < 0.5) return extremelyBelowLabel;
    if (value > 1) return aboveOneLabel;
    if (value < 1) return belowOneLabel;
    return 'On Plan';
  };

  const getKpiBadgeStyle = (status) => {
    if (status === 'positive') {
      return { bg: '#dcfce7', text: '#166534', border: '#86efac' };
    }
    if (status === 'negative') {
      return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' };
    }
    return { bg: '#e5e7eb', text: '#374151', border: '#d1d5db' };
  };

  const renderKpiBadge = (label, interpretation, status) => {
    const badge = getKpiBadgeStyle(status);
    return (
      <div style={{ fontSize: '0.76rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{
          padding: '0.12rem 0.5rem',
          borderRadius: '9999px',
          backgroundColor: badge.bg,
          color: badge.text,
          border: `1px solid ${badge.border}`,
          fontWeight: '600'
        }}>
          {interpretation}
        </span>
      </div>
    );
  };

  return (
    <div className="project-details-overview" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
      {/* Left Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Project Description */}
        <div className="project-description-card" style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
            Project Description
          </h3>
          <p style={{ color: '#6b7280', lineHeight: '1.625', margin: 0 }}>
            {project.description}
          </p>
        </div>

        <div className="project-beneficiary-card" style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
            Who benefits from the outputs of the project?
          </h3>
          <p style={{ color: '#6b7280', lineHeight: '1.625', margin: 0 }}>
            {projectBeneficiary}
          </p>
        </div>

        {/* Progress Breakdown */}
        <div className="project-metrics-card" style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
            Enhanced Project Metrics
          </h3>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Track both project completion and team feedback across different areas
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              { key: 'PM', label: 'Traditional Project Management (Actual Progress)', color: '#3b82f6', icon: Target, isMainProgress: true },
              { key: 'Leadership', label: 'Leadership (Team Feedback)', color: '#10b981', icon: Award, isMainProgress: false },
              { key: 'ChangeMgmt', label: 'Organizational Change Management (Team Feedback)', color: '#8b5cf6', icon: Activity, isMainProgress: false },
              { key: 'CareerDev', label: 'Career Development (Team Feedback)', color: '#f59e0b', icon: TrendingUp, isMainProgress: false }
            ].map(category => {
              const Icon = category.icon;
              const progress = project.progress[category.key];
              const percentage = (progress / 7) * 100;

              return (
                <div key={category.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Icon size={16} style={{ color: category.color }} />
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                        {category.label}
                      </span>
                      {category.isMainProgress && (
                        <span style={{
                          fontSize: '0.75rem',
                          backgroundColor: '#eff6ff',
                          color: '#2563eb',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          fontWeight: '500'
                        }}>
                          Main Progress
                        </span>
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: category.color,
                      backgroundColor: `${category.color}15`,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '9999px'
                    }}>
                      {progress}/7
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '0.5rem', backgroundColor: '#e5e7eb', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        backgroundColor: category.color,
                        width: `${percentage}%`,
                        borderRadius: '9999px',
                        transition: 'width 0.8s ease-in-out'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="project-activity-card" style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
            Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {projectHistory.slice(0, 3).map(item => {
              const Icon = getActionIcon(item.type);
              return (
                <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{
                    width: '2rem',
                    height: '2rem',
                    borderRadius: '50%',
                    backgroundColor: `${getActionColor(item.type)}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={14} style={{ color: getActionColor(item.type) }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: '#111827', margin: '0 0 0.25rem 0' }}>
                      {item.description}
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                      {formatTimestamp(item.timestamp)} by {item.user}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Project Stats */}
        <div className="project-stats-card" style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', marginBottom: '1.5rem' }}>
            Project Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Status</span>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: '600',
                backgroundColor: statusColors.bg,
                color: statusColors.text,
                border: `1px solid ${statusColors.border}`
              }}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Priority</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PriorityIcon size={14} style={{ color: priorityColors.text }} />
                <span style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  backgroundColor: priorityColors.bg,
                  color: priorityColors.text
                }}>
                  {project.priority}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Progress</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                {avgProgress}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Team Size</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                {teamMembersDetailed.length} members
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Deadline</span>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                {project.deadline ? new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline set'}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1f2937' }}>
              Earned Value Quick Details
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
              <span>Planned Value (PV)</span>
              <strong>{formatCurrency(effectivePlannedValue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
              <span>Actual Cost (AC)</span>
              <strong>{formatCurrency(displayActualCost)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
              <span>Earned Value (EV)</span>
              <strong>{formatIndex(displayEarnedValue)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
              <span>Schedule Performance Index (SPI)</span>
              <strong>{formatIndex(displaySpi)}</strong>
            </div>

            {hasMilestones && hasCurrentMilestoneMetrics && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#475569' }}>
                Values shown for current milestone: {milestoneMetrics.current_milestone_title || 'Untitled milestone'}.
              </p>
            )}

            {hasMilestones && !hasCurrentMilestoneMetrics && (
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#475569' }}>
                Values are aggregated from project milestones.
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#4b5563' }}>
              <span>Cost Performance Index (CPI)</span>
              <strong>{formatIndex(cpi)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: scheduleVariance >= 0 ? '#065f46' : '#991b1b' }}>
              <span>Schedule Variance (EV - PV)</span>
              <strong>{formatCurrency(scheduleVariance)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: costVariance >= 0 ? '#065f46' : '#991b1b' }}>
              <span>Cost Variance (EV - AC)</span>
              <strong>{formatCurrency(costVariance)}</strong>
            </div>

            <div style={{
              marginTop: '0.5rem',
              paddingTop: '0.75rem',
              borderTop: '1px dashed #d1d5db',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: '700', color: '#334155' }}>
                KPI Summary
              </p>
              {renderKpiBadge(
                'SV',
                getVarianceInterpretation(scheduleVariance, 'Ahead of Schedule', 'Behind Schedule'),
                scheduleVariance > 0 ? 'positive' : scheduleVariance < 0 ? 'negative' : 'neutral'
              )}
              {renderKpiBadge(
                'CV',
                getVarianceInterpretation(costVariance, 'Under Budget', 'Over Budget'),
                costVariance > 0 ? 'positive' : costVariance < 0 ? 'negative' : 'neutral'
              )}
              {renderKpiBadge(
                'SPI',
                getIndexInterpretation(
                  spi,
                  'Ahead of Schedule',
                  'Behind Schedule',
                  'Exceptionally ahead of schedule',
                  'extremely behind schedule'
                ),
                spi == null ? 'neutral' : spi > 1 ? 'positive' : spi < 1 ? 'negative' : 'neutral'
              )}
              {renderKpiBadge(
                'CPI',
                getIndexInterpretation(
                  cpi,
                  'Under Budget',
                  'Over Budget',
                  'Exceptionally under budget',
                  'Extremely over budget'
                ),
                cpi == null ? 'neutral' : cpi > 1 ? 'positive' : cpi < 1 ? 'negative' : 'neutral'
              )}
            </div>
          </div>

          {canEditEvm && !hasMilestones && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #dbeafe',
              backgroundColor: '#f8fbff'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#1e40af', fontWeight: '600' }}>
                Update Cost and Earned Value Inputs
              </p>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {[
                  { key: 'actual_cost', label: 'Actual Cost (AC)' },
                  { key: 'earned_value', label: 'Earned Value (EV)' }
                ].map(field => (
                  <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#475569' }}>{field.label}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={evmDraft[field.key]}
                      onChange={(e) => handleEvmInputChange(field.key, e.target.value)}
                      style={{
                        border: '1px solid #bfdbfe',
                        borderRadius: '0.375rem',
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.8rem'
                      }}
                    />
                  </label>
                ))}
              </div>
              {evmError && (
                <p style={{ margin: '0.5rem 0 0 0', color: '#b91c1c', fontSize: '0.75rem' }}>
                  {evmError}
                </p>
              )}
              <button
                onClick={handleSaveEvm}
                disabled={evmSaving}
                style={{
                  marginTop: '0.75rem',
                  width: '100%',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: '#1d4ed8',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: evmSaving ? 'not-allowed' : 'pointer',
                  opacity: evmSaving ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem'
                }}
              >
                <Save size={14} />
                {evmSaving ? 'Saving...' : 'Save EVM Metrics'}
              </button>
            </div>
          )}

          {!canEditEvm && isProjectManager && (
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              EVM values are editable by project managers assigned to this project.
            </p>
          )}

          {canEditEvm && hasMilestones && (
            <p style={{ margin: '0.75rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              EVM values are milestone-aggregated. Update milestone progress/costs in the Milestones tab.
            </p>
          )}

          {/* Edit Project Button */}
          <button
            onClick={() => {
              console.log('🔧 Edit button clicked in ProjectDetails');
              if (onEditProject) {
                onEditProject();
              }
            }}
            style={{
              width: '100%',
              marginTop: '1.5rem',
              background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Edit size={16} />
            Edit Project
          </button>
        </div>

        {/* Team Preview */}
        <div className="project-team-preview-card" style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Team Members
            </h3>
            <button
              onClick={() => setActiveTab('team')}
              style={{
                fontSize: '0.75rem',
                color: '#2563eb',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              View All
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {teamMembersDetailed.slice(0, 4).map(member => (
              <div key={member.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '600'
                }}>
                  {member.avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827', margin: 0 }}>
                    {member.name}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                    {member.role}
                  </p>
                </div>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: member.status === 'active' ? '#10b981' : '#f59e0b'
                }} />
              </div>
            ))}
          </div>
        </div>

        {/* AUTO-LOADING AI INSIGHTS */}
        <div className="project-ai-insights" style={{
          background: 'linear-gradient(to right, #eff6ff, #eef2ff)',
          borderRadius: '0.75rem',
          border: '1px solid #dbeafe',
          padding: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '700',
              color: '#1e40af',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Brain size={20} />
              AI Insights
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={generateEnhancedInsights}
                disabled={insightsLoading}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '0.375rem',
                  color: '#1e40af',
                  cursor: insightsLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: insightsLoading ? 0.6 : 1
                }}
                title="Generate enhanced AI insights"
              >
                {insightsLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Brain size={12} />}
                {insightsLoading ? 'Thinking...' : 'Enhance'}
              </button>
              <button
                onClick={handleManualRefresh}
                disabled={insightsLoading}
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'rgba(37, 99, 235, 0.1)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  borderRadius: '0.375rem',
                  color: '#1e40af',
                  cursor: insightsLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  opacity: insightsLoading ? 0.6 : 1
                }}
                title="Refresh insights"
              >
                {insightsLoading ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={12} />}
                Refresh
              </button>
            </div>
          </div>
          
          {insightsLoading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem',
              color: '#1e40af'
            }}>
              <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ marginLeft: '0.5rem' }}>Analyzing project...</span>
            </div>
          ) : insightsError ? (
            <div style={{ 
              padding: '1rem',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '0.5rem',
              color: '#991b1b'
            }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                {insightsError}
              </p>
            </div>
          ) : aiInsights && aiInsights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Show enhanced badge if insights are enhanced */}
              {aiInsights.some(insight => insight.isEnhanced) && (
                <div style={{
                  padding: '0.5rem',
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.2)',
                  borderRadius: '0.375rem',
                  marginBottom: '0.5rem'
                }}>
                  <p style={{ 
                    margin: 0, 
                    fontSize: '0.75rem', 
                    color: '#7c3aed',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    🚀 Enhanced Deep-Dive Analysis - Improvement Focused
                  </p>
                </div>
              )}
              
              {aiInsights.map((insight, index) => {
                const IconComponent = insight.icon;
                return (
                  <div className="project-ai-insight-item" 
                    key={index} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.5rem',
                      padding: insight.isEnhanced ? '0.75rem' : '0.5rem',
                      backgroundColor: insight.isEnhanced ? 'rgba(255, 255, 255, 0.8)' : 'transparent',
                      borderRadius: insight.isEnhanced ? '0.5rem' : '0',
                      border: insight.isEnhanced ? '1px solid rgba(139, 92, 246, 0.2)' : 'none'
                    }}
                  >
                    <IconComponent 
                      size={16} 
                      style={{ 
                        color: getInsightColor(insight.type), 
                        marginTop: '0.125rem',
                        flexShrink: 0
                      }} 
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ 
                        fontSize: '0.875rem', 
                        color: '#1e40af', 
                        margin: 0, 
                        lineHeight: '1.4',
                        fontWeight: insight.isEnhanced ? '500' : '400'
                      }}>
                        {insight.message}
                      </p>
                      {insight.isEnhanced && (
                        <span style={{
                          fontSize: '0.65rem',
                          color: '#7c3aed',
                          fontWeight: '600',
                          marginTop: '0.25rem',
                          display: 'inline-block'
                        }}>
                          IMPROVEMENT STRATEGY
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {lastUpdated && (
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#64748b', 
                  margin: '0.5rem 0 0 0',
                  fontStyle: 'italic'
                }}>
                  {aiInsights.some(insight => insight.isEnhanced) ? 'Enhanced insights updated' : 'Updated'} {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '1rem',
              textAlign: 'center',
              color: '#64748b'
            }}>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                Loading insights automatically...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsOverview;