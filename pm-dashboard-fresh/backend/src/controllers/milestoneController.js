// backend/src/controllers/milestoneController.js
const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

const computeEarnedValue = (plannedValue, completionPercentage) => {
  const pv = Number(plannedValue) || 0;
  const pct = Number(completionPercentage) || 0;
  return (pv * pct) / 100;
};

const normalizeComment = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const logMilestoneHistory = async ({
  projectId,
  userId,
  action,
  description,
  actionType,
  details = {}
}) => {
  if (!projectId || !action || !actionType) return;

  await query(
    `
      INSERT INTO project_history (project_id, user_id, action, description, action_type, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `,
    [
      projectId,
      userId || null,
      action,
      description || action,
      actionType,
      JSON.stringify(details)
    ]
  );
};

// Get all milestones for a project
const getMilestonesByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError('Project ID is required', 400);
    }

    const milestoneQuery = `
      SELECT * FROM milestones 
      WHERE project_id = $1
      ORDER BY order_index ASC, start_date ASC
    `;

    const result = await query(milestoneQuery, [projectId]);
    
    const milestones = result.rows.map(milestone => ({
      ...milestone,
      planned_value: Number(milestone.planned_value) || 0,
      actual_cost: Number(milestone.actual_cost) || 0,
      earned_value: Number(milestone.earned_value) || 0,
      completion_percentage: Number(milestone.completion_percentage) || 0
    }));

    res.json({
      success: true,
      count: milestones.length,
      milestones
    });
  } catch (error) {
    console.error('❌ Error fetching milestones:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch milestones'
    });
  }
};

// Get a single milestone
const getMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;

    if (!milestoneId) {
      throw new ApiError('Milestone ID is required', 400);
    }

    const milestoneQuery = `
      SELECT * FROM milestones WHERE id = $1
    `;

    const result = await query(milestoneQuery, [milestoneId]);
    
    if (result.rows.length === 0) {
      throw new ApiError('Milestone not found', 404);
    }

    const milestone = result.rows[0];
    
    res.json({
      success: true,
      milestone: {
        ...milestone,
        planned_value: Number(milestone.planned_value) || 0,
        actual_cost: Number(milestone.actual_cost) || 0,
        earned_value: Number(milestone.earned_value) || 0,
        completion_percentage: Number(milestone.completion_percentage) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching milestone:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch milestone'
    });
  }
};

