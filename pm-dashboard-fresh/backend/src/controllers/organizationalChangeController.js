// backend/src/controllers/organizationalChangeController.js
// CORRECTED VERSION: Maintains existing function export structure but removes role-based viewing restrictions
const db = require('../config/database'); // use db.query() where needed


/**
 * Get organizational change assessments - UPDATED FOR EQUAL ACCESS
 */
const getOrganizationalChangeAssessments = async (req, res) => {
  try {
    const { project_id, user_id, type = 'organizational_change' } = req.query;
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    console.log('📊 Getting organizational change assessments with equal access:', {
      project_id,
      user_id,
      type,
      currentUserId,
      userRole
    });

    let query = `
      SELECT 
        oca.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        p.name as project_name,
        (oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0 as overall_score
      FROM organizational_change_assessments oca
      LEFT JOIN users u ON oca.user_id = u.id
      LEFT JOIN projects p ON oca.project_id = p.id
      WHERE oca.assessment_type = $1
    `;

    const params = [type];
    let paramCount = 1;

    // Filter by project if specified
    if (project_id && project_id !== 'all' && !isNaN(parseInt(project_id))) {
      paramCount++;
      query += ` AND oca.project_id = $${paramCount}`;
      params.push(parseInt(project_id));
    }

    // UPDATED: Equal access for all roles - everyone can see all team assessments for collective analytics
    // This enables full team transparency and collective organizational change insights
    // No role-based restrictions on viewing assessment data - everyone sees the same comprehensive view
    
    // Note: Edit permissions are still controlled at the individual assessment level
    // This change only affects VIEW access to enable team-wide organizational change analytics

    // Filter by specific user if requested (available for all roles now, not just project managers)
    if (user_id && user_id !== 'all' && !isNaN(parseInt(user_id))) {
      paramCount++;
      query += ` AND oca.user_id = $${paramCount}`;
      params.push(parseInt(user_id));
    }

    query += ` ORDER BY oca.created_at DESC`;

    const result = await db.query(query, params);

    console.log(`✅ Retrieved ${result.rows.length} organizational change assessments with equal access (role: ${userRole})`);

    res.json({
      success: true,
      assessments: result.rows,
      summary: {
        total: result.rows.length,
        user_role: userRole,
        access_level: 'full_team_visibility',
        note: 'All users can view team-wide organizational change assessment data for collective insights'
      }
    });

  } catch (error) {
    console.error('❌ Error getting organizational change assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizational change assessments',
      error: error.message
    });
  }
};

/**
 * Submit organizational change assessment
 */
const submitOrganizationalChangeAssessment = async (req, res) => {
  try {
    const { project_id, responses, assessment_type = 'organizational_change' } = req.body;
    const userId = req.user.id;

    console.log('📝 Creating organizational change assessment:', { project_id, userId, assessment_type });

    if (!responses) {
      return res.status(400).json({
        success: false,
        message: 'Responses are required'
      });
    }

    // allow null/undefined project_id for general assessments
    const projectIdVal = project_id ? parseInt(project_id) : null;

    // Calculate scores from responses  
    const scores = calculateOrganizationalChangeScores(responses);

    const insertQuery = `
      INSERT INTO organizational_change_assessments (
        user_id, project_id, assessment_type, responses,
        vision_score, alignment_score, understanding_score, enactment_score,
        overall_score, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      userId,
      projectIdVal,
      assessment_type,
      JSON.stringify(responses),
      scores.vision,
      scores.alignment, 
      scores.understanding,
      scores.enactment,
      scores.overall
    ];

    const result = await db.query(insertQuery, values);

    // handle rare case where wrapper returns no row
    const created = (result.rows && result.rows[0]) ? result.rows[0] : null;
    console.log('✅ Organizational change assessment created:', created ? created.id : '(no row returned)');

    res.status(201).json({
      success: true,
      message: 'Organizational change assessment created successfully',
      assessment: created
    });

  } catch (error) {
    console.error('❌ Error creating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create assessment',
      error: error.message
    });
  }
};

/**
 * Get organizational change analytics
 */
const getOrganizationalChangeAnalytics = async (req, res) => {
  try {
    const { project_id } = req.query;
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    console.log('📊 Getting organizational change analytics with equal access:', {
      project_id,
      currentUserId,
      userRole
    });

    let analyticsQuery = `
      SELECT 
        COUNT(*) as total_assessments,
        AVG(vision_score) as avg_vision_score,
        AVG(alignment_score) as avg_alignment_score,
        AVG(understanding_score) as avg_understanding_score,
        AVG(enactment_score) as avg_enactment_score,
        AVG(overall_score) as avg_overall_score,
        MIN(created_at) as first_assessment,
        MAX(created_at) as latest_assessment
      FROM organizational_change_assessments
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (project_id && project_id !== 'all') {
      paramCount++;
      analyticsQuery += ` AND project_id = $${paramCount}`;
      params.push(parseInt(project_id));
    }

    // UPDATED: Equal access for all roles - no role-based restrictions on analytics

    const result = await db.query(analyticsQuery, params);
    const analytics = result.rows[0];

    const processedAnalytics = {
      total_assessments: parseInt(analytics.total_assessments) || 0,
      avg_vision_score: parseFloat(analytics.avg_vision_score) || 0,
      avg_alignment_score: parseFloat(analytics.avg_alignment_score) || 0,
      avg_understanding_score: parseFloat(analytics.avg_understanding_score) || 0,
      avg_enactment_score: parseFloat(analytics.avg_enactment_score) || 0,
      avg_overall_score: parseFloat(analytics.avg_overall_score) || 0,
      first_assessment: analytics.first_assessment,
      latest_assessment: analytics.latest_assessment
    };

    console.log(`✅ Organizational change analytics calculated with equal access: ${processedAnalytics.total_assessments} assessments`);

    res.json({
      success: true,
      analytics: processedAnalytics,
      access_info: {
        user_role: userRole,
        access_level: 'full_team_visibility',
        note: 'All users can view team-wide organizational change analytics'
      }
    });

  } catch (error) {
    console.error('❌ Error getting organizational change analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get organizational change analytics',
      error: error.message
    });
  }
};

