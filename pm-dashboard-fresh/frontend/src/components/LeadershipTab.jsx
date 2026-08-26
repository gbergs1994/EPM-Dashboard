// frontend/src/components/LeadershipTab.jsx
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
  ChevronRight
} from 'lucide-react';
import apiService from '../services/apiService';
import {
  RadarChart,
  BarChart,
  AssessmentCard,
  HistoryModal,
  AssessmentDetailsModal
} from './LeadershipHistoryComponents';
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

const LeadershipTab = ({ currentUser, onDataChange }) => {
  const [assessments, setAssessments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedAssessmentDetails, setSelectedAssessmentDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Chart visibility controls
  const [chartVisibility, setChartVisibility] = useState({
    vision: true,
    reality: true,
    ethics: true,
    courage: true
  });
  
  // Form state for multi-step Leadership Diamond assessment
  const [responses, setResponses] = useState({});
  const [currentDimension, setCurrentDimension] = useState('vision');
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [selectedProjectForAssessment, setSelectedProjectForAssessment] = useState('');

  // Leadership Diamond Assessment framework
  const leadershipDiamondFramework = {
    vision: {
      title: 'Vision',
      description: 'The project has a strong vision which will bring powerful things to the organization and the customer.',
      details: 'Consider: Understanding the big picture of a genius vision, with smart thinking creating a strategy to move forward.',
      color: '#3b82f6',
      questions: [
        {
          key: 'clarity',
          question: 'The project has a strong vision which will bring powerful things to the organization and the customer',
          description: 'Consider: Understanding the big picture of a genius vision, with smart thinking creating a strategy to move forward.',
          scale: 'Rate from 1 (very unclear) to 7 (exceptionally clear and compelling)'
        }
      ]
    },
    reality: {
      title: 'Reality',
      description: 'Our organization has a strong reality that keeps business operating smoothly.',
      details: 'Consider: Recognizing that the organization\'s image and branding helps the business function in today\'s complex world; the organizational culture keeps everyone grounded in what has been done in the past to be successful, yet is resilient, being open to good ideas to make it better.',
      color: '#10b981',
      questions: [
        {
          key: 'assessment',
          question: 'Our organization has a strong reality that keeps business operating smoothly',
          description: 'Consider: Recognizing that the organization\'s image and branding helps the business function in today\'s complex world; the organizational culture keeps everyone grounded in what has been done in the past to be successful, yet is resilient, being open to good ideas to make it better.',
          scale: 'Rate from 1 (unrealistic assessment) to 7 (highly accurate assessment)'
        }
      ]
    },
    ethics: {
      title: 'Ethics',
      description: 'Our organization has a strong reality that keeps business operating smoothly.',
      details: 'Consider: The project team and organizational leaders have empathy and follow principled guidelines to do the right thing, striving toward the ideal.',
      color: '#8b5cf6',
      questions: [
        {
          key: 'integrity',
          question: 'The project outcome will provide service while caring for people, the environment, and society',
          description: 'Consider: The project team and organizational leaders have empathy and follow principled guidelines to do the right thing, striving toward the ideal.',
          scale: 'Rate from 1 (inconsistent integrity) to 7 (unwavering integrity)'
        }
      ]
    },
    courage: {
      title: 'Courage',
      description: 'The project team and organizational leadership are brave and driven by the will to take necessary risks to make this project happen.',
      details: 'Consider: The initiative and drive it takes to keep on target while managing anxiety. Taking personal responsibility, while being free to make daring choices.',
      color: '#f59e0b',
      questions: [
        {
          key: 'difficult_decisions',
          question: 'The project team and organizational leadership are brave and driven by the will to take necessary risks to make this project happen.',
          description: 'Consider: The initiative and drive it takes to keep on target while managing anxiety. Taking personal responsibility, while being free to make daring choices.',
          scale: 'Rate from 1 (avoids difficult decisions) to 7 (tackles tough decisions head-on)'
        }
      ]
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadAllData();
  }, [currentUser]);

  // Reload data when selected project changes
  useEffect(() => {
    if (selectedProject !== null) {
      loadAssessments();
    }
  }, [selectedProject]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadProjects(),
        loadAssessments()
      ]);
    } catch (error) {
      console.error('Error loading leadership data:', error);
      setError('Failed to load leadership data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      console.log('📊 Loading projects for leadership assessment...');
      
      // Use getProjects (the correct method that exists)
      const projectsData = await apiService.getProjects();
      console.log('📊 Raw projects response:', projectsData);
      
      // Check multiple possible response formats
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
      console.error('❌ Error loading projects for leadership:', error);
      setProjects([]);
    }
  };

  const loadAssessments = async () => {
    try {
      const params = {};
      if (selectedProject && selectedProject !== 'all') {
        params.project_id = selectedProject;
      }
      
      const assessmentsData = await apiService.getLeadershipAssessments(params);
      if (assessmentsData && assessmentsData.assessments) {
        setAssessments(assessmentsData.assessments);
      }
    } catch (error) {
      console.error('Error loading leadership assessments:', error);
      setError('Failed to load assessments. Please try again.');
    }
  };

  // Calculate diamond metrics from ALL assessments (team averages)
  const calculateDiamondMetrics = () => {
    if (!assessments || assessments.length === 0) {
      return {
        vision: 0,
        reality: 0,
        ethics: 0,
        courage: 0,
        overall: 0,
        count: 0
      };
    }

    // Filter assessments based on selected project
    const filteredAssessments = selectedProject === 'all' 
      ? assessments  // All assessments across all projects
      : assessments.filter(assessment => 
          assessment.project_id === parseInt(selectedProject) || 
          assessment.project_id === selectedProject
        );

    if (filteredAssessments.length === 0) {
      return {
        vision: 0,
        reality: 0,
        ethics: 0,
        courage: 0,
        overall: 0,
        count: 0
      };
    }

    console.log('🔍 Calculating metrics for:', selectedProject === 'all' ? 'All Projects' : `Project ${selectedProject}`);
    console.log('📊 Total assessments:', assessments.length);
    console.log('📊 Filtered assessments:', filteredAssessments.length);

    // Calculate averages across all filtered assessments
    let visionTotal = 0, realityTotal = 0, ethicsTotal = 0, courageTotal = 0, overallTotal = 0;
    let visionCount = 0, realityCount = 0, ethicsCount = 0, courageCount = 0, overallCount = 0;

    filteredAssessments.forEach(assessment => {
      // Vision scores
      if (assessment.vision_score && safeNumber(assessment.vision_score, 0) > 0) {
        visionTotal += safeNumber(assessment.vision_score, 0);
        visionCount++;
      }
      
      // Reality scores  
      if (assessment.reality_score && safeNumber(assessment.reality_score, 0) > 0) {
        realityTotal += safeNumber(assessment.reality_score, 0);
        realityCount++;
      }
      
      // Ethics scores
      if (assessment.ethics_score && safeNumber(assessment.ethics_score, 0) > 0) {
        ethicsTotal += safeNumber(assessment.ethics_score, 0);
        ethicsCount++;
      }
      
      // Courage scores
      if (assessment.courage_score && safeNumber(assessment.courage_score, 0) > 0) {
        courageTotal += safeNumber(assessment.courage_score, 0);
        courageCount++;
      }
      
      // Overall scores
      if (assessment.overall_score && safeNumber(assessment.overall_score, 0) > 0) {
        overallTotal += safeNumber(assessment.overall_score, 0);
        overallCount++;
      }
    });

    // Calculate averages
    const metrics = {
      vision: visionCount > 0 ? visionTotal / visionCount : 0,
      reality: realityCount > 0 ? realityTotal / realityCount : 0,
      ethics: ethicsCount > 0 ? ethicsTotal / ethicsCount : 0,
      courage: courageCount > 0 ? courageTotal / courageCount : 0,
      overall: overallCount > 0 ? overallTotal / overallCount : 0,
      count: filteredAssessments.length
    };

    console.log('📈 Team Average Metrics:', {
      vision: metrics.vision.toFixed(2),
      reality: metrics.reality.toFixed(2), 
      ethics: metrics.ethics.toFixed(2),
      courage: metrics.courage.toFixed(2),
      overall: metrics.overall.toFixed(2),
      assessments: metrics.count
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

  const dimensions = Object.keys(leadershipDiamondFramework);

  // Handle form submission
  const handleSubmitAssessment = async () => {
    try {
      setSubmitting(true);
      
      const assessmentData = {
        project_id: selectedProjectForAssessment || null,
        type: 'leadership_diamond',
        responses: responses
      };

      console.log('📝 Submitting assessment:', assessmentData);

      const response = await apiService.submitLeadershipAssessment(assessmentData);
      
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
        
        // Notify parent component if needed
        if (onDataChange) {
          onDataChange();
        }
      } else {
        // log entire response for troubleshooting
        console.error('❌ Submit failed response:', response);
        throw new Error(response.error || response.message || 'Submission failed');
      }
    } catch (error) {
      console.error('❌ Error submitting assessment:', error);
      setError(`Failed to submit assessment: ${error.message}`);
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
    
    const requiredQuestions = leadershipDiamondFramework[dimension].questions.map(q => q.key);
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
      <div key={question.key} className="leadership-question-card" style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f9fafb',
        borderRadius: '1rem',
        border: '1px solid #e5e7eb'
      }}>
        <h4 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.75rem'
        }}>
          {question.question}
        </h4>
        
        <p style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          marginBottom: '1rem'
        }}>
          {question.description}
        </p>
        
        <p style={{
          fontSize: '0.75rem',
          color: '#9ca3af',
          marginBottom: '1.5rem',
          fontStyle: 'italic'
        }}>
          {question.scale}
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
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
              background: `linear-gradient(to right, ${leadershipDiamondFramework[currentDimension].color} 0%, ${leadershipDiamondFramework[currentDimension].color} ${((currentValue - 1) / 6) * 100}%, #e5e7eb ${((currentValue - 1) / 6) * 100}%, #e5e7eb 100%)`,
              outline: 'none',
              cursor: 'pointer',
              appearance: 'none',
              accentColor: leadershipDiamondFramework[currentDimension].color
            }}
          />
          
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            {[1, 2, 3, 4, 5, 6, 7].map(num => (
              <span key={num} style={{
                fontSize: '0.875rem',
                fontWeight: currentValue == num ? '600' : '400',
                color: currentValue == num ? leadershipDiamondFramework[currentDimension].color : '#6b7280'
              }}>
                {num}
              </span>
            ))}
          </div>
          
          <div className="leadership-score-pill" style={{ 
            textAlign: 'center', 
            marginTop: '1rem',
            padding: '0.5rem',
            backgroundColor: '#f3f4f6',
            borderRadius: '0.375rem'
          }}>
            <span style={{ 
              fontSize: '1.25rem', 
              fontWeight: '600',
              color: leadershipDiamondFramework[currentDimension].color
            }}>
              {currentValue}
            </span>
            <span style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              marginLeft: '0.5rem'
            }}>
              - {getScoreLabel(currentValue)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Render diamond visualization
  const renderDiamond = () => {
    const metrics = calculateDiamondMetrics();
    const size = 300;
    const center = size / 2;
    const radius = size / 3;

    // Calculate points for diamond shape
    const points = {
      vision: { x: center, y: center - (radius * safeNumber(metrics.vision, 0) / 7) },
      ethics: { x: center + (radius * safeNumber(metrics.ethics, 0) / 7), y: center },
      reality: { x: center, y: center + (radius * safeNumber(metrics.reality, 0) / 7) },
      courage: { x: center - (radius * safeNumber(metrics.courage, 0) / 7), y: center }
    };

    const pathData = `M ${points.vision.x},${points.vision.y} L ${points.ethics.x},${points.ethics.y} L ${points.reality.x},${points.reality.y} L ${points.courage.x},${points.courage.y} Z`;

    return (
      <div className="leadership-diamond-card" style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            {selectedProject === 'all' 
              ? 'Team Leadership Diamond (All Projects)' 
              : `Project Leadership Diamond`
            }
          </h3>
          <span style={{
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            {selectedProject === 'all' 
              ? `Team average across ${metrics.count} assessment${metrics.count !== 1 ? 's' : ''}`
              : `Project average across ${metrics.count} assessment${metrics.count !== 1 ? 's' : ''}`
            }
          </span>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <svg width={size} height={size} style={{ maxWidth: '100%' }}>
              {[1, 2, 3, 4, 5, 6, 7].map(level => {
                const scale = level / 7;
                return (
                  <rect
                    key={level}
                    x={center - (radius * scale)}
                    y={center - (radius * scale)}
                    width={radius * scale * 2}
                    height={radius * scale * 2}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    transform={`rotate(45, ${center}, ${center})`}
                    opacity={level === 7 ? 0.8 : 0.3}
                  />
                );
              })}
              
              <line x1={center} y1="20" x2={center} y2={size - 20} stroke="#d1d5db" strokeWidth="1" />
              <line x1="20" y1={center} x2={size - 20} y2={center} stroke="#d1d5db" strokeWidth="1" />
              
              <path
                d={pathData}
                fill={`rgba(59, 130, 246, 0.3)`}
                stroke="#3b82f6"
                strokeWidth="2"
              />
              
              {Object.entries(points).map(([dimension, point]) => (
                <circle
                  key={dimension}
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={leadershipDiamondFramework[dimension].color}
                  stroke="white"
                  strokeWidth="2"
                />
              ))}
              
              <text x={center} y="15" textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">Vision</text>
              <text x={size - 10} y={center + 5} textAnchor="end" fontSize="12" fontWeight="600" fill="#374151">Ethics</text>
              <text x={center} y={size - 5} textAnchor="middle" fontSize="12" fontWeight="600" fill="#374151">Reality</text>
              <text x="10" y={center + 5} textAnchor="start" fontSize="12" fontWeight="600" fill="#374151">Courage</text>
            </svg>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {Object.entries(leadershipDiamondFramework).map(([key, dimension]) => (
                <div key={key} className="leadership-dimension-score-card" style={{
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <h4 style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: dimension.color,
                      margin: 0
                    }}>
                      {dimension.title}
                    </h4>
                    <span style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: getScoreColor(safeNumber(metrics[key], 0))
                    }}>
                      {safeNumber(metrics[key], 0).toFixed(1)}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '4px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '2px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(safeNumber(metrics[key], 0) / 7) * 100}%`,
                      backgroundColor: dimension.color,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {getScoreLabel(safeNumber(metrics[key], 0))}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="leadership-average-score-card" style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.5rem',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: getScoreColor(safeNumber(metrics.overall, 0))
              }}>
                {safeNumber(metrics.overall, 0).toFixed(1)}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                {selectedProject === 'all' 
                  ? 'Team Average Leadership Score' 
                  : 'Project Average Leadership Score'
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <Loader size={48} className="animate-spin" color="#3b82f6" />
        <p style={{ color: '#6b7280' }}>Loading leadership data...</p>
      </div>
    );
  }

  return (
    <div className="leadership-screen" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h2 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#111827',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <Award size={32} color="#3b82f6" />
            Leadership Diamond
          </h2>
          <p style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: '0.5rem 0 0 0'
          }}>
            Assess your leadership across Vision, Reality, Ethics, and Courage
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setShowHistoryModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            <History size={16} />
            View History
          </button>
          
          <button
            onClick={() => setShowAssessmentForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <Plus size={16} />
            Take Assessment
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '1rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '0.5rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} color="#ef4444" />
          <span style={{ color: '#dc2626' }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Project Filter */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1rem',
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <Filter size={16} color="#6b7280" />
        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
          Filter by project:
        </span>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: 'white'
          }}
        >
          <option value="all">All Projects ({projects.length} available)</option>
          {projects.map(project => (
            <option key={project.id} value={project.id}>
              {project.name || project.title}
            </option>
          ))}
        </select>
      </div>

      {/* Diamond Visualization */}
      {renderDiamond()}

      {/* Assessment History */}
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '1rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        marginTop: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            {selectedProject === 'all' ? 
              `Recent Assessments (${assessments.length} total)` : 
              `Team Assessments for ${projects.find(p => p.id == selectedProject)?.name || 'Selected Project'} (${assessments.length} assessments)`
            }
          </h3>
          <button
            onClick={loadAssessments}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              color: '#374151',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {assessments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6b7280'
          }}>
            <Award size={48} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.125rem', fontWeight: '500', margin: '0 0 0.5rem 0' }}>
              No assessments yet
            </p>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Take your first Leadership Diamond assessment to see your results here
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem'
          }}>
            {assessments.slice(0, 6).map(assessment => (
              <div key={assessment.id} style={{
                padding: '1.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
                onClick={() => setSelectedAssessmentDetails(assessment)}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.borderColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f9fafb';
                  e.target.style.borderColor = '#e5e7eb';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '1rem'
                }}>
                  <div>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '0.25rem'
                    }}>
                      {assessment.project_name || 'General Assessment'}
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      {new Date(assessment.created_at).toLocaleDateString()}
                    </div>
                    {/* Show user name to indicate which team member submitted the assessment */}
                    {assessment.user_name && (
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#3b82f6',
                        marginTop: '0.25rem'
                      }}>
                        👤 {assessment.user_name}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: getScoreColor(safeNumber(assessment.overall_score, 0))
                  }}>
                    {safeNumber(assessment.overall_score, 0).toFixed(1)}
                  </div>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.5rem'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#3b82f6'
                    }}>
                      {safeNumber(assessment.vision_score, 0).toFixed(1)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      Vision
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#10b981'
                    }}>
                      {safeNumber(assessment.reality_score, 0).toFixed(1)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      Reality
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#8b5cf6'
                    }}>
                      {safeNumber(assessment.ethics_score, 0).toFixed(1)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      Ethics
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#f59e0b'
                    }}>
                      {safeNumber(assessment.courage_score, 0).toFixed(1)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280'
                    }}>
                      Courage
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Form Modal */}
      {showAssessmentForm && (
        <div className="leadership-assessment-modal-overlay" style={{
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
          <div className="leadership-assessment-modal" style={{
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
                Leadership Diamond Assessment
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

            {/* Intro text */}
            <div style={{
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '0.75rem',
              padding: '1.25rem 1.5rem',
              marginBottom: '2rem'
            }}>
              <p style={{ fontSize: '0.9375rem', color: '#1e3a5f', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                The leadership categories have tension between them. The Vision pushes forward while Reality holds the status quo. Ethics care for people and doing what is right, while Courage is having the will to overcome odds and make something happen.
              </p>
              <p style={{ fontSize: '0.9375rem', color: '#1e3a5f', marginBottom: '0.75rem', lineHeight: '1.6' }}>
                Too much strength in either category impacts the opposite category.
              </p>
              <p style={{ fontSize: '0.9375rem', color: '#1e3a5f', margin: 0, lineHeight: '1.6', fontStyle: 'italic' }}>
                No one person, even the Project Manager, actually leads a project, because choices are made by all team members that contribute to the leadership of a project. Answer these questions from this point of view: <strong>"How are WE as a team leading this project?"</strong>
              </p>
            </div>

            {/* Progress indicator */}
            <div className="leadership-progress-indicator" style={{
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
                    backgroundColor: index <= currentDimensionIndex ? leadershipDiamondFramework[dimension].color : 'transparent',
                    color: index <= currentDimensionIndex ? 'white' : '#6b7280',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {leadershipDiamondFramework[dimension].title}
                </div>
              ))}
            </div>

            {/* Project selection */}
            {//UNUSED CONDITIONS, REMOVE IF NO LONGER NEEDED: !selectedProjectForAssessment && currentDimensionIndex === 0 && 
            (
              <div className="leadership-project-select-card" style={{
                marginBottom: '2rem',
                padding: '1.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <h4 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '1rem'
                }}>
                  Select a project (optional) - {projects.length} available
                </h4>
                <select
                  value={selectedProjectForAssessment}
                  onChange={(e) => setSelectedProjectForAssessment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">General Leadership Assessment</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name || project.title}
                    </option>
                  ))}
                </select>
                
                {projects.length === 0 && (
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    marginTop: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    No projects available. This assessment will be general (not project-specific).
                  </p>
                )}
              </div>
            )}

            {/* Current dimension content */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <h4 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: leadershipDiamondFramework[currentDimension].color,
                  marginBottom: '0.5rem'
                }}>
                  {leadershipDiamondFramework[currentDimension].title}
                </h4>

              </div>

              {/* Questions for current dimension */}
              {leadershipDiamondFramework[currentDimension].questions.map(question => 
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
                    backgroundColor: isAssessmentComplete() && !submitting ? '#3b82f6' : '#f9fafb',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: isAssessmentComplete() && !submitting ? 'white' : '#9ca3af',
                    cursor: isAssessmentComplete() && !submitting ? 'pointer' : 'not-allowed'
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={16} />
                      Submit Assessment
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
                    backgroundColor: isDimensionComplete(currentDimension) ? '#3b82f6' : '#f9fafb',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    color: isDimensionComplete(currentDimension) ? 'white' : '#9ca3af',
                    cursor: isDimensionComplete(currentDimension) ? 'pointer' : 'not-allowed'
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
          framework={leadershipDiamondFramework}
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
          framework={leadershipDiamondFramework}
        />
      )}
    </div>
  );
};

export default LeadershipTab;