// Topology Hardware Desk — 2D Blueprint Node Sheet
// Eight device families · each rendered as a topology glyph
// (the symbol the operator sees on the map) with drafting anatomy callouts.

// ─── Geometry helpers ─────────────────────────────────────────────────────────

// A tight grid of port slots — used in faceplate previews on device glyphs.
function PortGrid({ x, y, cols, rows, pitchX = 7, pitchY = 7, slotW = 5, slotH = 5, live }) {
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const px = x + c * pitchX;
      const py = y + r * pitchY;
      const isLive = live && (typeof live === 'function' ? live(c, r) : false);
      out.push(
        <rect key={`p-${c}-${r}`} x={px} y={py} width={slotW} height={slotH}
              className={isLive ? 'fill-cyan' : 'fill-port'} />
      );
    }
  }
  return <g>{out}</g>;
}

// SFP cage row — distinguishable, deeper rectangles
function SfpRow({ x, y, n, pitchX = 14, slotW = 12, slotH = 8 }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(
      <g key={i} transform={`translate(${x + i * pitchX}, ${y})`}>
        <rect x="0" y="0" width={slotW} height={slotH} className="fill-bay" />
        <rect x="1" y="1" width={slotW - 2} height={slotH - 2} className="hl-3" />
      </g>
    );
  }
  return <g>{out}</g>;
}

// ─── Per-family glyphs ────────────────────────────────────────────────────────
// All rendered into an 160×120 viewport; the outer frame is drawn by the caller.

