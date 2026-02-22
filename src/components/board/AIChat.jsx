import { useRef, useEffect, useState } from 'react';
import { Send, Loader2, Minus } from 'lucide-react';

function formatResponse(text) {
  if (!text) return null;
  const lines = text.split('\n').filter(l => l.trim());
  return lines.map((line, i) => {
    const cleaned = line.replace(/\*\*(.+?)\*\*/g, '$1').trim();
    return (
      <div key={i} style={{ padding: '2px 0', fontSize: '13px', color: 'rgba(200, 210, 240, 0.9)', lineHeight: '1.55' }}>
        {cleaned}
      </div>
    );
  });
}

const SUGGESTION_POOL = [
  'Add a yellow sticky note that says "User Research"',
  'Create a blue rectangle at position 100, 200',
  'Add a frame called "Sprint Planning"',
  'Move all the pink sticky notes to the right side',
  'Change the sticky note color to green',
  'Arrange these sticky notes in a grid',
  'Create a 2x3 grid of sticky notes for pros and cons',
  'Space these elements evenly',
  'Create 3 yellow sticky notes with project ideas',
  'Arrange all sticky notes in a 2x2 grid',
  'Create a SWOT analysis with 4 frames',
  'Move all pink notes to the right',
  'Add a text label that says "Q1 Goals"',
  'Create a Kanban board with 3 columns',
  'Make all sticky notes the same size',
  'Add an arrow from the first shape to the second',
  'Create a brainstorm layout with a center topic',
  'Group all blue sticky notes together',
  'Resize the frame to 400 by 300',
  'Add a diamond shape for a decision point',
];

const THINKING_PHRASES = [
  'Mission Control is evaluating…',
  'Running diagnostics…',
  'Analyzing telemetry…',
  'Cross-checking systems…',
  'Stand by, Commander…',
  'Preparing response vector…',
  'Hang tight — this is rocket science.',
];

