import React from 'react'

// Split content into (clean text, try items)
function splitContentAndTry(text) {
  const lines = text.split('\n')
  const idx = lines.findIndex(l => /\bTry this now\b/i.test(l))
  if (idx === -1) return { clean: text.trim(), items: null }

  // Capture bullet lines only (stop at first non-bullet non-empty line)
  const items = []
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i].trim()
    if (/^[-•]\s+/.test(l)) items.push(l.replace(/^[-•]\s+/, ''))
    else if (l === '') continue
    else break
  }

  // Everything before the "Try this now" heading is the clean content
  const clean = lines.slice(0, idx).join('\n').trim()
  return { clean, items: items.length ? items : null }
}

export default function ChatBubble({ role, content, ts }) {
  const isAssistant = role === 'assistant'
  const { clean, items } = splitContentAndTry(content)

  return (
    <div className={isAssistant ? 'row left' : 'row right'} aria-live="polite">
      {isAssistant && (
        <div className="avatar" aria-hidden="true">
          <span className="orb" />
        </div>
      )}
      <div className={isAssistant ? 'bubble bot' : 'bubble user'}>
        {clean.split('\n').filter(Boolean).map((p, i) => (
          <p key={i}>{p}</p>
        ))}

        {items && (
          <div className="try-card" role="note" aria-label="Try this now">
            <div className="try-title">Try this now</div>
            <ul>
              {items.map((it, i) => <li key={i}>{it}</li>)}
            </ul>
          </div>
        )}

        <div className="ts" aria-hidden="true">{new Date(ts).toLocaleTimeString()}</div>
      </div>

      {!isAssistant && (
        <div className="avatar user-avatar" aria-hidden="true">
          <span className="user-dot">M</span>
        </div>
      )}
    </div>
  )
}
