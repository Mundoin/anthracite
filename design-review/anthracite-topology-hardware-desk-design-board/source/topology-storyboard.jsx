// Topology Hardware Desk — Interaction Storyboard
// Five frames: map view → single click card → double click → 3D inspection → orbit/port click.

// ─── Frame 1: Topology map overview ───────────────────────────────────────────
function Frame_Map({ selectedId }) {
  const NODES = [
    // foundation / core
    { id: 'core-1', x: 380, y: 180, glyph: 'core',          short: 'lon-core-01' },
    { id: 'core-2', x: 540, y: 180, glyph: 'core',          short: 'lon-core-02' },
    { id: 'edge-1', x: 200, y: 120, glyph: 'edge',          short: 'lon-edge-01' },
    { id: 'edge-2', x: 720, y: 120, glyph: 'edge',          short: 'lon-edge-02' },
    { id: 'fw-1',   x: 460, y: 80,  glyph: 'firewall',      short: 'lon-fw-01' },
    // distribution
    { id: 'dist-1', x: 280, y: 290, glyph: 'distribution',  short: 'lon-dist-01' },
    { id: 'dist-2', x: 460, y: 290, glyph: 'distribution',  short: 'lon-dist-02' },
    { id: 'dist-3', x: 640, y: 290, glyph: 'distribution',  short: 'lon-dist-03' },
    // access (state: leaf-04 partial — selected)
    { id: 'acc-1', x: 160, y: 400, glyph: 'access', short: 'lon-leaf-01' },
    { id: 'acc-2', x: 280, y: 400, glyph: 'access', short: 'lon-leaf-02' },
    { id: 'acc-3', x: 400, y: 400, glyph: 'access', short: 'lon-leaf-03' },
    { id: 'acc-4', x: 520, y: 400, glyph: 'access', short: 'lon-leaf-04', state: 'warn', selected: selectedId === 'acc-4' },
    { id: 'acc-5', x: 640, y: 400, glyph: 'access', short: 'lon-leaf-05' },
    { id: 'acc-6', x: 760, y: 400, glyph: 'access', short: 'lon-leaf-06' },
    // wireless + servers
    { id: 'wap-1', x: 220, y: 500, glyph: 'wap',     short: 'wap-flr-3a' },
    { id: 'wap-2', x: 700, y: 500, glyph: 'wap',     short: 'wap-flr-3b' },
    { id: 'srv-1', x: 380, y: 500, glyph: 'server',  short: 'rack-fra-12' },
    { id: 'srv-2', x: 540, y: 500, glyph: 'server',  short: 'rack-fra-13' },
    { id: 'unk-1', x: 60,  y: 320, glyph: 'unknown', short: '? discovered' },
  ];

  // Edges (logical L2/L3 links)
  const EDGES = [
    ['edge-1', 'core-1'], ['edge-2', 'core-2'],
    ['core-1', 'core-2'], ['core-1', 'fw-1'], ['core-2', 'fw-1'],
    ['core-1', 'dist-1'], ['core-1', 'dist-2'], ['core-2', 'dist-2'], ['core-2', 'dist-3'],
    ['dist-1', 'acc-1'], ['dist-1', 'acc-2'],
    ['dist-2', 'acc-3'], ['dist-2', 'acc-4'], ['dist-2', 'acc-5'],
    ['dist-3', 'acc-5'], ['dist-3', 'acc-6'],
    ['acc-1', 'wap-1'], ['acc-2', 'wap-1'],
    ['acc-3', 'srv-1'], ['acc-4', 'srv-1'], ['acc-4', 'srv-2'], ['acc-5', 'srv-2'],
    ['acc-5', 'wap-2'], ['acc-6', 'wap-2'],
    ['dist-1', 'unk-1'],
  ];

  const nodeMap = Object.fromEntries(NODES.map(n => [n.id, n]));

  return (
    <svg viewBox="0 0 880 580" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        <pattern id="map-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0 L0 0 0 24" fill="none" stroke="rgba(14,114,160,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="880" height="580" fill="url(#map-grid)" />

      {/* edges */}
      {EDGES.map(([a, b], i) => {
        const A = nodeMap[a], B = nodeMap[b];
        const isHot = (a === 'acc-4' || b === 'acc-4');
        return (
          <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y}
                stroke={isHot && selectedId === 'acc-4' ? 'var(--topo-cyan)' : 'var(--topo-line-3)'}
                strokeWidth={isHot && selectedId === 'acc-4' ? '1.5' : '0.6'}
                opacity={isHot && selectedId === 'acc-4' ? 1 : 0.7} />
        );
      })}

      {/* nodes */}
      {NODES.map(n => {
        const Glyph = NodeGlyphs[n.glyph];
        const w = 70, h = 52;
        const stateColor = n.state === 'warn' ? 'var(--topo-warn)' : 'var(--topo-cyan)';
        return (
          <g key={n.id} transform={`translate(${n.x - w / 2}, ${n.y - h / 2})`}>
            {/* selection halo */}
            {n.selected && (
              <rect x="-6" y="-6" width={w + 12} height={h + 12} rx="3"
                    fill="none" stroke="var(--topo-cyan)" strokeWidth="2"
                    opacity="0.9" />
            )}
            {/* state ring */}
            <rect x="-2" y="-2" width={w + 4} height={h + 4} rx="2.5"
                  fill="none" stroke={stateColor} strokeWidth={n.selected ? '2' : '1.4'} />
            {/* compact glyph */}
            <svg width={w} height={h} viewBox="0 0 160 120" preserveAspectRatio="xMidYMid meet">
              <Glyph />
            </svg>
            {/* label */}
            <text x={w / 2} y={h + 11} textAnchor="middle"
                  fontFamily="var(--topo-font-mono)" fontSize="8.5"
                  fill={n.selected ? 'var(--topo-cyan-deep)' : 'var(--topo-ink-2)'}
                  fontWeight={n.selected ? '700' : '400'}>{n.short}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Frame 2: Single click → inspector card ───────────────────────────────────
function Frame_InspectorCard() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Frame_Map selectedId="acc-4" />
      {/* inspector card */}
      <div className="inspector-card" style={{ top: 200, right: 28 }}>
        <div className="ic-strip" />
        <div className="ic-hd">
          <div className="hn">lon-leaf-04.apex</div>
          <div className="meta">Arista 7050SX3-48 · LON-CORE · leaf · access</div>
        </div>
        <div className="ic-kv">
          <span className="k">state</span><span className="v" style={{ color: 'var(--topo-warn)' }}>● partial · drift</span>
          <span className="k">loopback</span><span className="v">10.20.4.24</span>
          <span className="k">uptime</span><span className="v">12 d</span>
          <span className="k">ports</span><span className="v">48 / 52 up</span>
          <span className="k">CPU · MEM</span><span className="v">31 % · 62 %</span>
          <span className="k">config</span><span className="v" style={{ color: 'var(--topo-warn)' }}>+4 lines drift</span>
        </div>
        <div className="ic-foot">
          <span className="btn">CLI</span>
          <span className="btn">Reconcile</span>
          <span className="btn primary">Inspect 3D ▸</span>
        </div>
      </div>
      {/* hint */}
      <div style={{
        position: 'absolute', left: 28, top: 28,
        fontFamily: 'var(--topo-font-mono)', fontSize: 10.5,
        color: 'var(--topo-ink-3)', letterSpacing: 0.4,
      }}>
        <b style={{ color: 'var(--topo-ink), fontWeight: 700' }}>SELECT</b> · single click · cyan focus ring · inspector docks right
      </div>
    </div>
  );
}

// ─── Frame 3: Double click → 2D-to-3D transition ─────────────────────────────
function Frame_Transition() {
  return (
    <svg viewBox="0 0 880 580" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="trans-grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0 L0 0 0 24" fill="none" stroke="rgba(14,114,160,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="880" height="580" fill="url(#trans-grid)" />

      {/* zoom motion lines — radiating from selected node */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const r1 = 60, r2 = 260;
        return (
          <line key={i}
                x1={440 + Math.cos(a) * r1} y1={290 + Math.sin(a) * r1}
                x2={440 + Math.cos(a) * r2} y2={290 + Math.sin(a) * r2}
                stroke="var(--topo-cyan)" strokeWidth="0.6" opacity="0.35"
                strokeDasharray="4 3" />
        );
      })}

      {/* ghost of map (faded) */}
      <g opacity="0.18" transform="translate(0, 0)">
        <Frame_Map selectedId={null} />
      </g>

      {/* growing chassis (intermediate scale) */}
      <g transform="translate(280, 180) scale(2.5)">
        {/* state ring */}
        <rect x="-3" y="-3" width="166" height="126" rx="3"
              fill="none" stroke="var(--topo-cyan)" strokeWidth="1.6" />
        <NodeGlyphs.access />
      </g>

      {/* corner reticle marks (transitioning to 3D inspection viewport) */}
      <g stroke="var(--topo-cyan)" strokeWidth="1.4" fill="none">
        <path d="M40 40 L40 70 M40 40 L70 40" />
        <path d="M840 40 L840 70 M840 40 L810 40" />
        <path d="M40 540 L40 510 M40 540 L70 540" />
        <path d="M840 540 L840 510 M840 540 L810 540" />
      </g>

      {/* hud label */}
      <g transform="translate(440, 70)" fontFamily="var(--topo-font-mono)"
         textAnchor="middle">
        <text fontSize="11" fill="var(--topo-cyan-deep)" letterSpacing="0.2"
              fontWeight="700">ENTERING HARDWARE INSPECTION</text>
        <text y="14" fontSize="9.5" fill="var(--topo-ink-3)" letterSpacing="0.1">
          lon-leaf-04.apex · 2D → 3D · 240 ms
        </text>
      </g>

      {/* scale indicator on left edge */}
      <g transform="translate(40, 290)" fontFamily="var(--topo-font-mono)"
         fontSize="9" fill="var(--topo-ink-3)">
        <line x1="0" y1="-80" x2="0" y2="80" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        {[-80, -40, 0, 40, 80].map((y, i) => (
          <g key={i}>
            <line x1="-3" y1={y} x2="3" y2={y} stroke="var(--topo-line-3)" strokeWidth="0.4" />
            <text x="8" y={y + 3}>{[' map', '', ' →', '', ' rack'][i]}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Frame 4: 3D inspection — orbit camera around chassis ────────────────────
function Frame_3DInspection() {
  return (
    <svg viewBox="0 0 880 580" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="3d-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0 L0 0 0 32" fill="none" stroke="rgba(14,114,160,0.06)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="880" height="580" fill="url(#3d-grid)" />

      {/* ground plane reference */}
      <g opacity="0.35">
        <line x1="80" y1="430" x2="800" y2="430" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i}
                x1={140 + i * 80} y1="430"
                x2={140 + i * 80 + 60} y2="370"
                stroke="var(--topo-line-4)" strokeWidth="0.4"
                strokeDasharray="3 3" />
        ))}
        <line x1="140" y1="370" x2="860" y2="370" stroke="var(--topo-line-3)" strokeWidth="0.4" strokeDasharray="3 3" />
      </g>

      {/* the chassis itself — 1U switch at hero scale */}
      <g transform="translate(180, 380) scale(2.2)">
        <Iso_1U />
      </g>

      {/* selection halo around chassis */}
      <g transform="translate(180, 380) scale(2.2)">
        <rect x="-8" y="-26" width="312" height="36" rx="2"
              fill="none" stroke="var(--topo-cyan)" strokeWidth="0.8" />
      </g>

      {/* orbit camera indicator (top-right) */}
      <g transform="translate(740, 110)" fontFamily="var(--topo-font-mono)"
         fontSize="9" fill="var(--topo-ink-3)">
        <circle cx="0" cy="0" r="40" fill="var(--topo-paper)" stroke="var(--topo-line-3)"
                strokeWidth="0.5" />
        <text x="0" y="-46" textAnchor="middle" fontFamily="var(--topo-font-stencil)"
              fontSize="9" fill="var(--topo-cyan-deep)" letterSpacing="0.15"
              fontWeight="700">CAMERA · ORBIT</text>
        {/* compass ticks */}
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          return (
            <line key={i}
                  x1={Math.cos(a) * 32} y1={Math.sin(a) * 32}
                  x2={Math.cos(a) * 38} y2={Math.sin(a) * 38}
                  stroke="var(--topo-line-3)" strokeWidth="0.5" />
          );
        })}
        {/* current camera vector */}
        <g transform="rotate(-30)">
          <line x1="0" y1="0" x2="32" y2="0" stroke="var(--topo-cyan)" strokeWidth="1.5" />
          <circle cx="32" cy="0" r="2.4" fill="var(--topo-cyan)" />
        </g>
        <circle cx="0" cy="0" r="2.2" fill="var(--topo-ink)" />
        <text x="0" y="56" textAnchor="middle">azim 330° · elev 22°</text>
      </g>

      {/* labels with extension lines */}
      <g fontFamily="var(--topo-font-mono)" fontSize="10" fill="var(--topo-ink-2)">
        <line x1="240" y1="306" x2="240" y2="200" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        <line x1="240" y1="200" x2="160" y2="200" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        <text x="156" y="197" textAnchor="end" fontWeight="700">
          chassis <tspan fill="var(--topo-ink-3)" fontWeight="400">[hover]</tspan>
        </text>

        <line x1="350" y1="338" x2="350" y2="240" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        <line x1="350" y1="240" x2="440" y2="240" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        <text x="444" y="237" fontWeight="700">
          port grid <tspan fill="var(--topo-ink-3)" fontWeight="400">[pickable]</tspan>
        </text>

        <line x1="560" y1="335" x2="560" y2="260" stroke="var(--topo-cyan)" strokeWidth="0.6" />
        <line x1="560" y1="260" x2="640" y2="260" stroke="var(--topo-cyan)" strokeWidth="0.6" />
        <text x="644" y="257" fontWeight="700" fill="var(--topo-cyan-deep)">
          SFP+ cage 50 <tspan fill="var(--topo-ink-3)" fontWeight="400">[clicked]</tspan>
        </text>

        <line x1="200" y1="340" x2="120" y2="340" stroke="var(--topo-line-3)" strokeWidth="0.4" />
        <text x="116" y="337" textAnchor="end" fontWeight="700">
          LED bank <tspan fill="var(--topo-ink-3)" fontWeight="400">[hover]</tspan>
        </text>
      </g>

      {/* HUD strip at bottom — keyboard hints */}
      <g transform="translate(80, 530)" fontFamily="var(--topo-font-mono)"
         fontSize="10" fill="var(--topo-ink-2)">
        <rect x="-6" y="-12" width="600" height="22" fill="rgba(250,252,253,0.85)"
              stroke="var(--topo-line-3)" strokeWidth="0.4" />
        <text x="2" y="3">
          <tspan fontWeight="700">LMB drag</tspan> orbit · <tspan fontWeight="700">RMB drag</tspan> pan · <tspan fontWeight="700">scroll</tspan> dolly · <tspan fontWeight="700">F</tspan> frame · <tspan fontWeight="700">Esc</tspan> back to map · <tspan fontWeight="700">click port</tspan> open detail
        </text>
      </g>
    </svg>
  );
}

// ─── Frame 5: Port click — port detail callout ───────────────────────────────
function Frame_PortDetail() {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Frame_3DInspection />
      {/* arrow from cage to callout */}
      <svg viewBox="0 0 880 580" width="100%" height="100%" preserveAspectRatio="xMidYMid meet"
           style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <g stroke="var(--topo-cyan)" strokeWidth="1.4" fill="none">
          {/* highlight ring on the clicked cage */}
          <circle cx="560" cy="335" r="14" />
          <line x1="572" y1="328" x2="650" y2="200" />
          <circle cx="572" cy="328" r="2.4" fill="var(--topo-cyan)" />
        </g>
      </svg>
      {/* port callout */}
      <div className="port-callout" style={{ left: 540, top: 80 }}>
        <div className="pc-strip" style={{ background: 'var(--topo-cyan)' }} />
        <div className="pc-hd">
          <span className="pid">Ethernet50 · SFP+</span>
          <span className="state" style={{ background: 'var(--topo-warn)', color: '#fff' }}>WARN</span>
        </div>
        <div className="pc-kv">
          <span className="k">slot</span><span className="v">cage B7 / lane 0</span>
          <span className="k">optic</span><span className="v">Arista SFP-10G-SR · 10 GBASE-SR</span>
          <span className="k">peer</span><span className="v">lon-spine-01 · Et49/1</span>
          <span className="k">link</span><span className="v">up · 10 G · FDX</span>
          <span className="k">pre-FEC BER</span><span className="v" style={{ color: 'var(--topo-warn)' }}>1.2 × 10⁻⁶</span>
          <span className="k">RX power</span><span className="v">−6.4 dBm</span>
          <span className="k">temp</span><span className="v">42 °C</span>
          <span className="k">uptime</span><span className="v">12 d</span>
        </div>
        <div style={{
          display: 'flex', gap: 6,
          padding: '8px 10px',
          borderTop: '1px solid var(--topo-line-4)',
        }}>
          <span className="btn" style={{
            flex: 1, padding: '4px 8px', fontSize: 10.5, textAlign: 'center',
            border: '1px solid var(--topo-line-3)', background: 'var(--topo-paper)',
          }}>Trace path</span>
          <span className="btn" style={{
            flex: 1, padding: '4px 8px', fontSize: 10.5, textAlign: 'center',
            background: 'var(--topo-cyan)', color: '#fff', fontWeight: 700,
          }}>Open in Diagnose ▸</span>
        </div>
      </div>
    </div>
  );
}

// ─── The storyboard sheet ────────────────────────────────────────────────────
function SheetStoryboard() {
  const FRAMES = [
    {
      step: 'STEP 01',
      title: 'Map view',
      input: <span><kbd>Topology</kbd> · default</span>,
      caption: (
        <span>
          <b>Topology map · 2D blueprint nodes.</b> Each glyph is the family symbol. State sits on the outer ring; selection is absent. Hover lifts a node 2 px and surfaces its hostname.
        </span>
      ),
      content: <Frame_Map selectedId={null} />,
    },
    {
      step: 'STEP 02',
      title: 'Single click · inspect card',
      input: <span>click · <kbd>↵</kbd> on focused</span>,
      caption: (
        <span>
          <b>Single click.</b> Cyan focus ring engages inside the state ring. A right-docked inspector card surfaces identity, drift, ports. Adjacent edges to other selected-affecting nodes brighten to cyan.
        </span>
      ),
      content: <Frame_InspectorCard />,
    },
    {
      step: 'STEP 03',
      title: 'Double click · 2D → 3D',
      input: <span>dbl-click · <kbd>↵ ↵</kbd></span>,
      caption: (
        <span>
          <b>Transition.</b> 240 ms zoom from map scale into the chassis primitive. Radial cyan lines + corner reticles signal viewport handoff. Camera is parked at azim 330° / elev 22°.
        </span>
      ),
      content: <Frame_Transition />,
    },
    {
      step: 'STEP 04',
      title: '3D inspection · orbit',
      input: <span><kbd>LMB</kbd> orbit · <kbd>scroll</kbd> dolly</span>,
      caption: (
        <span>
          <b>Hardware inspection.</b> Procedural primitive renders at 1:1 scale. Compass dial top-right shows live camera pose. Extension lines name pickable zones in plain language — chassis · port grid · LED bank.
        </span>
      ),
      content: <Frame_3DInspection />,
    },
    {
      step: 'STEP 05',
      title: 'Port click · detail callout',
      input: <span>click port · <kbd>↵</kbd></span>,
      caption: (
        <span>
          <b>Port detail.</b> Cyan ring on the clicked cage. Callout reads optic identity, peer, link quality, BER, RX power, temperature. Primary action routes the port into Diagnose with selection preserved.
        </span>
      ),
      content: <Frame_PortDetail />,
    },
  ];

  return (
    <div className="topo">
      <div className="topo-sheet">
        <header className="topo-sheet-head">
          <div className="ttl-block">
            <div className="sheet-no">
              <span>SHEET <b>IXN-01</b></span>
              <span>REV <b>A · 26.05.23</b></span>
              <span>FRAMES <b>5</b></span>
              <span>PROJ <b>ANTHRACITE / TOPO-DESK · INTERACTION</b></span>
            </div>
            <h1>Interaction Storyboard · Map → Inspect → Orbit → Port</h1>
            <div className="subtitle">
              The five frames an operator passes through to drill from the topology map down to a single optic. Map nodes are 2D blueprint glyphs (sheet 2D-01). 3D inspection renders the procedural primitives (sheet 3D-01). Cyan is the consistent signal across all five — selection, transition, callout strip.
            </div>
          </div>
          <div className="stamp">
            <div className="row"><span>DRWN</span><b>D.CLAUDE</b></div>
            <div className="row"><span>RUNTIME</span><b>BABYLON · CAM ORBIT</b></div>
            <div className="row"><span>ANIM</span><b>240 ms · EASE-OUT</b></div>
            <div className="row"><span>BACK</span><b>ESC · double Esc</b></div>
          </div>
        </header>

        <div className="topo-sheet-body">
          {/* Top row: frames 1, 2, 3 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, height: '46%', marginBottom: 14 }}>
            {FRAMES.slice(0, 3).map((f, i) => (
              <div key={i} className="story-frame">
                <div className="story-frame-hd">
                  <span className="step">{f.step}</span>
                  <span className="ttl">{f.title}</span>
                  <span className="input">{f.input}</span>
                </div>
                <div className="story-frame-bd">
                  {f.content}
                  <div className="story-frame-cap">{f.caption}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom row: frames 4, 5 (wider — the 3D moments) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, height: '46%' }}>
            {FRAMES.slice(3, 5).map((f, i) => (
              <div key={i} className="story-frame">
                <div className="story-frame-hd">
                  <span className="step">{f.step}</span>
                  <span className="ttl">{f.title}</span>
                  <span className="input">{f.input}</span>
                </div>
                <div className="story-frame-bd">
                  {f.content}
                  <div className="story-frame-cap">{f.caption}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <footer className="topo-sheet-foot">
          <span><b>SHEET IXN-01</b></span>
          <span className="sep" />
          <span>5 frames · map → inspect → 3D → port · cyan throughout</span>
          <span className="sep" />
          <span>back-out: <span className="mono">Esc</span> = step ‑1 · double <span className="mono">Esc</span> = return to map</span>
          <div className="grow" />
          <span>© ANTHRACITE — operator design, interaction-only spec</span>
        </footer>
      </div>
    </div>
  );
}

Object.assign(window, {
  Frame_Map, Frame_InspectorCard, Frame_Transition, Frame_3DInspection, Frame_PortDetail,
  SheetStoryboard,
});
