// Master primitives — Direction D · "Anthracite v1" canonical shell.
// Everything else ports onto this set of components.

// ── Mode definitions ─────────────────────────────────────────────────────────
const MODE_GROUPS = [
  { hd: 'Foundation', items: [
    { id: 'hierarchy',   label: 'Hierarchy',    Icon: IcoHierarchy, hasSecondary: true,  badge: '8' },
    { id: 'provisioning',label: 'Provisioning', Icon: IcoProvision, hasSecondary: true },
  ]},
  { hd: 'Run',        items: [
    { id: 'operate',    label: 'Operate',     Icon: IcoOperate,    hasSecondary: true,  alerts: 4 },
    { id: 'topology',   label: 'Topology',    Icon: IcoTopology,   hasSecondary: false },
    { id: 'diagnose',   label: 'Diagnose',    Icon: IcoDiagnose,   hasSecondary: false },
  ]},
  { hd: 'Governance', items: [
    { id: 'assess',     label: 'Assess',      Icon: IcoAssess,     hasSecondary: false },
    { id: 'security',   label: 'Security',    Icon: IcoSecurity,   hasSecondary: true },
  ]},
  { hd: 'Workshop',   items: [
    { id: 'build',      label: 'Build',       Icon: IcoBuild,      hasSecondary: true },
    { id: 'dashboards', label: 'Dashboards',  Icon: IcoDashboards, hasSecondary: false },
  ]},
];
const ALL_MODES = MODE_GROUPS.flatMap(g => g.items);
const findMode = (id) => ALL_MODES.find(m => m.id === id);

