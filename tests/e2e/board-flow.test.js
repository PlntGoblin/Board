import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

/**
 * E2E-style tests that exercise full request flows through the Express server.
 * Uses mocked Supabase to simulate database behavior without a live DB.
 */

const mockUser = { id: 'e2e-user-1', email: 'e2e@test.com' };

// In-memory board store for simulating persistence
let boardStore = {};
let collabStore = {};

const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table) => createTableMock(table),
    auth: {
      getUser: mockGetUser,
      admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }) },
    },
  }),
}));

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: '{"items":["a"]}' } }] }) } };
  },
}));

vi.mock('langsmith/wrappers', () => ({ wrapOpenAI: (c) => c }));
vi.mock('dotenv/config', () => ({}));

// Simulate table operations with in-memory store
function createTableMock(table) {
  if (table === 'boards') return boardTableMock();
  if (table === 'board_collaborators') return collabTableMock();
  if (table === 'profiles') return profileTableMock();
  return emptyChain();
}

function emptyChain() {
  const chain = {};
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'single'];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.then = (resolve) => resolve({ data: [], error: null });
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

function boardTableMock() {
  let insertData = null;
  let updateData = null;
  let eqFilters = [];
  let isDelete = false;

  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn((data) => { insertData = data; return chain; }),
    update: vi.fn((data) => { updateData = data; return chain; }),
    delete: vi.fn(() => { isDelete = true; return chain; }),
    eq: vi.fn((key, val) => { eqFilters.push({ key, val }); return chain; }),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(async () => {
      const idFilter = eqFilters.find(f => f.key === 'id');

      if (insertData) {
        const board = { id: `board-${Date.now()}`, ...insertData, board_data: null, is_public: true };
        boardStore[board.id] = board;
        return { data: board, error: null };
      }

      if (isDelete && idFilter) {
        delete boardStore[idFilter.val];
        return { data: null, error: null };
      }

      if (updateData && idFilter) {
        const board = boardStore[idFilter.val];
        if (board) Object.assign(board, updateData);
        return { data: board || null, error: board ? null : { message: 'Not found' } };
      }

      if (idFilter && boardStore[idFilter.val]) {
        return { data: boardStore[idFilter.val], error: null };
      }

      return { data: null, error: { message: 'Not found' } };
    }),
  };
  // For non-single queries (list)
  chain.then = (resolve) => {
    const ownerFilter = eqFilters.find(f => f.key === 'owner_id');
    if (ownerFilter) {
      const boards = Object.values(boardStore).filter(b => b.owner_id === ownerFilter.val);
      return resolve({ data: boards, error: null });
    }
    return resolve({ data: Object.values(boardStore), error: null });
  };
  return chain;
}

function collabTableMock() {
  const chain = {};
  const methods = ['select', 'insert', 'upsert', 'delete', 'eq', 'order', 'single'];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.then = (resolve) => resolve({ data: [], error: null });
  return chain;
}

function profileTableMock() {
  const chain = {};
  const methods = ['select', 'eq', 'single'];
  for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  boardStore = {};
  collabStore = {};
  const mod = await import('../../server.js');
  app = mod.app;
});

function auth() {
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
}

// --- E2E Flows ---

describe('Board lifecycle', () => {
  it('creates a board and returns it with an ID', async () => {
    auth();
    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer token')
      .send({ title: 'E2E Board' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('E2E Board');
  });

  it('full lifecycle: create → save → load → data matches', async () => {
    auth();

    // Create
    const createRes = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer token')
      .send({ title: 'Lifecycle Test' });
    expect(createRes.status).toBe(200);
    const boardId = createRes.body.id;

    // Save data
    const boardData = { objects: [{ id: 1, type: 'stickyNote', text: 'Hello' }], nextId: 2 };
    const saveRes = await request(app)
      .put(`/api/boards/${boardId}`)
      .set('Authorization', 'Bearer token')
      .send({ board_data: boardData });
    expect(saveRes.status).toBe(200);

    // Load and verify
    const loadRes = await request(app)
      .get(`/api/boards/${boardId}`)
      .set('Authorization', 'Bearer token');
    expect(loadRes.status).toBe(200);
    expect(loadRes.body.board_data.objects).toHaveLength(1);
    expect(loadRes.body.board_data.objects[0].text).toBe('Hello');
  });

  it('unauthenticated requests are rejected', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
  });

  it('invalid token is rejected', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'bad' } });
    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });
});

describe('AI endpoint flow', () => {
  it('generates content end-to-end', async () => {
    auth();
    const res = await request(app)
      .post('/api/generate-content')
      .set('Authorization', 'Bearer token')
      .send({ topic: 'Testing', type: 'ideas', count: 3 });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });
});
