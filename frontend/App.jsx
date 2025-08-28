import React, { useEffect, useMemo, useRef, useState } from 'react'
import ChatBubble from './ChatBubble.jsx'
import { sendToSupport } from './api.js'

const QUICK_PROMPTS = [
  'I feel anxious',
  'Trouble sleeping',
  'Need motivation',
  'I feel lonely',
  'I made a mistake',
  'Overwhelmed by tasks',
  'Stressed about studies/work',
  'Having a tough day'
]

function supportsSpeech() {
  return 'speechSynthesis' in window
}

function getRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  return SR ? new SR() : null
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hi, I\'m CareMate. I\'m here to listen and support you with gentle, practical tips. What\'s on your mind today?\n\nTry this now\n• Take a slow breath in for 4, hold 4, out for 6 — twice.\n• If it helps, share one feeling in a single sentence.',
      ts: Date.now()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [tooltip, setTooltip] = useState('')
  const [risk, setRisk] = useState(false)
  const endRef = useRef(null)
  const recRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  useEffect(() => {
    if (voiceOn && supportsSpeech()) {
      const last = messages[messages.length - 1]
      if (last?.role === 'assistant') {
        const utter = new SpeechSynthesisUtterance(last.content.replace(/\n/g, ' '))
        utter.rate = 1
        utter.pitch = 1
        utter.lang = navigator.language || 'en-US'
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utter)
      }
    }
  }, [messages, voiceOn])

  function onMicToggle() {
    if (recRef.current) {
      recRef.current.stop()
      recRef.current = null
      return
    }
    const rec = getRecognizer()
    if (!rec) {
      setTooltip('Voice input not supported on this browser.')
      return
    }
    rec.continuous = false
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'
    let final = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; ++i) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) final += transcript + ' '
        else interim += transcript
      }
      setInput((final + interim).trim())
    }
    rec.onend = () => {
      recRef.current = null
    }
    rec.onerror = () => { recRef.current = null }
    rec.start()
    recRef.current = rec
  }

  async function onSend(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const userMsg = { role: 'user', content, ts: Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const resp = await sendToSupport(next)
      const { reply, risk_flag } = resp
      setMessages(m => [...m, { role: 'assistant', content: reply, ts: Date.now() }])
      setRisk(Boolean(risk_flag))
    } catch (e) {
      setMessages(m => [...m, {
        role: 'assistant',
        content: 'Sorry, the service is busy—please retry in a moment.',
        ts: Date.now()
      }])
    } finally {
      setLoading(false)
    }
  }

  function onExport() {
    const lines = messages.map(m => {
      const t = new Date(m.ts).toISOString()
      return `[${t}] ${m.role.toUpperCase()}:\n${m.content}\n`
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'CareMate-conversation.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function onClear() {
    window.speechSynthesis?.cancel()
    setMessages([{
      role: 'assistant',
      content: 'I\'m here when you\'re ready. What\'s on your mind?',
      ts: Date.now()
    }])
    setRisk(false)
  }

  const sidebar = (
    <aside className="sidebar" aria-label="Quick prompts">
      <div className="brand">
        <div className="logo-orb" aria-hidden="true"></div>
        <div>
          <div className="app-name">CareMate (v1)</div>
          <div className="tagline">Warm, gentle support</div>
        </div>
      </div>

      <div className="section-title">Try a prompt</div>
      <div className="chips">
        {QUICK_PROMPTS.map((p, i) => (
          <button key={i} className="chip" onClick={() => onSend(p)}>{p}</button>
        ))}
      </div>
      <div className="note">
        Not a doctor or therapist. If you are in crisis, please contact local emergency services.
      </div>
    </aside>
  )

  return (
    <div className="app" data-risk={risk ? 'true' : 'false'}>
      {sidebar}
      <main className="chat" aria-label="Chat with CareMate">
        {risk && (
          <div className="crisis" role="alert">
            <strong>If you are in immediate danger, contact local emergency services.</strong>
            <span> You can also reach your local suicide prevention line or talk to someone you trust.</span>
          </div>
        )}
        <div className="messages" id="messages" role="log" aria-live="polite">
          {messages.map((m, idx) => (
            <ChatBubble key={idx} role={m.role} content={m.content} ts={m.ts} />
          ))}
          {loading && <div className="typing">CareMate is typing…</div>}
          <div ref={endRef} />
        </div>

        <div className="composer" role="group" aria-label="Message composer">
          <textarea
            aria-label="Type your message"
            placeholder="Type something you want to share…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
            }}
            rows={1}
          />
          <div className="actions">
            <button className="icon" onClick={onMicToggle} aria-label="Toggle microphone">
              🎤
            </button>
            <button className="icon" onClick={() => setVoiceOn(v => !v)} aria-pressed={voiceOn} aria-label="Toggle voice">
              🔊 {voiceOn ? 'On' : 'Off'}
            </button>
            <button className="secondary" onClick={onClear} aria-label="Clear conversation">Clear</button>
            <button className="secondary" onClick={onExport} aria-label="Export to text">Export</button>
            <button className="primary" onClick={() => onSend()} aria-label="Send message">Send</button>
          </div>
          {!supportsSpeech() && tooltip && <div className="tooltip">{tooltip}</div>}
        </div>
      </main>
    </div>
  )
}
