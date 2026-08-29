const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const mockReq = ({ params = {}, body = {}, user = null } = {}) => ({ params, body, user });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let dbModule;
let feedbackController;

const testDbPath = path.join(__dirname, '../../database/test_feedback.db');
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
  feedbackController = require('../../src/controllers/feedbackController');
});

afterAll(() => {
  try {
    if (dbModule && dbModule.db) dbModule.db.close();
  } catch (e) {}
  try {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  } catch (e) {}
});

describe('feedbackController.submitFeedback', () => {
  it('updates existing feedback on duplicate submit for same user and project', async () => {
    const firstReq = mockReq({
      params: { id: '1' },
      user: { id: 1, name: 'John Doe', role: 'Project Manager' },
      body: {
        userName: 'John Doe',
        PM_Vision: 2,
        PM_Time: 2,
        PM_Quality: 2,
        PM_Cost: 2,
        Leadership_Vision: 2,
        Leadership_Reality: 2,
        Leadership_Ethics: 2,
        Leadership_Courage: 2,
        ChangeMgmt_Alignment: 2,
        ChangeMgmt_Understand: 2,
        ChangeMgmt_Enact: 2,
        CareerDev_KnowYourself: 2,
        CareerDev_KnowYourMarket: 2,
        CareerDev_TellYourStory: 2
      }
    });

    const firstRes = mockRes();
    await feedbackController.submitFeedback(firstReq, firstRes);

    expect(firstRes.status).toHaveBeenCalledWith(201);
    expect(firstRes.json).toHaveBeenCalled();

    const secondReq = mockReq({
      params: { id: '1' },
      user: { id: 1, name: 'John Doe', role: 'Project Manager' },
      body: {
        userName: 'John Doe',
        PM_Vision: 6,
        PM_Time: 6,
        PM_Quality: 6,
        PM_Cost: 6,
        Leadership_Vision: 6,
        Leadership_Reality: 6,
        Leadership_Ethics: 6,
        Leadership_Courage: 6,
        ChangeMgmt_Alignment: 6,
        ChangeMgmt_Understand: 6,
        ChangeMgmt_Enact: 6,
        CareerDev_KnowYourself: 6,
        CareerDev_KnowYourMarket: 6,
        CareerDev_TellYourStory: 6
      }
    });

    const secondRes = mockRes();
    await feedbackController.submitFeedback(secondReq, secondRes);

    expect(secondRes.status).toHaveBeenCalledWith(201);
    expect(secondRes.json).toHaveBeenCalled();

    const rows = await dbModule.query(
      'SELECT * FROM project_feedback WHERE project_id = $1 AND user_id = $2',
      [1, 1]
    );

    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0].pm_vision).toBe(6);
    expect(rows.rows[0].overall_average).toBe(6);
  });
});
