import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Home, Clock, Star, Grid3x3, List, Trash2, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBoard } from '../hooks/useBoard';

const STICKY_COLORS = {
  yellow: '#FFF59D', pink: '#F48FB1', blue: '#81D4FA',
  green: '#A5D6A7', purple: '#CE93D8', orange: '#FFAB91', white: '#FFFFFF',
};
const resolveColor = (c) => STICKY_COLORS[c] || c || '#ccc';

function BoardThumbnail({ boardData }) {
  const parsed = typeof boardData === 'string' ? (() => { try { return JSON.parse(boardData); } catch { return null; } })() : boardData;
  const objects = parsed?.objects;
  if (!objects || objects.length === 0) {
    return (
      <div style={{
        width: '100%', height: '100%',
        background: 'rgba(255,255,255,0.02)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#475569', fontSize: '13px', fontWeight: 500,
      }}>
        Empty board
      </div>
    );
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const obj of objects) {
    const x = obj.x ?? obj.x1 ?? 0;
    const y = obj.y ?? obj.y1 ?? 0;
    const w = obj.width || 0;
    const h = obj.height || 0;
    minX = Math.min(minX, x, obj.x2 ?? x);
    minY = Math.min(minY, y, obj.y2 ?? y);
    maxX = Math.max(maxX, x + w, obj.x2 ?? x);
    maxY = Math.max(maxY, y + h, obj.y2 ?? y);
    if (obj.points) {
      for (const p of obj.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
  }

  const pad = 40;
  minX -= pad; minY -= pad; maxX += pad; maxY += pad;
  const vw = maxX - minX || 1;
  const vh = maxY - minY || 1;

  return (
    <svg
      viewBox={`${minX} ${minY} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.03)' }}
    >
      {objects.map((obj) => {
        if (obj.type === 'stickyNote') {
          return (
            <g key={obj.id}>
              <rect x={obj.x} y={obj.y} width={obj.width || 200} height={obj.height || 160}
                fill={resolveColor(obj.color)} rx={4} stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
              <text x={obj.x + 12} y={obj.y + 28} fontSize={14} fill="#333"
                clipPath={`inset(0 0 0 0)`}>
                {(obj.text || '').slice(0, 30)}
              </text>
            </g>
          );
        }
        if (obj.type === 'shape') {
          return obj.shapeType === 'circle' ? (
            <ellipse key={obj.id}
              cx={obj.x + (obj.width || 100) / 2} cy={obj.y + (obj.height || 100) / 2}
              rx={(obj.width || 100) / 2} ry={(obj.height || 100) / 2}
              fill={resolveColor(obj.color)} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
          ) : (
            <rect key={obj.id} x={obj.x} y={obj.y}
              width={obj.width || 100} height={obj.height || 100}
              fill={resolveColor(obj.color)} rx={4} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
          );
        }
        if (obj.type === 'frame') {
          return (
            <rect key={obj.id} x={obj.x} y={obj.y}
              width={obj.width || 300} height={obj.height || 200}
              fill="none" stroke="#475569" strokeWidth={2} strokeDasharray="8 4" rx={8} />
          );
        }
        if (obj.type === 'text') {
          return (
            <text key={obj.id} x={obj.x} y={obj.y + 16} fontSize={16} fill="#94a3b8">
              {(obj.text || '').slice(0, 40)}
            </text>
          );
        }
        if (obj.type === 'path' && obj.points?.length >= 2) {
          const d = obj.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return <path key={obj.id} d={d} stroke={obj.color || '#94a3b8'}
            strokeWidth={obj.strokeWidth || 2} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
        }
        if (obj.type === 'line') {
          return <line key={obj.id} x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2}
            stroke={obj.color || '#94a3b8'} strokeWidth={obj.strokeWidth || 2} strokeLinecap="round" />;
        }
        if (obj.type === 'arrow') {
          return (
            <g key={obj.id}>
              <line x1={obj.x1} y1={obj.y1} x2={obj.x2} y2={obj.y2}
                stroke={obj.color || '#94a3b8'} strokeWidth={obj.strokeWidth || 2} strokeLinecap="round" />
              <circle cx={obj.x2} cy={obj.y2} r={4} fill={obj.color || '#94a3b8'} />
            </g>
          );
        }
        return null;
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { listBoards, createBoard, deleteBoard, saveBoard } = useBoard();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNav, setSelectedNav] = useState('home');
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [starredIds, setStarredIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('starredBoards') || '[]'); }
    catch { return []; }
  });

  const toggleStar = (id) => {
    setStarredIds(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id];
      localStorage.setItem('starredBoards', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showUserMenu && !e.target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUserMenu]);

  const loadBoards = async () => {
    try {
      const data = await listBoards();
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewBoard = async () => {
    try {
      const board = await createBoard('Untitled Board');
      navigate(`/board/${board.id}`);
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBoard(id);
      setBoards(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  };

  const TEMPLATES = [
    {
      name: 'Kanban Board',
      icon: '📋',
      desc: 'Organize tasks into columns',
      color: '#38bdf8',
      objects: [
        { id: 1, type: 'frame', x: 50, y: 50, width: 280, height: 500, title: 'To Do' },
        { id: 2, type: 'frame', x: 370, y: 50, width: 280, height: 500, title: 'In Progress' },
        { id: 3, type: 'frame', x: 690, y: 50, width: 280, height: 500, title: 'Done' },
        { id: 4, type: 'stickyNote', x: 80, y: 120, width: 220, height: 100, color: 'yellow', text: 'Task 1' },
        { id: 5, type: 'stickyNote', x: 80, y: 240, width: 220, height: 100, color: 'yellow', text: 'Task 2' },
        { id: 6, type: 'stickyNote', x: 80, y: 360, width: 220, height: 100, color: 'yellow', text: 'Task 3' },
        { id: 7, type: 'stickyNote', x: 400, y: 120, width: 220, height: 100, color: 'blue', text: 'In progress task' },
        { id: 8, type: 'stickyNote', x: 720, y: 120, width: 220, height: 100, color: 'green', text: 'Completed task' },
      ],
    },
    {
      name: 'SWOT Analysis',
      icon: '🎯',
      desc: 'Strengths, Weaknesses, Opportunities, Threats',
      color: '#818cf8',
      objects: [
        { id: 1, type: 'frame', x: 50, y: 50, width: 350, height: 300, title: 'Strengths' },
        { id: 2, type: 'frame', x: 430, y: 50, width: 350, height: 300, title: 'Weaknesses' },
        { id: 3, type: 'frame', x: 50, y: 380, width: 350, height: 300, title: 'Opportunities' },
        { id: 4, type: 'frame', x: 430, y: 380, width: 350, height: 300, title: 'Threats' },
        { id: 5, type: 'stickyNote', x: 80, y: 120, width: 180, height: 100, color: 'green', text: '' },
        { id: 6, type: 'stickyNote', x: 460, y: 120, width: 180, height: 100, color: 'pink', text: '' },
        { id: 7, type: 'stickyNote', x: 80, y: 450, width: 180, height: 100, color: 'blue', text: '' },
        { id: 8, type: 'stickyNote', x: 460, y: 450, width: 180, height: 100, color: 'orange', text: '' },
      ],
    },
    {
      name: 'Brainstorm',
      icon: '💡',
      desc: 'Free-form idea generation',
      color: '#facc15',
      objects: [
        { id: 1, type: 'stickyNote', x: 350, y: 200, width: 200, height: 160, color: 'purple', text: 'Main Idea', fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
        { id: 2, type: 'stickyNote', x: 80, y: 60, width: 180, height: 120, color: 'yellow', text: '' },
        { id: 3, type: 'stickyNote', x: 620, y: 60, width: 180, height: 120, color: 'yellow', text: '' },
        { id: 4, type: 'stickyNote', x: 80, y: 340, width: 180, height: 120, color: 'blue', text: '' },
        { id: 5, type: 'stickyNote', x: 620, y: 340, width: 180, height: 120, color: 'blue', text: '' },
        { id: 6, type: 'stickyNote', x: 80, y: 200, width: 180, height: 120, color: 'pink', text: '' },
        { id: 7, type: 'stickyNote', x: 620, y: 200, width: 180, height: 120, color: 'pink', text: '' },
        { id: 8, type: 'stickyNote', x: 350, y: 60, width: 180, height: 120, color: 'green', text: '' },
        { id: 9, type: 'stickyNote', x: 350, y: 380, width: 180, height: 120, color: 'orange', text: '' },
      ],
    },
    {
      name: 'Retrospective',
      icon: '🔄',
      desc: 'What went well, what to improve, action items',
      color: '#34d399',
      objects: [
        { id: 1, type: 'frame', x: 50, y: 50, width: 300, height: 450, title: 'What Went Well 😊' },
        { id: 2, type: 'frame', x: 380, y: 50, width: 300, height: 450, title: 'What To Improve 🔧' },
        { id: 3, type: 'frame', x: 710, y: 50, width: 300, height: 450, title: 'Action Items ✅' },
        { id: 4, type: 'stickyNote', x: 80, y: 120, width: 240, height: 100, color: 'green', text: '' },
        { id: 5, type: 'stickyNote', x: 80, y: 240, width: 240, height: 100, color: 'green', text: '' },
        { id: 6, type: 'stickyNote', x: 410, y: 120, width: 240, height: 100, color: 'pink', text: '' },
        { id: 7, type: 'stickyNote', x: 410, y: 240, width: 240, height: 100, color: 'pink', text: '' },
        { id: 8, type: 'stickyNote', x: 740, y: 120, width: 240, height: 100, color: 'blue', text: '' },
        { id: 9, type: 'stickyNote', x: 740, y: 240, width: 240, height: 100, color: 'blue', text: '' },
      ],
    },
  ];

  const handleNewFromTemplate = async (template) => {
    try {
      const board = await createBoard(template.name);
      const boardData = { objects: template.objects, nextId: template.objects.length + 1 };
      await saveBoard(board.id, boardData, template.name);
      navigate(`/board/${board.id}`);
    } catch (err) {
      console.error('Failed to create from template:', err);
    }
  };

  const getUserInitials = () => {
    if (user?.email) return user.email.substring(0, 2).toUpperCase();
    return 'GO';
  };

  const getUserName = () => user?.email?.split('@')[0] || 'User';

  const filteredBoards = boards.filter(board => {
    const matchesSearch = board.title?.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedNav === 'starred') return matchesSearch && starredIds.includes(board.id);
    return matchesSearch;
  });

  const stars = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      delay: `${Math.random() * 5}s`,
      duration: `${Math.random() * 3 + 2}s`,
    }));
  }, []);

  const shootingStars = useMemo(() => {
    return Array.from({ length: 2 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 40 + 5}%`,
      left: `${Math.random() * 60}%`,
      delay: `${i * 5 + Math.random() * 3}s`,
      angle: Math.random() * 15 + 30,
      length: Math.random() * 60 + 50,
      cycleDuration: `${10 + Math.random() * 4}s`,
    }));
  }, []);

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'recent', icon: Clock, label: 'Recent' },
    { id: 'starred', icon: Star, label: 'Starred' },
  ];

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#0a0a0f',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          top: '-10%', left: '30%',
          width: '600px', height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
          animation: 'drift1 6s infinite ease-in-out',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%', right: '10%',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
          animation: 'drift2 5s infinite ease-in-out',
        }} />

        {/* Twinkling stars */}
        {stars.map((star) => (
          <div key={star.id} style={{
            position: 'absolute',
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            borderRadius: '50%',
            background: star.size > 2
              ? 'radial-gradient(circle, rgba(220,230,255,0.9), rgba(180,200,255,0.4))'
              : 'rgba(200,220,255,0.8)',
            boxShadow: star.size > 1.8
              ? `0 0 ${star.size * 2}px rgba(180,200,255,0.4)`
              : 'none',
            opacity: star.opacity,
            animation: `twinkle ${star.duration} ${star.delay} infinite ease-in-out`,
          }} />
        ))}

        {/* Shooting stars */}
        {shootingStars.map((s) => (
          <div key={`shoot-${s.id}`} style={{
            position: 'absolute',
            top: s.top,
            left: s.left,
            width: `${s.length}px`,
            height: '1.5px',
            transform: `rotate(${s.angle}deg)`,
            animation: `shootingStar ${s.cycleDuration} ${s.delay} infinite ease-out`,
            opacity: 0,
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.8), rgba(180,200,255,0.4) 40%, transparent)',
              borderRadius: '1px',
            }} />
          </div>
        ))}

        {/* Dot overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(200,220,255,0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
      </div>

      {/* Left Sidebar */}
      <div style={{
        width: '260px',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(20px)',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo + User */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/logo.png"
              alt="Dark Matters"
              style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.25))',
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#f0f0f5' }}>
                Dark Matters
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {getUserName()}
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '16px 16px 8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)', color: '#475569',
            }} />
            <input
              type="text"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#f0f0f5',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgba(56,189,248,0.4)';
                e.target.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.08)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255,255,255,0.08)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '8px 12px', flex: 1 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = selectedNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedNav(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  border: 'none',
                  borderRadius: '10px',
                  background: active ? 'rgba(56,189,248,0.1)' : 'transparent',
                  color: active ? '#38bdf8' : '#94a3b8',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginBottom: '2px',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Sign out */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={async () => {
              try { await signOut(); } catch (err) { console.error('Sign out failed:', err); }
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              borderRadius: '10px',
              background: 'transparent',
              color: '#64748b',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              e.currentTarget.style.color = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Top Bar */}
        <div style={{
          padding: '16px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)',
          backdropFilter: 'blur(10px)',
        }}>
          <h2 style={{
            margin: 0, fontSize: '18px', fontWeight: '600', color: '#f0f0f5',
          }}>
            Space Port
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View toggle */}
            <div style={{
              display: 'flex',
              gap: '2px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '3px',
            }}>
              {[
                { mode: 'grid', icon: Grid3x3 },
                { mode: 'list', icon: List },
              ].map(v => {
                const VIcon = v.icon;
                const active = viewMode === v.mode;
                return (
                  <button
                    key={v.mode}
                    onClick={() => setViewMode(v.mode)}
                    style={{
                      width: '32px', height: '32px',
                      border: 'none', borderRadius: '8px',
                      background: active ? 'rgba(56,189,248,0.15)' : 'transparent',
                      color: active ? '#38bdf8' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    <VIcon size={16} />
                  </button>
                );
              })}
            </div>

            {/* New board */}
            <button
              onClick={handleNewBoard}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(56,189,248,0.2)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(56,189,248,0.35)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(56,189,248,0.2)'}
            >
              <Plus size={16} />
              New board
            </button>

            {/* Avatar */}
            <div style={{ position: 'relative' }} data-user-menu>
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '36px', height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '12px', fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(56,189,248,0.15)',
                }}
              >
                {getUserInitials()}
              </div>
              {showUserMenu && (
                <div style={{
                  position: 'absolute', top: '44px', right: '0',
                  background: 'rgba(15,15,25,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(20px)',
                  minWidth: '200px',
                  zIndex: 1000,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#f0f0f5', marginBottom: '2px' }}>
                      {getUserName()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {user?.email}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try { await signOut(); } catch (err) { console.error(err); }
                    }}
                    style={{
                      width: '100%', padding: '12px 16px',
                      border: 'none', background: 'transparent',
                      textAlign: 'left', fontSize: '13px', color: '#94a3b8',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = '#f0f0f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#94a3b8';
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
          {/* Templates Section */}
          {!loading && selectedNav === 'home' && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{
                margin: '0 0 16px 0',
                fontSize: '13px',
                fontWeight: '600',
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Start from a template
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
              }}>
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => handleNewFromTemplate(tpl)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px',
                      padding: '20px 18px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.25s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = `${tpl.color}40`;
                      e.currentTarget.style.boxShadow = `0 4px 20px ${tpl.color}15`;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      width: '40px', height: '40px',
                      borderRadius: '10px',
                      background: `${tpl.color}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px',
                    }}>
                      {tpl.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                        {tpl.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.4' }}>
                        {tpl.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Your boards header */}
          {!loading && filteredBoards.length > 0 && (
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '13px',
              fontWeight: '600',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {selectedNav === 'starred' ? 'Starred boards' : 'Your boards'}
            </h3>
          )}

          {loading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '80px', color: '#64748b', fontSize: '14px',
            }}>
              <div style={{
                width: '20px', height: '20px',
                border: '2px solid rgba(56,189,248,0.2)',
                borderTopColor: '#38bdf8',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginRight: '12px',
              }} />
              Loading boards...
            </div>
          ) : filteredBoards.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
            }}>
              <div style={{
                width: '56px', height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(56,189,248,0.15), rgba(129,140,248,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: '24px',
              }}>
                B
              </div>
              <h3 style={{ margin: '0 0 8px 0', color: '#f0f0f5', fontSize: '18px', fontWeight: '600' }}>
                No boards yet
              </h3>
              <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '14px' }}>
                Create your first board to get started
              </p>
              <button
                onClick={handleNewBoard}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 0 20px rgba(56,189,248,0.2)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 30px rgba(56,189,248,0.35)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(56,189,248,0.2)'}
              >
                Create Board
              </button>
            </div>
          ) : viewMode === 'list' ? (
            /* List View */
            <div style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}>
              {/* Table Header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 140px 70px',
                padding: '12px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Name
                </div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Modified
                </div>
                <div />
              </div>
              {filteredBoards.map(board => {
                const isStarred = starredIds.includes(board.id);
                return (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 140px 70px',
                      padding: '14px 24px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, rgba(56,189,248,0.2), rgba(129,140,248,0.2))',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', color: '#38bdf8', fontWeight: '600',
                      }}>
                        B
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '500', color: '#e2e8f0' }}>
                        {board.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#64748b' }}>
                      {new Date(board.updated_at).toLocaleDateString()}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }}
                        style={{
                          width: '28px', height: '28px',
                          border: 'none', background: 'transparent',
                          borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          color: isStarred ? '#facc15' : '#475569',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          if (!isStarred) {
                            e.currentTarget.style.background = 'rgba(250,204,21,0.1)';
                            e.currentTarget.style.color = '#facc15';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isStarred) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#475569';
                          }
                        }}
                      >
                        <Star size={14} fill={isStarred ? '#facc15' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm('Delete this board?')) handleDelete(board.id);
                        }}
                        style={{
                          width: '28px', height: '28px',
                          border: 'none', background: 'transparent',
                          borderRadius: '8px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: '#475569',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                          e.currentTarget.style.color = '#fca5a5';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#475569';
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Grid View */
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '16px',
            }}>
              {filteredBoards.map(board => {
                const isStarred = starredIds.includes(board.id);
                return (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.06)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(56,189,248,0.25)';
                      e.currentTarget.style.boxShadow = '0 4px 24px rgba(56,189,248,0.08)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      height: '140px',
                      overflow: 'hidden',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <BoardThumbnail boardData={board.board_data} />
                    </div>
                    <div style={{
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'start', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{
                          fontSize: '14px', fontWeight: '600', color: '#e2e8f0',
                          marginBottom: '4px',
                        }}>
                          {board.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          Modified {new Date(board.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStar(board.id); }}
                          style={{
                            width: '28px', height: '28px',
                            border: 'none', background: 'transparent',
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: isStarred ? '#facc15' : '#475569',
                            flexShrink: 0, transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            if (!isStarred) {
                              e.currentTarget.style.background = 'rgba(250,204,21,0.1)';
                              e.currentTarget.style.color = '#facc15';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isStarred) {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#475569';
                            }
                          }}
                        >
                          <Star size={14} fill={isStarred ? '#facc15' : 'none'} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Delete this board?')) handleDelete(board.id);
                          }}
                          style={{
                            width: '28px', height: '28px',
                            border: 'none', background: 'transparent',
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#475569',
                            flexShrink: 0, transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                            e.currentTarget.style.color = '#fca5a5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = '#475569';
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(80px, 60px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-60px, -80px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shootingStar {
          0% { opacity: 0; transform: translateX(0); }
          1% { opacity: 0.7; transform: translateX(0); }
          4% { opacity: 0.7; transform: translateX(120px); }
          6% { opacity: 0; transform: translateX(200px); }
          100% { opacity: 0; transform: translateX(200px); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: #475569;
        }
      `}</style>
    </div>
  );
}
