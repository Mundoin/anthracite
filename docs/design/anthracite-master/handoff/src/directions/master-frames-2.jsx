// Direction D — Master frames part 2
// D4: Topology · L3 underlay with 3D affordance
// D5: Diagnose · path trace
// D6: Build · config authoring with baseline diff

// ─── D4: Topology ────────────────────────────────────────────────────────────
function MasterD4({ density, railVariant, opsExpanded }) {
  return (
    <MasterShell
      mode="topology"
      railVariant={railVariant}
      crumbs={['Topology', 'apex-prod-emea', 'LON-CORE · L3 underlay']}
      subnav={<MasterSubNav
        items={[
          { label: 'Physical' },
          { label: 'L2 fabric' },
          { label: 'L3 underlay', active: true },
          { label: 'eBGP peers' },
          { label: 'VXLAN overlays' },
          { label: 'Path traces', count: 12 },
        ]}
        right={<React.Fragment>
          <div className="filter">site <b>:</b> LON-CORE</div>
          <div className="filter">role <b>:</b> core+spine+leaf</div>
          <span className="vr" />
          <div style={{ display:'flex', height: 24, border:'1px solid var(--anth-border-strong)', borderRadius: 3, overflow:'hidden' }}>
            <span style={{ padding:'0 8px', display:'inline-flex', alignItems:'center', gap: 4, fontSize: 11, background:'var(--anth-bg-selected)', fontWeight:600 }}>2D</span>
            <span style={{ padding:'0 8px', display:'inline-flex', alignItems:'center', gap: 4, fontSize: 11, color:'var(--anth-text-3)' }}>3D · Babylon</span>
          </div>
          <span className="btn sm"><IcoRefresh size={12} /> Re-layout</span>
          <span className="btn sm"><IcoExport size={12} /> Snapshot</span>
        </React.Fragment>}
      />}
      opsExpanded={opsExpanded}
      statusNote="topology graph · 248 nodes · 612 edges · render 2D fallback · WebGL2 detected"
    >
      <div style={{ position:'relative', flex: 1, background:'#FBFCFE', overflow:'hidden' }}>
        <D4TopologyCanvas />
        <D4Legend />
        <D4LayerStack />
        <D4Minimap />
        <D4BabylonHint />
        <D4SelectionInspector />
      </div>
    </MasterShell>
  );
}

function D4TopologyCanvas() {
  const spines = [{x: 360, y: 130},{x: 580, y: 130},{x: 800, y: 130},{x: 1020, y: 130}];
  const leaves = Array.from({length: 8}).map((_,i) => ({x: 240 + i*120, y: 360 }));
  const cores  = [{x: 580, y: 540},{x: 800, y: 540}];
  const edges  = [{x: 320, y: 720},{x: 540, y: 720},{x: 760, y: 720},{x: 980, y: 720}];
  const spineLabels = ['lon-spine-01','lon-spine-02','lon-spine-03','lon-spine-04'];
  const coreLabels = ['lon-core-01','lon-core-02'];
  const edgeLabels = ['ams-edge-03','fra-core-01','dub-bgp-01','par-leaf-01'];

  return (
    <svg width="100%" height="100%" style={{ display:'block' }}>
      <defs>
        <pattern id="d4grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#EDF2F7" strokeWidth="0.5"/>
        </pattern>
        <radialGradient id="d4selglow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3182CE" stopOpacity="0.18" />
          <stop offset="1" stopColor="#3182CE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#d4grid)" />

      {/* selection glow on lon-core-01 */}
      <ellipse cx={cores[0].x} cy={cores[0].y} rx="110" ry="80" fill="url(#d4selglow)" />

      {/* layer captions */}
      <text x="20" y="48" fontSize="9.5" fontFamily="Cascadia Mono" fill="#B0BCCB">SPINE · 4</text>
      <text x="20" y="280" fontSize="9.5" fontFamily="Cascadia Mono" fill="#B0BCCB">LEAF · 32</text>
      <text x="20" y="510" fontSize="9.5" fontFamily="Cascadia Mono" fill="#B0BCCB">CORE · 2</text>
      <text x="20" y="690" fontSize="9.5" fontFamily="Cascadia Mono" fill="#B0BCCB">EDGE · 64</text>

      {/* mesh spine→leaf */}
      {spines.map((s, si) => leaves.map((l, li) => (
        <line key={'sl'+si+li} x1={s.x} y1={s.y + 24} x2={l.x} y2={l.y - 24}
              stroke="#CBD5E0" strokeWidth="0.8" opacity="0.8" />
      )))}
      {/* core ↔ spine selected */}
      {spines.map((s, si) => (
        <line key={'cs'+si} x1={cores[0].x} y1={cores[0].y - 24} x2={s.x} y2={s.y + 24}
              stroke="#3182CE" strokeWidth={si === 1 ? 2.4 : 1.4} opacity={si === 1 ? 1 : 0.65} />
      ))}
      {/* core → edge */}
      {cores.map((c, ci) => edges.map((e, ei) => (
        <line key={'ce'+ci+ei} x1={c.x} y1={c.y + 24} x2={e.x} y2={e.y - 24}
              stroke="#CBD5E0" strokeWidth="0.8" />
      )))}
      {/* selected path lon-core-01 → spine-02 → northbound (out of canvas) */}
      <path d={`M ${cores[0].x} ${cores[0].y - 24} L ${spines[1].x} ${spines[1].y + 24} L ${spines[1].x} 60`}
            stroke="#3182CE" strokeWidth="2.4" fill="none" />

      {/* nodes */}
      {spines.map((s, i) => <D4Node key={'sp'+i} x={s.x} y={s.y} kind="spine" id={spineLabels[i]} />)}
      {leaves.map((l, i) => (
        <D4Node key={'lf'+i} x={l.x} y={l.y} kind="leaf"
                id={`lon-leaf-${(i+11).toString().padStart(2,'0')}`}
                state={i === 0 || i === 1 ? 'warn' : 'ok'} />
      ))}
      {cores.map((c, i) => <D4Node key={'co'+i} x={c.x} y={c.y} kind="core" id={coreLabels[i]} selected={i === 0} />)}
      {edges.map((e, i) => <D4Node key={'ed'+i} x={e.x} y={e.y} kind="edge" id={edgeLabels[i]} />)}

      {/* off-canvas alert beacon */}
      <g transform="translate(80, 360)">
        <rect x="-6" y="-12" width="138" height="24" rx="3" fill="#FBE6E6" stroke="#E53E3E" strokeWidth="0.8" />
        <circle cx="6" cy="0" r="3.5" fill="#E53E3E" />
        <text x="16" y="3.5" fontSize="10" fontFamily="Cascadia Mono" fill="#9B1C1C">fra-leaf-04 link-down</text>
      </g>
    </svg>
  );
}

