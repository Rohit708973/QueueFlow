import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Activity, ArrowDown, ArrowUp, Bell, Check, CheckCircle2, ChevronDown, Clock3,
  LayoutDashboard, LogOut, Menu, Plus, Search, Settings2, Ticket, Trash2,
  Users, X, Zap, CalendarDays, CircleHelp, MoreHorizontal
} from 'lucide-react';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const STORE_KEY = 'queueflow-demo-data-v1';
const initialData = [
  { id: 'q1', name: 'General Enquiries', created_at: new Date().toISOString(), owner_id: 'demo', tokens: [
    { id: 't1', number: 101, name: 'Aarav Kumar', status: 'waiting', created_at: new Date(Date.now()-18*60000).toISOString(), position: 0 },
    { id: 't2', number: 102, name: 'Priya Sharma', status: 'waiting', created_at: new Date(Date.now()-12*60000).toISOString(), position: 1 },
    { id: 't3', number: 103, name: 'Rahul Verma', status: 'waiting', created_at: new Date(Date.now()-7*60000).toISOString(), position: 2 },
    { id: 't4', number: 104, name: 'Ananya Reddy', status: 'waiting', created_at: new Date(Date.now()-3*60000).toISOString(), position: 3 },
  ]},
  { id: 'q2', name: 'Customer Support', created_at: new Date().toISOString(), owner_id: 'demo', tokens: [
    { id: 't5', number: 201, name: 'Kiran Das', status: 'waiting', created_at: new Date(Date.now()-9*60000).toISOString(), position: 0 },
    { id: 't6', number: 202, name: 'Meera Nair', status: 'waiting', created_at: new Date(Date.now()-4*60000).toISOString(), position: 1 },
  ]}
];
const readDemo = () => { try { const value = JSON.parse(localStorage.getItem(STORE_KEY)); return value || initialData; } catch { return initialData; } };
const saveDemo = (data) => localStorage.setItem(STORE_KEY, JSON.stringify(data));
const avgWait = (tokens) => { const done = tokens.filter(t => t.status === 'served'); if (!done.length) return 0; return Math.round(done.reduce((sum,t) => sum + (t.wait_minutes || 0),0) / done.length); };
const timeAgo = (date) => { const mins = Math.max(0, Math.floor((Date.now()-new Date(date).getTime())/60000)); return mins < 1 ? 'Just now' : `${mins} min ago`; };