// Create a milestone
const createMilestone = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const {
      title,
      description = '',
      planned_value = 0,
      completion_percentage = 0,
      actual_cost = 0,
      end_date,
      start_date = null,
      status = 'planning',
      order_index = 0
    } = req.body;

    if (!projectId || !title || !end_date) {
      throw new ApiError('Project ID, title, and end_date are required', 400);
    }

    const plannedValue = toNumberOrNull(planned_value);
    const completionPercentage = toNumberOrNull(completion_percentage) ?? 0;
    const actualCost = toNumberOrNull(actual_cost) ?? 0;
    const earnedValue = computeEarnedValue(plannedValue ?? 0, completionPercentage);
    
    const createQuery = `
      INSERT INTO milestones (
        project_id, title, description, planned_value,
        actual_cost, completion_percentage, earned_value,
        end_date, start_date, status, order_index, 
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await query(createQuery, [
      projectId,
      title.trim(),
      description.trim(),
      plannedValue ?? 0,
      actualCost,
      completionPercentage,
      earnedValue,
      end_date,
      start_date,
      status,
      order_index
    ]);

    const milestone = result.rows[0];

    await logMilestoneHistory({
      projectId: milestone.project_id,
      userId,
      action: 'milestone_created',
      description: `Created milestone "${milestone.title}"`,
      actionType: 'milestone_change',
      details: {
        milestoneId: milestone.id,
        milestoneTitle: milestone.title,
        status: milestone.status,
        planned_value: Number(milestone.planned_value) || 0,
        completion_percentage: Number(milestone.completion_percentage) || 0
      }
    });

    res.status(201).json({
      success: true,
      milestone: {
        ...milestone,
        planned_value: Number(milestone.planned_value) || 0,
        actual_cost: Number(milestone.actual_cost) || 0,
        earned_value: Number(milestone.earned_value) || 0,
        completion_percentage: Number(milestone.completion_percentage) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error creating milestone:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create milestone'
    });
  }
};

// Create multiple milestones for a project
const createMilestones = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    const { milestones: milestonesToCreate = [] } = req.body;

    if (!projectId || !Array.isArray(milestonesToCreate) || milestonesToCreate.length === 0) {
      throw new ApiError('Project ID and milestones array are required', 400);
    }

    await query('BEGIN');

    try {
      const createdMilestones = [];
      const insertQuery = `
        INSERT INTO milestones (
          project_id, title, description, planned_value,
          actual_cost, completion_percentage, earned_value,
          end_date, start_date, status, order_index,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      for (let i = 0; i < milestonesToCreate.length; i++) {
        const m = milestonesToCreate[i];
        const plannedValue = toNumberOrNull(m.planned_value);
        const completionPercentage = toNumberOrNull(m.completion_percentage) ?? 0;
        const actualCost = toNumberOrNull(m.actual_cost) ?? 0;
        const earnedValue = computeEarnedValue(plannedValue ?? 0, completionPercentage);

        const result = await query(insertQuery, [
          projectId,
          m.title?.trim() || `Milestone ${i + 1}`,
          m.description?.trim() || '',
          plannedValue ?? 0,
          actualCost,
          completionPercentage,
          earnedValue,
          m.end_date,
          m.start_date || null,
          m.status || 'planning',
          m.order_index !== undefined ? m.order_index : i
        ]);

        createdMilestones.push(result.rows[0]);
      }

      await query('COMMIT');

      await logMilestoneHistory({
        projectId,
        userId,
        action: 'milestones_bulk_created',
        description: `Created ${createdMilestones.length} milestones`,
        actionType: 'milestone_change',
        details: {
          count: createdMilestones.length,
          milestones: createdMilestones.map((m) => ({
            id: m.id,
            title: m.title,
            status: m.status
          }))
        }
      });

      res.status(201).json({
        success: true,
        count: createdMilestones.length,
        milestones: createdMilestones.map(m => ({
          ...m,
          planned_value: Number(m.planned_value) || 0,
          actual_cost: Number(m.actual_cost) || 0,
          earned_value: Number(m.earned_value) || 0,
          completion_percentage: Number(m.completion_percentage) || 0
        }))
      });
    } catch (innerError) {
      await query('ROLLBACK');
      throw innerError;
    }
  } catch (error) {
    console.error('❌ Error creating milestones:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to create milestones'
    });
  }
};

