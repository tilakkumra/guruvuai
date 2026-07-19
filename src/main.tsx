import { useState, useRef, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { 
  ChevronDown, 
  Command, 
  GraduationCap, 
  LayoutDashboard, 
  Bot, 
  Sparkles, 
  CalendarDays, 
  FolderOpen, 
  X, 
  Plus, 
  MoreHorizontal, 
  Settings, 
  Search, 
  Menu,
  Trash2,
  AlertTriangle,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  HardDrive
} from 'lucide-react'

// Import live Firebase instances and query tools
import { auth, db } from './firebase'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth'
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore'

// Modular feature component imports
import Chat from './components/Chat'
import Dashboard from './components/Dashboard'
import Flashcards from './components/Flashcards'
import Planner from './components/planner'
import Library from './components/library'
import Upgrade from './components/upgrade'
import SettingsPage from './components/settings'

import './styles.css'
import './extra.css'

// Added 'profile' to the layout state options
type View = 'chat' | 'dashboard' | 'flashcards' | 'planner' | 'library' | 'upgrade' | 'settings' | 'profile'

interface SavedChat {
  id: string
  title: string
  createdAt?: any
}

function MainAuthGate() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Check your details.')
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  if (loading) {
    return (
      <div className="auth-container">
        <div className="loading-bubble"><span></span><span></span><span></span></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{authMode === 'login' ? 'Log in to unlock StudyLap AI' : 'Sign up to get full premium access'}</p>
          </div>
          
          <form onSubmit={handleAuthSubmit}>
            {errorMsg && (
              <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem', wordBreak: 'break-all' }}>
                {errorMsg}
              </div>
            )}

            {authMode === 'signup' && (
              <div className="auth-input-group">
                <label>Full Name</label>
                <input type="text" placeholder="Arjun Kumar" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            
            <div className="auth-input-group">
              <label>Email Address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" className="auth-btn">
              {authMode === 'login' ? 'Sign In' : 'Create Free Account'}
            </button>
          </form>

          <div className="auth-toggle">
            {authMode === 'login' ? (
              <p>Don't have an account? <span onClick={() => setAuthMode('signup')}>Sign up</span></p>
            ) : (
              <p>Already have an account? <span onClick={() => setAuthMode('login')}>Log in</span></p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return <App user={user} onLogout={handleLogout} />
}

interface AppProps {
  user: User
  onLogout: () => void
}

function App({ user, onLogout }: AppProps) {
  const [view, setView] = useState<View>('chat')
  const [collapsed, setCollapsed] = useState(true)
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [userChats, setUserChats] = useState<SavedChat[]>([])
  
  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Custom Modal Management State Hooks
  const [chatToDelete, setChatToDelete] = useState<string | null>(null)
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false)

  const go = (v: View) => { 
    setView(v)
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuChatId(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (!user?.uid) return

    const q = query(collection(db, 'chats'), where('userId', '==', user.uid))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsArr: SavedChat[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        chatsArr.push({
          id: doc.id,
          title: data.title || 'Untitled Chat',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt
        })
      })

      chatsArr.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      })

      setUserChats(chatsArr)
    }, (err) => {
      console.error("Firestore live synchronization error: ", err)
    })
    
    return () => unsubscribe()
  }, [user.uid])

  const openDeleteConfirmation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuChatId(null)
    setChatToDelete(id)
  }

  const handleConfirmDelete = async () => {
    if (!chatToDelete) return
    const targetId = chatToDelete
    setChatToDelete(null)

    try {
      await deleteDoc(doc(db, 'chats', targetId))
      if (selectedChatId === targetId) {
        setSelectedChatId(null)
        setView('dashboard')
      }
    } catch (err) {
      console.error("Failed to clear chat log document entry:", err)
    }
  }

  const startNewChat = () => {
    setSelectedChatId(null) 
    setView('chat')
  }

  const loadOldChat = (id: string) => {
    setSelectedChatId(id) 
    setView('chat')
  }

  const userInitials = user.email ? user.email.substring(0, 2).toUpperCase() : 'AI'
  const userDisplayName = user.email ? user.email.split('@')[0] : 'Arjun Kumar'

  return (
    <div className={'app ' + (collapsed ? 'collapsed' : '')}>
      <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="brand">
          <div className="brand-mark"><GraduationCap size={19}/></div>
          <span>GURUVU <b>AI</b></span>
          <button className="icon mobile-only" onClick={() => setCollapsed(true)}>
            <X size={18}/>
          </button>
        </div>
        
        <button className="new-chat" onClick={startNewChat}>
          <Plus size={18}/> <span>New chat</span><kbd>⌘ K</kbd>
        </button>

        <nav>
          <Nav active={view === 'dashboard'} icon={LayoutDashboard} text="Dashboard" onClick={() => go('dashboard')}/>
          <Nav active={view === 'chat' && !selectedChatId} icon={Bot} text="AI Tutor" onClick={startNewChat}/>
          <Nav active={view === 'flashcards'} icon={Sparkles} text="Flashcards" onClick={() => go('flashcards')}/>
          <Nav active={view === 'planner'} icon={CalendarDays} text="Study planner" onClick={() => go('planner')}/>
          <Nav active={view === 'library'} icon={FolderOpen} text="My library" onClick={() => go('library')}/>
        </nav>

        <div className="sidebar-label">RECENT</div>
        
        <div className="chat-list" style={{ flex: '1 1 auto', overflowY: 'auto', minHeight: '0px' }}>
          {userChats.map((chat) => (
            <div 
              key={chat.id} 
              className={'chat-row-item-wrapper'} 
              style={{ position: 'relative', marginBottom: '4px' }}
            >
              <button 
                className={'chat-row-item ' + (selectedChatId === chat.id ? 'active' : '')}
                onClick={() => loadOldChat(chat.id)}
                style={{ width: '100%', paddingRight: '36px' }}
              >
                <span className="truncate">{chat.title}</span>
              </button>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuChatId(activeMenuChatId === chat.id ? null : chat.id);
                }}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  display: 'flex',
                  zIndex: 2
                }}
                className="more-actions-trigger"
              >
                <MoreHorizontal size={16}/>
              </button>

              {activeMenuChatId === chat.id && (
                <div 
                  ref={menuRef}
                  style={{
                    position: 'absolute',
                    top: '32px',
                    right: '8px',
                    background: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    zIndex: 20,
                    minWidth: '120px',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={(e) => openDeleteConfirmation(chat.id, e)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Trash2 size={14} />
                    Delete Chat
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom" style={{ flexShrink: 0 }}>
          <button className="upgrade-mini" onClick={() => go('upgrade')}>
            <span className="spark"><Sparkles size={15}/></span>
            <div>
              <b>Upgrade to Pro</b>
              <small>Unlock your full potential</small>
            </div>
          </button>
          <Nav active={view === 'settings'} icon={Settings} text="Settings" onClick={() => go('settings')}/>
          
          {/* Swapped out onLogout. Clicking profile now opens the custom Profile Screen panel safely */}
          <div className={'profile ' + (view === 'profile' ? 'active' : '')} onClick={() => go('profile')} title="Open Profile View" style={{ cursor: 'pointer' }}>
            <div className="avatar">{userInitials}</div>
            <div>
              <b style={{ fontSize: '0.85rem' }} className="truncate">{userDisplayName}</b>
              <small>View Profile</small>
            </div>
            <ChevronDown size={15}/>
          </div>
        </div>
      </aside>

      <main>
        <header>
          <button className="icon desk-menu" onClick={() => setCollapsed(false)}>
            <Menu size={20}/>
          </button>
          <div className="crumb">
            {view === 'chat' ? (
              <><span>AI Tutor</span><ChevronDown size={15}/></>
            ) : (
              <span>{view[0].toUpperCase() + view.slice(1)}</span>
            )}
          </div>
          <div className="header-actions">
            <button className="search-btn">
              <Search size={17}/><span>Search</span><kbd>⌘ /</kbd>
            </button>
            <button className="icon"><Command size={18}/></button>
          </div>
        </header>

        <div className="content" style={{ height: '100%', overflowY: 'auto' }}>
          {view === 'chat' && (
            <Chat 
              go={go} 
              user={user} 
              chatId={selectedChatId} 
              setChatId={setSelectedChatId} 
            />
          )}
          {view === 'dashboard' && <Dashboard go={go} user={user} />}
          {view === 'flashcards' && <Flashcards user={user} />}
          {view === 'planner' && <Planner user={user} />}
          {view === 'library' && <Library go={go} user={user} />}
          {view === 'upgrade' && <Upgrade />}
          {view === 'settings' && <SettingsPage />}

          {/* New Profile View Dashboard Screen */}
          {view === 'profile' && (
            <div style={{ padding: '32px', maxWidth: '640px', margin: '0 auto' }}>
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                
                {/* Profile Header banner banner */}
                <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '20px', color: '#ffffff' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', border: '2px solid rgba(255,255,255,0.4)' }}>
                    {userInitials}
                  </div>
                  <div>
                    <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: 600 }}>{userDisplayName}</h2>
                    <p style={{ margin: 0, opacity: 0.85, fontSize: '0.9rem' }}>{user.email}</p>
                  </div>
                </div>

                {/* Profile Meta Info Sections Blocks */}
                <div style={{ padding: '24px' }}>
                  
                  {/* Usage Quota Card Section */}
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <HardDrive size={18} style={{ color: '#3b82f6' }} />
                    Workspace Usage & Quotas
                  </h3>
                  
                  <div style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem', color: '#475569' }}>
                      <span style={{ fontWeight: 500 }}>AI Token Compute Quota</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#0f172a' }}>4,250 / 10,000 monthly credits</span>
                    </div>
                    {/* Progress Bar Container layout component */}
                    <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: '42.5%', height: '100%', backgroundColor: '#3b82f6', borderRadius: '4px' }}></div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '16px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
                      <div style={{ flex: 1 }}>
                        <small style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Total Study Sessions</small>
                        <b style={{ color: '#0f172a', fontSize: '1.1rem' }}>{userChats.length} active logs</b>
                      </div>
                      <div style={{ flex: 1 }}>
                        <small style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Account Plan Tier</small>
                        <span style={{ color: '#16a34a', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <ShieldCheck size={14} /> Free Starter Tier
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Settings / Logout Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '8px' }}>
                    <button 
                      onClick={() => go('upgrade')}
                      style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #3b82f6', color: '#3b82f6', backgroundColor: '#ffffff', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <Sparkles size={15} /> Upgrade Limits
                    </button>
                    <button 
                      onClick={() => setShowLogoutModal(true)}
                      style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', color: '#ffffff', backgroundColor: '#dc2626', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <LogOut size={15} /> Sign Out Workspace
                    </button>
                  </div>

                </div>

              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modern High-End Custom Confirmation Dialog Overlay */}
      {chatToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px 24px 16px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                backgroundColor: '#fef2f2',
                color: '#ef4444',
                padding: '10px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                  Delete Study Session?
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                  This process cannot be undone. All workspace records and context logs matching this history session will be cleared.
                </p>
              </div>
            </div>
            
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '12px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button 
                onClick={() => setChatToDelete(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Sign Out Confirmation Overlay Modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px 24px 16px 24px', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                backgroundColor: '#fbf7f7',
                color: '#dc2626',
                padding: '10px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <LogOut size={22} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                  Sign Out of StudyLap AI?
                </h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5 }}>
                  Are you sure you want to end your current dashboard workspace session? You can sign back in anytime.
                </p>
              </div>
            </div>
            
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '12px 24px',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              borderTop: '1px solid #f1f5f9'
            }}>
              <button 
                onClick={() => setShowLogoutModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Stay Logged In
              </button>
              <button 
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Nav({ icon: Icon, text, active, onClick }: { icon: any, text: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={'nav ' + (active ? 'active' : '')}>
      <Icon size={18}/><span>{text}</span>
    </button>
  )
}

createRoot(document.getElementById('root')!).render(<MainAuthGate />)