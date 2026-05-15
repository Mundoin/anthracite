// Direction D — Master frames part 3
// D7:  Assess · report preview
// D8:  Empty state
// D9:  Loading state
// D10: Error state
// D11: Cortex behaviours
// D12: Inspector patterns (right / bottom / floating side-by-side)

// ─── D7: Assess · report ─────────────────────────────────────────────────────
function MasterD7({ density, railVariant, opsExpanded }) {
  return (
    <MasterShell
      mode="assess"
      railVariant={railVariant}
      crumbs={['Assess', 'Readiness reports', 'apex-prod-emea · Q2 2026']}
      subnav={<MasterSubNav
        items={[
          { label: 'Compliance' },
          { label: 'Readiness', active: true },
          { label: 'Drift' },
          { label: 'Security' },
          { label: 'Custom assessments', count: 18 },
        ]}
        right={<React.Fragment>
          <div className="filter">period <b>:</b> Q2 2026</div>
          <div className="filter">baseline <b>:</b> LEAF-BASE-EU v3</div>
          <span className="btn sm"><IcoRefresh size={12}/> Re-run</span>
          <span className="btn sm"><IcoExport size={12}/> Export PDF</span>
          <span className="btn sm primary">Share report</span>
        </React.Fragment>}
      />}
      opsExpanded={opsExpanded}
      statusNote="assess · readiness · 2,184 devices · 412 ms / device avg · report generated 04:18 ago"
    >
      <div style={{ flex: 1, overflow:'auto', padding: 16, background:'var(--anth-bg-app)', display:'flex', justifyContent:'center' }}>
        <D7Report />
      </div>
    </MasterShell>
  );
}

