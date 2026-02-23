import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { wrapOpenAI } from 'langsmith/wrappers';
import { z } from 'zod';

const app = express();
const openai = wrapOpenAI(new OpenAI());

// --- Security Headers ---
app.use(helmet());

// --- CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
  'http://localhost:5180',
  'http://localhost:5181',
  'http://localhost:5182',
  process.env.FRONTEND_URL,
].filter(Boolean).map(o => o.trim().replace(/\/+$/, ''));

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// --- Per-endpoint body size limits ---
const jsonLimit = (limit) => express.json({ limit });
const JSON_SMALL = jsonLimit('50kb');   // AI chat, search, share, visibility
const JSON_MEDIUM = jsonLimit('256kb'); // Board creation, content generation
const JSON_LARGE = jsonLimit('5mb');    // Board save (board_data can be large)

// --- Supabase Admin Client ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// --- Auth Middleware ---
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  req.user = user;
  next();
};

// --- Zod validation middleware ---
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }
  req.validated = result.data;
  next();
};

// --- Validation Schemas ---
const schemas = {
  createBoard: z.object({
    title: z.string().max(200).optional(),
  }),

  saveBoard: z.object({
    board_data: z.object({
      objects: z.array(z.object({
        id: z.number(),
        type: z.string(),
      }).passthrough()).optional(),
      nextId: z.number().optional(),
    }).passthrough().optional(),
    title: z.string().max(200).optional(),
  }),

  share: z.object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['editor', 'viewer']).optional(),
  }),

  visibility: z.object({
    is_public: z.boolean(),
  }),

  messages: z.object({
    model: z.string().max(100),
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant', 'tool']),
      content: z.any(),
    }).passthrough()).min(1),
  }).passthrough(),

  search: z.object({
    query: z.string().min(1, 'Search query is required').max(500),
  }),

  generateContent: z.object({
    topic: z.string().min(1).max(500),
    type: z.string().min(1).max(100),
    count: z.number().int().min(1).max(20).optional(),
  }),
};

// --- Board Routes ---

// Create board
app.post('/api/boards', JSON_MEDIUM, authenticate, validate(schemas.createBoard), async (req, res) => {
  const { title } = req.validated;
  const { data, error } = await supabase
    .from('boards')
    .insert({ owner_id: req.user.id, title: title || 'Untitled Board', is_public: true })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// List user's boards (owned + collaborated)
app.get('/api/boards', authenticate, async (req, res) => {
  const { data: owned, error: e1 } = await supabase
    .from('boards')
    .select('id, title, updated_at, is_public, board_data')
    .eq('owner_id', req.user.id)
    .order('updated_at', { ascending: false });

  const { data: collabs, error: e2 } = await supabase
    .from('board_collaborators')
    .select('boards(id, title, updated_at, is_public, board_data)')
    .eq('user_id', req.user.id);

  if (e1 || e2) return res.status(500).json({ error: 'Failed to fetch boards' });

  const collaborated = (collabs || [])
    .filter(c => c.boards)
    .map(c => ({ ...c.boards, role: 'collaborator' }));
  const all = [
    ...(owned || []).map(b => ({ ...b, role: 'owner' })),
    ...collaborated,
  ];
  res.json(all);
});

// Load a board
app.get('/api/boards/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Board not found' });

  // Check access: owner, collaborator, or public
  const isOwner = data.owner_id === req.user.id;

  if (!isOwner) {
    const { data: collab } = await supabase
      .from('board_collaborators')
      .select('role')
      .eq('board_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!collab) {
      if (!data.is_public) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Auto-add visitor as collaborator on public boards
      await supabase
        .from('board_collaborators')
        .upsert({
          board_id: req.params.id,
          user_id: req.user.id,
          role: 'editor',
        });
    }
  }

  res.json(data);
});

// Save board state
app.put('/api/boards/:id', JSON_LARGE, authenticate, validate(schemas.saveBoard), async (req, res) => {
  const { board_data, title } = req.validated;
  const update = {};
  if (board_data) update.board_data = board_data;
  if (title !== undefined) update.title = title;

  const { data, error } = await supabase
    .from('boards')
    .update(update)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Leave a shared board (collaborator removes themselves) — must be before :id route
app.delete('/api/boards/:id/leave', authenticate, async (req, res) => {
  const { error } = await supabase
    .from('board_collaborators')
    .delete()
    .eq('board_id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Delete a board (owner only — also removes all collaborator records)
app.delete('/api/boards/:id', authenticate, async (req, res) => {
  // Verify ownership first
  const { data: board } = await supabase
    .from('boards')
    .select('owner_id')
    .eq('id', req.params.id)
    .single();

  if (!board || board.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the board owner can delete this board' });
  }

  // Remove all collaborators first
  await supabase
    .from('board_collaborators')
    .delete()
    .eq('board_id', req.params.id);

  // Delete the board
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Share board
app.post('/api/boards/:id/share', JSON_SMALL, authenticate, validate(schemas.share), async (req, res) => {
  const { email, role } = req.validated;

  // Verify requester is owner
  const { data: board } = await supabase
    .from('boards')
    .select('owner_id')
    .eq('id', req.params.id)
    .single();

  if (!board || board.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only board owner can share' });
  }

  // Find user by email (try profiles table, then fall back to auth admin API)
  let userId = null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (profile) {
    userId = profile.id;
  } else {
    const { data: { users } = {}, error: listErr } = await supabase.auth.admin.listUsers();
    if (!listErr && users) {
      const match = users.find(u => u.email === email);
      if (match) userId = match.id;
    }
  }

  if (!userId) return res.status(404).json({ error: 'User not found. They must sign up first.' });

  const { error } = await supabase
    .from('board_collaborators')
    .upsert({
      board_id: req.params.id,
      user_id: userId,
      role: role || 'editor',
    });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Toggle board public/private
app.patch('/api/boards/:id/visibility', JSON_SMALL, authenticate, validate(schemas.visibility), async (req, res) => {
  const { is_public } = req.validated;

  const { data, error } = await supabase
    .from('boards')
    .update({ is_public })
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// AI Messages proxy (auth-protected, traced via LangSmith)
app.post('/api/messages', JSON_SMALL, authenticate, validate(schemas.messages), async (req, res) => {
  try {
    const completion = await openai.chat.completions.create(req.validated);
    res.json(completion);
  } catch (error) {
    console.error('Proxy error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: { message: error.message || 'Proxy server error' } });
  }
});

// Web search via Tavily REST API (auth-protected)
app.post('/api/search', JSON_SMALL, authenticate, validate(schemas.search), async (req, res) => {
  try {
    const { query } = req.validated;
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: 8,
        include_answer: false,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.message || 'Tavily search failed');
    res.json({ results: data.results || [] });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Structured content generation (auth-protected)
app.post('/api/generate-content', JSON_MEDIUM, authenticate, validate(schemas.generateContent), async (req, res) => {
  try {
    const { topic, type, count = 4 } = req.validated;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Generate exactly ${count} concise ${type} for the topic: "${topic}". Each item should be 5-15 words, punchy and specific. Return ONLY valid JSON: {"items": ["...", "..."]}`
      }],
      response_format: { type: 'json_object' },
    });
    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (error) {
    console.error('Generate content error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
