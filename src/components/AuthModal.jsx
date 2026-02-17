import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AuthModal() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);
  const [showPasswordText, setShowPasswordText] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Save "Keep me logged in" preference
      localStorage.setItem('keepLoggedIn', keepLoggedIn.toString());

      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // Save "Keep me logged in" preference
      localStorage.setItem('keepLoggedIn', keepLoggedIn.toString());

      await signInWithGoogle();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleEmailFocus = () => {
    setShowPassword(true);
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#ffffff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        {/* Floating shapes */}
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08))',
          animation: 'float1 20s infinite ease-in-out',
        }} />
        <div style={{
          position: 'absolute',
          top: '60%',
          right: '10%',
          width: '80px',
          height: '80px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(118, 75, 162, 0.08), rgba(102, 126, 234, 0.08))',
          animation: 'float2 15s infinite ease-in-out',
          transform: 'rotate(45deg)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '15%',
          left: '15%',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(67, 83, 255, 0.06), rgba(102, 126, 234, 0.06))',
          animation: 'float3 18s infinite ease-in-out',
        }} />
        <div style={{
          position: 'absolute',
          top: '30%',
          right: '20%',
          width: '60px',
          height: '60px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.07), rgba(67, 83, 255, 0.07))',
          animation: 'float4 12s infinite ease-in-out',
        }} />
        <div style={{
          position: 'absolute',
          top: '70%',
          left: '40%',
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(118, 75, 162, 0.05), rgba(102, 126, 234, 0.05))',
          animation: 'float5 16s infinite ease-in-out',
        }} />
      </div>

      {/* Header */}
      <header style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: '700',
            color: 'white',
          }}>
            B
          </div>
          <span style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1a1a1a',
          }}>
            The Board
          </span>
        </div>

        <button
          onClick={() => setShowSignInModal(true)}
          style={{
            padding: '10px 24px',
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            color: '#1a1a1a',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white';
          }}
        >
          Sign in
        </button>
      </header>

      {/* Main Content - Sign Up */}
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: '80px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          padding: '0 20px',
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: '0 0 16px 0',
            textAlign: 'center',
          }}>
            Sign up for free
          </h1>

          <p style={{
            fontSize: '16px',
            color: '#666',
            margin: '0 0 40px 0',
            textAlign: 'center',
          }}>
            We recommend using your <strong>work email</strong> — it keeps work and life separate.
          </p>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            type="button"
            style={{
              width: '100%',
              padding: '14px',
              background: 'white',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '24px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.borderColor = '#667eea';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.borderColor = '#e0e0e0';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '24px',
            gap: '16px',
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
            <span style={{ fontSize: '13px', color: '#999', fontWeight: '500' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
          </div>

          {/* Email Sign Up Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '8px',
              }}>
                Work email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleEmailFocus}
                placeholder="Enter your work email"
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '15px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => {
                  handleEmailFocus();
                  e.target.style.borderColor = '#667eea';
                }}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            {/* Password field - appears when email is focused */}
            {showPassword && (
              <div style={{
                marginBottom: '16px',
                animation: 'slideDown 0.3s ease-out',
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  marginBottom: '8px',
                }}>
                  Create password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '14px 50px 14px 16px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '15px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                    }}
                  >
                    {showPasswordText ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p style={{
                  fontSize: '13px',
                  color: '#666',
                  margin: '8px 0 0 0',
                }}>
                  No password required. You'll receive a sign-in link.
                </p>
              </div>
            )}

            {/* Keep me logged in toggle */}
            {showPassword && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '16px',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333',
                }}>
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#4353ff',
                    }}
                  />
                  <span>Keep me logged in</span>
                </label>
              </div>
            )}

            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#fce4ec',
                borderRadius: '8px',
                color: '#c62828',
                fontSize: '14px',
                marginBottom: '16px',
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '16px 32px',
                  background: loading ? '#999' : '#4353ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#3142cc';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = '#4353ff';
                }}
              >
                {loading ? 'Please wait...' : 'Continue with email'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sign In Modal */}
      {showSignInModal && (
        <div
          onClick={() => setShowSignInModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '40px',
              width: '400px',
              maxWidth: '90vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <h2 style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              textAlign: 'center',
            }}>
              Sign in to The Board
            </h2>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
              style={{
                width: '100%',
                padding: '12px',
                background: 'white',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '24px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.borderColor = '#667eea';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.borderColor = '#e0e0e0';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.593.102-1.17.282-1.709V4.958H.957C.347 6.173 0 7.548 0 9c0 1.452.348 2.827.957 4.042l3.007-2.335z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              Sign in with Google
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '24px',
              gap: '12px',
            }}>
              <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
              <span style={{ fontSize: '12px', color: '#999', fontWeight: '500' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#e0e0e0' }} />
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              setMode('login');
              handleSubmit(e);
            }}>
              <div style={{ marginBottom: '16px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: '12px 46px 12px 14px',
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#667eea'}
                    onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666',
                    }}
                  >
                    {showPasswordText ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Keep me logged in toggle */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '24px',
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#333',
                }}>
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer',
                      accentColor: '#4353ff',
                    }}
                  />
                  <span>Keep me logged in</span>
                </label>
              </div>

              {error && (
                <div style={{
                  padding: '12px',
                  background: '#fce4ec',
                  borderRadius: '8px',
                  color: '#c62828',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: loading ? '#999' : '#4353ff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = '#3142cc';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = '#4353ff';
                }}
              >
                {loading ? 'Please wait...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 30px) scale(0.9);
          }
        }

        @keyframes float2 {
          0%, 100% {
            transform: translate(0, 0) rotate(45deg) scale(1);
          }
          50% {
            transform: translate(-40px, 40px) rotate(90deg) scale(1.2);
          }
        }

        @keyframes float3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          25% {
            transform: translate(50px, 20px) scale(0.8);
          }
          75% {
            transform: translate(-30px, -40px) scale(1.1);
          }
        }

        @keyframes float4 {
          0%, 100% {
            transform: translate(0, 0) rotate(0deg);
          }
          33% {
            transform: translate(20px, 30px) rotate(15deg);
          }
          66% {
            transform: translate(-25px, -20px) rotate(-15deg);
          }
        }

        @keyframes float5 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          40% {
            transform: translate(-35px, -30px) scale(1.15);
          }
          80% {
            transform: translate(40px, 25px) scale(0.85);
          }
        }
      `}</style>
    </div>
  );
}
