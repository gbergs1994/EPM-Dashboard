// backend/src/controllers/leadershipController.js
// CORRECTED VERSION: Maintains existing function export structure but removes role-based viewing restrictions
const db = require('../config/database'); // will call db.query()


/**
 * Get leadership assessments - UPDATED FOR EQUAL ACCESS
 */
const getLeadershipAssessments = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { project_id, user_id, assessment_type } = req.query;

    console.log(`📊 Fetching leadership assessments with equal access for user ${userId}, role: ${userRole}`);

    let assessmentsQuery = `
      SELECT 
        la.*,
        p.name as project_name,
        p.description as project_description,
        p.status as project_status,
        u.name as user_name,
        u.role as user_role
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    // Apply project filtering first
    if (project_id && project_id !== 'all') {
      paramCount++;
      assessmentsQuery += ` AND la.project_id = $${paramCount}`;
      queryParams.push(parseInt(project_id));
    }

    // allow filtering by assessment type (alias `type` for backwards compatibility)
    if ((assessment_type || req.query.type) && (assessment_type !== 'all' && req.query.type !== 'all')) {
      const filterType = assessment_type || req.query.type;
      paramCount++;
      assessmentsQuery += ` AND la.assessment_type = $${paramCount}`;
      queryParams.push(filterType);
    }

    // UPDATED: Equal access for all roles - everyone can see all team assessments for collective analytics
    // This enables full team transparency and collective leadership development insights
    // No role-based restrictions on viewing assessment data - everyone sees the same comprehensive view
    
    // Note: Edit permissions are still controlled at the individual assessment level
    // This change only affects VIEW access to enable team-wide leadership analytics

    // Handle specific user filtering (available for all roles now, not just project managers)
    if (user_id && user_id !== 'all') {
      paramCount++;
      assessmentsQuery += ` AND la.user_id = $${paramCount}`;
      queryParams.push(parseInt(user_id));
    }

    assessmentsQuery += ` ORDER BY la.created_at DESC`;

    const result = await db.query(assessmentsQuery, queryParams);
    
    const assessments = result.rows.map(assessment => ({
      ...assessment,
      responses: typeof assessment.responses === 'string' 
        ? JSON.parse(assessment.responses) 
        : assessment.responses
    }));

    console.log(`✅ Found ${assessments.length} leadership assessments with equal access (role: ${userRole})`);

    res.json({
      success: true,
      assessments: assessments,
      message: `Found ${assessments.length} leadership assessments`,
      access_info: {
        user_role: userRole,
        access_level: 'full_team_visibility',
        note: 'All users can view team-wide leadership assessment data for collective insights'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leadership assessments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leadership assessments'
    });
  }
};

/**
 * Submit a new leadership assessment
 * POST /api/leadership/assessments
 */
const submitLeadershipAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    // allow either `type` or `assessment_type` for backward compatibility
    const { project_id, type, assessment_type, responses } = req.body;
    const atype = assessment_type || type;

    console.log(`📝 Submitting leadership assessment for user ${userId}`);
    console.log('Assessment data:', { project_id, assessment_type: atype, responses });

    const projectId = Number(project_id);

    // Validate required fields
    if (!atype || !responses) {
      return res.status(400).json({
        success: false,
        message: 'Assessment type and responses are required',
        error: 'Assessment type and responses are required'
      });
    }

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid project is required for leadership assessments',
        error: 'A valid project is required for leadership assessments'
      });
    }

    // Validate that responses contains the expected Leadership Diamond dimensions
    const requiredDimensions = ['vision', 'reality', 'ethics', 'courage'];
    const providedDimensions = Object.keys(responses);
    
    for (const dimension of requiredDimensions) {
      if (!responses[dimension]) {
        return res.status(400).json({
          success: false,
          message: `Missing responses for ${dimension} dimension`,
          error: `Missing responses for ${dimension} dimension`
        });
      }
    }

    // Calculate scores for each dimension (average of all questions in that dimension)
    const scores = {};
    let totalScore = 0;
    let totalQuestions = 0;

    for (const [dimension, dimensionResponses] of Object.entries(responses)) {
      const questionValues = Object.values(dimensionResponses);
      const dimensionScore = questionValues.reduce((sum, val) => sum + parseFloat(val), 0) / questionValues.length;
      scores[`${dimension}_score`] = parseFloat(dimensionScore.toFixed(2));
      totalScore += dimensionScore;
      totalQuestions += questionValues.length;
    }

    // Calculate overall score
    const overallScore = totalScore / requiredDimensions.length;
    scores.overall_score = parseFloat(overallScore.toFixed(2));

    // Insert assessment into database
    const insertQuery = `
      INSERT INTO leadership_assessments (
        user_id, 
        project_id, 
        assessment_type, 
        responses, 
        vision_score, 
        reality_score, 
        ethics_score, 
        courage_score, 
        overall_score
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, created_at
    `;

    const insertParams = [
      userId,
      projectId,
      atype,
      JSON.stringify(responses),
      scores.vision_score,
      scores.reality_score,
      scores.ethics_score,
      scores.courage_score,
      scores.overall_score
    ];

    console.log('📊 Inserting leadership assessment:', insertParams);
    
    const result = await db.query(insertQuery, insertParams);
    
    if (result.rows.length === 0) {
      throw new Error('Failed to insert assessment');
    }

    const newAssessment = result.rows[0];
    
    console.log(`✅ Leadership assessment submitted successfully: ID ${newAssessment.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Leadership assessment submitted successfully',
      assessment: {
        id: newAssessment.id,
        user_id: userId,
        project_id: projectId,
        assessment_type: atype,
        responses,
        scores,
        created_at: newAssessment.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Error submitting leadership assessment:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: 'Failed to submit leadership assessment'
    });
  }
};

