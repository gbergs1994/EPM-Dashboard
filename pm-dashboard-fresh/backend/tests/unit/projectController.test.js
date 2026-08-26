const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// simple mocks for req/res like other tests
const mockReq = ({ user = { id: 1, role: 'Project Manager' }, query = {} } = {}) => ({ user, query });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

let dbModule;
let projectController;

// keep connection clean between runs
beforeAll(() => {
  const devPath = path.join(__dirname, '../../database/dev.db');
  try {
    if (fs.existsSync(devPath)) fs.unlinkSync(devPath);
  } catch (e) {
    // ignore busy/file-in-use errors; init-db will warn if necessary
  }
  execSync('node init-db.js', { cwd: path.join(__dirname, '../../') });
  dbModule = require('../../src/config/database');
  projectController = require('../../src/controllers/projectController');
});

// ensure sqlite connection is closed after tests to avoid locking issues
afterAll(() => {
  try {
    if (dbModule && dbModule.db) dbModule.db.close();
  } catch (e) {}
});

describe('projectController.getAllProjects', () => {
  it('returns seeded projects successfully', async () => {
    const req = mockReq();
    const res = mockRes();

    await projectController.getAllProjects(req, res);

    expect(res.json).toHaveBeenCalled();
    const arg = res.json.mock.calls[0][0];
    expect(arg.success).toBe(true);
    expect(Array.isArray(arg.data)).toBe(true);
    expect(arg.data.length).toBeGreaterThan(0);
    expect(arg.total).toBe(arg.data.length);
  });

  it('gracefully handles database errors by throwing ApiError', async () => {
    const req = mockReq();
    const res = mockRes();

    // isolateModules ensures the controller is re-required after we stub the db
    // isolateModules synchronously resets the require cache, but it does not
    // automatically await any promise returned by the callback.  Wrap in a
    // Promise so we can wait for the inner async call to complete and observe
    // its rejection.
    await expect(
      new Promise((resolve, reject) => {
        jest.isolateModules(() => {
          const db = require('../../src/config/database');
          jest.spyOn(db, 'query').mockRejectedValue(new Error('boom'));
          const pc = require('../../src/controllers/projectController');
          pc.getAllProjects(req, res).then(resolve).catch(reject);
        });
      })
    ).rejects.toThrow('Failed to fetch projects');

    // restore the spy so other tests are unaffected
    const db = require('../../src/config/database');
    if (db.query && db.query.mockRestore) db.query.mockRestore();
  });
});