// Update a milestone
const updateMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const userId = req.user?.id;
    const {
      title,
      description,
      planned_value,
      actual_cost,
      completion_percentage,
      end_date,
      start_date,
      status,
      order_index,
      comment
    } = req.body;

    if (!milestoneId) {
      throw new ApiError('Milestone ID is required', 400);
    }

    const normalizedComment = normalizeComment(comment);
    if (!normalizedComment) {
      throw new ApiError('A comment is required when saving milestone updates', 400);
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;
    let nextPlannedValue;
    let nextCompletionPercentage;

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description.trim());
    }
    if (planned_value !== undefined) {
      nextPlannedValue = toNumberOrNull(planned_value) ?? 0;
      updates.push(`planned_value = $${paramIndex++}`);
      values.push(nextPlannedValue);
    }
    if (actual_cost !== undefined) {
      updates.push(`actual_cost = $${paramIndex++}`);
      values.push(toNumberOrNull(actual_cost) ?? 0);
    }
    if (completion_percentage !== undefined) {
      const percentage = Number(completion_percentage) || 0;
      if (percentage < 0 || percentage > 100) {
        throw new ApiError('Completion percentage must be between 0 and 100', 400);
      }
      nextCompletionPercentage = percentage;
      updates.push(`completion_percentage = $${paramIndex++}`);
      values.push(percentage);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      values.push(end_date);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(start_date);
    }
    if (status !== undefined) {
      const validStatuses = ['planning', 'in_progress', 'completed', 'on_hold'];
      if (!validStatuses.includes(status)) {
        throw new ApiError(`Status must be one of: ${validStatuses.join(', ')}`, 400);
      }
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramIndex++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      throw new ApiError('No fields to update', 400);
    }

    if (nextPlannedValue === undefined || nextCompletionPercentage === undefined) {
      const current = await query('SELECT planned_value, completion_percentage FROM milestones WHERE id = $1', [milestoneId]);
      if (!current.rows.length) {
        throw new ApiError('Milestone not found', 404);
      }
      if (nextPlannedValue === undefined) {
        nextPlannedValue = Number(current.rows[0].planned_value) || 0;
      }
      if (nextCompletionPercentage === undefined) {
        nextCompletionPercentage = Number(current.rows[0].completion_percentage) || 0;
      }
    }

    const earnedValue = computeEarnedValue(nextPlannedValue, nextCompletionPercentage);
    updates.push(`earned_value = $${paramIndex++}`);
    values.push(earnedValue);
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(milestoneId);

    const updateQuery = `
      UPDATE milestones
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    await query('BEGIN');
    let result;

    try {
      result = await query(updateQuery, values);

      if (result.rows.length === 0) {
        throw new ApiError('Milestone not found', 404);
      }

      const updatedMilestone = result.rows[0];

      await query(
        `
        INSERT INTO milestone_comments (
          milestone_id, project_id, user_id, content,
          completion_percentage, actual_cost, earned_value
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [
          milestoneId,
          updatedMilestone.project_id,
          userId || null,
          normalizedComment,
          Number(updatedMilestone.completion_percentage) || 0,
          Number(updatedMilestone.actual_cost) || 0,
          Number(updatedMilestone.earned_value) || 0
        ]
      );

      await logMilestoneHistory({
        projectId: updatedMilestone.project_id,
        userId,
        action: 'milestone_updated',
        description: `Updated milestone "${updatedMilestone.title}"`,
        actionType: 'milestone_change',
        details: {
          milestoneId: updatedMilestone.id,
          milestoneTitle: updatedMilestone.title,
          status: updatedMilestone.status,
          completion_percentage: Number(updatedMilestone.completion_percentage) || 0,
          actual_cost: Number(updatedMilestone.actual_cost) || 0,
          earned_value: Number(updatedMilestone.earned_value) || 0,
          comment: normalizedComment
        }
      });

      await query('COMMIT');
    } catch (innerError) {
      await query('ROLLBACK');
      throw innerError;
    }

    const milestone = result.rows[0];

    res.json({
      success: true,
      milestone: {
        ...milestone,
        planned_value: Number(milestone.planned_value) || 0,
        actual_cost: Number(milestone.actual_cost) || 0,
        earned_value: Number(milestone.earned_value) || 0,
        completion_percentage: Number(milestone.completion_percentage) || 0
      }
    });
  } catch (error) {
    console.error('❌ Error updating milestone:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to update milestone'
    });
  }
};

const getMilestoneComments = async (req, res) => {
  try {
    const { milestoneId } = req.params;

    if (!milestoneId) {
      throw new ApiError('Milestone ID is required', 400);
    }

    const commentsQuery = `
      SELECT
        mc.*,
        u.name AS user_name,
        u.email AS user_email
      FROM milestone_comments mc
      LEFT JOIN users u ON mc.user_id = u.id
      WHERE mc.milestone_id = $1
      ORDER BY mc.created_at DESC, mc.id DESC
    `;

    const result = await query(commentsQuery, [milestoneId]);

    const comments = result.rows.map((row) => ({
      ...row,
      completion_percentage: Number(row.completion_percentage) || 0,
      actual_cost: Number(row.actual_cost) || 0,
      earned_value: Number(row.earned_value) || 0
    }));

    res.json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    console.error('❌ Error fetching milestone comments:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch milestone comments'
    });
  }
};

// Delete a milestone
const deleteMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;

    if (!milestoneId) {
      throw new ApiError('Milestone ID is required', 400);
    }

    const deleteQuery = `
      DELETE FROM milestones WHERE id = $1
      RETURNING id, project_id, title
    `;

    const result = await query(deleteQuery, [milestoneId]);

    if (result.rows.length === 0) {
      throw new ApiError('Milestone not found', 404);
    }

    const deletedMilestone = result.rows[0];

    await logMilestoneHistory({
      projectId: deletedMilestone.project_id,
      userId: req.user?.id,
      action: 'milestone_deleted',
      description: `Deleted milestone "${deletedMilestone.title}"`,
      actionType: 'milestone_change',
      details: {
        milestoneId: deletedMilestone.id,
        milestoneTitle: deletedMilestone.title
      }
    });

    res.json({
      success: true,
      message: 'Milestone deleted successfully',
      id: deletedMilestone.id
    });
  } catch (error) {
    console.error('❌ Error deleting milestone:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to delete milestone'
    });
  }
};