export default function App() {
  const demoMode = !supabase;
  const [session, setSession] = useState(null);
  const [profileName, setProfileName] = useState('Queue Manager');
  const [queues, setQueues] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(!demoMode);
  const [authMode, setAuthMode] = useState('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [queueName, setQueueName] = useState('');
  const [personName, setPersonName] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);

  const selectedQueue = queues.find(q => q.id === selectedId) || queues[0];
  const allTokens = queues.flatMap(q => q.tokens || []);
  const waitingCount = allTokens.filter(t => t.status === 'waiting').length;
  const servedCount = allTokens.filter(t => t.status === 'served').length;
  const cancelledCount = allTokens.filter(t => t.status === 'cancelled').length;
  const averageWait = avgWait(allTokens);
  const todayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());

  useEffect(() => {
    if (demoMode) {
      const saved = readDemo(); setQueues(saved); setSelectedId(saved[0]?.id || ''); setLoading(false); return;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (demoMode) { saveDemo(queues); return; }
    if (session?.user) loadQueues();
    else { setQueues([]); setLoading(false); }
  }, [session]);

  async function loadQueues() {
    setLoading(true);
    const { data, error } = await supabase.from('queues').select('*, tokens(*)').order('created_at', { ascending: true });
    if (error) setNotice(error.message);
    else {
      const formatted = (data || []).map(q => ({ ...q, tokens: (q.tokens || []).sort((a,b) => a.position-b.position) }));
      setQueues(formatted); setSelectedId(current => formatted.some(q => q.id === current) ? current : (formatted[0]?.id || ''));
    }
    setLoading(false);
  }

  function updateQueues(updater) {
    setQueues(current => {
      const next = typeof updater === 'function' ? updater(current) : updater;
      if (demoMode) saveDemo(next);
      return next;
    });
  }

  async function handleAuth(e) {
    e.preventDefault(); setAuthError('');
    if (!supabase) return;
    const result = authMode === 'signup'
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword, options: { data: { full_name: authName } } })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
    if (result.error) setAuthError(result.error.message);
    else if (authMode === 'signup' && !result.data.session) setAuthError('Account created. Please check your email to confirm your account.');
    else setProfileName(result.data.user?.user_metadata?.full_name || authEmail.split('@')[0] || 'Queue Manager');
  }

  async function addQueue(e) {
    e.preventDefault(); if (!queueName.trim()) return;
    if (demoMode) {
      const q = { id: crypto.randomUUID(), name: queueName.trim(), created_at: new Date().toISOString(), owner_id: 'demo', tokens: [] };
      updateQueues(current => [...current, q]); setSelectedId(q.id);
    } else {
      const { data, error } = await supabase.from('queues').insert({ name: queueName.trim(), owner_id: session.user.id }).select('*, tokens(*)').single();
      if (error) return setNotice(error.message);
      updateQueues(current => [...current, { ...data, tokens: [] }]); setSelectedId(data.id);
    }
    setQueueName(''); setShowQueueModal(false); setActiveTab('Queue'); setNotice('Queue created successfully.');
  }

  async function addToken(e) {
    e.preventDefault(); if (!personName.trim() || !selectedQueue) return;
    const currentTokens = selectedQueue.tokens || [];
    const nextNumber = currentTokens.reduce((max,t) => Math.max(max, Number(t.number) || 0), 100) + 1;
    const token = { id: crypto.randomUUID(), queue_id: selectedQueue.id, number: nextNumber, name: personName.trim(), status: 'waiting', created_at: new Date().toISOString(), position: currentTokens.length };
    if (!demoMode) {
      const { data, error } = await supabase.from('tokens').insert({ queue_id: selectedQueue.id, number: nextNumber, name: token.name, status: 'waiting', position: token.position }).select().single();
      if (error) return setNotice(error.message);
      token.id = data.id;
    }
    updateQueues(current => current.map(q => q.id === selectedQueue.id ? { ...q, tokens: [...q.tokens, token] } : q));
    setPersonName(''); setShowTokenModal(false); setNotice(`Token #${nextNumber} added to the queue.`);
  }

  async function changeTokenStatus(token, status) {
    const wait = Math.max(0, Math.round((Date.now()-new Date(token.created_at).getTime())/60000));
    if (!demoMode) {
      const { error } = await supabase.from('tokens').update({ status, wait_minutes: status === 'served' ? wait : null }).eq('id', token.id);
      if (error) return setNotice(error.message);
    }
    updateQueues(current => current.map(q => ({ ...q, tokens: q.tokens.map(t => t.id === token.id ? { ...t, status, wait_minutes: status === 'served' ? wait : t.wait_minutes } : t) })));
    setNotice(status === 'served' ? `Token #${token.number} sent for service.` : `Token #${token.number} cancelled.`);
  }

  async function moveToken(token, direction) {
    const list = [...(selectedQueue?.tokens || [])].filter(t => t.status === 'waiting').sort((a,b) => a.position-b.position);
    const index = list.findIndex(t => t.id === token.id); const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const first = list[index], second = list[target];
    if (!demoMode) {
      const results = await Promise.all([
        supabase.from('tokens').update({ position: second.position }).eq('id', first.id),
        supabase.from('tokens').update({ position: first.position }).eq('id', second.id)
      ]);
      const error = results.find(r => r.error)?.error; if (error) return setNotice(error.message);
    }
    updateQueues(current => current.map(q => q.id === selectedQueue.id ? { ...q, tokens: q.tokens.map(t => t.id === first.id ? { ...t, position: second.position } : t.id === second.id ? { ...t, position: first.position } : t).sort((a,b) => a.position-b.position) } : q));
  }

  async function signOut() { if (supabase) await supabase.auth.signOut(); else { setNotice('You are using demo mode.'); } }
  const sortedTokens = useMemo(() => (selectedQueue?.tokens || []).filter(t => t.status === 'waiting').sort((a,b) => a.position-b.position), [selectedQueue]);
  const filteredTokens = sortedTokens.filter(t => `${t.name} ${t.number}`.toLowerCase().includes(search.toLowerCase()));
  const recentServed = allTokens.filter(t => t.status === 'served').slice(-5).reverse();

  if (!demoMode && !session) return <div className="auth-screen"><div className="auth-card"><div className="brand-mark"><Zap size={21} fill="currentColor" /></div><p className="eyebrow">QUEUEFLOW WORKSPACE</p><h1>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h1><p className="muted">Sign in to manage your service queues.</p><form onSubmit={handleAuth} className="auth-form">{authMode === 'signup' && <label>Full name<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your name" required /></label>}<label>Email address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required /></label><label>Password<input type="password" minLength="6" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 6 characters" required /></label>{authError && <p className="error-text">{authError}</p>}<button className="primary-btn full-btn">{authMode === 'login' ? 'Sign in' : 'Create account'}</button></form><p className="auth-switch">{authMode === 'login' ? 'New to QueueFlow?' : 'Already have an account?'} <button onClick={()=>{setAuthMode(authMode==='login'?'signup':'login');setAuthError('');}}>{authMode === 'login' ? 'Create account' : 'Sign in'}</button></p></div></div>;

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Zap size={20} fill="currentColor" /></div><span>queueflow</span><span className="brand-dot">.</span></div>
      <div className="workspace-label">WORKSPACE</div><div className="workspace-card"><div className="workspace-avatar">{(profileName || 'Q')[0].toUpperCase()}</div><div><strong>{demoMode ? 'Demo workspace' : profileName}</strong><small>Queue manager</small></div><ChevronDown size={15} /></div>
      <div className="nav-label">MENU</div>
      <nav className="nav-list">{[{name:'Overview',icon:LayoutDashboard},{name:'Queue',icon:Ticket},{name:'Analytics',icon:Activity}].map(item=><button key={item.name} className={`nav-item ${activeTab===item.name?'active':''}`} onClick={()=>{setActiveTab(item.name);setMobileMenu(false);}}><item.icon size={18}/>{item.name}{item.name==='Queue' && <span className="nav-count">{waitingCount}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><strong>Need a hand?</strong><p>Manage your queues with ease.</p><button onClick={()=>setNotice('Tip: Add a queue, then add people to start managing tokens.')}>Quick tips <span>↗</span></button></div><button className="nav-item logout" onClick={signOut}><LogOut size={18}/>{demoMode?'Demo mode':'Sign out'}</button><div className="sidebar-footer">QUEUEFLOW <span>v1.0.0</span></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu-btn" onClick={()=>setMobileMenu(!mobileMenu)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{activeTab}</b></div><div className="top-actions"><span className="today"><CalendarDays size={15}/>{todayLabel}</span><button className="icon-btn" onClick={()=>setNotice('You are all caught up.')} aria-label="Notifications"><Bell size={18}/><i/></button><div className="top-avatar">{(profileName || 'Q')[0].toUpperCase()}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>{activeTab === 'Overview' ? 'Good afternoon 👋' : activeTab === 'Queue' ? 'Queue management' : 'Analytics overview'}</h1><p className="muted">{activeTab === 'Overview' ? 'Here’s what’s happening with your queues today.' : activeTab === 'Queue' ? 'Manage people waiting and keep service moving.' : 'A quick look at your queue performance.'}</p></div><div className="heading-actions"><span className={`mode-pill ${demoMode?'demo':'live'}`}><span/>{demoMode?'DEMO PREVIEW':'LIVE WORKSPACE'}</span><button className="primary-btn" onClick={()=>setShowQueueModal(true)}><Plus size={17}/> Create queue</button></div></div>
        {notice && <div className="notice"><CheckCircle2 size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
        {loading ? <div className="loading">Loading your queues...</div> : <>
        {activeTab === 'Overview' && <>
          <section className="stats-grid"><StatCard icon={Users} label="People waiting" value={waitingCount} foot="Across all queues" tone="blue"/><StatCard icon={CheckCircle2} label="Served today" value={servedCount} foot="Successfully completed" tone="green"/><StatCard icon={Clock3} label="Average wait" value={`${averageWait} min`} foot="Based on served tokens" tone="orange"/><StatCard icon={Ticket} label="Active queues" value={queues.length} foot="Queues in your workspace" tone="purple"/></section>
          <div className="content-grid"><section className="panel queue-panel"><div className="panel-heading"><div><h2>Your queues</h2><p>Keep track of each service line.</p></div><button className="text-btn" onClick={()=>setActiveTab('Queue')}>View all <span>→</span></button></div><div className="queue-list">{queues.length ? queues.map(q=><button className={`queue-row ${selectedId===q.id?'selected':''}`} key={q.id} onClick={()=>{setSelectedId(q.id);setActiveTab('Queue');}}><div className="queue-symbol"><Ticket size={18}/></div><div className="queue-info"><strong>{q.name}</strong><small>{q.tokens.filter(t=>t.status==='waiting').length} people waiting · {q.tokens.length} total tokens</small></div><div className="queue-row-right"><span className="live-dot">Active</span><span className="arrow-right">↗</span></div></button>) : <EmptyState title="No queues yet" detail="Create your first queue to get started." action="Create a queue" onClick={()=>setShowQueueModal(true)}/>}</div></section>
          <section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest completed services.</p></div><span className="subtle-icon"><Activity size={17}/></span></div>{recentServed.length ? <div className="activity-list">{recentServed.map(t=><div className="activity-row" key={t.id}><div className="activity-check"><Check size={15}/></div><div><strong>{t.name}</strong><small>Token #{t.number} · Served</small></div><span>{t.wait_minutes ?? 0}m wait</span></div>)}</div> : <div className="empty-activity"><div className="empty-icon"><Activity size={22}/></div><strong>No activity yet</strong><p>Served tokens will show up here.</p></div>}</section></div>
          <section className="panel quick-panel"><div className="quick-copy"><div className="quick-icon"><Zap size={18}/></div><div><h3>Ready for the next customer?</h3><p>Open a queue and call the next person in line.</p></div></div><button className="secondary-btn" onClick={()=>{setActiveTab('Queue');if(queues[0])setSelectedId(queues[0].id);}}>Manage queue <span>→</span></button></section>
        </>}
        {activeTab === 'Queue' && <div className="queue-workspace"><section className="panel queue-selector"><div className="panel-heading"><div><h2>Your queues</h2><p>Select a queue to manage.</p></div><button className="small-primary" onClick={()=>setShowQueueModal(true)}><Plus size={15}/> New</button></div>{queues.map(q=><button key={q.id} className={`selector-item ${selectedQueue?.id===q.id?'current':''}`} onClick={()=>setSelectedId(q.id)}><span className="queue-symbol"><Ticket size={17}/></span><span><b>{q.name}</b><small>{q.tokens.filter(t=>t.status==='waiting').length} waiting</small></span><ChevronDown size={15}/></button>)}{!queues.length && <p className="empty-note">Create a queue to begin.</p>}</section>
          <section className="panel token-panel"><div className="token-panel-top"><div><div className="eyebrow">NOW MANAGING</div><h2>{selectedQueue?.name || 'Select a queue'}</h2><p className="muted">{sortedTokens.length} people currently waiting</p></div><button className="primary-btn" disabled={!selectedQueue} onClick={()=>setShowTokenModal(true)}><Plus size={17}/> Add person</button></div>
            {selectedQueue && <><div className="queue-summary"><div><span>Next token</span><strong>{sortedTokens[0] ? `#${sortedTokens[0].number}` : '—'}</strong></div><div><span>Waiting</span><strong>{sortedTokens.length}</strong></div><div><span>Completed</span><strong>{selectedQueue.tokens.filter(t=>t.status==='served').length}</strong></div></div><div className="token-toolbar"><h3>Waiting list <span>{sortedTokens.length}</span></h3><div className="search-box"><Search size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search people..."/></div></div>
            {filteredTokens.length ? <div className="token-table"><div className="table-head"><span>POSITION</span><span>PERSON / TOKEN</span><span>WAIT TIME</span><span>ACTIONS</span></div>{filteredTokens.map((t,index)=><div className={`token-row ${index===0?'next-up':''}`} key={t.id}><div className="position-cell"><span className="position-number">{index+1}</span>{index===0 && <span className="next-label">NEXT</span>}</div><div className="person-cell"><div className="person-avatar">{t.name.slice(0,1).toUpperCase()}</div><div><strong>{t.name}</strong><small>Token #{t.number}</small></div></div><div className="wait-cell"><Clock3 size={14}/>{timeAgo(t.created_at)}</div><div className="row-actions"><button title="Move up" disabled={index===0} onClick={()=>moveToken(t,-1)}><ArrowUp size={16}/></button><button title="Move down" disabled={index===filteredTokens.length-1} onClick={()=>moveToken(t,1)}><ArrowDown size={16}/></button><button title="Cancel token" className="danger-action" onClick={()=>changeTokenStatus(t,'cancelled')}><Trash2 size={16}/></button></div></div>)}</div> : <div className="empty-queue"><div className="empty-icon"><Users size={23}/></div><strong>{search?'No matching people':'This queue is empty'}</strong><p>{search?'Try another name or token number.':'Add a person to create the first token.'}</p>{!search && <button className="secondary-btn" onClick={()=>setShowTokenModal(true)}><Plus size={15}/> Add first person</button>}</div>}
            <div className="call-next-bar"><div><span className="call-icon"><Bell size={17}/></span><div><strong>Ready to serve?</strong><small>{sortedTokens[0] ? `${sortedTokens[0].name} · Token #${sortedTokens[0].number} is next` : 'There is nobody waiting in this queue.'}</small></div></div><button className="call-btn" disabled={!sortedTokens.length} onClick={()=>changeTokenStatus(sortedTokens[0],'served')}><Check size={17}/> Call next</button></div></>}
          </section></div>}
        {activeTab === 'Analytics' && <><section className="stats-grid"><StatCard icon={Users} label="Total waiting" value={waitingCount} foot="Currently in line" tone="blue"/><StatCard icon={CheckCircle2} label="Total served" value={servedCount} foot="Completed tokens" tone="green"/><StatCard icon={Clock3} label="Average wait" value={`${averageWait} min`} foot="For completed tokens" tone="orange"/><StatCard icon={X} label="Cancelled" value={cancelledCount} foot="Cancelled tokens" tone="purple"/></section><div className="analytics-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Queue length</h2><p>People currently waiting in each queue.</p></div><span className="chart-legend"><i/> Waiting</span></div>{queues.length ? <div className="bar-chart">{queues.map(q=>{const count=q.tokens.filter(t=>t.status==='waiting').length;const max=Math.max(1,...queues.map(x=>x.tokens.filter(t=>t.status==='waiting').length));return <div className="bar-group" key={q.id}><div className="bar-value">{count}</div><div className="bar-track"><div className="bar-fill" style={{height:`${Math.max(5,count/max*100)}%`}}/></div><span>{q.name}</span></div>})}</div> : <EmptyState title="Nothing to analyse yet" detail="Create a queue and add people to see analytics."/>}</section><section className="panel breakdown-panel"><div className="panel-heading"><div><h2>Token breakdown</h2><p>All-time token status.</p></div></div><div className="donut-wrap"><div className="donut" style={{background:`conic-gradient(#20b47b 0 ${allTokens.length?servedCount/allTokens.length*100:0}%, #f0a23a ${allTokens.length?servedCount/allTokens.length*100:0}% ${allTokens.length?(servedCount+waitingCount)/allTokens.length*100:0}%, #e46c75 ${allTokens.length?(servedCount+waitingCount)/allTokens.length*100:0}% 100%)`}}><div><strong>{allTokens.length}</strong><small>Total tokens</small></div></div></div><div className="legend-list"><div><i className="green-dot"/> Served <b>{servedCount}</b></div><div><i className="orange-dot"/> Waiting <b>{waitingCount}</b></div><div><i className="red-dot"/> Cancelled <b>{cancelledCount}</b></div></div></section></div><p className="analytics-note"><Activity size={15}/> Analytics update automatically when you add, serve or cancel a token. Average wait is calculated from completed tokens.</p></>}
        </>}
        <footer className="page-footer"><span>© 2026 QueueFlow. Built for better service.</span><span><span className="footer-status"/> All systems operational</span></footer>
      </div>
    </main>
    {showQueueModal && <Modal title="Create a new queue" subtitle="Give your queue a name to get started." onClose={()=>setShowQueueModal(false)}><form onSubmit={addQueue}><label className="field-label">Queue name<input autoFocus value={queueName} onChange={e=>setQueueName(e.target.value)} placeholder="e.g. General Enquiries" required maxLength="50"/></label><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowQueueModal(false)}>Cancel</button><button className="primary-btn"><Plus size={16}/> Create queue</button></div></form></Modal>}
    {showTokenModal && <Modal title="Add a person" subtitle={`Add someone to ${selectedQueue?.name || 'your queue'}. A token number will be created automatically.`} onClose={()=>setShowTokenModal(false)}><form onSubmit={addToken}><label className="field-label">Person's name<input autoFocus value={personName} onChange={e=>setPersonName(e.target.value)} placeholder="Enter full name" required maxLength="60"/></label><div className="modal-hint"><Ticket size={16}/> Token number will be assigned automatically.</div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setShowTokenModal(false)}>Cancel</button><button className="primary-btn"><Plus size={16}/> Add to queue</button></div></form></Modal>}
  </div>;
}

function StatCard({icon:Icon,label,value,foot,tone}) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={19}/></div><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><small>{foot}</small></div>; }
function EmptyState({title,detail,action,onClick}) { return <div className="empty-state"><div className="empty-icon"><Ticket size={22}/></div><strong>{title}</strong><p>{detail}</p>{action && <button className="secondary-btn" onClick={onClick}>{action}</button>}</div>; }
function Modal({title,subtitle,onClose,children}) { return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal"><button className="modal-close" onClick={onClose}><X size={18}/></button><div className="modal-icon"><Plus size={20}/></div><h2>{title}</h2><p>{subtitle}</p>{children}</div></div>; }