/**
 * Get specific leadership assessment by ID - UPDATED FOR EQUAL ACCESS
 * GET /api/leadership/assessments/:id
 */
const getLeadershipAssessmentById = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const assessmentId = parseInt(req.params.id);

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    let assessmentQuery = `
      SELECT 
        la.*,
        p.name as project_name,
        p.description as project_description,
        p.status as project_status,
        u.name as user_name,
        u.role as user_role
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.id = $1
    `;

    const queryParams = [assessmentId];

    // UPDATED: No role-based access control for viewing assessment details
    // All users can view any assessment details for team transparency

    const result = await query(assessmentQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Leadership assessment not found'
      });
    }

    const assessment = {
      ...result.rows[0],
      responses: typeof result.rows[0].responses === 'string' 
        ? JSON.parse(result.rows[0].responses) 
        : result.rows[0].responses
    };

    console.log(`✅ Assessment details retrieved with equal access: ID ${assessmentId} (viewed by ${userRole})`);

    res.json({
      success: true,
      assessment: assessment
    });

  } catch (error) {
    console.error('❌ Error getting assessment details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get assessment details'
    });
  }
};

/**
 * Get leadership metrics/analytics - UPDATED FOR EQUAL ACCESS
 * GET /api/leadership/metrics
 */
const getLeadershipMetrics = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { project_id } = req.query;

    console.log(`📊 Fetching leadership metrics with equal access for user ${userId}, role: ${userRole}`);

    let metricsQuery = `
      SELECT 
        COUNT(*) as total_assessments,
        AVG(vision_score) as avg_vision_score,
        AVG(reality_score) as avg_reality_score,
        AVG(ethics_score) as avg_ethics_score,
        AVG(courage_score) as avg_courage_score,
        AVG(overall_score) as avg_overall_score,
        MIN(created_at) as first_assessment,
        MAX(created_at) as latest_assessment
      FROM leadership_assessments la
      LEFT JOIN projects p ON la.project_id = p.id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    if (project_id && project_id !== 'all') {
      paramCount++;
      metricsQuery += ` AND la.project_id = $${paramCount}`;
      queryParams.push(parseInt(project_id));
    }

    // UPDATED: Equal access for all roles - everyone can see team-wide metrics
    // No role-based restrictions on viewing metrics data

    const result = await query(metricsQuery, queryParams);
    const metrics = result.rows[0];

    const processedMetrics = {
      total_assessments: parseInt(metrics.total_assessments) || 0,
      avg_vision_score: parseFloat(metrics.avg_vision_score) || 0,
      avg_reality_score: parseFloat(metrics.avg_reality_score) || 0,
      avg_ethics_score: parseFloat(metrics.avg_ethics_score) || 0,
      avg_courage_score: parseFloat(metrics.avg_courage_score) || 0,
      avg_overall_score: parseFloat(metrics.avg_overall_score) || 0,
      first_assessment: metrics.first_assessment,
      latest_assessment: metrics.latest_assessment
    };

    console.log(`✅ Leadership metrics calculated with equal access: ${processedMetrics.total_assessments} assessments`);

    res.json({
      success: true,
      metrics: processedMetrics,
      access_info: {
        user_role: userRole,
        access_level: 'full_team_visibility',
        note: 'All users can view team-wide leadership metrics for collective insights'
      }
    });

  } catch (error) {
    console.error('❌ Error fetching leadership metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leadership metrics'
    });
  }
};

/**
 * Delete a leadership assessment - ONLY owner can delete
 * DELETE /api/leadership/assessments/:id
 */
const deleteLeadershipAssessment = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const assessmentId = parseInt(req.params.id);

    if (isNaN(assessmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assessment ID'
      });
    }

    let deleteQuery = `
      DELETE FROM leadership_assessments 
      WHERE id = $1
    `;

    const queryParams = [assessmentId];

    // Only allow users to delete their own assessments unless they're Project Managers
    if (userRole !== 'Project Manager') {
      deleteQuery += ` AND user_id = $2`;
      queryParams.push(userId);
    }

    deleteQuery += ` RETURNING id`;

    const result = await query(deleteQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Leadership assessment not found or access denied'
      });
    }

    console.log(`✅ Leadership assessment deleted: ID ${assessmentId}`);

    res.json({
      success: true,
      message: 'Leadership assessment deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting leadership assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete leadership assessment'
    });
  }
};

module.exports = {
  getLeadershipAssessments,
  submitLeadershipAssessment,
  getLeadershipAssessmentById,
  getLeadershipMetrics,
  deleteLeadershipAssessment
};