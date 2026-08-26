import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { TrendingUp, Activity } from 'lucide-react';

// Helper function to create darker colors for better text contrast on checkboxes only
const getDarkerColor = (color) => {
  const colorMap = {
    '#488ffa': '#1d3fd8', // blue
    '#8b5cf6': '#52269e', // purple  
    '#10b981': '#047853', // green
    '#ff6d05': '#9c4303', // Orange
    '#00ffff': '#0891b2', // cyan
    '#e8e800': '#999903', // Yellow
    '#9eff2f': '#559906', // lime - much darker for readability
    '#ff0400': '#9c0402', // red
    '#ff03c4': '#9c0278'  // pink
  };
  return colorMap[color] || color;
};

/**
 * Career Category Graph - Career Goals Progress Visualization
 * ONLY works with career_development_goals data from the database
 */
const CareerCategoryGraph = ({ goals = [], completedGoals = [] }) => {
  console.log('ðŸŽ¯ CareerCategoryGraph received data:');
  console.log('ðŸ“š Goals:', goals.length, goals);
  console.log('âœ… Completed Goals:', completedGoals.length, completedGoals);

  const [timeFilter, setTimeFilter] = useState('1month');
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, content: '' });
  const [selectedCategories, setSelectedCategories] = useState(new Set());

  useEffect(() => {
    const allGoals = [...goals, ...completedGoals];
    const projectFields = ['pm_progress', 'leadership_progress', 'project_id', 'sprint_id', 'milestone_id'];
    const careerFields = ['category', 'title', 'current_progress', 'target_level', 'current_level'];
    
    let hasProjectData = false;
    let missingCareerFields = 0;
    
    allGoals.forEach(goal => {
      if (projectFields.some(field => goal[field] !== undefined)) {
        console.error('âŒ CRITICAL: Receiving PROJECT data instead of CAREER data!');
        console.error('âŒ Goal contains project fields:', goal);
        hasProjectData = true;
      }
      
      const missingFields = careerFields.filter(field => !goal[field] && field !== 'current_progress');
      if (missingFields.length > 2) { 
        console.warn('âš ï¸ Goal missing required career fields:', missingFields, goal);
        missingCareerFields++;
      }
    });
    
    if (hasProjectData) {
      console.error('Error: Project data detected - this component expects career development goals only');
      return;
    }
    
    if (missingCareerFields > allGoals.length * 0.5) {
      console.warn('Warning: Many goals missing career-specific fields - data quality may be compromised');
    }
    
    console.log('âœ… Expected career goal fields: title, category, current_progress, status, target_level, current_level');
    if (allGoals.length > 0) {
      console.log('ðŸ“‹ Sample goal structure:', Object.keys(allGoals[0]));
      console.log('ðŸ“Š Total career goals processed:', allGoals.length);
    }
  }, [goals, completedGoals]);

  // Category configuration
  const categoryConfig = {
    'technical': { name: 'Technical Skills', color: '#488ffa' },
    'management': { name: 'Management', color: '#8b5cf6' },
    'communication': { name: 'Communication', color: '#10b981' },
    'design': { name: 'Design', color: '#ff6d05' },
    'analytics': { name: 'Data Analytics', color: '#00ffff' },
    'leadership': { name: 'Leadership', color: '#e8e800' },
    'business strategy': { name: 'Business Strategy', color: '#9eff2f' },
    'team building': { name: 'Team Building', color: '#ff0400' },
    'innovation': { name: 'Innovation', color: '#ff03c4' },
  };

  // Data processing function
  const normalizeHistory = useCallback((goal) => {
    const events = [];

    if (goal.goal_progress_history) {
      let historyArray = goal.goal_progress_history;
      
      if (typeof historyArray === 'string') {
        try {
          historyArray = JSON.parse(historyArray);
        } catch (e) {
          historyArray = [];
        }
      }
      
      if (Array.isArray(historyArray)) {
        for (const event of historyArray) {
          const progress = typeof event?.new_progress === 'number' ? event.new_progress : null;
          const dateStr = event?.created_at;
          
          if (progress !== null && dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date)) {
              events.push({ value: Math.max(0, Math.min(100, progress)), date: date });
            }
          }
        }
      }
    }

    // Check for other history formats
    const candidates = [
      { key: 'progress_history', value: goal.progress_history },
      { key: 'progressHistory', value: goal.progressHistory },
      { key: 'history', value: goal.history },
      { key: 'updates', value: goal.updates },
    ];

    for (const candidate of candidates) {
      if (candidate.value && Array.isArray(candidate.value)) {
        for (const event of candidate.value) {
          const progress =
            (typeof event?.new_progress === 'number' ? event.new_progress : null) ??
            (typeof event?.value === 'number' ? event.value : null) ??
            (typeof event?.progress === 'number' ? event.progress : null);
          const dateStr = event?.created_at || event?.date || event?.timestamp || null;
          
          if (progress !== null && dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date)) {
              events.push({ value: Math.max(0, Math.min(100, progress)), date: date });
            }
          }
        }
      }
    }

    if (goal.completed_date && goal.status === 'completed') {
      let completedDate = new Date(goal.completed_date);
      if (!isNaN(completedDate)) {
        events.push({ value: 100, date: completedDate });
      }
    }

    events.sort((a, b) => a.date - b.date);

    if (events.length === 0) {
      const currentProgress = typeof goal.current_progress === 'number' ? goal.current_progress : 
                            typeof goal.progress === 'number' ? goal.progress : null;
      const timestamp = goal.updated_at || goal.created_at || null;
      
      if (currentProgress !== null && currentProgress >= 0 && timestamp) {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
          events.push({ value: Math.max(0, Math.min(100, currentProgress)), date: date });
        }
      }
    }

    return events;
  }, []);

  const processedData = useMemo(() => {
    const stats = {};
    
    Object.keys(categoryConfig).forEach(key => {
      stats[key] = {
        name: categoryConfig[key].name,
        color: categoryConfig[key].color,
        goals: [],
        total: 0,
        active: 0,
        completed: 0,
        paused: 0,
        totalProgressForAvg: 0,
        goalsWithProgress: 0,
        hasGoals: false,
      };
    });
    
    const allGoals = [...goals];
    (completedGoals || []).forEach(cGoal => {
      if (!allGoals.find(g => g.id === cGoal.id)) {
        allGoals.push(cGoal);
      }
    });
    
    console.log('ðŸ“Š Processing career goals:', allGoals.length, 'total goals');
    
    for (const goal of allGoals) {
      const category = (goal.category || '').toLowerCase().trim();
      
      if (!stats[category]) {
        console.warn('âš ï¸ Unknown career category:', category, 'for goal:', goal.title);
        continue;
      }

      const history = normalizeHistory(goal);
      const status = (goal.status || '').toLowerCase();

      const goalWithHistory = { ...goal, __history: history };
      stats[category].goals.push(goalWithHistory);
      stats[category].total += 1;
      stats[category].hasGoals = true;

      if (status === 'completed') {
        stats[category].completed += 1;
      } else if (status === 'paused' || status === 'inactive') {
        stats[category].paused += 1;
      } else {
        stats[category].active += 1; 
      }

      let progressValue = 0;
      let hasProgressData = false;

      if (history.length > 0) {
        progressValue = history[history.length - 1].value;
        hasProgressData = true;
      } else {
        const progressFields = [
          'current_progress', 
          'progress', 
          'completion_percentage',
          'skill_progress'
        ];
        
        for (const field of progressFields) {
          if (typeof goal[field] === 'number' && goal[field] >= 0) {
            progressValue = goal[field];
            hasProgressData = true;
            break;
          }
        }
      }

      if (hasProgressData) {
        stats[category].totalProgressForAvg += Math.min(100, Math.max(0, progressValue));
        stats[category].goalsWithProgress += 1;
      }
    }

    Object.entries(stats).forEach(([key, cat]) => {
      cat.avgProgress = cat.goalsWithProgress > 0 
        ? Math.round(cat.totalProgressForAvg / cat.goalsWithProgress) 
        : 0;
      
      cat.hasRecentActivity = cat.goals.some(goal => {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        if (goal.__history && goal.__history.some(event => event.date > sevenDaysAgo)) {
          return true;
        }
        
        if (goal.updated_at) {
          const updatedDate = new Date(goal.updated_at);
          return updatedDate > sevenDaysAgo;
        }
        
        return false;
      });
    });

    console.log('âœ… Career data processed:', {
      categoriesWithGoals: Object.values(stats).filter(c => c.hasGoals).length,
      totalGoals: Object.values(stats).reduce((sum, c) => sum + c.total, 0),
      activeGoals: Object.values(stats).reduce((sum, c) => sum + c.active, 0)
    });

    return stats;
  }, [goals, completedGoals, normalizeHistory]);

  const toggleCategory = useCallback((categoryKey) => {
    setSelectedCategories(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(categoryKey)) {
        newSelected.delete(categoryKey);
      } else {
        newSelected.add(categoryKey);
      }
      return newSelected;
    });
  }, []);

  const toggleAllCategories = useCallback(() => {
    const categoriesWithGoals = Object.entries(processedData)
      .filter(([_, cat]) => cat.hasGoals)
      .map(([key, _]) => key);
    
    setSelectedCategories(prev => {
      if (prev.size === categoriesWithGoals.length) {
        return new Set();
      } else {
        return new Set(categoriesWithGoals);
      }
    });
  }, [processedData]);

  const timeAxisConfig = useMemo(() => {
    const now = new Date();
    
    switch (timeFilter) {
      case '1hour':
        return {
          points: 13,
          getDate: (i) => {
            const d = new Date(now);
            d.setMinutes(now.getMinutes() - 60 + (i * 5), 0, 0);
            return d;
          },
          formatLabel: (d) => {
            const min = d.getMinutes();
            const hr = d.getHours();
            const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
            return `${h12}:${min.toString().padStart(2, '0')}${hr >= 12 ? 'pm' : 'am'}`;
          },
          periodDuration: 5 * 60 * 1000
        };
      case '24hours':
        return {
          points: 24,
          getDate: (i) => {
            const d = new Date(now);
            d.setHours(now.getHours() - 23 + i, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => {
            const hr = d.getHours();
            const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
            return `${h12}${hr >= 12 ? 'pm' : 'am'}`;
          },
          periodDuration: 60 * 60 * 1000
        };
      case '1week':
        return {
          points: 7,
          getDate: (i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - 6 + i);
            d.setHours(0, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => d.toLocaleDateString('en-US', { weekday: 'short' }),
          periodDuration: 24 * 60 * 60 * 1000
        };
      case '1month':
        return {
          points: 30,
          getDate: (i) => {
            const d = new Date(now);
            d.setDate(now.getDate() - 29 + i);
            d.setHours(0, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          periodDuration: 24 * 60 * 60 * 1000
        };
      case '12months':
      default:
        return {
          points: 12,
          getDate: (i) => {
            const d = new Date(now);
            d.setMonth(now.getMonth() - 11 + i, 1);
            d.setHours(0, 0, 0, 0);
            return d;
          },
          formatLabel: (d) => d.toLocaleDateString('en-US', { month: 'short' }),
          periodDuration: 30 * 24 * 60 * 60 * 1000
        };
    }
  }, [timeFilter]);

  const timeAxis = useMemo(() => {
    const points = [];
    for (let i = 0; i < timeAxisConfig.points; i++) {
      const date = timeAxisConfig.getDate(i);
      points.push({ 
        date, 
        label: timeAxisConfig.formatLabel(date),
        index: i
      });
    }
    return points;
  }, [timeAxisConfig]);

  const progressEvents = useMemo(() => {
    const categoryTimeline = {};

    Object.entries(processedData).forEach(([catKey, cat]) => {
      categoryTimeline[catKey] = [];
      
      if (!cat.hasGoals) {
        return;
      }

      const allEvents = [];
      for (const goal of cat.goals) {
        const history = goal.__history;
        if (!history || history.length === 0) continue;

        history.forEach(event => {
          allEvents.push({
            date: event.date,
            value: event.value,
            goalId: goal.id,
            goalTitle: goal.title
          });
        });
      }

      if (allEvents.length === 0) {
        return;
      }
      
      timeAxis.forEach((axisPoint) => {
        const periodStart = axisPoint.date;
        const periodEnd = new Date(periodStart.getTime() + timeAxisConfig.periodDuration);

        const eventsInPeriod = allEvents.filter(event => 
          event.date >= periodStart && event.date < periodEnd
        );

        if (eventsInPeriod.length === 0) {
          return;
        }

        const eventsUpToPeriod = allEvents.filter(event => event.date <= periodEnd);
        
        if (eventsUpToPeriod.length === 0) return;

        const goalProgresses = {};
        eventsUpToPeriod.forEach(event => {
          goalProgresses[event.goalId] = event.value;
        });

        const progressValues = Object.values(goalProgresses);
        if (progressValues.length === 0) return;
        
        const avgProgress = progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length;

        categoryTimeline[catKey].push({
          date: axisPoint.date,
          value: Math.round(avgProgress),
          goalCount: Object.keys(goalProgresses).length,
          goalTitles: eventsInPeriod.map(e => e.goalTitle),
          updatesInPeriod: eventsInPeriod.length,
          periodStart: periodStart,
          periodEnd: periodEnd
        });
      });

      categoryTimeline[catKey].sort((a, b) => a.date - b.date);
    });

    return categoryTimeline;
  }, [processedData, timeAxis, timeAxisConfig]);

  const timeSeriesData = useMemo(() => {
    return timeAxis.map((point, i) => ({ ...point, index: i }));
  }, [timeAxis]);

  useEffect(() => {
    if (selectedCategories.size === 0) {
      const categoriesWithGoals = Object.entries(processedData)
        .filter(([_, cat]) => cat.hasGoals)
        .map(([key, _]) => key);
      setSelectedCategories(new Set(categoriesWithGoals));
    }
  }, [processedData, selectedCategories.size]);

  const hasAnyGoals = Object.values(processedData).some(cat => cat.hasGoals);
  
  if (!hasAnyGoals) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <Activity size={48} style={{ color: '#9ca3af', margin: '0 auto 1rem' }} />
        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
          No Category Data Yet
        </h3>
        <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
          Start adding goals to see category progress trends
        </p>
      </div>
    );
  }

  // Chart dimensions
  const chartWidth = 760;
  const chartHeight = 250;
  const marginLeft = 60;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 40;
  const plotWidth = chartWidth - marginLeft - marginRight;
  const plotHeight = chartHeight - marginTop - marginBottom;

  return (
    <div style={{
      background: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '1.5rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: '#111827',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <TrendingUp size={20} />
          Category Progress Over Time
        </h3>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Track progress trends across your skill categories
        </p>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem', 
          marginBottom: '0.75rem',
          flexWrap: 'wrap'
        }}>
          <h4 style={{ 
            margin: 0, 
            fontSize: '0.875rem', 
            fontWeight: '600', 
            color: '#374151' 
          }}>
            Show Categories:
          </h4>
          <button
            onClick={toggleAllCategories}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: '#3b82f6',
              color: 'white',
              transition: 'all 0.2s'
            }}
          >
            {selectedCategories.size === Object.values(processedData).filter(cat => cat.hasGoals).length 
              ? 'Hide All' 
              : 'Show All'
            }
          </button>
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.75rem' 
        }}>
          {Object.entries(processedData)
            .filter(([_, cat]) => cat.hasGoals)
            .map(([catKey, category]) => {
              const isSelected = selectedCategories.has(catKey);
              const checkboxBgColor = isSelected ? getDarkerColor(category.color) : '#ffffff';
              
              return (
                <label
                  key={catKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    border: `2px solid ${isSelected ? getDarkerColor(category.color) : '#d1d5db'}`,
                    cursor: 'pointer',
                    backgroundColor: checkboxBgColor,
                    color: isSelected ? '#ffffff' : '#374151',
                    transition: 'all 0.2s',
                    userSelect: 'none',
                    boxShadow: isSelected ? `0 2px 4px ${category.color}40` : '0 1px 2px #0000000d'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleCategory(catKey)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: isSelected ? '#ffffff' : getDarkerColor(category.color),
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontWeight: '600' }}>
                    {category.name}
                  </span>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    opacity: isSelected ? 0.9 : 0.7,
                    fontWeight: '500'
                  }}>
                    ({category.total})
                  </span>
                </label>
              );
            })
          }
        </div>
      </div>

      {/* Time Filter Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { value: '1hour', label: 'Last Hour' },
          { value: '24hours', label: 'Last 24 Hours' },
          { value: '1week', label: 'Past Week' },
          { value: '1month', label: 'Past Month' },
          { value: '12months', label: 'Past Year' }
        ].map((filter) => (
          <button
            key={filter.value}
            onClick={() => setTimeFilter(filter.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: timeFilter === filter.value ? '#3b82f6' : '#f3f4f6',
              color: timeFilter === filter.value ? 'white' : '#374151',
              transition: 'all 0.2s'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Line Chart */}
      <div style={{ position: 'relative', marginBottom: '2rem', overflowX: 'auto' }}>
        <svg
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ minWidth: chartWidth }}
          onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
        >
          {/* Y grid + labels */}
          {[0, 25, 50, 75, 100].map((value) => {
            const y = marginTop + plotHeight - (value / 100 * plotHeight);
            return (
              <g key={value}>
                <line
                  x1={marginLeft}
                  y1={y}
                  x2={marginLeft + plotWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray={value === 0 ? "0" : "3,3"}
                />
                <text
                  x={marginLeft - 10}
                  y={y + 5}
                  fill="#6b7280"
                  fontSize="12"
                  textAnchor="end"
                >
                  {value}%
                </text>
              </g>
            );
          })}

          {/* X axis */}
          <line
            x1={marginLeft}
            y1={marginTop + plotHeight}
            x2={marginLeft + plotWidth}
            y2={marginTop + plotHeight}
            stroke="#e5e7eb"
          />

          {/* Lines and dots per category */}
          {Object.entries(processedData).map(([catKey, category]) => {
            if (!category.hasGoals || !selectedCategories.has(catKey)) return null;

            const categoryEvents = progressEvents[catKey] || [];
            
            if (categoryEvents.length === 0) return null;

            const chartPoints = categoryEvents.map(event => {
              const axisIndex = timeAxis.findIndex(axis => 
                Math.abs(axis.date.getTime() - event.date.getTime()) < 1000
              );
              
              if (axisIndex === -1) return null;
              
              const x = marginLeft + (axisIndex / (timeAxis.length - 1)) * plotWidth;
              const y = marginTop + plotHeight - (event.value / 100 * plotHeight);
              
              return { ...event, x, y, axisIndex };
            }).filter(Boolean);

            if (chartPoints.length === 0) return null;

            let pathData = '';
            if (chartPoints.length >= 2) {
              pathData = chartPoints.map((point, idx) => 
                `${idx === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
              ).join(' ');
            }

            return (
              <g key={catKey}>
                {/* Draw connecting lines */}
                {chartPoints.length >= 2 && (
                  <path
                    d={pathData}
                    fill="none"
                    stroke={category.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.8"
                  />
                )}
                
                {/* Draw dots */}
                {chartPoints.map((point, i) => (
                  <circle
                    key={`${catKey}-${i}`}
                    cx={point.x}
                    cy={point.y}
                    r="5"
                    fill={category.color}
                    stroke="white"
                    strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.ownerSVGElement.getBoundingClientRect();
                      setTooltip({
                        show: true,
                        x: e.clientX - rect.left + 10,
                        y: e.clientY - rect.top - 10,
                        content: `${category.name}: ${point.value}% average on ${point.date.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: timeFilter === '1hour' || timeFilter === '24hours' ? 'numeric' : undefined,
                          minute: timeFilter === '1hour' ? '2-digit' : undefined,
                          hour12: timeFilter === '1hour' || timeFilter === '24hours' ? true : undefined
                        })} (${point.updatesInPeriod} updates)`
                      });
                    }}
                    onMouseLeave={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
                  />
                ))}
              </g>
            );
          })}

          {/* X labels */}
          {timeSeriesData.map((pt, i) => {
            const show =
              timeFilter === '1hour' ? i % 2 === 0 :
              timeFilter === '24hours' ? i % 4 === 0 :
              timeFilter === '1week' ? true :
              timeFilter === '1month' ? i % 5 === 0 :
              i % 2 === 0;
            if (!show) return null;
            const x = marginLeft + (i / (timeSeriesData.length - 1)) * plotWidth;
            return (
              <text
                key={i}
                x={x}
                y={marginTop + plotHeight + 20}
                fill="#6b7280"
                fontSize="11"
                textAnchor="middle"
              >
                {pt.label}
              </text>
            );
          })}
        </svg>
        
        {/* Tooltip */}
        {tooltip.show && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 1000,
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            {tooltip.content}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1.5rem',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '0.5rem'
      }}>
        {Object.entries(processedData).map(([catKey, category]) => (
          <div
            key={catKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: category.hasGoals ? (selectedCategories.has(catKey) ? 1 : 0.4) : 0.2
            }}
          >
            <div style={{ 
              width: 12, 
              height: 12, 
              borderRadius: '50%', 
              backgroundColor: category.color,
              opacity: selectedCategories.has(catKey) ? 1 : 0.4
            }} />
            <span style={{ 
              fontSize: '0.875rem', 
              color: selectedCategories.has(catKey) ? '#374151' : '#9ca3af', 
              fontWeight: category.hasGoals ? '500' : '400' 
            }}>
              {category.name}
              {category.hasGoals
                ? <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 4 }}>
                    ({category.total} {category.total === 1 ? 'goal' : 'goals'})
                  </span>
                : <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginLeft: 4 }}>
                    (no goals)
                  </span>}
            </span>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '1rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
            {Object.values(processedData).reduce((sum, cat) => sum + cat.active, 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Active Goals
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#10b981' }}>
            {Object.values(processedData).reduce((sum, cat) => sum + cat.completed, 0)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Completed
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f59e0b' }}>
            {(() => {
              const withData = Object.values(processedData).filter(cat =>
                cat.hasGoals && cat.goalsWithProgress > 0
              );
              return withData.length > 0
                ? Math.round(withData.reduce((s, c) => s + c.avgProgress, 0) / withData.length) + '%'
                : '0%';
            })()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Avg Progress
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#8b5cf6' }}>
            {Object.values(processedData).filter(cat => cat.hasGoals).length}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
            Categories
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerCategoryGraph;