// backend/src/services/ai/databaseQueryFixes.js
// Fixes for database queries in aiService

/**
 * Fixed queries that use correct table names from schema
 */

// Fix the team query - use project_team_members instead of project_teams
const getTeamMembersQuery = `
  SELECT DISTINCT
    u.id,
    u.name,
    u.role,
    ptm.role_in_project,
    p.name as project_name,
    p.id as project_id,
    ptm.contribution_percentage,
    ptm.tasks_completed,
    ptm.joined_date
  FROM users u
  LEFT JOIN project_team_members ptm ON u.id = ptm.user_id
  LEFT JOIN projects p ON ptm.project_id = p.id
  WHERE (u.id = $1 OR 
         p.created_by = $1 OR 
         EXISTS (
           SELECT 1 FROM project_team_members ptm2 
           WHERE ptm2.project_id = p.id AND ptm2.user_id = $1
         ))
  ORDER BY u.name
  LIMIT 20
`;

// Fix the projects query with proper column names
const getUserProjectsQuery = `
  SELECT 
    p.id,
    p.name,
    p.description,
    p.status,
    p.priority,
    p.deadline,
    p.pm_progress,
    p.leadership_progress,
    p.change_mgmt_progress,
    p.career_dev_progress,
    p.created_at,
    p.updated_at,
    u.name as creator_name,
    COUNT(DISTINCT ptm.user_id) as team_size,
    CASE 
      WHEN p.created_by = $1 THEN true 
      ELSE false 
    END as isCreator
  FROM projects p
  LEFT JOIN users u ON p.created_by = u.id
  LEFT JOIN project_team_members ptm ON p.id = ptm.project_id
  WHERE p.created_by = $1 
     OR p.id IN (
       SELECT ptm2.project_id 
       FROM project_team_members ptm2 
       WHERE ptm2.user_id = $1
     )
  GROUP BY p.id, p.name, p.description, p.status, p.priority, p.deadline, 
           p.pm_progress, p.leadership_progress, p.change_mgmt_progress, 
           p.career_dev_progress, p.created_at, p.updated_at, u.name, p.created_by
  ORDER BY p.updated_at DESC
`;

// Fix the assessments query - use leadership_assessments table
const getAssessmentsQuery = `
  SELECT 
    'leadership_diamond' as type,
    vision_score,
    reality_score,
    ethics_score,
    courage_score,
    responses,
    created_at,
    project_id
  FROM leadership_assessments 
  WHERE user_id = $1
  ORDER BY created_at DESC
  LIMIT 10
`;

// Fix the career goals query
const getCareerGoalsQuery = `
  SELECT 
    id,
    title,
    description,
    category,
    current_level,
    target_level,
    current_progress,
    target_date,
    priority,
    status,
    notes,
    resources,
    created_at,
    updated_at
  FROM career_development_goals 
  WHERE user_id = $1 
    AND status IN ('active', 'paused')
  ORDER BY priority DESC, target_date ASC
  LIMIT 20
`;

module.exports = {
  getTeamMembersQuery,
  getUserProjectsQuery,
  getAssessmentsQuery,
  getCareerGoalsQuery
};