const NodeGlyphs = {
  // 1 · ACCESS SWITCH — wide pizza-box shelf, dense port row
  access: ({ scale = 1 }) => (
    <g>
      {/* outer frame — pizza-box silhouette */}
      <rect x="6" y="34" width="148" height="52" rx="1" className="hl-thick fill-paper" />
      {/* vendor bezel rule */}
      <line x1="6" y1="42" x2="154" y2="42" className="hl-2" />
      {/* port band */}
      <PortGrid x="14" y="52" cols={24} rows={2} pitchX={5.2} pitchY={6} slotW={4} slotH={4}
                live={(c) => c === 4 || c === 11 || c === 17} />
      {/* uplinks (SFP+) — 4 cages right */}
      <SfpRow x="14" y="70" n={2} pitchX={10} slotW={8} slotH={5} />
      <SfpRow x="120" y="48" n={4} pitchX={8.5} slotW={7} slotH={6} />
      {/* status LED bank — left */}
      <g transform="translate(10,46)">
        <circle cx="0" cy="0" r="1.5" className="fill-ok" />
        <circle cx="0" cy="4" r="1.5" className="fill-ok" />
        <circle cx="0" cy="8" r="1.5" className="fill-cyan" />
      </g>
      {/* role plate */}
      <rect x="64" y="38" width="32" height="3" className="fill-ink" />
      {/* console + mgmt cluster, right of port band */}
      <rect x="148" y="80" width="4" height="4" className="hl-3 fill-paper" />
    </g>
  ),

  // 2 · DISTRIBUTION SWITCH — taller shelf, two port bands, stack mark
  distribution: ({ scale = 1 }) => (
    <g>
      <rect x="6" y="20" width="148" height="80" rx="1" className="hl-thick fill-paper" />
      <line x1="6" y1="30" x2="154" y2="30" className="hl-2" />
      {/* two stacked U bands */}
      <PortGrid x="14" y="38" cols={24} rows={2} pitchX={5.2} pitchY={6} slotW={4} slotH={4}
                live={(c) => c === 2 || c === 9 || c === 15 || c === 22} />
      <line x1="6" y1="62" x2="154" y2="62" className="hl-3" />
      <PortGrid x="14" y="70" cols={24} rows={2} pitchX={5.2} pitchY={6} slotW={4} slotH={4}
                live={(c, r) => (c === 5 && r === 0) || (c === 18 && r === 1)} />
      {/* uplink QSFP — 4 cages right */}
      <SfpRow x="116" y="86" n={3} pitchX={11} slotW={9} slotH={7} />
      {/* status column */}
      <g transform="translate(10,38)">
        {[0, 1, 2, 3].map(i => <circle key={i} cx="0" cy={i * 5} r="1.5" className={i === 1 ? 'fill-warn' : 'fill-ok'} />)}
      </g>
      {/* stack identifier — 4 small ticks indicating stack-id */}
      <g transform="translate(146,38)">
        {[0, 1, 2, 3].map(i => <rect key={i} x="0" y={i * 4} width="3" height="2" className="fill-ink" />)}
      </g>
    </g>
  ),

  // 3 · CORE ROUTER — modular chassis with visible line cards
  core: ({ scale = 1 }) => (
    <g>
      {/* heavy outer frame */}
      <rect x="6" y="10" width="148" height="100" rx="1" className="hl-thick fill-paper" />
      <rect x="6" y="10" width="148" height="100" rx="1" className="hl-2" strokeDasharray="0" style={{ strokeWidth: 0.3, fill: 'none' }} />
      {/* control plane strip */}
      <rect x="10" y="14" width="140" height="10" className="fill-paper hl-2" />
      <circle cx="14" cy="19" r="1.4" className="fill-ok" />
      <circle cx="20" cy="19" r="1.4" className="fill-ok" />
      <text x="28" y="22" className="mono" fontSize="6" fill="var(--topo-ink-3)">SUP · RP A · RP B · ACTIVE</text>
      {/* 4 line-card bays */}
      {[0, 1, 2, 3].map(b => (
        <g key={b} transform={`translate(${10 + b * 36}, ${28})`}>
          <rect x="0" y="0" width="32" height="62" className="hl-2 fill-paper" />
          {/* card label strip */}
          <rect x="0" y="0" width="32" height="6" className="fill-paper hl-3" />
          <text x="2" y="4.5" className="mono" fontSize="4.5" fill="var(--topo-ink-3)">LC{b + 1}</text>
          {/* either populated or empty */}
          {b !== 2 ? (
            <g>
              <PortGrid x="2" y="10" cols={6} rows={4} pitchX={5} pitchY={5} slotW={4} slotH={4}
                        live={(c, r) => (b + c + r) % 5 === 0} />
              {/* QSFP slots at bottom */}
              <SfpRow x="2" y="50" n={2} pitchX={15} slotW={12} slotH={8} />
            </g>
          ) : (
            <g>
              <text x="16" y="38" textAnchor="middle" className="mono" fontSize="6" fill="var(--topo-ink-4)">EMPTY</text>
              <text x="16" y="46" textAnchor="middle" className="mono" fontSize="5" fill="var(--topo-ink-4)">BAY 3</text>
            </g>
          )}
        </g>
      ))}
      {/* power / fan tray hint at bottom */}
      <rect x="10" y="94" width="68" height="12" className="hl-3 fill-paper" />
      <text x="14" y="102" className="mono" fontSize="5" fill="var(--topo-ink-3)">PSU A · 1+1</text>
      <rect x="82" y="94" width="68" height="12" className="hl-3 fill-paper" />
      <text x="86" y="102" className="mono" fontSize="5" fill="var(--topo-ink-3)">FAN TRAY · 6</text>
    </g>
  ),

  // 4 · FIREWALL — chamfered shield silhouette with inspection plane
  firewall: ({ scale = 1 }) => (
    <g>
      {/* chamfered rectangle */}
      <path d="M 16 14 L 144 14 L 154 24 L 154 96 L 144 106 L 16 106 L 6 96 L 6 24 Z"
            className="hl-thick fill-paper" />
      {/* trust / untrust split — diagonal hatch on left, vertical on right */}
      <line x1="80" y1="14" x2="80" y2="106" className="hl-cyan" strokeDasharray="3 2" />
      <text x="36" y="24" className="stencil" fontSize="6" fill="var(--topo-ink-3)" textAnchor="middle">TRUST</text>
      <text x="120" y="24" className="stencil" fontSize="6" fill="var(--topo-ink-3)" textAnchor="middle">UNTRUST</text>
      {/* inspection plane indicator */}
      <g transform="translate(74, 56)">
        <rect x="0" y="0" width="12" height="12" className="fill-cyan-soft hl-cyan" />
        <path d="M2 6 L10 6 M6 2 L6 10" className="hl-cyan" />
      </g>
      {/* ports — fewer, larger; trust side */}
      <PortGrid x="12" y="32" cols={4} rows={2} pitchX={8} slotW={6} slotH={6}
                live={(c, r) => r === 0 && c < 3} />
      <text x="12" y="80" className="mono" fontSize="5" fill="var(--topo-ink-3)">G0/0..7</text>
      {/* ports — untrust side */}
      <SfpRow x="86" y="40" n={2} pitchX={14} slotW={12} slotH={8} />
      <SfpRow x="86" y="56" n={2} pitchX={14} slotW={12} slotH={8} />
      <text x="86" y="80" className="mono" fontSize="5" fill="var(--topo-ink-3)">SFP+ ×4</text>
      {/* zone counters — top of card */}
      <g transform="translate(56, 90)">
        <text className="mono" fontSize="6" fill="var(--topo-ink-3)">CONN</text>
        <text y="8" className="mono" fontSize="7" fill="var(--topo-ink)">142,318</text>
      </g>
    </g>
  ),

  // 5 · EDGE / WAN ROUTER — boundary; outbound notches; AS number plate
  edge: ({ scale = 1 }) => (
    <g>
      {/* rectangle with notched top corners — outward arrows */}
      <path d="M 16 14 L 28 26 L 132 26 L 144 14 L 154 14 L 154 106 L 6 106 L 6 14 Z"
            className="hl-thick fill-paper" />
      <line x1="6" y1="34" x2="154" y2="34" className="hl-2" />
      {/* AS / peering plate */}
      <rect x="44" y="36" width="72" height="14" className="fill-paper hl-cyan" />
      <text x="80" y="46" textAnchor="middle" className="mono" fontWeight="700" fontSize="8" fill="var(--topo-cyan-deep)">AS 65501</text>
      {/* WAN-facing optics — two QSFP cages */}
      <SfpRow x="14" y="58" n={2} pitchX={16} slotW={14} slotH={9} />
      <text x="14" y="78" className="mono" fontSize="5" fill="var(--topo-ink-3)">WAN · 100G ×2</text>
      {/* internal ports — right */}
      <PortGrid x="92" y="58" cols={8} rows={2} pitchX={7} slotW={5} slotH={5}
                live={(c) => c === 0 || c === 3 || c === 7} />
      <text x="92" y="78" className="mono" fontSize="5" fill="var(--topo-ink-3)">LAN · 10G ×16</text>
      {/* peer arrows on top edge */}
      <path d="M22 8 L22 14 M18 12 L22 8 L26 12" className="hl-cyan" />
      <path d="M138 8 L138 14 M134 12 L138 8 L142 12" className="hl-cyan" />
      {/* status */}
      <g transform="translate(12,18)">
        <circle cx="0" cy="0" r="1.5" className="fill-ok" />
        <circle cx="6" cy="0" r="1.5" className="fill-ok" />
        <circle cx="12" cy="0" r="1.5" className="fill-warn" />
      </g>
      {/* bottom: rib */}
      <rect x="10" y="92" width="140" height="10" className="hl-3 fill-paper" />
      <text x="14" y="100" className="mono" fontSize="5" fill="var(--topo-ink-3)">CONSOLE · MGMT · USB</text>
    </g>
  ),

  // 6 · SERVER / VIRTUAL NODE — stacked 1U slats; dashed outline = virtual
  server: ({ scale = 1, virtual = false }) => (
    <g>
      {/* dashed virtual halo */}
      {virtual && (
        <rect x="2" y="2" width="156" height="116" className="hl-3"
              strokeDasharray="3 2" />
      )}
      {/* three 1U slats stacked */}
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(6, ${24 + i * 26})`}>
          <rect x="0" y="0" width="148" height="22" rx="0.5"
                className={`hl-thick fill-paper`}
                strokeDasharray={virtual ? '2 1.5' : '0'} />
          {/* drive bays — 8 across left */}
          <PortGrid x="6" y="4" cols={8} rows={2} pitchX={6} pitchY={7} slotW={5} slotH={6}
                    live={(c, r) => i === 1 && c === 2 && r === 0} />
          {/* NIC ports — right */}
          <g transform="translate(120, 6)">
            <rect x="0" y="0" width="6" height="5" className="fill-port" />
            <rect x="8" y="0" width="6" height="5" className="fill-port" />
            <rect x="16" y="0" width="6" height="5" className="fill-port" />
            <rect x="24" y="0" width="6" height="5" className="fill-port" />
          </g>
          {/* status */}
          <circle cx="142" cy="16" r="1.4" className={i === 2 ? 'fill-warn' : 'fill-ok'} />
          {/* slug — left */}
          <text x="60" y="14" className="mono" fontSize="6" fill="var(--topo-ink-3)">
            {virtual ? `vm-${i + 1}` : `R740-${i + 1}`}
          </text>
        </g>
      ))}
    </g>
  ),

  // 7 · WIRELESS AP — octagonal disc with radiation arcs
  wap: ({ scale = 1 }) => (
    <g>
      {/* radiation arcs (background) */}
      {[34, 44, 54].map(r => (
        <g key={r}>
          <path d={`M ${80 - r} 60 A ${r} ${r} 0 0 1 ${80 + r} 60`}
                className="hl-3" strokeDasharray="2 2" opacity="0.55" />
        </g>
      ))}
      {/* octagonal body */}
      <path d="M 60 30 L 100 30 L 120 50 L 120 70 L 100 90 L 60 90 L 40 70 L 40 50 Z"
            className="hl-thick fill-paper" />
      {/* concentric ring inside */}
      <circle cx="80" cy="60" r="18" className="hl-2" />
      <circle cx="80" cy="60" r="9" className="hl-cyan" />
      <circle cx="80" cy="60" r="2.5" className="fill-cyan" />
      {/* antenna ticks (4 corners) */}
      {[[30, 50], [130, 50], [30, 70], [130, 70]].map((p, i) => (
        <line key={i} x1={p[0]} y1={p[1]} x2={p[0] + (i % 2 ? 8 : -8)} y2={p[1]} className="hl-cyan" />
      ))}
      {/* labels */}
      <text x="80" y="105" textAnchor="middle" className="mono" fontSize="6" fill="var(--topo-ink-3)">2.4 / 5 / 6 GHz · WIFI-7</text>
      <text x="80" y="22" textAnchor="middle" className="stencil" fontSize="6" fill="var(--topo-cyan-deep)">802.11BE</text>
      {/* one PoE input */}
      <rect x="76" y="92" width="8" height="6" className="fill-bay" />
    </g>
  ),

  // 8 · UNKNOWN DEVICE — dashed border with central question mark
  unknown: ({ scale = 1 }) => (
    <g>
      <rect x="14" y="22" width="132" height="76" rx="2" className="hl-2 fill-paper"
            strokeDasharray="4 3" />
      {/* question stencil */}
      <text x="80" y="74" textAnchor="middle" className="stencil"
            fontSize="38" fontWeight="800" fill="var(--topo-ink-4)">?</text>
      {/* corner ticks — fingerprint */}
      <g className="hl-3">
        <path d="M16 24 L20 24 L20 28" />
        <path d="M144 24 L140 24 L140 28" />
        <path d="M16 96 L20 96 L20 92" />
        <path d="M144 96 L140 96 L140 92" />
      </g>
      {/* "discovered, not classified" tag */}
      <rect x="50" y="100" width="60" height="8" className="fill-paper hl-3" />
      <text x="80" y="106" textAnchor="middle" className="mono" fontSize="5"
            fill="var(--topo-ink-3)">DISCOVERED · UNCLASSIFIED</text>
    </g>
  ),
};

// ─── Glyph card (one family rendered at presentation scale + small "map view") ──
function NodeCard({ family, no, name, slug, spec, glyph, statesShown, meta, callouts, virtual }) {
  const Glyph = NodeGlyphs[glyph];
  return (
    <div className="topo-cell">
      <span className="cell-no">{no}</span>
      <div className="cell-hd">
        <span className="name">{name}</span>
        <span className="slug">[{slug}]</span>
        <span className="spec">{spec}</span>
      </div>

      {/* the rendered glyph */}
      <div className="cell-bd" style={{ minHeight: 200, padding: '6px 8px' }}>
        <svg viewBox="0 0 360 200" width="100%" style={{ maxHeight: 200 }}>
          {/* construction extension lines (drafting feel) */}
          <line x1="0" y1="10" x2="360" y2="10" className="hl-4" />
          <line x1="0" y1="190" x2="360" y2="190" className="hl-4" />
          {/* dimensional ticks (decorative drafting) */}
          <g className="hl-3">
            <line x1="92" y1="6" x2="92" y2="14" />
            <line x1="248" y1="6" x2="248" y2="14" />
            <line x1="92" y1="10" x2="248" y2="10" />
          </g>
          {/* dimension label */}
          <text x="170" y="8" className="mono" fontSize="6"
                fill="var(--topo-ink-3)">W = 160 px @ map scale 1.0</text>

          {/* main glyph (at 160 wide) */}
          <g transform="translate(92, 30)">
            {/* reference frame — neutral hairline; cyan ring is reserved for actual focus (see storyboard) */}
            <rect x="-3" y="-3" width="166" height="126" rx="3"
                  className="hl-3" style={{ strokeWidth: 0.75 }} />
            <Glyph virtual={virtual} />
          </g>

          {/* at-map-scale preview (right) */}
          <g transform="translate(282, 50) scale(0.45)">
            <rect x="-3" y="-3" width="166" height="126" rx="3"
                  className="hl-3" style={{ strokeWidth: 1.2 }} />
            <Glyph virtual={virtual} />
            <text x="80" y="138" textAnchor="middle" className="mono"
                  fontSize="12" fill="var(--topo-ink-3)">@ 0.45 ×</text>
          </g>

          {/* callouts */}
          {callouts && callouts.map((c, i) => (
            <g key={i}>
              <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} className="ext-line" />
              <circle cx={c.x1} cy={c.y1} r="1.2" className="fill-ink" />
              <text x={c.tx} y={c.ty} className="mono" fontSize="6.5"
                    textAnchor={c.anchor || 'start'}
                    fill="var(--topo-ink-2)">{c.text}</text>
            </g>
          ))}
        </svg>
      </div>

      {/* state strip — five outline states applied at small scale */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 0' }}>
        {statesShown.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <svg width="48" height="36" viewBox="0 0 160 120">
              <rect x="-2" y="-2" width="164" height="124" rx="3"
                    fill="none"
                    stroke={`var(--topo-${s.tok})`}
                    strokeWidth={s.tok === 'critical' ? '4' : '3'}
                    strokeDasharray={s.tok === 'deferred' ? '6 4' : '0'} />
              <g transform="translate(0,0) scale(1)">
                <Glyph virtual={virtual} />
              </g>
              {s.tok === 'critical' && (
                <rect x="-2" y="-2" width="164" height="124" rx="3"
                      fill="none" stroke={`var(--topo-${s.tok})`}
                      strokeWidth="6" opacity="0.25" />
              )}
            </svg>
            <span className="nano">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="cell-meta">
        {meta.map((m, i) => (
          <span key={i} className="kvp"><span className="k">{m[0]}</span> <b>{m[1]}</b></span>
        ))}
      </div>
    </div>
  );
}

// ─── The full 2D sheet ───────────────────────────────────────────────────────
function Sheet2DNodes() {
  const STATES = [
    { tok: 'ok',       label: 'OK' },
    { tok: 'warn',     label: 'WARN' },
    { tok: 'err',      label: 'BLOCKED' },
    { tok: 'deferred', label: 'IDLE' },
    { tok: 'critical', label: 'CRIT' },
  ];

  const families = [
    {
      no: 'NODE-01', name: 'Access Switch', slug: 'ACC-SW',
      spec: '1U · 24× 1G + 4× SFP+',
      glyph: 'access',
      meta: [['role', 'access'], ['hosts', '24'], ['uplinks', '4×10G'], ['stack', '—']],
      callouts: [
        { x1: 130, y1: 60, x2: 200, y2: 35, tx: 200, ty: 33, text: 'A · vendor bezel + role plate' },
        { x1: 150, y1: 90, x2: 200, y2: 110, tx: 200, ty: 113, text: 'B · access port band 24 × RJ45' },
        { x1: 240, y1: 70, x2: 270, y2: 50, tx: 270, ty: 47, text: 'C · 4× SFP+ uplink' },
        { x1: 95, y1: 70, x2: 60, y2: 90, tx: 6, ty: 92, text: 'D · 3-LED status bank' },
      ],
    },
    {
      no: 'NODE-02', name: 'Distribution Switch', slug: 'DIST-SW',
      spec: '2U · 48× 1G + 3× QSFP28',
      glyph: 'distribution',
      meta: [['role', 'distribution'], ['ports', '48'], ['uplinks', '3×100G'], ['stack', 'id=4']],
      callouts: [
        { x1: 240, y1: 90, x2: 270, y2: 75, tx: 270, ty: 73, text: 'A · 3× QSFP28 uplink' },
        { x1: 110, y1: 90, x2: 200, y2: 113, tx: 200, ty: 116, text: 'B · double port band (48 ports)' },
        { x1: 254, y1: 55, x2: 285, y2: 38, tx: 285, ty: 36, text: 'C · stack-id stripe (4 of 8)' },
      ],
    },
    {
      no: 'NODE-03', name: 'Core Router', slug: 'CORE-RT',
      spec: 'modular · 4-bay chassis',
      glyph: 'core',
      meta: [['role', 'core'], ['bays', '4 · 3 populated'], ['cap.', '12.8 Tbps'], ['cards', 'LC1-2-4']],
      callouts: [
        { x1: 100, y1: 35, x2: 200, y2: 25, tx: 200, ty: 23, text: 'A · supervisor / RP plane' },
        { x1: 175, y1: 100, x2: 240, y2: 116, tx: 240, ty: 119, text: 'B · PSU + fan-tray hint' },
        { x1: 175, y1: 70, x2: 250, y2: 100, tx: 250, ty: 96, text: 'C · empty bay (LC3) — drawable' },
      ],
    },
    {
      no: 'NODE-04', name: 'Firewall', slug: 'FW',
      spec: 'NGFW · 4 zones · L7',
      glyph: 'firewall',
      meta: [['role', 'firewall'], ['sessions', '142K'], ['zones', '4'], ['HA', 'A/S']],
      callouts: [
        { x1: 175, y1: 55, x2: 240, y2: 35, tx: 240, ty: 33, text: 'A · trust ▸ inspection ◂ untrust' },
        { x1: 175, y1: 100, x2: 240, y2: 118, tx: 240, ty: 121, text: 'B · session counter, live' },
        { x1: 90, y1: 55, x2: 30, y2: 35, tx: 0, ty: 33, text: 'C · chamfered shield silhouette', anchor: 'start' },
      ],
    },
    {
      no: 'NODE-05', name: 'Edge / WAN Router', slug: 'EDGE-RT',
      spec: 'BGP · 2× 100G WAN',
      glyph: 'edge',
      meta: [['role', 'edge'], ['AS', '65501'], ['peers', '4'], ['WAN', '2×100G']],
      callouts: [
        { x1: 175, y1: 40, x2: 240, y2: 25, tx: 240, ty: 23, text: 'A · AS plate · cyan signal' },
        { x1: 105, y1: 30, x2: 75, y2: 14, tx: 75, ty: 11, text: 'B · outbound peer notches' },
        { x1: 115, y1: 75, x2: 75, y2: 100, tx: 75, ty: 103, text: 'C · WAN optics 100G ×2' },
      ],
    },
    {
      no: 'NODE-06', name: 'Server / Virtual', slug: 'SRV · VM',
      spec: '1U / 3U stack · NIC ×4',
      glyph: 'server', virtual: false,
      meta: [['role', 'compute'], ['form', '1U stack ×3'], ['NIC', '4×25G'], ['virt', 'opt. dashed']],
      callouts: [
        { x1: 105, y1: 50, x2: 200, y2: 30, tx: 200, ty: 28, text: 'A · 1U slats stack (1·2·3)' },
        { x1: 245, y1: 50, x2: 280, y2: 36, tx: 280, ty: 33, text: 'B · NIC ports per slat' },
        { x1: 100, y1: 110, x2: 60, y2: 130, tx: 6, ty: 132, text: 'C · dashed = virtual / VM family', anchor: 'start' },
      ],
    },
    {
      no: 'NODE-07', name: 'Wireless AP', slug: 'WAP',
      spec: 'Wi-Fi 7 · 2.4/5/6 GHz',
      glyph: 'wap',
      meta: [['role', 'wireless'], ['bands', '3'], ['radios', '4×4 MU-MIMO'], ['PoE', '802.3bt']],
      callouts: [
        { x1: 175, y1: 60, x2: 240, y2: 40, tx: 240, ty: 38, text: 'A · radio core (cyan dot)' },
        { x1: 250, y1: 90, x2: 280, y2: 110, tx: 280, ty: 113, text: 'B · radiation arcs · zoom-stable' },
        { x1: 100, y1: 90, x2: 60, y2: 110, tx: 6, ty: 113, text: 'C · PoE input cavity', anchor: 'start' },
      ],
    },
    {
      no: 'NODE-08', name: 'Unknown Device', slug: 'UNK',
      spec: 'discovered · not classified',
      glyph: 'unknown',
      meta: [['role', '?'], ['first-seen', '38m ago'], ['MAC vendor', 'Arista'], ['ports', '·']],
      callouts: [
        { x1: 175, y1: 70, x2: 240, y2: 50, tx: 240, ty: 48, text: 'A · dashed frame = unclassified' },
        { x1: 175, y1: 100, x2: 240, y2: 118, tx: 240, ty: 121, text: 'B · provenance tag (origin scan)' },
      ],
    },
  ];

  return (
    <div className="topo">
      <div className="topo-sheet">
        <header className="topo-sheet-head">
          <div className="ttl-block">
            <div className="sheet-no">
              <span>SHEET <b>2D-01</b></span>
              <span>REV <b>A · 26.05.23</b></span>
              <span>SCALE <b>1.0 × · 0.45 ×</b></span>
              <span>PROJ <b>ANTHRACITE / TOPO-DESK</b></span>
            </div>
            <h1>Topology Node Families · 2D Blueprint</h1>
            <div className="subtitle">
              Eight device families. Each glyph is the symbol the operator sees on the topology map — distinctive at zoom-out (0.45 ×), legible at zoom-in (1.0 ×). State carries via the outer ring; capability via the role-specific silhouette. No icons; only geometry.
            </div>
          </div>
          <div className="stamp">
            <div className="row"><span>DRWN</span><b>D.CLAUDE</b></div>
            <div className="row"><span>CHKD</span><b>BUJAR</b></div>
            <div className="row"><span>OBEYS</span><b>VISUAL §10</b></div>
            <div className="row"><span>UNIT</span><b>PX @ 1.0 ×</b></div>
          </div>
        </header>

        <div className="topo-sheet-body">
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '4px 0 0',
          }}>
            {families.map(f => (
              <NodeCard key={f.no} {...f} statesShown={STATES} />
            ))}
          </div>

          {/* Conventions strip */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">Drawing conventions</span><span className="slug">[GLOBAL]</span></div>
              <div className="topo-anno" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                <span><span className="lbl">stroke 1.5</span> primary frame · device silhouette</span>
                <span><span className="lbl">stroke 0.75</span> internal divisions · faceplate bezels</span>
                <span><span className="lbl">stroke 0.5</span> grid · construction · extension lines</span>
                <span><span className="lbl">cyan #0E72A0</span> signal — selection, signal flow, AS plate</span>
                <span><span className="lbl">port fill #0E1E2C</span> port cavity (dark slot)</span>
                <span><span className="lbl">bay fill #1B2630</span> module bay opening</span>
                <span><span className="lbl">dashed 4/3</span> unclassified or virtual</span>
              </div>
            </div>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">State ring rule</span><span className="slug">[STATE]</span></div>
              <div className="topo-anno" style={{ paddingTop: 4 }}>
                State sits on the <b>outer ring</b>, not on the glyph interior. Ring stroke is 3 px (4 px for critical, with an additional 6 px outer halo at 25 % opacity). Deferred is the only ring drawn dashed (6 / 4). This keeps the glyph silhouette stable across states.
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                {STATES.map((s, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span className="topo-led" style={{ background: `var(--topo-${s.tok})`, width: 8, height: 8 }} />
                    <span className="nano">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">Zoom behaviour</span><span className="slug">[SCALE]</span></div>
              <div className="topo-anno" style={{ paddingTop: 4 }}>
                Glyph anatomy collapses past <b>0.45 ×</b>: faceplate ports merge into a single band, internal labels disappear, status LEDs flatten to one halo on the state ring. The silhouette and the state ring remain identifiable down to <b>0.20 ×</b>.
              </div>
            </div>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">Selection / focus</span><span className="slug">[FOCUS]</span></div>
              <div className="topo-anno" style={{ paddingTop: 4 }}>
                Hover lifts the glyph 2 px (drop-shadow 0 2 6 rgba(14,55,80,0.16)). Single-click engages the cyan focus ring (1.5 px solid) <b>inside</b> the state ring. Double-click triggers the 2D → 3D inspection transition (see storyboard).
              </div>
            </div>
          </div>
        </div>

        <footer className="topo-sheet-foot">
          <span><b>SHEET 2D-01</b></span><span className="sep" />
          <span>8 families · 1 unclassified · 5 states · 2 zoom scales</span>
          <span className="sep" />
          <span>tokens · <span className="mono">styles/topology-desk.css</span></span>
          <div className="grow" />
          <span>© ANTHRACITE — operator design, no reissue without engineering sign-off</span>
        </footer>
      </div>
    </div>
  );
}

Object.assign(window, { NodeGlyphs, NodeCard, PortGrid, SfpRow, Sheet2DNodes });
