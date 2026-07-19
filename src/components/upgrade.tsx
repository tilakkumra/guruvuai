import { Sparkles, ArrowUp } from 'lucide-react'

export default function Upgrade() {
  return (
    <section className="content upgrade-page">
      <div className="upgrade-top">
        <span className="tag"><Sparkles size={14} /> STUDYLAP PRO</span>
        <h1>Make every study session count.</h1>
        <p>Unlock the complete AI learning experience and build your edge.</p>
      </div>
      <div className="pricing">
        <div className="price-card">
          <h3>Free</h3>
          <p>For getting started</p>
          <h2>₹0 <small>/ month</small></h2>
          <button className="secondary">Current plan</button>
          <ul>
            <li>20 AI questions per day</li>
            <li>5 flashcards per set</li>
            <li>Basic study tools</li>
          </ul>
        </div>
        <div className="price-card pro">
          <span className="popular">MOST POPULAR</span>
          <h3><Sparkles size={17} /> Pro</h3>
          <p>For serious learners</p>
          <h2>₹399 <small>/ month</small></h2>
          <button className="primary wide">Upgrade to Pro <ArrowUp size={16} /></button>
          <ul>
            <li>Unlimited AI tutor access</li>
            <li>Premium flashcards & video cards</li>
            <li>PDF tools & PYQ generator</li>
            <li>Priority AI speed</li>
          </ul>
        </div>
      </div>
    </section>
  )
}