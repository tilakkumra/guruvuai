import { useState, useEffect } from 'react'
import { 
  Bot, 
  Sparkles, 
  Flame, 
  Clock3, 
  Plus, 
  ArrowUp, 
  Atom, 
  BookOpen, 
  MoreHorizontal 
} from 'lucide-react'

// Import live Firestore handlers
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore'
import { User } from 'firebase/auth'

type View = 'chat' | 'dashboard' | 'flashcards' | 'planner' | 'library' | 'upgrade' | 'settings' | 'profile'

interface DashboardProps {
  go: (v: View) => void
  user: User | null // Pass the real logged-in user instance down
}

interface Goal {
  text: string
  time: string
  done: boolean
}

export default function Dashboard({ go, user }: DashboardProps) {
  // Safe extraction of name fallback using the email string prefix
  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'Student'

  // Dynamic state hooks connected straight to cloud storage
  const [goalsList, setGoalsList] = useState<Goal[]>([
    { text: 'Review calculus notes', time: '25 min', done: false },
    { text: 'Complete physics quiz', time: '15 min', done: false },
    { text: 'Create organic flashcards', time: '20 min', done: false }
  ])

  const [studyTime, setStudyTime] = useState('0h 0m')
  const [questionsCount, setQuestionsCount] = useState(0)
  const [cardsCount, setCardsCount] = useState(0)
  const [streakCount, setStreakCount] = useState('1')
  const [loading, setLoading] = useState(true)

  // 📡 1. Fetch user core document metadata (Goals, Streak, Study Time)
  useEffect(() => {
    if (!user) return

    const userDocRef = doc(db, 'users', user.uid)
    
    const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.goalsList) setGoalsList(data.goalsList)
        if (data.studyTime) setStudyTime(data.studyTime)
        if (data.streakCount) setStreakCount(data.streakCount)
      } else {
        // Initialize an entry for clean new profiles safely
        await setDoc(userDocRef, {
          goalsList: [
            { text: 'Review calculus notes', time: '25 min', done: false },
            { text: 'Complete physics quiz', time: '15 min', done: false },
            { text: 'Create organic flashcards', time: '20 min', done: false }
          ],
          studyTime: '0h 45m',
          streakCount: '1',
          email: user.email
        })
      }
      setLoading(false)
    }, (err) => {
      console.error("Error reading Firestore statistics:", err)
      setLoading(false)
    })

    return () => unsubscribeUser()
  }, [user])

  // 📡 2. Live calculation of all processed AI chat prompts sent by user
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'chats'), where('userId', '==', user.uid))
    
    const unsubscribeChats = onSnapshot(q, (snapshot) => {
      let totalPrompts = 0
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (Array.isArray(data.messages)) {
          // Count only the items sent explicitly by the user
          const userMsgs = data.messages.filter((m: any) => m.sender === 'user')
          totalPrompts += userMsgs.length
        }
      })
      setQuestionsCount(totalPrompts)
    })

    return () => unsubscribeChats()
  }, [user])

  // 📡 3. Live calculation of total generated items loaded inside flashcard collections
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'flashcards'), where('userId', '==', user.uid))
    
    const unsubscribeCards = onSnapshot(q, (snapshot) => {
      let totalCards = 0
      snapshot.forEach((doc) => {
        const data = doc.data()
        if (Array.isArray(data.cards)) {
          totalCards += data.cards.length
        } else if (data.question) {
          totalCards += 1
        }
      })
      setCardsCount(totalCards)
    })

    return () => unsubscribeCards()
  }, [user])

  // Live database trigger when checking off individual workflow metrics
  const toggleGoal = async (index: number) => {
    if (!user) return
    
    const updatedGoals = goalsList.map((goal, idx) => 
      idx === index ? { ...goal, done: !goal.done } : goal
    )
    
    setGoalsList(updatedGoals)

    try {
      const userDocRef = doc(db, 'users', user.uid)
      await updateDoc(userDocRef, { goalsList: updatedGoals })
    } catch (err) {
      console.error("Failed to sync structural goal state:", err)
    }
  }

  // Calculate dynamic percentages based on real completed state elements
  const completedCount = goalsList.filter(g => g.done).length
  const totalCount = goalsList.length
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const statsList = [
    { n: studyTime, l: 'Study time', s: 'Tracked value', icon: Clock3 },
    { n: questionsCount.toString(), l: 'Questions asked', s: 'Live from AI Chat', icon: Bot },
    { n: cardsCount.toString(), l: 'Flashcards', s: 'Live in Review Deck', icon: Sparkles },
    { n: streakCount, l: 'Day streak', s: 'Keep it going!', icon: Flame }
  ]

  // Get current day context dynamically
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).toUpperCase()

  if (loading && user) {
    return (
      <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="loading-bubble"><span></span><span></span><span></span></div>
      </div>
    )
  }

  return (
    <section 
      className="content" 
      style={{ 
        height: '100%', 
        overflowY: 'auto', 
        paddingBottom: '40px',
        boxSizing: 'border-box' 
      }}
    >
      {/* Dynamic Welcome Banner */}
      <div className="page-intro">
        <div>
          <p className="eyebrow">{formattedDate}</p>
          <h1>Good afternoon, {userDisplayName} <span>✦</span></h1>
          <p>Small steps today make a big difference tomorrow.</p>
        </div>
        <button className="primary" onClick={() => go('chat')}>
          <Plus size={17} /> Start studying
        </button>
      </div>

      {/* Grid Stats Row */}
      <div className="stats">
        {statsList.map(({ n, l, s, icon: Icon }) => (
          <div className="stat" key={l}>
            <span className="stat-icon">
              <Icon size={18} />
            </span>
            <p>{l}</p>
            <h2>{n}</h2>
            <small>{s}</small>
          </div>
        ))}
      </div>

      {/* Two Column Progress Layout */}
      <div className="two-col" style={{ marginBottom: '20px' }}>
        {/* Left Column: Progress Ring & Goals */}
        <div className="panel progress-panel">
          <div className="panel-head">
            <div>
              <h3>Today's progress</h3>
              <p>You're doing great. Keep the momentum going.</p>
            </div>
            <MoreHorizontal size={19} />
          </div>

          <div className="ring-row">
            <div className="ring">
              <b>{completionPercentage}%</b>
              <small>complete</small>
            </div>
            <div>
              <p><b>{completedCount} of {totalCount}</b> daily goals completed</p>
              <div className="bar">
                <i style={{ width: `${completionPercentage}%`, transition: 'width 0.3s ease' }} />
              </div>
              <small>{totalCount - completedCount} more to reach your daily target</small>
            </div>
          </div>

          <div className="goals">
            {goalsList.map((goal, idx) => (
              <div 
                key={idx} 
                onClick={() => toggleGoal(idx)} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0' }}
              >
                <span className={`check ${goal.done ? 'done' : ''}`} style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '18px',
                  height: '18px',
                  border: '1px solid #d1d5db',
                  borderRadius: '4px',
                  background: goal.done ? '#111827' : 'transparent',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 'bold'
                }}>
                  {goal.done ? '✓' : ''}
                </span>
                <span style={{ textDecoration: goal.done ? 'line-through' : 'none', color: goal.done ? '#9ca3af' : 'inherit' }}>
                  {goal.text} <small style={{ marginLeft: '4px', color: '#6b7280' }}>{goal.time}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Continue Learning Cards */}
        <div className="panel continue">
          <div className="panel-head">
            <h3>Continue learning</h3>
            <button className="text-btn" onClick={() => go('flashcards')}>View all</button>
          </div>

          <div className="continue-card" onClick={() => go('flashcards')} style={{ cursor: 'pointer' }}>
            <div className="subject-icon">
              <Atom size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <b>Review Generated Flashcards</b>
              <p>Physics & Chemistry · {cardsCount} cards active</p>
              <div className="bar">
                <i style={{ width: cardsCount > 0 ? '100%' : '0%' }} />
              </div>
            </div>
            <button className="round">
              <ArrowUp size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>

          <div className="continue-card" onClick={() => go('chat')} style={{ cursor: 'pointer', marginTop: '12px' }}>
            <div className="subject-icon dark">
              <BookOpen size={21} />
            </div>
            <div style={{ flex: 1 }}>
              <b>AI Chat Assistant</b>
              <p>Interactive study sessions active</p>
              <div className="bar short">
                <i style={{ width: '100%' }} />
              </div>
            </div>
            <button className="round">
              <ArrowUp size={16} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}