function D4Node({ x, y, id, kind, selected, state = 'ok' }) {
  const colors = {
    core:  { fill:'#1A202C', text:'#fff',     stroke:'#1A202C', sub:'#B0BCCB' },
    spine: { fill:'#fff',    text:'#1A202C',  stroke:'#3182CE', sub:'#6B7585' },
    leaf:  { fill:'#fff',    text:'#1A202C',  stroke: state === 'warn' ? '#D69E2E' : '#D1D9E6', sub:'#6B7585' },
    edge:  { fill:'#fff',    text:'#1A202C',  stroke:'#38A169', sub:'#6B7585' },
  };
  const c = colors[kind];
  return (
    <g>
      {selected && <rect x={x-66} y={y-30} width="132" height="60" rx="4" fill="none" stroke="#3182CE" strokeWidth="1.8" strokeDasharray="3 2" />}
      <rect x={x-56} y={y-22} width="112" height="44" rx="3" fill={c.fill} stroke={c.stroke} strokeWidth="1.4" />
      {state === 'warn' && <rect x={x-56} y={y-22} width="112" height="3" fill="#D69E2E" />}
      <text x={x} y={y-5} fontSize="10" fontFamily="Cascadia Mono" textAnchor="middle" fill={c.text} fontWeight="700">{id}</text>
      <text x={x} y={y+9} fontSize="8.5" fontFamily="Cascadia Mono" textAnchor="middle" fill={c.sub}>{kind.toUpperCase()}</text>
      {/* mini port row */}
      <g transform={`translate(${x-44}, ${y+15})`}>
        {Array.from({length: 8}).map((_, i) => (
          <rect key={i} x={i*11} y={0} width="9" height="3" fill={i < 6 ? '#38A169' : i < 7 ? '#D69E2E' : '#CBD5E0'} />
        ))}
      </g>
    </g>
  );
}

function D4Legend() {
  return (
    <div style={{ position:'absolute', left: 16, top: 16, background:'var(--anth-bg-panel)',
                  border:'1px solid var(--anth-border-strong)', borderRadius: 4,
                  padding: '8px 10px', boxShadow:'var(--anth-shadow-sm)' }}>
      <div className="micro" style={{ marginBottom: 4 }}>L3 underlay · LON-CORE</div>
      <div style={{ display:'flex', flexDirection:'column', gap: 5, fontSize: 11 }}>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}><span style={{width:14, height: 2.5, background:'#3182CE' }}/> active path</div>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}><span style={{width:14, height: 1, background:'#CBD5E0' }}/> learned link</div>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}><span style={{width:10, height: 8, border:'1.5px solid #3182CE', background:'#fff'}}/> spine</div>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}><span style={{width:10, height: 8, background:'#1A202C'}}/> core</div>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}><span style={{width:10, height: 8, border:'1.5px solid #38A169', background:'#fff'}}/> edge</div>
        <div style={{ display:'flex', gap: 8, alignItems:'center' }}><span style={{width:10, height: 8, border:'1.5px solid #D69E2E', background:'#fff'}}/> leaf · alert</div>
      </div>
    </div>
  );
}

