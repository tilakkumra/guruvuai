import { useState, useEffect } from 'react'
import { Plus, MoreHorizontal, FileText, Sparkles } from 'lucide-react'

// Import live Firestore handlers
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { User } from 'firebase/auth'

type View = 'chat' | 'dashboard' | 'flashcards' | 'planner' | 'library' | 'upgrade' | 'settings'
type TabFilter = 'All items' | 'Notes' | 'Quizzes' | 'Files'

interface LibraryItem {
  id: string
  title: string
  type: 'Notes' | 'Quizzes' | 'Files'
  content: string
  timeAgo: string
  createdAt?: any
}

interface LibraryProps {
  go: (v: View) => void
  user: User | null
}

export default function Library({ go, user }: LibraryProps) {
  const [activeTab, setActiveTab] = useState<TabFilter>('All items')
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [loading, setLoading] = useState(true)

  // 📡 Real-time synchronization loader for AI generated materials matching this profile
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'library'), where('userId', '==', user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const itemsArr: LibraryItem[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        
        // Formulate readable time format fallback values
        let displayTime = 'Recently'
        if (data.createdAt) {
          const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
          displayTime = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }

        itemsArr.push({
          id: doc.id,
          title: data.title || 'Untitled Material',
          type: data.type || 'Notes',
          content: data.content || '',
          timeAgo: displayTime,
          createdAt: data.createdAt
        })
      })

      // Sort with newest items showing up first
      itemsArr.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })

      setLibraryItems(itemsArr)
      setLoading(false)
    }, (error) => {
      console.error("Error reading library contents: ", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  // Filter items context loop based on active tab select action
  const filteredItems = libraryItems.filter(item => {
    if (activeTab === 'All items') return true
    return item.type === activeTab
  })

  if (loading) {
    return (
      <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="loading-bubble"><span></span><span></span><span></span></div>
      </div>
    )
  }

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">YOUR KNOWLEDGE BASE</p>
          <h1>My library</h1>
          <p>Notes, quizzes, and resources — all in one place.</p>
        </div>
        <button className="primary" onClick={() => go('chat')}>
          <Plus size={17} /> Create material
        </button>
      </div>

      {/* Dynamic Tabs Navigation Header */}
      <div className="library-tabs">
        {(['All items', 'Notes', 'Quizzes', 'Files'] as TabFilter[]).map((tab) => (
          <b 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{ 
              cursor: 'pointer', 
              color: activeTab === tab ? 'var(--text-main, #111827)' : '#6b7280',
              borderBottom: activeTab === tab ? '2px solid var(--text-main, #111827)' : 'none',
              paddingBottom: '4px',
              marginRight: '16px',
              display: 'inline-block'
            }}
          >
            {tab}
          </b>
        ))}
      </div>

      {/* Grid Display Logic Engine */}
      {filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b7280', background: 'var(--bg-card, #f9fafb)', borderRadius: '12px', marginTop: '1.5rem' }}>
          <Sparkles size={40} style={{ marginBottom: '1rem', color: '#a855f7', display: 'inline-block' }} />
          <h3>No {activeTab === 'All items' ? '' : activeTab.toLowerCase()} built yet</h3>
          <p>Go talk to the AI Tutor and trigger active modes to archive study materials here!</p>
        </div>
      ) : (
        <div className="library-grid">
          {filteredItems.map((item, idx) => (
            <div className="library-card" key={item.id}>
              <div className={'doc-icon d' + (idx % 4)}><FileText size={22} /></div>
              <button><MoreHorizontal size={18} /></button>
              <span>{item.type.toUpperCase()} · {item.timeAgo.toUpperCase()}</span>
              <h3>{item.title}</h3>
              <p style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.content.replace(/[#*`]/g, '').substring(0, 120)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}