/**
 * Get team metrics
 */
const getTeamMetrics = async (req, res) => {
  try {
    const { project_id } = req.query;
    const currentUserId = req.user.id;
    const userRole = req.user.role;

    console.log('📊 Getting team metrics with equal access:', {
      project_id,
      currentUserId,
      userRole
    });

    let metricsQuery = `
      SELECT 
        u.name as user_name,
        u.role as user_role,
        oca.vision_score,
        oca.alignment_score,
        oca.understanding_score,
        oca.enactment_score,
        oca.overall_score,
        oca.created_at
      FROM organizational_change_assessments oca
      LEFT JOIN users u ON oca.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (project_id && project_id !== 'all') {
      paramCount++;
      metricsQuery += ` AND oca.project_id = $${paramCount}`;
      params.push(parseInt(project_id));
    }

    // UPDATED: Equal access for all roles - no role-based restrictions

    metricsQuery += ` ORDER BY oca.created_at DESC`;

    const result = await db.query(metricsQuery, params);

    console.log(`✅ Team metrics retrieved with equal access: ${result.rows.length} assessments`);

    res.json({
      success: true,
      metrics: result.rows,
      access_info: {
        user_role: userRole,
        access_level: 'full_team_visibility',
        note: 'All users can view team-wide organizational change metrics'
      }
    });

  } catch (error) {
    console.error('❌ Error getting team metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get team metrics',
      error: error.message
    });
  }
};

/**
 * Get assessment details - UPDATED FOR EQUAL ACCESS
 */
const getAssessmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log('📋 Getting organizational change assessment details with equal access:', { id, userId, userRole });

    let query = `
      SELECT 
        oca.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        p.name as project_name,
        (oca.vision_score + oca.alignment_score + oca.understanding_score + oca.enactment_score) / 4.0 as overall_score
      FROM organizational_change_assessments oca
      LEFT JOIN users u ON oca.user_id = u.id
      LEFT JOIN projects p ON oca.project_id = p.id
      WHERE oca.id = $1
    `;

    const params = [parseInt(id)];

    // UPDATED: No role-based access control for viewing assessment details
    // All users can view any assessment details for team transparency

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    res.json({
      success: true,
      assessment: result.rows[0]
    });

  } catch (error) {
    console.error('❌ Error getting assessment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get assessment details',
      error: error.message
    });
  }
};

/**
 * Update assessment - ONLY owner can edit
 */
const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { responses } = req.body;
    const userId = req.user.id;

    console.log('📝 Updating organizational change assessment:', { id, userId });

    // Check if user owns this assessment (edit permissions are still restricted)
    const checkQuery = `
      SELECT * FROM organizational_change_assessments 
      WHERE id = $1 AND user_id = $2
    `;
    
    const checkResult = await db.query(checkQuery, [parseInt(id), userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found or you do not have permission to edit it'
      });
    }

    // Calculate updated scores
    const scores = calculateOrganizationalChangeScores(responses);

    const updateQuery = `
      UPDATE organizational_change_assessments 
      SET responses = $1, vision_score = $2, alignment_score = $3, 
          understanding_score = $4, enactment_score = $5, overall_score = $6,
          updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `;

    const updateResult = await db.query(updateQuery, [
      JSON.stringify(responses),
      scores.vision,
      scores.alignment,
      scores.understanding,
      scores.enactment,
      scores.overall,
      parseInt(id),
      userId
    ]);

    console.log('✅ Organizational change assessment updated:', id);

    res.json({
      success: true,
      message: 'Assessment updated successfully',
      assessment: updateResult.rows[0]
    });

  } catch (error) {
    console.error('❌ Error updating assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update assessment',
      error: error.message
    });
  }
};

/**
 * Delete assessment - ONLY owner can delete  
 */
const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('🗑️ Deleting organizational change assessment:', { id, userId });

    // Check if user owns this assessment
    const deleteQuery = `
      DELETE FROM organizational_change_assessments 
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `;
    
    const result = await db.query(deleteQuery, [parseInt(id), userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found or you do not have permission to delete it'
      });
    }

    console.log('✅ Organizational change assessment deleted:', id);

    res.json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete assessment',
      error: error.message
    });
  }
};

// Helper function to calculate organizational change scores
function calculateOrganizationalChangeScores(responses) {
  const dimensions = ['vision', 'alignment', 'understanding', 'enactment'];
  const scores = {};
  
  dimensions.forEach(dimension => {
    const dimensionResponses = responses[dimension] || {};
    const values = Object.values(dimensionResponses).filter(val => !isNaN(parseFloat(val)));
    const sum = values.reduce((acc, val) => acc + parseFloat(val), 0);
    scores[dimension] = values.length > 0 ? Number((sum / values.length).toFixed(2)) : 0;
  });
  
  // Calculate overall score as average of dimension scores
  const validScores = Object.values(scores).filter(score => score > 0);
  scores.overall = validScores.length > 0 ? 
    Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(2)) : 0;
  
  return scores;
}

module.exports = {
  getOrganizationalChangeAssessments,
  submitOrganizationalChangeAssessment,
  getOrganizationalChangeAnalytics,
  getTeamMetrics,
  getAssessmentDetails,
  updateAssessment,
  deleteAssessment
};