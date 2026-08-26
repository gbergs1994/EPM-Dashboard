const { query, withTransaction } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const updateProjectProgressFromFeedback = async (projectId) => {
  try {
    console.log('Recalculating project progress from feedback...');
    
    const feedbackQuery = `
      SELECT pm_average, leadership_average, change_mgmt_average, career_dev_average
      FROM project_feedback 
      WHERE project_id = $1
      AND pm_average IS NOT NULL 
      AND leadership_average IS NOT NULL 
      AND change_mgmt_average IS NOT NULL 
      AND career_dev_average IS NOT NULL
    `;
    const feedbackResult = await query(feedbackQuery, [projectId]);
    
    if (feedbackResult.rows.length > 0) {
      const totalFeedback = feedbackResult.rows.length;
      console.log(`Processing ${totalFeedback} valid feedback submissions`);
      
      const totals = feedbackResult.rows.reduce((acc, feedback) => {
        const pmAvg = parseFloat(feedback.pm_average) || 0;
        const leadershipAvg = parseFloat(feedback.leadership_average) || 0;
        const changeMgmtAvg = parseFloat(feedback.change_mgmt_average) || 0;
        const careerDevAvg = parseFloat(feedback.career_dev_average) || 0;
        
        console.log(`Feedback averages: PM=${pmAvg}, Leadership=${leadershipAvg}, ChangeMgmt=${changeMgmtAvg}, CareerDev=${careerDevAvg}`);
        
        return {
          PM: acc.PM + pmAvg,
          Leadership: acc.Leadership + leadershipAvg,
          ChangeMgmt: acc.ChangeMgmt + changeMgmtAvg,
          CareerDev: acc.CareerDev + careerDevAvg
        };
      }, { PM: 0, Leadership: 0, ChangeMgmt: 0, CareerDev: 0 });
      
      console.log(`Totals before averaging: PM=${totals.PM}, Leadership=${totals.Leadership}, ChangeMgmt=${totals.ChangeMgmt}, CareerDev=${totals.CareerDev}`);
      
      const newProgress = {
        PM: Math.max(0, Math.min(7, Math.round(totals.PM / totalFeedback))),
        Leadership: Math.max(0, Math.min(7, Math.round(totals.Leadership / totalFeedback))),
        ChangeMgmt: Math.max(0, Math.min(7, Math.round(totals.ChangeMgmt / totalFeedback))),
        CareerDev: Math.max(0, Math.min(7, Math.round(totals.CareerDev / totalFeedback)))
      };
      
      console.log(`New progress values: PM=${newProgress.PM}, Leadership=${newProgress.Leadership}, ChangeMgmt=${newProgress.ChangeMgmt}, CareerDev=${newProgress.CareerDev}`);
      
      // Validate that all values are valid integers
      const isValidProgress = Object.values(newProgress).every(val => 
        !isNaN(val) && Number.isInteger(val) && val >= 0 && val <= 7
      );
      
      if (!isValidProgress) {
        console.error('Invalid progress values calculated:', newProgress);
        throw new Error('Invalid progress values calculated');
      }
      
      const updateQuery = `
        UPDATE projects 
        SET pm_progress = $1, leadership_progress = $2, change_mgmt_progress = $3, career_dev_progress = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `;
      
      await query(updateQuery, [
        newProgress.PM,
        newProgress.Leadership, 
        newProgress.ChangeMgmt,
        newProgress.CareerDev,
        projectId
      ]);
      
      console.log('Project progress updated successfully:', newProgress);
    } else {
      console.log('No valid feedback found for project progress calculation');
    }
  } catch (error) {
    console.error('Error updating project progress:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
};

const submitFeedback = async (req, res) => {
  console.log('Feedback submission started');
  console.log('req.params:', req.params);
  console.log('req.body:', req.body);
  
  const projectId = req.params.id;
  
  if (!projectId || isNaN(projectId)) {
    console.error('Invalid project ID:', projectId);
    return res.status(400).json({
      success: false,
      error: 'Invalid project ID'
    });
  }
  
  try {
    const {
      userName,
      currentUser,

      PM_Vision,
      PM_Time,
      PM_Quality,
      PM_Cost,

      Leadership_Vision,
      Leadership_Reality,
      Leadership_Ethics,
      Leadership_Courage,

      ChangeMgmt_Alignment,
      ChangeMgmt_Understand,
      ChangeMgmt_Enact,

      CareerDev_KnowYourself,
      CareerDev_KnowYourMarket,
      CareerDev_TellYourStory
    } = req.body;
    
    console.log('Processing feedback for project:', projectId);
    console.log('Extracted userName:', userName);
    
    const data = {
      PM_Vision: parseInt(PM_Vision) || 4,
      PM_Time: parseInt(PM_Time) || 4,
      PM_Quality: parseInt(PM_Quality) || 4,
      PM_Cost: parseInt(PM_Cost) || 4,
      Leadership_Vision: parseInt(Leadership_Vision) || 4,
      Leadership_Reality: parseInt(Leadership_Reality) || 4,
      Leadership_Ethics: parseInt(Leadership_Ethics) || 4,
      Leadership_Courage: parseInt(Leadership_Courage) || 4,
      ChangeMgmt_Alignment: parseInt(ChangeMgmt_Alignment) || 4,
      ChangeMgmt_Understand: parseInt(ChangeMgmt_Understand) || 4,
      ChangeMgmt_Enact: parseInt(ChangeMgmt_Enact) || 4,
      CareerDev_KnowYourself: parseInt(CareerDev_KnowYourself) || 4,
      CareerDev_KnowYourMarket: parseInt(CareerDev_KnowYourMarket) || 4,
      CareerDev_TellYourStory: parseInt(CareerDev_TellYourStory) || 4
    };
    
    console.log('Parsed data object:', data);
    
    // Validate all values are between 1 and 7
    const isValidData = Object.values(data).every(val => 
      !isNaN(val) && Number.isInteger(val) && val >= 1 && val <= 7
    );
    
    if (!isValidData) {
      console.error('Invalid feedback data values:', data);
      return res.status(400).json({
        success: false,
        error: 'All feedback values must be integers between 1 and 7'
      });
    }
    
    // Calculate category averages
    const averages = {
      PM: parseFloat(((data.PM_Vision + data.PM_Time + data.PM_Quality + data.PM_Cost) / 4).toFixed(2)),
      Leadership: parseFloat(((data.Leadership_Vision + data.Leadership_Reality + data.Leadership_Ethics + data.Leadership_Courage) / 4).toFixed(2)),
      ChangeMgmt: parseFloat(((data.ChangeMgmt_Alignment + data.ChangeMgmt_Understand + data.ChangeMgmt_Enact) / 3).toFixed(2)),
      CareerDev: parseFloat(((data.CareerDev_KnowYourself + data.CareerDev_KnowYourMarket + data.CareerDev_TellYourStory) / 3).toFixed(2))
    };
    
    // FIXED: Calculate overall average
    const overallAverage = parseFloat(((averages.PM + averages.Leadership + averages.ChangeMgmt + averages.CareerDev) / 4).toFixed(2));
    
    console.log('Calculated averages:', averages);
    console.log('Calculated overall average:', overallAverage);
    
    // Validate averages are valid numbers
    const isValidAverages = Object.values(averages).every(val => 
      !isNaN(val) && isFinite(val) && val >= 1 && val <= 7
    );
    
    const isValidOverall = !isNaN(overallAverage) && isFinite(overallAverage) && overallAverage >= 1 && overallAverage <= 7;
    
    if (!isValidAverages || !isValidOverall) {
      console.error('Invalid calculated averages:', { averages, overallAverage });
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate valid averages from feedback data'
      });
    }
    
    const submitterName = req.user?.name || userName || currentUser?.name || 'Anonymous User';
    console.log('Final submitter name:', submitterName);
    
    console.log('Checking if project exists...');
    const projectExistsQuery = 'SELECT id, name FROM projects WHERE id = $1';
    const projectResult = await query(projectExistsQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }
    
    console.log('Project found:', projectResult.rows[0].name);
    
    // Use authenticated user identity first so repeat submissions overwrite correctly.
    let userId = req.user?.id || null;

    if (!userId && submitterName && submitterName !== 'Anonymous User') {
      const userQuery = 'SELECT id FROM users WHERE name = $1';
      const userResult = await query(userQuery, [submitterName]);
      
      if (userResult.rows.length > 0) {
        userId = userResult.rows[0].id;
        console.log('User found:', submitterName);
      } else {
        console.warn(`User not found: ${submitterName}, proceeding with anonymous feedback`);
      }
    } else if (userId) {
      console.log('Using authenticated user ID for feedback:', userId);
    }
    
    // Upsert feedback so repeat submissions update the same user/project record.
    console.log('Saving feedback into database...');
    const feedbackQuery = `
      INSERT INTO project_feedback (
        project_id, user_id, 
        pm_vision, pm_time, pm_quality, pm_cost,
        leadership_vision, leadership_reality, leadership_ethics, leadership_courage,
        change_mgmt_alignment, change_mgmt_understand, change_mgmt_enact,
        career_dev_know_yourself, career_dev_know_market, career_dev_tell_story,
        pm_average, leadership_average, change_mgmt_average, career_dev_average,
        overall_average
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      ON CONFLICT(project_id, user_id) DO UPDATE SET
        pm_vision = excluded.pm_vision,
        pm_time = excluded.pm_time,
        pm_quality = excluded.pm_quality,
        pm_cost = excluded.pm_cost,
        leadership_vision = excluded.leadership_vision,
        leadership_reality = excluded.leadership_reality,
        leadership_ethics = excluded.leadership_ethics,
        leadership_courage = excluded.leadership_courage,
        change_mgmt_alignment = excluded.change_mgmt_alignment,
        change_mgmt_understand = excluded.change_mgmt_understand,
        change_mgmt_enact = excluded.change_mgmt_enact,
        career_dev_know_yourself = excluded.career_dev_know_yourself,
        career_dev_know_market = excluded.career_dev_know_market,
        career_dev_tell_story = excluded.career_dev_tell_story,
        pm_average = excluded.pm_average,
        leadership_average = excluded.leadership_average,
        change_mgmt_average = excluded.change_mgmt_average,
        career_dev_average = excluded.career_dev_average,
        overall_average = excluded.overall_average,
        created_at = CURRENT_TIMESTAMP
    `;
    
    const feedbackValues = [
      projectId,
      userId,

      data.PM_Vision,
      data.PM_Time, 
      data.PM_Quality,
      data.PM_Cost,

      data.Leadership_Vision,
      data.Leadership_Reality,
      data.Leadership_Ethics,
      data.Leadership_Courage,

      data.ChangeMgmt_Alignment,
      data.ChangeMgmt_Understand,
      data.ChangeMgmt_Enact,

      data.CareerDev_KnowYourself,
      data.CareerDev_KnowYourMarket,
      data.CareerDev_TellYourStory,

      averages.PM,
      averages.Leadership,
      averages.ChangeMgmt,
      averages.CareerDev,
      overallAverage  // FIXED: Include overall average
    ];
    
    console.log('Final feedback values for database:', feedbackValues);
    
    await query(feedbackQuery, feedbackValues);

    const savedFeedbackQuery = `
      SELECT *
      FROM project_feedback
      WHERE project_id = $1
      AND (
        (user_id = $2)
        OR (user_id IS NULL AND $2 IS NULL)
      )
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const feedbackResult = await query(savedFeedbackQuery, [projectId, userId]);
    const savedFeedback = feedbackResult.rows[0];

    if (!savedFeedback) {
      throw new Error('Feedback saved but could not be retrieved');
    }
    
    console.log('Feedback saved with ID:', savedFeedback.id);
    
    // Add to project history
    console.log('Adding to project history...');
    const historyQuery = `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    const overallPercentage = parseFloat(((overallAverage / 7) * 100).toFixed(1));
    
    console.log('Overall rating calculation:', {
      sum: averages.PM + averages.Leadership + averages.ChangeMgmt + averages.CareerDev,
      average: overallAverage,
      percentage: overallPercentage
    });
    
    await query(historyQuery, [
      projectId,
      userId,
      'Feedback Submitted',
      `${submitterName} submitted project feedback with ${overallPercentage}% overall rating (${overallAverage}/7)`,
      'feedback_submitted',
      JSON.stringify({ 
        overallRating: overallAverage,
        overallPercentage: overallPercentage + '%',
        averages: averages,
        submissionTime: new Date().toISOString()
      })
    ]);
    
    console.log('Project history updated');
    
    console.log('Updating project progress...');
    await updateProjectProgressFromFeedback(projectId);
    console.log('Project progress updated');
    
    // FIXED: Return properly formatted feedback with correct overall value
    const formattedFeedback = {
      id: savedFeedback.id,
      projectId: savedFeedback.project_id,
      userId: savedFeedback.user_id,
      userName: submitterName,
      timestamp: savedFeedback.created_at,
      data: {
        PM_Vision: savedFeedback.pm_vision,
        PM_Time: savedFeedback.pm_time,
        PM_Quality: savedFeedback.pm_quality,
        PM_Cost: savedFeedback.pm_cost,
        Leadership_Vision: savedFeedback.leadership_vision,
        Leadership_Reality: savedFeedback.leadership_reality,
        Leadership_Ethics: savedFeedback.leadership_ethics,
        Leadership_Courage: savedFeedback.leadership_courage,
        ChangeMgmt_Alignment: savedFeedback.change_mgmt_alignment,
        ChangeMgmt_Understand: savedFeedback.change_mgmt_understand,
        ChangeMgmt_Enact: savedFeedback.change_mgmt_enact,
        CareerDev_KnowYourself: savedFeedback.career_dev_know_yourself,
        CareerDev_KnowYourMarket: savedFeedback.career_dev_know_market,
        CareerDev_TellYourStory: savedFeedback.career_dev_tell_story
      },
      averages: {
        PM: savedFeedback.pm_average,
        Leadership: savedFeedback.leadership_average,
        ChangeMgmt: savedFeedback.change_mgmt_average,
        CareerDev: savedFeedback.career_dev_average
      },
      overall: savedFeedback.overall_average  // FIXED: Now properly stored and returned
    };
    
    res.status(201).json({
      success: true,
      data: formattedFeedback,
      message: 'Feedback submitted successfully'
    });
    
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback: ' + error.message
    });
  }
};

