const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// helpers to create mock request/response objects
const mockReq = ({ body = {}, query = {}, user = { id: 1 } } = {}) => ({ body, query, user });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let dbModule;
let submitOrganizationalChangeAssessment;
let leadershipController;

describe('assessment submission controllers', () => {
  const testDbPath = path.join(__dirname, '../../database/test_assessment.db');
  process.env.DB_PATH = testDbPath;
  process.env.NODE_ENV = 'test';

  beforeAll(() => {
    try {
      if (dbModule && dbModule.db) dbModule.db.close();
    } catch (e) {}
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (e) {}

    execSync('node init-db.js', { 
      cwd: path.join(__dirname, '../../'),
      env: { ...process.env, DB_PATH: testDbPath, NODE_ENV: 'test', FORCE_RESET: 'true' }
    });

    dbModule = require('../../src/config/database');
    ({ submitOrganizationalChangeAssessment } = require('../../src/controllers/organizationalChangeController'));
    leadershipController = require('../../src/controllers/leadershipController');
  });

  afterAll(() => {
    try {
      if (dbModule && dbModule.db) dbModule.db.close();
    } catch (e) {}
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (e) {}
  });
  describe('organizationalChangeController.submitOrganizationalChangeAssessment', () => {
    it('returns 400 when responses are missing', async () => {
      const req = mockReq({ body: { project_id: 1 } });
      const res = mockRes();
      await submitOrganizationalChangeAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Responses are required'
        })
      );
    });

    it('creates an assessment and returns 201', async () => {
      const req = mockReq({
        body: {
          project_id: null,
          responses: { vision: 5, alignment: 6, understanding: 7, enactment: 4 }
        }
      });
      const res = mockRes();
      await submitOrganizationalChangeAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const responseArg = res.json.mock.calls[0][0];
      expect(responseArg.success).toBe(true);
      expect(responseArg.assessment).toHaveProperty('id');
    });

    it('handles wrapped query returning no rows gracefully', async () => {
      // stub the query method to simulate no row returned
      const originalQuery = dbModule.query;
      jest.spyOn(dbModule, 'query').mockImplementation(() => Promise.resolve({ rows: [] }));

      const req = mockReq({
        body: {
          project_id: null,
          responses: { vision: 1, alignment: 2, understanding: 3, enactment: 4 }
        }
      });
      const res = mockRes();
      await submitOrganizationalChangeAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const responseArg = res.json.mock.calls[0][0];
      expect(responseArg.assessment).toBeNull();

      // restore original implementation
      dbModule.query.mockRestore();
    });
  });

  describe('leadershipController.submitLeadershipAssessment', () => {
    it('returns 400 when type or responses are missing', async () => {
      const req = mockReq({ body: { project_id: 1 } });
      const res = mockRes();
      await leadershipController.submitLeadershipAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Assessment type and responses are required'
        })
      );
    });

    it('rejects when a required dimension is blank', async () => {
      const req = mockReq({
        body: {
          project_id: 1,
          assessment_type: 'leadership_diamond',
          responses: {
            vision: { q1: 1 },
            reality: { q1: 2 },
            ethics: null, // explicit null triggers validation
            courage: { q1: 4 }
          }
        }
      });
      const res = mockRes();
      await leadershipController.submitLeadershipAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Missing responses for ethics')
        })
      );
    });

    it('rejects a leadership assessment without a project', async () => {
      const req = mockReq({
        body: {
          project_id: null,
          assessment_type: 'leadership_diamond',
          responses: {
            vision: { q1: 5 },
            reality: { q1: 6 },
            ethics: { q1: 7 },
            courage: { q1: 8 }
          }
        }
      });
      const res = mockRes();
      await leadershipController.submitLeadershipAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'A valid project is required for leadership assessments'
        })
      );
    });

    it('creates a project-scoped leadership assessment successfully', async () => {
      const req = mockReq({
        body: {
          project_id: 1,
          assessment_type: 'leadership_diamond',
          responses: {
            vision: { q1: 5 },
            reality: { q1: 6 },
            ethics: { q1: 7 },
            courage: { q1: 8 }
          }
        }
      });
      const res = mockRes();
      await leadershipController.submitLeadershipAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const responseArg = res.json.mock.calls[0][0];
      expect(responseArg.success).toBe(true);
      expect(responseArg.assessment).toMatchObject({ project_id: 1 });
    });

    it('throws if the project-scoped insert produces no rows', async () => {
      // stub the shared query helper to return empty
      const originalQuery = dbModule.query;
      jest.spyOn(dbModule, 'query').mockImplementation(() => Promise.resolve({ rows: [] }));

      const req = mockReq({
        body: {
          project_id: 1,
          assessment_type: 'leadership_diamond',
          responses: {
            vision: { q1: 3 },
            reality: { q1: 3 },
            ethics: { q1: 3 },
            courage: { q1: 3 }
          }
        }
      });
      const res = mockRes();
      await leadershipController.submitLeadershipAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );

      dbModule.query.mockRestore();
    });

    // additional tests for GET endpoint
    describe('leadershipController.getLeadershipAssessments', () => {
      it('returns an array of assessments (including those created earlier)', async () => {
        const req = mockReq({ query: {} });
        const res = mockRes();
        await leadershipController.getLeadershipAssessments(req, res);
        expect(res.json).toHaveBeenCalled();
        const arg = res.json.mock.calls[0][0];
        expect(arg.success).toBe(true);
        expect(Array.isArray(arg.assessments)).toBe(true);
        expect(arg.assessments.length).toBeGreaterThanOrEqual(1);
      });

      it('can filter by assessment_type', async () => {
        const req = mockReq({ query: { assessment_type: 'leadership_diamond' } });
        const res = mockRes();
        await leadershipController.getLeadershipAssessments(req, res);
        const arg = res.json.mock.calls[0][0];
        expect(arg.assessments.every(a => a.assessment_type === 'leadership_diamond')).toBe(true);
      });
    });
  });
});