// Calculate aggregate EV metrics for all milestones in a project
const getProjectMilestoneMetrics = async (req, res) => {
  try {
    const { projectId } = req.params;

    if (!projectId) {
      throw new ApiError('Project ID is required', 400);
    }

    const metricsQuery = `
      SELECT 
        COUNT(*) as total_milestones,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_milestones,
        SUM(planned_value) as total_planned_value,
        SUM(actual_cost) as total_actual_cost,
        SUM(earned_value) as total_earned_value,
        AVG(completion_percentage) as avg_completion_percentage
      FROM milestones
      WHERE project_id = $1
    `;

    const result = await query(metricsQuery, [projectId]);
    const metrics = result.rows[0] || {};

    const currentMilestoneQuery = `
      SELECT
        id,
        title,
        status,
        order_index,
        planned_value,
        actual_cost,
        earned_value,
        completion_percentage
      FROM milestones
      WHERE id = COALESCE(
        (
          SELECT m1.id
          FROM milestones m1
          WHERE m1.project_id = $1
            AND COALESCE(m1.completion_percentage, 0) < 100
          ORDER BY m1.order_index ASC, m1.start_date ASC, m1.end_date ASC, m1.id ASC
          LIMIT 1
        ),
        (
          SELECT m2.id
          FROM milestones m2
          WHERE m2.project_id = $1
          ORDER BY m2.order_index DESC, m2.start_date DESC, m2.end_date DESC, m2.id DESC
          LIMIT 1
        )
      )
      LIMIT 1
    `;

    const currentMilestoneResult = await query(currentMilestoneQuery, [projectId]);
    const currentMilestone = currentMilestoneResult.rows[0] || null;

    // Calculate indices
    const totalPV = Number(metrics.total_planned_value) || 0;
    const totalAC = Number(metrics.total_actual_cost) || 0;
    const totalEV = Number(metrics.total_earned_value) || 0;

    const currentPV = Number(currentMilestone?.planned_value) || 0;
    const currentAC = Number(currentMilestone?.actual_cost) || 0;
    const currentEV = Number(currentMilestone?.earned_value) || 0;

    const cpi = totalAC > 0 ? totalEV / totalAC : 0; // Cost Performance Index
    const spi = totalPV > 0 ? totalEV / totalPV : 0; // Schedule Performance Index
    const currentCpi = currentAC > 0 ? currentEV / currentAC : 0;
    const currentSpi = currentPV > 0 ? currentEV / currentPV : 0;

    res.json({
      success: true,
      metrics: {
        total_milestones: Number(metrics.total_milestones) || 0,
        completed_milestones: Number(metrics.completed_milestones) || 0,
        total_planned_value: totalPV,
        total_actual_cost: totalAC,
        total_earned_value: totalEV,
        avg_completion_percentage: Number(metrics.avg_completion_percentage) || 0,
        spi: Number(spi.toFixed(2)),
        cpi: Number(cpi.toFixed(2)),
        cv: Number((totalEV - totalAC).toFixed(2)), // Cost Variance
        sv: Number((totalEV - totalPV).toFixed(2)),  // Schedule Variance
        current_milestone_id: currentMilestone ? Number(currentMilestone.id) : null,
        current_milestone_title: currentMilestone?.title || null,
        current_milestone_status: currentMilestone?.status || null,
        current_milestone_order_index: currentMilestone ? Number(currentMilestone.order_index) || 0 : null,
        current_milestone_completion_percentage: currentMilestone
          ? Number(currentMilestone.completion_percentage) || 0
          : 0,
        current_planned_value: currentPV,
        current_actual_cost: currentAC,
        current_earned_value: currentEV,
        current_spi: Number(currentSpi.toFixed(2)),
        current_cpi: Number(currentCpi.toFixed(2)),
        current_cv: Number((currentEV - currentAC).toFixed(2)),
        current_sv: Number((currentEV - currentPV).toFixed(2))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching milestone metrics:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || 'Failed to fetch milestone metrics'
    });
  }
};

module.exports = {
  getMilestonesByProject,
  getMilestone,
  createMilestone,
  createMilestones,
  updateMilestone,
  getMilestoneComments,
  deleteMilestone,
  getProjectMilestoneMetrics
};
