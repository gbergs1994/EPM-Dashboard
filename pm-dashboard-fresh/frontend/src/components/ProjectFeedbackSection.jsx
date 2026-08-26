import React, { useState } from 'react';
import { Send, Target, Award, Activity, Users, CheckCircle, RotateCcw, Info } from 'lucide-react';

const ProjectFeedbackSection = ({ project, onSubmitFeedback, currentUser, refreshHistory }) => {
  const [feedbackData, setFeedbackData] = useState({
    PM_Time: 4,
    PM_Quality: 4,
    PM_Cost: 4,
    Leadership_Vision: 4,
    Leadership_Reality: 4,
    Leadership_Ethics: 4,
    Leadership_Courage: 4,
    ChangeMgmt_Vision: 4,
    ChangeMgmt_Alignment: 4,
    ChangeMgmt_Understand: 4,
    ChangeMgmt_Enact: 4,
    CareerDev_KnowYourself: 4,
    CareerDev_KnowYourMarket: 4,
    CareerDev_TellYourStory: 4
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const feedbackCategories = [
    {
      key: 'PM',
      label: 'Project Management',
      description: 'Rate your experience with project management aspects',
      color: '#3b82f6',
      icon: Target,
      elements: [
        { key: 'PM_Time', name: 'Time', description: 'Time management and scheduling' },
        { key: 'PM_Quality', name: 'Quality', description: 'Quality standards and deliverables' },
        { key: 'PM_Cost', name: 'Cost', description: 'Budget management and cost control' }
      ]
    },
    {
      key: 'Leadership',
      label: 'Leadership',
      description: 'Rate the leadership aspects of this project',
      color: '#10b981',
      icon: Award,
      elements: [
        { key: 'Leadership_Vision', name: 'Vision', description: 'Leadership vision and direction' },
        { key: 'Leadership_Reality', name: 'Reality', description: 'Realistic expectations and planning' },
        { key: 'Leadership_Ethics', name: 'Ethics', description: 'Ethical decision-making and integrity' },
        { key: 'Leadership_Courage', name: 'Courage', description: 'Bold decisions and risk-taking' }
      ]
    },
    {
      key: 'ChangeMgmt',
      label: 'Organizational Change Management',
      description: 'Rate how well change was managed in this project',
      color: '#8b5cf6',
      icon: Activity,
      elements: [
        { key: 'ChangeMgmt_Vision', name: 'Vision', description: 'Clear project vision and goals' },
        { key: 'ChangeMgmt_Alignment', name: 'Alignment', description: 'Team and stakeholder alignment' },
        { key: 'ChangeMgmt_Understand', name: 'Understand', description: 'Understanding of change impacts' },
        { key: 'ChangeMgmt_Enact', name: 'Enact', description: 'Implementation of change initiatives' }
      ]
    },
    {
      key: 'CareerDev',
      label: 'Career Development',
      description: 'Rate your personal development through this project',
      color: '#f59e0b',
      icon: Users,
      elements: [
        { key: 'CareerDev_KnowYourself', name: 'Know Yourself', description: 'Self-awareness and personal growth' },
        { key: 'CareerDev_KnowYourMarket', name: 'Know Your Market', description: 'Market and industry knowledge gained' },
        { key: 'CareerDev_TellYourStory', name: 'Tell Your Story', description: 'Ability to articulate your contributions' }
      ]
    }
  ];

  const likertLabels = [
    { value: 1, label: 'Strongly Disagree', color: '#dc2626' },
    { value: 2, label: 'Disagree', color: '#ea580c' },
    { value: 3, label: 'Somewhat Disagree', color: '#ca8a04' },
    { value: 4, label: 'Neutral', color: '#6b7280' },
    { value: 5, label: 'Somewhat Agree', color: '#059669' },
    { value: 6, label: 'Agree', color: '#0d9488' },
    { value: 7, label: 'Strongly Agree', color: '#047857' }
  ];

  const handleSliderChange = (elementKey, value) => {
    setFeedbackData(prev => ({
      ...prev,
      [elementKey]: parseInt(value)
    }));
  };

  const resetForm = () => {
    const resetData = {};
    Object.keys(feedbackData).forEach(key => {
      resetData[key] = 4; 
    });
    setFeedbackData(resetData);
    setSubmitError(null);
  };

  const handleSubmit = async () => {
    if (!project?.id) {
      setSubmitError('Project ID is missing');
      return;
    }

    if (!currentUser?.name) {
      setSubmitError('User information is missing');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('🎯 Submitting feedback for project:', project.id);
      console.log('👤 User:', currentUser.name);
      console.log('📊 Feedback data:', feedbackData);

      // Prepare the feedback payload with proper structure
      const feedbackPayload = {
        userName: currentUser.name,
        currentUser: currentUser,
        ...feedbackData
      };

      console.log('📤 Sending feedback payload:', feedbackPayload);

      // Call the onSubmitFeedback function passed from parent
      if (onSubmitFeedback) {
        await onSubmitFeedback(feedbackPayload);
      } else {
        throw new Error('onSubmitFeedback function not provided');
      }

      console.log('✅ Feedback submitted successfully');

      // Show success message
      setShowSubmitted(true);

      // Reset form after successful submission
      resetForm();

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShowSubmitted(false);
      }, 3000);

      // Refresh project history if function provided
      if (refreshHistory) {
        console.log('🔄 Refreshing project history after feedback submission...');
        await refreshHistory();
      }

    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      setSubmitError(error.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLikertLabel = (value) => {
    return likertLabels.find(label => label.value === value);
  };

  const getOverallAverage = () => {
    const values = Object.values(feedbackData);
    const average = values.reduce((sum, val) => sum + val, 0) / values.length;
    return average.toFixed(1);
  };

  const getOverallPercentage = () => {
    const average = parseFloat(getOverallAverage());
    return ((average / 7) * 100).toFixed(1);
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.75rem',
      border: '1px solid #e5e7eb',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Send size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: 0 }}>
              Submit Project Feedback
            </h3>
            <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0 }}>
              Rate your experience across all project dimensions
            </p>
          </div>
        </div>

        {/* Overall Progress Indicator */}
        <div style={{
          padding: '1rem',
          backgroundColor: '#f8fafc',
          borderRadius: '0.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: '500' }}>
              Your Overall Rating
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '0.5rem 1rem',
                borderRadius: '9999px'
              }}>
                {getOverallAverage()}/7.0
              </span>
              <span style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#6b7280',
                backgroundColor: '#f3f4f6',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px'
              }}>
                {getOverallPercentage()}%
              </span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#991b1b'
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
              ❌ {submitError}
            </p>
          </div>
        )}

        {/* Success Message */}
        {showSubmitted && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '0.5rem',
            color: '#166534'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}>
              <CheckCircle size={16} />
              Feedback submitted successfully! Project scores have been updated.
            </div>
          </div>
        )}
      </div>

      {/* Feedback Categories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', marginBottom: '2rem' }}>
        {feedbackCategories.map(category => {
          const Icon = category.icon;
          const categoryAverage = category.elements.reduce((sum, element) =>
            sum + feedbackData[element.key], 0
          ) / category.elements.length;

          return (
            <div key={category.key} style={{
              padding: '1.5rem',
              backgroundColor: '#fafbfc',
              borderRadius: '0.75rem',
              border: `2px solid ${category.color}20`
            }}>
              {/* Category Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  backgroundColor: `${category.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Icon size={20} style={{ color: category.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                    {category.label}
                  </h4>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                    {category.description}
                  </p>
                </div>
                <div style={{
                  backgroundColor: `${category.color}15`,
                  color: category.color,
                  padding: '0.5rem 1rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  Avg: {categoryAverage.toFixed(1)}/7.0
                </div>
              </div>

              {/* Elements */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {category.elements.map(element => {
                  const currentValue = feedbackData[element.key];
                  const currentLabel = getLikertLabel(currentValue);

                  return (
                    <div key={element.key} style={{
                      padding: '1.5rem',
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                    }}>
                      {/* Element Header */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <h5 style={{ fontSize: '1rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                            {element.name}
                          </h5>
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: '700',
                            color: currentLabel.color,
                            backgroundColor: `${currentLabel.color}15`,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px'
                          }}>
                            {currentValue}/7
                          </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                          {element.description}
                        </p>
                      </div>

                      {/* Slider */}
                      <div style={{ marginBottom: '1rem' }}>
                        <input
                          type="range"
                          min="1"
                          max="7"
                          value={currentValue}
                          onChange={(e) => handleSliderChange(element.key, e.target.value)}
                          style={{
                            width: '100%',
                            height: '8px',
                            borderRadius: '4px',
                            background: `linear-gradient(to right, #dc2626 0%, #ca8a04 50%, #047857 100%)`,
                            outline: 'none',
                            appearance: 'none',
                            cursor: 'pointer'
                          }}
                        />
                      </div>

                      {/* Scale Labels */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          {likertLabels.map(label => (
                            <div key={label.value} style={{
                              textAlign: 'center',
                              flex: 1,
                              opacity: currentValue === label.value ? 1 : 0.5,
                              transition: 'opacity 0.2s'
                            }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: currentValue === label.value ? '600' : '400',
                                color: currentValue === label.value ? label.color : '#9ca3af'
                              }}>
                                {label.value}
                              </div>
                              <div style={{
                                fontSize: '0.625rem',
                                color: currentValue === label.value ? label.color : '#d1d5db',
                                marginTop: '0.25rem',
                                lineHeight: 1.2
                              }}>
                                {currentValue === label.value ? label.label : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        backgroundColor: '#f8fafc',
        borderRadius: '0.5rem',
        border: '1px solid #e2e8f0'
      }}>
        <button
          onClick={resetForm}
          disabled={isSubmitting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.5rem',
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.5 : 1,
            transition: 'all 0.2s'
          }}
        >
          <RotateCcw size={16} />
          Reset to Neutral
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {showSubmitted && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              backgroundColor: '#dcfce7',
              border: '1px solid #bbf7d0',
              borderRadius: '0.5rem',
              color: '#166534',
              fontSize: '0.875rem',
              fontWeight: '500',
              animation: 'fadeIn 0.3s ease-in'
            }}>
              <CheckCircle size={16} />
              Feedback submitted successfully!
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 2rem',
              background: isSubmitting
                ? 'linear-gradient(to right, #9ca3af, #6b7280)'
                : 'linear-gradient(to right, #2563eb, #1d4ed8)',
              border: 'none',
              borderRadius: '0.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(59, 130, 246, 0.25)'
            }}
          >
            {isSubmitting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Submitting...
              </>
            ) : (
              <>
                <Send size={16} />
                Submit Feedback
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        borderRadius: '0.5rem',
        border: '1px solid #dbeafe'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          <Info size={16} style={{ color: '#2563eb', marginTop: '0.125rem', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.875rem', color: '#1e40af', margin: '0 0 0.5rem 0', fontWeight: '600' }}>
              How to use this feedback form:
            </p>
            <ul style={{ fontSize: '0.875rem', color: '#1e40af', margin: 0, paddingLeft: '1rem', lineHeight: 1.5 }}>
              <li>Rate each element on a scale of 1-7 (1 = Strongly Disagree, 7 = Strongly Agree)</li>
              <li>Use the sliders to adjust your ratings for each component</li>
              <li>Your overall and category averages update automatically</li>
              <li>Click "Submit Feedback" when you're satisfied with your ratings</li>
              <li>Your feedback will automatically update the project's progress scores</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateX(10px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #2563eb;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ProjectFeedbackSection;