'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, StopCircle, Trophy } from 'lucide-react';
import { startDebate, submitDebateTurn, endDebate, evaluateDebate, generateCoaching } from '../../lib/api';
import styles from './page.module.css';

export default function DebateArena() {
  const [session, setSession] = useState(null);
  const [topic, setTopic] = useState('');
  const [stance, setStance] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [format, setFormat] = useState('1-on-1');
  const [persona, setPersona] = useState('The Contrarian');
  
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  
  const [evaluation, setEvaluation] = useState(null);
  const [coaching, setCoaching] = useState(null);
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!topic || !stance) return;
    
    setLoading(true);
    try {
      const data = await startDebate(topic, stance, difficulty);
      setSession(data.session_id);
      setMessages([{ role: 'opponent', text: data.opening_statement }]);
    } catch (err) {
      alert(err.message || 'Failed to start debate.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || !session || loading) return;
    
    const userMsg = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    
    try {
      const data = await submitDebateTurn(session, userMsg);
      setMessages(prev => [...prev, { role: 'opponent', text: data.opponent_response }]);
    } catch (err) {
      alert(err.message || 'Failed to send message.');
      // Remove the optimistic user message on failure
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!session || evaluating) return;
    setEvaluating(true);
    
    try {
      const transcriptData = await endDebate(session);
      const evalData = await evaluateDebate(topic, transcriptData.transcript);
      setEvaluation(evalData);
      
      const coachingData = await generateCoaching(evalData);
      setCoaching(coachingData);
      
      setSession(null); // End session in UI
    } catch (err) {
      alert(err.message || 'Failed to evaluate debate.');
    } finally {
      setEvaluating(false);
    }
  };

  // 1. Setup State
  if (!session && !evaluation) {
    return (
      <div className={`animate-fade-in ${styles.container}`}>
        <header className={styles.header}>
          <div className={styles.iconWrapper}>
            <MessageSquare size={32} color="var(--accent-primary)" />
          </div>
          <div>
            <h1>Debate Setup</h1>
            <p>Configure your debate opponent, format, and step into the arena.</p>
          </div>
        </header>

        <form className={`glass-panel ${styles.setupForm}`} onSubmit={handleStart}>
          <div className={styles.formGroup}>
            <label htmlFor="topic">Debate Topic</label>
            <input 
              id="topic"
              className="input"
              placeholder="e.g., Artificial Intelligence will create more jobs than it destroys."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="stance">AI Opponent's Stance</label>
            <input 
              id="stance"
              className="input"
              placeholder="e.g., AI will cause massive unemployment."
              value={stance}
              onChange={e => setStance(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label htmlFor="format">Debate Format</label>
              <select 
                id="format"
                className="input"
                value={format}
                onChange={e => setFormat(e.target.value)}
              >
                <option value="1-on-1">1-on-1 Debate</option>
                <option value="Parliamentary">Parliamentary Debate</option>
                <option value="Oxford">Oxford Debate</option>
                <option value="Policy">Policy Debate</option>
                <option value="Public Forum">Public Forum Debate</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="persona">AI Persona</label>
              <select 
                id="persona"
                className="input"
                value={persona}
                onChange={e => setPersona(e.target.value)}
              >
                <option value="The Contrarian">The Contrarian (Challenges every premise)</option>
                <option value="The Academic">The Academic (Cites data & research)</option>
                <option value="The Strategist">The Strategist (Focuses on practical impact)</option>
              </select>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="difficulty">Difficulty Level</label>
            <select 
              id="difficulty"
              className="input"
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
            >
              <option value="beginner">Beginner (Gentle pushback)</option>
              <option value="intermediate">Intermediate (Logical counters)</option>
              <option value="advanced">Advanced (Aggressive scrutiny)</option>
            </select>
          </div>
          
          <div className={styles.setupActions}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><Loader2 size={18} className={styles.spin} /> Initializing...</> : 'Enter Arena'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // 3. Evaluation State
  if (evaluation) {
    return (
      <div className={`animate-fade-in ${styles.container}`}>
        <header className={styles.header}>
          <div className={styles.iconWrapper} style={{background: 'rgba(16, 185, 129, 0.1)'}}>
            <Trophy size={32} color="var(--success-color)" />
          </div>
          <div>
            <h1>Performance Evaluation</h1>
            <p>Review your debate metrics and coaching plan.</p>
          </div>
        </header>

        <div className={styles.evalGrid}>
          {/* Scores */}
          <div className={`glass-panel ${styles.evalCard}`}>
            <h3>Overall Score: {evaluation.overall_score}/100</h3>
            <div className={styles.scoreList}>
              {Object.entries(evaluation.scores).map(([key, value]) => (
                <div key={key} className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>{key.replace('_', ' ')}</span>
                  <div className={styles.scoreBarBg}>
                    <div className={styles.scoreBarFill} style={{width: `${value}%`}}></div>
                  </div>
                  <span className={styles.scoreVal}>{value}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Feedback */}
          <div className={`glass-panel ${styles.evalCard}`}>
            <h3>Key Moments</h3>
            <div className={styles.feedbackSection}>
              <h4 className={styles.textSuccess}>Strong Moments</h4>
              <ul>
                {evaluation.strong_moments.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              
              <h4 className={styles.textDanger}>Areas to Improve</h4>
              <ul>
                {evaluation.weak_moments.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </div>
        </div>

        {/* Coaching Plan */}
        {coaching && (
          <div className={`glass-panel ${styles.coachingCard}`}>
            <h3>Personalized Learning Plan</h3>
            <div className={styles.planContent}>
              <h4>Focus Area: {coaching.learning_plan.focus_area}</h4>
              <p>{coaching.learning_plan.explanation}</p>
              
              <h4>Recommended Exercises:</h4>
              <ul>
                {coaching.learning_plan.exercises?.map((ex, i) => <li key={i}>{ex}</li>)}
              </ul>
            </div>
            
            <button className="btn btn-secondary" onClick={() => { setEvaluation(null); setSession(null); setMessages([]); }}>
              Start New Debate
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Arena State
  return (
    <div className={`animate-fade-in ${styles.arenaContainer}`}>
      <div className={styles.arenaHeader}>
        <div className={styles.arenaMeta}>
          <h2>Debate Arena</h2>
          <span className="badge badge-info">{difficulty}</span>
        </div>
        <button className={`btn btn-secondary ${styles.btnDanger}`} onClick={handleEnd} disabled={evaluating || loading}>
          {evaluating ? <><Loader2 size={16} className={styles.spin}/> Evaluating...</> : <><StopCircle size={16}/> End & Evaluate</>}
        </button>
      </div>

      <div className={`glass-panel ${styles.chatWindow}`}>
        <div className={styles.messagesArea}>
          <div className={styles.topicBanner}>
            <strong>Topic:</strong> {topic}
          </div>
          
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.wrapperUser : styles.wrapperOpponent}`}>
              <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.bubbleUser : styles.bubbleOpponent}`}>
                <div className={styles.messageRole}>{msg.role === 'user' ? 'You' : 'AI Opponent'}</div>
                <div className={styles.messageText}>{msg.text}</div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className={`${styles.messageWrapper} ${styles.wrapperOpponent}`}>
              <div className={`${styles.messageBubble} ${styles.bubbleOpponent} ${styles.typing}`}>
                <Loader2 size={16} className={styles.spin} /> AI is thinking...
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input 
            type="text" 
            className={`input ${styles.chatInput}`} 
            placeholder="Type your argument..." 
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            disabled={loading || evaluating}
          />
          <button type="submit" className={`btn btn-primary ${styles.sendBtn}`} disabled={!inputValue.trim() || loading || evaluating}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
