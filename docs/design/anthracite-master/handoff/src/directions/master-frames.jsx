// Direction D — Master frames part 1
// D1: Environment Centre LIST
// D2: Environment Centre DETAIL with inspector
// D3: Operate · live device view
// D4: Topology · L3 underlay with 3D affordance
// D5: Diagnose · path trace
// D6: Build · config authoring with baseline diff

// ─── D1: Environment Centre LIST ─────────────────────────────────────────────
function MasterD1({ density, railVariant, opsExpanded, secondaryOpen }) {
  return (
    <MasterShell
      mode="hierarchy"
      railVariant={railVariant}
      crumbs={['Hierarchy', 'Environments']}
      secondary={secondaryOpen ? <MasterSecondaryNav mode="hierarchy" /> : null}
      subnav={<MasterSubNav
        items={[
          { label: 'All',       count: 8, active: true, icon: <IcoGrid size={12} /> },
          { label: 'Production', count: 4 },
          { label: 'Staging',    count: 1 },
          { label: 'Lab',        count: 1 },
          { label: 'Tenants',    count: 1 },
          { label: 'Isolated',   count: 1, err: true },
        ]}
        right={<React.Fragment>
          <span className="muted" style={{ fontSize: 11 }}>last sweep · 04:18 ago</span>
          <span className="vr" style={{ margin: '0 4px' }} />
          <div style={{ display:'flex', height: 24, border:'1px solid var(--anth-border-strong)', borderRadius: 3, overflow:'hidden' }}>
            <span style={{ padding:'0 8px', display:'inline-flex', alignItems:'center', gap: 4, fontSize: 11, background:'var(--anth-bg-selected)', fontWeight:600 }}><IcoTable size={11}/> Hybrid</span>
            <span style={{ padding:'0 8px', display:'inline-flex', alignItems:'center', gap: 4, fontSize: 11, color:'var(--anth-text-3)' }}><IcoGrid size={11}/> Cards</span>
            <span style={{ padding:'0 8px', display:'inline-flex', alignItems:'center', gap: 4, fontSize: 11, color:'var(--anth-text-3)' }}><IcoMap size={11}/> Map</span>
          </div>
          <span className="btn sm"><IcoExport size={12}/> Export</span>
          <span className="btn sm primary"><IcoPlus size={12}/> New environment</span>
        </React.Fragment>}
      />}
      opsExpanded={opsExpanded}
      statusNote="hierarchy · 8 of 8 · sorted by readiness ↓"
    >
      <div style={{ overflow:'auto', padding: 10, display:'flex', flexDirection:'column', gap: 10, background: 'var(--anth-bg-app)', flex: 1, minHeight: 0 }}>
        <D1HealthRibbon />
        <D1Table density={density} />
      </div>
    </MasterShell>
  );
}

function D1HealthRibbon() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr 1fr 1fr 1fr', gap: 8 }}>
      <div className="anth-panel" style={{ overflow:'hidden' }}>
        <div className="anth-panel-hd">
          <span className="ttl">Global readiness</span>
          <span className="sub">8 environments · 8,945 devices · 563 sites</span>
          <span className="actions"><span className="ix"><IcoMore size={14}/></span></span>
        </div>
        <div className="anth-panel-bd" style={{ padding: 6, height: 152 }}>
          <D1WorldMap />
        </div>
      </div>
      {[
        { lbl: 'Reachable',      val: '8,762', sub: '/ 8,945 · 183 unreach', parts: [8762, 0, 183], delta: '-12' },
        { lbl: 'Readiness avg',  val: '91 %',  sub: 'across 8 environments', parts: [91, 9, 0], delta: '+0.3' },
        { lbl: 'Drift lines',    val: '482',   sub: '67 baselines',          parts: [0, 482, 0], delta: '+18' },
        { lbl: 'Open events',    val: '52',    sub: '37 warn · 15 err',      parts: [0, 37, 15], delta: '+4'  },
      ].map((k, i) => (
        <div className="anth-panel" key={i} style={{ padding: 12 }}>
          <div className="micro">{k.lbl}</div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginTop: 4 }}>
            <div className="mono num" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>{k.val}</div>
            <div style={{ marginLeft:'auto', fontSize: 11, color: k.delta.startsWith('-') || k.lbl === 'Reachable' ? 'var(--anth-err)' : k.lbl === 'Drift lines' || k.lbl === 'Open events' ? 'var(--anth-warn)' : 'var(--anth-ok)' }}>{k.delta}</div>
          </div>
          <div style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>{k.sub}</div>
          <div style={{ marginTop: 6, display:'flex', height: 5, gap: 1, borderRadius: 2, overflow:'hidden', background:'var(--anth-bg-sunken)' }}>
            <div style={{ flex: k.parts[0], background:'var(--anth-ok)' }} />
            <div style={{ flex: k.parts[1], background:'var(--anth-warn)' }} />
            <div style={{ flex: k.parts[2], background:'var(--anth-err)' }} />
          </div>
          <Spark seed={i+7} width={300} height={22} color="var(--anth-info)" />
        </div>
      ))}
    </div>
  );
}