// ── MasterTitleBar ───────────────────────────────────────────────────────────
function MasterTitleBar({ crumbs = [], env = 'apex-prod-emea', envScope = 'EMEA · Production · 2,184 dev',
                          envState = 'ok' }) {
  return (
    <div className="anth-titlebar" style={{ height: 36 }}>
      <div className="anth-tb-brand">
        <AnthMark size={18} />
        <div className="name">Anthracite</div>
      </div>
      <div className="anth-tb-env">
        <span className="env-dot" style={{ background: envState === 'err' ? 'var(--anth-err)' : envState === 'warn' ? 'var(--anth-warn)' : 'var(--anth-ok)',
                                            boxShadow: `0 0 0 2px ${envState === 'err' ? 'var(--anth-err-tint)' : envState === 'warn' ? 'var(--anth-warn-tint)' : 'var(--anth-ok-tint)'}` }} />
        <span className="env-name mono">{env}</span>
        <span className="env-scope">· {envScope}</span>
        <IcoChevD size={12} className="chev" />
      </div>
      {crumbs.length > 0 && (
        <div className="anth-tb-crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <IcoChevR size={10} className="sep" style={{color:'var(--anth-text-muted)'}} />}
              <span className={i === crumbs.length - 1 ? 'last' : ''}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div className="anth-tb-spacer" />
      <div className="anth-tb-cortex">
        <IcoSearch size={13} className="icon" />
        <span className="placeholder">Cortex — jump, search, run…</span>
        <span className="kbd">Ctrl</span><span className="kbd">K</span>
      </div>
      <span className="anth-tb-icon"><IcoBell size={15} /></span>
      <span className="anth-tb-icon"><IcoUser size={15} /></span>
      <div className="anth-tb-winctrls">
        <div><IcoMin size={14} /></div>
        <div><IcoMax size={11} /></div>
        <div className="close"><IcoX size={13} /></div>
      </div>
    </div>
  );
}

// ── MasterModeRail ───────────────────────────────────────────────────────────
function MasterModeRail({ active = 'hierarchy', variant = 'labeled' }) {
  const collapsed = variant === 'icons';
  return (
    <div className={`anth-rail ${collapsed ? 'icons' : 'labeled'}`} style={{ overflow:'hidden' }}>
      {MODE_GROUPS.map((g, gi) => (
        <React.Fragment key={gi}>
          {!collapsed && <div className="group-label" style={{ paddingTop: gi === 0 ? 10 : 14 }}>{g.hd}</div>}
          {collapsed && gi > 0 && <div style={{ height: 1, background:'var(--anth-border)', margin: '6px 12px' }} />}
          {g.items.map(m => {
            const isActive = m.id === active;
            const Icon = m.Icon;
            return (
              <div key={m.id} className={`item ${isActive ? 'active' : ''} ${m.alerts ? 'has-alert' : ''}`}>
                <Icon size={collapsed ? 17 : 15} className="ico" />
                <span className="lbl">{collapsed ? null : m.label}</span>
                {!collapsed && m.badge && !m.alerts && <span className="badge num">{m.badge}</span>}
                {!collapsed && m.alerts && <span className="badge num">{m.alerts}</span>}
                {collapsed && m.alerts && <span style={{ position:'absolute', right: 10, top: 8, width: 6, height: 6, borderRadius: 99, background:'var(--anth-err)' }} />}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── MasterSubNav ─────────────────────────────────────────────────────────────
function MasterSubNav({ items = [], right }) {
  return (
    <div className="anth-subnav" style={{ height: 34 }}>
      {items.map((it, i) => (
        <span key={i} className={`seg ${it.active ? 'active' : ''}`} style={ it.warn ? { color: 'var(--anth-warn)' } : it.err ? { color: 'var(--anth-err)' } : {}}>
          {it.icon}{it.icon && ' '}{it.label}
          {it.count !== undefined && <span className="count" style={ it.err ? { color: 'var(--anth-err)' } : it.warn ? { color: 'var(--anth-warn)' } : {}}>{it.count}</span>}
        </span>
      ))}
      <span className="grow" />
      {right}
    </div>
  );
}

// ── MasterSecondaryNav — collapsible per-mode object list ────────────────────
function MasterSecondaryNav({ mode = 'hierarchy', selected }) {
  const titles = {
    hierarchy:    { hd: 'Hierarchy',    sub: 'Environments · 8' },
    provisioning: { hd: 'Provisioning', sub: 'Plans · 14' },
    operate:      { hd: 'Operate',      sub: 'Devices · 2,184' },
    security:     { hd: 'Security',     sub: 'Policies · 36' },
    build:        { hd: 'Build',        sub: 'Workspaces · 12' },
  };
  const t = titles[mode] || titles.hierarchy;
  const groups = (mode === 'operate') ? [
    { hd: 'PINNED', items: [
      { lbl: 'lon-core-01.apex', sub: 'Arista 7280R · core', status: 'ok', sel: true },
      { lbl: 'fra-core-01.apex', sub: 'Arista 7280R · core', status: 'ok' },
    ]},
    { hd: 'BY SITE', items: [
      { lbl: 'LON-CORE',  sub: '248 devices · 1 warn',  status: 'warn', n: 248 },
      { lbl: 'FRA-CORE',  sub: '180 devices · 1 err',   status: 'err',  n: 180 },
      { lbl: 'AMS-EDGE',  sub: '96 devices',             status: 'ok',   n: 96  },
      { lbl: 'PAR-EDGE',  sub: '64 devices · 2 warn',   status: 'warn', n: 64  },
      { lbl: 'DUB-EDGE',  sub: '48 devices',             status: 'ok',   n: 48  },
      { lbl: 'MUC-DC1',   sub: '140 devices · 1 warn',  status: 'warn', n: 140 },
      { lbl: 'MAD-EDGE',  sub: '38 devices',             status: 'ok',   n: 38  },
      { lbl: 'MIL-EDGE',  sub: '32 devices · maint',    status: 'idle', n: 32  },
    ]},
  ] : (mode === 'build') ? [
    { hd: 'OPEN WORKSPACES', items: [
      { lbl: 'leaf-base-eu/v4', sub: 'baseline · draft', status: 'info', sel: true },
      { lbl: 'aaa-rotation-q3', sub: 'change · review', status: 'warn' },
    ]},
    { hd: 'TEMPLATES', items: [
      { lbl: 'LEAF-BASE-EU',  sub: 'v3 · 1,420 lines',  status: 'ok' },
      { lbl: 'CORE-AAA-V3',   sub: 'v3 · 412 lines',    status: 'ok' },
      { lbl: 'NTP-EU-PROD',   sub: 'v2 · 184 lines',    status: 'ok' },
      { lbl: 'BGP-EDGE-EMEA', sub: 'v5 · 904 lines',    status: 'ok' },
      { lbl: 'EVPN-VXLAN-EU', sub: 'v2 · 612 lines',    status: 'idle' },
    ]},
    { hd: 'RECENT DIFFS', items: [
      { lbl: 'leaf · ntp servers', sub: '17:38 · marcus', status: 'warn' },
      { lbl: 'core · tacacs',      sub: '14:02 · ana',    status: 'ok' },
    ]},
  ] : [
    { hd: 'PRODUCTION', items: [
      { lbl: 'apex-prod-emea',  sub: '2,184 devices · 41 sites',  status: 'ok',   sel: true },
      { lbl: 'apex-prod-amer',  sub: '3,041 devices · 56 sites',  status: 'ok'   },
      { lbl: 'apex-prod-apac',  sub: '1,604 devices · 28 sites',  status: 'warn' },
      { lbl: 'apex-edge-retail',sub: '1,648 devices · 412 sites', status: 'warn' },
    ]},
    { hd: 'NON-PROD',    items: [
      { lbl: 'apex-staging-emea',sub: '312 devices · 6 sites',  status: 'idle' },
      { lbl: 'apex-lab-london',  sub: '64 devices · 1 site',    status: 'ok'   },
    ]},
    { hd: 'SPECIAL',     items: [
      { lbl: 'apex-iso-mtn-dc',  sub: '188 devices · isolated', status: 'err'  },
      { lbl: 'apex-tenant-novax',sub: '904 devices · MSP-A',    status: 'ok'   },
    ]},
  ];
  return (
    <div style={{ width: 220, background:'var(--anth-bg-panel)', borderRight:'1px solid var(--anth-border)',
                  display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'10px 12px 8px', borderBottom:'1px solid var(--anth-border)' }}>
        <div className="micro" style={{ marginBottom: 3 }}>{t.hd.toUpperCase()}</div>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.sub}</div>
        <div className="search" style={{ marginTop: 8, height: 24 }}>
          <IcoSearch size={11} />
          <span style={{ flex: 1 }}>Filter…</span>
          <span className="kbd" style={{ fontSize: 9.5 }}>/</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow:'auto', padding: '4px 0' }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ padding: '6px 0 4px' }}>
            <div className="micro" style={{ padding: '6px 12px 4px', fontSize: 9.5 }}>{g.hd}</div>
            {g.items.map((it, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap: 8,
                padding: '0 12px', height: 30,
                background: it.sel ? 'var(--anth-bg-selected)' : 'transparent',
                borderLeft: it.sel ? '2px solid var(--anth-info)' : '2px solid transparent',
                fontSize: 12,
                color: it.sel ? 'var(--anth-text)' : 'var(--anth-text)',
                fontWeight: it.sel ? 600 : 500,
              }}>
                <span className={`dot ${it.status}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 11.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: 'inherit' }}>{it.lbl}</div>
                  <div style={{ fontSize: 10, color:'var(--anth-text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight: 400 }}>{it.sub}</div>
                </div>
                {it.n && <span className="mono num" style={{ fontSize: 10, color:'var(--anth-text-muted)' }}>{it.n}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ padding: 8, borderTop:'1px solid var(--anth-border)' }}>
        <span className="btn sm" style={{ width:'100%', justifyContent:'center' }}><IcoPlus size={12}/> New</span>
      </div>
    </div>
  );
}

// ── MasterInspector — right-docked default, can render as bottom-drawer ──────
function MasterInspector({ dock = 'right', subject = 'lon-core-01.apex' }) {
  if (dock === 'bottom') return <MasterInspectorBottom subject={subject} />;
  return (
    <div style={{ display:'flex', flexDirection:'column', height: '100%', background:'var(--anth-bg-panel)',
                  borderLeft: dock === 'right' ? '1px solid var(--anth-border)' : 'none', minWidth: 0 }}>
      <MasterInspectorHeader />
      <div className="insp-tabs" style={{ height: 30 }}>
        <span className="tab active">Overview</span>
        <span className="tab">Interfaces</span>
        <span className="tab">Routing</span>
        <span className="tab">Config</span>
        <span className="tab">Events</span>
      </div>
      <div style={{ flex: 1, overflow:'auto' }}>
        <MasterInspectorBody />
      </div>
      <MasterInspectorFooter />
    </div>
  );
}

function MasterInspectorHeader() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 8, padding: '10px 12px', borderBottom:'1px solid var(--anth-border)' }}>
      <span className="dot ok" style={{ width: 8, height: 8 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="mono" style={{ fontWeight: 600, fontSize: 12.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>lon-core-01.apex</div>
        <div style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>Arista 7280R3-32P4 · LON-CORE · core</div>
      </div>
      <span className="btn sm ghost" title="Pop out"><IcoLink size={12} /></span>
      <span className="btn sm ghost" title="Dock"><IcoMore size={13} /></span>
    </div>
  );
}

function MasterInspectorBody() {
  return (
    <React.Fragment>
      <div className="insp-section">
        <h4>Identity</h4>
        <dl className="kv">
          <dt>Hostname</dt><dd>lon-core-01.apex</dd>
          <dt>Vendor</dt><dd>Arista</dd>
          <dt>Platform</dt><dd>7280R3-32P4</dd>
          <dt>Serial</dt><dd>JPE21340042</dd>
          <dt>Software</dt><dd>EOS 4.31.2F</dd>
          <dt>Mgmt IP</dt><dd>10.20.4.1/24</dd>
          <dt>Loopback0</dt><dd>10.255.0.1/32</dd>
          <dt>ASN</dt><dd>64512</dd>
          <dt>Site</dt><dd>LON-CORE · rack R14</dd>
          <dt>Role</dt><dd>core</dd>
          <dt>Uptime</dt><dd>138d 4h 22m</dd>
        </dl>
      </div>
      <div className="insp-section">
        <h4>Health · 1 m</h4>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
          {[['CPU','14%',14,'ok'],['Memory','38%',38,'ok'],['Inlet','37 °C',37,'ok'],['Power','dual',0,'ok']].map(([k,v,pct,s],i)=>(
            <div key={i} style={{ padding: '7px 8px', background:'var(--anth-bg-sunken)', borderRadius: 3 }}>
              <div className="micro" style={{ fontSize: 9, marginBottom: 3 }}>{k}</div>
              <div className="mono num" style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
              {typeof pct === 'number' && pct > 0 && (
                <div style={{ marginTop: 4, height: 3, background:'#fff', borderRadius: 2, overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:'var(--anth-ok)' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="insp-section">
        <h4>Top interfaces · 1 m</h4>
        {[
          ['ok','Eth1/1', '→ lon-spine-01 Eth7/1', '94.2 G'],
          ['ok','Eth1/2', '→ lon-spine-02 Eth7/1', '91.4 G'],
          ['ok','Eth1/3', '→ lon-spine-03 Eth7/1', '88.2 G'],
          ['ok','Eth49/1','→ ams-edge-03 Eth5/3',  '38.1 G'],
          ['ok','Eth50/1','→ fra-core-01 Eth7/3',  '52.3 G'],
          ['warn','Eth5/14','→ lon-leaf-11 Eth52', '4.1 G'],
        ].map((r,i)=>(
          <div key={i} style={{ display:'flex', gap: 8, alignItems:'center', padding:'4px 0', fontSize: 10.5 }}>
            <span className={`dot ${r[0]}`} />
            <span className="mono" style={{ width: 60, fontWeight: 600 }}>{r[1]}</span>
            <span style={{ flex: 1, color:'var(--anth-text-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r[2]}</span>
            <span className="mono num">{r[3]}</span>
          </div>
        ))}
      </div>
      <div className="insp-section">
        <h4>Baseline · LEAF-BASE-EU</h4>
        <div style={{ display:'flex', gap: 8, alignItems:'center', fontSize: 11 }}>
          <span className="chip ok">in compliance</span>
          <span style={{ flex: 1 }} />
          <span className="muted mono" style={{ fontSize: 10.5 }}>v3 · 1,420 lines</span>
        </div>
        <div style={{ display:'flex', gap: 8, alignItems:'center', fontSize: 11, marginTop: 6 }}>
          <span className="chip warn">3 lines drift</span>
          <span style={{ flex: 1, color:'var(--anth-text-3)' }}>CORE-AAA-V3</span>
        </div>
      </div>
      <div className="insp-section" style={{ borderBottom:'none' }}>
        <h4>Recent events</h4>
        {[
          ['17:42','info','polling cycle ok'],
          ['16:11','warn','Eth5/14 LACP renegotiated'],
          ['Wed 09:02','info','EOS 4.31.2F installed · netops-eu/marcus'],
        ].map((e,i)=>(
          <div key={i} style={{ display:'flex', gap: 8, padding:'3px 0', fontSize: 11 }}>
            <span className="mono num" style={{ width: 64, color:'var(--anth-text-muted)', fontSize: 10 }}>{e[0]}</span>
            <span className={`dot ${e[1]}`} />
            <span style={{ flex: 1, color:'var(--anth-text-2)' }}>{e[2]}</span>
          </div>
        ))}
      </div>
    </React.Fragment>
  );
}

function MasterInspectorFooter() {
  return (
    <div style={{ display:'flex', gap: 4, padding: 8, borderTop:'1px solid var(--anth-border)', background:'var(--anth-bg-sunken)' }}>
      <span className="btn sm" style={{ flex: 1, justifyContent:'center' }}><IcoTerminal size={12}/> SSH</span>
      <span className="btn sm" style={{ flex: 1, justifyContent:'center' }}><IcoEye size={12}/> Topology</span>
      <span className="btn sm primary" style={{ flex: 1, justifyContent:'center' }}>Run check</span>
    </div>
  );
}

function MasterInspectorBottom({ subject }) {
  return (
    <div style={{ background:'var(--anth-bg-panel)', borderTop:'1px solid var(--anth-border-strong)',
                  display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ display:'flex', alignItems:'center', height: 28, padding: '0 12px', borderBottom: '1px solid var(--anth-border)', background:'var(--anth-bg-sunken)' }}>
        <span className="micro" style={{ fontSize: 9.5 }}>Inspector</span>
        <span style={{ margin: '0 8px', color:'var(--anth-text-muted)' }}>·</span>
        <span className="dot ok" />
        <span className="mono" style={{ fontSize: 12, fontWeight: 600, marginLeft: 6 }}>{subject}</span>
        <span className="chip ok" style={{ marginLeft: 8 }}>reachable</span>
        <span className="chip idle" style={{ marginLeft: 4 }}>EOS 4.31.2F</span>
        <div style={{ flex: 1, display:'flex', gap: 0, marginLeft: 16 }}>
          {['Identity','Health','Interfaces','Routing','Config','Events'].map((t, i) => (
            <span key={i} style={{
              padding: '0 12px', height: 28,
              display:'inline-flex', alignItems:'center',
              borderBottom: i === 0 ? '2px solid var(--anth-info)' : '2px solid transparent',
              fontSize: 11.5, fontWeight: i === 0 ? 600 : 400,
              color: i === 0 ? 'var(--anth-text)' : 'var(--anth-text-3)',
            }}>{t}</span>
          ))}
        </div>
        <span className="btn sm ghost"><IcoTerminal size={12}/></span>
        <span className="btn sm ghost"><IcoLink size={12}/></span>
        <span className="btn sm ghost"><IcoMin size={12}/></span>
        <span className="btn sm ghost"><IcoX size={12}/></span>
      </div>
      <div style={{ flex: 1, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 0, overflow:'hidden' }}>
        <div style={{ padding: 12, borderRight:'1px solid var(--anth-border)', overflow:'auto' }}>
          <div className="micro" style={{ marginBottom: 6 }}>Identity</div>
          <dl style={{ display:'grid', gridTemplateColumns:'88px 1fr', gap:'3px 8px', fontSize: 11, margin: 0 }}>
            <dt style={{color:'var(--anth-text-3)'}}>vendor</dt><dd className="mono" style={{margin:0}}>Arista</dd>
            <dt style={{color:'var(--anth-text-3)'}}>platform</dt><dd className="mono" style={{margin:0}}>7280R3-32P4</dd>
            <dt style={{color:'var(--anth-text-3)'}}>software</dt><dd className="mono" style={{margin:0}}>EOS 4.31.2F</dd>
            <dt style={{color:'var(--anth-text-3)'}}>mgmt</dt><dd className="mono" style={{margin:0}}>10.20.4.1/24</dd>
            <dt style={{color:'var(--anth-text-3)'}}>loopback0</dt><dd className="mono" style={{margin:0}}>10.255.0.1/32</dd>
            <dt style={{color:'var(--anth-text-3)'}}>site</dt><dd className="mono" style={{margin:0}}>LON-CORE · R14</dd>
            <dt style={{color:'var(--anth-text-3)'}}>role</dt><dd className="mono" style={{margin:0}}>core</dd>
            <dt style={{color:'var(--anth-text-3)'}}>asn</dt><dd className="mono" style={{margin:0}}>64512</dd>
            <dt style={{color:'var(--anth-text-3)'}}>uptime</dt><dd className="mono" style={{margin:0}}>138d</dd>
          </dl>
        </div>
        <div style={{ padding: 12, borderRight:'1px solid var(--anth-border)', overflow:'auto' }}>
          <div className="micro" style={{ marginBottom: 6 }}>Health · 1 m</div>
          {[['CPU', 14],['Memory', 38],['Inlet', 37],['Buffer drops', 2],['Optical Tx', 87],['Optical Rx', 92]].map(([k,v],i)=>(
            <div key={i} style={{ marginBottom: 6 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <span style={{ fontSize: 11 }}>{k}</span>
                <span className="mono num" style={{ fontSize: 11 }}>{v}%</span>
              </div>
              <div style={{ height: 3, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                <div style={{ width: `${v}%`, height:'100%', background: v > 80 ? 'var(--anth-warn)' : 'var(--anth-ok)' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 12, borderRight:'1px solid var(--anth-border)', overflow:'auto' }}>
          <div className="micro" style={{ marginBottom: 6 }}>Top interfaces · 1 m</div>
          <table style={{ width:'100%', fontSize: 10.5, borderCollapse:'collapse' }}>
            <tbody>
              {[['ok','Eth1/1','400G','94.2 G'],['ok','Eth1/2','400G','91.4 G'],['ok','Eth1/3','400G','88.2 G'],['ok','Eth1/4','400G','76.8 G'],['ok','Eth49/1','100G','38.1 G'],['ok','Eth50/1','100G','52.3 G'],['warn','Eth5/14','100G','4.1 G'],['idle','Eth5/15','100G','—']].map((r,i)=>(
                <tr key={i}>
                  <td style={{padding:'2px 0'}}><span className={`dot ${r[0]}`}/></td>
                  <td className="mono" style={{padding:'2px 4px', fontWeight:600}}>{r[1]}</td>
                  <td className="mono" style={{padding:'2px 4px', color:'var(--anth-text-3)'}}>{r[2]}</td>
                  <td className="mono num right" style={{padding:'2px 0'}}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12, overflow:'auto' }}>
          <div className="micro" style={{ marginBottom: 6 }}>Config · last diff</div>
          <div style={{ background:'var(--anth-bg-sunken)', padding: 8, borderRadius: 3, fontFamily:'var(--anth-font-mono)', fontSize: 10.5, lineHeight: 1.45 }}>
            <div style={{ color:'var(--anth-text-3)' }}>--- baseline:LEAF-BASE-EU</div>
            <div style={{ color:'var(--anth-text-3)' }}>+++ device</div>
            <div>   ntp server 10.20.0.5 prefer</div>
            <div style={{ color:'var(--anth-err)' }}>-  ntp server 10.20.0.6</div>
            <div style={{ color:'var(--anth-ok)' }}>+  ntp server 10.20.0.7</div>
            <div style={{ color:'var(--anth-ok)' }}>+  ntp authenticate</div>
          </div>
          <div style={{ fontSize: 10.5, color:'var(--anth-text-3)', marginTop: 6 }}>3 lines diverge · 4d ago · marcus</div>
        </div>
      </div>
    </div>
  );
}

// ── MasterOpsDock — persistent collapsed strip ──────────────────────────────
function MasterOpsDock({ expanded = false }) {
  if (!expanded) {
    return (
      <div style={{ height: 28, background:'var(--anth-bg-statusbar)', borderTop:'1px solid var(--anth-border)',
                    display:'flex', alignItems:'center', gap: 12, padding: '0 12px', fontSize: 11, color:'var(--anth-text-2)' }}>
        <IcoTerminal size={13} />
        <span style={{ fontWeight: 600 }}>Ops Console</span>
        <span className="muted">2 sessions · lon-core-01 · session-2</span>
        <span style={{ flex: 1 }} />
        <span className="muted">last command · 3m ago</span>
        <span className="kbd">Ctrl `</span>
        <IcoChevD size={11} style={{ transform:'rotate(180deg)', color:'var(--anth-text-muted)' }} />
      </div>
    );
  }
  return (
    <div style={{ height: 220, background:'#0F172A', color:'#E2E8F0', display:'flex', flexDirection:'column',
                  borderTop: '1px solid var(--anth-border-strong)', fontFamily: 'var(--anth-font-mono)', fontSize: 11.5 }}>
      <div style={{ display:'flex', height: 28, alignItems:'flex-end', gap: 0, padding: '0 8px', borderBottom:'1px solid #1E293B' }}>
        {['lon-core-01','session-2','+'].map((t, i) => (
          <div key={i} style={{
            padding: '0 12px', height: 24, display:'flex', alignItems:'center', gap: 6,
            background: i === 0 ? '#1E293B' : 'transparent',
            color: i === 0 ? '#F8FAFC' : '#94A3B8',
            borderRadius: '3px 3px 0 0', fontSize: 11,
          }}>
            {i < 2 && <span className="dot ok" />}
            {t}
            {i < 2 && <IcoX size={10} style={{ opacity:0.5, marginLeft: 4 }} />}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display:'flex', gap: 12, color:'#94A3B8', alignItems:'center', height: 22, fontSize: 10 }}>
          <span>Cascadia Mono</span>
          <span>·</span>
          <span>UTF-8</span>
          <IcoChevD size={11} style={{ color:'#94A3B8' }} />
        </div>
      </div>
      <div style={{ flex: 1, overflow:'auto', padding: '8px 12px', lineHeight: 1.5 }}>
        <div><span style={{color:'#94A3B8'}}>anth@apex-prod-emea</span> <span style={{color:'#38A169'}}>~</span> <span style={{color:'#7DD3FC'}}>$</span> show interfaces ethernet 1/1 status</div>
        <div style={{ color:'#CBD5E0' }}>Port       Status   Vlan   Duplex  Speed  Type</div>
        <div style={{ color:'#E2E8F0' }}>Et1/1      connected trunk  full    400G   400GBASE-DR4</div>
        <div style={{ marginTop: 4 }}><span style={{color:'#94A3B8'}}>anth@apex-prod-emea</span> <span style={{color:'#38A169'}}>~</span> <span style={{color:'#7DD3FC'}}>$</span> diff baseline LEAF-BASE-EU lon-leaf-12</div>
        <div style={{ color:'#FBBF24' }}>--- baseline:LEAF-BASE-EU</div>
        <div style={{ color:'#FBBF24' }}>+++ device:lon-leaf-12.apex</div>
        <div style={{ color:'#94A3B8' }}>@@ -142,3 +142,5 @@</div>
        <div style={{ color:'#E2E8F0' }}>   ntp server 10.20.0.5 prefer</div>
        <div style={{ color:'#E53E3E' }}>-  ntp server 10.20.0.6</div>
        <div style={{ color:'#38A169' }}>+  ntp server 10.20.0.7</div>
        <div style={{ color:'#38A169' }}>+  ntp authenticate</div>
        <div style={{ color:'#94A3B8' }}>  3 lines diverge · baseline owner: NetOps EU</div>
        <div style={{ marginTop: 4 }}><span style={{color:'#94A3B8'}}>anth@apex-prod-emea</span> <span style={{color:'#38A169'}}>~</span> <span style={{color:'#7DD3FC'}}>$</span> <span style={{ display:'inline-block', width: 7, height: 13, background:'#E2E8F0', verticalAlign:'middle' }} /></div>
      </div>
    </div>
  );
}

// ── MasterShell — composition helper ────────────────────────────────────────
function MasterShell({ mode, crumbs, subnav, secondary, children, inspector, inspectorDock = 'right', opsExpanded = false,
                       railVariant = 'labeled', statusNote, envState, env, envScope }) {
  const railW = railVariant === 'icons' ? 56 : 196;
  const showSecondary = !!secondary;
  const showRightInspector = inspector && inspectorDock === 'right';
  const showBottomInspector = inspector && inspectorDock === 'bottom';
  const showFloating = inspector && inspectorDock === 'floating';
  const opsH = opsExpanded ? 220 : 28;
  const inspW = 340;

  return (
    <div className="anth anth-shell" style={{
      gridTemplateRows: `36px ${subnav ? '34px ' : ''}1fr ${showBottomInspector ? '260px ' : ''}${opsH}px 24px`,
      gridTemplateColumns: `${railW}px ${showSecondary ? '220px ' : ''}1fr${showRightInspector ? ` ${inspW}px` : ''}`,
      position:'relative',
    }}>
      <div style={{ gridColumn:'1 / -1' }}><MasterTitleBar crumbs={crumbs} env={env} envScope={envScope} envState={envState} /></div>
      {subnav && <div style={{ gridColumn:'1 / -1' }}>{subnav}</div>}
      <div><MasterModeRail active={mode} variant={railVariant} /></div>
      {showSecondary && <div>{secondary}</div>}
      <div style={{ overflow:'hidden', display:'flex', flexDirection:'column', minWidth: 0 }}>{children}</div>
      {showRightInspector && <div style={{ overflow:'hidden' }}>{inspector}</div>}
      {showBottomInspector && <div style={{ gridColumn:'1 / -1' }}>{inspector}</div>}
      {showFloating && inspector}
      <div style={{ gridColumn:'1 / -1' }}><MasterOpsDock expanded={opsExpanded} /></div>
      <div style={{ gridColumn:'1 / -1' }}><StatusBar note={statusNote} /></div>
    </div>
  );
}

// ── MasterCortex — richer overlay with scope chip, results, and action mode ──
function MasterCortex({ scope = 'apex-prod-emea', query = 'drift', mode = 'search' }) {
  return (
    <div className="anth-cortex" style={{ paddingTop: 100 }}>
      <div className="modal" style={{ width: 640 }}>
        <div style={{ display:'flex', alignItems:'center', gap: 6, padding:'6px 12px', borderBottom:'1px solid var(--anth-border)', background:'var(--anth-bg-sunken)' }}>
          <span className="dot ok" />
          <span className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{scope}</span>
          <span className="muted" style={{ fontSize: 10.5 }}>scope · ⇥ to change</span>
          <span style={{ flex: 1 }} />
          <span style={{ display:'flex', gap: 2, fontSize: 10.5 }}>
            <span className="kbd" style={{ background:'#fff' }}>search</span>
            <span className="kbd" style={{ background:'var(--anth-bg-panel)', color:'var(--anth-text-muted)' }}>run</span>
            <span className="kbd" style={{ background:'var(--anth-bg-panel)', color:'var(--anth-text-muted)' }}>navigate</span>
          </span>
        </div>
        <div className="input" style={{ height: 48 }}>
          <IcoSearch size={16} className="ic" />
          <input defaultValue={query} placeholder="Jump to environment, device, action…" style={{ fontSize: 15 }} />
          <span className="muted" style={{ fontSize: 11 }}>72 results</span>
        </div>
        <div className="results" style={{ maxHeight: 360 }}>
          <div className="grp">Top match</div>
          <div className="row active">
            <IcoBolt size={14} className="ic" />
            <span className="lbl">Run baseline drift sweep on <b>apex-prod-emea</b></span>
            <span className="ctx">action · ~ 18 s</span>
            <span className="kbd">↵</span>
          </div>
          <div className="grp">Devices with drift</div>
          {[
            ['lon-leaf-12.apex','LEAF-BASE-EU · 4 lines drift · 17:38'],
            ['fra-leaf-08.apex','LEAF-BASE-EU · 7 lines drift · 16:11'],
            ['par-leaf-03.apex','CORE-AAA-V3 · 2 lines drift · Tue'],
            ['lon-leaf-19.apex','EVPN-VXLAN-EU · 11 lines drift · Mon'],
          ].map((d, i) => (
            <div key={i} className="row">
              <IcoDevice size={14} className="ic" />
              <span className="lbl mono">{d[0]}</span>
              <span className="ctx">{d[1]}</span>
            </div>
          ))}
          <div className="grp">Saved views</div>
          <div className="row">
            <IcoEye size={14} className="ic" />
            <span className="lbl">EU readiness sweep</span>
            <span className="ctx">view · 482 lines drift</span>
          </div>
          <div className="row">
            <IcoEye size={14} className="ic" />
            <span className="lbl">Retail edge — drift &gt; 50</span>
            <span className="ctx">view · 122 lines drift</span>
          </div>
          <div className="grp">Actions</div>
          <div className="row">
            <IcoBolt size={14} className="ic" />
            <span className="lbl">Export drift report → CSV</span>
            <span className="ctx">action</span>
          </div>
          <div className="row">
            <IcoBolt size={14} className="ic" />
            <span className="lbl">Open compliance run for all 23 drift items</span>
            <span className="ctx">action · assess</span>
          </div>
        </div>
        <div className="foot">
          <span>↑↓ navigate</span>
          <span>↵ run / open</span>
          <span>⇥ change scope</span>
          <span>⌘1–9 mode jump</span>
          <span style={{marginLeft:'auto'}}>Cortex · v0.14</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  MODE_GROUPS, ALL_MODES, findMode,
  MasterTitleBar, MasterModeRail, MasterSubNav, MasterSecondaryNav,
  MasterInspector, MasterInspectorBottom, MasterOpsDock,
  MasterShell, MasterCortex,
});
