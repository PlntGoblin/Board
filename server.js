import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// --- CORS ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
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
    .insert({ owner_id: req.user.id, title: title || 'Untitled Board' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// List user's boards (owned + collaborated)
app.get('/api/boards', authenticate, async (req, res) => {
  const { data: owned, error: e1 } = await supabase
    .from('boards')
    .select('id, title, updated_at, is_public')
    .eq('owner_id', req.user.id)
    .order('updated_at', { ascending: false });

  const { data: collabs, error: e2 } = await supabase
    .from('board_collaborators')
    .select('boards(id, title, updated_at, is_public)')
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

  if (!isOwner && !data.is_public) {
    const { data: collab } = await supabase
      .from('board_collaborators')
      .select('role')
      .eq('board_id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (!collab) {
      return res.status(403).json({ error: 'Access denied' });
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

// Delete a board
app.delete('/api/boards/:id', authenticate, async (req, res) => {
  const { error } = await supabase
    .from('boards')
    .delete()
    .eq('id', req.params.id)
    .eq('owner_id', req.user.id);

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

  // Find user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single();

  if (!profile) return res.status(404).json({ error: 'User not found' });

  const { error } = await supabase
    .from('board_collaborators')
    .upsert({
      board_id: req.params.id,
      user_id: profile.id,
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

// AI Messages proxy (auth-protected)
app.post('/api/messages', authenticate, async (req, res) => {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: { message: 'Proxy server error' } });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
