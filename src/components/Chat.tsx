import { useState, useRef, useEffect } from 'react'
import { Sparkles, FileText, Lightbulb, CalendarDays, ArrowUp, Bot, Plus, Video, AlertCircle, X } from 'lucide-react'
import { GoogleGenAI } from '@google/genai'
import ReactMarkdown from 'react-markdown'

// Import live Firestore handlers and type safety rules
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp, collection, addDoc } from 'firebase/firestore'
import { User } from 'firebase/auth'

type View = 'chat' | 'dashboard' | 'flashcards' | 'planner' | 'library' | 'upgrade' | 'settings' | 'profile'

interface ChatProps {
  go: (v: View) => void
  user: User | null
  chatId: string | null
  setChatId: (id: string) => void
}

interface Message {
  sender: 'user' | 'ai'
  text: string
}

const envVars = (import.meta as any).env || {}
const apiKey = envVars.VITE_GEMINI_API_KEY
const ai = apiKey ? new GoogleGenAI({ apiKey: apiKey }) : null

// ---------- StudyLap design tokens ----------
const T = {
  ink: '#0B0F0D',
  inkSoft: '#151B18',
  paper: '#FCFBF9',
  accent: '#16C784',
  accentDeep: '#0E9F6A',
  accentSoft: '#E6FBF1',
  text: '#121815',
  muted: '#6B7280',
  border: '#E9E7E2',
}

