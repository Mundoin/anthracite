// Shell primitives + mock data shared by all three direction artboards.

const MODES = [
  { id: 'hierarchy',   label: 'Hierarchy',   short: 'HIER',  Icon: IcoHierarchy },
  { id: 'provisioning',label: 'Provisioning',short: 'PROV',  Icon: IcoProvision },
  { id: 'operate',     label: 'Operate',     short: 'OPER',  Icon: IcoOperate, alerts: 4 },
  { id: 'topology',    label: 'Topology',    short: 'TOPO',  Icon: IcoTopology },
  { id: 'diagnose',    label: 'Diagnose',    short: 'DIAG',  Icon: IcoDiagnose },
  { id: 'assess',      label: 'Assess',      short: 'ASSS',  Icon: IcoAssess  },
  { id: 'security',    label: 'Security',    short: 'SEC',   Icon: IcoSecurity },
  { id: 'dashboards',  label: 'Dashboards',  short: 'DASH',  Icon: IcoDashboards },
  { id: 'build',       label: 'Build',       short: 'BLD',   Icon: IcoBuild   },
  { id: 'settings',    label: 'Settings',    short: 'SET',   Icon: IcoSettings },
];

// ─── TitleBar ────────────────────────────────────────────────────────────────
function TitleBar({ env = 'apex-prod-emea', scope = 'EMEA · Production · 2,184 devices',
                    crumbs = ['Environments', 'apex-prod-emea'], showCortex = true }) {
  return (
    <div className="anth-titlebar">
      <div className="anth-tb-brand">
        <AnthMark size={18} />
        <div className="name">Anthracite</div>
      </div>

      <div className="anth-tb-env">
        <span className="env-dot" />
        <span className="env-name mono">{env}</span>
        <span className="env-scope">· {scope}</span>
        <IcoChevD size={12} className="chev" />
      </div>

      {crumbs && (
        <div className="anth-tb-crumbs">
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="sep">/</span>}
              <span className={i === crumbs.length - 1 ? 'last' : ''}>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      <div className="anth-tb-spacer" />

      {showCortex && (
        <div className="anth-tb-cortex">
          <IcoSearch size={13} className="icon" />
          <span className="placeholder">Cortex — jump, search, run…</span>
          <span className="kbd">Ctrl</span><span className="kbd">K</span>
        </div>
      )}

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

// ─── Mode Rail (labeled / icons) ─────────────────────────────────────────────
function ModeRail({ active = 'hierarchy', variant = 'labeled' }) {
  return (
    <div className={`anth-rail ${variant}`}>
      {variant === 'labeled' && <div className="group-label">Workspace</div>}
      {MODES.map(m => {
        const isActive = m.id === active;
        const Icon = m.Icon;
        return (
          <div key={m.id} className={`item ${isActive ? 'active' : ''} ${m.alerts ? 'has-alert' : ''}`}>
            <Icon size={variant === 'icons' ? 18 : 15} className="ico" />
            <span className="lbl">{variant === 'icons' ? m.short : m.label}</span>
            {variant === 'labeled' && m.alerts && <span className="badge num">{m.alerts}</span>}
          </div>
        );
      })}
      <div className="rail-foot">
        <div className="item">
          <IcoTerminal size={variant === 'icons' ? 18 : 15} className="ico" />
          <span className="lbl">{variant === 'icons' ? 'CLI' : 'Ops Console'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Status Bar ──────────────────────────────────────────────────────────────
function StatusBar({ note = 'idle · last poll 38s ago' }) {
  return (
    <div className="anth-statusbar">
      <span className="sb-cell"><span className="dot ok" /> engines online</span>
      <span className="sb-sep" />
      <span className="sb-cell">inventory: 2,184</span>
      <span className="sb-sep" />
      <span className="sb-cell">reachable: 2,151</span>
      <span className="sb-sep" />
      <span className="sb-cell" style={{color:'var(--anth-warn)'}}>drift: 23</span>
      <span className="sb-sep" />
      <span className="sb-cell" style={{color:'var(--anth-err)'}}>events: 4</span>
      <div className="sb-right">
        <span className="sb-cell">{note}</span>
        <span className="sb-sep" />
        <span className="sb-cell">v0.14.2-rc</span>
        <span className="sb-sep" />
        <span className="sb-cell">rust-core · ok</span>
      </div>
    </div>
  );
}

// ─── Cortex launcher overlay ─────────────────────────────────────────────────
function CortexLauncher() {
  return (
    <div className="anth-cortex">
      <div className="modal">
        <div className="input">
          <IcoSearch size={16} className="ic" />
          <input placeholder="Jump to environment, device, action…" defaultValue="lon-c" />
          <span className="kbd">Esc</span>
        </div>
        <div className="results">
          <div className="grp">Environments</div>
          <div className="row active">
            <IcoSite size={14} className="ic" />
            <span className="lbl"><b>apex-prod-emea</b> · LON-CORE</span>
            <span className="ctx">switch · 248 devices</span>
            <span className="kbd">↵</span>
          </div>
          <div className="row">
            <IcoSite size={14} className="ic" />
            <span className="lbl">apex-lab-london</span>
            <span className="ctx">lab · 28 devices</span>
          </div>
          <div className="grp">Devices</div>
          <div className="row">
            <IcoDevice size={14} className="ic" />
            <span className="lbl mono">lon-core-01.apex</span>
            <span className="ctx">Arista 7280R · loopback 10.20.4.1</span>
          </div>
          <div className="row">
            <IcoDevice size={14} className="ic" />
            <span className="lbl mono">lon-core-02.apex</span>
            <span className="ctx">Arista 7280R · loopback 10.20.4.2</span>
          </div>
          <div className="grp">Actions</div>
          <div className="row">
            <IcoBolt size={14} className="ic" />
            <span className="lbl">Run config compliance on selection</span>
            <span className="ctx">assessment · 18s est.</span>
          </div>
          <div className="row">
            <IcoBolt size={14} className="ic" />
            <span className="lbl">Open path trace from lon-core-01 → ams-edge-03</span>
            <span className="ctx">diagnose</span>
          </div>
        </div>
        <div className="foot">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>⇥ scope</span>
          <span style={{marginLeft:'auto'}}>Cortex · v0.14</span>
        </div>
      </div>
    </div>
  );
}

// ─── Mini sparkline ──────────────────────────────────────────────────────────
function Spark({ points, color = 'var(--anth-info)', height = 28, width = 120, fill = true, seed = 1 }) {
  // Deterministic pseudo-random if no points given
  const pts = React.useMemo(() => {
    if (points) return points;
    let s = seed * 9301 + 49297;
    const out = [];
    for (let i = 0; i < 28; i++) {
      s = (s * 9301 + 49297) % 233280;
      out.push(0.3 + (s / 233280) * 0.7);
    }
    return out;
  }, [points, seed]);
  const max = Math.max(...pts), min = Math.min(...pts);
  const span = Math.max(0.01, max - min);
  const stepX = width / (pts.length - 1);
  const path = pts.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <path d={area} fill={color} opacity="0.10" />}
      <path d={path} stroke={color} strokeWidth="1.4" fill="none" />
    </svg>
  );
}

// ─── Mock data ───────────────────────────────────────────────────────────────
const ENVIRONMENTS = [
  { id: 'apex-prod-emea',   scope: 'EMEA · Production',  region: 'London / Frankfurt / Amsterdam', devices: 2184, sites: 41, status: 'ok',   readiness: 96, drift: 23, events: 4, owner: 'NetOps EU',     last: '38s ago' },
  { id: 'apex-prod-amer',   scope: 'AMER · Production',  region: 'Ashburn / SJC / DFW',            devices: 3041, sites: 56, status: 'ok',   readiness: 92, drift: 41, events: 2, owner: 'NetOps US',     last: '1m ago'  },
  { id: 'apex-prod-apac',   scope: 'APAC · Production',  region: 'Tokyo / Singapore / Sydney',     devices: 1604, sites: 28, status: 'warn', readiness: 84, drift: 87, events: 9, owner: 'NetOps APAC',   last: '2m ago'  },
  { id: 'apex-edge-retail', scope: 'Global · Retail Edge', region: '412 retail sites',             devices: 1648, sites: 412,status: 'warn', readiness: 78, drift: 122,events: 14,owner: 'Retail NetEng', last: '4m ago'  },
  { id: 'apex-lab-london',  scope: 'EMEA · Lab',          region: 'London · MTH-LAB-7',           devices: 64,   sites: 1,  status: 'ok',   readiness: 100,drift: 0,  events: 0, owner: 'Platform Eng',  last: '8s ago'  },
  { id: 'apex-staging-emea',scope: 'EMEA · Staging',      region: 'London / Frankfurt',            devices: 312,  sites: 6,  status: 'idle', readiness: 88, drift: 14, events: 0, owner: 'NetOps EU',     last: '11m ago' },
  { id: 'apex-iso-mtn-dc',  scope: 'AMER · Isolated DC',  region: 'Mountain View · DC-3',          devices: 188,  sites: 1,  status: 'err',  readiness: 41, drift: 188,events: 22,owner: 'Compliance',    last: '21m ago' },
  { id: 'apex-tenant-novax',scope: 'Tenant · Novax',      region: 'AMS / FRA · MSP',               devices: 904,  sites: 18, status: 'ok',   readiness: 94, drift: 7,  events: 1, owner: 'MSP-A',         last: '47s ago' },
];

const DEVICES = [
  { hn: 'lon-core-01.apex',  vendor: 'Arista', model: '7280R3-32P4', role: 'core',  site: 'LON-CORE',  ip:'10.20.4.1',   ver:'EOS 4.31.2F', cpu:14, mem:38, status:'ok',   uptime:'138d' },
  { hn: 'lon-core-02.apex',  vendor: 'Arista', model: '7280R3-32P4', role: 'core',  site: 'LON-CORE',  ip:'10.20.4.2',   ver:'EOS 4.31.2F', cpu:11, mem:37, status:'ok',   uptime:'138d' },
  { hn: 'lon-spine-01.apex', vendor: 'Arista', model: '7508R3',      role: 'spine', site: 'LON-CORE',  ip:'10.20.4.5',   ver:'EOS 4.31.2F', cpu:22, mem:54, status:'ok',   uptime:'94d'  },
  { hn: 'lon-spine-02.apex', vendor: 'Arista', model: '7508R3',      role: 'spine', site: 'LON-CORE',  ip:'10.20.4.6',   ver:'EOS 4.31.2F', cpu:23, mem:55, status:'ok',   uptime:'94d'  },
  { hn: 'lon-leaf-11.apex',  vendor: 'Arista', model: '7050SX3-48',  role: 'leaf',  site: 'LON-CORE',  ip:'10.20.4.21',  ver:'EOS 4.31.2F', cpu:31, mem:62, status:'warn', uptime:'12d'  },
  { hn: 'lon-leaf-12.apex',  vendor: 'Arista', model: '7050SX3-48',  role: 'leaf',  site: 'LON-CORE',  ip:'10.20.4.22',  ver:'EOS 4.31.1F', cpu:18, mem:44, status:'warn', uptime:'12d'  },
  { hn: 'ams-edge-03.apex',  vendor: 'Arista', model: '7280R3-32P4', role: 'edge',  site: 'AMS-EDGE',  ip:'10.21.4.3',   ver:'EOS 4.31.2F', cpu:16, mem:41, status:'ok',   uptime:'201d' },
  { hn: 'fra-core-01.apex',  vendor: 'Arista', model: '7280R3-32P4', role: 'core',  site: 'FRA-CORE',  ip:'10.22.4.1',   ver:'EOS 4.30.5M', cpu:9,  mem:33, status:'ok',   uptime:'287d' },
  { hn: 'fra-leaf-04.apex',  vendor: 'Arista', model: '7050SX3-48',  role: 'leaf',  site: 'FRA-CORE',  ip:'10.22.4.14',  ver:'EOS 4.30.5M', cpu:42, mem:71, status:'err',  uptime:'2h'   },
  { hn: 'dub-bgp-01.apex',   vendor: 'Cisco',  model: 'ASR-9904',    role: 'edge',  site: 'DUB-EDGE',  ip:'10.23.4.1',   ver:'IOS-XR 7.10', cpu:24, mem:48, status:'ok',   uptime:'412d' },
  { hn: 'dub-bgp-02.apex',   vendor: 'Cisco',  model: 'ASR-9904',    role: 'edge',  site: 'DUB-EDGE',  ip:'10.23.4.2',   ver:'IOS-XR 7.10', cpu:25, mem:49, status:'ok',   uptime:'412d' },
  { hn: 'par-leaf-01.apex',  vendor: 'Juniper',model: 'QFX5120-48Y', role: 'leaf',  site: 'PAR-EDGE',  ip:'10.24.4.11',  ver:'Junos 22.4',  cpu:12, mem:36, status:'ok',   uptime:'87d'  },
];

const EVENTS = [
  { t:'17:42:08', sev:'err',  src:'fra-leaf-04.apex',  cat:'link',      msg:'Eth1/14 transitioned down · LACP partner unreachable',     site:'FRA-CORE' },
  { t:'17:41:55', sev:'warn', src:'lon-leaf-11.apex',  cat:'optic',     msg:'Pre-FEC BER on Eth49/1 rising · 1.2e-6 over 5m',           site:'LON-CORE' },
  { t:'17:38:11', sev:'warn', src:'lon-leaf-12.apex',  cat:'config',    msg:'Drift detected · 4 lines diverge from baseline LEAF-BASE-EU', site:'LON-CORE' },
  { t:'17:36:02', sev:'err',  src:'ams-edge-03.apex',  cat:'bgp',       msg:'eBGP peer 185.34.12.4 went idle · hold timer expired',      site:'AMS-EDGE' },
  { t:'17:31:48', sev:'info', src:'lon-core-01.apex',  cat:'engine',    msg:'Polling cycle 04124 complete · 2,184/2,184 reachable',     site:'platform' },
  { t:'17:29:30', sev:'warn', src:'par-leaf-01.apex',  cat:'temp',      msg:'Inlet temperature 42°C · threshold 40°C',                  site:'PAR-EDGE' },
];

Object.assign(window, { MODES, TitleBar, ModeRail, StatusBar, CortexLauncher, Spark,
                        ENVIRONMENTS, DEVICES, EVENTS });
