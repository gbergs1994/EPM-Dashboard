// frontend/src/components/LeadershipHistoryComponents.jsx
import React, { useState } from 'react';
import { 
  X, 
  BarChart3, 
  Calendar, 
  User, 
  Building2, 
  TrendingUp,
  Eye,
  Award,
  Filter,
  ChevronDown
} from 'lucide-react';

// Progress Circle Component for Leadership Dimensions
const ProgressCircle = ({ value, max = 7, size = 80, strokeWidth = 8, color = '#3b82f6', title, subtitle }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = (value / max) * 100;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      <div style={{
        position: 'relative',
        display: 'inline-block'
      }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 0.5s ease'
            }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '1rem',
          fontWeight: '600',
          color: '#374151'
        }}>
          {value.toFixed(1)}
        </div>
      </div>
      
      {title && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280'
            }}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Radar Chart for Leadership Diamond
const RadarChart = ({ data, dimensions, size = 300, colors = {} }) => {
  const center = size / 2;
  const maxRadius = size * 0.35;
  const numLevels = 7;

  // Leadership diamond dimensions
  const leadershipDimensions = ['vision', 'reality', 'ethics', 'courage'];
  const dimensionsToUse = leadershipDimensions;

  const points = dimensionsToUse.map((dim, index) => {
    const angle = (index * 2 * Math.PI) / dimensionsToUse.length - Math.PI / 2;
    const value = data[dim] || 0;
    const radius = (value / 7) * maxRadius;
    
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: center + Math.cos(angle) * (maxRadius + 30),
      labelY: center + Math.sin(angle) * (maxRadius + 30),
      dimension: dim,
      value: value
    };
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <svg width={size} height={size} style={{ overflow: 'visible' }}>
        {/* Grid circles */}
        {Array.from({ length: numLevels }, (_, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={(maxRadius / numLevels) * (i + 1)}
            stroke="#e5e7eb"
            strokeWidth="1"
            fill="none"
          />
        ))}

        {/* Grid lines */}
        {dimensionsToUse.map((_, index) => {
          const angle = (index * 2 * Math.PI) / dimensionsToUse.length - Math.PI / 2;
          const endX = center + Math.cos(angle) * maxRadius;
          const endY = center + Math.sin(angle) * maxRadius;
          
          return (
            <line
              key={index}
              x1={center}
              y1={center}
              x2={endX}
              y2={endY}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="#3b82f6"
          fillOpacity="0.3"
          stroke="#3b82f6"
          strokeWidth="2"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="#3b82f6"
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Labels */}
        {points.map((point, index) => (
          <g key={index}>
            <text
              x={point.labelX}
              y={point.labelY}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="12"
              fontWeight="600"
              fill="#374151"
            >
              {point.dimension.charAt(0).toUpperCase() + point.dimension.slice(1)}
            </text>
            <text
              x={point.labelX}
              y={point.labelY + 15}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill="#6b7280"
            >
              {point.value.toFixed(1)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Bar Chart for Leadership Dimensions
const BarChart = ({ data, dimensions, height = 200, colors = {} }) => {
  const leadershipDimensions = [
    { key: 'vision', title: 'Vision', color: '#3b82f6' },
    { key: 'reality', title: 'Reality', color: '#10b981' },
    { key: 'ethics', title: 'Ethics', color: '#8b5cf6' },
    { key: 'courage', title: 'Courage', color: '#f59e0b' }
  ];

  const maxValue = 7;
  const chartHeight = height - 60;
  const barWidth = 60;
  const spacing = 20;
  const chartWidth = (barWidth + spacing) * leadershipDimensions.length;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <svg width={chartWidth} height={height} style={{ overflow: 'visible' }}>
        {leadershipDimensions.map((dimension, index) => {
          const value = data[dimension.key] || 0;
          const barHeight = (value / maxValue) * chartHeight;
          const barX = index * (barWidth + spacing);
          const barY = 40 + chartHeight - barHeight;

          return (
            <g key={dimension.key}>
              <rect
                x={barX}
                y={barY}
                width={barWidth}
                height={barHeight}
                fill={dimension.color}
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
                {dimension.title}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Assessment Card Component with User Names
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
      parseFloat(assessment.reality_score) || 0,
      parseFloat(assessment.ethics_score) || 0,
      parseFloat(assessment.courage_score) || 0
    ];
    const validScores = scores.filter(score => score > 0);
    return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
  };

  const getScoreColor = (score) => {
    if (score >= 6) return '#10b981';
    if (score >= 4) return '#f59e0b';
    return '#ef4444';
  };

  const overallScore = getOverallScore();

  return (
    <div 
      style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
      }}
      onClick={() => onClick && onClick(assessment)}
      onMouseEnter={(e) => {
        e.target.style.borderColor = '#3b82f6';
        e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.target.style.borderColor = '#e5e7eb';
        e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}
    >
      {/* Header with project, user, date, and score */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div style={{ flex: 1 }}>
          {showProject && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <Building2 size={14} style={{ color: '#6b7280' }} />
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151'
              }}>
                {project?.name || 'General Assessment'}
              </span>
            </div>
          )}
          
          {/* User name */}
          {assessment.user_name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <User size={14} style={{ color: '#3b82f6' }} />
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#3b82f6'
              }}>
                {assessment.user_name}
              </span>
            </div>
          )}
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Calendar size={14} style={{ color: '#6b7280' }} />
            <span style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              {formatDate(assessment.created_at)}
            </span>
          </div>
        </div>
        
        <div style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: getScoreColor(overallScore)
        }}>
          {overallScore.toFixed(1)}
        </div>
      </div>

      {/* Leadership dimensions scores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#3b82f6',
            marginBottom: '0.25rem'
          }}>
            {(parseFloat(assessment.vision_score) || 0).toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Vision
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#10b981',
            marginBottom: '0.25rem'
          }}>
            {(parseFloat(assessment.reality_score) || 0).toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Reality
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#8b5cf6',
            marginBottom: '0.25rem'
          }}>
            {(parseFloat(assessment.ethics_score) || 0).toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Ethics
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#f59e0b',
            marginBottom: '0.25rem'
          }}>
            {(parseFloat(assessment.courage_score) || 0).toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Courage
          </div>
        </div>
      </div>
    </div>
  );
};

// History Modal Component with User Filtering
const HistoryModal = ({ isOpen, onClose, assessments, projects, framework, onAssessmentSelect }) => {
  const [filterUser, setFilterUser] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  if (!isOpen) return null;

  // Get unique users from assessments
  const users = [...new Set(assessments
    .filter(a => a.user_name) // Only assessments with user names
    .map(a => ({ id: a.user_id, name: a.user_name }))
  )].filter((user, index, self) => 
    index === self.findIndex(u => u.id === user.id) // Remove duplicates
  );

  // Filter and sort assessments
  const filteredAssessments = assessments
    .filter(assessment => {
      const userMatch = filterUser === 'all' || assessment.user_id?.toString() === filterUser;
      
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
          return (a.user_name || '').localeCompare(b.user_name || '');
        case 'score':
          const aScore = (
            (parseFloat(a.vision_score) || 0) + 
            (parseFloat(a.reality_score) || 0) + 
            (parseFloat(a.ethics_score) || 0) + 
            (parseFloat(a.courage_score) || 0)
          ) / 4;
          const bScore = (
            (parseFloat(b.vision_score) || 0) + 
            (parseFloat(b.reality_score) || 0) + 
            (parseFloat(b.ethics_score) || 0) + 
            (parseFloat(b.courage_score) || 0)
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
      zIndex: 1001
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
              Leadership Assessment History
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
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* User Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <User size={16} style={{ color: '#6b7280' }} />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                minWidth: '150px'
              }}
            >
              <option value="all">All Users ({users.length})</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Building2 size={16} style={{ color: '#6b7280' }} />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white',
                minWidth: '150px'
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
          </div>

          {/* Sort Options */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <TrendingUp size={16} style={{ color: '#6b7280' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="date">Sort by Date</option>
              <option value="user">Sort by User</option>
              <option value="score">Sort by Score</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '0.25rem',
            marginLeft: 'auto'
          }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.5rem',
                backgroundColor: viewMode === 'list' ? '#3b82f6' : 'white',
                color: viewMode === 'list' ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.875rem'
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
                cursor: 'pointer',
                fontSize: '0.875rem'
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

  // Leadership dimensions for progress circles
  const dimensions = [
    { key: 'vision', title: 'Vision', color: '#3b82f6' },
    { key: 'reality', title: 'Reality', color: '#10b981' },
    { key: 'ethics', title: 'Ethics', color: '#8b5cf6' },
    { key: 'courage', title: 'Courage', color: '#f59e0b' }
  ];

  const scores = {
    vision: parseFloat(assessment.vision_score) || 0,
    reality: parseFloat(assessment.reality_score) || 0,
    ethics: parseFloat(assessment.ethics_score) || 0,
    courage: parseFloat(assessment.courage_score) || 0
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
              Leadership Assessment Details
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
              {assessment.user_name && (
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  <User size={14} style={{ display: 'inline', marginRight: '0.5rem' }} />
                  {assessment.user_name}
                </span>
              )}
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
              padding: '0.5rem',
              borderRadius: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {['overview', 'responses', 'visualization'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                color: activeTab === tab ? '#3b82f6' : '#6b7280',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '0.875rem',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Progress Circles */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1.5rem',
                backgroundColor: '#f9fafb',
                padding: '2rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb'
              }}>
                {dimensions.map(dimension => (
                  <ProgressCircle
                    key={dimension.key}
                    value={scores[dimension.key]}
                    max={7}
                    size={100}
                    strokeWidth={10}
                    color={dimension.color}
                    title={dimension.title}
                    subtitle={`${scores[dimension.key].toFixed(1)}/7`}
                  />
                ))}
              </div>
              
              {/* Score Summary */}
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '0.75rem',
                border: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <h5 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 1rem 0'
                }}>
                  Overall Leadership Performance
                </h5>
                <div style={{
                  fontSize: '2rem',
                  fontWeight: '700',
                  color: '#3b82f6',
                  marginBottom: '0.5rem'
                }}>
                  {((scores.vision + scores.reality + scores.ethics + scores.courage) / 4).toFixed(1)}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  Average across all leadership dimensions
                </div>
              </div>
            </div>
          )}

          {activeTab === 'responses' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {dimensions.map(dimension => (
                <div key={dimension.key}>
                  <h4 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: dimension.color,
                    margin: '0 0 1rem 0',
                    borderLeft: `4px solid ${dimension.color}`,
                    paddingLeft: '1rem'
                  }}>
                    {dimension.title}
                  </h4>
                  
                  {framework[dimension.key] && framework[dimension.key].questions && 
                   framework[dimension.key].questions.map((question, qIndex) => {
                    const responseValue = responses[dimension.key]?.[question.key];
                    
                    return (
                      <div 
                        key={qIndex}
                        style={{
                          backgroundColor: '#f9fafb',
                          padding: '1.5rem',
                          borderRadius: '0.75rem',
                          border: '1px solid #e5e7eb',
                          marginBottom: '1rem'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h5 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: '#111827',
                              margin: '0 0 0.5rem 0'
                            }}>
                              {question.question}
                            </h5>
                            <p style={{
                              fontSize: '0.875rem',
                              color: '#6b7280',
                              margin: '0 0 0.5rem 0',
                              lineHeight: 1.5
                            }}>
                              {question.description}
                            </p>
                            <p style={{
                              fontSize: '0.75rem',
                              color: '#9ca3af',
                              margin: 0,
                              fontStyle: 'italic'
                            }}>
                              {question.scale}
                            </p>
                          </div>
                          
                          <div style={{
                            marginLeft: '1rem',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '0.5rem 1rem',
                              backgroundColor: dimension.color,
                              color: 'white',
                              borderRadius: '0.5rem',
                              fontWeight: '600',
                              fontSize: '1.125rem',
                              minWidth: '3rem'
                            }}>
                              {responseValue || 'N/A'}
                            </div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              marginTop: '0.25rem'
                            }}>
                              Score
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show total score for this dimension */}
                  <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${dimension.color}`,
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {dimension.title} Dimension Average:
                      </span>
                      <span style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: dimension.color
                      }}>
                        {scores[dimension.key].toFixed(1)}/7
                      </span>
                    </div>
                  </div>
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
              <RadarChart 
                data={scores} 
                dimensions={dimensions.map(d => d.key)} 
                size={400}
              />
              <BarChart 
                data={scores} 
                dimensions={dimensions} 
                height={250}
              />
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
  AssessmentDetailsModal,
  ProgressCircle
};