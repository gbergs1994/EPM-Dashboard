const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const { normalizeUserRole } = require('../../src/config/roles');

const mockReq = ({ user = { id: 1, role: 'Project Manager' }, body = {}, query = {}, params = {} } = {}) => ({
  user,
  body,
  query,
  params
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let dbModule;
let userController;
let teamController;
let TeamManagementController;

const testDbPath = path.join(__dirname, '../../database/test_multi_pm.db');
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

beforeAll(() => {
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}
  execSync('node init-db.js', { 
    cwd: path.join(__dirname, '../../'),
    env: { ...process.env, DB_PATH: testDbPath, NODE_ENV: 'test', FORCE_RESET: 'true' }
  });
  dbModule = require('../../src/config/database');
  userController = require('../../src/controllers/userController');
  teamController = require('../../src/controllers/teamController');
  TeamManagementController = require('../../src/controllers/teamManagementController');
});

afterAll(() => {
  try {
    if (dbModule && dbModule.db) dbModule.db.close();
  } catch (e) {}
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}
});

describe('Multiple Project Managers team member support', () => {
  let pm1Id;
  let pm2Id;
  let memberId;

  beforeAll(async () => {
    // Create PM1, PM2, and a shared Team Member
    const pm1 = await dbModule.query(`
      INSERT INTO users (name, email, role, avatar)
      VALUES ('PM One', 'pm1@test.local', 'Project Manager', 'P1')
      RETURNING id
    `);
    pm1Id = pm1.rows[0].id;

    const pm2 = await dbModule.query(`
      INSERT INTO users (name, email, role, avatar)
      VALUES ('PM Two', 'pm2@test.local', 'Project Manager', 'P2')
      RETURNING id
    `);
    pm2Id = pm2.rows[0].id;

    const member = await dbModule.query(`
      INSERT INTO users (name, email, role, avatar)
      VALUES ('Shared Member', 'shared.member@test.local', 'Team Member', 'SM')
      RETURNING id
    `);
    memberId = member.rows[0].id;
  });

  it('allows PM1 to assign the team member to PM1 team', async () => {
    const req = mockReq({ user: { id: pm1Id, role: 'Project Manager' }, body: { userId: memberId } });
    const res = mockRes();

    await teamController.addProjectManagerTeamMember(req, res);

    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
  });

  it('allows PM2 to still see the team member as available to add', async () => {
    const req = mockReq({ user: { id: pm2Id, role: 'Project Manager' } });
    const res = mockRes();

    await teamController.getAvailableTeamMembers(req, res);

    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
    const availableIds = data.availableUsers.map((u) => u.id);
    expect(availableIds).toContain(memberId);
  });

  it('allows PM2 to assign the same team member to PM2 team simultaneously', async () => {
    const req = mockReq({ user: { id: pm2Id, role: 'Project Manager' }, body: { userId: memberId } });
    const res = mockRes();

    await teamController.addProjectManagerTeamMember(req, res);

    expect(res.json).toHaveBeenCalled();
    const data = res.json.mock.calls[0][0];
    expect(data.success).toBe(true);
  });

  it('normalizes unsupported custom roles to Team Member', () => {
    expect(normalizeUserRole('Frontend Developer')).toBe('Team Member');
    expect(normalizeUserRole('Project Manager')).toBe('Project Manager');
    expect(normalizeUserRole('Executive Leader')).toBe('Executive Leader');
    expect(normalizeUserRole('Team Member')).toBe('Team Member');
  });

  it('shows the shared team member in getAllUsers for both project managers', async () => {
    const req1 = mockReq({ user: { id: pm1Id, role: 'Project Manager' } });
    const res1 = mockRes();
    await userController.getAllUsers(req1, res1);
    const data1 = res1.json.mock.calls[0][0];
    expect(data1.data.some((u) => u.id === memberId)).toBe(true);

    const req2 = mockReq({ user: { id: pm2Id, role: 'Project Manager' } });
    const res2 = mockRes();
    await userController.getAllUsers(req2, res2);
    const data2 = res2.json.mock.calls[0][0];
    expect(data2.data.some((u) => u.id === memberId)).toBe(true);
  });
});
