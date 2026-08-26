// frontend/src/components/EnhancedVisualizationComponents.jsx
import React from 'react';
import { TrendingUp, Users, Target } from 'lucide-react';

// Progress Circle Component for each dimension
const ProgressCircle = ({ value, maxValue = 7, size = 120, strokeWidth = 12, color, title, subtitle }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = (value / maxValue) * 100;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      textAlign: 'center'
    }}>
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out'
            }}
          />
        </svg>
        
        {/* Center text */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: color
          }}>
            {value.toFixed(1)}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280'
          }}>
            /{maxValue}
          </div>
        </div>
      </div>
      
      <div>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#111827',
          marginBottom: '0.25rem'
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
    </div>
  );
};

// Horizontal Progress Bars with comparisons
const HorizontalProgressBars = ({ data, framework, teamAverage = null }) => {
  const dimensions = Object.keys(framework);
  const maxValue = 7;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {dimensions.map(dimension => {
        const value = parseFloat(data[dimension]) || 0;
        const avgValue = teamAverage ? parseFloat(teamAverage[dimension]) || 0 : null;
        const percentage = (value / maxValue) * 100;
        const avgPercentage = avgValue ? (avgValue / maxValue) * 100 : 0;

        return (
          <div key={dimension}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <h4 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#111827',
                margin: 0
              }}>
                {framework[dimension].title}
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: framework[dimension].color
                }}>
                  {value.toFixed(1)}
                </span>
                {avgValue && (
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Avg: {avgValue.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
            
            <div style={{
              position: 'relative',
              height: '1.5rem',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.75rem',
              overflow: 'hidden'
            }}>
              {/* Main progress bar */}
              <div
                style={{
                  height: '100%',
                  width: `${percentage}%`,
                  backgroundColor: framework[dimension].color,
                  borderRadius: '0.75rem',
                  transition: 'width 0.5s ease-in-out',
                  position: 'relative'
                }}
              />
              
              {/* Team average indicator */}
              {avgValue && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${avgPercentage}%`,
                    width: '3px',
                    height: '100%',
                    backgroundColor: '#374151',
                    borderRadius: '1px'
                  }}
                />
              )}
              
              {/* Score markers */}
              {[1, 2, 3, 4, 5, 6, 7].map(marker => (
                <div
                  key={marker}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: `${(marker / maxValue) * 100}%`,
                    width: '1px',
                    height: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.5)'
                  }}
                />
              ))}
            </div>
            
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem',
              lineHeight: 1.4
            }}>
              {framework[dimension].description}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Trend Line Chart for showing progress over time
const TrendLineChart = ({ assessments, framework, height = 300, width = 600 }) => {
  if (!assessments || assessments.length === 0) {
    return (
      <div style={{
        height,
        width,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <TrendingUp size={48} style={{ margin: '0 auto 1rem', display: 'block' }} />
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  const sortedAssessments = [...assessments].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const dimensions = Object.keys(framework);
  const maxValue = 7;
  const margin = { top: 20, right: 30, bottom: 40, left: 40 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Calculate points for each dimension
  const getPoints = (dimension) => {
    return sortedAssessments.map((assessment, index) => {
      const x = margin.left + (index / Math.max(1, sortedAssessments.length - 1)) * chartWidth;
      const value = parseFloat(assessment[`${dimension}_score`]) || 0;
      const y = margin.top + chartHeight - (value / maxValue) * chartHeight;
      return { x, y, value };
    });
  };

  return (
    <div style={{ width, height }}>
      <svg width={width} height={height}>
        {/* Grid lines */}
        {[1, 2, 3, 4, 5, 6, 7].map(value => (
          <g key={value}>
            <line
              x1={margin.left}
              y1={margin.top + chartHeight - (value / maxValue) * chartHeight}
              x2={width - margin.right}
              y2={margin.top + chartHeight - (value / maxValue) * chartHeight}
              stroke="#f3f4f6"
              strokeWidth={1}
            />
            <text
              x={margin.left - 10}
              y={margin.top + chartHeight - (value / maxValue) * chartHeight + 4}
              textAnchor="end"
              fontSize="12"
              fill="#6b7280"
            >
              {value}
            </text>
          </g>
        ))}

        {/* Lines for each dimension */}
        {dimensions.map(dimension => {
          const points = getPoints(dimension);
          const pathData = points.map((point, index) => 
            `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
          ).join(' ');

          return (
            <g key={dimension}>
              {/* Line */}
              <path
                d={pathData}
                stroke={framework[dimension].color}
                strokeWidth={3}
                fill="none"
                strokeLinejoin="round"
              />
              
              {/* Points */}
              {points.map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={4}
                  fill={framework[dimension].color}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {sortedAssessments.map((assessment, index) => {
          const x = margin.left + (index / Math.max(1, sortedAssessments.length - 1)) * chartWidth;
          const date = new Date(assessment.created_at).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          });
          
          return (
            <text
              key={index}
              x={x}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {date}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '2rem',
        marginTop: '1rem'
      }}>
        {dimensions.map(dimension => (
          <div key={dimension} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '16px',
                height: '3px',
                backgroundColor: framework[dimension].color,
                borderRadius: '1px'
              }}
            />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>
              {framework[dimension].title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Comparison Matrix showing team performance
const ComparisonMatrix = ({ assessments, framework, projects }) => {
  if (!assessments || assessments.length === 0) return null;

  // Group assessments by user
  const userGroups = assessments.reduce((groups, assessment) => {
    const userId = assessment.user_id;
    if (!groups[userId]) {
      groups[userId] = {
        user_name: assessment.user_name,
        assessments: []
      };
    }
    groups[userId].assessments.push(assessment);
    return groups;
  }, {});

  const dimensions = Object.keys(framework);
  const users = Object.values(userGroups);

  // Calculate average scores for each user
  const userAverages = users.map(user => {
    const avgScores = {};
    dimensions.forEach(dimension => {
      const scores = user.assessments
        .map(a => parseFloat(a[`${dimension}_score`]) || 0)
        .filter(score => score > 0);
      avgScores[dimension] = scores.length > 0 
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
        : 0;
    });
    return {
      ...user,
      averages: avgScores,
      overall: Object.values(avgScores).reduce((sum, score) => sum + score, 0) / dimensions.length
    };
  });

  // Sort by overall score
  userAverages.sort((a, b) => b.overall - a.overall);

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `200px repeat(${dimensions.length}, 1fr) 100px`,
        gap: '0.5rem',
        backgroundColor: '#f9fafb',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <div style={{ fontWeight: '600', color: '#374151' }}>Team Member</div>
        {dimensions.map(dimension => (
          <div key={dimension} style={{ 
            fontWeight: '600', 
            color: framework[dimension].color,
            textAlign: 'center',
            fontSize: '0.875rem'
          }}>
            {framework[dimension].title}
          </div>
        ))}
        <div style={{ fontWeight: '600', color: '#374151', textAlign: 'center' }}>Overall</div>
      </div>

      {userAverages.map((user, index) => (
        <div
          key={user.user_name}
          style={{
            display: 'grid',
            gridTemplateColumns: `200px repeat(${dimensions.length}, 1fr) 100px`,
            gap: '0.5rem',
            padding: '1rem',
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            marginBottom: '0.5rem'
          }}
        >
          <div style={{ 
            fontWeight: '500', 
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}>
              {index + 1}
            </div>
            {user.user_name}
          </div>
          
          {dimensions.map(dimension => (
            <div key={dimension} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  backgroundColor: framework[dimension].color,
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  minWidth: '40px'
                }}
              >
                {user.averages[dimension].toFixed(1)}
              </div>
            </div>
          ))}
          
          <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                backgroundColor: user.overall >= 5 ? '#22c55e' : user.overall >= 3 ? '#eab308' : '#ef4444',
                color: 'white',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                minWidth: '50px'
              }}
            >
              {user.overall.toFixed(1)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export {
  ProgressCircle,
  HorizontalProgressBars,
  TrendLineChart,
  ComparisonMatrix
};