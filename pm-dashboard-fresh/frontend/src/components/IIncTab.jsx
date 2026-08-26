// frontend/src/components/IIncTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Compass, Star, MessageCircle, Lightbulb, Target, Plus, Eye, 
  Calendar, User, ArrowRight, CheckCircle, Clock, TrendingUp,
  FileText, Award, Brain, Heart, Zap, AlertCircle, ArrowLeft,
  UserCircle, History, Save
} from 'lucide-react';

const IIncTab = ({ currentUser, apiService, onDataChange }) => {
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [allTeamSubmissions, setAllTeamSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('overview');
  
  // Assessment form states
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentData, setAssessmentData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  
  // View Details states
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // I, Inc. Framework Structure
  const iIncModules = {
    passion: {
      title: 'Explore Your Passion',
      icon: Heart,
      color: '#e11d48',
      description: 'Discover what drives you and builds your foundation for success',
      sections: [
        {
          key: 'skills_knowledge',
          title: 'Skills and Knowledge',
          question: 'What do you need to do in order to be successful? What do you need to practice, to do it at a level of performance that will be desirable to a given employer?',
          placeholder: 'Describe the specific skills, knowledge areas, and competencies you need to develop...'
        },
        {
          key: 'track_record',
          title: 'Track Record',
          question: 'What instance can you describe when you have demonstrated the ability to perform?',
          placeholder: 'Provide specific examples of your past achievements and successful performances...'
        },
        {
          key: 'relationships',
          title: 'Relationships',
          question: 'What kind of values do you share with other people in the organization?',
          placeholder: 'Describe the values that connect you with colleagues and organizational culture...'
        }
      ]
    },
    sweetspot: {
      title: 'Find Your Career Sweet Spot',
      icon: Star,
      color: '#0ea5e9',
      description: 'Identify your unique position and value in the marketplace',
      sections: [
        {
          key: 'personal_brand',
          title: 'Personal Brand',
          question: 'What key words describe yourself?',
          placeholder: 'List the key words and phrases that best describe your professional identity...'
        },
        {
          key: 'value_proposition',
          title: 'Value Proposition',
          question: 'What "super powers" do you have that help describe the value you bring to an employer?',
          placeholder: 'Describe your unique strengths and capabilities that make you valuable...'
        },
        {
          key: 'underserved_need',
          title: 'Underserved Need',
          question: 'What have you found that is not served as much as it can be? (people or customers or business)',
          placeholder: 'Identify gaps in the market or unmet needs that align with your abilities...'
        }
      ]
    },
    story: {
      title: 'Tell Your Story',
      icon: MessageCircle,
      color: '#7c3aed',
      description: 'Craft your compelling professional narrative',
      sections: [
        {
          key: 'compelling',
          title: 'Compelling',
          question: 'What are you doing that helps you overcome challenges?',
          placeholder: 'Share how you face and overcome obstacles in your professional life...'
        },
        {
          key: 'valuable',
          title: 'Valuable',
          question: 'What phrase helps you describe the value you bring to an employer or the marketplace?',
          placeholder: 'Articulate your unique value proposition in a memorable way...'
        },
        {
          key: 'engaging',
          title: 'Engaging',
          question: 'What are you bringing that is valuable and consistent with your authentic self?',
          placeholder: 'Describe how your authentic self creates value for others...'
        }
      ]
    },
    entrepreneur: {
      title: 'Entrepreneurial Mindset',
      icon: Lightbulb,
      color: '#059669',
      description: 'Develop your innovative and business-oriented thinking',
      sections: [
        {
          key: 'survive',
          title: 'Survive',
          question: 'What can you do to take care of yourself? What will help you keep a good outlook?',
          placeholder: 'Describe your strategies for maintaining resilience and a positive mindset...'
        },
        {
          key: 'adapt',
          title: 'Adapt',
          question: 'What changes (technology, competition, processes) can you embrace? (Strive to be open, and above all else, remain authentic to who you are.)',
          placeholder: 'Share how you adapt to change while staying true to yourself...'
        },
        {
          key: 'flourish',
          title: 'Flourish',
          question: 'What plans do you need to put in place so that you can be more open to positive opportunities?',
          placeholder: 'Outline your plans for growth and seizing opportunities...'
        },
        {
          key: 'goals',
          title: 'Goals',
          question: 'What are you finding you would like to do with your career? Your life?',
          placeholder: 'Describe your career and life aspirations...'
        }
      ]
    }
  };

  // Calculate completion percentage
  const calculateCompletionPercentage = (data = assessmentData) => {
    const totalSections = Object.values(iIncModules).reduce((total, module) => 
      total + module.sections.length, 0
    );
    
    let completedSections = 0;
    Object.entries(iIncModules).forEach(([moduleKey, module]) => {
      module.sections.forEach(section => {
        if (data[moduleKey] && data[moduleKey][section.key] && 
            data[moduleKey][section.key].trim().length > 0) {
          completedSections++;
        }
      });
    });
    
    return Math.round((completedSections / totalSections) * 100);
  };

  // Fetch submission history
  const fetchSubmissionHistory = async () => {
    try {
      const response = await apiService.get(`/api/career/iinc-history/${currentUser.id}`);
      if (response.success) {
        setSubmissionHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching submission history:', error);
    }
  };

  // Fetch team submissions for project manager view
  const fetchTeamSubmissions = async () => {
    if (currentUser?.role === 'Project Manager') {
      try {
        const response = await apiService.get('/api/career/iinc-summary');
        if (response.success) {
          setAllTeamSubmissions(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching team submissions:', error);
      }
    }
  };

  // Fetch detailed user responses for View Details
  const fetchUserDetails = async (userId) => {
    setDetailsLoading(true);
    try {
      const response = await apiService.get(`/api/career/iinc-details/${userId}`);
      if (response.success) {
        setSelectedUserDetails(response.data);
        setShowDetailView(true);
      } else {
        console.error('Failed to fetch user details:', response.error);
        alert('Failed to load user details. Please try again.');
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      alert('Error loading user details. Please try again.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Load user's existing responses for editing
  const loadExistingResponses = async () => {
    try {
      const response = await apiService.get(`/api/career/iinc-responses/${currentUser.id}`);
      if (response.success && response.data) {
        setAssessmentData(response.data);
      }
    } catch (error) {
      console.error('Error loading existing responses:', error);
    }
  };

  // Submit the complete assessment
  const handleSubmitAssessment = async () => {
    // ensure we have a valid user before accessing id
    if (!currentUser || !currentUser.id) {
      alert('Cannot submit assessment: user information is unavailable. Please log in again.');
      return;
    }

    setSaveLoading(true);
    try {
      const completionPercentage = calculateCompletionPercentage();
      
      if (completionPercentage === 0) {
        alert('Please fill out at least one section before submitting.');
        setSaveLoading(false);
        return;
      }

      const response = await apiService.post('/api/career/iinc-submit', {
        user_id: currentUser.id,
        responses: assessmentData
      });
      
      if (response.success) {
        alert(`Assessment submitted successfully! Completion: ${completionPercentage}%`);
        setShowAssessmentForm(false);
        setAssessmentData({});
        await fetchSubmissionHistory();
        await fetchTeamSubmissions();
        if (onDataChange) onDataChange();
      } else {
        alert('Error submitting assessment: ' + response.error);
      }
    } catch (error) {
      console.error('Error submitting assessment:', error);
      const msg = error.message || 'Please try again.';
      alert('Error submitting assessment: ' + msg);
    } finally {
      setSaveLoading(false);
    }
  };

  // Update assessment data when user types
  const updateAssessmentData = (moduleKey, sectionKey, value) => {
    setAssessmentData(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [sectionKey]: value
      }
    }));
  };

  // Initialize component
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchSubmissionHistory(),
          fetchTeamSubmissions()
        ]);
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // Start new assessment
  const startNewAssessment = async () => {
    setAssessmentData({});
    await loadExistingResponses();
    setShowAssessmentForm(true);
  };

  // Get latest submission data for overview
  const getLatestSubmission = () => {
    return submissionHistory.length > 0 ? submissionHistory[0] : null;
  };

  // DETAILED VIEW COMPONENT WITH FIXED SUBMISSION NUMBERING
  const renderDetailedView = () => {
    if (!selectedUserDetails) return null;

    const { user, current_responses, submission_history, response_count } = selectedUserDetails;

    return (
      <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setShowDetailView(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#374151'
              }}
            >
              <ArrowLeft size={16} />
              Back to Team Overview
            </button>
            <div style={{ flex: 1 }}>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#1f2937', 
                margin: '0 0 4px 0' 
              }}>
                {user.name}'s I, Inc. Assessment
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '14px', color: '#6b7280' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <UserCircle size={16} />
                  {user.role}
                </span>
                <span>{user.email}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Submission History - FIXED NUMBERING */}
          {submission_history && submission_history.length > 0 && (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937', 
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <History size={20} />
                Assessment History
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {submission_history.map((submission, index) => {
                  // FIXED: Calculate correct submission number (reverse chronological numbering)
                  const submissionNumber = submission_history.length - index;
                  
                  return (
                    <div
                      key={submission.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        padding: '12px',
                        minWidth: '200px'
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                        Assessment #{submissionNumber}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                        {new Date(submission.submitted_at).toLocaleDateString()}
                      </div>
                      <div style={{ 
                        backgroundColor: '#e2e8f0', 
                        borderRadius: '4px', 
                        height: '6px',
                        overflow: 'hidden',
                        marginBottom: '4px'
                      }}>
                        <div style={{
                          backgroundColor: submission.completion_percentage >= 75 ? '#10b981' : 
                                         submission.completion_percentage >= 50 ? '#f59e0b' : '#3b82f6',
                          height: '100%',
                          width: `${Math.min(100, submission.completion_percentage)}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: '12px', color: '#374151' }}>
                        {Math.min(100, submission.completion_percentage)}% complete
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current Responses by Module */}
          <div style={{ display: 'grid', gap: '24px' }}>
            {Object.entries(iIncModules).map(([moduleKey, module]) => {
              const moduleResponses = current_responses[moduleKey] || {};
              const hasResponses = Object.keys(moduleResponses).length > 0;

              return (
                <div
                  key={moduleKey}
                  style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                >
                  {/* Module Header */}
                  <div style={{
                    backgroundColor: module.color + '10',
                    borderBottom: '1px solid #e5e7eb',
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <module.icon size={24} style={{ color: module.color }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: '#1f2937', 
                        margin: '0 0 4px 0' 
                      }}>
                        {module.title}
                      </h3>
                      <p style={{ 
                        color: '#6b7280', 
                        margin: 0, 
                        fontSize: '14px' 
                      }}>
                        {module.description}
                      </p>
                    </div>
                  </div>

                  {/* Module Content */}
                  <div style={{ padding: '20px' }}>
                    {hasResponses ? (
                      <div style={{ display: 'grid', gap: '16px' }}>
                        {module.sections.map((section) => {
                          const response = moduleResponses[section.key];
                          const hasText = response && (typeof response === 'string' ? response.trim() : response.text?.trim());
                          
                          return (
                            <div key={section.key}>
                              <h4 style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#374151',
                                margin: '0 0 8px 0'
                              }}>
                                {section.title}
                              </h4>
                              {hasText ? (
                                <div style={{
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  padding: '12px',
                                  fontSize: '14px',
                                  color: '#374151',
                                  lineHeight: '1.6'
                                }}>
                                  {typeof response === 'string' ? response : response.text}
                                </div>
                              ) : (
                                <div style={{
                                  backgroundColor: '#fafafa',
                                  border: '1px dashed #d1d5db',
                                  borderRadius: '6px',
                                  padding: '12px',
                                  fontSize: '14px',
                                  color: '#9ca3af',
                                  fontStyle: 'italic'
                                }}>
                                  No response provided
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '32px',
                        color: '#9ca3af'
                      }}>
                        <module.icon size={32} style={{ opacity: 0.5, marginBottom: '12px' }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>
                          No responses in this module yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // OVERVIEW CONTENT COMPONENT
  const renderOverviewContent = () => {
    const latestSubmission = getLatestSubmission();

    return (
      <div className="iinc-overview-screen" style={{ padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            color: '#1f2937', 
            margin: '0 0 8px 0' 
          }}>
            I, Inc. Career Development
          </h2>
          <p style={{ 
            color: '#6b7280', 
            margin: 0,
            fontSize: '16px'
          }}>
            Create your comprehensive career development plan through structured self-assessment
          </p>
        </div>

        {/* Assessment Status Card */}
        <div className="iinc-assessment-status-card" style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px'
        }}>
          {latestSubmission ? (
            <div>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937', 
                margin: '0 0 16px 0' 
              }}>
                Your Latest Assessment
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Completion</span>
                  <span style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                    {Math.min(100, latestSubmission.completion_percentage)}%
                  </span>
                </div>
                <div style={{ 
                  backgroundColor: '#e5e7eb', 
                  borderRadius: '8px', 
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    backgroundColor: latestSubmission.completion_percentage >= 75 ? '#10b981' : 
                                   latestSubmission.completion_percentage >= 50 ? '#f59e0b' : '#3b82f6',
                    height: '100%',
                    width: `${Math.min(100, latestSubmission.completion_percentage)}%`,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Last submitted: {new Date(latestSubmission.submitted_at).toLocaleDateString()}
                </div>
                
                <button
                  onClick={startNewAssessment}
                  style={{
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  Update Assessment
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937', 
                margin: '0 0 12px 0' 
              }}>
                Start Your I, Inc. Assessment
              </h3>
              <p style={{ color: '#6b7280', margin: '0 0 20px 0' }}>
                Complete your comprehensive career development assessment to create your personalized growth plan.
              </p>
              <button
                onClick={startNewAssessment}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: '0 auto'
                }}
              >
                <Plus size={20} />
                Begin Assessment
              </button>
            </div>
          )}
        </div>

        {/* Framework Overview */}
        <div className="iinc-framework-overview-card" style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#1f2937', 
            margin: '0 0 16px 0' 
          }}>
            I, Inc. Framework Overview
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px'
          }}>
            {Object.entries(iIncModules).map(([moduleKey, module]) => (
              <div
                key={moduleKey}
                style={{
                  padding: '16px',
                  border: `1px solid ${module.color}30`,
                  borderRadius: '8px',
                  backgroundColor: module.color + '05'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <module.icon size={20} style={{ color: module.color }} />
                  <h4 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#1f2937', 
                    margin: 0 
                  }}>
                    {module.title}
                  </h4>
                </div>
                <p style={{ 
                  color: '#6b7280', 
                  margin: 0, 
                  fontSize: '12px',
                  lineHeight: '1.5'
                }}>
                  {module.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTeamOverview = () => (
    <div className="iinc-team-overview-screen" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#1f2937', 
          margin: '0 0 8px 0' 
        }}>
          Team I, Inc. Assessments
        </h2>
        <p style={{ 
          color: '#6b7280', 
          margin: 0,
          fontSize: '16px'
        }}>
          Overview of all team member career development assessments
        </p>
      </div>

      {/* Team Submissions */}
      {allTeamSubmissions.length === 0 ? (
        <div className="iinc-team-empty-state" style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <FileText style={{ color: '#6b7280', margin: '0 auto 16px auto' }} size={48} />
          <h3 style={{ color: '#374151', margin: '0 0 8px 0' }}>No Team Assessments Yet</h3>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Team members haven't started their I, Inc. assessments yet.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '16px'
        }}>
          {allTeamSubmissions.map((submission, index) => (
            <div
              className="iinc-team-submission-card"
              key={index}
              style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <User size={24} style={{ color: '#6b7280' }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#1f2937', 
                      margin: '0 0 4px 0' 
                    }}>
                      {submission.user_name}
                    </h4>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#6b7280', 
                      margin: '0 0 8px 0' 
                    }}>
                      {submission.user_role} • {submission.user_email}
                    </p>
                    
                    {submission.latest_submission ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            backgroundColor: '#e5e7eb', 
                            borderRadius: '4px', 
                            height: '6px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              backgroundColor: submission.latest_submission.completion_percentage >= 75 ? '#10b981' : 
                                             submission.latest_submission.completion_percentage >= 50 ? '#f59e0b' : '#3b82f6',
                              height: '100%',
                              width: `${Math.min(100, submission.latest_submission.completion_percentage)}%`,
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500', minWidth: '40px' }}>
                          {Math.min(100, submission.latest_submission.completion_percentage)}%
                        </span>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                        No assessment submitted
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {submission.latest_submission && (
                    <div style={{ textAlign: 'right', fontSize: '12px', color: '#6b7280' }}>
                      Last updated: {new Date(submission.latest_submission.submitted_at).toLocaleDateString()}
                    </div>
                  )}
                  
                  <button
                    onClick={() => submission.latest_submission && fetchUserDetails(submission.user_id)}
                    disabled={!submission.latest_submission || detailsLoading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: submission.latest_submission ? '#f8fafc' : '#f3f4f6',
                      border: `1px solid ${submission.latest_submission ? '#e2e8f0' : '#d1d5db'}`,
                      borderRadius: '6px',
                      padding: '6px 12px',
                      cursor: submission.latest_submission ? 'pointer' : 'not-allowed',
                      fontSize: '12px',
                      color: submission.latest_submission ? '#374151' : '#9ca3af',
                      opacity: detailsLoading ? 0.6 : 1
                    }}
                  >
                    <Eye size={14} />
                    {detailsLoading ? 'Loading...' : 'View Details'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // UNIFIED ASSESSMENT FORM COMPONENT
  const renderAssessmentForm = () => (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        marginTop: '20px'
      }}>
        {/* Form Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: '#1f2937', 
                margin: '0 0 8px 0' 
              }}>
                I, Inc. Career Assessment
              </h3>
              <p style={{ color: '#6b7280', margin: 0, fontSize: '14px' }}>
                Complete all sections to develop your comprehensive career plan
              </p>
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#374151', 
              fontWeight: '600',
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px'
            }}>
              {calculateCompletionPercentage()}% Complete
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div style={{ padding: '24px' }}>
          {/* Assessment Modules */}
          <div style={{ display: 'grid', gap: '32px' }}>
            {Object.entries(iIncModules).map(([moduleKey, module]) => (
              <div
                key={moduleKey}
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}
              >
                {/* Module Header */}
                <div style={{
                  backgroundColor: module.color + '10',
                  borderBottom: '1px solid #e5e7eb',
                  padding: '24px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: module.color + '20',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <module.icon size={24} style={{ color: module.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ 
                        fontSize: '20px', 
                        fontWeight: '600', 
                        color: '#1f2937', 
                        margin: '0 0 4px 0' 
                      }}>
                        {module.title}
                      </h3>
                      <p style={{ 
                        color: '#6b7280', 
                        margin: 0, 
                        fontSize: '14px' 
                      }}>
                        {module.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Module Sections */}
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'grid', gap: '24px' }}>
                    {module.sections.map((section, index) => (
                      <div key={section.key}>
                        <h4 style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#1f2937',
                          margin: '0 0 8px 0'
                        }}>
                          {index + 1}. {section.title}
                        </h4>
                        <p style={{
                          fontSize: '14px',
                          color: '#6b7280',
                          margin: '0 0 12px 0',
                          lineHeight: '1.6'
                        }}>
                          {section.question}
                        </p>
                        <textarea
                          value={assessmentData[moduleKey]?.[section.key] || ''}
                          onChange={(e) => updateAssessmentData(moduleKey, section.key, e.target.value)}
                          placeholder={section.placeholder}
                          style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Form Actions */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '12px', 
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setShowAssessmentForm(false)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAssessment}
              disabled={saveLoading}
              style={{
                padding: '12px 24px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saveLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                opacity: saveLoading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saveLoading ? (
                <>
                  <Clock size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Submit Assessment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
        color: '#6b7280'
      }}>
        <TrendingUp size={24} style={{ animation: 'spin 1s linear infinite', marginRight: '12px' }} />
        <span>Loading I, Inc. framework...</span>
      </div>
    );
  }

  // Show detailed view if active
  if (showDetailView) {
    return renderDetailedView();
  }

  return (
    <div className="iinc-screen" style={{ backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      {/* Navigation Tabs */}
      <div className="iinc-nav" style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px'
      }}>
        <div style={{
          display: 'flex',
          gap: '32px'
        }}>
          <button
            onClick={() => setActiveView('overview')}
            style={{
              padding: '12px 4px',
              borderBottom: activeView === 'overview' ? '2px solid #3b82f6' : '2px solid transparent',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeView === 'overview' ? '#3b82f6' : '#6b7280',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            Overview
          </button>
          
          {currentUser?.role === 'Project Manager' && (
            <button
              onClick={() => setActiveView('teamoverview')}
              style={{
                padding: '12px 4px',
                borderBottom: activeView === 'teamoverview' ? '2px solid #3b82f6' : '2px solid transparent',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: activeView === 'teamoverview' ? '#3b82f6' : '#6b7280',
                fontWeight: '500',
                fontSize: '14px'
              }}
            >
              Team Overview
            </button>
          )}
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' && renderOverviewContent()}
      {activeView === 'teamoverview' && currentUser?.role === 'Project Manager' && renderTeamOverview()}
      
      {/* Assessment Form Modal */}
      {showAssessmentForm && renderAssessmentForm()}
    </div>
  );
};

export default IIncTab;