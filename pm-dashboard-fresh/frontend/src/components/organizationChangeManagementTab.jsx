// frontend/src/components/OrganizationalChangeManagementTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Award, 
  History, 
  Plus, 
  Eye, 
  BarChart3, 
  AlertCircle, 
  Filter, 
  TrendingUp, 
  Users, 
  Target,
  Brain,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Activity,
  Loader,
  X,
  ChevronLeft,
  ChevronRight,
  Shuffle
} from 'lucide-react';
import apiService from '../services/apiService';
import {
  RadarChart,
  BarChart,
  AssessmentCard,
  HistoryModal,
  AssessmentDetailsModal
} from './OrganizationalChangeHistoryComponents';
import {
  ProgressCircle,
  HorizontalProgressBars,
  TrendLineChart,
  ComparisonMatrix
} from './EnhancedVisualizationComponents';

// Helper function to safely handle null/undefined values
const safeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const OrganizationalChangeManagementTab = ({ currentUser, onDataChange }) => {
  const [assessments, setAssessments] = useState([]);
  const [teamAssessments, setTeamAssessments] = useState([]); // For team metrics calculation
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState('progress'); // 'progress', 'bars', 'trend', 'comparison', 'chart'
  const [formError, setFormError] = useState(false); // To contol whether error display triggers inside form assesment

  // Chart visibility controls
  const [chartVisibility, setChartVisibility] = useState({
    vision: true,
    alignment: true,
    understanding: true,
    enactment: true
  });
  
  // Form state for multi-step Organizational Change Management assessment
  const [responses, setResponses] = useState({});
  const [currentDimension, setCurrentDimension] = useState('vision');
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [selectedProjectForAssessment, setSelectedProjectForAssessment] = useState('');

  // Organizational Change Management Assessment framework
  const organizationalChangeFramework = {
    vision: {
      title: 'Vision',
      description: 'Measuring the strength of the project vision to sustain an inspiring direction.',
      details: 'Evaluate how compelling the project vision is to motivate stakeholders.',
      color: '#3b82f6',
      questions: [
        {
          key: 'vision_strength',
          question: 'The strength of the project vision will prompt the desired change.',
          description: 'Consider these things: the project vision has specific details describing the intent and purpose, yet is far-reaching and aspirational to encourage action through the entire system.',
          scale: 'Rate from 1 (very unclear/not compelling) to 7 (exceptionally clear and compelling)'
        }
      ]
    },
    alignment: {
      title: 'Alignment',
      description: 'Identifying gaps in the organization that need to be aligned to support the vision.',
      details: 'Evaluate how well systems, structures, and resources in the organization support the vision.',
      color: '#10b981',
      questions: [
        {
          key: 'know_alignment',
          question: 'Resources are aligned to help people KNOW how to do the change.',
          description: 'Consider these things: work processes which will be affected, jobs impacted, training needed.',
          scale: 'Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)'
        },
        {
          key: 'do_alignment',
          question: 'Tangible resources are aligned which help people physically be able to DO the change.',
          description: 'Consider these things: technology changes, people interactions, operational processes.',
          scale: 'Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)'
        },
        {
          key: 'want_alignment',
          question: 'The right structures have been aligned which will help people WANT to change.',
          description: 'Consider these things: expectations/incentives/rewards for employees, approval processes, communication channels, decision-making scope, changed organizational outputs.',
          scale: 'Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)'
        },
        {
          key: 'why_context',
          question: 'Reasons for the change clearly provide a context for people to know WHY change is important.',
          description: 'Consider these things: what is personally meaningful to them about quality, profitability, corporate direction.',
          scale: 'Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)'
        }
      ]
    },
    understanding: {
      title: 'Understanding',
      description: 'Identifying how stakeholders exhibit knowledge and show behaviors consistent with the project vision.',
      details: 'Preparing people and the environment so they are "ready" for the solutions.',
      color: '#f59e0b',
      questions: [
        {
          key: 'awareness_of_change',
          question: 'People affected by the project are aware of how the project outcomes will be different than what they do now',
          description: 'Consider these things: communication structures are established, the project is able to discover any misunderstandings, resistance, or disconnects',
          scale: 'Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)'
        },
        {
          key: 'positive_support',
          question: 'People affected by the project show positive support for the project.',
          description: 'Consider these things: finding ways to resolve issues and blocks, talking about who, what, and how things will change',
          scale: 'Rate from 1 (Strongly Disagree) to 7 (Strongly Agree)'
        }
      ]
    },
    enactment: {
      title: 'Enactment',
      description: 'Showing consistency and effectiveness in living the vision.',
      details: 'Measuring how concrete actions are producing measurable results consistent with the project vision.',
      color: '#8b5cf6',
      questions: [
        {
          key: 'action_consistency',
          question: 'How consistently do your actions align with your stated vision?',
          description: 'Assess the degree to which your behaviors and decisions reflect your stated vision.',
          scale: 'Rate from 1 (actions rarely align) to 7 (actions consistently align)'
        },
        {
          key: 'adaptive_approach',
          question: 'How effectively do you adapt your approach while maintaining vision integrity?',
          description: 'Evaluate your ability to adjust tactics and methods without compromising the core vision.',
          scale: 'Rate from 1 (poor adaptation) to 7 (excellent adaptive capability)'
        },
        {
          key: 'progress_measurement',
          question: 'How effectively do you measure progress towards your vision?',
          description: 'Consider your ability to establish metrics and track advancement toward vision achievement.',
          scale: 'Rate from 1 (poor measurement) to 7 (excellent progress measurement)'
        },
        {
          key: 'feedback_incorporation',
          question: 'How well do you incorporate feedback to improve your vision?',
          description: 'Assess your openness to feedback and ability to refine your vision based on input.',
          scale: 'Rate from 1 (poor feedback incorporation) to 7 (excellent feedback incorporation)'
        }
      ]
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedProject !== null) {
      loadAssessments();
      loadTeamAssessmentsForMetrics();
    }
  }, [selectedProject]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProjects(), 
        loadAssessments(), 
        loadTeamAssessmentsForMetrics()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
      setFormError(false);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      console.log('📊 Loading projects for organizational change assessment...');
      
      const projectsData = await apiService.getProjects();
      console.log('📊 Raw projects response:', projectsData);
      
      if (projectsData && projectsData.success && projectsData.data) {
        console.log('✅ Projects loaded from data field:', projectsData.data.length, 'projects');
        setProjects(projectsData.data);
      } else if (projectsData && projectsData.projects) {
        console.log('✅ Projects loaded from projects field:', projectsData.projects.length, 'projects');
        setProjects(projectsData.projects);
      } else if (Array.isArray(projectsData)) {
        console.log('✅ Projects loaded as array:', projectsData.length, 'projects');
        setProjects(projectsData);
      } else {
        console.warn('⚠️ No projects found or unexpected response format');
        console.log('🔍 Response structure:', Object.keys(projectsData || {}));
        setProjects([]);
      }
    } catch (error) {
      console.error('❌ Error loading projects for organizational change:', error);
      setProjects([]);
    }
  };

  const loadAssessments = async () => {
    try {
      console.log('📋 Loading assessments for current user...');
      
      // Pass project ID directly instead of params object
      const assessmentsData = await apiService.getOrganizationalChangeAssessments(selectedProject);
      if (assessmentsData && assessmentsData.assessments) {
        setAssessments(assessmentsData.assessments);
      }
    } catch (error) {
      console.error('Error loading organizational change assessments:', error);
      setError('Failed to load assessments. Please try again.');
      setFormError(false);
    }
  };

  // Load ALL team assessments for metrics calculation (no role filtering)
  const loadTeamAssessmentsForMetrics = async () => {
    try {
      console.log('📊 Loading team assessments for metrics calculation...');
      
      // Use the analytics endpoint to get all team data
      const response = await apiService.getOrganizationalChangeAnalytics(selectedProject);
      
      if (response.success && response.assessments) {
        console.log('✅ Team assessments for metrics loaded:', response.assessments.length);
        setTeamAssessments(response.assessments);
      } else {
        console.warn('⚠️ No team assessment data received');
        setTeamAssessments([]);
      }
    } catch (error) {
      console.error('Error loading team assessments for metrics:', error);
      setTeamAssessments([]);
    }
  };

  // Calculate change management metrics from ALL assessments (team averages)
  const calculateChangeMetrics = () => {
    // Use teamAssessments for metrics calculation (includes all team data)
    const dataToUse = teamAssessments.length > 0 ? teamAssessments : assessments;
    
    if (!dataToUse || dataToUse.length === 0) {
      return {
        vision: 0,
        alignment: 0,
        understanding: 0,
        enactment: 0,
        overall: 0,
        count: 0
      };
    }

    const filteredAssessments = selectedProject === 'all' 
      ? dataToUse
      : dataToUse.filter(assessment => 
          assessment.project_id === parseInt(selectedProject) || 
          assessment.project_id === selectedProject
        );

    if (filteredAssessments.length === 0) {
      return {
        vision: 0,
        alignment: 0,
        understanding: 0,
        enactment: 0,
        overall: 0,
        count: 0
      };
    }

    let visionTotal = 0, visionCount = 0;
    let alignmentTotal = 0, alignmentCount = 0;
    let understandingTotal = 0, understandingCount = 0;
    let enactmentTotal = 0, enactmentCount = 0;
    let overallTotal = 0, overallCount = 0;

    filteredAssessments.forEach(assessment => {
      const visionScore = safeNumber(assessment.vision_score, 0);
      const alignmentScore = safeNumber(assessment.alignment_score, 0);
      const understandingScore = safeNumber(assessment.understanding_score, 0);
      const enactmentScore = safeNumber(assessment.enactment_score, 0);

      if (visionScore > 0) {
        visionTotal += visionScore;
        visionCount++;
      }
      if (alignmentScore > 0) {
        alignmentTotal += alignmentScore;
        alignmentCount++;
      }
      if (understandingScore > 0) {
        understandingTotal += understandingScore;
        understandingCount++;
      }
      if (enactmentScore > 0) {
        enactmentTotal += enactmentScore;
        enactmentCount++;
      }

      const assessmentOverall = (visionScore + alignmentScore + understandingScore + enactmentScore) / 4;
      if (assessmentOverall > 0) {
        overallTotal += assessmentOverall;
        overallCount++;
      }
    });

    const metrics = {
      vision: visionCount > 0 ? visionTotal / visionCount : 0,
      alignment: alignmentCount > 0 ? alignmentTotal / alignmentCount : 0,
      understanding: understandingCount > 0 ? understandingTotal / understandingCount : 0,
      enactment: enactmentCount > 0 ? enactmentTotal / enactmentCount : 0,
      overall: overallCount > 0 ? overallTotal / overallCount : 0,
      count: filteredAssessments.length
    };

    console.log('📈 Team Average Change Management Metrics:', {
      vision: metrics.vision.toFixed(2),
      alignment: metrics.alignment.toFixed(2), 
      understanding: metrics.understanding.toFixed(2),
      enactment: metrics.enactment.toFixed(2),
      overall: metrics.overall.toFixed(2),
      assessments: metrics.count,
      dataSource: teamAssessments.length > 0 ? 'teamAssessments' : 'userAssessments'
    });

    return metrics;
  };

  // Helper function to get score color based on value
  const getScoreColor = (score) => {
    const safeScore = safeNumber(score, 0);
    if (safeScore >= 6) return '#22c55e'; // green - excellent
    if (safeScore >= 4) return '#eab308'; // yellow - good
    if (safeScore >= 2) return '#f97316'; // orange - developing
    return '#ef4444'; // red - needs improvement
  };

  // Helper function to get score label
  const getScoreLabel = (score) => {
    const safeScore = safeNumber(score, 0);
    if (safeScore >= 6) return 'Excellent';
    if (safeScore >= 4) return 'Good';
    if (safeScore >= 2) return 'Developing';
    return 'Needs Improvement';
  };

  const dimensions = Object.keys(organizationalChangeFramework);

  // Handle form submission
  const handleSubmitAssessment = async () => {
    try {
      setError(''); // clear previous error
      setFormError(false); // reset the flag tracking whether an assesment form error has been triggered or not

      // basic frontend validation
      if (!selectedProjectForAssessment) {
        setError('Please select a project before submitting an assessment.');
        setFormError(true);
        return;
      }
      if (!responses || Object.keys(responses).length === 0) {
        setError('Please answer at least one question before submitting.');
        setFormError(true);
        return;
      }

      setSubmitting(true);

      const assessmentData = {
        project_id: parseInt(selectedProjectForAssessment, 10) || null,
        type: 'organizational_change',
        responses: responses
      };

      console.log('📝 Submitting organizational change assessment:', assessmentData);

      const response = await apiService.submitOrganizationalChangeAssessment(assessmentData);

      if (response.success) {
        console.log('✅ Assessment submitted successfully', response);

        // Reset form
        setResponses({});
        setCurrentDimension('vision');
        setCurrentDimensionIndex(0);
        setShowAssessmentForm(false);
        setSelectedProjectForAssessment('');

        // Reload assessments
        await loadAssessments();
        await loadTeamAssessmentsForMetrics();

        // Notify parent component if needed
        if (onDataChange) {
          onDataChange();
        }
      } else {
        console.error('❌ Submit failed response:', response);
        throw new Error(response.error || response.message || 'Submission failed');
      }
    } catch (error) {
      console.error('❌ Error submitting assessment:', error);
      setError(`Failed to submit assessment: ${error.message}`);
      setFormError(true);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle dimension navigation
  const nextDimension = () => {
    const currentIndex = dimensions.indexOf(currentDimension);
    if (currentIndex < dimensions.length - 1) {
      const nextDim = dimensions[currentIndex + 1];
      setCurrentDimension(nextDim);
      setCurrentDimensionIndex(currentIndex + 1);
    }
  };

  const prevDimension = () => {
    const currentIndex = dimensions.indexOf(currentDimension);
    if (currentIndex > 0) {
      const prevDim = dimensions[currentIndex - 1];
      setCurrentDimension(prevDim);
      setCurrentDimensionIndex(currentIndex - 1);
    }
  };

  // Handle slider change
  const handleSliderChange = (questionKey, value) => {
    setResponses(prev => ({
      ...prev,
      [currentDimension]: {
        ...prev[currentDimension],
        [questionKey]: parseInt(value)
      }
    }));
  };

  // Check if current dimension is complete
  const isDimensionComplete = (dimension) => {
    const dimensionResponses = responses[dimension];
    if (!dimensionResponses) return false;
    
    const requiredQuestions = organizationalChangeFramework[dimension].questions.map(q => q.key);
    return requiredQuestions.every(key => dimensionResponses[key] !== undefined);
  };

  // Check if all dimensions are complete
  const isAssessmentComplete = () => {
    return dimensions.every(dim => isDimensionComplete(dim));
  };

  // Render slider component
  const renderSlider = (question) => {
    const currentValue = responses[currentDimension]?.[question.key] || 1;

    return (
      <div key={question.key} style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <h5 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '0.5rem'
          }}>
            {question.question}
          </h5>
          <p style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '0.5rem'
          }}>
            {question.description}
          </p>
          <p style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginBottom: '0.75rem',
            fontStyle: 'italic'
          }}>
            {question.scale}
          </p>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="range"
            min="1"
            max="7"
            value={currentValue}
            onChange={(e) => handleSliderChange(question.key, e.target.value)}
            style={{
              width: '100%',
              height: '8px',
              borderRadius: '4px',
              background: `linear-gradient(to right, ${organizationalChangeFramework[currentDimension].color} 0%, ${organizationalChangeFramework[currentDimension].color} ${((currentValue - 1) / 6) * 100}%, #e5e7eb ${((currentValue - 1) / 6) * 100}%, #e5e7eb 100%)`,
              outline: 'none',
              appearance: 'none',
              accentColor: organizationalChangeFramework[currentDimension].color
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            fontSize: '0.75rem',
            color: '#9ca3af'
          }}>
            <span>1 - Strongly Disagree</span>
            <span style={{ 
              fontWeight: '600', 
              color: organizationalChangeFramework[currentDimension].color,
              fontSize: '1rem'
            }}>
              {currentValue}
            </span>
            <span>7 - Strongly Agree</span>
          </div>
        </div>
      </div>
    );
  };

  // Calculate metrics for display
  const metrics = calculateChangeMetrics();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#6b7280',
          fontSize: '1rem'
        }}>
          <Loader style={{ animation: 'spin 1s linear infinite' }} size={20} />
          Loading organizational change assessments...
        </div>
      </div>
    );
  }

  return (
    <div className="org-change-screen" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.875rem',
            fontWeight: '700',
            color: '#111827',
            margin: '0 0 0.5rem 0'
          }}>
            Organizational Change Management
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0
          }}>
            Assess your effectiveness in leading organizational change across four key dimensions
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowAssessmentForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            New Assessment
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <History size={16} />
            View History
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && !formError && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          padding: '1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} color="#dc2626" />
          <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
            {error}
          </span>
        </div>
      )}

      {/* Project filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <Filter size={16} color="#6b7280" />
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white',
            color: '#374151'
          }}
        >
          <option value="all">All Projects</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Metrics Cards and Visualizations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {Object.entries(organizationalChangeFramework).map(([key, dimension]) => {
          const score = metrics[key];
          return (
            <div
              key={key}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: 0
                }}>
                  {dimension.title}
                </h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <button
                    onClick={() => setChartVisibility(prev => ({
                      ...prev,
                      [key]: !prev[key]
                    }))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      padding: '0.25rem'
                    }}
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
              
              <div style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: getScoreColor(score),
                marginBottom: '0.5rem'
              }}>
                {score > 0 ? score.toFixed(1) : '--'}
              </div>
              
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                {score > 0 ? getScoreLabel(score) : 'No data'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualization Section */}
      {metrics.count > 0 && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '2rem',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Team Performance Visualization
            </h3>
            
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => setViewMode('progress')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'progress' ? '#3b82f6' : 'white',
                  color: viewMode === 'progress' ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Progress Circles
              </button>
              <button
                onClick={() => setViewMode('bars')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'bars' ? '#3b82f6' : 'white',
                  color: viewMode === 'bars' ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Progress Bars
              </button>
              <button
                onClick={() => setViewMode('comparison')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: viewMode === 'comparison' ? '#3b82f6' : 'white',
                  color: viewMode === 'comparison' ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Team Comparison
              </button>
            </div>
          </div>

          {/* Visualization Content */}
          {viewMode === 'progress' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '2rem',
              justifyItems: 'center'
            }}>
              {Object.entries(organizationalChangeFramework).map(([key, dimension]) => (
                <ProgressCircle
                  key={key}
                  value={metrics[key]}
                  maxValue={7}
                  size={140}
                  strokeWidth={16}
                  color={dimension.color}
                  title={dimension.title}
                  subtitle={`${metrics.count} assessments`}
                />
              ))}
            </div>
          )}

          {viewMode === 'bars' && (
            <HorizontalProgressBars
              data={{
                vision: metrics.vision,
                alignment: metrics.alignment,
                understanding: metrics.understanding,
                enactment: metrics.enactment
              }}
              framework={organizationalChangeFramework}
              teamAverage={null}
            />
          )}

          {viewMode === 'comparison' && (
            <div>
              <div style={{ 
                textAlign: 'center', 
                marginBottom: '2rem' 
              }}>
                <h4 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  margin: '0 0 0.5rem 0'
                }}>
                  Team Performance Matrix
                </h4>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280',
                  margin: 0
                }}>
                  Comparing individual performance across all dimensions
                </p>
              </div>
              <ComparisonMatrix
                assessments={assessments}
                framework={organizationalChangeFramework}
                projects={projects}
              />
            </div>
          )}
        </div>
      )}

      {/* Assessment History */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <h3 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: '#111827', 
            margin: 0 
          }}>
            Recent Assessments
          </h3>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#374151',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <History size={16} />
            View All History
          </button>
        </div>

        {assessments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
            <BarChart3 size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              No assessments yet
            </p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              {selectedProject === 'all' 
                ? 'Start by creating your first organizational change assessment'
                : 'No assessments for the selected project'
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {assessments.slice(0, 5).map((assessment, index) => (
              <AssessmentCard
                key={assessment.id || index}
                assessment={assessment}
                project={projects.find(p => p.id === assessment.project_id)}
                framework={organizationalChangeFramework}
                onClick={() => setSelectedAssessmentDetails(assessment)}
                showProject={true}
              />
            ))}
            
            {assessments.length > 5 && (
              <div style={{ 
                textAlign: 'center', 
                paddingTop: '1rem',
                borderTop: '1px solid #f3f4f6'
              }}>
                <button
                  onClick={() => setShowHistoryModal(true)}
                  style={{
                    color: '#3b82f6',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  View {assessments.length - 5} more assessments →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assessment Form Modal */}
      {showAssessmentForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                Organizational Change Management Assessment
              </h3>
              <button
                onClick={() => setShowAssessmentForm(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  cursor: 'pointer'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Progress indicator */}
            <div style={{
              display: 'flex',
              marginBottom: '2rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              padding: '0.25rem'
            }}>
              {dimensions.map((dimension, index) => (
                <div
                  key={dimension}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    textAlign: 'center',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    borderRadius: '0.375rem',
                    backgroundColor: index <= currentDimensionIndex ? organizationalChangeFramework[dimension].color : 'transparent',
                    color: index <= currentDimensionIndex ? 'white' : '#6b7280',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {organizationalChangeFramework[dimension].title}
                </div>
              ))}
            </div>

            {/* Assessment Form Error display */}
            {error && formError && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} color="#dc2626" />
                <span style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                  {error}
                </span>
              </div>
            )}

            {/* Project selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Project
              </label>
              <select
                value={selectedProjectForAssessment}
                onChange={(e) => setSelectedProjectForAssessment(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">- - Please Select a Project - -</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              {!selectedProjectForAssessment && (
                <p style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem',
                  fontStyle: 'italic'
                }}>
                  This assessment will be general (not project-specific).
                </p>
              )}
            </div>

            {/* Current dimension content */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <h4 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: organizationalChangeFramework[currentDimension].color,
                  marginBottom: '0.5rem'
                }}>
                  {organizationalChangeFramework[currentDimension].title}
                </h4>
                <p style={{
                  fontSize: '1rem',
                  color: '#374151',
                  marginBottom: '0.5rem'
                }}>
                  {organizationalChangeFramework[currentDimension].description}
                </p>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontStyle: 'italic'
                }}>
                  {organizationalChangeFramework[currentDimension].details}
                </p>
              </div>

              {/* Questions for current dimension */}
              {organizationalChangeFramework[currentDimension].questions.map(question => 
                renderSlider(question)
              )}
            </div>

            {/* Navigation buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2rem'
            }}>
              <button
                onClick={prevDimension}
                disabled={currentDimensionIndex === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: currentDimensionIndex === 0 ? '#f9fafb' : 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  color: currentDimensionIndex === 0 ? '#9ca3af' : '#374151',
                  cursor: currentDimensionIndex === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <span style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {currentDimensionIndex + 1} of {dimensions.length}
              </span>

              {currentDimensionIndex === dimensions.length - 1 ? (
                <button
                  onClick={handleSubmitAssessment}
                  disabled={!isAssessmentComplete() || submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: (!isAssessmentComplete() || submitting) ? '#f9fafb' : '#10b981',
                    color: (!isAssessmentComplete() || submitting) ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: (!isAssessmentComplete() || submitting) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Complete Assessment
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={nextDimension}
                  disabled={!isDimensionComplete(currentDimension)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: !isDimensionComplete(currentDimension) ? '#f9fafb' : '#3b82f6',
                    color: !isDimensionComplete(currentDimension) ? '#9ca3af' : 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: !isDimensionComplete(currentDimension) ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <HistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          assessments={assessments}
          projects={projects}
          framework={organizationalChangeFramework}
          onAssessmentSelect={setSelectedAssessmentDetails}
        />
      )}

      {/* Assessment Details Modal */}
      {selectedAssessmentDetails && (
        <AssessmentDetailsModal
          isOpen={!!selectedAssessmentDetails}
          onClose={() => setSelectedAssessmentDetails(null)}
          assessment={selectedAssessmentDetails}
          project={projects.find(p => p.id === selectedAssessmentDetails.project_id)}
          framework={organizationalChangeFramework}
        />
      )}
    </div>
  );
};

export default OrganizationalChangeManagementTab;