function D4LayerStack() {
  return (
    <div style={{ position:'absolute', right: 16, top: 16, background:'var(--anth-bg-panel)',
                  border:'1px solid var(--anth-border-strong)', borderRadius: 4,
                  width: 180, boxShadow:'var(--anth-shadow-sm)', overflow:'hidden' }}>
      <div className="micro" style={{ padding: '6px 10px', borderBottom:'1px solid var(--anth-border)' }}>Layers</div>
      {[
        ['Physical',     true, 'all'],
        ['L2 fabric',    false, '418 edges'],
        ['L3 underlay',  true,  '827 edges'],
        ['iBGP mesh',    false, '54 sessions'],
        ['eBGP edge',    false, '59 sessions'],
        ['VXLAN overlay',false, '142 vnis'],
        ['Path traces',  false, '12 saved'],
      ].map((l, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 10px', fontSize: 11.5,
                                background: l[1] ? 'var(--anth-bg-selected)' : 'transparent',
                                borderLeft: l[1] ? '2px solid var(--anth-info)' : '2px solid transparent' }}>
          <span style={{ width: 12, height: 12, border:'1px solid var(--anth-border-strong)', borderRadius: 2,
                          background: l[1] ? 'var(--anth-info)' : 'var(--anth-bg-panel)',
                          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize: 9 }}>
            {l[1] ? '✓' : ''}
          </span>
          <span style={{ flex: 1, color: l[1] ? 'var(--anth-text)' : 'var(--anth-text-2)', fontWeight: l[1] ? 600 : 400 }}>{l[0]}</span>
          <span className="mono" style={{ fontSize: 10, color:'var(--anth-text-3)' }}>{l[2]}</span>
        </div>
      ))}
    </div>
  );
}

function D4Minimap() {
  return (
    <div style={{ position:'absolute', right: 16, bottom: 16, width: 200, height: 130,
                  background:'var(--anth-bg-panel)', border:'1px solid var(--anth-border-strong)',
                  borderRadius: 4, boxShadow:'var(--anth-shadow-sm)', overflow:'hidden' }}>
      <div className="micro" style={{ padding: '5px 10px', borderBottom:'1px solid var(--anth-border)' }}>Minimap</div>
      <svg viewBox="0 0 200 100" width="100%" height="100" style={{display:'block'}}>
        {[...Array(4)].map((_,i)=><rect key={'s'+i} x={28+i*38} y={18} width="18" height="6" fill="#3182CE" opacity="0.4" />)}
        {[...Array(8)].map((_,i)=><rect key={'l'+i} x={18+i*22} y={40} width="12" height="5" fill="#CBD5E0" />)}
        {[...Array(2)].map((_,i)=><rect key={'c'+i} x={68+i*38} y={60} width="18" height="6" fill="#1A202C" />)}
        {[...Array(4)].map((_,i)=><rect key={'e'+i} x={28+i*38} y={80} width="16" height="5" fill="#fff" stroke="#38A169" strokeWidth="0.8" />)}
        <rect x="58" y="14" width="80" height="60" stroke="#3182CE" strokeWidth="1" fill="rgba(49,130,206,0.06)" />
      </svg>
    </div>
  );
}

function D4BabylonHint() {
  return (
    <div style={{ position:'absolute', left: 16, bottom: 16, background:'var(--anth-bg-panel)',
                  border:'1px solid var(--anth-border-strong)', borderRadius: 4,
                  padding: '6px 10px', fontSize: 11, color:'var(--anth-text-3)',
                  display:'flex', alignItems:'center', gap: 8, boxShadow:'var(--anth-shadow-sm)' }}>
      <IcoEye size={13} />
      <span>2D · <b style={{color:'var(--anth-text)'}}>switch to 3D (Babylon)</b></span>
      <span className="kbd">G</span>
      <span style={{ width: 1, height: 10, background:'var(--anth-border-strong)' }} />
      <span>elements 248 · edges 612 · WebGL2 ok</span>
    </div>
  );
}

function D4SelectionInspector() {
  return (
    <div style={{ position:'absolute', left: 200, bottom: 90, width: 300,
                  background:'var(--anth-bg-panel)', border:'1px solid var(--anth-border-strong)',
                  borderRadius: 4, boxShadow:'var(--anth-shadow-pop)', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'8px 10px', borderBottom:'1px solid var(--anth-border)', background:'var(--anth-bg-sunken)' }}>
        <span className="micro" style={{ fontSize: 9.5 }}>Selection</span>
        <span style={{ color:'var(--anth-text-muted)' }}>·</span>
        <span className="dot ok" />
        <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, flex: 1 }}>lon-core-01.apex</span>
        <span style={{ color:'var(--anth-text-3)' }}><IcoLink size={12} /></span>
        <span style={{ color:'var(--anth-text-3)' }}><IcoX size={12} /></span>
      </div>
      <div style={{ padding: 10, display:'flex', flexDirection:'column', gap: 6, fontSize: 11.5 }}>
        <div style={{ display:'grid', gridTemplateColumns:'70px 1fr', gap:'3px 8px' }}>
          <span style={{color:'var(--anth-text-3)'}}>platform</span><span className="mono">Arista 7280R3-32P4</span>
          <span style={{color:'var(--anth-text-3)'}}>role</span><span className="mono">core</span>
          <span style={{color:'var(--anth-text-3)'}}>asn</span><span className="mono">64512</span>
          <span style={{color:'var(--anth-text-3)'}}>loopback0</span><span className="mono">10.255.0.1</span>
        </div>
        <div className="hr" style={{ margin:'4px 0' }} />
        <div className="micro" style={{ fontSize: 9.5 }}>Connected via</div>
        <div style={{ display:'flex', flexDirection:'column', gap: 3, fontFamily:'var(--anth-font-mono)', fontSize: 10.5 }}>
          <div>Eth1/1 → lon-spine-01 Eth7/1 · 400G</div>
          <div>Eth1/2 → lon-spine-02 Eth7/1 · 400G ★</div>
          <div>Eth1/3 → lon-spine-03 Eth7/1 · 400G</div>
          <div>Eth1/4 → lon-spine-04 Eth7/1 · 400G</div>
        </div>
        <div className="hr" style={{ margin:'4px 0' }} />
        <div style={{ display:'flex', gap: 4 }}>
          <span className="btn sm" style={{ flex: 1, justifyContent:'center' }}>Trace path…</span>
          <span className="btn sm" style={{ flex: 1, justifyContent:'center' }}>Open in Operate</span>
        </div>
      </div>
    </div>
  );
}