// ---------- Markdown rendering, tuned to the StudyLap type system ----------
const mdComponents: any = {
  p: ({ node, ...props }: any) => <p style={{ margin: '0 0 14px 0', lineHeight: 1.7 }} {...props} />,
  strong: ({ node, ...props }: any) => <strong style={{ fontWeight: 700, color: T.ink }} {...props} />,
  em: ({ node, ...props }: any) => <em style={{ fontStyle: 'italic' }} {...props} />,
  ul: ({ node, ...props }: any) => <ul style={{ margin: '0 0 14px 0', paddingLeft: '22px', lineHeight: 1.7 }} {...props} />,
  ol: ({ node, ...props }: any) => <ol style={{ margin: '0 0 14px 0', paddingLeft: '22px', lineHeight: 1.7 }} {...props} />,
  li: ({ node, ...props }: any) => <li style={{ marginBottom: '6px' }} {...props} />,
  h1: ({ node, ...props }: any) => (
    <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.3rem', fontWeight: 700, margin: '20px 0 10px 0', color: T.ink }} {...props} />
  ),
  h2: ({ node, ...props }: any) => (
    <h2
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: '1.08rem',
        fontWeight: 700,
        margin: '18px 0 8px 0',
        color: T.ink,
        borderLeft: `3px solid ${T.accent}`,
        paddingLeft: '10px',
      }}
      {...props}
    />
  ),
  h3: ({ node, ...props }: any) => <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.98rem', fontWeight: 600, margin: '16px 0 6px 0' }} {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote style={{ borderLeft: `3px solid ${T.border}`, margin: '0 0 14px 0', padding: '2px 0 2px 14px', color: T.muted }} {...props} />
  ),
  a: ({ node, ...props }: any) => <a style={{ color: T.accentDeep, textDecoration: 'underline', fontWeight: 500 }} target="_blank" rel="noreferrer" {...props} />,
  hr: ({ node, ...props }: any) => <hr style={{ border: 'none', borderTop: `1px solid ${T.border}`, margin: '16px 0' }} {...props} />,
  table: ({ node, ...props }: any) => (
    <div style={{ overflowX: 'auto', marginBottom: '14px', border: `1px solid ${T.border}`, borderRadius: '10px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9em' }} {...props} />
    </div>
  ),
  th: ({ node, ...props }: any) => <th style={{ borderBottom: `1px solid ${T.border}`, padding: '8px 10px', background: T.accentSoft, textAlign: 'left', fontWeight: 700, color: T.ink }} {...props} />,
  td: ({ node, ...props }: any) => <td style={{ borderBottom: `1px solid ${T.border}`, padding: '8px 10px' }} {...props} />,
  code: ({ node, inline, className, ...props }: any) =>
    inline ? (
      <code
        style={{ background: T.accentSoft, color: T.accentDeep, padding: '2px 6px', borderRadius: '5px', fontSize: '0.85em', fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
        {...props}
      />
    ) : (
      <code style={{ display: 'block', fontSize: '0.85em', fontFamily: "'JetBrains Mono', ui-monospace, monospace", lineHeight: 1.55, color: '#EAFBF3' }} {...props} />
    ),
  pre: ({ node, ...props }: any) => (
    <pre style={{ margin: '0 0 14px 0', background: T.ink, color: '#EAFBF3', padding: '14px 16px', borderRadius: '12px', overflowX: 'auto', border: `1px solid ${T.inkSoft}` }} {...props} />
  ),
}

export default function Chat({ go, user, chatId, setChatId }: ChatProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [placeholderText, setPlaceholderText] = useState('Message your AI tutor...')

  const menuRef = useRef<HTMLDivElement>(null)
  const skipFetchRef = useRef<string | null>(null)
  const streamEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    streamEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  useEffect(() => {
    if (!user) return

    if (!chatId) {
      setMessages([])
      setFetchingHistory(false)
      return
    }

    if (skipFetchRef.current === chatId) {
      skipFetchRef.current = null
      setFetchingHistory(false)
      return
    }

    const loadChatHistory = async () => {
      setFetchingHistory(true)
      try {
        const chatDocRef = doc(db, 'chats', chatId)
        const docSnap = await getDoc(chatDocRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          if (data.messages) {
            setMessages(data.messages)
          }
        } else {
          setMessages([])
        }
      } catch (err: any) {
        console.error("Failed to fetch cloud chat layout records:", err)
        setSaveError('Could not load this chat — ' + (err?.message || 'unknown error'))
      } finally {
        setFetchingHistory(false)
      }
    }

    loadChatHistory()
  }, [chatId, user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const tools = [
    { icon: Sparkles, name: 'Generate flashcards', text: 'Turn any topic into quick recall cards', reply: '✨ Flashcard Mode Activated! Type the topic or paste the text you want to turn into high-yield flashcards below 👇', placeholder: 'e.g., Photosynthesis light reactions, Organic chemistry...' },
    { icon: FileText, name: 'Create smart notes', text: 'Structured notes with key formulae', reply: '📚 Smart Notes Engine Ready! What subject, chapter, or topic do you need structured academic notes for?', placeholder: 'e.g., Newton laws of motion, Indian Constitution summary...' },
    { icon: Lightbulb, name: 'Quiz me on a topic', text: 'Build a targeted practice quiz', reply: '🧠 Quiz Mode Engaged! Tell me what topic or concept you want to test your understanding on.', placeholder: 'e.g., Cell division mitosis, Quadratic equations quiz...' },
    { icon: CalendarDays, name: 'Plan my study', text: 'Build a realistic daily schedule', reply: '📅 Study Planner Active! Tell me what exam you are preparing for and how many days left.', placeholder: 'e.g., Preparing for midterms in 10 days...' },
    { icon: Video, name: 'Find study videos', text: 'Request curated educational video topics', reply: '🎬 Video Finder Mode! What complex concept or visualization are you struggling with?', placeholder: 'e.g., Quantum physics double slit experiment...' }
  ]

  const handleToolSelect = async (toolName: string) => {
    setMenuOpen(false)
    const selected = tools.find(t => t.name === toolName)
    if (!selected || !user) return

    setActiveTool(toolName)
    setPlaceholderText(selected.placeholder)

    const newAiMessage: Message = { sender: 'ai', text: selected.reply }
    const localStreamState = [...messages, newAiMessage]
    setMessages(localStreamState)

    if (chatId) {
      try {
        const chatDocRef = doc(db, 'chats', chatId)
        skipFetchRef.current = chatId
        await updateDoc(chatDocRef, {
          messages: arrayUnion(newAiMessage)
        })
        setSaveError(null)
      } catch (err: any) {
        console.error("Error archiving systemic assistant alert:", err)
        setSaveError('Could not save this chat — ' + (err?.message || 'unknown error'))
      }
    }
  }

  const handleSend = async () => {
    const userInput = input.trim()
    if (!userInput || loading || !user) return

    if (!ai) {
      alert("Missing Gemini API Key! Check your .env file.")
      return
    }

    const currentToolMode = activeTool
    let structuralText = userInput;

    if (currentToolMode) {
      if (currentToolMode === 'Generate flashcards') {
        structuralText = `Act as an expert study tutor. The user wants to create flashcards on: "${userInput}". Generate a comprehensive markdown review list. CRITICAL: At the very end of your response, add a raw JSON block wrapped between unique tags like [DATA_START] and [DATA_END] formatted exactly like this:
[DATA_START]
{
  "subject": "General",
  "cards": [
    {"question": "Question 1", "answer": "Answer 1", "tip": "Memory tip 1"}
  ]
}
[DATA_END]`;
      } else if (currentToolMode === 'Create smart notes') {
        structuralText = `Act as an elite academic tutor. The user wants structured smart notes on: "${userInput}". Provide clean markdown notes. CRITICAL: At the very end of your response, append a clean raw JSON string bounded by [DATA_START] and [DATA_END] matching this format structure:
[DATA_START]
{
  "title": "${userInput}",
  "type": "Notes",
  "content": "A clean summarized variant of your structured markdown notes goes here."
}
[DATA_END]`;
      } else if (currentToolMode === 'Quiz me on a topic') {
        structuralText = `Act as a strict competitive examiner. The user wants a quiz on: "${userInput}". Provide a targeted practice quiz. CRITICAL: At the very end of your response, append a valid raw JSON bounded by [DATA_START] and [DATA_END] matching this format structure:
[DATA_START]
{
  "title": "${userInput} Quiz",
  "type": "Quizzes",
  "content": "Practice test documentation contents."
}
[DATA_END]`;
      } else if (currentToolMode === 'Plan my study') {
        structuralText = `Act as a professional academic counselor. The user needs a study plan for: "${userInput}". Provide a markdown breakdown. CRITICAL: At the very end of your response, append a raw JSON block bounded by [DATA_START] and [DATA_END] matching this format:
[DATA_START]
{
  "weekRange": "Upcoming Week",
  "totalHours": 10,
  "completedTasks": 0,
  "totalTasks": 2,
  "schedule": [
    {"time": "09:00", "subject": "Study Session", "topic": "${userInput}", "taskType": "Revision", "duration": "60 min", "variant": "black"}
  ]
}
[DATA_END]`;
      }
    }

    const newUserMessage: Message = { sender: 'user', text: userInput }
    const localStreamState = [...messages, newUserMessage]

    setMessages(localStreamState)
    setInput('')
    setLoading(true)
    setSaveError(null)
    setActiveTool(null)
    setPlaceholderText('Message your AI tutor...')

    let activeId = chatId

    if (!activeId) {
      activeId = 'chat_' + Date.now()
      try {
        const chatDocRef = doc(db, 'chats', activeId)
        await setDoc(chatDocRef, {
          userId: user.uid,
          email: user.email || null,
          title: userInput.substring(0, 30) + (userInput.length > 30 ? '...' : ''),
          messages: [newUserMessage],
          createdAt: serverTimestamp()
        })
        skipFetchRef.current = activeId
        setChatId(activeId)
      } catch (err: any) {
        console.error("Error creating fresh conversation entry:", err)
        setSaveError('Could not save chat. (' + (err?.message || 'unknown error') + ')')
      }
    } else {
      try {
        const chatDocRef = doc(db, 'chats', activeId)
        skipFetchRef.current = activeId
        await updateDoc(chatDocRef, { messages: arrayUnion(newUserMessage) })
      } catch (err: any) {
        console.error("Error saving user message:", err)
      }
    }

    try {
      const conversationHistory = localStreamState.map((m, index) => {
        const textContent = index === localStreamState.length - 1 ? structuralText : m.text;
        return {
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: textContent }]
        }
      })

      // FIXED: Swapped from non-existent gemini-3.5-flash to standard official gemini-2.5-flash
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: conversationHistory,
      })

      const replyText = response.text || "I couldn't process that response."

      let userDisplayText = replyText
      let extractedDataJson: string | null = null

      if (replyText.includes('[DATA_START]') && replyText.includes('[DATA_END]')) {
        const parts = replyText.split('[DATA_START]')
        userDisplayText = parts[0].trim()

        const subParts = parts[1].split('[DATA_END]')
        extractedDataJson = subParts[0].trim()
      }

      const newAiResponse: Message = { sender: 'ai', text: userDisplayText }
      const updatedMessages = [...localStreamState, newAiResponse]
      setMessages(updatedMessages)

      const chatDocRef = doc(db, 'chats', activeId)
      skipFetchRef.current = activeId
      await updateDoc(chatDocRef, { messages: arrayUnion(newAiResponse) })

      if (extractedDataJson) {
        try {
          const cleanJsonStr = extractedDataJson.replace(/```json/g, '').replace(/```/g, '').trim()
          const parsedObject = JSON.parse(cleanJsonStr)

          if (currentToolMode === 'Generate flashcards') {
            await addDoc(collection(db, 'flashcards'), {
              userId: user.uid,
              subject: parsedObject.subject || 'General',
              cards: parsedObject.cards || [],
              createdAt: serverTimestamp()
            })
          } else if (currentToolMode === 'Create smart notes' || currentToolMode === 'Quiz me on a topic') {
            await addDoc(collection(db, 'library'), {
              userId: user.uid,
              title: parsedObject.title || userInput,
              type: parsedObject.type || 'Notes',
              content: parsedObject.content || userDisplayText,
              createdAt: serverTimestamp()
            })
          } else if (currentToolMode === 'Plan my study') {
            await addDoc(collection(db, 'planner'), {
              userId: user.uid,
              weekRange: parsedObject.weekRange || 'Current Week',
              totalHours: parsedObject.totalHours || 8,
              completedTasks: parsedObject.completedTasks || 0,
              totalTasks: parsedObject.totalTasks || 2,
              schedule: parsedObject.schedule || [],
              createdAt: serverTimestamp()
            })
          }
        } catch (jsonErr) {
          console.error("Failed to parse structural back-end payload payload data:", jsonErr)
        }
      }

    } catch (error: any) {
      console.error(error)
      const friendlyText = parseApiError(error)
      const errorMsgObj: Message = { sender: 'ai', text: friendlyText }
      setMessages([...localStreamState, errorMsgObj])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (fetchingHistory && user) {
    return (
      <div className="chat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.paper }}>
        <FontLoader />
        <TypingDots />
      </div>
    )
  }

  return (
    <section
      className="chat-container"
      style={{
        width: '100%',
        maxWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        boxSizing: 'border-box',
        background: T.paper,
      }}
    >
      <FontLoader />

      {saveError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px', margin: '12px 16px 0 16px', fontSize: '0.85rem', flexShrink: 0 }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{saveError}</span>
          <button onClick={() => setSaveError(null)} style={{ background: 'transparent', border: 'none', color: '#B91C1C', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        </div>
      )}

      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '28px 16px 12px 16px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? (
            <div className="chat-welcome" style={{ margin: 'auto 0' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'inline-flex', margin: '0 auto 18px auto' }}>
                  <HexBadge size={52} pulse />
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.14em', color: T.accentDeep, textTransform: 'uppercase', marginBottom: '8px' }}>
                  guruvuai
                </div>
                <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.65rem', fontWeight: 700, margin: '0 0 8px 0', color: T.ink, letterSpacing: '-0.01em' }}>
                  What are we studying today?
                </h1>
                <p style={{ color: T.muted, margin: 0, fontSize: '0.95rem' }}>Pick a mode below, or just ask — every answer earns you XP.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                {tools.map((t) => (
                  <div
                    key={t.name}
                    onClick={() => handleToolSelect(t.name)}
                    className="slp-tool-card"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px 14px 18px',
                      border: `1px solid ${T.border}`,
                      borderRadius: '14px',
                      cursor: 'pointer',
                      background: '#ffffff',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: T.accent }} />
                    <span style={{ width: '34px', height: '34px', borderRadius: '10px', background: T.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: T.accentDeep }}>
                      <t.icon size={17} />
                    </span>
                    <div>
                      <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '0.9rem', fontWeight: 600, margin: 0, color: T.ink }}>{t.name}</h3>
                      <p style={{ fontSize: '0.78rem', color: T.muted, margin: '2px 0 0 0' }}>{t.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
                    width: '100%',
                    marginBottom: '22px',
                    gap: '12px',
                  }}
                >
                  {m.sender === 'ai' && <HexBadge size={30} />}

                  {m.sender === 'user' ? (
                    <div
                      style={{
                        maxWidth: '75%',
                        background: T.accentSoft,
                        color: T.text,
                        borderRadius: '18px 18px 4px 18px',
                        padding: '10px 16px',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                        border: `1px solid ${T.accentSoft}`,
                      }}
                    >
                      {m.text}
                    </div>
                  ) : (
                    <div style={{ maxWidth: 'calc(100% - 42px)', fontSize: '0.95rem', color: T.text, wordBreak: 'break-word' }}>
                      <ReactMarkdown components={mdComponents}>{m.text}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start', width: '100%', gap: '12px', marginBottom: '22px' }}>
                  <HexBadge size={30} pulse />
                  <TypingDots />
                </div>
              )}
              <div ref={streamEndRef} />
            </>
          )}
        </div>
      </div>

      <div className="chat-footer" style={{ position: 'relative', flexShrink: 0, padding: '10px 16px 18px 16px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', position: 'relative' }}>
          {activeTool && (
            <div style={{ position: 'absolute', top: '-30px', left: '4px', background: T.ink, color: T.accent, fontSize: '0.72rem', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', zIndex: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>{activeTool}</span>
              <button onClick={() => { setActiveTool(null); setPlaceholderText('Message your AI tutor...'); }} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: T.accent, borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', padding: '0' }}>✕</button>
            </div>
          )}

          {menuOpen && (
            <div
              ref={menuRef}
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 10px)',
                left: 0,
                background: T.ink,
                border: `1px solid ${T.inkSoft}`,
                borderRadius: '14px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                width: '260px',
                zIndex: 20,
              }}
            >
              <div style={{ padding: '10px 14px', fontSize: '0.7rem', fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Space Grotesk', sans-serif" }}>Quick AI Actions</div>
              {tools.map((t) => (
                <div
                  key={t.name}
                  onClick={() => handleToolSelect(t.name)}
                  className="slp-menu-item"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', cursor: 'pointer', color: '#F3F4F1' }}
                >
                  <t.icon size={16} color={T.accent} />
                  <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>{t.name}</h4>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              width: '100%',
              background: T.ink,
              borderRadius: '26px',
              boxShadow: '0 8px 24px rgba(11,15,13,0.25)',
              padding: '8px 8px 8px 10px',
              gap: '6px',
            }}
          >
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                color: '#F3F4F1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                flexShrink: 0,
              }}
            >
              <Plus size={18} style={{ transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#F3F4F1',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                padding: '7px 4px',
                maxHeight: '200px',
                fontFamily: 'inherit',
              }}
              placeholder={placeholderText}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />

            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: loading || !input.trim() ? 'rgba(255,255,255,0.1)' : T.accent,
                color: loading || !input.trim() ? '#8A8F8C' : T.ink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: loading || !input.trim() ? 'default' : 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s',
                boxShadow: loading || !input.trim() ? 'none' : `0 0 0 4px ${T.accentSoft}`,
              }}
            >
              <ArrowUp size={16} />
            </button>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.72rem', color: T.muted, margin: '8px 0 0 0' }}>
            guruvuai can make mistakes. Check important info.
          </p>
        </div>
      </div>

      <style>{`
        .slp-tool-card:hover { border-color: ${T.accent}; box-shadow: 0 6px 18px rgba(22,199,132,0.14); transform: translateY(-1px); }
        .slp-tool-card { transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease; }
        .slp-menu-item:hover { background: rgba(255,255,255,0.06); }
      `}</style>
    </section>
  )
}

