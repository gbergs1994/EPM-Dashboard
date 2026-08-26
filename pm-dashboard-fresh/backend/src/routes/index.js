const express = require('express');
const projectRoutes = require('./projects');
const userRoutes = require('./users');
const authRoutes = require('./auth');
const careerRoutes = require('./career');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Project Manager API v1.0.0',
    version: '1.0.0',
    endpoints: {
      projects: '/api/projects',
      users: '/api/users',
      auth: '/api/auth',
      career: '/api/career',
      health: '/api/health'
    },
    documentation: 'https://github.com/your-repo/project-manager-api',
    timestamp: new Date().toISOString()
  });
});

router.use('/projects', projectRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);
router.use('/career', careerRoutes);

module.exports = router;