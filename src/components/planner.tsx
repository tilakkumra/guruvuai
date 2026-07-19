import { useState, useEffect } from 'react'
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react'
import { db } from '../firebase'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { User } from 'firebase/auth'

interface StudyEvent {
  time: string
  subject: string
  topic: string
  taskType: string
  duration: string
  variant: 'black' | 'gray' | 'outline'
}

interface PlannerData {
  id: string
  weekRange: string
  totalHours: number
  completedTasks: number
  totalTasks: number
  schedule: StudyEvent[]
}

interface PlannerProps {
  user: User | null
}

export default function Planner({ user }: PlannerProps) {
  const [planData, setPlanData] = useState<PlannerData | null>(null)
  const [loading, setLoading] = useState(true)

  // 📡 Real-time sync with user's specific customized study plan
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, 'planner'), where('userId', '==', user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Grab the most recent active study plan document
        const doc = snapshot.docs[0]
        const data = doc.data()
        
        setPlanData({
          id: doc.id,
          weekRange: data.weekRange || 'Current Week',
          totalHours: data.totalHours || 0,
          completedTasks: data.completedTasks || 0,
          totalTasks: data.totalTasks || 0,
          schedule: data.schedule || []
        })
      } else {
        setPlanData(null)
      }
      setLoading(false)
    }, (error) => {
      console.error("Error fetching study planner matrix:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user])

  if (loading) {
    return (
      <div className="chat-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="loading-bubble"><span></span><span></span><span></span></div>
      </div>
    )
  }

  // Fallback banner telling user how to get their tailored schedule
  if (!planData) {
    return (
      <section className="content">
        <div className="page-intro">
          <div>
            <p className="eyebrow">YOUR WEEK, INTENTIONALLY</p>
            <h1>Study planner</h1>
            <p>A practical path to your personalized study goals.</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280', background: 'var(--bg-card)', borderRadius: '12px', marginTop: '2rem' }}>
          <Sparkles size={40} style={{ marginBottom: '1rem', color: '#a855f7' }} />
          <h3>No AI Study Plan Active</h3>
          <p>Head to the <b>AI Tutor</b> tab, tap the <b>"+"</b> action wheel, select <b>"Plan my study"</b>, and outline your target exam details to auto-generate this framework!</p>
        </div>
      </section>
    )
  }

  // Calculate task tracking percentages safely
  const completePercentage = planData.totalTasks > 0 
    ? Math.round((planData.completedTasks / planData.totalTasks) * 100) 
    : 0

  return (
    <section className="content">
      <div className="page-intro">
        <div>
          <p className="eyebrow">YOUR WEEK, INTENTIONALLY</p>
          <h1>Study planner</h1>
          <p>A practical path to your tailored learning timeline.</p>
        </div>
      </div>

      <div className="planner">
        <div className="panel plan-main">
          <div className="week">
            <button className="icon-btn"><ChevronLeft size={16} /></button>
            <h3>{planData.weekRange}</h3>
            <button className="icon-btn"><ChevronRight size={16} /></button>
          </div>

          <div className="days">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
              // Automatically highlights today's date placeholder block index contextually
              const currentDayIndex = new Date().getDay()
              const correctedDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1 // Shift Sunday alignment
              return (
                <div className={idx === correctedDayIndex ? 'today' : ''} key={day}>
                  <small>{day}</small>
                  <b>{14 + idx}</b>
                  {idx <= correctedDayIndex && <i />}
                </div>
              )
            })}
          </div>

          <div className="timeline">
            {planData.schedule.map((item, index) => (
              <div key={index} style={{ display: 'contents' }}>
                <p>{item.time}</p>
                <div className={`event ${item.variant}`}>
                  <b>{item.subject} · {item.topic}</b>
                  <small>{item.taskType} · {item.duration}</small>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel plan-side">
          <h3>This week</h3>
          <div className="big-number">{planData.totalHours}<span>h</span></div>
          <p>planned study time</p>
          <hr />
          <div className="split">
            <b>{planData.completedTasks} <small>/ {planData.totalTasks} tasks</small></b>
            <span>completed</span>
          </div>
          <div className="bar">
            <i style={{ width: `${completePercentage}%`, transition: 'width 0.4s ease' }} />
          </div>
          <button className="text-btn">View full agenda progress →</button>
        </div>
      </div>
    </section>
  )
}