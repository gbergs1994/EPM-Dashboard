const ProjectHistory = require('../models/ProjectHistory'); 
const Project = require('../models/Project'); 
/**
 * Get project history by project ID
 * @route GET /api/projects/:id/history
 */
const getProjectHistory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('ðŸ“Š Getting history for project ID:', id);

    if (!id || (typeof id === 'string' && id.trim() === '')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid project ID provided'
      });
    }

    let project;
    try {
      project = await Project.findById(id);
    } catch (dbError) {
      console.error('âŒ Database error finding project:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database error while finding project'
      });
    }

    if (!project) {
      console.log('âš ï¸ Project not found with ID:', id);
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    console.log('âœ… Project found:', project.name || project.title || `ID: ${project.id}`);

    let history;
    try {
      history = await ProjectHistory.find({ projectId: id })
        .sort({ timestamp: -1 }) 
        .limit(50); 

      console.log(`âœ… Found ${history.length} history entries for project ${id}`);
    } catch (historyError) {
      console.error('âŒ Error fetching project history:', historyError);
      return res.status(500).json({
        success: false,
        error: 'Error fetching project history'
      });
    }

    const formattedHistory = history.map(entry => ({
      id: entry.id || entry._id,
      action: entry.action,
      description: entry.description,
      type: entry.type,
      user: entry.user || entry.userName || 'System',
      timestamp: entry.timestamp || entry.createdAt,
      details: entry.details || {}
    }));

    res.json({
      success: true,
      data: formattedHistory,
      projectId: id,
      projectName: project.name || project.title,
      total: formattedHistory.length
    });

  } catch (error) {
    console.error('âŒ Unexpected error in getProjectHistory:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a new history entry
 * @route POST /api/projects/:id/history
 */
const addProjectHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, description, type, user, details } = req.body;

    console.log('ðŸ“ Adding history entry for project:', id);

    if (!action || !type || !user) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: action, type, or user'
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const historyEntry = await ProjectHistory.create({
      projectId: id,
      action,
      description: description || action,
      type,
      user,
      details: details || {},
      timestamp: new Date()
    });

    console.log('âœ… History entry created:', historyEntry.id);

    res.status(201).json({
      success: true,
      data: historyEntry
    });

  } catch (error) {
    console.error('âŒ Error adding project history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add history entry'
    });
  }
};

/**
 * Get project history with filtering and pagination
 * @route GET /api/projects/:id/history/filtered
 */
const getFilteredProjectHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, 
      user, 
      limit = 20, 
      offset = 0, 
      startDate, 
      endDate 
    } = req.query;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const filters = { projectId: id };
    
    if (type) filters.type = type;
    if (user) filters.user = user;
    if (startDate && endDate) {
      filters.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const history = await ProjectHistory.find(filters)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await ProjectHistory.countDocuments(filters);

    res.json({
      success: true,
      data: history,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });

  } catch (error) {
    console.error('âŒ Error getting filtered history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get filtered history'
    });
  }
};

module.exports = {
  getProjectHistory,
  addProjectHistory,
  getFilteredProjectHistory
};