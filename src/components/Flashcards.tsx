import { useState, useEffect } from 'react'
import { Atom, Sparkles, Lightbulb, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { User } from 'firebase/auth'

interface FlashcardItem {
  id: string
  question: string
  answer: string
  subject?: string
  tip?: string
}

interface FlashcardsProps {
  user: User | null
}

export default function Flashcards({ user }: FlashcardsProps) {
  const [flip, setFlip] = useState(false)
  const [cards, setCards] = useState<FlashcardItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // 📡 Listen to real-time flashcard generated documents belonging to this user
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'flashcards'), where('userId', '==', user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const flashcardsArr: FlashcardItem[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        // If data contains a nested array of multiple cards
        if (Array.isArray(data.cards)) {
          data.cards.forEach((c: any, index: number) => {
            flashcardsArr.push({
              id: `${doc.id}_${index}`,
              question: c.question || 'No question provided',
              answer: c.answer || 'No answer provided',
              subject: data.subject || 'GENERAL',
              tip: c.tip || 'Think through the fundamental definitions.'
            })
          })
        } else {
          // Fallback single card doc structure
          flashcardsArr.push({
            id: doc.id,
            question: data.question || 'No question provided',
            answer: data.answer || 'No answer provided',
            subject: data.subject || 'GENERAL',
            tip: data.tip || 'Review key terms.'
          })
        }
      })
      
      setCards(flashcardsArr)
      // Safely reset index bounds if card stacks update dynamically
      setCurrentIndex((prev) => (flashcardsArr.length > 0 && prev >= flashcardsArr.length ? 0 : prev))
      setLoading(false)
    }, (error) => {
      console.error("Error reading flashcards collection:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  const nextCard = (e: React.MouseEvent) => {
    e.stopPropagation() // Stop card from flipping when clicking navigation buttons
    setFlip(false)
    if (cards.length === 0) return
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % cards.length)
    }, 150)
  }

  const prevCard = (e: React.MouseEvent) => {
    e.stopPropagation()
    setFlip(false)
    if (cards.length === 0) return
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)
    }, 150)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100%' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16C784', display: 'inline-block' }}></span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16C784', display: 'inline-block' }}></span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16C784', display: 'inline-block' }}></span>
        </div>
      </div>
    )
  }

  // Fallback state if database records haven't arrived yet
  if (cards.length === 0) {
    return (
      <section 
        className="content"
        style={{ 
          height: '100%', 
          overflowY: 'auto', 
          paddingBottom: '40px',
          boxSizing: 'border-box',
          padding: '24px'
        }}
      >
        <div className="page-intro">
          <div>
            <p className="eyebrow" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16C784', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>SMART RECALL</p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Flashcards</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Learn faster with AI-crafted memory cards.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', background: '#ffffff', border: '1px solid #E9E7E2', borderRadius: '14px', marginTop: '2rem' }}>
          <Sparkles size={40} style={{ marginBottom: '1rem', color: '#16C784' }} />
          <h3 style={{ color: '#0B0F0D', fontWeight: 600 }}>No Flashcards Generated Yet</h3>
          <p style={{ fontSize: '0.9rem', maxWidth: '420px', margin: '8px auto 0 auto' }}>Go to the <b>AI Tutor Chat</b> and trigger the <b>"Generate flashcards"</b> action tool to build decks automatically!</p>
        </div>
      </section>
    )
  }

  const currentCard = cards[currentIndex]

  return (
    <section 
      className="content"
      style={{ 
        height: '100%', 
        overflowY: 'auto', 
        paddingBottom: '40px',
        boxSizing: 'border-box',
        padding: '24px'
      }}
    >
      <div className="page-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p className="eyebrow" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#16C784', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>SMART RECALL</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Flashcards</h1>
          <p style={{ color: '#6b7280', margin: '4px 0 0 0' }}>Learn faster with AI-crafted memory cards.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="icon-btn" onClick={prevCard} style={{ padding: '8px', borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', minWidth: '45px', textAlign: 'center' }}>{currentIndex + 1} / {cards.length}</span>
          <button className="icon-btn" onClick={nextCard} style={{ padding: '8px', borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex' }}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="flash-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '24px', alignItems: 'start' }}>
        {/* Interactive Flipping Card UI wrapper */}
        <div className="flash-card-wrap" onClick={() => setFlip(!flip)} style={{ perspective: '1000px', cursor: 'pointer', minHeight: '340px' }}>
          <div className={'flash-card ' + (flip ? 'flipped' : '')} style={{ width: '100%', height: '340px', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 0.6s ease' }}>
            
            {/* Front Card Face Side */}
            <div className="card-face front" style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', background: '#0B0F0D', color: '#FCFBF9', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', boxSizing: 'border-box', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
              <span className="pill" style={{ background: '#16C784', color: '#0B0F0D', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700 }}>{currentCard?.subject?.toUpperCase() || 'GENERAL'}</span>
              <Atom size={44} style={{ color: '#16C784' }} />
              <small style={{ color: '#6B7280', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em' }}>KEY CONCEPT</small>
              <h2 style={{ padding: '0 1rem', fontSize: '1.35rem', margin: 0, textAlign: 'center', fontWeight: 600, lineHeight: 1.4 }}>{currentCard?.question}</h2>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#6B7280' }}>Tap to reveal explanation</p>
              <div className="card-number" style={{ fontSize: '0.72rem', color: '#16C784', fontWeight: 600 }}>Click to Flip</div>
            </div>

            {/* Back Card Face Side */}
            <div className="card-face back" style={{ position: 'absolute', width: '100%', height: '100%', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: '#ffffff', color: '#121815', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', border: '2px solid #16C784', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
              <span className="pill" style={{ background: '#E6FBF1', color: '#0E9F6A', padding: '4px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, width: 'fit-content' }}>EXPLANATION</span>
              <h3 style={{ padding: '0 6px', fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.55', margin: '12px 0', color: '#121815' }}>{currentCard?.answer}</h3>
              {currentCard?.tip && (
                <p style={{ margin: 0, padding: '10px 14px', background: '#FCFBF9', border: '1px dashed #E9E7E2', borderRadius: '10px', fontSize: '0.82rem', color: '#6B7280' }}>
                  <b>Memory tip:</b> {currentCard.tip}
                </p>
              )}
              <div className="card-number" style={{ fontSize: '0.72rem', color: '#6B7280', textAlign: 'center', marginTop: '8px' }}>TAP TO FLIP BACK</div>
            </div>

          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="flash-copy" style={{ background: '#ffffff', border: '1px solid #E9E7E2', borderRadius: '16px', padding: '20px' }}>
          <span className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#0E9F6A' }}>
            <Sparkles size={13} /> AI synchronized
          </span>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '10px 0 6px 0', color: '#0B0F0D' }}>Review Stack</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.5 }}>These cards were generated dynamically during your live chat conversations with the AI study helper.</p>
          
          <div className="keypoint" style={{ display: 'flex', gap: '10px', marginTop: '16px', padding: '12px', background: '#E6FBF1', borderRadius: '12px' }}>
            <Lightbulb size={18} style={{ color: '#0E9F6A', flexShrink: 0 }} />
            <div>
              <b style={{ fontSize: '0.85rem', color: '#0B0F0D' }}>Study tip</b>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#6B7280' }}>Review again in 10 minutes for better active recall retention.</p>
            </div>
          </div>
          
          <button className="primary wide" onClick={nextCard} style={{ marginTop: '20px', width: '100%', background: '#0B0F0D', color: '#ffffff', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Next Card <ArrowUp size={16} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      </div>

      {/* Embedded flipping style rules */}
      <style>{`
        .flipped { transform: rotateY(180deg) !important; }
      `}</style>
    </section>
  )
}