function D7Report() {
  return (
    <div style={{ width: '100%', maxWidth: 1320, display:'flex', flexDirection:'column', gap: 12 }}>
      {/* Cover header */}
      <div className="anth-panel" style={{ padding: 0, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 0 }}>
          <div style={{ padding: '20px 22px', borderRight:'1px solid var(--anth-border)' }}>
            <div className="micro" style={{ marginBottom: 8 }}>Readiness assessment</div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing:'-0.01em', color:'var(--anth-text)' }}>apex-prod-emea</div>
            <div style={{ fontSize: 12.5, color:'var(--anth-text-3)', marginTop: 3 }}>EMEA · Production · 2,184 devices · 41 sites · NetOps EU</div>
            <div style={{ display:'flex', gap: 16, marginTop: 14, fontSize: 11.5, color:'var(--anth-text-2)' }}>
              <div>
                <div className="micro" style={{ fontSize: 9.5 }}>Period</div>
                <div className="mono">Q2 2026 · Apr 1 – Jun 30</div>
              </div>
              <div className="vr" />
              <div>
                <div className="micro" style={{ fontSize: 9.5 }}>Baselines</div>
                <div className="mono">7 (LEAF-BASE-EU v3 + 6)</div>
              </div>
              <div className="vr" />
              <div>
                <div className="micro" style={{ fontSize: 9.5 }}>Run</div>
                <div className="mono">assess-rd-04421 · 04:18 ago · 14:48 elapsed</div>
              </div>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color:'var(--anth-text-2)', lineHeight: 1.55 }}>
              <b>Executive summary.</b> Environment is healthy and within expected envelope. Drift is concentrated in NTP & TACACS controls (Q3 rotation pending). One isolated leaf at FRA-CORE requires manual reconciliation. No CVE-impacting findings.
            </div>
          </div>
          <div style={{ padding: '20px 22px', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:'var(--anth-bg-sunken)' }}>
            <D7Gauge value={96.0} />
            <div style={{ marginTop: 4, fontSize: 11.5, color:'var(--anth-text-3)' }}>Composite readiness · Q2 2026</div>
            <div style={{ marginTop: 10, fontSize: 11, color:'var(--anth-ok)' }}>+0.4 vs Q1 · trend stable</div>
          </div>
        </div>
      </div>

      {/* Domain breakdown + control failures */}
      <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap: 12 }}>
        <div className="anth-panel">
          <div className="anth-panel-hd">
            <span className="ttl">Domain readiness</span>
            <span className="sub">7 baselines · 2,184 devices</span>
          </div>
          <div className="anth-panel-bd" style={{ padding: 12, display:'flex', flexDirection:'column', gap: 10 }}>
            {[
              { d:'L2 fabric',          pct: 99, n: '417 / 418',     delta:'+0.0' },
              { d:'L3 underlay',        pct: 97, n: '802 / 827',     delta:'+0.2' },
              { d:'iBGP mesh',          pct: 99, n: '54 / 54',       delta:'+0.0' },
              { d:'eBGP edge',          pct: 91, n: '54 / 59',       delta:'-1.2' },
              { d:'EVPN / VXLAN',       pct: 97, n: '138 / 142',     delta:'+0.4' },
              { d:'Out-of-band mgmt',   pct: 100,n: '2184 / 2184',   delta:'+0.0' },
              { d:'NTP discipline',     pct: 88, n: '1922 / 2184',   delta:'-2.1' },
              { d:'TACACS reachability',pct: 76, n: '1660 / 2184',   delta:'-5.4' },
              { d:'Syslog ingest',      pct: 100,n: '2184 / 2184',   delta:'+0.0' },
              { d:'SNMPv3 polling',     pct: 99, n: '2167 / 2184',   delta:'+0.0' },
            ].map((b, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'170px 1fr 50px 90px 50px', gap: 12, alignItems:'center' }}>
                <span style={{ fontSize: 12 }}>{b.d}</span>
                <div style={{ height: 8, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                  <div style={{ width: `${b.pct}%`, height: '100%',
                    background: b.pct >= 95 ? 'var(--anth-ok)' : b.pct >= 85 ? 'var(--anth-warn)' : 'var(--anth-err)' }} />
                </div>
                <span className="mono num" style={{ fontSize: 11.5, color:'var(--anth-text)', textAlign:'right', fontWeight: 600 }}>{b.pct}%</span>
                <span className="mono num" style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>{b.n}</span>
                <span className="mono num" style={{ fontSize: 11, color: b.delta.startsWith('+') || b.delta === '+0.0' ? 'var(--anth-ok)' : 'var(--anth-err)' }}>{b.delta}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="anth-panel">
          <div className="anth-panel-hd">
            <span className="ttl">Top control failures</span>
            <span className="sub">7 failing · 4 owners</span>
          </div>
          <div className="anth-panel-bd" style={{ padding: 0 }}>
            <table className="anth-table">
              <thead><tr><th style={{width:22}}/><th>Control</th><th>Failing</th><th>Owner</th></tr></thead>
              <tbody>
                {[
                  ['err',  'TACACS-RE-AUTH-30D',    '524 devices', 'NetOps EU'],
                  ['warn', 'NTP-AUTHENTICATED',     '262 devices', 'NetOps EU'],
                  ['warn', 'EBGP-MD5-CHECK',        '5 sessions',  'Edge team'],
                  ['warn', 'EVPN-RT-AUTO-SAME-AS',  '4 leaves',    'Fabric eng'],
                  ['warn', 'SYSLOG-TLS',            '0 devices',   'NetOps EU'],
                  ['info', 'SNMPV3-AUTH-PRIV',      '17 devices',  'NetOps EU'],
                  ['warn', 'TIME-ZONE-UTC',         '8 devices',   'NetOps EU'],
                ].map((r, i) => (
                  <tr key={i}>
                    <td><span className={`dot ${r[0]}`}/></td>
                    <td className="mono" style={{ fontSize: 11, fontWeight: 600 }}>{r[1]}</td>
                    <td className="mono num" style={{ fontSize: 11 }}>{r[2]}</td>
                    <td style={{ fontSize: 11, color:'var(--anth-text-2)' }}>{r[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Trend + findings */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 12 }}>
        <div className="anth-panel" style={{ padding: 14 }}>
          <div className="micro">Readiness · trailing 90 days</div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8, margin:'2px 0 8px' }}>
            <div className="mono num" style={{ fontSize: 22, fontWeight: 600 }}>96.0 %</div>
            <span style={{ fontSize: 11, color:'var(--anth-ok)' }}>+0.4 vs Q1</span>
          </div>
          <D7Trend />
        </div>
        <div className="anth-panel" style={{ padding: 14 }}>
          <div className="micro">Drift cadence</div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8, margin:'2px 0 8px' }}>
            <div className="mono num" style={{ fontSize: 22, fontWeight: 600 }}>23 lines</div>
            <span style={{ fontSize: 11, color:'var(--anth-warn)' }}>+4 this week</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 4, fontSize: 11 }}>
            {[['LEAF-BASE-EU', 14, '23 drift'],['CORE-AAA-V3', 6, '9 drift'],['NTP-EU-PROD', 3, '4 drift'],['BGP-EDGE-EMEA', 0, 'clean']].map((b, i) => (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'130px 1fr 60px', gap: 8, alignItems:'center' }}>
                <span className="mono" style={{ fontSize: 10.5 }}>{b[0]}</span>
                <div style={{ height: 4, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                  <div style={{ width: `${Math.min(100, b[1] * 6)}%`, height:'100%', background: b[1] === 0 ? 'var(--anth-ok)' : 'var(--anth-warn)' }} />
                </div>
                <span className="mono num" style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>{b[2]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="anth-panel" style={{ padding: 14 }}>
          <div className="micro">Findings</div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 8, margin:'2px 0 8px' }}>
            <div className="mono num" style={{ fontSize: 22, fontWeight: 600 }}>14</div>
            <span style={{ fontSize: 11, color:'var(--anth-text-3)' }}>0 critical · 1 high · 7 med · 6 low</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap: 5, fontSize: 11 }}>
            {[
              ['high', 'fra-leaf-04 unreachable for 18 m'],
              ['med',  'TACACS-RE-AUTH-30D failing on 524 devices'],
              ['med',  'lon-leaf-11 Eth49/1 tail-drop trending'],
              ['med',  'NTP not authenticated on 262 devices'],
              ['low',  '8 devices on UTC+1 vs UTC standard'],
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', gap: 8, alignItems:'center' }}>
                <span className={`chip ${r[0] === 'high' ? 'err' : r[0] === 'med' ? 'warn' : 'idle'}`} style={{ width: 40, justifyContent:'center' }}>{r[0]}</span>
                <span style={{ flex: 1, color:'var(--anth-text-2)' }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Site readiness heatmap */}
      <div className="anth-panel">
        <div className="anth-panel-hd">
          <span className="ttl">Site readiness · 41 sites</span>
          <span className="sub">cell colour = composite readiness · size = device count</span>
        </div>
        <div className="anth-panel-bd" style={{ padding: 12, display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap: 5 }}>
          {[
            ['LON-CORE', 248, 99, 'EMEA-N'],['FRA-CORE',180,98,'EMEA-C'],['AMS-EDGE',96,94,'EMEA-N'],['PAR-EDGE',64,86,'EMEA-W'],
            ['DUB-EDGE',48,97,'EMEA-W'],['MUC-DC1',140,82,'EMEA-S'],['MAD-EDGE',38,99,'EMEA-W'],['MIL-EDGE',32,91,'EMEA-S'],
            ['BCN-EDGE',36,95,'EMEA-W'],['HEL-EDGE',24,93,'EMEA-N'],['OSL-EDGE',24,94,'EMEA-N'],['STO-EDGE',32,95,'EMEA-N'],
            ['VIE-EDGE',28,89,'EMEA-C'],['PRG-EDGE',22,91,'EMEA-C'],['WAR-EDGE',26,88,'EMEA-E'],['LIS-EDGE',18,97,'EMEA-W'],
            ['ATH-EDGE',18,92,'EMEA-S'],['SOF-EDGE',14,90,'EMEA-E'],['RIG-EDGE',12,94,'EMEA-N'],['TLL-EDGE',10,96,'EMEA-N'],
            ['BUD-EDGE',16,89,'EMEA-C'],['BRU-EDGE',22,98,'EMEA-W'],['LUX-EDGE',14,100,'EMEA-C'],['ZRH-EDGE',26,96,'EMEA-C'],
            ['GVA-EDGE',18,95,'EMEA-W'],['CPH-EDGE',24,97,'EMEA-N'],['LJU-EDGE',12,93,'EMEA-S'],['ZAG-EDGE',14,90,'EMEA-S'],
            ['BCS-EDGE',16,87,'EMEA-S'],['IST-EDGE',26,84,'EMEA-S'],['LCY-EDGE',18,98,'EMEA-N'],['MAN-EDGE',24,96,'EMEA-N'],
            ['BHM-EDGE',18,95,'EMEA-N'],['EDI-EDGE',12,97,'EMEA-N'],['BRS-EDGE',12,96,'EMEA-N'],['CDG-EDGE',26,92,'EMEA-W'],
            ['LYS-EDGE',16,94,'EMEA-W'],['NCE-EDGE',12,93,'EMEA-W'],['HAM-EDGE',24,98,'EMEA-C'],['DUS-EDGE',22,97,'EMEA-C'],
            ['STR-EDGE',16,95,'EMEA-C'],
          ].map((s, i) => {
            const col = s[2] >= 95 ? '#38A169' : s[2] >= 85 ? '#D69E2E' : '#E53E3E';
            return (
              <div key={i} style={{
                aspectRatio:'1 / 1',
                background: col, opacity: 0.85,
                borderRadius: 3, padding: 6,
                display:'flex', flexDirection:'column', justifyContent:'space-between',
                color:'#fff',
              }}>
                <div style={{ fontFamily:'var(--anth-font-mono)', fontSize: 9, fontWeight: 700 }}>{s[0]}</div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                  <span style={{ fontSize: 9, opacity: 0.8, fontFamily:'var(--anth-font-mono)' }}>{s[1]}d</span>
                  <span style={{ fontSize: 11, fontFamily:'var(--anth-font-mono)', fontWeight: 700 }}>{s[2]}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* footer */}
      <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '8px 14px', background:'var(--anth-bg-panel)', border:'1px solid var(--anth-border)', borderRadius: 4 }}>
        <AnthMark size={14} />
        <span className="mono" style={{ fontSize: 11, color:'var(--anth-text-3)' }}>Anthracite · assessment assess-rd-04421 · sha256 e4f8…0c12 · signed by anth.core@apex</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color:'var(--anth-text-3)' }}>page 1 of 1 · 14 KB · canonical PDF available</span>
      </div>
    </div>
  );
}

