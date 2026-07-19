import { useState, useEffect } from 'react'
import { 
  GraduationCap, 
  CreditCard, 
  Settings, 
  Sparkles, 
  Bell, 
  ShieldCheck, 
  Eye, 
  EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  // --- State Variables for Features ---
  const [studyGoal, setStudyGoal] = useState('JEE · Engineering entrance preparation')
  const [theme, setTheme] = useState('system')
  const [reminderTime, setReminderTime] = useState('19:00')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  
  // Security state variables
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Notification banner simulation state
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Dynamic DOM binding side-effect to inject the chosen active theme target
  useEffect(() => {
    const root = document.documentElement;
    
    // Clear previously injected theme hooks
    root.classList.remove('theme-light', 'theme-dark', 'theme-system');
    
    // Apply new corresponding class structure
    root.classList.add(`theme-${theme}`);
    
    // Optional: Directly inject dark mode configurations onto standard data attributes 
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      // Check system preference query variables 
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
    }
  }, [theme])

  const triggerSaveNotification = (message: string) => {
    setSaveStatus(message)
    setTimeout(() => setSaveStatus(null), 3000)
  }

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword || !newPassword) return
    
    triggerSaveNotification('Password successfully updated!')
    setCurrentPassword('')
    setNewPassword('')
  }

  return (
    <section className="content settings-page" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      
      {saveStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {saveStatus}
        </div>
      )}

      <div className="page-intro" style={{ marginBottom: '24px' }}>
        <div>
          <p className="eyebrow" style={{ color: '#6366f1', fontSize: '0.75rem', fontWeight: 700, margin: '0 0 4px 0' }}>PREFERENCES</p>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '1.75rem', fontWeight: 700 }}>Settings</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Manage your account configuration and learning preferences.</p>
        </div>
      </div>

      <div className="settings-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* 1. Study Profile Card Section */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ backgroundColor: '#eef2ff', color: '#4f46e5', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <GraduationCap size={18} />
            </span>
            <div>
              <b style={{ display: 'block', fontSize: '0.95rem' }}>Study Profile</b>
              <small style={{ color: '#64748b' }}>Configure your baseline objective track</small>
            </div>
          </div>
          <select 
            value={studyGoal} 
            onChange={(e) => {
              setStudyGoal(e.target.value)
              triggerSaveNotification('Study objective updated!')
            }}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem', outline: 'none' }}
          >
            <option value="JEE · Engineering entrance preparation">JEE · Engineering Entrance Prep</option>
            <option value="NEET · Medical entrance preparation">NEET · Medical Entrance Prep</option>
            <option value="CBSE Boards · High School Track">CBSE Boards · High School Track</option>
            <option value="General Science & Programming Core">General Science & Programming Core</option>
          </select>
        </div>

        {/* 2. Appearance Section */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ backgroundColor: '#f8fafc', color: '#475569', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <Settings size={18} />
            </span>
            <div>
              <b style={{ display: 'block', fontSize: '0.95rem' }}>Appearance</b>
              <small style={{ color: '#64748b' }}>Adjust app color scheme options</small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['light', 'dark', 'system'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTheme(t)
                  triggerSaveNotification(`Appearance changed to ${t} mode!`)
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: theme === t ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                  backgroundColor: theme === t ? '#eef2ff' : '#ffffff',
                  color: theme === t ? '#4f46e5' : '#334155',
                  fontWeight: theme === t ? 600 : 400,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Notifications Section */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ backgroundColor: '#fdf2f8', color: '#db2777', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                <Bell size={18} />
              </span>
              <div>
                <b style={{ display: 'block', fontSize: '0.95rem' }}>Notifications</b>
                <small style={{ color: '#64748b' }}>Daily study reminder sync triggers</small>
              </div>
            </div>
            <input 
              type="checkbox" 
              checked={notificationsEnabled}
              onChange={(e) => {
                setNotificationsEnabled(e.target.checked)
                triggerSaveNotification(e.target.checked ? 'Daily alerts armed!' : 'Reminders muted.')
              }}
              style={{ width: '40px', height: '20px', cursor: 'pointer' }}
            />
          </div>
          {notificationsEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Trigger Time:</span>
              <input 
                type="time" 
                value={reminderTime} 
                onChange={(e) => {
                  setReminderTime(e.target.value)
                  triggerSaveNotification(`Study reminder shifted to ${e.target.value}`)
                }}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>
          )}
        </div>

        {/* 4. Privacy & Security Section */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <ShieldCheck size={18} />
            </span>
            <div>
              <b style={{ display: 'block', fontSize: '0.95rem' }}>Privacy & Security</b>
              <small style={{ color: '#64748b' }}>Update account credential keys</small>
            </div>
          </div>
          <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={{ width: '100%', padding: '8px 36px 8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <input 
              type={showPassword ? 'text' : 'password'}
              placeholder="New Secure Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              required
            />
            <button 
              type="submit" 
              style={{ padding: '8px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}
            >
              Update Credentials
            </button>
          </form>
        </div>

        {/* 5. Subscription Premium Tier Box */}
        <div style={{ background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)', border: '1px solid #d8b4fe', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '8px', borderRadius: '8px', display: 'flex' }}>
              <CreditCard size={18} />
            </span>
            <div>
              <b style={{ display: 'block', fontSize: '0.95rem', color: '#581c87' }}>Subscription Plan</b>
              <small style={{ color: '#7e22ce', fontWeight: 500 }}>Free Basic Tier</small>
            </div>
          </div>
          <button 
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.2)'
            }}
            onClick={() => triggerSaveNotification("Redirecting to premium billing gate...")}
          >
            <Sparkles size={14}/> Upgrade Pro
          </button>
        </div>

      </div>
    </section>
  )
}