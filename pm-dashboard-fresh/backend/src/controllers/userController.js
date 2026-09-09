const { query } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');
const bcrypt = require('bcryptjs');
const { USER_ROLES, isValidUserRole, normalizeUserRole, normalizeUserRoles } = require('../config/roles');

const getAllUsers = async (req, res) => {
  try {
    console.log('Getting users for team selection...');
    
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    
    let query_str;
    let queryParams = [];
    
    if (currentUserRole === 'Project Manager') {
      // Project Managers see all potential team members and users
      query_str = `
        SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar, COALESCE(u.current_workload, 0) as current_workload, u.created_at, u.updated_at
        FROM users u
        WHERE u.id != $1  -- Exclude the project manager themselves
        ORDER BY u.name ASC
      `;
      queryParams = [currentUserId];
      
    } else {
      // General user listing
      query_str = `
        SELECT DISTINCT u.id, u.name, u.email, u.role, u.avatar, COALESCE(u.current_workload, 0) as current_workload, u.created_at, u.updated_at
        FROM users u
        ORDER BY u.name ASC
      `;
      queryParams = [];
    }
    
    const result = await query(query_str, queryParams);
    const normalizedRows = normalizeUserRoles(result.rows);
    
    console.log(`Found ${normalizedRows.length} team users for role: ${currentUserRole}`);
    
    res.json({
      success: true,
      data: normalizedRows,
      users: normalizedRows,
      message: `Retrieved ${normalizedRows.length} team members`
    });
    
  } catch (error) {
    console.error('Error getting team users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve team users',
      error: error.message
    });
  }
};

const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, preferences,
        created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user', 500);
  }
};

const createUser = async (req, res) => {
  try {
    const { 
      name, email, role, title, department, phone, 
      location, bio, skills = [], avatar, password
    } = req.body;

    const userRole = normalizeUserRole(role || 'Team Member');
    if (!isValidUserRole(userRole)) {
      throw new ApiError(`role must be one of: ${USER_ROLES.join(', ')}`, 400);
    }
    
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new ApiError('User with this email already exists', 400);
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    const result = await query(`
      INSERT INTO users (
        name, email, password, role, title, department, phone, 
        location, bio, skills, avatar, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      name, email, hashedPassword, userRole, title || userRole, department || 'General',
      phone, location, bio, JSON.stringify(skills),
      avatar || name.split(' ').map(n => n[0]).join('').toUpperCase(),
      'active'
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'User created successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to create user', 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, role, title, department, phone, 
      location, bio, skills, avatar, status 
    } = req.body;

    if (role !== undefined) {
      const normalizedRole = normalizeUserRole(role);
      if (!isValidUserRole(normalizedRole)) {
        throw new ApiError(`role must be one of: ${USER_ROLES.join(', ')}`, 400);
      }
      req.body.role = normalizedRole;
    }
    
    const result = await query(`
      UPDATE users SET 
        name = $1, email = $2, role = $3, title = $4, 
        department = $5, phone = $6, location = $7, bio = $8,
        skills = $9, avatar = $10, status = $11, updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *
    `, [
      name, email, req.body.role ?? role, title, department, phone, 
      location, bio, JSON.stringify(skills), avatar, status, id
    ]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'User updated successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update user', 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to delete user', 500);
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, preferences,
        created_at, updated_at, last_login
      FROM users 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user profile', 500);
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, phone, location, bio, title, 
      department, skills = []
    } = req.body;
    
    const result = await query(`
      UPDATE users SET 
        name = $1, email = $2, phone = $3, location = $4,
        bio = $5, title = $6, department = $7, skills = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING 
        id, name, email, role, avatar, title, department, 
        skills, phone, location, bio, status, preferences,
        created_at, updated_at, last_login
    `, [name, email, phone, location, bio, title, department, JSON.stringify(skills), id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update profile', 500);
  }
};

const changePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ApiError('Current password and new password are required', 400);
    }

    if (newPassword.length < 8) {
      throw new ApiError('New password must be at least 8 characters', 400);
    }

    const result = await query('SELECT id, password FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }

    const user = result.rows[0];

    // Verify current password (support both bcrypt hashes and legacy plain text)
    let isValid = false;
    if (user.password && user.password.startsWith('$2')) {
      isValid = await bcrypt.compare(currentPassword, user.password);
    } else {
      isValid = currentPassword === user.password;
    }

    if (!isValid) {
      throw new ApiError('Current password is incorrect', 401);
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await query(
      'UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hashed, id]
    );

    console.log('🔒 Password changed for user:', id);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Failed to change password', 500);
  }
};

const updateUserPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const preferences = req.body;
    
    const result = await query(`
      UPDATE users SET 
        preferences = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING preferences
    `, [JSON.stringify(preferences), id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0].preferences,
      message: 'Preferences updated successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to update preferences', 500);
  }
};

const getUserSkills = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query('SELECT skills FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    res.json({
      success: true,
      data: result.rows[0].skills || []
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to fetch user skills', 500);
  }
};

const addUserSkill = async (req, res) => {
  try {
    const { id } = req.params;
    const { skillName } = req.body;
    
    const userResult = await query('SELECT skills FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    const currentSkills = userResult.rows[0].skills || [];
    
    if (!currentSkills.includes(skillName)) {
      const updatedSkills = [...currentSkills, skillName];
      
      await query(`
        UPDATE users SET 
          skills = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [JSON.stringify(updatedSkills), id]);
    }
    
    res.json({
      success: true,
      message: 'Skill added successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to add skill', 500);
  }
};

const removeUserSkill = async (req, res) => {
  try {
    const { id, skillId } = req.params;
    
    const skillName = skillId;
    
    const userResult = await query('SELECT skills FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      throw new ApiError('User not found', 404);
    }
    
    const currentSkills = userResult.rows[0].skills || [];
    const updatedSkills = currentSkills.filter(skill => skill !== skillName);
    
    await query(`
      UPDATE users SET 
        skills = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [JSON.stringify(updatedSkills), id]);
    
    res.json({
      success: true,
      message: 'Skill removed successfully'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Failed to remove skill', 500);
  }
};

// Search users by name or email
const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }
    
    console.log('Searching users with query:', q);
    
    const result = await query(`
      SELECT id, name, email, role, avatar, current_workload, created_at, updated_at
      FROM users 
      WHERE (LOWER(name) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1))
        AND role IS NOT NULL
      ORDER BY name ASC
      LIMIT 20
    `, [`%${q}%`]);
    const normalizedRows = normalizeUserRoles(result.rows);
    
    console.log(`Found ${normalizedRows.length} users matching "${q}"`);
    
    res.json({
      success: true,
      data: normalizedRows,
      message: `Found ${normalizedRows.length} users matching "${q}"`
    });
    
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  updateUserPreferences,
  getUserSkills,
  addUserSkill,
  removeUserSkill,
  searchUsers
};