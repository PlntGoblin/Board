import { Send, Loader2, Check } from 'lucide-react';

function formatResponse(text) {
  if (!text) return null;

  // Split into lines and process
  const lines = text.split('\n').filter(l => l.trim());
  const elements = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Numbered list items like "1. **Strengths** - Located at..."
    const listMatch = line.match(/^\d+\.\s+\*?\*?(.+?)\*?\*?\s*[-–—]\s*(.+)$/);
    if (listMatch) {
      elements.push(
        <div key={i} style={{
          display: 'flex', alignItems: 'flex-start', gap: '8px',
          padding: '6px 0',
        }}>
          <Check size={14} style={{ color: '#667eea', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <span style={{ color: '#c4d0ff', fontWeight: '600', fontSize: '13px' }}>
              {listMatch[1].replace(/\*/g, '')}
            </span>
          </div>
        </div>
      );
      continue;
    }

    // Numbered list items without dash like "1. **Strengths**"
    const simpleListMatch = line.match(/^\d+\.\s+\*?\*?(.+?)\*?\*?\s*$/);
    if (simpleListMatch) {
      elements.push(
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 0',
        }}>
          <Check size={14} style={{ color: '#667eea', flexShrink: 0 }} />
          <span style={{ color: '#c4d0ff', fontWeight: '600', fontSize: '13px' }}>
            {simpleListMatch[1].replace(/\*/g, '')}
          </span>
        </div>
      );
      continue;
    }

    // Regular text — strip markdown bold
    const cleaned = line.replace(/\*\*(.+?)\*\*/g, '$1');
    elements.push(
      <div key={i} style={{
        padding: '3px 0',
        fontSize: '13px',
        color: 'rgba(200, 210, 240, 0.85)',
        lineHeight: '1.5',
      }}>
        {cleaned}
      </div>
    );
  }

  return elements;
}

