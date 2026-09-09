const USER_ROLES = Object.freeze([
  'Team Member',
  'Executive Leader',
  'Project Manager'
]);

const normalizeUserRole = (role) => {
  const cleanedRole = typeof role === 'string' ? role.trim() : '';
  return USER_ROLES.includes(cleanedRole) ? cleanedRole : 'Team Member';
};

const normalizeUserRoles = (users = []) =>
  users.map((user) => ({
    ...user,
    role: normalizeUserRole(user?.role)
  }));

const isValidUserRole = (role) => USER_ROLES.includes(role);

module.exports = { USER_ROLES, isValidUserRole, normalizeUserRole, normalizeUserRoles };