function FontLoader() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
    `}</style>
  )
}

function HexBadge({ size = 30, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
      <div
        style={{
          width: size,
          height: size,
          background: `linear-gradient(155deg, #1B221E 0%, ${T.ink} 100%)`,
          clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.accent,
          boxShadow: pulse ? `0 0 0 3px ${T.accentSoft}` : 'none',
        }}
      >
        <Bot size={Math.round(size * 0.5)} />
      </div>
      {pulse && (
        <span
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: '9px',
            height: '9px',
            borderRadius: '50%',
            background: T.accent,
            border: `2px solid ${T.paper}`,
            animation: 'slp-live-pulse 1.4s infinite',
          }}
        />
      )}
      <style>{`
        @keyframes slp-live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22,199,132,0.55); }
          70% { box-shadow: 0 0 0 6px rgba(22,199,132,0); }
          100% { box-shadow: 0 0 0 0 rgba(22,199,132,0); }
        }
      `}</style>
    </div>
  )
}

function parseApiError(error: any): string {
  const raw = error?.message || String(error)

  let code: number | undefined
  let message: string | undefined
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      code = parsed?.error?.code
      message = parsed?.error?.message
    }
  } catch {
    // not JSON, fall through to raw text
  }

  if (code === 429 || /quota/i.test(raw)) {
    return "⚠️ **Rate limit hit.** The AI model has run out of free-tier quota for this request. Wait a minute and try again, or switch to a model/plan with available quota."
  }
  if (code === 401 || code === 403 || /api key/i.test(raw)) {
    return "⚠️ **Authentication issue.** Your Gemini API key looks invalid or missing permissions — double check `VITE_GEMINI_API_KEY` in your `.env` file."
  }
  if (code === 400) {
    return `⚠️ **Request error.** ${message || "The request was malformed or the model identifier is deprecated. Try rephrasing your message."}`
  }
  if (code && code >= 500) {
    return "⚠️ **Server error.** Gemini's servers hit an issue on their end. Give it a moment and try again."
  }

  return `⚠️ **Something went wrong.** ${message || raw}`
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: T.accent,
            display: 'inline-block',
            animation: 'nexora-bounce 1.1s infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes nexora-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}