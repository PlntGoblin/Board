import { Send, Loader2 } from 'lucide-react';

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
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none', cursor: 'pointer', fontSize: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
          transition: 'all 0.3s ease',
          transform: isWizardHovered ? 'scale(1.1)' : 'scale(1)',
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
          position: 'absolute', top: '80px', right: '0', width: '400px', maxWidth: '90vw',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px', boxShadow: '0 12px 48px rgba(102, 126, 234, 0.3)',
          padding: '20px', animation: 'slideUp 0.3s ease-out',
        }}>
          <div style={{ color: 'white', marginBottom: '16px' }}>
            <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚀</span>
              <span>AI Assistant</span>
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              Tell me what you'd like to create or arrange
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.15)', borderRadius: '12px',
            padding: '12px', marginBottom: '16px', backdropFilter: 'blur(10px)',
          }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '8px', fontWeight: '600' }}>
              Try these:
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
                  width: '100%', padding: '10px 12px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '8px', color: 'white', fontSize: '12px',
                  textAlign: 'left', cursor: 'pointer',
                  marginBottom: idx < 3 ? '8px' : '0', transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !isProcessing && aiInput.trim()) processAICommand(); }}
              placeholder="Or type your own request..."
              disabled={isProcessing}
              style={{
                flex: 1, padding: '12px 16px', fontSize: '14px',
                border: 'none', borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.95)', outline: 'none',
              }}
            />
            <button
              onClick={processAICommand}
              disabled={isProcessing || !aiInput.trim()}
              style={{
                padding: '12px 16px',
                background: isProcessing ? 'rgba(255, 255, 255, 0.5)' : 'white',
                color: '#667eea', border: 'none', borderRadius: '8px',
                cursor: isProcessing || !aiInput.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '14px', fontWeight: '600',
              }}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>

          {aiResponse && (
            <div style={{
              marginTop: '12px', padding: '12px',
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px', fontSize: '13px', color: '#667eea',
            }}>
              {aiResponse}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
