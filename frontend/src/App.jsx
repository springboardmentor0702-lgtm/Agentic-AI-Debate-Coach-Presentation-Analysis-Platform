import React, { useState, useEffect, useRef } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Learner');

  // Dashboard state
  const [dashData, setDashData] = useState(null);

  // Recommendation Engine state
  const [recExp, setRecExp] = useState('Intermediate');
  const [recTarget, setRecTarget] = useState('Debate & Logical Reasoning');
  const [recRes, setRecRes] = useState(null);
  const [recLoading, setRecLoading] = useState(false);

  // Argument Analysis state
  const [argTopic, setArgTopic] = useState('');
  const [argPos, setArgPos] = useState('Pro');
  const [argText, setArgText] = useState('');
  const [argRes, setArgRes] = useState(null);
  const [argLoading, setArgLoading] = useState(false);

  // Counterargument Engine state
  const [counterTopic, setCounterTopic] = useState('');
  const [counterArg, setCounterArg] = useState('');
  const [counterType, setCounterType] = useState('Logical');
  const [counterRes, setCounterRes] = useState(null);
  const [counterLoading, setCounterLoading] = useState(false);

  // Presentation Analytics state
  const [presText, setPresText] = useState('');
  const [presDuration, setPresDuration] = useState(60);
  const [presFillers, setPresFillers] = useState(3);
  const [presRes, setPresRes] = useState(null);
  const [presLoading, setPresLoading] = useState(false);

  // AI Debate Simulation state
  const [simTopic, setSimTopic] = useState('Online Learning vs Classroom Learning');
  const [simPos, setSimPos] = useState('Pro');
  const [simText, setSimText] = useState('');
  const [simChat, setSimChat] = useState([]);
  const [simLoading, setSimLoading] = useState(false);

  // Reports & Export System State
  const [reportsData, setReportsData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Speech Recording State & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingField, setRecordingField] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleAuth = async (e) => {
    e.preventDefault();
    const formData = new URLSearchParams({ username, password });
    try {
      const res = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
      } else {
        alert('Authentication failed. Check credentials.');
      }
    } catch (err) {
      alert('Cannot reach backend server at http://127.0.0.1:8000');
    }
  };

  const fetchDashboard = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/dashboard?role=${role}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        setToken('');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setDashData(data);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
  };

  const fetchReports = async () => {
    if (!token) return;
    setReportsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReportsData(data);
      }
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDashboard();
      fetchReports();
    }
  }, [token, role]);

  // Voice Recording Handler
  const startRecording = async (fieldSetter, fieldName) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice_input.webm');

        try {
          const res = await fetch(`${API_BASE}/api/transcribe-audio`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            fieldSetter((prev) => (prev ? prev + ' ' + data.text : data.text));
          }
        } catch (err) {
          console.error('Audio transcription error:', err);
        }

        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setRecordingField(null);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingField(fieldName);
    } catch (err) {
      alert('Microphone access denied or unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const toggleRecording = (fieldSetter, fieldName) => {
    if (isRecording && recordingField === fieldName) {
      stopRecording();
    } else {
      if (isRecording) stopRecording();
      startRecording(fieldSetter, fieldName);
    }
  };

  const handleFileUpload = (e, fieldSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => fieldSetter(event.target.result);
    reader.readAsText(file);
  };

  // Submit Handlers
  const handleGetRecommendations = async (e) => {
    if (e) e.preventDefault();
    setRecLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_role: role, experience_level: recExp, target_area: recTarget })
      });
      if (res.ok) {
        const data = await res.json();
        setRecRes(data);
      }
    } catch (err) {
      console.error('Recommendations Fetch Error:', err);
    } finally {
      setRecLoading(false);
    }
  };

  const handleAnalyzeArgument = async (e) => {
    e.preventDefault();
    setArgLoading(true);
    const res = await fetch(`${API_BASE}/api/analyze-argument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ topic: argTopic, position: argPos, argument_text: argText })
    });
    const data = await res.json();
    setArgRes(data);
    setArgLoading(false);
  };

  const handleGenerateCounter = async (e) => {
    e.preventDefault();
    setCounterLoading(true);
    const res = await fetch(`${API_BASE}/api/generate-counterargument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ topic: counterTopic, argument_text: counterArg, counter_type: counterType })
    });
    const data = await res.json();
    setCounterRes(data);
    setCounterLoading(false);
  };

  const handleAnalyzePresentation = async (e) => {
    e.preventDefault();
    setPresLoading(true);
    const res = await fetch(`${API_BASE}/api/analyze-presentation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ speech_text: presText, audio_duration_seconds: parseFloat(presDuration), filler_word_count: parseInt(presFillers) })
    });
    const data = await res.json();
    setPresRes(data);
    setPresLoading(false);
  };

  const handleSimTurn = async (e) => {
    e.preventDefault();
    if (!simText.trim()) return;

    setSimLoading(true);
    const userMessage = { sender: 'User', text: simText };
    const updatedHistory = [...simChat, userMessage];

    setSimChat(updatedHistory);
    const currentTurnInput = simText;
    setSimText('');

    try {
      const res = await fetch(`${API_BASE}/api/simulate-opponent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          topic: simTopic || 'General Debate',
          user_position: simPos,
          user_statement: currentTurnInput,
          chat_history: updatedHistory
        })
      });

      if (res.ok) {
        const data = await res.json();
        let formattedReply = data.ai_opponent_rebuttal || '';
        if (data.challenge_question) {
          formattedReply += `\n\n🎯 Cross-Examination: ${data.challenge_question}`;
        }
        setSimChat([...updatedHistory, { sender: 'AI Opponent', text: formattedReply }]);
      }
    } catch (err) {
      console.error('Debate Simulation Error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  const downloadPDFReport = () => {
    window.print();
  };

  const downloadCSVReport = () => {
    let csvContent = "data:text/csv;charset=utf-8,Sender,Statement\n";
    simChat.forEach((msg) => {
      const escapedText = `"${msg.text.replace(/"/g, '""')}"`;
      csvContent += `${msg.sender},${escapedText}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Debate_History_${simTopic.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportExcelReport = () => {
    if (!reportsData) return;
    let csvContent = "data:text/csv;charset=utf-8,Category,Metric/Topic,Details/Score\n";
    
    // Debate Reports
    reportsData.debate_reports.forEach(r => {
      csvContent += `Debate Report,"${r.topic}","Score: ${r.score}% | Fallacies: ${r.fallacies_detected}"\n`;
    });
    // Presentation Analysis Reports
    reportsData.presentation_reports.forEach(p => {
      csvContent += `Presentation Report,"${p.title}","Pace: ${p.pace_wpm} WPM | Clarity: ${p.clarity}%"\n`;
    });
    // Performance Score Reports
    reportsData.performance_scores.forEach(s => {
      csvContent += `Performance Score,"${s.category}","Score: ${s.score}%"\n`;
    });
    // Coaching Reports
    reportsData.coaching_reports.forEach(c => {
      csvContent += `Coaching Report,"Focus: ${c.area}","Insight: ${c.insight}"\n`;
    });
    // Learning Progress Reports
    reportsData.learning_progress.forEach(l => {
      csvContent += `Learning Progress,"${l.module}","Status: ${l.status} (${l.completion}%)"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reports_Export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TextActionControls = ({ fieldSetter, fieldName }) => (
    <div className="flex gap-2 mb-1 justify-end">
      <button
        type="button"
        onClick={() => toggleRecording(fieldSetter, fieldName)}
        className={`text-xs px-2.5 py-1 rounded border transition flex items-center gap-1 ${
          isRecording && recordingField === fieldName
            ? 'bg-red-600 text-white border-red-500 animate-pulse'
            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
        }`}
      >
        🎙️ {isRecording && recordingField === fieldName ? 'Recording...' : 'Voice Input'}
      </button>
      <label className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded cursor-pointer transition flex items-center gap-1">
        📁 File
        <input type="file" accept=".txt" onChange={(e) => handleFileUpload(e, fieldSetter)} className="hidden" />
      </label>
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-slate-100">
        <form onSubmit={handleAuth} className="bg-slate-800 p-8 rounded-2xl max-w-md w-full border border-slate-700 space-y-4">
          <h1 className="text-2xl font-bold text-center text-white">Agentic AI Debate Coach</h1>
          <p className="text-xs text-slate-400 text-center">Sign in to access debate & presentation analysis tools</p>
          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">Username</label>
            <input type="text" required value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-900 p-2.5 rounded border border-slate-700 text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-900 p-2.5 rounded border border-slate-700 text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase text-slate-400 mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full bg-slate-900 p-2.5 rounded border border-slate-700 text-sm">
              <option value="Learner">Learner</option>
              <option value="Debate Coach">Debate Coach</option>
              <option value="Educator">Educator</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded transition">Sign In</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 p-4 sticky top-0 backdrop-blur z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-lg text-white">Agentic AI Debate Platform</span>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">{role}</span>
          </div>
          <button onClick={() => { localStorage.removeItem('token'); setToken(''); }} className="bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs px-3 py-1.5 rounded border border-red-500/30">Sign Out</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="flex space-x-2 border-b border-slate-800 mb-8 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Analytics Dashboard' },
            { id: 'argument', label: 'Argument Analyzer' },
            { id: 'counter', label: 'Counterargument Engine' },
            { id: 'presentation', label: 'Presentation Analytics' },
            { id: 'simulation', label: 'AI Debate Simulation' },
            { id: 'recommendation', label: 'Recommendation & Coaching' },
            { id: 'reports', label: 'Reports & Export System' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition ${
                activeTab === tab.id ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && dashData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Total Debates</p>
                <p className="text-3xl font-bold text-indigo-400 mt-2">{dashData.total_debates}</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Average Performance Score</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">{dashData.average_score}%</p>
              </div>
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800">
                <p className="text-xs text-slate-400 uppercase font-semibold">Improvement Rate</p>
                <p className="text-3xl font-bold text-amber-400 mt-2">{dashData.improvement_rate}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4">Weighted Skill Model Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(dashData.skill_breakdown).map(([skill, val]) => (
                    <div key={skill}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{skill}</span>
                        <span className="text-indigo-400 font-bold">{val}%</span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${val}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4">Recent Session Activity</h3>
                <div className="space-y-3">
                  {dashData.recent_activity.map((act, i) => (
                    <div key={i} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                      <div>
                        <p className="font-semibold text-slate-200">{act.topic}</p>
                        <p className="text-slate-500 mt-0.5">{act.date}</p>
                      </div>
                      <span className="text-indigo-400 font-bold text-sm">{act.score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. ARGUMENT ANALYZER TAB */}
        {activeTab === 'argument' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white">Argument & Fallacy Analyzer</h2>
              <form onSubmit={handleAnalyzeArgument} className="space-y-4">
                <input type="text" required value={argTopic} onChange={(e) => setArgTopic(e.target.value)} placeholder="Topic e.g. Universal Basic Income" className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm" />
                <TextActionControls fieldSetter={setArgText} fieldName="argText" />
                <textarea rows="4" required value={argText} onChange={(e) => setArgText(e.target.value)} placeholder="Enter argument statement..." className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm"></textarea>
                <button type="submit" disabled={argLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded text-sm font-bold">{argLoading ? 'Analyzing...' : 'Analyze Argument'}</button>
              </form>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h2 className="text-lg font-bold text-white mb-4">Evaluation Results</h2>
              {argRes && (
                <div className="space-y-4 text-xs">
                  <p className="text-xl font-bold text-indigo-400">Overall Weighted Score: {argRes.weighted_overall_score}%</p>
                  
                  {argRes.criteria_scores && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded border border-slate-800">
                      {Object.entries(argRes.criteria_scores).map(([crit, val]) => (
                        <div key={crit} className="flex justify-between border-b border-slate-800 pb-1">
                          <span className="text-slate-400">{crit}</span>
                          <span className="font-bold text-emerald-400">{val}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <h3 className="font-bold text-slate-200 pt-2">Detected Fallacies</h3>
                  {argRes.detected_fallacies.map((f, i) => (
                    <div key={i} className="bg-red-500/10 border border-red-500/20 p-3 rounded">
                      <p className="font-bold text-red-300">{f.fallacy_type}</p>
                      <p className="text-slate-300 mt-1">{f.explanation}</p>
                      <p className="text-emerald-400 mt-1 font-semibold">💡 Correction: {f.correction_suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. COUNTERARGUMENT ENGINE TAB */}
        {activeTab === 'counter' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white">Counterargument Strategy Engine</h2>
              <form onSubmit={handleGenerateCounter} className="space-y-4">
                <input type="text" required value={counterTopic} onChange={(e) => setCounterTopic(e.target.value)} placeholder="Topic e.g. Carbon Tax" className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm" />
                <select value={counterType} onChange={(e) => setCounterType(e.target.value)} className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm">
                  <option value="Logical">Logical Rebuttal</option>
                  <option value="Evidence-Based">Evidence-Based Rebuttal</option>
                  <option value="Ethical">Ethical Counterargument</option>
                  <option value="Practical">Practical Counterargument</option>
                  <option value="Policy">Policy Counterargument</option>
                </select>
                <TextActionControls fieldSetter={setCounterArg} fieldName="counterArg" />
                <textarea rows="4" required value={counterArg} onChange={(e) => setCounterArg(e.target.value)} placeholder="Enter opponent claim..." className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm"></textarea>
                <button type="submit" disabled={counterLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded text-sm font-bold">{counterLoading ? 'Generating...' : 'Generate Counterargument'}</button>
              </form>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h2 className="text-lg font-bold text-white mb-4">Generated Strategy</h2>
              {counterRes && (
                <div className="space-y-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded border border-slate-800">
                    <span className="font-bold text-indigo-400 block mb-1">Direct Rebuttal ({counterRes.counter_type})</span>
                    <p className="text-slate-300 whitespace-pre-wrap">{counterRes.rebuttal}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800">
                    <span className="font-bold text-emerald-400 block mb-1">Alternative Perspective</span>
                    <p className="text-slate-300">{counterRes.alternative_perspective}</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded border border-slate-800">
                    <span className="font-bold text-amber-400 block mb-1">Cross-Examination Challenge</span>
                    <p className="text-slate-300">{counterRes.challenge_question}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. PRESENTATION ANALYTICS TAB */}
        {activeTab === 'presentation' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
              <h2 className="text-lg font-bold text-white">Presentation Analytics</h2>
              <form onSubmit={handleAnalyzePresentation} className="space-y-4">
                <TextActionControls fieldSetter={setPresText} fieldName="presText" />
                <textarea rows="4" required value={presText} onChange={(e) => setPresText(e.target.value)} placeholder="Paste or record speech transcript..." className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm"></textarea>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" required value={presDuration} onChange={(e) => setPresDuration(e.target.value)} placeholder="Duration (seconds)" className="bg-slate-950 p-3 rounded border border-slate-800 text-sm" />
                  <input type="number" required value={presFillers} onChange={(e) => setPresFillers(e.target.value)} placeholder="Filler count" className="bg-slate-950 p-3 rounded border border-slate-800 text-sm" />
                </div>
                <button type="submit" disabled={presLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded text-sm font-bold">{presLoading ? 'Analyzing...' : 'Analyze Speech'}</button>
              </form>
            </div>
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
              <h2 className="text-lg font-bold text-white mb-4">Speech Metrics</h2>
              {presRes && (
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded border border-slate-800"><p className="text-slate-400">Speech Pace</p><p className="text-2xl font-bold text-indigo-400 mt-1">{presRes.speech_pace_wpm} WPM</p></div>
                  <div className="bg-slate-950 p-4 rounded border border-slate-800"><p className="text-slate-400">Filler Ratio</p><p className="text-2xl font-bold text-amber-400 mt-1">{presRes.filler_word_ratio}%</p></div>
                  <div className="bg-slate-950 p-4 rounded border border-slate-800"><p className="text-slate-400">Confidence</p><p className="text-2xl font-bold text-emerald-400 mt-1">{presRes.confidence_score}%</p></div>
                  <div className="bg-slate-950 p-4 rounded border border-slate-800"><p className="text-slate-400">Clarity Score</p><p className="text-2xl font-bold text-indigo-400 mt-1">{presRes.clarity_score}%</p></div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. AI DEBATE SIMULATION TAB */}
        {activeTab === 'simulation' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Dynamic AI Debate Simulation Engine</h2>
              {simChat.length > 0 && (
                <div className="flex gap-2">
                  <button onClick={downloadPDFReport} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded transition font-semibold">
                    📄 Export PDF
                  </button>
                  <button onClick={downloadCSVReport} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded transition font-semibold">
                    📊 Export CSV/Excel
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input type="text" value={simTopic} onChange={(e) => setSimTopic(e.target.value)} placeholder="Debate Topic" className="bg-slate-950 p-2.5 rounded border border-slate-800 text-sm" />
              <select value={simPos} onChange={(e) => setSimPos(e.target.value)} className="bg-slate-950 p-2.5 rounded border border-slate-800 text-sm">
                <option value="Pro">Your Stance: Pro / Affirmative</option>
                <option value="Con">Your Stance: Con / Negative</option>
              </select>
            </div>

            <div className="h-96 bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-y-auto space-y-3">
              {simChat.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-28">Deliver your opening argument or turn statement below to begin the live debate round.</p>
              ) : (
                simChat.map((m, i) => (
                  <div key={i} className={`p-3.5 rounded-lg text-xs leading-relaxed ${m.sender === 'User' ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 ml-auto max-w-[80%]' : 'bg-slate-900 border border-slate-800 text-slate-200 max-w-[85%]'}`}>
                    <span className="font-bold block mb-1 uppercase text-[10px] text-slate-400">{m.sender}</span>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSimTurn} className="space-y-2">
              <TextActionControls fieldSetter={setSimText} fieldName="simText" />
              <div className="flex gap-2">
                <input type="text" required value={simText} onChange={(e) => setSimText(e.target.value)} placeholder="Deliver your turn statement or rebuttal..." className="flex-1 bg-slate-950 border border-slate-800 p-3 rounded text-sm" />
                <button type="submit" disabled={simLoading} className="bg-indigo-600 hover:bg-indigo-500 px-6 rounded text-sm font-bold">{simLoading ? 'Debating...' : 'Send Turn'}</button>
              </div>
            </form>
          </div>
        )}

        {/* 6. RECOMMENDATION & COACHING TAB */}
        {activeTab === 'recommendation' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Recommendation & Coaching Engine</h2>
                <p className="text-xs text-slate-400 mt-1">Get custom coaching insights, learning pathways, and drills based on your progress.</p>
              </div>
              <button 
                onClick={handleGetRecommendations} 
                disabled={recLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-5 py-2.5 rounded transition"
              >
                {recLoading ? 'Generating Insights...' : 'Generate Coaching Plan'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Experience Level</label>
                <select 
                  value={recExp} 
                  onChange={(e) => setRecExp(e.target.value)} 
                  className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-400 mb-1">Target Focus Area</label>
                <select 
                  value={recTarget} 
                  onChange={(e) => setRecTarget(e.target.value)} 
                  className="w-full bg-slate-950 p-3 rounded border border-slate-800 text-sm"
                >
                  <option value="Debate & Logical Reasoning">Debate & Logical Reasoning</option>
                  <option value="Presentation & Delivery">Presentation & Delivery</option>
                  <option value="Counterargument & Rebuttals">Counterargument & Rebuttals</option>
                </select>
              </div>
            </div>

            {recRes && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 text-xs">
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-indigo-400 text-sm block border-b border-slate-800 pb-2">Personalized Coaching Feedback</span>
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{recRes.personalized_feedback}</p>
                </div>
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-emerald-400 text-sm block border-b border-slate-800 pb-2">Learning Path Generation</span>
                  <ul className="space-y-3 text-slate-300 pt-1">
                    {recRes.learning_path.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="text-emerald-500 font-bold">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-bold text-amber-400 text-sm block border-b border-slate-800 pb-2">Recommended Exercises</span>
                  <ul className="space-y-3 text-slate-300 pt-1">
                    {recRes.recommended_exercises.map((item, idx) => (
                      <li key={idx} className="flex gap-2 items-start">
                        <span className="text-amber-500 font-bold">🎯</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. REPORTS & EXPORT SYSTEM TAB */}
        {activeTab === 'reports' && (
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Reports & Export System</h2>
                <p className="text-xs text-slate-400 mt-1">Generate comprehensive system performance, analysis, coaching, and progress reports.</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={downloadPDFReport}
                  className="bg-indigo-600 hover:bg-indigo-500 text-xs font-bold px-4 py-2 rounded transition flex items-center gap-1.5"
                >
                  📄 PDF export
                </button>
                <button 
                  onClick={exportExcelReport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-xs font-bold px-4 py-2 rounded transition flex items-center gap-1.5"
                >
                  📊 Excel export
                </button>
              </div>
            </div>

            {reportsLoading ? (
              <p className="text-xs text-slate-400 py-8 text-center">Loading reporting analytics...</p>
            ) : reportsData ? (
              <div className="space-y-6">
                {/* Debate Reports & Presentation Analysis Reports */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-indigo-400 text-sm border-b border-slate-800 pb-2">Debate reports</h3>
                    <div className="space-y-2 text-xs">
                      {reportsData.debate_reports.map((rep, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-200">{rep.topic}</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">Fallacies: {rep.fallacies_detected}</p>
                          </div>
                          <span className="font-bold text-emerald-400">{rep.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-emerald-400 text-sm border-b border-slate-800 pb-2">Presentation analysis reports</h3>
                    <div className="space-y-2 text-xs">
                      {reportsData.presentation_reports.map((rep, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-200">{rep.title}</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">Pace: {rep.pace_wpm} WPM | Fillers: {rep.filler_ratio}%</p>
                          </div>
                          <span className="font-bold text-indigo-400">{rep.clarity}% Clarity</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Performance score reports & Coaching reports */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-amber-400 text-sm border-b border-slate-800 pb-2">Performance score reports</h3>
                    <div className="space-y-2 text-xs">
                      {reportsData.performance_scores.map((score, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-slate-900 rounded border border-slate-800">
                          <span className="text-slate-300">{score.category}</span>
                          <span className="font-bold text-amber-400">{score.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                    <h3 className="font-bold text-sky-400 text-sm border-b border-slate-800 pb-2">Coaching reports</h3>
                    <div className="space-y-2 text-xs">
                      {reportsData.coaching_reports.map((coach, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded border border-slate-800 space-y-1">
                          <p className="font-semibold text-slate-200">{coach.area}</p>
                          <p className="text-slate-400">{coach.insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Learning progress reports */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h3 className="font-bold text-purple-400 text-sm border-b border-slate-800 pb-2">Learning progress reports</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {reportsData.learning_progress.map((prog, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded border border-slate-800 space-y-2">
                        <p className="font-semibold text-slate-200">{prog.module}</p>
                        <div className="flex justify-between text-slate-400 text-[11px]">
                          <span>Status: {prog.status}</span>
                          <span className="font-bold text-indigo-400">{prog.completion}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${prog.completion}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}