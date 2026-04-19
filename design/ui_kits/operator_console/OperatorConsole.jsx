/* global React */
// OperatorConsole.jsx — the Phase 2 delegate-facing UX: dashboard → dossier → compare

const { useState } = React;

// ───────── Shared primitives ─────────

const Icon = ({ d, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const I = {
  shield:  <path d="M12 2 3 6v6c0 5 3.5 9 9 10 5.5-1 9-5 9-10V6z"/>,
  users:   <g><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.75"/></g>,
  file:    <g><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></g>,
  compare: <g><circle cx="9" cy="19" r="2"/><circle cx="9" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><path d="M9 7v10M10.5 18l7-5M10.5 6l7 5"/></g>,
  archive: <g><rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></g>,
  alert:   <g><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></g>,
  check:   <g><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3 9-9"/></g>,
  clock:   <g><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></g>,
  search:  <g><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></g>,
  bell:    <g><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></g>,
  back:    <path d="m15 18-6-6 6-6"/>,
  next:    <path d="m9 18 6-6-6-6"/>,
  download:<g><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></g>,
  external:<g><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></g>,
  filter:  <path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>,
  dot:     <circle cx="12" cy="12" r="3" fill="currentColor"/>,
};

const Label = ({ children, className = '', tone = 'muted' }) => (
  <span className={`sb-label sb-label--${tone} ${className}`}>{children}</span>
);

const Badge = ({ status }) => {
  const cfg = {
    vetted:  { t: 'Vetted',  c: '#2f7d4a', bg: 'rgba(47,125,74,.1)' },
    pending: { t: 'Pending', c: '#a97b17', bg: 'rgba(169,123,23,.12)' },
    flagged: { t: 'Flagged', c: '#b6191a', bg: 'rgba(182,25,26,.1)' },
  }[status] || { t: status, c: '#43474d', bg: 'rgba(0,15,34,.06)' };
  return (
    <span className="sb-badge" style={{ color: cfg.c, background: cfg.bg }}>
      <span className="sb-badge__dot" style={{ background: cfg.c }} /> {cfg.t}
    </span>
  );
};

// ───────── Data ─────────

const CANDIDATES = [
  { id:'1', name:'Julianne DeSilva', district:'HD 32', party:'Republican', status:'vetted',
    score:94, initials:'JD', filed:'Oct 23 · 14:02 MT', office:'Utah House of Representatives',
    summary:'Two-term incumbent. Commercial real-estate background. Floor-vote alignment with caucus leadership at 91% this session.',
    tags:['Incumbent','Business','Caucus leadership'],
    record:[
      { label:'Filed with', value:'vote.utah.gov · 2026-0423-HD32'},
      { label:'SLCO clerk', value:'Verified — residence on record'},
      { label:'Financial disclosure', value:'Filed 2026-04-15 · no conflicts'},
    ],
    claims:[
      { c:'Voted no on HB 123 (school-voucher expansion).', v:'Verified', src:'Utah Legislature roll call · 2025-02-14'},
      { c:'Co-sponsored SB 47 (water-rights modernization).', v:'Verified', src:'le.utah.gov · SB0047'},
      { c:'Raised $184,300 in Q1 2026.', v:'Verified', src:'disclosures.utah.gov · 2026-Q1'},
    ]
  },
  { id:'2', name:'Marcus Thorne', district:'SD 8', party:'Republican', status:'flagged',
    score:62, initials:'MT', filed:'Oct 23 · 11:45 MT', office:'Utah State Senate',
    summary:'First-time candidate. Commercial-interest disclosure filed late; SLCO residency verification pending.',
    tags:['Newcomer','SLCO','Real estate'],
    record:[
      { label:'Filed with', value:'vote.utah.gov · 2026-0423-SD08'},
      { label:'SLCO clerk', value:'⚠ Residence verification pending'},
      { label:'Financial disclosure', value:'⚠ Unreported commercial interest — D2'},
    ],
    claims:[
      { c:'Has never held elected office.', v:'Verified', src:'Ballotpedia · candidate history'},
      { c:'Owns commercial property outside declared district.', v:'Flagged', src:'disclosure.saltlakecounty.gov'},
    ]
  },
  { id:'3', name:'Lydia Brennan', district:'HD 45', party:'Republican', status:'pending',
    score:81, initials:'LB', filed:'Oct 22 · 16:30 MT', office:'Utah House of Representatives',
    summary:'County commissioner since 2022. Strong rural-county fundraising base. Disclosure review in progress.',
    tags:['Commissioner','Rural coalition'],
    record:[
      { label:'Filed with', value:'vote.utah.gov · 2026-0422-HD45'},
      { label:'SLCO clerk', value:'N/A — Wasatch County resident'},
      { label:'Financial disclosure', value:'Filed · under review'},
    ],
    claims:[
      { c:'Chaired Wasatch County Commission 2024 budget.', v:'Verified', src:'wasatch.utah.gov · minutes 2024-06'},
    ]
  },
];

// ───────── Chrome ─────────

const Sidebar = ({ screen, onNav }) => {
  const items = [
    { key:'briefing',  label:'Briefing',  icon:I.shield },
    { key:'explorer',  label:'Candidates',icon:I.users  },
    { key:'dossier',   label:'Dossiers',  icon:I.file   },
    { key:'comparison',label:'Compare',   icon:I.compare},
    { key:'archives',  label:'Archives',  icon:I.archive},
  ];
  return (
    <aside className="sb-sidebar">
      <div className="sb-sidebar__brand">
        <img src="../../assets/shield.svg" alt="" width="44" height="55"/>
        <div>
          <div className="sb-sidebar__title">The Silent Briefing</div>
          <div className="sb-sidebar__sub">Candidate Intelligence · Utah</div>
        </div>
      </div>
      <nav className="sb-sidebar__nav">
        {items.map(it => (
          <button key={it.key}
                  onClick={()=>onNav(it.key)}
                  className={`sb-nav-item ${screen===it.key?'is-active':''}`}>
            <Icon d={it.icon} size={18}/>
            <span>{it.label}</span>
          </button>
        ))}
      </nav>
      <div className="sb-sidebar__foot">
        <div className="sb-user">
          <div className="sb-user__av">DG</div>
          <div>
            <div className="sb-user__name">Dave G.</div>
            <div className="sb-user__role">SLCO Delegate · HD 45</div>
          </div>
        </div>
        <div className="sb-ops">
          <span className="sb-ops__pulse"/>Extraction: online
        </div>
      </div>
    </aside>
  );
};

const TopBar = ({ onSearch }) => (
  <header className="sb-topbar glass-cream">
    <div className="sb-topbar__search">
      <Icon d={I.search} size={16}/>
      <input placeholder="SEARCH DOSSIERS, FILINGS, DISTRICTS…" onChange={e=>onSearch?.(e.target.value)}/>
    </div>
    <div className="sb-topbar__actions">
      <button className="sb-icon-btn" aria-label="Notifications">
        <Icon d={I.bell}/><span className="sb-dot-alert"/>
      </button>
      <button className="sb-icon-btn" aria-label="Audit log">
        <Icon d={I.clock}/>
      </button>
    </div>
  </header>
);

// ───────── Screens ─────────

const BriefingScreen = ({ onOpen, onCompare }) => (
  <div className="sb-screen">
    <section className="sb-hero">
      <div className="sb-hero__kicker">
        <span className="sb-hero__tick"/>
        <Label tone="gold">Morning brief · Oct 23, 2026 · 08:42 MT</Label>
      </div>
      <h1 className="sb-display">The Salt Lake briefing: <em>District 4</em> operational overview</h1>
      <p className="sb-lede">
        Three new filings require review. Residency discrepancy detected on one SD 8 candidate.
        Primary filing window closes Friday at 17:00 MT.
      </p>
    </section>

    <section className="sb-stats">
      {[
        { lbl:'Active filings',  v:'14', meta:'Across 5 SLCO districts' },
        { lbl:'Pending vetting', v:'03', meta:'2 SLCO · 1 Wasatch', accent:true },
        { lbl:'Filing deadline', v:'Fri', meta:'17:00 MT · Oct 25', warn:true },
      ].map((s,i)=>(
        <article key={i} className={`sb-stat ${s.warn?'sb-stat--warn':''} ${s.accent?'sb-stat--accent':''}`}>
          <Label tone="muted">{s.lbl}</Label>
          <div className="sb-stat__v">{s.v}</div>
          <div className="sb-stat__meta">{s.meta}</div>
        </article>
      ))}
    </section>

    <section>
      <div className="sb-section-head">
        <Label tone="dark">Priority dossiers</Label>
        <button className="sb-ghost-btn" onClick={onCompare}>Open comparison matrix <Icon d={I.next} size={12}/></button>
      </div>
      <div className="sb-list">
        {CANDIDATES.map(c=>(
          <button key={c.id} className="sb-row" onClick={()=>onOpen(c)}>
            <span className="sb-row__av">{c.initials}</span>
            <div className="sb-row__body">
              <div className="sb-row__name">
                {c.name} <Badge status={c.status}/>
              </div>
              <div className="sb-row__meta">
                {c.district} · {c.party} · filed {c.filed}
              </div>
            </div>
            <div className="sb-row__score">
              <Label tone="muted">Dossier</Label>
              <div className={`sb-row__n ${c.score<70?'is-low':c.score<85?'is-mid':'is-high'}`}>{c.score}%</div>
            </div>
            <Icon d={I.next} size={14}/>
          </button>
        ))}
      </div>
    </section>

    <section className="sb-log">
      <div className="sb-section-head">
        <Label tone="dark">Extraction activity</Label>
        <span className="sb-live"><span className="sb-live__pulse"/>Live · Perplexity Sonar</span>
      </div>
      <div className="sb-log__grid">
        {[
          ['14:22:01','New filing · DeSilva, J. · HD 32'],
          ['13:45:12','Dossier rebuild · Thorne, M. · SD 8'],
          ['11:10:45','SLCO residency flag · Thorne, M.'],
          ['09:00:00','Morning brief generated · 3 priorities'],
        ].map(([t,msg],i)=>(
          <div key={i} className="sb-log__item pinstripe-gold">
            <Label tone="muted">{t}</Label>
            <div className="sb-log__msg">{msg}</div>
          </div>
        ))}
      </div>
    </section>
  </div>
);

const DossierScreen = ({ candidate, onBack }) => (
  <div className="sb-screen">
    <button className="sb-back" onClick={onBack}><Icon d={I.back} size={14}/> Back to briefing</button>

    <section className="sb-dossier-head">
      <div className="sb-dossier-portrait">
        <div className="sb-portrait-init">{candidate.initials}</div>
        <div className="sb-portrait-chip">
          <Label tone="muted">Dossier</Label>
          <div className="sb-portrait-num">{candidate.score}%</div>
        </div>
      </div>
      <div className="sb-dossier-meta">
        <Label tone="red">Confidential · Delegate access</Label>
        <h1 className="sb-display sb-display--md">{candidate.name}</h1>
        <p className="sb-lede"><em>{candidate.office}</em> · {candidate.district} · {candidate.party}</p>
        <p className="sb-body">{candidate.summary}</p>
        <div className="sb-tags">
          {candidate.tags.map(t=>(<span key={t} className="sb-tag">{t}</span>))}
        </div>
        <div className="sb-dossier-actions">
          <button className="sb-btn sb-btn--primary"><Icon d={I.download} size={14}/> Export briefing PDF</button>
          <button className="sb-btn sb-btn--secondary">Flag for review</button>
        </div>
      </div>
    </section>

    <section className="sb-dossier-grid">
      <div className="sb-card">
        <Label tone="gold">Record of filing</Label>
        <dl className="sb-dl">
          {candidate.record.map((r,i)=>(
            <React.Fragment key={i}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      <div className="sb-card sb-card--featured">
        <Label tone="gold">Claim verification</Label>
        <ul className="sb-claims">
          {candidate.claims.map((cl,i)=>(
            <li key={i} className={`sb-claim sb-claim--${cl.v.toLowerCase()}`}>
              <div className="sb-claim__v">
                <Icon d={cl.v==='Verified'?I.check:I.alert} size={14}/>
                <Label tone={cl.v==='Verified'?'green':'red'}>{cl.v}</Label>
              </div>
              <div className="sb-claim__c">"{cl.c}"</div>
              <div className="sb-claim__src"><Icon d={I.external} size={10}/> {cl.src}</div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  </div>
);

const ComparisonScreen = ({ onBack }) => (
  <div className="sb-screen sb-compare">
    <button className="sb-back" onClick={onBack}><Icon d={I.back} size={14}/> Back to briefing</button>

    <section className="sb-compare-head">
      <Label tone="red">Tactical assessment · Protocol 26.04</Label>
      <h1 className="sb-display sb-display--md">Comparison matrix <em>· HD&nbsp;32 primary</em></h1>
      <p className="sb-lede">Side-by-side audit. Metrics synthesized from vote.utah.gov filings, SLCO clerk records, and disclosures.utah.gov.</p>
    </section>

    <div className="sb-matrix">
      <div className="sb-matrix__head">
        <div className="sb-matrix__corner">
          <Label tone="muted">Primary matchup</Label>
          <div className="sb-matrix__cornerT">HD 32 · SLCO</div>
        </div>
        {CANDIDATES.map(c=>(
          <div key={c.id} className="sb-matrix__col">
            <div className="sb-matrix__av">{c.initials}</div>
            <div className="sb-matrix__name">{c.name}</div>
            <Label tone="muted">{c.district} · {c.party}</Label>
            <div style={{marginTop:8}}><Badge status={c.status}/></div>
          </div>
        ))}
      </div>
      {[
        { lbl:'Dossier completeness', get:c=>c.score+'%' },
        { lbl:'Filed with', get:c=>c.record[0].value.split('·')[1]?.trim() || c.record[0].value },
        { lbl:'SLCO residency', get:c=>c.record[1].value },
        { lbl:'Financial disclosure', get:c=>c.record[2].value },
        { lbl:'Verified claims', get:c=>`${c.claims.filter(x=>x.v==='Verified').length} / ${c.claims.length}` },
      ].map((r,i)=>(
        <div key={i} className="sb-matrix__row">
          <div className="sb-matrix__lbl"><Label tone="muted">{r.lbl}</Label></div>
          {CANDIDATES.map(c=>(
            <div key={c.id} className="sb-matrix__cell">{r.get(c)}</div>
          ))}
        </div>
      ))}
    </div>

    <div className="sb-compare-foot">
      <div className="sb-card">
        <Label tone="gold">Recommendation</Label>
        <p className="sb-body" style={{marginTop:8}}>
          <em>DeSilva</em> remains the most-vetted incumbent. Thorne's SLCO residency flag must clear before the Friday filing deadline.
        </p>
      </div>
      <button className="sb-btn sb-btn--gold">Authorize delegate brief →</button>
    </div>
  </div>
);

// ───────── App ─────────

function OperatorConsole() {
  const [screen, setScreen] = useState('briefing');
  const [selected, setSelected] = useState(null);

  const open = (c) => { setSelected(c); setScreen('dossier'); };

  return (
    <div className="sb-app">
      <Sidebar
        screen={selected && screen==='dossier' ? 'explorer' : screen}
        onNav={(k)=>{ setSelected(null); setScreen(k==='dossier'||k==='explorer' ? 'briefing' : k); }}
      />
      <div className="sb-main">
        <TopBar/>
        {screen==='briefing'   && <BriefingScreen onOpen={open} onCompare={()=>setScreen('comparison')}/>}
        {screen==='dossier' && selected && <DossierScreen candidate={selected} onBack={()=>setScreen('briefing')}/>}
        {screen==='comparison' && <ComparisonScreen onBack={()=>setScreen('briefing')}/>}
        {screen==='archives'   && (
          <div className="sb-screen" style={{minHeight:'60vh'}}>
            <Label tone="muted">Archives</Label>
            <h1 className="sb-display sb-display--md"><em>No archived briefings for this cycle.</em></h1>
            <p className="sb-lede">Archived briefings appear here after a primary cycle closes.</p>
          </div>
        )}
        <footer className="sb-footbar">
          <span><span className="sb-ops__pulse"/> ARQ worker #4 · online</span>
          <span>Last sync · 14:02 MT · supabase.silent-briefing.app</span>
          <span>Build 2026.04.19 · delegate edition</span>
        </footer>
      </div>
    </div>
  );
}

window.OperatorConsole = OperatorConsole;
