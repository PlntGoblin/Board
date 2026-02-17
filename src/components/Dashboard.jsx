import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Home, Clock, Star, Grid3x3, List, ChevronDown, MoreVertical } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useBoard } from '../hooks/useBoard';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { listBoards, createBoard, deleteBoard } = useBoard();
  const navigate = useNavigate();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNav, setSelectedNav] = useState('home');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    loadBoards();
  }, []);

  // Close user menu when clicking outside
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
    console.log('Create board clicked');
    try {
      console.log('Creating board...');
      const board = await createBoard('Untitled Board');
      console.log('Board created:', board);
      navigate(`/board/${board.id}`);
    } catch (err) {
      console.error('Failed to create board:', err);
      alert(`Error creating board: ${err.message}`);
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

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'GO';
  };

  const getUserName = () => {
    return user?.email?.split('@')[0] || 'Goblin';
  };

  const filteredBoards = boards.filter(board =>
    board.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#ffffff',
    }}>
      {/* Left Sidebar */}
      <div style={{
        width: '280px',
        borderRight: '1px solid #e8e8ed',
        display: 'flex',
        flexDirection: 'column',
        background: '#ffffff',
      }}>
        {/* User Profile Section */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e8e8ed',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
            }}>
              {getUserInitials()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a1a1a',
                lineHeight: '20px',
              }}>
                {getUserName()}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6b6f76',
                lineHeight: '18px',
              }}>
                {getUserName()}
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{
          padding: '12px 16px',
        }}>
          <div style={{
            position: 'relative',
          }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#6b6f76',
              }}
            />
            <input
              type="text"
              placeholder="Search by title or topic"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                border: '1px solid #e8e8ed',
                borderRadius: '8px',
                fontSize: '14px',
                background: '#f5f5f7',
                outline: 'none',
                transition: 'all 0.2s',
              }}
              onFocus={(e) => {
                e.target.style.background = '#ffffff';
                e.target.style.borderColor = '#667eea';
              }}
              onBlur={(e) => {
                e.target.style.background = '#f5f5f7';
                e.target.style.borderColor = '#e8e8ed';
              }}
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <div style={{
          padding: '8px 12px',
          flex: 1,
        }}>
          <button
            onClick={() => setSelectedNav('home')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              background: selectedNav === 'home' ? '#f5f5f7' : 'transparent',
              color: '#1a1a1a',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '2px',
              textAlign: 'left',
            }}
          >
            <Home size={18} />
            Home
          </button>
          <button
            onClick={() => setSelectedNav('recent')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              background: selectedNav === 'recent' ? '#f5f5f7' : 'transparent',
              color: '#1a1a1a',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '2px',
              textAlign: 'left',
            }}
          >
            <Clock size={18} />
            Recent
          </button>
          <button
            onClick={() => setSelectedNav('starred')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              border: 'none',
              borderRadius: '8px',
              background: selectedNav === 'starred' ? '#f5f5f7' : 'transparent',
              color: '#1a1a1a',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '2px',
              textAlign: 'left',
            }}
          >
            <Star size={18} />
            Starred
          </button>

          {/* Spaces Section */}
          <div style={{
            marginTop: '24px',
            paddingTop: '16px',
            borderTop: '1px solid #e8e8ed',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px 8px',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b6f76',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                Spaces
              </span>
              <button style={{
                width: '20px',
                height: '20px',
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6b6f76',
              }}>
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
      }}>
        {/* Top Header */}
        <div style={{
          borderBottom: '1px solid #e8e8ed',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a1a',
            }}>
              miro
            </h1>
            <span style={{
              fontSize: '12px',
              color: '#6b6f76',
              padding: '2px 8px',
              background: '#f5f5f7',
              borderRadius: '4px',
              fontWeight: '500',
            }}>
              Free
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{ position: 'relative' }} data-user-menu>
              <div
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {getUserInitials()}
              </div>
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '44px',
                  right: '0',
                  background: 'white',
                  border: '1px solid #e8e8ed',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  minWidth: '200px',
                  zIndex: 1000,
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #e8e8ed',
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      marginBottom: '4px',
                    }}>
                      {getUserName()}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b6f76',
                    }}>
                      {user?.email}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await signOut();
                      } catch (err) {
                        console.error('Failed to sign out:', err);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      fontSize: '14px',
                      color: '#1a1a1a',
                      cursor: 'pointer',
                      borderRadius: '0 0 8px 8px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f7';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
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
        <div style={{
          flex: 1,
          padding: '32px 48px',
          background: '#fafafa',
          overflow: 'auto',
        }}>
          {/* Boards Section */}
          <div style={{
            marginBottom: '32px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#1a1a1a',
              }}>
                Boards in this team
              </h2>
              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                <button style={{
                  padding: '8px 14px',
                  background: 'white',
                  border: '1px solid #e8e8ed',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#1a1a1a',
                  fontWeight: '500',
                }}>
                  Explore templates
                </button>
                <button
                  onClick={handleNewBoard}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    background: '#4262ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                  }}
                >
                  <Plus size={16} />
                  Create new
                </button>
              </div>
            </div>

            {/* Filters and View Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}>
              <div style={{
                display: 'flex',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b6f76' }}>Filter by</span>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid #e8e8ed',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1a1a1a',
                  }}>
                    All boards
                    <ChevronDown size={14} />
                  </button>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid #e8e8ed',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1a1a1a',
                  }}>
                    Owned by anyone
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#6b6f76' }}>Sort by</span>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'white',
                    border: '1px solid #e8e8ed',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1a1a1a',
                  }}>
                    Last opened
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
              <div style={{
                display: 'flex',
                gap: '4px',
                background: 'white',
                border: '1px solid #e8e8ed',
                borderRadius: '8px',
                padding: '2px',
              }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: 'none',
                    borderRadius: '6px',
                    background: viewMode === 'grid' ? '#f5f5f7' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#1a1a1a',
                  }}
                >
                  <Grid3x3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{
                    width: '32px',
                    height: '32px',
                    border: 'none',
                    borderRadius: '6px',
                    background: viewMode === 'list' ? '#f5f5f7' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#1a1a1a',
                  }}
                >
                  <List size={16} />
                </button>
              </div>
            </div>

            {/* Boards Display */}
            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '60px',
                color: '#999',
                fontSize: '15px',
              }}>
                Loading your boards...
              </div>
            ) : filteredBoards.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e8e8ed',
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>
                  &#x1f3a8;
                </div>
                <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                  No boards yet
                </h3>
                <p style={{ margin: '0 0 24px 0', color: '#888', fontSize: '14px' }}>
                  Create your first AI-powered whiteboard
                </p>
                <button
                  onClick={handleNewBoard}
                  style={{
                    padding: '12px 24px',
                    background: '#4262ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Create Board
                </button>
              </div>
            ) : viewMode === 'list' ? (
              /* List View */
              <div style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e8e8ed',
                overflow: 'hidden',
              }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px 150px',
                  padding: '12px 24px',
                  borderBottom: '1px solid #e8e8ed',
                  background: '#fafafa',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b6f76' }}>
                    Name
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b6f76' }}>
                    Online users
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#6b6f76' }}>
                    Owner
                  </div>
                </div>
                {/* Table Rows */}
                {filteredBoards.map(board => (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 150px 150px',
                      padding: '16px 24px',
                      borderBottom: '1px solid #e8e8ed',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fafafa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                      }}>
                        🎨
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '500', color: '#1a1a1a' }}>
                          {board.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b6f76' }}>
                          Modified by {getUserName()}, {new Date(board.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                    }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {getUserInitials()}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: '14px', color: '#1a1a1a' }}>
                        {getUserName()}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(board.id);
                        }}
                        style={{
                          width: '28px',
                          height: '28px',
                          border: 'none',
                          background: 'transparent',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#6b6f76',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f5f5f7';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Grid View */
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
              }}>
                {filteredBoards.map(board => (
                  <div
                    key={board.id}
                    onClick={() => navigate(`/board/${board.id}`)}
                    style={{
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #e8e8ed',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{
                      height: '140px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                    }}>
                      🎨
                    </div>
                    <div style={{ padding: '16px' }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#1a1a1a',
                        marginBottom: '4px',
                      }}>
                        {board.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b6f76',
                      }}>
                        Modified {new Date(board.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