const getProjectFeedback = async (req, res) => {
  const projectId = req.params.id; 
  
  if (!projectId || isNaN(projectId)) {
    throw new ApiError('Invalid project ID', 400);
  }
  
  try {
    const feedbackQuery = `
      SELECT pf.*, u.name as user_name
      FROM project_feedback pf
      LEFT JOIN users u ON pf.user_id = u.id
      WHERE pf.project_id = $1
      ORDER BY pf.created_at DESC
    `;
    
    const result = await query(feedbackQuery, [projectId]);
    console.log(`Retrieved ${result.rows.length} feedback records for project ${projectId}`);
    
    const feedback = result.rows.map(f => ({
      id: f.id,
      projectId: f.project_id,
      userId: f.user_id,
      userName: f.user_name || 'Anonymous',
      timestamp: f.created_at,
      data: {
        PM_Vision: f.pm_vision,
        PM_Time: f.pm_time,
        PM_Quality: f.pm_quality,
        PM_Cost: f.pm_cost,
        Leadership_Vision: f.leadership_vision,
        Leadership_Reality: f.leadership_reality,
        Leadership_Ethics: f.leadership_ethics,
        Leadership_Courage: f.leadership_courage,
        ChangeMgmt_Alignment: f.change_mgmt_alignment,
        ChangeMgmt_Understand: f.change_mgmt_understand,
        ChangeMgmt_Enact: f.change_mgmt_enact,
        CareerDev_KnowYourself: f.career_dev_know_yourself,
        CareerDev_KnowYourMarket: f.career_dev_know_market,
        CareerDev_TellYourStory: f.career_dev_tell_story
      },
      averages: {
        PM: parseFloat(f.pm_average) || 0,
        Leadership: parseFloat(f.leadership_average) || 0,
        ChangeMgmt: parseFloat(f.change_mgmt_average) || 0,
        CareerDev: parseFloat(f.career_dev_average) || 0
      },
      // FIXED: Handle missing overall_average gracefully with fallback calculation
      overall: parseFloat(f.overall_average) || parseFloat(((parseFloat(f.pm_average) + parseFloat(f.leadership_average) + parseFloat(f.change_mgmt_average) + parseFloat(f.career_dev_average)) / 4).toFixed(2)) || 0
    }));
    
    console.log('Processed feedback data:', {
      count: feedback.length,
      sampleRecord: feedback[0] ? {
        id: feedback[0].id,
        hasData: !!feedback[0].data,
        hasAverages: !!feedback[0].averages,
        overall: feedback[0].overall,
        averages: feedback[0].averages
      } : 'No records'
    });
    
    res.json({
      success: true,
      data: feedback,
      count: feedback.length
    });
    
  } catch (error) {
    console.error('Error fetching project feedback:', error);
    throw new ApiError('Failed to fetch project feedback', 500);
  }
};

const deleteFeedback = async (req, res) => {
  const feedbackId = req.params.feedbackId;
  
  if (!feedbackId || isNaN(feedbackId)) {
    throw new ApiError('Invalid feedback ID', 400);
  }
  
  try {
    const deleteQuery = 'DELETE FROM project_feedback WHERE id = $1 RETURNING *';
    const result = await query(deleteQuery, [feedbackId]);
    
    if (result.rows.length === 0) {
      throw new ApiError('Feedback not found', 404);
    }
    
    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error('Error deleting feedback:', error);
    throw new ApiError('Failed to delete feedback', 500);
  }
};

module.exports = {
  submitFeedback,
  getProjectFeedback,
  deleteFeedback
};