export default function AIChat({
  showAIChat, setShowAIChat,
  aiInput, setAiInput, aiResponse,
  isProcessing, processAICommand,
  isWizardHovered, setIsWizardHovered,
  conversationHistory,
}) {
  const scrollRef = useRef(null);
  const [thinkingPhrase, setThinkingPhrase] = useState(THINKING_PHRASES[0]);

  useEffect(() => {
    if (!isProcessing || aiResponse) return;
    setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    const interval = setInterval(() => {
      setThinkingPhrase(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    }, 3000);
    return () => clearInterval(interval);
  }, [isProcessing, aiResponse]);

  // Auto-scroll to bottom whenever history or streaming response changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, aiResponse, isProcessing]);

  // Rotating suggestions — one at a time, with per-item fade
  const [suggestions, setSuggestions] = useState(() => {
    const shuffled = [...SUGGESTION_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  });
  const [fadingIdx, setFadingIdx] = useState(-1);
  const lastSwappedRef = useRef(-1);

  useEffect(() => {
    if (!showAIChat) return;
    let timeout;
    const swap = () => {
      // Pick a random slot that isn't the one we just swapped
      let idx;
      do { idx = Math.floor(Math.random() * 4); } while (idx === lastSwappedRef.current);
      lastSwappedRef.current = idx;
      setFadingIdx(idx);
      setTimeout(() => {
        setSuggestions(prev => {
          const others = prev.filter((_, i) => i !== idx);
          const available = SUGGESTION_POOL.filter(s => !others.includes(s) && s !== prev[idx]);
          const pick = available[Math.floor(Math.random() * available.length)];
          const next = [...prev];
          next[idx] = pick;
          return next;
        });
        setFadingIdx(-1);
      }, 600);
      timeout = setTimeout(swap, 4000 + Math.random() * 4000);
    };
    timeout = setTimeout(swap, 4000 + Math.random() * 4000);
    return () => clearTimeout(timeout);
  }, [showAIChat]);

  // Visible messages: filter out system messages
  const visibleMessages = (conversationHistory || []).filter(m => m.role === 'user' || m.role === 'assistant');
  const hasHistory = visibleMessages.length > 0;

  return (
    <div style={{ position: 'fixed', top: '90px', right: '24px', zIndex: 100 }}>
      {/* Rocket button */}
      <button
        onClick={() => setShowAIChat(!showAIChat)}
        onMouseEnter={() => setIsWizardHovered(true)}
        onMouseLeave={() => setIsWizardHovered(false)}
        style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'none', border: 'none', cursor: 'pointer', fontSize: '32px',
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
          background: 'rgba(15, 22, 38, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.6)',
          padding: '20px', animation: 'slideUp 0.3s ease-out',
          display: 'flex', flexDirection: 'column',
          maxHeight: '70vh',
          overflow: 'hidden',
        }}>
          {/* Minimize button */}
          <button
            onClick={() => setShowAIChat(false)}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              width: '26px', height: '26px', borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: 'rgba(160, 175, 220, 0.5)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', zIndex: 10, padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'; e.currentTarget.style.color = '#c4d0ff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.color = 'rgba(160, 175, 220, 0.5)'; }}
          >
            <Minus size={14} />
          </button>

          {/* Starfield */}
          {[...Array(12)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: i % 3 === 0 ? '2px' : '1px', height: i % 3 === 0 ? '2px' : '1px',
              borderRadius: '50%', background: 'rgba(180, 200, 255, 0.5)',
              top: `${8 + (i * 37) % 90}%`, left: `${5 + (i * 53) % 90}%`,
              animation: `star-twinkle ${1.5 + (i % 4) * 0.5}s ease-in-out ${(i % 5) * 0.3}s infinite`,
              pointerEvents: 'none',
            }} />
          ))}
          <style>{`
            @keyframes star-twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.8; } }
            @keyframes rocket-float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
            @keyframes satellite-orbit {
              0% { transform: translateY(0px) rotate(0deg); }
              25% { transform: translateY(-8px) rotate(10deg); }
              50% { transform: translateY(0px) rotate(0deg); }
              75% { transform: translateY(8px) rotate(-10deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            @keyframes suggestion-float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-3px); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            textAlign: 'center', padding: '8px 0 16px', marginBottom: '12px',
            position: 'relative', overflow: 'hidden', flexShrink: 0,
          }}>
            <div style={{ position: 'absolute', inset: 0, opacity: 0.4, background: 'radial-gradient(ellipse at 50% 0%, rgba(102, 126, 234, 0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ fontSize: '28px', marginBottom: '4px', filter: 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.6))' }}>🧑‍🚀</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#c4d0ff', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Mission Control</div>
            <div style={{ fontSize: '11px', color: 'rgba(160, 175, 220, 0.55)', marginTop: '2px' }}>Tell me what to create or arrange</div>
          </div>

          {/* Scrollable message thread */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px',
              marginBottom: '12px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(102, 126, 234, 0.3) transparent',
            }}
          >
            {/* Suggestions — only when no history */}
            {!hasHistory && !isProcessing && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(102, 126, 234, 0.12)',
                borderRadius: '10px', padding: '10px',
              }}>
                <div style={{ fontSize: '10px', color: 'rgba(160, 175, 220, 0.5)', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Suggestions
                </div>
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setAiInput(suggestion); setTimeout(() => processAICommand(), 0); }}
                    style={{
                      width: '100%', padding: '9px 12px',
                      background: 'rgba(102, 126, 234, 0.06)',
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                      borderRadius: '8px', color: 'rgba(200, 210, 240, 0.85)', fontSize: '12px',
                      textAlign: 'left', cursor: 'pointer',
                      marginBottom: idx < 3 ? '6px' : '0',
                      transition: 'opacity 0.6s ease-in-out, background 0.2s, border-color 0.2s, color 0.2s',
                      opacity: fadingIdx === idx ? 0 : 1,
                      animation: `suggestion-float ${3 + idx * 0.5}s ease-in-out ${idx * 0.4}s infinite`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(102, 126, 234, 0.15)'; e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.3)'; e.currentTarget.style.color = '#c4d0ff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(102, 126, 234, 0.06)'; e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.1)'; e.currentTarget.style.color = 'rgba(200, 210, 240, 0.85)'; }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* Message bubbles */}
            {visibleMessages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-end',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 13px',
                  borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.35) 0%, rgba(118, 75, 162, 0.35) 100%)'
                    : 'rgba(255, 255, 255, 0.05)',
                  border: msg.role === 'user'
                    ? '1px solid rgba(102, 126, 234, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.07)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {msg.role === 'user' ? (
                    <div style={{ fontSize: '13px', color: '#c4d0ff', lineHeight: '1.5' }}>{msg.content}</div>
                  ) : (
                    <div>{formatResponse(msg.content)}</div>
                  )}
                </div>
              </div>
            ))}

            {/* Streaming / thinking state */}
            {isProcessing && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <div style={{
                  maxWidth: '82%', padding: '10px 13px',
                  borderRadius: '14px 14px 14px 4px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.07)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  {aiResponse ? (
                    <div>{formatResponse(aiResponse)}</div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', animation: 'satellite-orbit 2.5s ease-in-out infinite' }}>🛰️</span>
                      <span style={{ fontSize: '12px', color: 'rgba(160, 175, 220, 0.6)', transition: 'opacity 0.3s' }}>{thinkingPhrase}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input bar */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
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
                color: '#e0e6ff', outline: 'none', caretColor: '#667eea',
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
                display: 'flex', alignItems: 'center', transition: 'all 0.2s',
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
