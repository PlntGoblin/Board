import { describe, it, expect, vi, beforeAll } from 'vitest';
import request from 'supertest';

// --- Mock Supabase ---
const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockBoard = { id: 'board-1', owner_id: 'user-123', title: 'Test Board', is_public: true, board_data: { objects: [] } };

// Chainable query builder mock
function createChain(finalData = null, finalError = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: finalData, error: finalError }),
  };
  // Without .single(), return array
  chain.then = (resolve) => resolve({ data: finalData ? [finalData] : [], error: finalError });
  return chain;
}

const mockFrom = vi.fn();
const mockGetUser = vi.fn();
const mockListUsers = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: mockFrom,
    auth: {
      getUser: mockGetUser,
      admin: { listUsers: mockListUsers },
    },
  }),
}));

// --- Mock OpenAI + LangSmith ---
const mockCreate = vi.fn();
vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: mockCreate } };
  },
}));
vi.mock('langsmith/wrappers', () => ({
  wrapOpenAI: (client) => client,
}));

// --- Mock dotenv ---
vi.mock('dotenv/config', () => ({}));

let app;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  const mod = await import('../../server.js');
  app = mod.app;
});

// Helper: set up auth to succeed
function authSuccess() {
  mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null });
}

// Helper: set up auth to fail
function authFail() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid' } });
}

// --- Auth Middleware ---
describe('Authentication', () => {
  it('returns 401 when no token provided', async () => {
    const res = await request(app).get('/api/boards');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No token provided');
  });

  it('returns 401 for invalid token', async () => {
    authFail();
    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid token');
  });
});

// --- POST /api/boards (Create) ---
describe('POST /api/boards', () => {
  it('creates a board with title', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain({ ...mockBoard, title: 'My Board' }));

    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'My Board' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('My Board');
  });

  it('creates board with default title when none provided', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain({ ...mockBoard, title: 'Untitled Board' }));

    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', 'Bearer valid-token')
      .send({});

    expect(res.status).toBe(200);
  });
});

// --- GET /api/boards (List) ---
describe('GET /api/boards', () => {
  it('returns owned and collaborated boards', async () => {
    authSuccess();
    // First call: boards table (owned), second call: board_collaborators (collabs)
    let callCount = 0;
    mockFrom.mockImplementation((table) => {
      if (table === 'boards') {
        return createChain([mockBoard]);
      }
      // board_collaborators
      return createChain([]);
    });

    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// --- GET /api/boards/:id (Load) ---
describe('GET /api/boards/:id', () => {
  it('returns board for owner', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain(mockBoard));

    const res = await request(app)
      .get('/api/boards/board-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('board-1');
  });

  it('returns 404 for non-existent board', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain(null));

    const res = await request(app)
      .get('/api/boards/nonexistent')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});

// --- PUT /api/boards/:id (Save) ---
describe('PUT /api/boards/:id', () => {
  it('saves board data', async () => {
    authSuccess();
    const updated = { ...mockBoard, board_data: { objects: [{ id: 1 }] } };
    mockFrom.mockReturnValue(createChain(updated));

    const res = await request(app)
      .put('/api/boards/board-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ board_data: { objects: [{ id: 1 }] } });

    expect(res.status).toBe(200);
  });

  it('saves title update', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain({ ...mockBoard, title: 'New Title' }));

    const res = await request(app)
      .put('/api/boards/board-1')
      .set('Authorization', 'Bearer valid-token')
      .send({ title: 'New Title' });

    expect(res.status).toBe(200);
  });
});

// --- DELETE /api/boards/:id (Delete) ---
describe('DELETE /api/boards/:id', () => {
  it('deletes board when user is owner', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain({ owner_id: 'user-123' }));

    const res = await request(app)
      .delete('/api/boards/board-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 403 when non-owner tries to delete', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain({ owner_id: 'other-user' }));

    const res = await request(app)
      .delete('/api/boards/board-1')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(403);
  });
});

// --- DELETE /api/boards/:id/leave ---
describe('DELETE /api/boards/:id/leave', () => {
  it('allows collaborator to leave', async () => {
    authSuccess();
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const res = await request(app)
      .delete('/api/boards/board-1/leave')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// --- PATCH /api/boards/:id/visibility ---
describe('PATCH /api/boards/:id/visibility', () => {
  it('toggles visibility', async () => {
    authSuccess();
    mockFrom.mockReturnValue(createChain({ ...mockBoard, is_public: false }));

    const res = await request(app)
      .patch('/api/boards/board-1/visibility')
      .set('Authorization', 'Bearer valid-token')
      .send({ is_public: false });

    expect(res.status).toBe(200);
  });
});

// --- POST /api/messages (AI Proxy) ---
describe('POST /api/messages', () => {
  it('proxies to OpenAI when authenticated', async () => {
    authSuccess();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello!' } }],
    });

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', 'Bearer valid-token')
      .send({ model: 'gpt-4.1-nano', messages: [{ role: 'user', content: 'Hi' }] });

    expect(res.status).toBe(200);
    expect(res.body.choices).toBeDefined();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ model: 'gpt-4.1-nano', messages: [] });

    expect(res.status).toBe(401);
  });

  it('returns error when OpenAI fails', async () => {
    authSuccess();
    mockCreate.mockRejectedValue({ status: 500, message: 'OpenAI error' });

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', 'Bearer valid-token')
      .send({ model: 'gpt-4.1-nano', messages: [] });

    expect(res.status).toBe(500);
  });

  it('includes rate limit headers', async () => {
    authSuccess();
    mockCreate.mockResolvedValue({ choices: [{ message: { content: 'ok' } }] });

    const res = await request(app)
      .post('/api/messages')
      .set('Authorization', 'Bearer valid-token')
      .send({ model: 'gpt-4.1-nano', messages: [] });

    expect(res.headers).toHaveProperty('ratelimit-limit');
  });
});

// --- POST /api/generate-content ---
describe('POST /api/generate-content', () => {
  it('returns generated content', async () => {
    authSuccess();
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"items": ["Idea 1", "Idea 2"]}' } }],
    });

    const res = await request(app)
      .post('/api/generate-content')
      .set('Authorization', 'Bearer valid-token')
      .send({ topic: 'AI', type: 'ideas', count: 2 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });
});
