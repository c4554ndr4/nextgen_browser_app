'use client';
import { useRef, useState } from 'react';
import { ArrowUpRight, ArrowRight, Check, Compass, LoaderCircle, SlidersHorizontal, Sparkles, CornerDownRight, RotateCcw } from 'lucide-react';
type Result = { decision: 'ready' | 'explore' | 'redirect' | 'ask_parent'; summary: string; answer: string; suggestions: string[]; token?: string; remaining: number };
type Step = { title: string; detail: string };
export default function Scout({ signedIn }: { signedIn: boolean }) {
  const [age, setAge] = useState('9');
  const [encourage, setEncourage] = useState('Science, creativity, and the outdoors');
  const [avoid, setAvoid] = useState('Scary content and dangerous stunts');
  const [token, setToken] = useState('');
  const [editing, setEditing] = useState(true);
  const [query, setQuery] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState<'setup' | 'explore' | null>(null);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const inFlight = useRef(false);
  const kidInput = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  async function submit(action: 'setup' | 'explore', question = query) {
    if (inFlight.current) return;
    if (action === 'explore' && (!token || editing || !question.trim())) return;
    inFlight.current = true; setBusy(action); setError('');
    setSteps([{ title: action === 'setup' ? 'Family preferences received' : 'Question received', detail: action === 'setup' ? `Age ${age} · encouragements and boundaries` : question }]);
    try {
      const response = await fetch('/api/scout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'setup' ? { action, age: Number(age), encourage, avoid } : { action, query: question, token }),
        signal: AbortSignal.timeout(25000),
      });
      const data = await response.json() as Result & { error?: string };
      if (typeof data.remaining === 'number') setRemaining(data.remaining);
      if (!response.ok) throw new Error(data.error || 'Scout is unavailable. Try again.');
      setRemaining(data.remaining); setSuggestions(data.suggestions);
      if (action === 'setup') {
        setToken(data.token || ""); setEditing(false); setResult(null); setLastQuery('');
        setSteps([{ title: 'Family guidance set', detail: data.summary }, { title: 'Exploration ideas ready', detail: 'The child can choose an idea or ask a question.' }]);
        setTimeout(() => kidInput.current?.focus(), 0);
      } else {
        setResult(data); setLastQuery(question); setQuery('');
        setSteps([{ title: 'Family guidance applied', detail: data.summary }, { title: data.decision === 'explore' ? 'Response ready' : data.decision === 'redirect' ? 'Alternative suggested' : 'Parent input needed', detail: data.decision === 'explore' ? 'An age-appropriate explanation and follow-up ideas.' : data.decision === 'redirect' ? 'The response offers a direction within the family’s boundaries.' : 'This question needs a parent’s guidance.' }]);
        setTimeout(() => summaryRef.current?.focus(), 0);
      }
    } catch (e) {
      const message = e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Scout took too long. Please try again.';
      setError(message); setSteps(prev => [...prev, { title: 'Request stopped', detail: message }]);
    } finally { inFlight.current = false; setBusy(null); }
  }
  function editFamily() {
    setEditing(true); setToken(''); setResult(null); setSuggestions([]); setSteps([]); setLastQuery(''); setError('');
  }
  return <div className="shell">
    <header className="header">
      <a className="wordmark" href="/" aria-label="Scout home"><span className="brand-icon"><Compass size={25} strokeWidth={1.6}/></span>scout<span className="demo-label">DEMO</span></a>
      <div className="header-right"><span className="live"><i/> Live AI</span><a href="https://github.com/c4554ndr4/nextgen_browser_app" target="_blank" rel="noreferrer" className="source-link">Source <ArrowUpRight size={14}/></a></div>
    </header>
    <main>
      <div className="title-row"><div><h1>Explore with Scout</h1></div><div className="quota"><span>{remaining === null ? '10' : remaining}</span><div>{remaining === null ? 'requests per day' : 'requests left today'}<small>per signed-in parent</small></div></div></div>
      <div className="workspace">
        <section className="family" aria-labelledby="family-heading">
          <div className="section-heading"><span className="step-number">01</span><h2 id="family-heading">For the parent</h2><SlidersHorizontal size={17}/></div>
          <form onSubmit={e => { e.preventDefault(); void submit('setup'); }}>
            <fieldset disabled={Boolean(busy) || !editing}>
              <label htmlFor="age">Child’s age</label><select id="age" value={age} onChange={e => setAge(e.target.value)}>{Array.from({length:13}, (_, i) => <option key={i + 5} value={i + 5}>{i + 5} years</option>)}</select>
              <label htmlFor="encourage">Encourage <span className="label-symbol">+</span></label><textarea id="encourage" required maxLength={500} value={encourage} onChange={e => setEncourage(e.target.value)} rows={3}/>
              <label htmlFor="avoid">Avoid <span className="label-symbol">−</span></label><textarea id="avoid" maxLength={500} value={avoid} onChange={e => setAvoid(e.target.value)} rows={3}/>
            </fieldset>
            {editing ? signedIn ? <button className="primary family-button" disabled={Boolean(busy) || remaining === 0} type="submit">{busy === 'setup' ? <><LoaderCircle className="spin" size={17}/> Setting guidance</> : <>Set guidance <ArrowRight size={17}/></>}</button> : <a className="primary family-button" href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in to try <ArrowRight size={17}/></a> : <button className="edit-button" disabled={Boolean(busy)} type="button" onClick={e => { e.preventDefault(); editFamily(); }}><Check size={15}/> Guidance set <span>Edit</span></button>}
          </form>
        </section>
        <div className="exploration">
          <section className="activity" aria-labelledby="activity-heading" aria-live="polite" aria-busy={Boolean(busy)}>
            <div className="section-heading"><span className="step-number">02</span><h2 id="activity-heading">Scout’s activity</h2><span className="activity-state">{busy ? 'Working' : token ? 'Ready' : 'Waiting'}</span></div>
            {steps.length ? <ol className="steps">{steps.map((s, i) => <li key={i}><span className="check-dot">{s.title === 'Request stopped' ? '!' : <Check size={12}/>}</span><div><h3>{s.title}</h3><p>{s.detail}</p></div></li>)}{busy && <li><span className="check-dot working"><LoaderCircle size={13} className="spin"/></span><div><h3>{busy === 'setup' ? 'Preparing family guidance' : 'Checking the question against guidance'}</h3><p>Waiting for Scout’s response…</p></div></li>}</ol> : <div className="activity-empty"><span className="orbit"><Compass size={31} strokeWidth={1}/></span><p>Set guidance to see Scout’s next steps.</p></div>}
            <div className="activity-note">Action summaries</div>
          </section>
          <section className={`child ${!token || editing ? 'waiting' : ''}`} aria-labelledby="child-heading">
            <div className="section-heading"><span className="step-number">03</span><h2 id="child-heading">For the explorer</h2><Sparkles size={18}/></div>
            <h3 className="child-title">What are you curious about?</h3>
            <form onSubmit={e => { e.preventDefault(); void submit('explore'); }}>
              <label className="sr-only" htmlFor="question">Your question</label><div className="question-box"><textarea ref={kidInput} id="question" maxLength={300} rows={2} value={query} onChange={e => setQuery(e.target.value)} disabled={!token || editing || Boolean(busy)} placeholder={token && !editing ? 'Why does the moon change shape?' : 'Your turn after the parent sets guidance'}/><button type="submit" aria-label="Ask Scout" disabled={!token || editing || Boolean(busy) || !query.trim() || remaining === 0}>{busy === 'explore' ? <LoaderCircle size={20} className="spin"/> : <ArrowRight size={20}/>}</button></div>
            </form>
            {suggestions.length > 0 && !editing && <div className="suggestions">{suggestions.map(s => <button key={s} disabled={Boolean(busy) || remaining === 0} onClick={() => { setQuery(s); kidInput.current?.focus(); }}>{s}<CornerDownRight size={13}/></button>)}</div>}
            {error && <p className="error" role="alert">{error}</p>}
            {result && <article className="response"><p className="asked">{lastQuery}</p><div className="response-heading"><span className="small-compass"><Compass size={17}/></span><h4 ref={summaryRef} tabIndex={-1}>Scout</h4><span className="decision">{result.decision === 'explore' ? 'Let’s explore' : result.decision === 'redirect' ? 'Try another direction' : 'Ask a parent'}</span></div><p className="answer">{result.answer}</p></article>}
          </section>
        </div>
      </div>
      <footer><span>Ideas from AI · No web search or video review</span><details><summary>About this demo</summary><p>Parent and child inputs go to Google Gemini. Avoid names or private details. Scout stores usage counters, not conversations. Family guidance stays in this tab and expires after one hour. This shared-screen demo has no parent lock and is not a parental-control product.</p><p>10 requests/day, 3/minute, 30 total per account. Site cap: 100/day and 1,000 total. Failed AI attempts count. Daily limits reset at midnight UTC.</p></details>{token && !busy && <button className="reset" onClick={() => { editFamily(); setQuery(''); }}><RotateCcw size={12}/> Start over</button>}</footer>
    </main>
  </div>;
}