// ─── D5: Diagnose · path trace ───────────────────────────────────────────────
function MasterD5({ density, railVariant }) {
  return (
    <MasterShell
      mode="diagnose"
      railVariant={railVariant}
      crumbs={['Diagnose', 'Path trace', 'trace-04421']}
      subnav={<MasterSubNav
        items={[
          { label: 'Path trace', active: true },
          { label: 'Reachability matrix' },
          { label: 'BGP what-if' },
          { label: 'ACL evaluator' },
          { label: 'Saved traces', count: 47 },
        ]}
        right={<React.Fragment>
          <span className="muted" style={{ fontSize: 11 }}>trace-04421 · saved 4 m ago</span>
          <span className="btn sm">Re-run</span>
          <span className="btn sm primary"><IcoExport size={12}/> Attach to incident</span>
        </React.Fragment>}
      />}
      statusNote="diagnose · path complete · 8 hops · 1 anomaly · 2.4 ms p50"
    >
      <div style={{ flex: 1, display:'grid', gridTemplateColumns:'320px 1fr', gridTemplateRows:'1fr 220px', overflow:'hidden' }}>
        <div style={{ gridRow:'1 / 3' }}><D5InputPanel /></div>
        <div style={{ overflow:'hidden' }}><D5PathGraph /></div>
        <div style={{ overflow:'hidden' }}><D5OpsConsole /></div>
      </div>
    </MasterShell>
  );
}

