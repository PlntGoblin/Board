import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { wrapOpenAI } from 'langsmith/wrappers';

const app = express();
const openai = wrapOpenAI(new OpenAI());

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
  process.env.FRONTEND_URL,
].filter(Boolean).map(o => o.trim().replace(/\/+$/, ''));

console.log('Allowed CORS origins:', allowedOrigins);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));

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

// --- Board Routes ---

// Create board
app.post('/api/boards', authenticate, async (req, res) => {
  const { title } = req.body;
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
app.put('/api/boards/:id', authenticate, async (req, res) => {
  const { board_data, title } = req.body;
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
app.post('/api/boards/:id/share', authenticate, async (req, res) => {
  const { email, role } = req.body;

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
app.patch('/api/boards/:id/visibility', authenticate, async (req, res) => {
  const { is_public } = req.body;

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
app.post('/api/messages', authenticate, async (req, res) => {
  try {
    const completion = await openai.chat.completions.create(req.body);
    res.json(completion);
  } catch (error) {
    console.error('Proxy error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: { message: error.message || 'Proxy server error' } });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
