// backend/src/controllers/careerController.js
const { query } = require('../config/database');

// Valid level and category options based on database schema
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];
const VALID_CATEGORIES = ['technical', 'management', 'communication', 'design', 'analytics', 'business strategy', 'team building', 'leadership', 'innovation'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['active', 'completed', 'paused', 'cancelled'];

const getCareerGoals = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID is required' 
      });
    }

    // Ensure the goals table exists
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS career_development_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          current_level TEXT,
          target_level TEXT,
          priority TEXT,
          current_progress INTEGER DEFAULT 0,
          status TEXT,
          target_date DATE,
          completed_date DATE,
          notes TEXT,
          resources TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ career_development_goals table ensured in getCareerGoals');
    } catch (tableErr) {
      console.error('❌ Could not ensure goals table exists in getCareerGoals:', tableErr.message);
      // Continue anyway, the query might still work if table exists
    }

    const goalsQuery = `
      SELECT 
        g.id, g.title, g.description, g.category, g.current_level, g.target_level, 
        g.priority, g.current_progress, g.status, g.target_date, g.completed_date,
        COALESCE(g.resources, '[]') as resources, g.notes, g.created_at, g.updated_at
      FROM career_development_goals g
      WHERE g.user_id = $1 AND (g.status IS NULL OR g.status != 'cancelled')
      ORDER BY g.created_at DESC
    `;

    const result = await query(goalsQuery, [userId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error getting career goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get career goals',
      details: error.message
    });
  }
};