function D7Gauge({ value }) {
  const R = 64, C = 2 * Math.PI * R;
  const pct = value / 100;
  return (
    <svg width="170" height="170" viewBox="0 0 170 170">
      <circle cx="85" cy="85" r={R} fill="none" stroke="#E1E8F0" strokeWidth="10" />
      <circle cx="85" cy="85" r={R} fill="none" stroke="#38A169" strokeWidth="10"
              strokeLinecap="round" strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 85 85)" />
      <text x="85" y="86" textAnchor="middle" fontFamily="Cascadia Mono" fontSize="34" fontWeight="700" fill="#1A202C">{value.toFixed(1)}</text>
      <text x="85" y="106" textAnchor="middle" fontFamily="Cascadia Mono" fontSize="10" fill="#6B7585">% READY</text>
    </svg>
  );
}

function D7Trend() {
  // Quarterly trend
  const pts = [94.2, 94.6, 94.5, 95.1, 95.0, 95.4, 95.6, 95.8, 95.5, 95.7, 96.0];
  const max = 97, min = 93;
  const W = 320, H = 60;
  const stepX = W / (pts.length - 1);
  const yof = (v) => H - ((v - min) / (max - min)) * (H - 4) - 2;
  const path = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${yof(v).toFixed(1)}`).join(' ');
  const area = `${path} L${W},${H} L0,${H} Z`;
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <path d={area} fill="#38A169" opacity="0.12" />
      <path d={path} stroke="#38A169" strokeWidth="1.6" fill="none" />
      {/* baseline 95% */}
      <line x1="0" y1={yof(95)} x2={W} y2={yof(95)} stroke="#B0BCCB" strokeDasharray="3 3" strokeWidth="0.5" />
    </svg>
  );
}

// ─── D8: Empty state ─────────────────────────────────────────────────────────
function MasterD8({ density, railVariant, opsExpanded }) {
  return (
    <MasterShell
      mode="hierarchy"
      railVariant={railVariant}
      env="— no environment —"
      envScope="select or create one to continue"
      crumbs={['Hierarchy', 'Environments']}
      subnav={<MasterSubNav
        items={[
          { label: 'All',       count: 0, active: true },
          { label: 'Production' },
          { label: 'Staging' },
          { label: 'Lab' },
        ]}
        right={<span className="btn sm primary"><IcoPlus size={12}/> New environment</span>}
      />}
      opsExpanded={opsExpanded}
      statusNote="hierarchy · 0 environments · awaiting selection"
    >
      <div style={{ flex: 1, display:'flex', alignItems:'center', justifyContent:'center', padding: 24, background:'var(--anth-bg-app)' }}>
        <div style={{ maxWidth: 720, width:'100%' }}>
          <div className="anth-panel">
            <div style={{ padding: '24px 28px 18px', borderBottom:'1px solid var(--anth-border)', display:'flex', gap: 16, alignItems:'flex-start' }}>
              <div style={{ width: 48, height: 48, border:'1.5px solid var(--anth-border-strong)', borderRadius: 4,
                              display:'flex', alignItems:'center', justifyContent:'center', color:'var(--anth-text-muted)', flex:'0 0 auto' }}>
                <IcoSite size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>No environments defined</div>
                <div style={{ fontSize: 12.5, color:'var(--anth-text-3)', marginTop: 4, lineHeight: 1.55 }}>
                  An Environment is the operational scope Anthracite works inside — a production estate, lab, customer tenant, isolated DC. It binds inventory, credentials, baselines, polling state and compliance to one named universe.
                </div>
              </div>
              <span className="btn sm">Watch tour · 2 m</span>
            </div>
            <div style={{ padding: '12px 0 4px' }}>
              {[
                ['Discover from seed','Point at a seed device or CIDR. Rust discovery walks LLDP / CDP / BGP neighbour tables and builds inventory.',          'recommended', '~ 12 min · 2,000 devices'],
                ['Import from CMDB',  'Pull devices from ServiceNow / Infoblox / NetBox. Credentials & roles merge with discovery on first poll.',           '',            '~ 4 min · field-mapped'],
                ['Clone a baseline',  'Fork apex-lab-london or import an Anthracite environment archive (.anth.toml).',                                       '',            'instant · then re-poll'],
                ['Start blank',       'Hand-build for greenfield design work. Use Build mode only — Operate stays cold until you discover real devices.',     '',            'instant'],
              ].map((s, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap: 14, padding: '12px 28px', borderTop: i ? '1px solid var(--anth-border)' : '0' }}>
                  <span style={{ width: 24, height: 24, border:'1px solid var(--anth-border-strong)', borderRadius: 3,
                                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                                  fontFamily:'var(--anth-font-mono)', fontSize: 11, color:'var(--anth-text-3)' }}>{i+1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{s[0]}</span>
                      {s[2] && <span className="chip info">{s[2]}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color:'var(--anth-text-3)', marginTop: 2, lineHeight: 1.55 }}>{s[1]}</div>
                  </div>
                  <span className="mono muted" style={{ fontSize: 10.5, minWidth: 160, textAlign:'right' }}>{s[3]}</span>
                  <span className="btn sm">{s[2] === 'recommended' ? 'Start →' : 'Choose'}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color:'var(--anth-text-3)', textAlign:'center' }}>
            Or drop an Anthracite environment manifest (<span className="mono">*.anth.toml</span>) anywhere in this window to import.
          </div>
        </div>
      </div>
    </MasterShell>
  );
}

// ─── D9: Loading state ───────────────────────────────────────────────────────
function MasterD9({ density, railVariant }) {
  return (
    <MasterShell
      mode="hierarchy"
      railVariant={railVariant}
      env="apex-prod-emea"
      envScope="discovering · 1,420 / 2,184 devices"
      envState="warn"
      crumbs={['Hierarchy', 'apex-prod-emea', 'Discovering']}
      secondary={<MasterSecondaryNav mode="hierarchy" />}
      opsExpanded={false}
      statusNote="discovery · 2 m 14 s elapsed · 4 workers · throughput 12 dev/s"
    >
      <div style={{ flex: 1, overflow:'auto', padding: 14, background:'var(--anth-bg-app)', display:'flex', flexDirection:'column', gap: 10 }}>
        <div className="anth-panel" style={{ padding: 18, display:'flex', gap: 22, alignItems:'center' }}>
          <div style={{ width: 100, flex:'0 0 auto', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle cx="42" cy="42" r="34" fill="none" stroke="#E1E8F0" strokeWidth="6"/>
              <circle cx="42" cy="42" r="34" fill="none" stroke="#3182CE" strokeWidth="6"
                       strokeLinecap="round" strokeDasharray="138.8 213.6" transform="rotate(-90 42 42)" />
              <text x="42" y="48" textAnchor="middle" fontSize="16" fontFamily="Cascadia Mono" fontWeight="700" fill="#1A202C">65%</text>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Discovering apex-prod-emea</div>
            <div style={{ fontSize: 12, color:'var(--anth-text-3)', marginTop: 3 }}>Rust discovery engine · LLDP / CDP / BGP probes · 4 workers · re-poll cadence 38 s</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 10, marginTop: 16 }}>
              {[
                ['Seeds walked',  '2 / 2',     'done',    100],
                ['Devices found', '1,420 / 2,184', 'running', 65],
                ['Configs pulled','1,162 / 2,184','running', 53],
                ['Baselines diffed','— / 7',     'queued',  0],
                ['Compliance',    '— / 7',     'queued',  0],
              ].map(([k,v,s,p], i) => (
                <div key={i}>
                  <div className="micro" style={{ fontSize: 9.5 }}>{k}</div>
                  <div className="mono num" style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 4 }}>
                    <div style={{ flex:1, height: 4, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                      <div style={{ width: `${p}%`, height:'100%',
                        background: s === 'done' ? 'var(--anth-ok)' : s === 'running' ? 'var(--anth-info)' : 'var(--anth-text-muted)' }} />
                    </div>
                    <span style={{ fontSize: 10, color:'var(--anth-text-3)' }}>{s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap: 6 }}>
            <span className="btn sm">Pause</span>
            <span className="btn sm">Cancel</span>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap: 10 }}>
          <div className="anth-panel">
            <div className="anth-panel-hd"><span className="ttl">Workers · 4 / 4</span><span className="sub">throughput 12 dev/s</span></div>
            <div className="anth-panel-bd" style={{ padding: 12, display:'flex', flexDirection:'column', gap: 8 }}>
              {[
                ['w-01', 'lon-leaf-19.apex', 'ssh · pull config',  'running',  72],
                ['w-02', 'fra-leaf-12.apex', 'lldp neighbours',     'running',  44],
                ['w-03', 'ams-edge-04.apex', 'ssh · pull config',  'running',  88],
                ['w-04', 'par-leaf-08.apex', 'tls handshake',       'running',  18],
              ].map((w, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'40px 1fr 1fr 60px 80px', gap: 8, alignItems:'center', fontSize: 11.5 }}>
                  <span className="mono" style={{ color:'var(--anth-text-3)' }}>{w[0]}</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{w[1]}</span>
                  <span style={{ color:'var(--anth-text-3)' }}>{w[2]}</span>
                  <span><span className="dot ok" style={{ display:'inline-block', verticalAlign:'middle', marginRight: 4 }} /> {w[3]}</span>
                  <div style={{ height: 4, background:'var(--anth-bg-sunken)', borderRadius: 2, overflow:'hidden' }}>
                    <div style={{ width: `${w[4]}%`, height:'100%', background:'var(--anth-info)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="anth-panel">
            <div className="anth-panel-hd"><span className="ttl">Live discovery log</span><span className="sub">streaming · rust-core</span></div>
            <div className="anth-panel-bd" style={{ background:'#0F172A', color:'#CBD5E0', padding: 10, fontFamily:'var(--anth-font-mono)', fontSize: 10.5, lineHeight: 1.55 }}>
              <div><span style={{color:'#94A3B8'}}>17:42:11.412</span> <span style={{color:'#38A169'}}>ok    </span> seed lon-core-01.apex · LLDP yields 32 neighbors</div>
              <div><span style={{color:'#94A3B8'}}>17:42:11.512</span> <span style={{color:'#38A169'}}>ok    </span> probe lon-spine-01 · platform=Arista 7508R3</div>
              <div><span style={{color:'#94A3B8'}}>17:42:11.621</span> <span style={{color:'#38A169'}}>ok    </span> probe lon-spine-02 · platform=Arista 7508R3</div>
              <div><span style={{color:'#94A3B8'}}>17:42:11.812</span> <span style={{color:'#FBBF24'}}>warn  </span> probe lon-leaf-11 · 1 cert mismatch, retry tls-skip-verify</div>
              <div><span style={{color:'#94A3B8'}}>17:42:12.044</span> <span style={{color:'#38A169'}}>ok    </span> pulled config · lon-core-02 · 14,209 lines</div>
              <div><span style={{color:'#94A3B8'}}>17:42:12.318</span> <span style={{color:'#7DD3FC'}}>info  </span> baseline LEAF-BASE-EU loaded · 1,420 lines</div>
              <div><span style={{color:'#94A3B8'}}>17:42:12.516</span> <span style={{color:'#38A169'}}>ok    </span> ssh ams-edge-03 · 380ms (warm pool)</div>
              <div><span style={{color:'#94A3B8'}}>17:42:12.701</span> <span style={{color:'#E53E3E'}}>error </span> fra-leaf-04 unreachable · tcp:22 no route · skipped</div>
              <div><span style={{color:'#94A3B8'}}>17:42:12.802</span> <span style={{color:'#38A169'}}>ok    </span> pulled config · fra-core-01 · 9,884 lines</div>
              <div><span style={{color:'#94A3B8'}}>17:42:12.901</span> <span style={{color:'#7DD3FC'}}>info  </span> queue depth 764 · workers 4 · throughput 12/s</div>
              <div><span style={{color:'#94A3B8'}}>17:42:13.044</span> <span style={{color:'#38A169'}}>ok    </span> lldp neighbors merged · 14,028 edges</div>
              <div><span style={{color:'#94A3B8'}}>17:42:13.221</span> <span style={{color:'#38A169'}}>ok    </span> pulled config · dub-bgp-01 · 6,401 lines</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '8px 12px', background:'var(--anth-info-tint)', border:'1px solid #B5CFEC', borderRadius: 4,
                        fontSize: 11.5, color:'#1E4A82', display:'flex', alignItems:'center', gap: 10 }}>
          <span style={{ fontWeight: 600 }}>Discovery is non-blocking.</span>
          <span>You can browse the partial inventory below as it fills in — Operate and Topology will hydrate progressively.</span>
          <span style={{ flex: 1 }} />
          <span className="kbd" style={{ background:'#fff' }}>Esc</span>
          <span>continue browsing</span>
        </div>
      </div>
    </MasterShell>
  );
}

// ─── D10: Error state ────────────────────────────────────────────────────────
function MasterD10({ density, railVariant, opsExpanded }) {
  return (
    <MasterShell
      mode="hierarchy"
      railVariant={railVariant}
      env="apex-iso-mtn-dc"
      envScope="ISOLATED · transport down · readiness frozen"
      envState="err"
      crumbs={['Hierarchy', 'apex-iso-mtn-dc', 'Overview']}
      secondary={<MasterSecondaryNav mode="hierarchy" />}
      opsExpanded={opsExpanded}
      statusNote="environment isolated · last successful poll 21 m ago · 188 / 188 devices unreachable"
    >
      <div style={{ flex: 1, overflow:'auto', padding: 14, background:'var(--anth-bg-app)' }}>
        <div className="anth-panel" style={{ border:'1px solid var(--anth-err)' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '14px 16px', background:'var(--anth-err-tint)', borderBottom:'1px solid var(--anth-err)' }}>
            <span style={{ width: 26, height: 26, borderRadius: 3, background:'var(--anth-err)', color:'#fff',
                            display:'inline-flex', alignItems:'center', justifyContent:'center', fontWeight: 700, fontFamily:'var(--anth-font-mono)', fontSize: 14 }}>!</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color:'#9B1C1C' }}>Environment is isolated — engines paused</div>
              <div style={{ fontSize: 11.5, color:'#9B1C1C', marginTop: 2 }}>apex-iso-mtn-dc · last successful poll 21 m ago · 188 / 188 devices unreachable · circuit breaker tripped at 17:21:14 UTC</div>
            </div>
            <span className="btn sm">View runbook</span>
            <span className="btn sm">Test transport</span>
            <span className="btn sm primary">Resume polling</span>
          </div>
          <div style={{ padding: 16, display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 18 }}>
            <div>
              <div className="micro" style={{ marginBottom: 8 }}>What Anthracite observed</div>
              <ul style={{ listStyle:'none', padding: 0, margin: 0, fontSize: 12, lineHeight: 1.75 }}>
                {[
                  ['17:21:08','transport channel ', <span className="mono">bastion-mtn-3</span>, ' dropped · last keepalive 18 s ago'],
                  ['17:21:14','188 / 188 device probes timed out within 5 s'],
                  ['17:21:14','circuit breaker tripped · polling cycle paused for environment'],
                  ['17:21:15','readiness scoring suspended (frozen at 41 %)'],
                  ['17:21:30','compliance run ', <span className="mono">cmp-7841</span>, ' aborted at 14 / 188 devices'],
                  ['17:42:18','breaker cooldown expired · awaiting operator decision'],
                ].map((r, i) => (
                  <li key={i} style={{ display:'flex', gap: 12, padding:'3px 0', borderBottom: i < 5 ? '1px dashed var(--anth-border)' : 'none' }}>
                    <span className="mono num" style={{ width: 54, color:'var(--anth-text-3)', fontSize: 11 }}>{r[0]}</span>
                    <span style={{ flex: 1 }}>{r.slice(1).map((part, j) => <React.Fragment key={j}>{part}</React.Fragment>)}</span>
                  </li>
                ))}
              </ul>
              <div className="micro" style={{ marginTop: 18, marginBottom: 8 }}>Suggested next steps</div>
              <ol style={{ paddingLeft: 18, margin: 0, fontSize: 12, lineHeight: 1.75, color:'var(--anth-text-2)' }}>
                <li>Confirm bastion reachability — <span className="kbd">Cortex</span> → <span className="mono">test transport apex-iso-mtn-dc</span></li>
                <li>If bastion is healthy, raise probe timeout to 15 s and re-arm circuit breaker.</li>
                <li>If bastion is down, switch to fallback transport <span className="mono">mtn-oob-vpn</span> (requires NetOps approval).</li>
                <li>Open incident in linked tracker and attach the timeline below.</li>
                <li>Once polling resumes, run a partial compliance sweep before unfreezing readiness.</li>
              </ol>
            </div>
            <div style={{ background:'#0F172A', color:'#CBD5E0', border:'1px solid #1E293B', borderRadius: 4, overflow:'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom:'1px solid #1E293B', display:'flex', alignItems:'center', gap: 8 }}>
                <IcoTerminal size={12} color="#94A3B8" />
                <span style={{ fontSize: 10.5, color:'#94A3B8' }}>engine.log · rust-core</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10, color:'#64748B' }}>410 lines</span>
              </div>
              <div style={{ padding: 12, fontFamily:'var(--anth-font-mono)', fontSize: 10.5, lineHeight: 1.6 }}>
                <div><span style={{color:'#64748B'}}>17:21:08.214</span> <span style={{color:'#FBBF24'}}>warn </span> transport.bastion-mtn-3 · keepalive missed (1/3)</div>
                <div><span style={{color:'#64748B'}}>17:21:13.214</span> <span style={{color:'#FBBF24'}}>warn </span> transport.bastion-mtn-3 · keepalive missed (3/3)</div>
                <div><span style={{color:'#64748B'}}>17:21:13.222</span> <span style={{color:'#E53E3E'}}>error</span> transport.bastion-mtn-3 · channel dropped (kind=tcp_reset)</div>
                <div><span style={{color:'#64748B'}}>17:21:14.012</span> <span style={{color:'#E53E3E'}}>error</span> poller · 188/188 probes timed out (after 5s)</div>
                <div><span style={{color:'#64748B'}}>17:21:14.015</span> <span style={{color:'#FBBF24'}}>warn </span> breaker tripped · env=apex-iso-mtn-dc · cooldown=300s</div>
                <div><span style={{color:'#64748B'}}>17:21:15.001</span> <span style={{color:'#94A3B8'}}>info </span> readiness.freeze · score=41 frozen_at=2026-05-15T17:21:15Z</div>
                <div><span style={{color:'#64748B'}}>17:21:30.412</span> <span style={{color:'#E53E3E'}}>error</span> compliance.cmp-7841 · aborted · 14/188 complete</div>
                <div><span style={{color:'#64748B'}}>17:21:31.012</span> <span style={{color:'#94A3B8'}}>info </span> events.flushed · 22 events emitted upstream</div>
                <div><span style={{color:'#64748B'}}>17:26:14.000</span> <span style={{color:'#94A3B8'}}>info </span> breaker · 5/60 min retry skipped</div>
                <div><span style={{color:'#64748B'}}>17:42:18.612</span> <span style={{color:'#94A3B8'}}>info </span> breaker cooldown expired · awaiting operator</div>
                <div style={{ marginTop: 6, color:'#94A3B8' }}>— end of stream —</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 10 }}>
          {[
            { lbl:'Frozen readiness', val:'41 %',     sub:'last fresh value · 21 m ago', col:'var(--anth-text-3)' },
            { lbl:'Devices unreach',  val:'188 / 188', sub:'since 17:21:14 UTC',          col:'var(--anth-err)' },
            { lbl:'Affected runs',    val:'4',         sub:'compliance · drift · readiness · path traces', col:'var(--anth-warn)' },
            { lbl:'Operator action',  val:'pending',   sub:'auto-resume blocked',          col:'var(--anth-warn)' },
          ].map((k, i) => (
            <div key={i} className="anth-panel" style={{ padding: 12 }}>
              <div className="micro">{k.lbl}</div>
              <div className="mono num" style={{ fontSize: 22, fontWeight: 600, color: k.col }}>{k.val}</div>
              <div style={{ fontSize: 11, color:'var(--anth-text-3)' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </MasterShell>
  );
}

// ─── D11: Cortex behaviours ──────────────────────────────────────────────────
function MasterD11({ density, railVariant }) {
  return (
    <MasterShell
      mode="hierarchy"
      railVariant={railVariant}
      crumbs={['Hierarchy', 'Environments']}
      secondary={<MasterSecondaryNav mode="hierarchy" />}
      subnav={<MasterSubNav
        items={[
          { label: 'All', count: 8, active: true },
          { label: 'Production', count: 4 },
          { label: 'Staging', count: 1 },
          { label: 'Lab', count: 1 },
        ]}
        right={<span className="muted" style={{ fontSize: 11 }}>Cortex behaviours — overlay study</span>}
      />}
      statusNote="cortex · 3 modes · search / run / scope · ⌘1–9 mode jump · ⇥ change scope"
    >
      <div style={{ flex: 1, position:'relative', background:'rgba(241,245,249,0.96)', overflow:'auto', padding: 20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 14, alignItems:'flex-start' }}>
          <D11CortexCard title="1 · Search — typed query, mixed results" subtitle='Query: drift · Cortex finds matching devices, saved views, and contextual actions across the current environment.'>
            <D11Mini scope="apex-prod-emea" query="drift" mode="search" />
          </D11CortexCard>
          <D11CortexCard title="2 · Run — action mode" subtitle="Prefix with > or hit Tab on an action to enter run mode. Cortex shows arg surface + dry-run preview before executing.">
            <D11Mini scope="apex-prod-emea" query="> run baseline sweep" mode="run" />
          </D11CortexCard>
          <D11CortexCard title="3 · Scope — change the universe" subtitle="Tab from the input lifts the scope chip — typing narrows environments. Selecting one rebinds every downstream Cortex result to that scope.">
            <D11Mini scope="(switching…)" query="" mode="scope" />
          </D11CortexCard>
        </div>
        <div className="anth-panel" style={{ marginTop: 16, padding: 14 }}>
          <div className="micro" style={{ marginBottom: 6 }}>Cortex contract</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16, fontSize: 11.5, color:'var(--anth-text-2)', lineHeight: 1.55 }}>
            <div>
              <b style={{ color:'var(--anth-text)' }}>Scoped.</b> Cortex always resolves against the active environment chip; ⇥ to expand scope, ⇧⇥ to narrow.
            </div>
            <div>
              <b style={{ color:'var(--anth-text)' }}>Mixed.</b> Results blend nouns (devices, sites, baselines) with verbs (run sweep, open trace). Verbs preview their effect.
            </div>
            <div>
              <b style={{ color:'var(--anth-text)' }}>Composable.</b> Anything Cortex can do is also a CLI command in the ops dock — same grammar, same arg surface.
            </div>
            <div>
              <b style={{ color:'var(--anth-text)' }}>Auditable.</b> Every Cortex run is journaled with operator, scope, args and outcome. Replay from history.
            </div>
          </div>
        </div>
      </div>
    </MasterShell>
  );
}

function D11CortexCard({ title, subtitle, children }) {
  return (
    <div className="anth-panel" style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--anth-border)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 11, color:'var(--anth-text-3)', marginTop: 3, lineHeight: 1.5 }}>{subtitle}</div>
      </div>
      <div style={{ padding: 14, background:'rgba(26,32,44,0.06)' }}>
        {children}
      </div>
    </div>
  );
}

function D11Mini({ scope, query, mode }) {
  return (
    <div style={{ background:'var(--anth-bg-panel)', border:'1px solid var(--anth-border-strong)', borderRadius: 5, boxShadow:'var(--anth-shadow-pop)', overflow:'hidden', fontSize: 11.5 }}>
      <div style={{ display:'flex', alignItems:'center', gap: 6, padding:'6px 10px', borderBottom:'1px solid var(--anth-border)', background:'var(--anth-bg-sunken)' }}>
        <span className="dot ok" />
        <span className="mono" style={{ fontSize: 10.5, fontWeight: 600 }}>{scope}</span>
        <span className="muted" style={{ fontSize: 10 }}>scope</span>
        <span style={{ flex: 1 }} />
        <span style={{ display:'flex', gap: 2, fontSize: 9.5 }}>
          <span className="kbd" style={{ background: mode === 'search' ? '#fff' : 'var(--anth-bg-panel)', color: mode === 'search' ? 'var(--anth-text)' : 'var(--anth-text-muted)', fontWeight: mode === 'search' ? 600 : 400 }}>search</span>
          <span className="kbd" style={{ background: mode === 'run' ? '#fff' : 'var(--anth-bg-panel)', color: mode === 'run' ? 'var(--anth-text)' : 'var(--anth-text-muted)', fontWeight: mode === 'run' ? 600 : 400 }}>run</span>
          <span className="kbd" style={{ background: mode === 'scope' ? '#fff' : 'var(--anth-bg-panel)', color: mode === 'scope' ? 'var(--anth-text)' : 'var(--anth-text-muted)', fontWeight: mode === 'scope' ? 600 : 400 }}>scope</span>
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'10px 12px', borderBottom:'1px solid var(--anth-border)' }}>
        <IcoSearch size={13} style={{ color:'var(--anth-text-muted)' }} />
        <span className="mono" style={{ fontSize: 13, color: mode === 'run' ? 'var(--anth-info)' : 'var(--anth-text)' }}>{query || <span style={{color:'var(--anth-text-muted)'}}>search environments…</span>}</span>
        {mode === 'search' && <span style={{ width: 1, height: 14, background:'var(--anth-text)', animation:'blink 1s steps(2) infinite' }} />}
      </div>
      {mode === 'search' && <D11SearchResults />}
      {mode === 'run'    && <D11RunPreview />}
      {mode === 'scope'  && <D11ScopePicker />}
      <div style={{ display:'flex', alignItems:'center', gap: 10, padding:'5px 10px', background:'var(--anth-bg-sunken)', borderTop:'1px solid var(--anth-border)', fontSize: 10, color:'var(--anth-text-3)' }}>
        <span>↑↓ navigate</span>
        <span>↵ {mode === 'run' ? 'run' : 'open'}</span>
        <span>⇥ scope</span>
        <span style={{ marginLeft:'auto' }}>Cortex</span>
      </div>
    </div>
  );
}

function D11SearchResults() {
  return (
    <div style={{ maxHeight: 240, overflow:'auto' }}>
      <div style={{ padding:'6px 12px 2px', fontSize: 9.5, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--anth-text-muted)', fontWeight: 600 }}>Top match</div>
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'6px 12px', background:'var(--anth-bg-selected)' }}>
        <IcoBolt size={13} style={{ color:'var(--anth-info)' }} />
        <span style={{ flex: 1 }}>Run baseline drift sweep on <b>apex-prod-emea</b></span>
        <span className="muted" style={{ fontSize: 10 }}>~ 18 s</span>
        <span className="kbd" style={{ fontSize: 9.5 }}>↵</span>
      </div>
      <div style={{ padding:'8px 12px 2px', fontSize: 9.5, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--anth-text-muted)', fontWeight: 600 }}>Devices with drift</div>
      {[
        ['lon-leaf-12.apex','LEAF-BASE-EU · 4 lines · 17:38'],
        ['fra-leaf-08.apex','LEAF-BASE-EU · 7 lines · 16:11'],
        ['par-leaf-03.apex','CORE-AAA-V3 · 2 lines · Tue'],
      ].map((d, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 12px' }}>
          <IcoDevice size={13} style={{ color:'var(--anth-text-3)' }} />
          <span className="mono">{d[0]}</span>
          <span className="muted" style={{ fontSize: 10.5, marginLeft:'auto' }}>{d[1]}</span>
        </div>
      ))}
      <div style={{ padding:'8px 12px 2px', fontSize: 9.5, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--anth-text-muted)', fontWeight: 600 }}>Saved views</div>
      <div style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 12px' }}>
        <IcoEye size={13} style={{ color:'var(--anth-text-3)' }} />
        <span>EU readiness sweep</span>
        <span className="muted" style={{ fontSize: 10.5, marginLeft:'auto' }}>482 lines drift</span>
      </div>
    </div>
  );
}

function D11RunPreview() {
  return (
    <div>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--anth-border)' }}>
        <div className="micro" style={{ marginBottom: 4 }}>Action · run-baseline-sweep</div>
        <div style={{ fontSize: 11, color:'var(--anth-text-2)', lineHeight: 1.55 }}>
          Walk every device in <b>apex-prod-emea</b>, diff against its bound baseline, and emit drift events.
          <span className="muted"> Idempotent · safe · no config push.</span>
        </div>
      </div>
      <div style={{ padding:'8px 12px', borderBottom:'1px solid var(--anth-border)', display:'grid', gridTemplateColumns:'80px 1fr', gap:'4px 8px', fontSize: 11 }}>
        <span style={{ color:'var(--anth-text-3)' }}>scope</span><span className="mono">apex-prod-emea</span>
        <span style={{ color:'var(--anth-text-3)' }}>targets</span><span className="mono">2,184 devices · 7 baselines</span>
        <span style={{ color:'var(--anth-text-3)' }}>baseline</span><span className="mono">[bound] LEAF-BASE-EU v3 + 6</span>
        <span style={{ color:'var(--anth-text-3)' }}>workers</span><span className="mono">4 · throughput 12 dev/s</span>
        <span style={{ color:'var(--anth-text-3)' }}>est.</span><span className="mono">18 s wall · 6.5 s p95</span>
      </div>
      <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap: 8 }}>
        <span className="chip ok">dry-run available</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10.5, color:'var(--anth-text-3)' }}>↵ run · ⇧↵ dry-run</span>
      </div>
    </div>
  );
}

function D11ScopePicker() {
  return (
    <div>
      <div style={{ padding:'6px 12px 2px', fontSize: 9.5, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--anth-text-muted)', fontWeight: 600 }}>Switch scope</div>
      {[
        ['apex-prod-emea',  'ok',   true],
        ['apex-prod-amer',  'ok',   false],
        ['apex-prod-apac',  'warn', false],
        ['apex-edge-retail','warn', false],
        ['apex-lab-london', 'ok',   false],
        ['apex-iso-mtn-dc', 'err',  false],
      ].map((e, i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding:'5px 12px', background: e[2] ? 'var(--anth-bg-selected)' : 'transparent' }}>
          <span className={`dot ${e[1]}`} />
          <span className="mono" style={{ flex: 1, fontWeight: e[2] ? 600 : 400 }}>{e[0]}</span>
          {e[2] && <span className="kbd" style={{ fontSize: 9.5 }}>current</span>}
        </div>
      ))}
      <div style={{ padding:'8px 12px', fontSize: 10.5, color:'var(--anth-text-3)' }}>
        + Multi-scope: hold <span className="kbd" style={{ fontSize: 9.5 }}>⇧</span> to add a scope rather than replace.
      </div>
    </div>
  );
}

// ─── D12: Inspector patterns — side-by-side comparison ───────────────────────
function MasterD12({ density, railVariant }) {
  return (
    <MasterShell
      mode="operate"
      railVariant={railVariant}
      crumbs={['Operate', 'Inspector patterns']}
      subnav={<MasterSubNav
        items={[{ label: 'Right dock', active: true }, { label: 'Bottom drawer' }, { label: 'Floating pop-out' }, { label: 'Comparison' }]}
        right={<span className="muted" style={{ fontSize: 11 }}>three docks · same content · pick per mode</span>}
      />}
      statusNote="inspector patterns · operator picks per mode; floating defaults on canvas modes"
    >
      <div style={{ flex: 1, overflow:'auto', padding: 14, background:'var(--anth-bg-app)', display:'flex', flexDirection:'column', gap: 14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 12 }}>
          {[
            { ttl: 'Right dock · 340 px', sub: 'Default on Hierarchy / Operate / Build. Tall, scrollable, holds the whole anatomy of one object.', dock: 'right' },
            { ttl: 'Bottom drawer · 260 px', sub: 'Default on canvas modes (Topology / Diagnose). Keeps the canvas wide; trades depth for breadth across panes.', dock: 'bottom' },
            { ttl: 'Floating pop-out · 320 × ~variable', sub: 'Pop any inspector out as a draggable window. For side-by-side comparison of two devices or two configs.', dock: 'floating' },
          ].map((c, i) => (
            <div key={i} className="anth-panel" style={{ overflow:'hidden', display:'flex', flexDirection:'column' }}>
              <div style={{ padding: '10px 12px 8px', borderBottom:'1px solid var(--anth-border)' }}>
                <div className="micro">PATTERN · {String.fromCharCode(65+i)}</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 2 }}>{c.ttl}</div>
                <div style={{ fontSize: 11, color:'var(--anth-text-3)', marginTop: 3, lineHeight: 1.5 }}>{c.sub}</div>
              </div>
              <div style={{ position:'relative', height: 380, background:'#FBFCFE', padding: 10 }}>
                <D12Diagram dock={c.dock} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'80px 1fr', gap:'3px 10px', padding: '10px 12px', borderTop:'1px solid var(--anth-border)', fontSize: 11 }}>
                <span style={{ color:'var(--anth-text-3)' }}>good for</span><span>{c.dock === 'right' ? 'deep object anatomy · stays in view while you read tables' : c.dock === 'bottom' ? 'short glances at selected node on a wide canvas' : 'side-by-side compare · ad-hoc placement'}</span>
                <span style={{ color:'var(--anth-text-3)' }}>not for</span><span>{c.dock === 'right' ? 'wide canvases (loses ≥ 25% screen)' : c.dock === 'bottom' ? 'multi-field forms · long lists' : 'sustained reads (gets in the way)'}</span>
                <span style={{ color:'var(--anth-text-3)' }}>shortcut</span><span className="mono"><span className="kbd" style={{ fontSize: 9.5 }}>{c.dock === 'right' ? 'I' : c.dock === 'bottom' ? 'B' : 'P'}</span> toggle</span>
              </div>
            </div>
          ))}
        </div>

        <div className="anth-panel" style={{ padding: 14 }}>
          <div className="micro" style={{ marginBottom: 6 }}>Default per mode</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 0 }}>
            {[
              ['Hierarchy',  'right'],
              ['Provisioning','right'],
              ['Operate',    'right'],
              ['Topology',   'floating + bottom'],
              ['Diagnose',   'bottom'],
              ['Assess',     'none · report mode'],
              ['Security',   'right'],
              ['Build',      'right'],
              ['Dashboards', 'right (chart inspector)'],
              ['Settings',   'none'],
            ].map((r, i) => (
              <div key={i} style={{ padding:'8px 12px', borderRight: i % 5 < 4 ? '1px solid var(--anth-border)' : 'none', borderBottom: i < 5 ? '1px solid var(--anth-border)' : 'none' }}>
                <div className="micro" style={{ fontSize: 9.5 }}>{r[0]}</div>
                <div className="mono" style={{ fontSize: 11.5, marginTop: 2 }}>{r[1]}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color:'var(--anth-text-3)' }}>
            Operator can override per-mode. Last choice is remembered per environment, not globally — different scopes have different workflows.
          </div>
        </div>
      </div>
    </MasterShell>
  );
}

function D12Diagram({ dock }) {
  // Schematic shell preview
  return (
    <div style={{ position:'absolute', inset: 10, border:'1px solid var(--anth-border-strong)', borderRadius: 3, overflow:'hidden', background:'#fff' }}>
      <div style={{ height: 14, background:'var(--anth-bg-sunken)', borderBottom:'1px solid var(--anth-border)' }} />
      <div style={{ display:'flex', height: 'calc(100% - 14px - 10px)' }}>
        <div style={{ width: 30, background:'var(--anth-bg-app)', borderRight:'1px solid var(--anth-border)' }} />
        <div style={{ flex: 1, display:'flex', flexDirection:'column' }}>
          <div style={{ flex: 1, padding: 8, display:'flex', flexDirection:'column', gap: 4 }}>
            <div style={{ height: 16, background:'var(--anth-bg-sunken)', borderRadius: 2 }} />
            <div style={{ height: 10, background:'var(--anth-bg-sunken)', borderRadius: 2, width: '60%' }} />
            <div style={{ flex: 1, background:'var(--anth-bg-sunken)', borderRadius: 2, marginTop: 4, opacity: 0.6 }} />
          </div>
          {dock === 'bottom' && (
            <div style={{ height: 90, background:'var(--anth-bg-panel)', borderTop:'1px solid var(--anth-info)', padding: 8, display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 4 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ background:'var(--anth-bg-sunken)', borderRadius: 2 }} />
              ))}
            </div>
          )}
        </div>
        {dock === 'right' && (
          <div style={{ width: 100, background:'var(--anth-bg-panel)', borderLeft:'1px solid var(--anth-info)', padding: 8, display:'flex', flexDirection:'column', gap: 4 }}>
            <div style={{ height: 14, background:'var(--anth-bg-sunken)', borderRadius: 2 }} />
            <div style={{ height: 10, background:'var(--anth-bg-sunken)', borderRadius: 2, width: '70%' }} />
            <div style={{ flex: 1, background:'var(--anth-bg-sunken)', borderRadius: 2 }} />
          </div>
        )}
      </div>
      <div style={{ height: 10, background:'var(--anth-bg-statusbar)', borderTop:'1px solid var(--anth-border)' }} />
      {dock === 'floating' && (
        <div style={{ position:'absolute', right: 30, top: 60, width: 110, height: 160, background:'var(--anth-bg-panel)',
                       border:'1px solid var(--anth-info)', boxShadow:'0 4px 14px rgba(0,0,0,0.15)', borderRadius: 4, padding: 8,
                       display:'flex', flexDirection:'column', gap: 4 }}>
          <div style={{ height: 14, background:'var(--anth-bg-sunken)', borderRadius: 2 }} />
          <div style={{ flex: 1, background:'var(--anth-bg-sunken)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MasterD7, MasterD8, MasterD9, MasterD10, MasterD11, MasterD12 });
