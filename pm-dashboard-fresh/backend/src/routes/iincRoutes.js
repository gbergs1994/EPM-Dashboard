// backend/src/routes/iincRoutes.js
const express = require('express');
const { query } = require('../config/database');
const router = express.Router();

// Middleware to ensure authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
};

// Middleware to ensure project manager access for viewing others' data
const requireProjectManagerForOthers = (req, res, next) => {
  const { userId } = req.params;
  
  // Users can always access their own data
  if (parseInt(userId) === req.user.id) {
    return next();
  }
  
  // Project Managers can access anyone's data
  if (req.user.role === 'Project Manager') {
    return next();
  }
  
  return res.status(403).json({ 
    success: false, 
    error: 'Access denied. Only Project Managers can view other users\' I, Inc. assessments.' 
  });
};

// Database initialization - create tables if they don't exist
const initializeIIncTables = async () => {
  try {
    // I, Inc. responses table
    await query(`
      CREATE TABLE IF NOT EXISTS iinc_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        module_key VARCHAR(50) NOT NULL,
        section_key VARCHAR(50) NOT NULL,
        response_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_key, section_key)
      )
    `);

    // I, Inc. submissions history table
    await query(`
      CREATE TABLE IF NOT EXISTS iinc_submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        responses TEXT NOT NULL DEFAULT '{}',
        focus_area VARCHAR(50),
        completion_percentage INTEGER DEFAULT 0,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance (SQLite's driver only runs one statement per call)
    await query('CREATE INDEX IF NOT EXISTS idx_iinc_responses_user_id ON iinc_responses(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_iinc_responses_module ON iinc_responses(module_key)');
    await query('CREATE INDEX IF NOT EXISTS idx_iinc_submissions_user_id ON iinc_submissions(user_id)');

    console.log('✅ I, Inc. database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing I, Inc. tables:', error);
  }
};

// Initialize tables on module load
initializeIIncTables();

// GET /iinc-responses/:userId - Get latest responses for a user
router.get('/iinc-responses/:userId', requireAuth, requireProjectManagerForOthers, async (req, res) => {
  try {
    const { userId } = req.params;

    console.log(`📖 Loading I, Inc. responses for user ${userId} (requested by ${req.user.id})`);

    // Get the latest responses for each module/section combination.
    // (user_id, module_key, section_key) is UNIQUE, so there's only one row per combination.
    const result = await query(`
      SELECT module_key, section_key, response_text, updated_at
      FROM iinc_responses
      WHERE user_id = $1
      ORDER BY module_key, section_key
    `, [userId]);

    // Structure the responses by module and section
    const structuredResponses = {};
    result.rows.forEach(row => {
      if (!structuredResponses[row.module_key]) {
        structuredResponses[row.module_key] = {};
      }
      structuredResponses[row.module_key][row.section_key] = row.response_text;
    });

    console.log(`✅ Found responses for ${result.rows.length} sections across ${Object.keys(structuredResponses).length} modules`);

    res.json({
      success: true,
      data: structuredResponses
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. responses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. responses'
    });
  }
});

// GET /iinc-history/:userId - Get submission history for a user
router.get('/iinc-history/:userId', requireAuth, requireProjectManagerForOthers, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    console.log(`📚 Loading I, Inc. submission history for user ${userId}`);

    const result = await query(`
      SELECT 
        id,
        focus_area,
        completion_percentage,
        submitted_at,
        responses
      FROM iinc_submissions 
      WHERE user_id = $1
      ORDER BY submitted_at DESC
      LIMIT $2
    `, [userId, limit]);

    console.log(`✅ Found ${result.rows.length} I, Inc. submissions`);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        focus_area: row.focus_area,
        completion_percentage: row.completion_percentage,
        submitted_at: row.submitted_at,
        // Don't send full responses in history list for performance
        has_responses: Object.keys(row.responses || {}).length > 0
      }))
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. submission history'
    });
  }
});

// POST /iinc-responses - Save or update a response
router.post('/iinc-responses', requireAuth, async (req, res) => {
  try {
    const { user_id, responses, module_key, section_key } = req.body;

    // Users can only save their own responses
    if (parseInt(user_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only save your own responses'
      });
    }

    if (!module_key || !section_key) {
      return res.status(400).json({
        success: false,
        error: 'Module key and section key are required'
      });
    }

    const responseText = responses[module_key]?.[section_key] || '';

    console.log(`💾 Saving I, Inc. response: user ${user_id}, ${module_key}.${section_key}`);

    // Upsert the response
    const result = await query(`
      INSERT INTO iinc_responses (user_id, module_key, section_key, response_text, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, module_key, section_key) 
      DO UPDATE SET 
        response_text = EXCLUDED.response_text,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `, [user_id, module_key, section_key, responseText]);

    console.log(`✅ I, Inc. response saved with ID ${result.rows[0]?.id}`);

    res.json({
      success: true,
      data: { id: result.rows[0]?.id }
    });

  } catch (error) {
    console.error('❌ Error saving I, Inc. response:', error);
    
    // Check if it's a constraint error
    if (error.code === '23505') { // Unique constraint violation
      // Try updating instead
      try {
        const { user_id, responses, module_key, section_key } = req.body;
        const responseText = responses[module_key]?.[section_key] || '';
        
        const updateResult = await query(`
          UPDATE iinc_responses 
          SET response_text = $1, updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $2 AND module_key = $3 AND section_key = $4
          RETURNING id
        `, [responseText, user_id, module_key, section_key]);

        if (updateResult.rows.length > 0) {
          return res.json({
            success: true,
            data: { id: updateResult.rows[0].id }
          });
        }
      } catch (updateError) {
        console.error('❌ Error updating I, Inc. response:', updateError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save I, Inc. response'
    });
  }
});

// POST /iinc-submit - Submit a complete assessment
router.post('/iinc-submit', requireAuth, async (req, res) => {
  try {
    const { user_id, responses } = req.body;

    // Users can only submit their own assessments
    if (parseInt(user_id) !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only submit your own assessments'
      });
    }

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Responses are required'
      });
    }

    console.log(`🚀 Submitting I, Inc. assessment for user ${user_id}`);

    // Calculate completion percentage
    const totalSections = 13; // passion(3) + sweetspot(3) + story(3) + entrepreneurial(4) sections
    let completedSections = 0;

    Object.values(responses).forEach(moduleResponses => {
      if (moduleResponses && typeof moduleResponses === 'object') {
        Object.values(moduleResponses).forEach(response => {
          if (response && response.trim().length > 0) {
            completedSections++;
          }
        });
      }
    });

    const completionPercentage = Math.round((completedSections / totalSections) * 100);

    // Save individual responses
    for (const [moduleKey, moduleResponses] of Object.entries(responses)) {
      if (moduleResponses && typeof moduleResponses === 'object') {
        for (const [sectionKey, responseText] of Object.entries(moduleResponses)) {
          if (responseText && responseText.trim().length > 0) {
            await query(`
              INSERT INTO iinc_responses (user_id, module_key, section_key, response_text, updated_at)
              VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
              ON CONFLICT (user_id, module_key, section_key) 
              DO UPDATE SET 
                response_text = EXCLUDED.response_text,
                updated_at = CURRENT_TIMESTAMP
            `, [user_id, moduleKey, sectionKey, responseText.trim()]);
          }
        }
      }
    }

    // Create submission record
    const submissionResult = await query(`
      INSERT INTO iinc_submissions (
        user_id, 
        responses, 
        focus_area, 
        completion_percentage, 
        submitted_at
      )
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, submitted_at
    `, [
      user_id, 
      JSON.stringify(responses), 
      req.body.focus_area || null,
      completionPercentage
    ]);

    console.log(`✅ I, Inc. assessment submitted successfully: ${completionPercentage}% complete`);

    res.json({
      success: true,
      data: {
        id: submissionResult.rows[0].id,
        completion_percentage: completionPercentage,
        submitted_at: submissionResult.rows[0].submitted_at
      }
    });

  } catch (error) {
    console.error('❌ Error submitting I, Inc. assessment:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to submit I, Inc. assessment'
    });
  }
});

// GET /iinc-summary - Get I, Inc. summary for project managers (all users)
router.get('/iinc-summary', requireAuth, async (req, res) => {
  try {
    // Only Project Managers can access summary
    if (req.user.role !== 'Project Manager') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Project Managers can access I, Inc. summary.'
      });
    }

    console.log(`📊 Loading I, Inc. summary for project manager ${req.user.id}`);

    // Get latest submission for each user
    const result = await query(`
      WITH latest_submissions AS (
        SELECT DISTINCT ON (user_id)
          user_id,
          id as submission_id,
          focus_area,
          completion_percentage,
          submitted_at
        FROM iinc_submissions
        ORDER BY user_id, submitted_at DESC
      )
      SELECT 
        ls.*,
        u.name as user_name,
        u.role as user_role,
        u.email as user_email
      FROM latest_submissions ls
      JOIN users u ON ls.user_id = u.id
      ORDER BY u.name
    `);

    console.log(`✅ Found I, Inc. data for ${result.rows.length} users`);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('❌ Error loading I, Inc. summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load I, Inc. summary'
    });
  }
});

module.exports = router;