const createCareerGoal = async (req, res) => {
  try {
    const userId = req.user?.id;

    console.log('🎯 createCareerGoal called by user:', userId);
    console.log('📝 Request body:', req.body);

    if (!userId) {
      console.log('❌ No user ID found');
      return res.status(400).json({ 
        success: false, 
        error: 'User authentication required' 
      });
    }

    // ensure the goals table exists (helps in fresh/dev setups)
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS career_development_goals (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          category TEXT,
          current_level TEXT,
          target_level TEXT,
          priority TEXT,
          current_progress INTEGER DEFAULT 0,
          status TEXT,
          target_date DATE,
          completed_date DATE,
          notes TEXT,
          resources TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ career_development_goals table ensured');
    } catch (tableErr) {
      console.error('❌ Could not ensure goals table exists:', tableErr.message);
      // continue, the later insert will still fail if table missing
    }

    const {
      title,
      description,
      category,
      currentLevel,
      targetLevel,
      priority,
      target_date,
      notes,
      resources
    } = req.body;

    console.log('🔍 Extracted fields:', {
      title: title?.substring(0, 20) + '...',
      category,
      currentLevel,
      targetLevel,
      priority,
      target_date
    });

    // Validation
    if (!title || !title.trim()) {
      console.log('❌ Title validation failed');
      return res.status(400).json({ 
        success: false, 
        error: 'Goal title is required' 
      });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      console.log('❌ Category validation failed:', category, 'Valid:', VALID_CATEGORIES);
      return res.status(400).json({ 
        success: false, 
        error: `Category is required and must be one of: ${VALID_CATEGORIES.join(', ')}` 
      });
    }

    if (!currentLevel || !VALID_LEVELS.includes(currentLevel)) {
      console.log('❌ Current level validation failed:', currentLevel, 'Valid:', VALID_LEVELS);
      return res.status(400).json({ 
        success: false, 
        error: `Current level is required and must be one of: ${VALID_LEVELS.join(', ')}` 
      });
    }

    if (!targetLevel || !VALID_LEVELS.includes(targetLevel)) {
      console.log('❌ Target level validation failed:', targetLevel, 'Valid:', VALID_LEVELS);
      return res.status(400).json({ 
        success: false, 
        error: `Target level is required and must be one of: ${VALID_LEVELS.join(', ')}` 
      });
    }

    // Level progression validation
    const levelValues = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    if (levelValues[targetLevel] <= levelValues[currentLevel]) {
      console.log('❌ Level progression validation failed');
      return res.status(400).json({ 
        success: false, 
        error: 'Target level must be higher than current level' 
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      console.log('❌ Priority validation failed:', priority);
      return res.status(400).json({ 
        success: false, 
        error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` 
      });
    }

    console.log('✅ All validation passed, inserting into database...');

    const insertQuery = `
      INSERT INTO career_development_goals (
        user_id, title, description, category, current_level, 
        target_level, priority, current_progress, status, target_date, 
        notes, resources, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id, title, description, category, current_level, target_level, priority,
        current_progress, status, target_date, notes, resources, created_at, updated_at
    `;

    const values = [
      userId,
      title.trim(),
      description ? description.trim() : null,
      category,
      currentLevel,
      targetLevel,
      priority || 'medium',
      0, // initial progress
      'active',
      target_date || null,
      notes ? notes.trim() : null,
      typeof resources === 'string' ? resources : JSON.stringify(resources || [])
    ];

    console.log('📊 Inserting values:', values);

    const result = await query(insertQuery, values);

    console.log('✅ Goal created successfully:', result.rows[0]?.id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Goal created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating goal:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A goal with this title already exists'
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID or related data'
      });
    }
    
    if (error.code === '23514') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category, level, or priority value'
      });
    }
    
    // send back both error and message for client
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create goal',
      message: error.message,
      details: error.message
    });
  }
};

const updateCareerGoal = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!goalId || isNaN(goalId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid goal ID is required'
      });
    }

    // Check if goal exists and belongs to user
    const existingGoal = await query(
      'SELECT * FROM career_development_goals WHERE id = $1 AND user_id = $2', 
      [goalId, userId]
    );

    if (existingGoal.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found or access denied'
      });
    }

    const {
      title,
      description,
      category,
      currentLevel,
      targetLevel,
      priority,
      target_date,
      notes,
      resources
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Category is required and must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    if (!currentLevel || !VALID_LEVELS.includes(currentLevel)) {
      return res.status(400).json({
        success: false,
        error: `Current level is required and must be one of: ${VALID_LEVELS.join(', ')}`
      });
    }

    if (!targetLevel || !VALID_LEVELS.includes(targetLevel)) {
      return res.status(400).json({
        success: false,
        error: `Target level is required and must be one of: ${VALID_LEVELS.join(', ')}`
      });
    }

    // Level progression validation
    const levelValues = { beginner: 1, intermediate: 2, advanced: 3, expert: 4 };
    if (levelValues[targetLevel] <= levelValues[currentLevel]) {
      return res.status(400).json({
        success: false,
        error: 'Target level must be higher than current level'
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const updateQuery = `
      UPDATE career_development_goals 
      SET title = $1, description = $2, category = $3, current_level = $4, 
          target_level = $5, priority = $6, target_date = $7, notes = $8, 
          resources = $9, updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND user_id = $11
      RETURNING *
    `;

    const values = [
      title.trim(),
      description ? description.trim() : null,
      category,
      currentLevel,
      targetLevel,
      priority || 'medium',
      target_date || null,
      notes ? notes.trim() : null,
      typeof resources === 'string' ? resources : JSON.stringify(resources || []),
      goalId,
      userId
    ];

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found or update failed'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Goal updated successfully'
    });

  } catch (error) {
    console.error('Error updating goal:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: 'A goal with this title already exists'
      });
    }
    
    if (error.code === '23514') {
      return res.status(400).json({
        success: false,
        error: 'Invalid category, level, or priority value'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update goal',
      details: error.message
    });
  }
};

const deleteCareerGoal = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!goalId || isNaN(goalId)) {
      return res.status(400).json({
        success: false,
        error: 'Valid goal ID is required'
      });
    }

    const deleteQuery = `
      DELETE FROM career_development_goals 
      WHERE id = $1 AND user_id = $2
      RETURNING id, title
    `;

    const result = await query(deleteQuery, [goalId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Goal not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Goal deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete goal',
      details: error.message
    });
  }
};

const getCompletedGoals = async (req, res) => {
  try {
    const requestedUserId = req.params.userId ? 
      parseInt(req.params.userId) : req.user?.id;

    // Authorization check
    if (requestedUserId !== req.user?.id && req.user?.role !== 'Project Manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const completedQuery = `
      SELECT *
      FROM career_development_goals 
      WHERE user_id = $1 AND status = 'completed'
      ORDER BY completed_date DESC, updated_at DESC
    `;

    const result = await query(completedQuery, [requestedUserId]);

    res.json({
      success: true,
      completedGoals: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error getting completed goals:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get completed goals',
      details: error.message
    });
  }
};

const deleteCompletedGoal = async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const userId = req.user?.id;

    const deleteQuery = `
      DELETE FROM career_development_goals 
      WHERE id = $1 AND user_id = $2 AND status = 'completed'
      RETURNING id, title
    `;

    const result = await query(deleteQuery, [goalId, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Completed goal not found or access denied'
      });
    }

    res.json({
      success: true,
      message: 'Completed goal deleted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting completed goal:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete completed goal',
      details: error.message
    });
  }
};

const getCareerStats = async (req, res) => {
  try {
    const requestedUserId = req.params.userId ? 
      parseInt(req.params.userId) : req.user?.id;

    // Authorization check
    if (requestedUserId !== req.user?.id && req.user?.role !== 'Project Manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const statsQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_goals,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_goals,
        COALESCE(AVG(CASE WHEN status = 'active' THEN current_progress END), 0) as avg_progress,
        COUNT(*) as total_goals
      FROM career_development_goals 
      WHERE user_id = $1 AND status != 'cancelled'
    `;

    const result = await query(statsQuery, [requestedUserId]);

    const stats = result.rows[0] || {};

    res.json({
      success: true,
      data: {
        activeGoals: parseInt(stats.active_goals) || 0,
        completedGoals: parseInt(stats.completed_goals) || 0,
        avgProgress: Math.round(parseFloat(stats.avg_progress) || 0),
        totalGoals: parseInt(stats.total_goals) || 0
      }
    });

  } catch (error) {
    console.error('Error getting career stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get career stats',
      details: error.message
    });
  }
};

module.exports = {
  getCareerGoals,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
  getCompletedGoals,
  deleteCompletedGoal,
  getCareerStats
};