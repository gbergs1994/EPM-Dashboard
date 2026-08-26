// frontend/src/components/OrganizationalChangeHistoryComponents.jsx
import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Building2, 
  ChevronDown, 
  ChevronUp, 
  BarChart3, 
  TrendingUp,
  Eye,
  X,
  Filter,
  Users,
  Clock,
  Target,
  Shuffle
} from 'lucide-react';
import { ProgressCircle } from './EnhancedVisualizationComponents';

// Radar Chart Component for Assessment Visualization
const RadarChart = ({ data, framework, size = 300 }) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const dimensions = Object.keys(framework);
  
  // Calculate points for the assessment data
  const getPoint = (value, index) => {
    const numericValue = parseFloat(value) || 0;
    const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
    const distance = (numericValue / 7) * radius;
    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance
    };
  };

  // Create grid circles
  const gridLevels = [1, 2, 3, 4, 5, 6, 7];
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Grid circles */}
        {gridLevels.map(level => (
          <circle
            key={level}
            cx={centerX}
            cy={centerY}
            r={(level / 7) * radius}
            fill="none"
            stroke={level === 7 ? '#e5e7eb' : '#f3f4f6'}
            strokeWidth={level === 7 ? 2 : 1}
          />
        ))}
        
        {/* Grid lines to each dimension */}
        {dimensions.map((dimension, index) => {
          const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
          const endX = centerX + Math.cos(angle) * radius;
          const endY = centerY + Math.sin(angle) * radius;
          
          return (
            <line
              key={dimension}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
          );
        })}
        
        {/* Assessment data polygon */}
        {data && (
          <polygon
            points={dimensions.map((dimension, index) => {
              const point = getPoint(data[dimension] || 0, index);
              return `${point.x},${point.y}`;
            }).join(' ')}
            fill={`${framework[dimensions[0]]?.color}20`}
            stroke={framework[dimensions[0]]?.color || '#3b82f6'}
            strokeWidth={2}
          />
        )}
        
        {/* Data points */}
        {data && dimensions.map((dimension, index) => {
          const point = getPoint(data[dimension] || 0, index);
          return (
            <circle
              key={dimension}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={framework[dimension]?.color || '#3b82f6'}
            />
          );
        })}
        
        {/* Dimension labels */}
        {dimensions.map((dimension, index) => {
          const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
          const labelDistance = radius + 30;
          const labelX = centerX + Math.cos(angle) * labelDistance;
          const labelY = centerY + Math.sin(angle) * labelDistance;
          
          return (
            <text
              key={dimension}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#374151"
              fontSize="12"
              fontWeight="600"
            >
              {framework[dimension]?.title}
            </text>
          );
        })}
        
        {/* Score labels */}
        {data && dimensions.map((dimension, index) => {
          const score = parseFloat(data[dimension]) || 0;
          const angle = (index * 2 * Math.PI) / dimensions.length - Math.PI / 2;
          const scoreDistance = radius + 50;
          const scoreX = centerX + Math.cos(angle) * scoreDistance;
          const scoreY = centerY + Math.sin(angle) * scoreDistance;
          
          return (
            <text
              key={`score-${dimension}`}
              x={scoreX}
              y={scoreY}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={framework[dimension]?.color || '#3b82f6'}
              fontSize="14"
              fontWeight="700"
            >
              {score.toFixed(1)}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// Bar Chart Component for Comparison
const BarChart = ({ data, framework, height = 300 }) => {
  const dimensions = Object.keys(framework);
  const maxValue = 7;
  const barWidth = 60;
  const barSpacing = 20;
  const chartWidth = dimensions.length * (barWidth + barSpacing) - barSpacing;
  const chartHeight = height - 60;

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <svg width={chartWidth + 60} height={height} style={{ overflow: 'visible' }}>
        {/* Y-axis grid lines */}
        {[1, 2, 3, 4, 5, 6, 7].map(value => (
          <g key={value}>
            <line
              x1={30}
              y1={40 + chartHeight - (value / maxValue) * chartHeight}
              x2={chartWidth + 30}
              y2={40 + chartHeight - (value / maxValue) * chartHeight}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text
              x={25}
              y={40 + chartHeight - (value / maxValue) * chartHeight + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              {value}
            </text>
          </g>
        ))}
        
        {/* Bars */}
        {dimensions.map((dimension, index) => {
          const value = parseFloat(data[dimension]) || 0;
          const barHeight = (value / maxValue) * chartHeight;
          const barX = 30 + index * (barWidth + barSpacing);
          const barY = 40 + chartHeight - barHeight;
          
          return (
            <g key={dimension}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={framework[dimension]?.color || '#3b82f6'}
                rx={4}
              />
              <text
                x={barX + barWidth / 2}
                y={barY - 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="#374151"
              >
                {value.toFixed(1)}
              </text>
              <text
                x={barX + barWidth / 2}
                y={40 + chartHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#6b7280"
                transform={`rotate(-45, ${barX + barWidth / 2}, ${40 + chartHeight + 20})`}
              >
                {framework[dimension]?.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Assessment Card Component
const AssessmentCard = ({ assessment, project, framework, onClick, showProject = true }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getOverallScore = () => {
    const scores = [
      parseFloat(assessment.vision_score) || 0,
      parseFloat(assessment.alignment_score) || 0,
      parseFloat(assessment.understanding_score) || 0,
      parseFloat(assessment.enactment_score) || 0
    ];
    const validScores = scores.filter(score => score > 0);
    return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
  };

  const getScoreColor = (score) => {
    if (score >= 6) return '#22c55e';
    if (score >= 4) return '#eab308';
    if (score >= 2) return '#f97316';
    return '#ef4444';
  };

  const overallScore = getOverallScore();

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        ':hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderColor: '#3b82f6'
        }
      }}
      onMouseEnter={(e) => {
        e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        e.target.style.borderColor = '#3b82f6';
      }}
      onMouseLeave={(e) => {
        e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
        e.target.style.borderColor = '#e5e7eb';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <User size={16} color="#6b7280" />
            <span style={{ fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
              {assessment.user_name}
            </span>
            <Clock size={14} color="#9ca3af" />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {formatDate(assessment.created_at)}
            </span>
          </div>
          
          {showProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Building2 size={14} color="#9ca3af" />
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {project?.name || 'General Assessment'}
              </span>
            </div>
          )}
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: getScoreColor(overallScore),
            marginBottom: '0.25rem'
          }}>
            {overallScore.toFixed(1)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Overall
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {Object.keys(framework).map(dimension => {
          const scoreValue = parseFloat(assessment[`${dimension}_score`]) || 0;
          return (
            <div key={dimension} style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '0.875rem', 
                fontWeight: '600', 
                color: framework[dimension].color,
                marginBottom: '0.25rem'
              }}>
                {scoreValue.toFixed(1)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {framework[dimension].title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// History Modal Component
const HistoryModal = ({ isOpen, onClose, assessments, projects, framework, onAssessmentSelect }) => {
  const [filterUser, setFilterUser] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  if (!isOpen) return null;

  // Get unique users
  const users = [...new Set(assessments.map(a => ({ id: a.user_id, name: a.user_name })))];

  // Filter and sort assessments
  const filteredAssessments = assessments
    .filter(assessment => {
      const userMatch = filterUser === 'all' || assessment.user_id.toString() === filterUser;
      
      // Handle project filtering including null values
      let projectMatch = true;
      if (filterProject === 'all') {
        projectMatch = true;
      } else if (filterProject === 'null') {
        projectMatch = !assessment.project_id;
      } else {
        projectMatch = assessment.project_id?.toString() === filterProject;
      }
      
      return userMatch && projectMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'user':
          return a.user_name.localeCompare(b.user_name);
        case 'score':
          const aScore = (
            (parseFloat(a.vision_score) || 0) + 
            (parseFloat(a.alignment_score) || 0) + 
            (parseFloat(a.understanding_score) || 0) + 
            (parseFloat(a.enactment_score) || 0)
          ) / 4;
          const bScore = (
            (parseFloat(b.vision_score) || 0) + 
            (parseFloat(b.alignment_score) || 0) + 
            (parseFloat(b.understanding_score) || 0) + 
            (parseFloat(b.enactment_score) || 0)
          ) / 4;
          return bScore - aScore;
        default:
          return 0;
      }
    });

  return (
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
        maxWidth: '1200px',
        width: '95%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Assessment History
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              margin: '0.5rem 0 0 0'
            }}>
              {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="#6b7280" />
            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
              Filters:
            </span>
          </div>
          
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Users</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Projects</option>
            <option value="null">General Assessments</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="user">Sort by User</option>
            <option value="score">Sort by Score</option>
          </select>

          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem',
                backgroundColor: viewMode === 'list' ? '#3b82f6' : 'white',
                color: viewMode === 'list' ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.5rem',
                backgroundColor: viewMode === 'grid' ? '#3b82f6' : 'white',
                color: viewMode === 'grid' ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer'
              }}
            >
              Grid
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {filteredAssessments.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '3rem 0',
              color: '#6b7280'
            }}>
              <BarChart3 size={48} style={{ color: '#d1d5db', margin: '0 auto 1rem' }} />
              <p style={{ fontSize: '1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                No assessments found
              </p>
              <p style={{ fontSize: '0.875rem', margin: 0 }}>
                Try adjusting your filters to see more results
              </p>
            </div>
          ) : (
            <div style={{
              display: viewMode === 'grid' ? 'grid' : 'flex',
              flexDirection: viewMode === 'list' ? 'column' : undefined,
              gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(400px, 1fr))' : undefined,
              gap: '1rem'
            }}>
              {filteredAssessments.map((assessment, index) => (
                <AssessmentCard
                  key={assessment.id || index}
                  assessment={assessment}
                  project={projects.find(p => p.id === assessment.project_id)}
                  framework={framework}
                  onClick={() => onAssessmentSelect(assessment)}
                  showProject={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Assessment Details Modal Component  
const AssessmentDetailsModal = ({ isOpen, onClose, assessment, project, framework }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen || !assessment) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const responses = typeof assessment.responses === 'string' 
    ? JSON.parse(assessment.responses) 
    : assessment.responses || {};

  const dimensions = Object.keys(framework);
  const scores = {
    vision: parseFloat(assessment.vision_score) || 0,
    alignment: parseFloat(assessment.alignment_score) || 0,
    understanding: parseFloat(assessment.understanding_score) || 0,
    enactment: parseFloat(assessment.enactment_score) || 0
  };

  return (
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
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '900px',
        width: '95%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#111827',
              margin: 0
            }}>
              Assessment Details
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <User size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                {assessment.user_name}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <Calendar size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                {formatDate(assessment.created_at)}
              </span>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <Building2 size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                {project?.name || 'General Assessment'}
              </span>
            </div>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              cursor: 'pointer',
              padding: '0.5rem'
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          marginBottom: '2rem'
        }}>
          {[
            { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
            { id: 'responses', label: 'Detailed Responses', icon: <Eye size={16} /> },
            { id: 'visualization', label: 'Visualization', icon: <TrendingUp size={16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2rem' }}>
              {dimensions.map(dimension => (
                <div
                  key={dimension}
                  style={{
                    backgroundColor: '#f9fafb',
                    padding: '1.5rem',
                    borderRadius: '0.75rem',
                    border: `3px solid ${framework[dimension].color}`
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <h4 style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: '#111827',
                      margin: 0
                    }}>
                      {framework[dimension].title}
                    </h4>
                    <span style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: framework[dimension].color
                    }}>
                      {scores[dimension]?.toFixed(1) || '0.0'}
                    </span>
                  </div>
                  
                  <p style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    margin: 0,
                    lineHeight: 1.5
                  }}>
                    {framework[dimension].description}
                  </p>
                  
                  {responses[dimension] && (
                    <div style={{ marginTop: '1rem' }}>
                      <p style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.5rem'
                      }}>
                        {Object.keys(responses[dimension]).length} questions answered
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'responses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {dimensions.map(dimension => (
                <div key={dimension}>
                  <h4 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: framework[dimension].color,
                    margin: '0 0 1rem 0',
                    borderLeft: `4px solid ${framework[dimension].color}`,
                    paddingLeft: '1rem'
                  }}>
                    {framework[dimension].title}
                  </h4>
                  
                  {framework[dimension].questions.map((question, qIndex) => {
                    const responseValue = responses[dimension]?.[question.key];
                    
                    return (
                      <div
                        key={question.key}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '1.5rem',
                          marginBottom: '1rem'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.75rem'
                        }}>
                          <h5 style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#111827',
                            margin: 0,
                            flex: 1
                          }}>
                            {question.question}
                          </h5>
                          <div style={{
                            backgroundColor: framework[dimension].color,
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            marginLeft: '1rem'
                          }}>
                            {responseValue || 'N/A'}/7
                          </div>
                        </div>
                        
                        <p style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          margin: 0,
                          lineHeight: 1.5
                        }}>
                          {question.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'visualization' && (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              gap: '2rem' 
            }}>
              {/* Progress Circles */}
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h4 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '2rem'
                }}>
                  Assessment Scores
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '2rem',
                  justifyItems: 'center',
                  maxWidth: '800px',
                  margin: '0 auto'
                }}>
                  {Object.entries(framework).map(([key, dimension]) => (
                    <ProgressCircle
                      key={key}
                      value={parseFloat(scores[key]) || 0}
                      maxValue={7}
                      size={160}
                      strokeWidth={18}
                      color={dimension.color}
                      title={dimension.title}
                      subtitle={`Individual Score`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Score Summary */}
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                textAlign: 'center',
                maxWidth: '400px',
                width: '100%'
              }}>
                <h5 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 1rem 0'
                }}>
                  Overall Performance
                </h5>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#3b82f6',
                  marginBottom: '0.5rem'
                }}>
                  {((parseFloat(scores.vision) + parseFloat(scores.alignment) + parseFloat(scores.understanding) + parseFloat(scores.enactment)) / 4).toFixed(1)}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  Average across all dimensions
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export {
  RadarChart,
  BarChart,
  AssessmentCard,
  HistoryModal,
  AssessmentDetailsModal
};