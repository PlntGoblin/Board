import { useState, useMemo } from 'react';
import { Eye, EyeOff, ArrowRight, Mail, Users, Maximize2, Share2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const FEATURES = [
  {
    icon: Maximize2,
    title: 'Infinite Canvas',
    desc: 'Unlimited space to think, plan, and create without boundaries.',
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    desc: 'See your team\'s cursors and edits as they happen, live.',
  },
  {
    icon: Share2,
    title: 'Share Instantly',
    desc: 'Invite collaborators or publish boards with a single click.',
  },
];

export default function AuthModal({ redirectTo }) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const hasVisitedBefore = !!localStorage.getItem('keepLoggedIn');

  const stars = useMemo(() => {
    return Array.from({ length: 120 }, (_, i) => ({
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
    return Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 50 + 5}%`,
      left: `${Math.random() * 50}%`,
      delay: `${i * 4 + Math.random() * 3}s`,
      angle: Math.random() * 15 + 25,
      length: Math.random() * 80 + 60,
      cycleDuration: `${9 + Math.random() * 5}s`,
    }));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      localStorage.setItem('keepLoggedIn', 'true');
      if (isSignUp) {
        await signUp(email, password, redirectTo);
        setConfirmationSent(true);
      } else {
        await signIn(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      background: '#080c14',
    }}>

      {/* ── LEFT PANEL: Hero / Branding ── */}
      <div className="auth-left" style={{
        flex: '0 0 55%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 64px',
        background: '#080c14',
      }}>
        {/* Ambient glow orbs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: '-15%', left: '-5%',
            width: '700px', height: '700px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 65%)',
            animation: 'drift1 7s infinite ease-in-out',
          }} />
          <div style={{
            position: 'absolute', bottom: '-20%', right: '-10%',
            width: '600px', height: '600px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
            animation: 'drift2 6s infinite ease-in-out',
          }} />
          <div style={{
            position: 'absolute', top: '40%', left: '30%',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 60%)',
          }} />

          {/* Stars */}
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
                : 'rgba(200,220,255,0.7)',
              boxShadow: star.size > 1.8 ? `0 0 ${star.size * 2}px rgba(180,200,255,0.4)` : 'none',
              opacity: star.opacity,
              animation: `twinkle ${star.duration} ${star.delay} infinite ease-in-out`,
            }} />
          ))}

          {/* Shooting stars */}
          {shootingStars.map((s) => (
            <div key={`shoot-${s.id}`} style={{
              position: 'absolute',
              top: s.top, left: s.left,
              width: `${s.length}px`, height: '1.5px',
              transform: `rotate(${s.angle}deg)`,
              animation: `shootingStar ${s.cycleDuration} ${s.delay} infinite ease-out`,
              opacity: 0,
            }}>
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(180,200,255,0.4) 60%, rgba(255,255,255,0.9))',
                borderRadius: '1px',
              }} />
            </div>
          ))}

          {/* Dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(200,220,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }} />

          {/* Right edge fade to form panel */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '120px', height: '100%',
            background: 'linear-gradient(to right, transparent, #0d1117)',
          }} />
        </div>

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '480px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
            <img
              src="/logo.png"
              alt="Dark Matters"
              style={{
                width: '52px', height: '52px',
                borderRadius: '14px',
                filter: 'drop-shadow(0 0 24px rgba(56,189,248,0.4))',
              }}
            />
            <span style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#e0e8f8',
              letterSpacing: '-0.3px',
            }}>
              Dark Matters
            </span>
          </div>

          {/* Hero text */}
          <h1 style={{
            margin: '0 0 20px',
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: '700',
            color: '#f0f4ff',
            letterSpacing: '-1.5px',
            lineHeight: '1.15',
          }}>
            Your ideas,<br />
            <span style={{
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              brought to life.
            </span>
          </h1>

          <p style={{
            margin: '0 0 52px',
            fontSize: '16px',
            color: '#64748b',
            lineHeight: '1.65',
            maxWidth: '380px',
          }}>
            A collaborative canvas where teams think, sketch, and build together — in real time.
          </p>

          {/* Feature highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  flex: '0 0 36px', height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(56,189,248,0.1)',
                  border: '1px solid rgba(56,189,248,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color="#38bdf8" />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#c8d4e8', marginBottom: '3px' }}>
                    {title}
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                    {desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: Auth Form ── */}
      <div className="auth-right" style={{
        flex: '0 0 45%',
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 48px',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Form heading */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h2 style={{
              margin: '0 0 6px',
              fontSize: '22px',
              fontWeight: '600',
              color: '#f0f4ff',
              letterSpacing: '-0.5px',
            }}>
              {isSignUp ? 'Create your account' : hasVisitedBefore ? 'Welcome back' : 'Welcome'}
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
              {isSignUp
                ? 'Start collaborating in seconds.'
                : hasVisitedBefore ? 'Sign in to continue to your boards.' : 'Sign in to get started.'}
            </p>
          </div>

          {/* Form card */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '28px',
          }}>
            {confirmationSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: 'rgba(56,189,248,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Mail size={22} color="#38bdf8" />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600', color: '#f0f4ff' }}>
                  Check your email
                </h3>
                <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                  We sent a confirmation link to<br />
                  <span style={{ color: '#38bdf8' }}>{email}</span>
                </p>
                <button
                  onClick={() => { setConfirmationSent(false); setIsSignUp(false); setError(''); }}
                  style={{
                    padding: '10px 20px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#f0f4ff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                >
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.09)',
                      borderRadius: '10px',
                      fontSize: '14px',
                      color: '#f0f4ff',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(56,189,248,0.5)';
                      e.target.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.08)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.09)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswordText ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? 'Create password (min 6 chars)' : 'Password'}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '11px 44px 11px 14px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        borderRadius: '10px',
                        fontSize: '14px',
                        color: '#f0f4ff',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'all 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(56,189,248,0.5)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(56,189,248,0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.09)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      style={{
                        position: 'absolute', right: '10px', top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        cursor: 'pointer', padding: '4px',
                        display: 'flex', alignItems: 'center',
                        color: '#475569',
                      }}
                    >
                      {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div style={{
                    padding: '10px 14px',
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: '10px',
                    color: '#fca5a5',
                    fontSize: '13px',
                    marginBottom: '14px',
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: loading
                      ? 'rgba(56,189,248,0.25)'
                      : 'linear-gradient(135deg, #38bdf8, #818cf8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    boxShadow: loading ? 'none' : '0 0 24px rgba(56,189,248,0.18)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) e.currentTarget.style.boxShadow = '0 0 32px rgba(56,189,248,0.32)';
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) e.currentTarget.style.boxShadow = '0 0 24px rgba(56,189,248,0.18)';
                  }}
                >
                  {loading ? 'Please wait...' : (
                    <>
                      {isSignUp ? 'Create account' : 'Sign in'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Toggle */}
          <p style={{
            textAlign: 'center',
            marginTop: '20px',
            fontSize: '14px',
            color: '#475569',
          }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
              style={{
                background: 'none', border: 'none',
                color: '#38bdf8', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500',
                padding: 0, transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#7dd3fc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#38bdf8'}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes drift1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(60px, 50px); }
        }
        @keyframes drift2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-50px, -70px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shootingStar {
          0% { opacity: 0; transform: translateX(0); }
          1% { opacity: 0.8; transform: translateX(0); }
          5% { opacity: 0.8; transform: translateX(130px); }
          7% { opacity: 0; transform: translateX(220px); }
          100% { opacity: 0; transform: translateX(220px); }
        }
        input::placeholder {
          color: #334155;
        }
        @media (max-width: 768px) {
          .auth-left {
            flex: 0 0 auto !important;
            padding: 36px 28px 28px !important;
          }
          .auth-right {
            flex: 1 !important;
            padding: 32px 24px !important;
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.05) !important;
          }
        }
      `}</style>
    </div>
  );
}