function D5InputPanel() {
  return (
    <div style={{ background:'var(--anth-bg-panel)', borderRight:'1px solid var(--anth-border)', overflow:'auto', padding: 14, height:'100%' }}>
      <div className="micro" style={{ marginBottom: 6 }}>Path trace · hypothesis</div>
      <p style={{ fontSize: 11.5, color:'var(--anth-text-3)', marginTop: 4, lineHeight: 1.55 }}>
        Synthesize the forwarding path from a source to a destination prefix, VRF-aware. The Rust diagnose engine walks RIB/FIB on every hop in parallel and reconciles control plane with observed forwarding.
      </p>
      <div style={{ display:'flex', flexDirection:'column', gap: 12, marginTop: 14 }}>
        <div>
          <div className="micro" style={{ fontSize: 9.5, marginBottom: 4 }}>Source</div>
          <div style={{ display:'flex', alignItems:'center', gap: 6, height: 28, padding: '0 8px', border:'1px solid var(--anth-border-strong)', borderRadius: 3, background:'var(--anth-bg-panel)' }}>
            <span className="dot ok" />
            <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, flex: 1 }}>lon-core-01.apex</span>
            <IcoChevD size={11} style={{color:'var(--anth-text-muted)'}}/>
          </div>
        </div>
        <div>
          <div className="micro" style={{ fontSize: 9.5, marginBottom: 4 }}>VRF · scope</div>
          <div style={{ display:'flex', gap: 4 }}>
            {['default','tenant-novax','mgmt'].map((v, i) => (
              <span key={i} style={{ padding:'4px 8px', fontSize: 11, borderRadius: 3,
                                      background: i === 0 ? 'var(--anth-bg-selected)' : 'var(--anth-bg-sunken)',
                                      color: i === 0 ? 'var(--anth-text)' : 'var(--anth-text-3)',
                                      fontWeight: i === 0 ? 600 : 400 }} className="mono">{v}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="micro" style={{ fontSize: 9.5, marginBottom: 4 }}>Destination</div>
          <div style={{ display:'flex', alignItems:'center', gap: 6, height: 28, padding: '0 8px', border:'1.5px solid var(--anth-info)', borderRadius: 3, boxShadow:'0 0 0 2px var(--anth-info-tint)' }}>
            <span className="mono" style={{ fontSize: 11.5, flex: 1, fontWeight: 600 }}>10.86.4.221/32</span>
          </div>
          <div style={{ fontSize: 10.5, color:'var(--anth-text-3)', marginTop: 4 }}>matches prefix 10.86.0.0/16 · learned via iBGP from <span className="mono">fra-core-01</span> · preference 200</div>
        </div>
        <div>
          <div className="micro" style={{ fontSize: 9.5, marginBottom: 4 }}>Mode</div>
          <div style={{ display:'flex', height: 26, border:'1px solid var(--anth-border-strong)', borderRadius: 3, overflow:'hidden' }}>
            {['Forwarding','Reverse','Bidirectional'].map((m,i)=>(
              <span key={i} style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center',
                                       fontSize: 11, background: i === 0 ? 'var(--anth-bg-selected)' : 'transparent',
                                       fontWeight: i === 0 ? 600 : 400, color: i === 0 ? 'var(--anth-text)' : 'var(--anth-text-3)' }}>{m}</span>
            ))}
          </div>
        </div>
        <div>
          <div className="micro" style={{ fontSize: 9.5, marginBottom: 4 }}>Probes</div>
          <div style={{ display:'flex', gap: 4, flexWrap:'wrap' }}>
            {['RIB walk','FIB','ACL eval','TCP/443','ICMP','MTR','jitter'].map((p, i) => {
              const sel = i < 4;
              return (
                <span key={i} style={{ padding:'3px 7px', fontSize: 10.5, borderRadius: 3,
                                          background: sel ? 'var(--anth-bg-selected)' : 'var(--anth-bg-sunken)',
                                          color: sel ? 'var(--anth-text)' : 'var(--anth-text-3)',
                                          fontWeight: sel ? 600 : 400 }}>{p}</span>
              );
            })}
          </div>
        </div>
        <span className="btn primary" style={{ marginTop: 4 }}><IcoBolt size={12}/> Run trace</span>
      </div>
      <div style={{ marginTop: 18, paddingTop: 12, borderTop:'1px solid var(--anth-border)' }}>
        <div className="micro" style={{ marginBottom: 6 }}>Result · 8 hops · 2.4 ms p50</div>
        <div style={{ display:'flex', flexDirection:'column', gap: 5, fontSize: 11.5 }}>
          {[
            ['rib',     'consistent across 8 hops',   'ok'],
            ['mtu',     '1500 end-to-end · no PMTUD', 'ok'],
            ['acl',     'no deny on path',            'ok'],
            ['queueing','tail drops on lon-leaf-11 Eth49/1', 'warn'],
            ['ecmp',    '2 hash buckets · stable',    'ok'],
            ['arp',     '5c:4a:1f:08:7c:32 · vlan 486', 'ok'],
          ].map((r, i) => (
            <div key={i} style={{ display:'flex', gap: 8, alignItems:'flex-start' }}>
              <span className="micro" style={{ width: 56, fontSize: 9.5, marginTop: 1 }}>{r[0]}</span>
              <span className={`dot ${r[2]}`} style={{ marginTop: 5 }} />
              <span style={{ flex: 1, color: r[2] === 'warn' ? 'var(--anth-warn)' : r[2] === 'err' ? 'var(--anth-err)' : 'var(--anth-text-2)' }}>{r[1]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function D5PathGraph() {
  const hops = [
    { id:'lon-core-01', x: 110, type:'core',  intf:'Eth50/1', rib:'10.86.0.0/16 → ibgp', t:'0.0' },
    { id:'lon-spine-02',x: 280, type:'spine', intf:'Eth7/3',  rib:'ecmp · sel Eth7/3',   t:'0.4' },
    { id:'fra-core-01', x: 450, type:'core',  intf:'Eth7/3',  rib:'10.86.4.0/24 conn',   t:'1.0' },
    { id:'fra-leaf-12', x: 620, type:'leaf',  intf:'Eth1/1',  rib:'10.86.4.0/24 svi',    t:'1.4' },
    { id:'fra-leaf-12', x: 790, type:'arp',   intf:'Vlan486', rib:'arp 10.86.4.221',     t:'1.8' },
    { id:'lon-leaf-11', x: 960, type:'leaf',  intf:'Eth49/1', rib:'ECMP · 2 buckets',    t:'2.0', warn:true },
    { id:'10.86.4.221', x: 1130,type:'host',  intf:'—',       rib:'reachable',           t:'2.4' },
  ];
  return (
    <div style={{ overflow:'auto', background:'#FBFCFE', height:'100%' }}>
      <svg width="1280" height="100%" style={{ display:'block', minHeight: 500 }}>
        <defs>
          <pattern id="d5grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#EDF2F7" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="1280" height="600" fill="url(#d5grid)" />

        {/* timeline strip */}
        <line x1="60" y1="280" x2="1180" y2="280" stroke="#3182CE" strokeWidth="2" />
        {/* tick marks */}
        {[0,0.5,1,1.5,2,2.5].map((t, i) => {
          const x = 60 + (t/2.5) * 1120;
          return (
            <g key={i}>
              <line x1={x} y1={280} x2={x} y2={290} stroke="#CBD5E0" />
              <text x={x} y={304} fontSize="9" fontFamily="Cascadia Mono" textAnchor="middle" fill="#B0BCCB">{t} ms</text>
            </g>
          );
        })}

        {hops.map((h, i) => (
          <g key={i}>
            {/* connector to RIB callout above */}
            <line x1={h.x} y1={280} x2={h.x} y2={180} stroke="#CBD5E0" strokeWidth="1" strokeDasharray="2 3" />
            {/* dot */}
            <circle cx={h.x} cy={280} r="8" fill={h.warn ? '#D69E2E' : '#3182CE'} stroke="#fff" strokeWidth="3" />
            {/* hop label */}
            <text x={h.x} y={332} textAnchor="middle" fontSize="10.5" fontFamily="Cascadia Mono" fill="#1A202C" fontWeight="700">{h.id}</text>
            <text x={h.x} y={346} textAnchor="middle" fontSize="9" fontFamily="Cascadia Mono" fill="#6B7585">{h.type.toUpperCase()} · {h.intf}</text>
            <text x={h.x} y={358} textAnchor="middle" fontSize="8.5" fontFamily="Cascadia Mono" fill="#B0BCCB">t+{h.t} ms · hop {i+1}</text>
            {/* RIB callout */}
            <rect x={h.x - 86} y={108} width="172" height="56" fill="#fff" stroke="#E1E8F0" strokeWidth="0.8" rx="3" />
            <text x={h.x-78} y={124} fontSize="8.5" fontFamily="Cascadia Mono" fill="#6B7585">RIB · {h.type}</text>
            <text x={h.x-78} y={138} fontSize="9.5" fontFamily="Cascadia Mono" fill="#1A202C">{h.rib.length > 22 ? h.rib.slice(0,21)+'…' : h.rib}</text>
            <text x={h.x-78} y={152} fontSize="8.5" fontFamily="Cascadia Mono" fill="#6B7585">↳ next: {hops[i+1] ? hops[i+1].id : 'host'}</text>
          </g>
        ))}

        {/* anomaly band */}
        <rect x="900" y="380" width="200" height="64" fill="#FAF1DD" stroke="#D69E2E" rx="3" />
        <text x="912" y="400" fontSize="10" fontFamily="Cascadia Mono" fill="#8A5A0A" fontWeight="700">ANOMALY · hop 6</text>
        <text x="912" y="416" fontSize="9.5" fontFamily="Cascadia Mono" fill="#8A5A0A">Eth49/1 · 14 tail drops</text>
        <text x="912" y="430" fontSize="9.5" fontFamily="Cascadia Mono" fill="#8A5A0A">pre-FEC BER 1.2e-6 · 60 s</text>
        <text x="912" y="442" fontSize="9.5" fontFamily="Cascadia Mono" fill="#8A5A0A" textDecoration="underline">→ open queue inspector</text>
      </svg>
    </div>
  );
}

function D5OpsConsole() {
  return (
    <div style={{ background:'#0F172A', color:'#E2E8F0', fontFamily:'var(--anth-font-mono)', fontSize: 11, display:'flex', flexDirection:'column', borderTop:'1px solid var(--anth-border-strong)' }}>
      <div style={{ display:'flex', alignItems:'flex-end', height: 26, padding: '0 10px', borderBottom:'1px solid #1E293B' }}>
        {['trace-04421.log', 'rib · lon-core-01', 'arp · fra-leaf-12'].map((t, i) => (
          <div key={i} style={{ padding:'0 12px', height: 22, display:'flex', alignItems:'center', gap: 6,
                                  background: i === 0 ? '#1E293B' : 'transparent',
                                  color: i === 0 ? '#F8FAFC' : '#94A3B8',
                                  borderRadius:'3px 3px 0 0', fontSize: 10.5 }}>
            {t}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color:'#64748B', paddingBottom: 4 }}>live · 412 lines · auto-scroll</span>
      </div>
      <div style={{ flex: 1, overflow:'auto', padding: '6px 12px', lineHeight: 1.55 }}>
        <div><span style={{color:'#64748B'}}>17:42:13.012</span> <span style={{color:'#7DD3FC'}}>trace </span> start path lon-core-01 → 10.86.4.221 vrf=default</div>
        <div><span style={{color:'#64748B'}}>17:42:13.014</span> <span style={{color:'#38A169'}}>rib   </span> hop 1 · lon-core-01 · 10.86.0.0/16 nexthop 10.255.0.5 (ibgp · fra-core-01) preference 200</div>
        <div><span style={{color:'#64748B'}}>17:42:13.018</span> <span style={{color:'#38A169'}}>fib   </span> hop 2 · lon-spine-02 · ecmp 4 · selected Eth7/3 (hash policy: 5-tuple)</div>
        <div><span style={{color:'#64748B'}}>17:42:13.024</span> <span style={{color:'#38A169'}}>rib   </span> hop 3 · fra-core-01 · 10.86.4.0/24 nexthop direct · interface Eth7/3 · vxlan vni=10086</div>
        <div><span style={{color:'#64748B'}}>17:42:13.031</span> <span style={{color:'#38A169'}}>arp   </span> hop 4 · fra-leaf-12 · resolves 10.86.4.221 → 5c:4a:1f:08:7c:32 (vlan 486)</div>
        <div><span style={{color:'#64748B'}}>17:42:13.041</span> <span style={{color:'#D69E2E'}}>warn  </span> hop 6 · lon-leaf-11 Eth49/1 · 14 tail drops in last 60s, pre-FEC BER 1.2e-6</div>
        <div><span style={{color:'#64748B'}}>17:42:13.044</span> <span style={{color:'#7DD3FC'}}>probe </span> icmp 10.86.4.221 · 5/5 · rtt min 1.9 avg 2.4 max 3.1 ms · 0% loss</div>
        <div><span style={{color:'#64748B'}}>17:42:13.046</span> <span style={{color:'#7DD3FC'}}>probe </span> tcp/443 10.86.4.221 · SYN-ACK in 2.6 ms · TTL=58 · no MSS clamp</div>
        <div><span style={{color:'#64748B'}}>17:42:13.048</span> <span style={{color:'#38A169'}}>ok    </span> path complete · 8 hops · 1 anomaly · 0 black holes · stored as trace-04421</div>
        <div style={{ marginTop: 6 }}><span style={{color:'#94A3B8'}}>anth@apex-prod-emea</span> <span style={{color:'#38A169'}}>diagnose</span> <span style={{color:'#7DD3FC'}}>$</span> <span style={{ display:'inline-block', width: 7, height: 12, background:'#E2E8F0', verticalAlign:'middle' }}/></div>
      </div>
    </div>
  );
}

// ─── D6: Build · config authoring with baseline diff ─────────────────────────
function MasterD6({ density, railVariant, opsExpanded }) {
  return (
    <MasterShell
      mode="build"
      railVariant={railVariant}
      crumbs={['Build', 'leaf-base-eu', 'v4 · draft', 'Edit']}
      secondary={<MasterSecondaryNav mode="build" />}
      subnav={<MasterSubNav
        items={[
          { label: 'Edit', active: true },
          { label: 'Diff', count: 12 },
          { label: 'Targets', count: 248 },
          { label: 'Test', icon: <IcoBolt size={11}/> },
          { label: 'Promote' },
          { label: 'History', count: 47 },
        ]}
        right={<React.Fragment>
          <span className="chip warn">draft · unsaved</span>
          <span className="muted" style={{ fontSize: 11 }}>autosaved 38 s ago</span>
          <span className="btn sm">Test render…</span>
          <span className="btn sm primary"><IcoBolt size={12}/> Plan rollout</span>
        </React.Fragment>}
      />}
      opsExpanded={opsExpanded}
      statusNote="build · leaf-base-eu v4 · 1,420 lines · 12 lines changed · jinja2 + arista-canon validator"
    >
      <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden', minHeight: 0 }}>
        <D6Editor />
        <D6Diff />
      </div>
      <D6BottomBar />
    </MasterShell>
  );
}

function D6Editor() {
  const lines = [
    [142, '! ntp configuration', 'comment'],
    [143, 'ntp authenticate', 'add'],
    [144, 'ntp authentication-key 1 sha2 256 7 $9$ABC123…', 'add'],
    [145, 'ntp trusted-key 1', 'add'],
    [146, 'ntp server 10.20.0.5 prefer iburst key 1', 'mod'],
    [147, 'ntp server 10.20.0.7 iburst key 1', 'add'],
    [148, 'ntp server 10.20.0.8 iburst key 1', 'add'],
    [149, '! end ntp', 'comment'],
    [150, '', 'blank'],
    [151, '! aaa rotation Q3', 'comment'],
    [152, 'aaa group server tacacs+ TACACS-EU', 'plain'],
    [153, '  server 10.20.0.10', 'plain'],
    [154, '  server 10.20.0.11', 'plain'],
    [155, '  server 10.20.0.12', 'add'],
    [156, 'aaa authentication login default group TACACS-EU local', 'plain'],
    [157, 'aaa authorization commands all default group TACACS-EU local', 'plain'],
    [158, 'aaa accounting commands all default start-stop group TACACS-EU', 'plain'],
    [159, '!', 'comment'],
  ];
  const colors = { add: { bg:'#E7F4EC', border:'#38A169' }, mod: { bg:'#E1ECF7', border:'#3182CE' }, del: { bg:'#FBE6E6', border:'#E53E3E' }, comment: {}, plain: {}, blank: {} };
  return (
    <div style={{ background:'var(--anth-bg-panel)', borderRight:'1px solid var(--anth-border)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'0 12px', height: 32, borderBottom:'1px solid var(--anth-border)' }}>
        <span className="micro">Target · LEAF-BASE-EU.j2</span>
        <span style={{ color:'var(--anth-text-muted)' }}>·</span>
        <span className="mono" style={{ fontSize: 11.5 }}>jinja2 template · 1,420 lines</span>
        <span style={{ flex: 1 }} />
        <span className="muted" style={{ fontSize: 11 }}>ln 156, col 38 · UTF-8 · LF</span>
        <span className="btn sm ghost"><IcoExport size={12}/></span>
        <span className="btn sm ghost"><IcoMore size={13}/></span>
      </div>
      <div style={{ flex: 1, overflow:'auto', fontFamily:'var(--anth-font-mono)', fontSize: 11.5, lineHeight: 1.55, padding: '8px 0' }}>
        {lines.map((l, i) => {
          const c = colors[l[2]] || {};
          return (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'42px 14px 1fr',
              background: c.bg || 'transparent',
              borderLeft: c.border ? `2px solid ${c.border}` : '2px solid transparent',
              padding: '0 10px 0 0',
            }}>
              <span style={{ color:'var(--anth-text-muted)', textAlign:'right', paddingRight: 8 }}>{l[0]}</span>
              <span style={{ color: c.border || 'transparent', fontWeight: 700 }}>{l[2] === 'add' ? '+' : l[2] === 'del' ? '−' : l[2] === 'mod' ? '~' : ' '}</span>
              <span style={{ color: l[2] === 'comment' ? 'var(--anth-text-3)' : 'var(--anth-text)', whiteSpace:'pre' }}>{l[1]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function D6Diff() {
  return (
    <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--anth-bg-panel)' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'0 12px', height: 32, borderBottom:'1px solid var(--anth-border)' }}>
        <span className="micro">Diff vs baseline</span>
        <span style={{ color:'var(--anth-text-muted)' }}>·</span>
        <span className="mono" style={{ fontSize: 11.5 }}>LEAF-BASE-EU v3 → v4 (draft)</span>
        <span style={{ flex: 1 }} />
        <span className="chip ok">+ 7 add</span>
        <span className="chip info">~ 4 mod</span>
        <span className="chip err">− 1 del</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', overflow:'auto' }}>
        <D6DiffHunk
          file="ntp" lines={[
            ['142','142',' ','! ntp configuration','comment'],
            ['',   '143','+','ntp authenticate','add'],
            ['',   '144','+','ntp authentication-key 1 sha2 256 7 ***','add'],
            ['',   '145','+','ntp trusted-key 1','add'],
            ['143','146','~','ntp server 10.20.0.5 prefer iburst key 1','mod'],
            ['144','',  '−','ntp server 10.20.0.6','del'],
            ['',   '147','+','ntp server 10.20.0.7 iburst key 1','add'],
            ['',   '148','+','ntp server 10.20.0.8 iburst key 1','add'],
            ['145','149',' ','! end ntp','comment'],
          ]} note="3 servers → authenticated · key rotation Q3" />
        <D6DiffHunk
          file="aaa" lines={[
            ['151','151',' ','aaa group server tacacs+ TACACS-EU','plain'],
            ['152','152',' ','  server 10.20.0.10','plain'],
            ['153','153',' ','  server 10.20.0.11','plain'],
            ['',   '154','+','  server 10.20.0.12','add'],
            ['154','155',' ','aaa authentication login default group TACACS-EU local','plain'],
          ]} note="add new TACACS server (FRA region)" />
        <D6Validation />
      </div>
    </div>
  );
}

function D6DiffHunk({ file, lines, note }) {
  const colors = { add: { bg:'#E7F4EC', border:'#38A169' }, mod: { bg:'#E1ECF7', border:'#3182CE' }, del: { bg:'#FBE6E6', border:'#E53E3E' }, comment: {}, plain: {} };
  return (
    <div style={{ borderBottom: '1px solid var(--anth-border)' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'6px 12px', background:'var(--anth-bg-sunken)' }}>
        <span className="micro" style={{ fontSize: 9.5 }}>HUNK · {file}</span>
        <span style={{ color:'var(--anth-text-3)', fontSize: 10.5 }}>· {note}</span>
        <span style={{ flex: 1 }} />
        <span className="btn sm ghost" style={{ height: 18 }}>collapse</span>
      </div>
      <div style={{ fontFamily:'var(--anth-font-mono)', fontSize: 11.5, lineHeight: 1.55, padding: '4px 0' }}>
        {lines.map((l, i) => {
          const c = colors[l[4]] || {};
          return (
            <div key={i} style={{
              display:'grid', gridTemplateColumns:'38px 38px 16px 1fr',
              background: c.bg || 'transparent',
              borderLeft: c.border ? `2px solid ${c.border}` : '2px solid transparent',
              padding: '0 10px 0 0',
            }}>
              <span style={{ color:'var(--anth-text-muted)', textAlign:'right', paddingRight: 8 }}>{l[0]}</span>
              <span style={{ color:'var(--anth-text-muted)', textAlign:'right', paddingRight: 8 }}>{l[1]}</span>
              <span style={{ color: c.border || 'transparent', fontWeight: 700, textAlign:'center' }}>{l[2]}</span>
              <span style={{ color: l[4] === 'comment' ? 'var(--anth-text-3)' : 'var(--anth-text)', whiteSpace:'pre' }}>{l[3]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function D6Validation() {
  return (
    <div style={{ padding: 10, display:'flex', flexDirection:'column', gap: 6 }}>
      <div className="micro" style={{ marginBottom: 4 }}>Validation · arista-canon</div>
      {[
        ['ok',  'syntax · valid Arista EOS 4.31',                'parser'],
        ['ok',  'idempotent · re-render produces same hash',     'render'],
        ['ok',  'no removed AAA methods', 'safety'],
        ['warn','key rotation requires ssh re-auth on apply',     'safety'],
        ['ok',  '248 / 248 target devices canonicalized cleanly', 'targets'],
      ].map((r, i) => (
        <div key={i} style={{ display:'flex', gap: 8, alignItems:'center', fontSize: 11.5 }}>
          <span className={`dot ${r[0]}`} />
          <span style={{ flex: 1, color: r[0] === 'warn' ? 'var(--anth-warn)' : 'var(--anth-text-2)' }}>{r[1]}</span>
          <span className="muted mono" style={{ fontSize: 10 }}>{r[2]}</span>
        </div>
      ))}
    </div>
  );
}

function D6BottomBar() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 10, padding: '0 14px', height: 44,
                    background:'var(--anth-bg-panel)', borderTop:'1px solid var(--anth-border-strong)' }}>
      <span style={{ fontSize: 12 }}><b>248 devices</b> will receive this change</span>
      <span className="vr" />
      <span style={{ fontSize: 11.5, color:'var(--anth-text-3)' }}>
        <span className="chip ok" style={{ marginRight: 4 }}>+7</span>
        <span className="chip info" style={{ marginRight: 4 }}>~4</span>
        <span className="chip err">−1</span>
      </span>
      <span className="vr" />
      <span style={{ fontSize: 11.5, color:'var(--anth-text-3)' }}>preview · render targets all 248 · est. 12 s</span>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 11.5, color:'var(--anth-text-3)' }}>v4 · author marcus@netops-eu · reviewer required: 1</span>
      <span className="btn sm">Save draft</span>
      <span className="btn sm">Render</span>
      <span className="btn sm primary"><IcoBolt size={12}/> Plan rollout · 248</span>
    </div>
  );
}

Object.assign(window, { MasterD4, MasterD5, MasterD6 });
