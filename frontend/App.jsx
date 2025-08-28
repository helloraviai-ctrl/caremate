import React, { useEffect, useRef, useState } from 'react'
import ChatBubble from './ChatBubble.jsx'
import { sendToSupport } from './api.js'

const QUICK_PROMPTS = [
  'I feel anxious 😟','Trouble sleeping 😴','Need motivation 💪','I feel lonely 😔',
  'I made a mistake 🥺','Overwhelmed by tasks 🧭','Stressed about studies/work 📚','Having a tough day 🌧️'
]

function supportsSpeech(){ return typeof window !== 'undefined' && 'speechSynthesis' in window }
function getRecognizer(){
  if (typeof window === 'undefined') return null
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  return SR ? new SR() : null
}
function stripTrySection(text){
  const i = text.search(/\bTry this now\b/i)
  return i === -1 ? text : text.slice(0, i).trim()
}

export default function App(){
  // persisted prefs
  const persistedVoice = (()=>{ try{return JSON.parse(localStorage.getItem('voiceOn') ?? 'true')}catch{return true} })()
  const persistedChats = (()=>{ try{return JSON.parse(localStorage.getItem('persistChats') ?? 'true')}catch{return true} })()
  const savedMsgs = (()=>{ try{return persistedChats ? JSON.parse(localStorage.getItem('caremate_chat') || 'null') : null}catch{return null} })()

  const [voiceOn, setVoiceOn] = useState(persistedVoice)         // 🔊 auto ON
  const [persist, setPersist] = useState(persistedChats)         // 🧠 local memory
  const [sidebarOpen, setSidebarOpen] = useState(false)          // ☰ drawer on mobile
  const [messages, setMessages] = useState(savedMsgs ?? [{
    role: 'assistant',
    content: "Hey, I’m CareMate. I’m here with you. What’s on your mind today? 💛",
    ts: Date.now()
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [risk, setRisk] = useState(false)
  const [tooltip, setTooltip] = useState('')

  const endRef = useRef(null)
  const recRef = useRef(null)
  const sidebarRef = useRef(null)

  // persist prefs + chat
  useEffect(()=>{ localStorage.setItem('voiceOn', JSON.stringify(voiceOn)) },[voiceOn])
  useEffect(()=>{ localStorage.setItem('persistChats', JSON.stringify(persist)) },[persist])
  useEffect(()=>{ if(persist){ localStorage.setItem('caremate_chat', JSON.stringify(messages)) } },[messages, persist])

  // autoscroll
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth', block:'end'}) },[messages, loading])

  // auto-speak assistant messages
  useEffect(()=>{
    if(!voiceOn || !supportsSpeech()) return
    const last = messages[messages.length - 1]
    if (last?.role === 'assistant') {
      const utter = new SpeechSynthesisUtterance(last.content.replace(/\n/g, ' '))
      utter.rate = 1; utter.pitch = 1; utter.lang = navigator.language || 'en-US'
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    }
  },[messages, voiceOn])

  // close drawer with Esc
  useEffect(()=>{
    if(!sidebarOpen) return
    const onKey = (e)=>{ if(e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [sidebarOpen])

  function onMicToggle(){
    if (recRef.current) { recRef.current.stop(); recRef.current=null; return }
    const rec = getRecognizer()
    if (!rec){ setTooltip('Voice input not supported on this browser.'); return }
    rec.continuous = false
    rec.interimResults = true
    rec.lang = navigator.language || 'en-US'
    let final = ''
    rec.onresult = (e)=>{
      let interim = ''
      for(let i=e.resultIndex;i<e.results.length;i++){
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t + ' '
        else interim += t
      }
      setInput((final + interim).trim())
    }
    rec.onend = ()=>{ recRef.current = null }
    rec.onerror = ()=>{ recRef.current = null }
    rec.start()
    recRef.current = rec
  }

  async function onSend(text){
    const content = (text ?? input).trim()
    if(!content || loading) return

    const userMsg = { role: 'user', content, ts: Date.now() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    try{
      const resp = await sendToSupport(next)
      let { reply, risk_flag } = resp

      // Cool-down: avoid back-to-back Try cards
      const lastAssistant = [...next].reverse().find(m => m.role === 'assistant')
      if (/Try this now/i.test(reply) && lastAssistant && /Try this now/i.test(lastAssistant.content)) {
        reply = stripTrySection(reply)
      }

      setMessages(m => [...m, { role:'assistant', content: reply, ts: Date.now() }])
      setRisk(Boolean(risk_flag))
    }catch(e){
      setMessages(m => [...m, { role:'assistant', content:'Sorry, the service is busy—please retry in a moment.', ts: Date.now() }])
    }finally{
      setLoading(false)
    }
  }

  function onExport(){
    const lines = messages.map(m => `[${new Date(m.ts).toISOString()}] ${m.role.toUpperCase()}:\n${m.content}\n`)
    const blob = new Blob([lines.join('\n')], {type:'text/plain;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'CareMate-conversation.txt'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  function onClear(){
    window.speechSynthesis?.cancel()
    setMessages([{ role:'assistant', content:"Hey, I’m here whenever you’re ready. What’s on your mind? 💛", ts: Date.now() }])
    setRisk(false)
    localStorage.removeItem('caremate_chat')
  }

  return (
    <div className="app" data-risk={risk ? 'true' : 'false'}>
      {/* Sidebar — always in DOM; drawer on mobile via CSS */}
      <aside
        ref={sidebarRef}
        className="sidebar"
        data-open={sidebarOpen}
        id="sidebar"
        {...(sidebarOpen ? { role: 'dialog', 'aria-modal': 'true' } : {})}
      >
        <button className="close-side" onClick={()=>setSidebarOpen(false)} aria-label="Close menu">✕</button>
        <div className="brand">
          <div className="logo-orb" aria-hidden="true"></div>
          <div>
            <div className="app-name">CareMate (v1)</div>
            <div className="tagline">Warm, gentle support</div>
          </div>
        </div>
        <div className="section-title">Try a prompt</div>
        <div className="chips">
          {QUICK_PROMPTS.map((p,i)=>(
            <button key={i} className="chip" onClick={()=>{ onSend(p); setSidebarOpen(false) }}>
              {p}
            </button>
          ))}
        </div>
        <div className="note">
          Not a doctor or therapist. If you are in crisis, please contact local emergency services.
        </div>
      </aside>

      {/* Backdrop when drawer is open */}
      {sidebarOpen && <div className="backdrop" onClick={()=>setSidebarOpen(false)} />}

      <main className="chat" aria-label="Chat with CareMate">
        {/* Mobile hamburger (hidden by CSS on desktop) */}
        <button
          className="mobile-toggle"
          aria-label="Open menu"
          aria-controls="sidebar"
          aria-expanded={sidebarOpen}
          onClick={()=>setSidebarOpen(true)}
        >
          ☰
        </button>

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
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); onSend() } }}
            rows={1}
          />
          <div className="actions">
            <button className="icon" onClick={onMicToggle} aria-label="Toggle microphone">🎤</button>
            <button className="icon" onClick={()=>setVoiceOn(v=>!v)} aria-pressed={voiceOn} aria-label="Toggle voice">
              🔊 {voiceOn ? 'On' : 'Off'}
            </button>
            <button className="icon" onClick={()=>setPersist(p=>!p)} aria-pressed={persist} aria-label="Remember this chat on this device">
              🧠 {persist ? 'Remembering' : 'No memory'}
            </button>
            <button className="secondary" onClick={onClear} aria-label="Clear conversation">Clear</button>
            <button className="secondary" onClick={onExport} aria-label="Export to text">Export</button>
            <button className="primary" onClick={()=>onSend()} aria-label="Send message" disabled={loading}>
              {loading ? 'Sending…' : 'Send'}
            </button>
          </div>
          {!supportsSpeech() && tooltip && <div className="tooltip">{tooltip}</div>}
        </div>
      </main>
    </div>
  )
}

