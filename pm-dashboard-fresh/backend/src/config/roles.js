const USER_ROLES = Object.freeze([
  'Team Member',
  'Executive Leader',
  'Project Manager'
]);

const isValidUserRole = (role) => USER_ROLES.includes(role);

module.exports = { USER_ROLES, isValidUserRole };