export default function AIChat({
  showAIChat, setShowAIChat,
  aiInput, setAiInput, aiResponse,
  isProcessing, processAICommand,
  isWizardHovered, setIsWizardHovered,
}) {
  return (
    <div style={{ position: 'fixed', top: '90px', right: '24px', zIndex: 100 }}>
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        onMouseEnter={() => setIsWizardHovered(true)}
        onMouseLeave={() => setIsWizardHovered(false)}
        style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'none',
          border: 'none', cursor: 'pointer', fontSize: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.3s ease',
          transform: isWizardHovered ? 'scale(1.15) rotate(-8deg)' : 'scale(1)',
          filter: isWizardHovered ? 'drop-shadow(0 0 12px rgba(102, 126, 234, 0.6))' : 'none',
          position: 'relative',
        }}
      >
        🚀
        {isWizardHovered && (
          <>
            <div style={{ position: 'absolute', top: '-10px', left: '10px', fontSize: '16px', animation: 'float-sparkle-1 2s infinite ease-in-out' }}>✨</div>
            <div style={{ position: 'absolute', top: '5px', right: '-5px', fontSize: '12px', animation: 'float-sparkle-2 1.8s infinite ease-in-out' }}>✨</div>
            <div style={{ position: 'absolute', bottom: '10px', left: '-8px', fontSize: '14px', animation: 'float-sparkle-3 2.2s infinite ease-in-out' }}>✨</div>
          </>
        )}
      </button>

      {showAIChat && (
        <div style={{
          position: 'absolute', top: '68px', right: '0', width: '400px', maxWidth: '90vw',
          background: 'rgba(12, 14, 28, 0.92)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid rgba(102, 126, 234, 0.25)',
          borderRadius: '16px',
          boxShadow: '0 0 1px rgba(102, 126, 234, 0.4), 0 8px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          padding: '20px', animation: 'slideUp 0.3s ease-out',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Starfield background */}
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: i % 3 === 0 ? '2px' : '1px',
              height: i % 3 === 0 ? '2px' : '1px',
              borderRadius: '50%',
              background: 'rgba(180, 200, 255, 0.5)',
              top: `${8 + (i * 37) % 90}%`,
              left: `${5 + (i * 53) % 90}%`,
              animation: `star-twinkle ${1.5 + (i % 4) * 0.5}s ease-in-out ${(i % 5) * 0.3}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}
          <style>{`
            @keyframes star-twinkle {
              0%, 100% { opacity: 0.2; }
              50% { opacity: 0.8; }
            }
          `}</style>
          <div style={{
            textAlign: 'center', padding: '8px 0 16px',
            marginBottom: '16px',
            borderBottom: '1px solid rgba(102, 126, 234, 0.15)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.4,
              background: 'radial-gradient(ellipse at 50% 0%, rgba(102, 126, 234, 0.3) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{
              fontSize: '28px', marginBottom: '4px',
              filter: 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.6))',
              animation: 'rocket-float 3s ease-in-out infinite',
            }}>
              🚀
            </div>
            <div style={{
              fontSize: '14px', fontWeight: '700',
              color: '#c4d0ff',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}>
              Mission Control
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(160, 175, 220, 0.55)', marginTop: '2px' }}>
              Tell me what to create or arrange
            </div>
            <style>{`
              @keyframes rocket-float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-4px); }
              }
            `}</style>
          </div>

          {/* Suggestions — hide when there's a response or processing */}
          {!aiResponse && !isProcessing && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(102, 126, 234, 0.12)',
              borderRadius: '10px',
              padding: '10px', marginBottom: '16px',
            }}>
              <div style={{ fontSize: '10px', color: 'rgba(160, 175, 220, 0.5)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Suggestions
              </div>
              {[
                'Create 3 yellow sticky notes with ideas for our project',
                'Arrange all sticky notes in a 2x2 grid',
                'Create a SWOT analysis with 4 frames',
                'Move all pink notes to the right',
              ].map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => { setAiInput(suggestion); processAICommand(); }}
                  style={{
                    width: '100%', padding: '9px 12px',
                    background: 'rgba(102, 126, 234, 0.06)',
                    border: '1px solid rgba(102, 126, 234, 0.1)',
                    borderRadius: '8px', color: 'rgba(200, 210, 240, 0.85)', fontSize: '12px',
                    textAlign: 'left', cursor: 'pointer',
                    marginBottom: idx < 3 ? '6px' : '0', transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)';
                    e.currentTarget.style.color = '#c4d0ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.1)';
                    e.currentTarget.style.color = 'rgba(200, 210, 240, 0.85)';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Thinking indicator */}
          {isProcessing && (
            <div style={{
              marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', padding: '20px',
            }}>
              <span style={{
                fontSize: '24px',
                display: 'inline-block',
                animation: 'satellite-orbit 2.5s ease-in-out infinite',
              }}>
                🛰️
              </span>
              <span style={{ fontSize: '12px', color: 'rgba(160, 175, 220, 0.6)', letterSpacing: '0.5px' }}>
                Thinking...
              </span>
              <style>{`
                @keyframes satellite-orbit {
                  0% { transform: translateY(0px) rotate(0deg); }
                  25% { transform: translateY(-8px) rotate(10deg); }
                  50% { transform: translateY(0px) rotate(0deg); }
                  75% { transform: translateY(8px) rotate(-10deg); }
                  100% { transform: translateY(0px) rotate(0deg); }
                }
              `}</style>
            </div>
          )}

          {/* AI response — above the input */}
          {aiResponse && !isProcessing && (
            <div style={{
              marginBottom: '14px', padding: '14px',
              background: 'rgba(102, 126, 234, 0.06)',
              border: '1px solid rgba(102, 126, 234, 0.12)',
              borderRadius: '10px',
              maxHeight: '220px',
              overflowY: 'auto',
            }}>
              <div style={{
                fontSize: '10px', color: 'rgba(160, 175, 220, 0.5)', marginBottom: '8px',
                fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{ fontSize: '12px' }}>✅</span>
                Done
              </div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {formatResponse(aiResponse)}
              </div>
            </div>
          )}

          {/* Input bar — always at the bottom */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isProcessing && aiInput.trim()) processAICommand(); }}
              placeholder="Type a command..."
              disabled={isProcessing}
              style={{
                flex: 1, padding: '11px 14px', fontSize: '13px',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#e0e6ff',
                outline: 'none',
                caretColor: '#667eea',
              }}
            />
            <button
              onClick={processAICommand}
              disabled={isProcessing || !aiInput.trim()}
              style={{
                padding: '11px 14px',
                background: isProcessing || !aiInput.trim()
                  ? 'rgba(102, 126, 234, 0.15)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: isProcessing || !aiInput.trim() ? 'rgba(160, 175, 220, 0.4)' : 'white',
                border: 'none', borderRadius: '8px',
                cursor: isProcessing || !aiInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center',
                transition: 'all 0.2s',
              }}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