function D1WorldMap() {
  return (
    <svg viewBox="0 0 600 140" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{display:'block'}}>
      {[...Array(7)].map((_,i)=><line key={'h'+i} x1="0" x2="600" y1={20+i*20} y2={20+i*20} stroke="#E6EDF4" strokeWidth="0.5"/>)}
      {[...Array(13)].map((_,i)=><line key={'v'+i} x1={i*50} x2={i*50} y1="0" y2="140" stroke="#E6EDF4" strokeWidth="0.5"/>)}
      <path d="M60 40 q20 -25 60 -25 q40 -5 70 15 q15 12 8 35 q-5 20 -30 22 q-25 4 -45 -8 q-20 -10 -40 -5 q-25 5 -23 -34z" fill="#E6EDF4" stroke="#D1D9E6" strokeWidth="0.6"/>
      <path d="M210 35 q40 -25 90 -10 q40 12 50 35 q12 25 -10 50 q-25 30 -75 30 q-50 -2 -75 -25 q-25 -22 -10 -55 q12 -22 30 -25z" fill="#E6EDF4" stroke="#D1D9E6" strokeWidth="0.6"/>
      <path d="M395 45 q40 -20 90 -5 q35 12 50 30 q10 18 -5 35 q-15 18 -55 22 q-50 5 -80 -10 q-25 -12 -22 -35 q3 -25 22 -37z" fill="#E6EDF4" stroke="#D1D9E6" strokeWidth="0.6"/>
      {[
        { x: 255, y: 62, s:'ok',   r: 5, label:'LON · 248' },
        { x: 280, y: 65, s:'ok',   r: 4, label:'FRA · 180' },
        { x: 268, y: 58, s:'ok',   r: 3, label:'AMS · 96' },
        { x: 130, y: 70, s:'ok',   r: 5, label:'IAD · 412' },
        { x: 80,  y: 80, s:'ok',   r: 4, label:'SJC · 286' },
        { x: 510, y: 70, s:'warn', r: 4, label:'TYO · 184' },
        { x: 470, y: 105,s:'warn', r: 4, label:'SIN · 142' },
        { x: 110, y: 65, s:'err',  r: 3, label:'MTN · 188' },
      ].map((m, i) => {
        const col = m.s === 'ok' ? '#38A169' : m.s === 'warn' ? '#D69E2E' : m.s === 'err' ? '#E53E3E' : '#B0BCCB';
        return (
          <g key={i}>
            <circle cx={m.x} cy={m.y} r={m.r + 4} fill={col} opacity="0.18" />
            <circle cx={m.x} cy={m.y} r={m.r} fill={col} stroke="#fff" strokeWidth="1" />
            <text x={m.x + m.r + 4} y={m.y + 3} fontSize="8" fontFamily="Cascadia Mono, Consolas, monospace" fill="#4A5567">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function D1Table({ density }) {
  return (
    <div className="anth-panel" style={{ flex: 1, minHeight: 0, '--anth-row': density === 'compact' ? '24px' : '30px' }}>
      <div className="anth-toolbar">
        <div className="search"><IcoSearch size={12} /> <span className="mono" style={{ color:'var(--anth-text)' }}>readiness:&lt;95 AND scope:production</span></div>
        <div className="filter">scope <b>:</b> production <span className="x"><IcoX size={10}/></span></div>
        <div className="filter">readiness <b>:</b> &lt; 95 <span className="x"><IcoX size={10}/></span></div>
        <div className="filter">+ filter</div>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 11 }}>8 of 8 · 1 selected</span>
        <span className="btn sm ghost"><IcoFilter size={12} /></span>
        <span className="btn sm ghost"><IcoRefresh size={12} /></span>
        <span className="btn sm">Compare</span>
        <span className="btn sm">Run sweep</span>
      </div>
      <div style={{ flex: 1, overflow:'auto' }}>
        <table className="anth-table">
          <thead><tr>
            <th style={{ width: 28 }}><input type="checkbox" style={{ accentColor:'#3182CE' }} /></th>
            <th style={{ width: 24 }}></th>
            <th>Environment</th>
            <th>Scope</th>
            <th className="colhead-num">Devices</th>
            <th className="colhead-num">Sites</th>
            <th>Readiness</th>
            <th>L2</th><th>L3</th><th>eBGP</th>
            <th className="colhead-num">Drift</th>
            <th className="colhead-num">Events</th>
            <th>Owner</th>
            <th>Last poll</th>
            <th style={{ width: 24 }}></th>
          </tr></thead>
          <tbody>
            {ENVIRONMENTS.map((e, i) => {
              const seed = (e.devices * 17) % 100;
              const l2 = Math.min(100, 90 + (seed % 11));
              const l3 = Math.min(100, 84 + ((seed * 3) % 16));
              const bg = Math.min(100, 78 + ((seed * 7) % 22));
              return (
                <tr key={e.id} className={i === 0 ? 'selected' : ''}>
                  <td><input type="checkbox" defaultChecked={i === 0} style={{ accentColor:'#3182CE' }} /></td>
                  <td><span className={`dot ${e.status}`} /></td>
                  <td>
                    <div style={{ display:'flex', flexDirection:'column', lineHeight: 1.25 }}>
                      <span className="mono" style={{ fontWeight: 600 }}>{e.id}</span>
                      <span style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>{e.region}</span>
                    </div>
                  </td>
                  <td><span style={{ fontSize: 11, color:'var(--anth-text-2)' }}>{e.scope}</span></td>
                  <td className="num right">{e.devices.toLocaleString()}</td>
                  <td className="num right">{e.sites}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, minWidth: 140 }}>
                      <div style={{ flex: 1, height: 5, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                        <div style={{ width: `${e.readiness}%`, height:'100%',
                          background: e.readiness >= 90 ? 'var(--anth-ok)' : e.readiness >= 70 ? 'var(--anth-warn)' : 'var(--anth-err)' }} />
                      </div>
                      <span className="mono num" style={{ fontSize: 11, color:'var(--anth-text-2)', minWidth: 28 }}>{e.readiness}%</span>
                    </div>
                  </td>
                  {[l2, l3, bg].map((v, j) => (
                    <td key={j}>
                      <span className="mono num" style={{
                        fontSize: 10.5, padding: '1px 6px', borderRadius: 2,
                        background: v >= 95 ? 'var(--anth-ok-tint)' : v >= 85 ? 'var(--anth-warn-tint)' : 'var(--anth-err-tint)',
                        color: v >= 95 ? '#1F6E3F' : v >= 85 ? '#8A5A0A' : '#9B1C1C',
                      }}>{v}</span>
                    </td>
                  ))}
                  <td className="num right" style={{ color: e.drift > 50 ? 'var(--anth-warn)' : 'var(--anth-text-2)' }}>{e.drift}</td>
                  <td className="right">
                    {e.events > 0
                      ? <span className={`chip ${e.events > 10 ? 'err' : e.events > 3 ? 'warn' : 'info'}`}>{e.events}</span>
                      : <span className="num muted">—</span>}
                  </td>
                  <td><span style={{ fontSize: 11.5, color:'var(--anth-text-2)' }}>{e.owner}</span></td>
                  <td className="num">{e.last}</td>
                  <td><span style={{ color:'var(--anth-text-muted)' }}><IcoMore size={14}/></span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── D2: Environment DETAIL ──────────────────────────────────────────────────
function MasterD2({ density, railVariant, opsExpanded, secondaryOpen, inspectorDock }) {
  return (
    <MasterShell
      mode="hierarchy"
      railVariant={railVariant}
      crumbs={['Hierarchy', 'apex-prod-emea', 'Overview']}
      secondary={secondaryOpen ? <MasterSecondaryNav mode="hierarchy" /> : null}
      subnav={<MasterSubNav
        items={[
          { label: 'Overview', active: true },
          { label: 'Sites',    count: 41 },
          { label: 'Devices',  count: '2,184' },
          { label: 'Topology' },
          { label: 'Configs' },
          { label: 'Baselines' },
          { label: 'Events',   count: 4, err: true },
          { label: 'Compliance' },
          { label: 'Audit' },
        ]}
        right={<React.Fragment>
          <span className="btn sm"><IcoRefresh size={12} /> Re-poll</span>
          <span className="btn sm primary"><IcoOperate size={12} /> Enter Operate</span>
        </React.Fragment>}
      />}
      inspector={<MasterInspector dock={inspectorDock} />}
      inspectorDock={inspectorDock}
      opsExpanded={opsExpanded}
      statusNote="scope: apex-prod-emea · 38s since last poll · readiness 96%"
    >
      <D2Body />
    </MasterShell>
  );
}

function D2Body() {
  return (
    <div style={{ overflow:'auto', padding: 10, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
      <div style={{ gridColumn:'1 / 3', display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap: 8 }}>
        {[
          { lbl:'Reachable',     val:'2,151',    sub:'/ 2,184',           d:'-3',    dir:'down', seed: 21 },
          { lbl:'Readiness',     val:'96 %',     sub:'LEAF-BASE-EU',      d:'+0.4',  dir:'up',   seed: 22 },
          { lbl:'Drift',         val:'23',       sub:'7 baselines',       d:'+4',    dir:'down', seed: 23 },
          { lbl:'Open events',   val:'4',        sub:'3 warn · 1 err',    d:'+1',    dir:'down', seed: 24 },
          { lbl:'BGP estab',     val:'1,406',    sub:'/ 1,408 sessions',  d:'-2',    dir:'down', seed: 25 },
          { lbl:'Bandwidth p95', val:'412 Gbps', sub:'EU backbone',       d:'+1.2%', dir:'up',   seed: 26 },
        ].map((k, i) => (
          <div className="anth-panel" key={i} style={{ padding: '10px 12px 10px' }}>
            <div className="micro">{k.lbl}</div>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginTop: 2 }}>
              <div className="mono num" style={{ fontSize: 18, fontWeight: 600 }}>{k.val}</div>
              <span style={{ fontSize: 10.5, color: k.dir === 'up' ? 'var(--anth-ok)' : 'var(--anth-err)' }}>{k.d}</span>
            </div>
            <div style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>{k.sub}</div>
            <Spark seed={k.seed} width={250} height={20} color={k.dir==='up' ? 'var(--anth-ok)' : 'var(--anth-info)'} />
          </div>
        ))}
      </div>

      <div className="anth-panel" style={{ minHeight: 250 }}>
        <div className="anth-panel-hd"><span className="ttl">Readiness — by domain</span><span className="sub">7 baselines</span></div>
        <div className="anth-panel-bd" style={{ padding: 10, display:'flex', flexDirection:'column', gap: 7 }}>
          {[
            { d:'L2 fabric',         pct: 99, n: '417 / 418',  status:'ok' },
            { d:'L3 underlay',       pct: 97, n: '802 / 827',  status:'ok' },
            { d:'eBGP edge',         pct: 91, n: '54 / 59',    status:'warn' },
            { d:'Out-of-band mgmt',  pct: 100,n: '2184 / 2184',status:'ok' },
            { d:'NTP discipline',    pct: 88, n: '1922 / 2184',status:'warn' },
            { d:'TACACS reachability',pct: 76,n: '1660 / 2184',status:'warn' },
            { d:'Syslog ingest',     pct: 100,n: '2184 / 2184',status:'ok' },
          ].map((b, i) => (
            <div key={i} style={{ display:'grid', gridTemplateColumns:'150px 1fr 50px 80px', gap: 10, alignItems:'center' }}>
              <span style={{ fontSize: 12 }}>{b.d}</span>
              <div style={{ height: 8, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                <div style={{ width: `${b.pct}%`, height: '100%',
                  background: b.status === 'ok' ? 'var(--anth-ok)' : b.status === 'warn' ? 'var(--anth-warn)' : 'var(--anth-err)' }} />
              </div>
              <span className="mono num" style={{ fontSize: 11, color:'var(--anth-text-2)', textAlign:'right' }}>{b.pct}%</span>
              <span className="mono num" style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>{b.n}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="anth-panel" style={{ minHeight: 250 }}>
        <div className="anth-panel-hd"><span className="ttl">Open events</span><span className="sub">last 60 minutes</span></div>
        <div className="anth-panel-bd" style={{ overflow:'auto' }}>
          <table className="anth-table">
            <thead><tr><th style={{width: 22}}/><th>Time</th><th>Source</th><th>Category</th><th>Message</th></tr></thead>
            <tbody>
              {EVENTS.map((e, i) => (
                <tr key={i}>
                  <td><span className={`dot ${e.sev}`}/></td>
                  <td className="num">{e.t}</td>
                  <td className="mono">{e.src}</td>
                  <td><span style={{ fontSize: 10.5, color:'var(--anth-text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{e.cat}</span></td>
                  <td style={{ color:'var(--anth-text-2)', fontSize: 11.5 }}>{e.msg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="anth-panel" style={{ gridColumn:'1 / 3' }}>
        <div className="anth-panel-hd">
          <span className="ttl">Sites · 41</span>
          <span className="sub">8 regions</span>
          <span className="actions">
            <span className="ix"><IcoTable size={13}/></span>
            <span className="ix"><IcoMap size={13}/></span>
            <span className="ix"><IcoMore size={14}/></span>
          </span>
        </div>
        <div className="anth-panel-bd" style={{ overflow:'auto' }}>
          <table className="anth-table">
            <thead><tr><th style={{width:22}}/><th>Site</th><th>Region</th><th>Role</th><th className="colhead-num">Devices</th><th className="colhead-num">Reach</th><th>Readiness</th><th className="colhead-num">Events</th><th>Maintenance</th></tr></thead>
            <tbody>
              {[
                ['ok','LON-CORE','EMEA-North','core+spine',248,248,99,1,'sat 02:00 BST'],
                ['ok','FRA-CORE','EMEA-Central','core',180,180,98,0,'sun 03:00 CET'],
                ['ok','AMS-EDGE','EMEA-North','edge',96,95,94,1,'fri 23:00 CET'],
                ['warn','PAR-EDGE','EMEA-West','edge',64,62,86,2,'thu 22:00 CET'],
                ['ok','DUB-EDGE','EMEA-West','edge',48,48,97,0,'sat 01:00 IST'],
                ['warn','MUC-DC1','EMEA-South','dc',140,138,82,1,'wed 02:30 CET'],
                ['ok','MAD-EDGE','EMEA-West','edge',38,38,99,0,'—'],
                ['idle','MIL-EDGE','EMEA-South','edge',32,32,91,0,'next week'],
              ].map((row, i) => (
                <tr key={i}>
                  <td><span className={`dot ${row[0]}`}/></td>
                  <td className="mono" style={{ fontWeight: 600 }}>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td><span style={{ fontSize: 11, color:'var(--anth-text-3)', textTransform:'uppercase', letterSpacing:'0.04em' }}>{row[3]}</span></td>
                  <td className="num right">{row[4]}</td>
                  <td className="num right">{row[5]}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap: 8, minWidth: 140 }}>
                      <div style={{ flex:1, height: 5, background:'var(--anth-bg-sunken)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ width: `${row[6]}%`, height:'100%', background: row[6]>=95?'var(--anth-ok)':row[6]>=85?'var(--anth-warn)':'var(--anth-err)' }} />
                      </div>
                      <span className="mono num" style={{ fontSize:11, color:'var(--anth-text-2)' }}>{row[6]}%</span>
                    </div>
                  </td>
                  <td className="right">{row[7] > 0 ? <span className={`chip ${row[7]>1?'warn':'info'}`}>{row[7]}</span> : <span className="muted num">—</span>}</td>
                  <td className="mono" style={{ fontSize: 11, color:'var(--anth-text-3)' }}>{row[8]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── D3: Operate ─────────────────────────────────────────────────────────────
function MasterD3({ density, railVariant, opsExpanded, inspectorDock }) {
  return (
    <MasterShell
      mode="operate"
      railVariant={railVariant}
      crumbs={['Operate', 'apex-prod-emea', 'lon-core-01.apex', 'Live']}
      secondary={<MasterSecondaryNav mode="operate" />}
      subnav={<MasterSubNav
        items={[
          { label: 'Live', active: true },
          { label: 'Interfaces', count: 64 },
          { label: 'BGP', count: 12 },
          { label: 'VRFs', count: 8 },
          { label: 'Routes', count: '412k' },
          { label: 'ARP', count: '1,824' },
          { label: 'Config' },
          { label: 'Events', count: 2, warn: true },
        ]}
        right={<React.Fragment>
          <span className="chip ok">reachable</span>
          <span className="chip idle">EOS 4.31.2F</span>
          <span className="btn sm"><IcoTerminal size={12}/> SSH</span>
          <span className="btn sm primary"><IcoBolt size={12}/> Run check</span>
        </React.Fragment>}
      />}
      inspector={inspectorDock === 'right' ? <MasterInspector dock="right" /> : null}
      inspectorDock={inspectorDock}
      opsExpanded={true}
      statusNote="operate · live · 1Hz polling · 2 ops sessions"
    >
      <div style={{ flex: 1, overflow:'auto', padding: 10, display:'flex', flexDirection:'column', gap: 10 }}>
        <D3DeviceHero />
        <D3HealthGrid />
        <D3InterfaceTable density={density} />
      </div>
    </MasterShell>
  );
}

function D3DeviceHero() {
  return (
    <div className="anth-panel" style={{ padding: '12px 14px', display:'flex', alignItems:'center', gap: 16 }}>
      <div style={{ width: 48, height: 48, borderRadius: 4, background:'var(--anth-accent)', color:'var(--anth-accent-ink)',
                    display:'flex', alignItems:'center', justifyContent:'center', flex: '0 0 auto' }}>
        <IcoDevice size={26} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 2 }}>
          <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>lon-core-01.apex</span>
          <span className="chip ok">ready</span>
          <span className="chip idle">core · LON-CORE</span>
        </div>
        <div style={{ fontSize: 11.5, color:'var(--anth-text-3)' }}>Arista 7280R3-32P4 · EOS 4.31.2F · loopback0 10.255.0.1 · ASN 64512 · serial JPE21340042 · rack R14 · uptime 138d 4h</div>
      </div>
      <div style={{ display:'flex', gap: 12, fontSize: 11 }}>
        {[
          { lbl:'CPU', val:'14%', col:'ok' },
          { lbl:'Mem', val:'38%', col:'ok' },
          { lbl:'Temp',val:'37°', col:'ok' },
          { lbl:'PSU', val:'2/2', col:'ok' },
        ].map((k, i) => (
          <div key={i} style={{ textAlign:'center', padding:'2px 12px', borderRight: i < 3 ? '1px solid var(--anth-border)' : 'none' }}>
            <div className="micro" style={{ fontSize: 9.5 }}>{k.lbl}</div>
            <div className="mono num" style={{ fontSize: 16, fontWeight: 600, color: `var(--anth-${k.col})` }}>{k.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function D3HealthGrid() {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
      {[
        { lbl:'CPU · 5 min',  val:'14 %', seed: 31 },
        { lbl:'Memory',       val:'38 %', seed: 32 },
        { lbl:'Bandwidth in', val:'418 Gbps', seed: 33 },
        { lbl:'Bandwidth out',val:'408 Gbps', seed: 34 },
      ].map((k, i) => (
        <div key={i} className="anth-panel" style={{ padding: 10 }}>
          <div className="micro">{k.lbl}</div>
          <div className="mono num" style={{ fontSize: 18, fontWeight: 600 }}>{k.val}</div>
          <Spark seed={k.seed} width={300} height={26} color={i < 2 ? 'var(--anth-info)' : 'var(--anth-ok)'} />
        </div>
      ))}
    </div>
  );
}

function D3InterfaceTable({ density }) {
  return (
    <div className="anth-panel" style={{ '--anth-row': density === 'compact' ? '24px' : '28px' }}>
      <div className="anth-panel-hd">
        <span className="ttl">Interfaces</span>
        <span className="sub">64 ports · 4 LAGs · 6 trunks</span>
        <span className="actions">
          <span className="ix"><IcoFilter size={13}/></span>
          <span className="ix"><IcoExport size={13}/></span>
          <span className="ix"><IcoMore size={14}/></span>
        </span>
      </div>
      <div className="anth-panel-bd" style={{ overflow:'auto' }}>
        <table className="anth-table">
          <thead><tr><th style={{width:22}}/><th>Interface</th><th>Description</th><th>Type</th><th>Speed</th><th>VLAN/Vrf</th><th className="colhead-num">In bps</th><th className="colhead-num">Out bps</th><th className="colhead-num">In pps</th><th className="colhead-num">Out pps</th><th className="colhead-num">Errors</th><th>Last flap</th></tr></thead>
          <tbody>
            {[
              ['ok','Eth1/1', '→ lon-spine-01 Eth7/1', '400GBASE-DR4', '400G', 'trunk', '94.2 G','97.1 G', '5.84 M','5.91 M','0','138d'],
              ['ok','Eth1/2', '→ lon-spine-02 Eth7/1', '400GBASE-DR4', '400G', 'trunk', '91.4 G','89.7 G', '5.62 M','5.51 M','0','138d'],
              ['ok','Eth1/3', '→ lon-spine-03 Eth7/1', '400GBASE-DR4', '400G', 'trunk', '88.2 G','86.4 G', '5.41 M','5.33 M','0','138d'],
              ['ok','Eth1/4', '→ lon-spine-04 Eth7/1', '400GBASE-DR4', '400G', 'trunk', '76.8 G','74.1 G', '4.71 M','4.55 M','0','138d'],
              ['ok','Po10','LAG to spines (1-4)',     '400G LACP',   '1.6T', 'trunk', '350.6 G','347.3 G','21.5 M','21.3 M','0','138d'],
              ['ok','Eth49/1','→ ams-edge-03 Eth5/3','100GBASE-LR4', '100G', 'wan-emea','38.1 G','36.4 G', '2.34 M','2.24 M','0','201d'],
              ['ok','Eth50/1','→ fra-core-01 Eth7/3','100GBASE-LR4', '100G', 'wan-emea','52.3 G','55.7 G', '3.21 M','3.42 M','0','287d'],
              ['warn','Eth5/14','→ lon-leaf-11 Eth52','100GBASE-SR4', '100G', 'trunk', '4.1 G',  '3.9 G', '252 K', '241 K','14','12d'],
              ['idle','Eth5/15','reserved · spare',    '100GBASE-SR4', '100G', '—',     '—',      '—',     '—',     '—',    '0','—'],
              ['ok','Lo0',     'router-id',            'loopback',    '—',    'default','—',      '—',     '—',     '—',    '0','—'],
              ['ok','Ma1',     'oob mgmt',             '1G-T',        '1G',   'mgmt',   '4.1 K',  '8.7 K', '12',    '18',   '0','—'],
            ].map((r, i) => (
              <tr key={i} className={i === 0 ? 'selected' : ''}>
                <td><span className={`dot ${r[0]}`} /></td>
                <td className="mono" style={{ fontWeight: 600 }}>{r[1]}</td>
                <td style={{ color:'var(--anth-text-2)', fontSize: 11.5 }}>{r[2]}</td>
                <td className="mono" style={{ fontSize: 11, color:'var(--anth-text-3)' }}>{r[3]}</td>
                <td className="mono num">{r[4]}</td>
                <td className="mono" style={{ fontSize: 11, color:'var(--anth-text-3)' }}>{r[5]}</td>
                <td className="mono num right">{r[6]}</td>
                <td className="mono num right">{r[7]}</td>
                <td className="mono num right">{r[8]}</td>
                <td className="mono num right">{r[9]}</td>
                <td className="mono num right" style={{ color: r[10] !== '0' ? 'var(--anth-warn)' : 'var(--anth-text-3)' }}>{r[10]}</td>
                <td className="mono" style={{ fontSize: 11, color:'var(--anth-text-3)' }}>{r[11]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { MasterD1, MasterD2, MasterD3 });
