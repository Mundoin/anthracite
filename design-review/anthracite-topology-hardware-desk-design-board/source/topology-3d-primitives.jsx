// Topology Hardware Desk — 3D Hardware Primitive Sheet
// Six form-factor primitives, axonometric (cabinet projection, 30°, depth 0.5).
// Each shows: hero view · faceplate detail · procedural params · pickable zones.

// ─── Cabinet projection helpers ───────────────────────────────────────────────
const ISO_C = Math.cos(Math.PI / 6);   // 0.866
const ISO_S = Math.sin(Math.PI / 6);   // 0.5
const ISO_DS = 0.5;                    // cabinet depth scale (0.5 = half-scale)

function iso(x, y, z) {
  return { x: x + z * ISO_C * ISO_DS, y: -y - z * ISO_S * ISO_DS };
}
function pp(x, y, z) {
  const p = iso(x, y, z);
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

// Draw an axonometric box. Faces in order: top, right, front.
function IsoBox({ w, h, d, fill = 'var(--topo-paper)', stroke = 'var(--topo-line)', strokeWidth = 1.5, dashedSide, topPattern, hiddenEdges = true }) {
  return (
    <g>
      {/* hidden back edges — drawn first, dashed */}
      {hiddenEdges && (
        <g fill="none" stroke="var(--topo-line-4)" strokeWidth="0.4" strokeDasharray="2 2">
          <line {...lineProps(iso(0, 0, 0), iso(0, 0, d))} />
          <line {...lineProps(iso(w, 0, 0), iso(w, 0, d))} />
          <line {...lineProps(iso(0, 0, d), iso(w, 0, d))} />
        </g>
      )}
      {/* top face */}
      <polygon
        points={`${pp(0, h, 0)} ${pp(w, h, 0)} ${pp(w, h, d)} ${pp(0, h, d)}`}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth * 0.6}
        strokeDasharray={dashedSide ? '3 2' : '0'} />
      {/* right face */}
      <polygon
        points={`${pp(w, 0, 0)} ${pp(w, h, 0)} ${pp(w, h, d)} ${pp(w, 0, d)}`}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth * 0.6}
        strokeDasharray={dashedSide ? '3 2' : '0'} />
      {/* front face */}
      <polygon
        points={`${pp(0, 0, 0)} ${pp(w, 0, 0)} ${pp(w, h, 0)} ${pp(0, h, 0)}`}
        fill={fill} stroke={stroke} strokeWidth={strokeWidth}
        strokeDasharray={dashedSide ? '3 2' : '0'} />
      {/* top pattern (vent slots) */}
      {topPattern && (
        <g fill="none" stroke="var(--topo-line-3)" strokeWidth="0.4">
          {Array.from({ length: Math.floor(d / 8) }, (_, i) => {
            const z = 8 + i * 8;
            if (z > d - 8) return null;
            return (
              <line key={i}
                    {...lineProps(iso(8, h + 0.01, z), iso(w - 8, h + 0.01, z))} />
            );
          })}
        </g>
      )}
    </g>
  );
}
function lineProps(a, b) { return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; }

// ─── Front-face decoration ────────────────────────────────────────────────────
// All faceplate drawings are placed inside a <g transform="translate(0,-h)">
// — origin moves to front-face top-left; thereafter y increases downward (normal SVG).
function FrontFace({ h, children }) {
  return <g transform={`translate(0, ${-h})`}>{children}</g>;
}

// A row of RJ45 jacks in the dark fascia style: dark slot with paired pin marks.
function RJ45Row({ x, y, n, pitchX = 5, slotW = 4, slotH = 6, live }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const px = x + i * pitchX;
        const isLive = live && live(i);
        return (
          <g key={i}>
            <rect x={px} y={y} width={slotW} height={slotH} fill="var(--topo-fill-port)" />
            {/* pin mark inside cavity */}
            <rect x={px + 1} y={y + 1.5} width={slotW - 2} height={1} fill="var(--topo-line-2)" />
            {/* tiny LED above */}
            <rect x={px} y={y - 1.5} width={slotW} height={1} fill={isLive ? 'var(--topo-cyan)' : 'var(--topo-line-3)'} />
          </g>
        );
      })}
    </g>
  );
}

// SFP+ cage row — wider, deeper. Cage stacked: top half above shelf, bottom half below.
function SfpCageRow({ x, y, n, pitchX = 12, slotW = 10, slotH = 10, stacked, live }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const px = x + i * pitchX;
        const isLive = live && live(i);
        return (
          <g key={i}>
            <rect x={px} y={y} width={slotW} height={slotH} fill="var(--topo-fill-bay)" />
            <rect x={px + 0.5} y={y + 0.5} width={slotW - 1} height={slotH - 1}
                  fill="none" stroke="var(--topo-line-3)" strokeWidth="0.35" />
            {stacked && (
              <line x1={px} y1={y + slotH / 2} x2={px + slotW} y2={y + slotH / 2}
                    stroke="var(--topo-line-3)" strokeWidth="0.4" />
            )}
            <rect x={px + slotW * 0.25} y={y + slotH + 1} width={slotW * 0.5} height={1}
                  fill={isLive ? 'var(--topo-cyan)' : 'var(--topo-line-3)'} />
          </g>
        );
      })}
    </g>
  );
}

// QSFP28 cage row — bigger square cages
function QsfpCageRow({ x, y, n, pitchX = 16, slotW = 14, slotH = 12, live }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const px = x + i * pitchX;
        const isLive = live && live(i);
        return (
          <g key={i}>
            <rect x={px} y={y} width={slotW} height={slotH} fill="var(--topo-fill-bay)" />
            <rect x={px + 0.6} y={y + 0.6} width={slotW - 1.2} height={slotH - 1.2}
                  fill="none" stroke="var(--topo-line-3)" strokeWidth="0.35" />
            {/* lane indicators inside cage */}
            <g stroke="var(--topo-line-3)" strokeWidth="0.3">
              {[0.25, 0.5, 0.75].map(t => (
                <line key={t} x1={px} y1={y + slotH * t} x2={px + slotW} y2={y + slotH * t} />
              ))}
            </g>
            <rect x={px + slotW * 0.2} y={y + slotH + 1} width={slotW * 0.6} height={1.2}
                  fill={isLive ? 'var(--topo-cyan)' : 'var(--topo-line-3)'} />
          </g>
        );
      })}
    </g>
  );
}

// LED bank on faceplate — labeled column
function LedBank({ x, y, labels, lit = [] }) {
  return (
    <g fontFamily="var(--topo-font-mono)" fontSize="2.2" fill="var(--topo-ink-3)">
      {labels.map((lbl, i) => {
        const cy = y + i * 3;
        return (
          <g key={lbl}>
            <circle cx={x} cy={cy} r="1" fill={lit[i] || 'var(--topo-deferred)'} />
            <text x={x + 2.5} y={cy + 0.8}>{lbl}</text>
          </g>
        );
      })}
    </g>
  );
}

// Generic vent strip — drawn on top face (called inside top face)
function TopVent({ x1, x2, z, n = 5, dz = 2 }) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const zz = z + i * dz;
    const a = iso(x1, undefined, zz);   // we pass undefined and project externally; use full call
    out.push(
      <line key={i}
            x1={iso(x1, 0.01, zz).x} y1={iso(x1, 0.01, zz).y - 0}
            x2={iso(x2, 0.01, zz).x} y2={iso(x2, 0.01, zz).y - 0}
            stroke="var(--topo-line-3)" strokeWidth="0.4" />
    );
  }
  return <g>{out}</g>;
}

// ─── PRIMITIVE 1 · 1U fixed switch ────────────────────────────────────────────
function Iso_1U() {
  const w = 240, h = 18, d = 120;
  return (
    <g>
      <IsoBox w={w} h={h} d={d} topPattern />
      <FrontFace h={h}>
        {/* fascia divider */}
        <line x1="0" y1="2.5" x2={w} y2="2.5" stroke="var(--topo-line-2)" strokeWidth="0.35" />
        <line x1="0" y1={h - 2} x2={w} y2={h - 2} stroke="var(--topo-line-2)" strokeWidth="0.35" />
        {/* vendor / model strip */}
        <text x="6" y="2" fontFamily="var(--topo-font-stencil)" fontSize="1.6"
              fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXS-148-G</text>
        {/* LED bank */}
        <LedBank x="6" y="5" labels={['SYS', 'FAN', 'PSU', 'MGMT']}
                 lit={['var(--topo-ok)', 'var(--topo-ok)', 'var(--topo-warn)', 'var(--topo-ok)']} />
        {/* 48 × RJ45 — 24 cols × 2 rows */}
        <RJ45Row x="32" y="5"  n={24} pitchX={5.5} slotW={4} slotH={4}
                 live={(i) => [3, 11, 18].includes(i)} />
        <RJ45Row x="32" y="11" n={24} pitchX={5.5} slotW={4} slotH={4}
                 live={(i) => [1, 7, 22].includes(i)} />
        {/* 4 × SFP+ uplinks */}
        <SfpCageRow x={170} y="4" n={4} pitchX={11} slotW={9} slotH={5}
                    live={(i) => i === 0 || i === 2} />
        <text x="170" y="14" fontFamily="var(--topo-font-mono)" fontSize="1.7"
              fill="var(--topo-ink-3)">SFP+  49-52</text>
        {/* console + mgmt */}
        <rect x={w - 24} y="4" width="6" height="4" fill="var(--topo-fill-port)" />
        <rect x={w - 16} y="4" width="6" height="4" fill="var(--topo-fill-port)" />
        <text x={w - 24} y="14" fontFamily="var(--topo-font-mono)" fontSize="1.7"
              fill="var(--topo-ink-3)">CONS  MGMT</text>
      </FrontFace>
      {/* PSU vent on right face */}
      <g>
        {Array.from({ length: 4 }, (_, i) => {
          const yy = 3 + i * 3;
          return (
            <line key={i}
                  {...lineProps(iso(w, yy, 6), iso(w, yy, d - 6))}
                  stroke="var(--topo-line-3)" strokeWidth="0.35" />
          );
        })}
      </g>
    </g>
  );
}

// ─── PRIMITIVE 2 · 2U router/firewall appliance ───────────────────────────────
function Iso_2U() {
  const w = 240, h = 36, d = 160;
  return (
    <g>
      <IsoBox w={w} h={h} d={d} topPattern />
      <FrontFace h={h}>
        <line x1="0" y1="3" x2={w} y2="3" stroke="var(--topo-line-2)" strokeWidth="0.35" />
        <line x1="0" y1={h - 3} x2={w} y2={h - 3} stroke="var(--topo-line-2)" strokeWidth="0.35" />
        <text x="6" y="2.4" fontFamily="var(--topo-font-stencil)" fontSize="1.8"
              fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXR-200-2U</text>
        {/* LCD module */}
        <rect x="6" y="6" width="34" height="14" fill="var(--topo-cyan-soft)"
              stroke="var(--topo-cyan)" strokeWidth="0.6" />
        <text x="9" y="11" fontFamily="var(--topo-font-mono)" fontSize="2"
              fill="var(--topo-cyan-deep)">apex-prod-emea</text>
        <text x="9" y="14" fontFamily="var(--topo-font-mono)" fontSize="1.7"
              fill="var(--topo-ink-3)">CPU 14% · 4 peers up</text>
        <text x="9" y="17" fontFamily="var(--topo-font-mono)" fontSize="1.6"
              fill="var(--topo-ink-3)">{'>'}</text>
        {/* LED bank */}
        <LedBank x="6" y="22" labels={['SYS', 'HA', 'TUN', 'IDS']}
                 lit={['var(--topo-ok)', 'var(--topo-ok)', 'var(--topo-ok)', 'var(--topo-warn)']} />
        {/* 8× SFP+ — center */}
        <SfpCageRow x={48} y="6" n={8} pitchX={11} slotW={9} slotH={9}
                    stacked live={(i) => i === 0 || i === 3 || i === 7} />
        <text x={48} y="20" fontFamily="var(--topo-font-mono)" fontSize="1.8"
              fill="var(--topo-ink-3)">SFP+  1-8</text>
        {/* 4× QSFP28 */}
        <QsfpCageRow x={140} y="6" n={4} pitchX={15} slotW={13} slotH={10}
                     live={(i) => i === 0 || i === 1} />
        <text x={140} y="20" fontFamily="var(--topo-font-mono)" fontSize="1.8"
              fill="var(--topo-ink-3)">QSFP28  9-12</text>
        {/* RJ45 cluster (mgmt + 4× 1G) — right */}
        <RJ45Row x={208} y="6" n={5} pitchX={5.5} slotW={4} slotH={5}
                 live={(i) => i === 0} />
        <text x={208} y="14" fontFamily="var(--topo-font-mono)" fontSize="1.7"
              fill="var(--topo-ink-3)">M · 1-4</text>
        {/* console */}
        <rect x={w - 18} y="22" width="6" height="5" fill="var(--topo-fill-port)" />
        <text x={w - 18} y="32" fontFamily="var(--topo-font-mono)" fontSize="1.7"
              fill="var(--topo-ink-3)">CONS</text>
      </FrontFace>
    </g>
  );
}

// ─── PRIMITIVE 3 · 4U modular chassis ─────────────────────────────────────────
function Iso_4U() {
  const w = 260, h = 72, d = 180;
  return (
    <g>
      <IsoBox w={w} h={h} d={d} topPattern />
      <FrontFace h={h}>
        <text x="6" y="2.5" fontFamily="var(--topo-font-stencil)" fontSize="1.8"
              fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXC-4U-MOD</text>
        {/* 4 horizontal bays — 17px tall each, offset by 1 for divider */}
        {[0, 1, 2, 3].map(b => {
          const by = 4 + b * 16.5;
          return (
            <g key={b}>
              {/* bay outline */}
              <rect x="4" y={by} width={w - 8} height={15} fill="var(--topo-paper-sunken)"
                    stroke="var(--topo-line-2)" strokeWidth="0.5" />
              {/* bay label */}
              <text x="6" y={by + 4} fontFamily="var(--topo-font-mono)" fontSize="1.6"
                    fill="var(--topo-ink-3)">LC{b + 1}</text>
              {/* contents per bay */}
              {b === 0 && (
                <g>
                  <RJ45Row x={24} y={by + 4} n={24} pitchX={5} slotW={4} slotH={4}
                           live={(i) => [3, 9, 17].includes(i)} />
                  <RJ45Row x={24} y={by + 9} n={24} pitchX={5} slotW={4} slotH={4} />
                  <SfpCageRow x={170} y={by + 4} n={4} pitchX={11} slotW={9} slotH={5} />
                </g>
              )}
              {b === 1 && (
                <g>
                  <QsfpCageRow x={24} y={by + 2} n={6} pitchX={15} slotW={13} slotH={10}
                               live={(i) => i === 1 || i === 4} />
                  <text x={24} y={by + 15} fontFamily="var(--topo-font-mono)" fontSize="1.6"
                        fill="var(--topo-ink-3)">6× QSFP28</text>
                </g>
              )}
              {b === 2 && (
                <g>
                  <rect x="24" y={by + 4} width={w - 50} height={7}
                        fill="none" stroke="var(--topo-line-3)" strokeWidth="0.4"
                        strokeDasharray="3 2" />
                  <text x={(w / 2)} y={by + 9} textAnchor="middle"
                        fontFamily="var(--topo-font-mono)" fontSize="2"
                        fill="var(--topo-ink-4)">— EMPTY BAY —</text>
                </g>
              )}
              {b === 3 && (
                <g>
                  {/* supervisor / RP card */}
                  <rect x="24" y={by + 2} width={w - 36} height={11}
                        fill="var(--topo-cyan-soft)" stroke="var(--topo-cyan)" strokeWidth="0.5" />
                  <text x="28" y={by + 6} fontFamily="var(--topo-font-stencil)" fontSize="1.8"
                        fill="var(--topo-cyan-deep)" letterSpacing="0.1">SUPERVISOR · RP-A · ACTIVE</text>
                  <LedBank x={w - 60} y={by + 5} labels={['ACT', 'STBY', 'CON']}
                           lit={['var(--topo-ok)', 'var(--topo-deferred)', 'var(--topo-cyan)']} />
                </g>
              )}
            </g>
          );
        })}
      </FrontFace>
      {/* PSU bays on right face */}
      <g>
        {Array.from({ length: 6 }, (_, i) => (
          <line key={i}
                {...lineProps(iso(w, 8 + i * 9, 6), iso(w, 8 + i * 9, d - 6))}
                stroke="var(--topo-line-3)" strokeWidth="0.35" />
        ))}
      </g>
    </g>
  );
}

// ─── PRIMITIVE 4 · Blade / datacenter chassis ─────────────────────────────────
function Iso_Blade() {
  const w = 280, h = 180, d = 200;
  return (
    <g>
      <IsoBox w={w} h={h} d={d} topPattern />
      <FrontFace h={h}>
        {/* header strip */}
        <rect x="0" y="0" width={w} height="10" fill="var(--topo-paper-sunken)"
              stroke="var(--topo-line-2)" strokeWidth="0.4" />
        <text x="8" y="7" fontFamily="var(--topo-font-stencil)" fontSize="3.6"
              fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXB-10U  BLADE CHASSIS</text>
        <LedBank x={w - 60} y="3" labels={['SYS', 'POW', 'FAN']}
                 lit={['var(--topo-ok)', 'var(--topo-ok)', 'var(--topo-ok)']} />
        {/* 8 vertical blade slots */}
        {Array.from({ length: 8 }, (_, b) => {
          const bx = 6 + b * ((w - 12 - 50) / 8);
          const bw = (w - 12 - 50) / 8 - 1.5;
          const populated = b !== 3 && b !== 6;
          return (
            <g key={b}>
              <rect x={bx} y="14" width={bw} height={130}
                    fill={populated ? 'var(--topo-paper)' : 'var(--topo-paper-sunken)'}
                    stroke="var(--topo-line-2)" strokeWidth="0.5"
                    strokeDasharray={populated ? '0' : '3 2'} />
              {/* blade label vertical */}
              <text x={bx + bw / 2} y="20" textAnchor="middle"
                    fontFamily="var(--topo-font-mono)" fontSize="2"
                    fill="var(--topo-ink-3)">B{b + 1}</text>
              {populated ? (
                <g>
                  {/* drive bays */}
                  {Array.from({ length: 4 }, (_, i) => (
                    <rect key={i} x={bx + bw * 0.2} y={24 + i * 6}
                          width={bw * 0.6} height="4.5"
                          fill="var(--topo-fill-bay)" />
                  ))}
                  {/* NIC ports */}
                  <rect x={bx + bw * 0.15} y="56" width={bw * 0.32} height="6"
                        fill="var(--topo-fill-port)" />
                  <rect x={bx + bw * 0.53} y="56" width={bw * 0.32} height="6"
                        fill="var(--topo-fill-port)" />
                  {/* LED row */}
                  <g>
                    {[0, 1, 2].map(i => (
                      <circle key={i} cx={bx + bw * (0.25 + i * 0.25)} cy="68" r="1"
                              fill={i === 0 ? 'var(--topo-ok)' : i === 1 ? 'var(--topo-ok)' : (b === 5 ? 'var(--topo-warn)' : 'var(--topo-ok)')} />
                    ))}
                  </g>
                  {/* hostname */}
                  <text x={bx + bw / 2} y="78" textAnchor="middle"
                        fontFamily="var(--topo-font-mono)" fontSize="1.6"
                        fill="var(--topo-ink-3)">esx-{['fr', 'lo', 'fr', '—', 'am', 'fr', '—', 'lo'][b]}-{b + 1}</text>
                  {/* drive activity strip */}
                  <rect x={bx + bw * 0.2} y="84" width={bw * 0.6} height="2.5"
                        fill="var(--topo-paper-sunken)" stroke="var(--topo-line-3)" strokeWidth="0.3" />
                  <rect x={bx + bw * 0.2} y="84" width={bw * 0.4} height="2.5"
                        fill="var(--topo-cyan)" />
                  {/* mgmt port */}
                  <rect x={bx + bw * 0.35} y="92" width={bw * 0.3} height="5"
                        fill="var(--topo-fill-port)" />
                  {/* eject latch */}
                  <rect x={bx + bw * 0.4} y="124" width={bw * 0.2} height="4"
                        fill="none" stroke="var(--topo-line-2)" strokeWidth="0.5" />
                </g>
              ) : (
                <text x={bx + bw / 2} y="78" textAnchor="middle"
                      fontFamily="var(--topo-font-mono)" fontSize="2"
                      fill="var(--topo-ink-4)">EMPTY</text>
              )}
            </g>
          );
        })}
        {/* fabric / interconnect strip on right */}
        <rect x={w - 44} y="14" width="36" height="130"
              fill="var(--topo-cyan-soft)" stroke="var(--topo-cyan)" strokeWidth="0.5" />
        <text x={w - 26} y="22" textAnchor="middle" fontFamily="var(--topo-font-stencil)"
              fontSize="2.5" fill="var(--topo-cyan-deep)" letterSpacing="0.15">FABRIC IM</text>
        <QsfpCageRow x={w - 40} y="30" n={2} pitchX={16} slotW={14} slotH={11}
                     live={() => true} />
        <QsfpCageRow x={w - 40} y="46" n={2} pitchX={16} slotW={14} slotH={11}
                     live={() => true} />
        <text x={w - 26} y="142" textAnchor="middle" fontFamily="var(--topo-font-mono)"
              fontSize="1.6" fill="var(--topo-ink-3)">4× 100G UP</text>
        {/* bottom: PSU + fan bays */}
        <g>
          {[0, 1, 2, 3].map(i => (
            <g key={i}>
              <rect x={6 + i * ((w - 12) / 4 - 0)} y={h - 28}
                    width={(w - 12) / 4 - 4} height="12"
                    fill="var(--topo-paper-sunken)"
                    stroke="var(--topo-line-2)" strokeWidth="0.4" />
              <text x={6 + i * ((w - 12) / 4) + ((w - 12) / 4 - 4) / 2} y={h - 21}
                    textAnchor="middle" fontFamily="var(--topo-font-mono)"
                    fontSize="2.2" fill="var(--topo-ink-3)">PSU·{i + 1}</text>
            </g>
          ))}
        </g>
      </FrontFace>
    </g>
  );
}

// ─── PRIMITIVE 5 · Virtual appliance ──────────────────────────────────────────
function Iso_Virtual() {
  const w = 240, h = 30, d = 130;
  return (
    <g>
      {/* hypervisor base plate underneath — drawn first */}
      <g>
        {/* base plate is a flat slab at y=-4 */}
        <polygon
          points={`${pp(-12, -2, -10)} ${pp(w + 12, -2, -10)} ${pp(w + 12, -2, d + 10)} ${pp(-12, -2, d + 10)}`}
          fill="var(--topo-paper-sunken)" stroke="var(--topo-line-3)" strokeWidth="0.4"
          strokeDasharray="0" />
        <text {...textIso(w / 2, -1, d + 4)} textAnchor="middle"
              fontFamily="var(--topo-font-mono)" fontSize="2.4"
              fill="var(--topo-ink-3)">HOST · esx-fra-04 · ESXi 8.0U2</text>
      </g>
      {/* virtual chassis itself — all dashed strokes */}
      <IsoBox w={w} h={h} d={d} dashedSide
              stroke="var(--topo-cyan)" strokeWidth={1.4}
              fill="rgba(211,230,238,0.42)" hiddenEdges={false} />
      <FrontFace h={h}>
        {/* dashed faceplate */}
        <rect x="0" y="0" width={w} height={h} fill="none"
              stroke="var(--topo-cyan)" strokeWidth="0.6" strokeDasharray="3 2" />
        <text x="6" y="4" fontFamily="var(--topo-font-stencil)" fontSize="2.2"
              fill="var(--topo-ink)" letterSpacing="0.2">VIRTUAL  v-RT-01  ALLOC 4 vCPU / 8G</text>
        {/* virtual NICs — dashed cages */}
        <g>
          {Array.from({ length: 6 }, (_, i) => {
            const x = 12 + i * 16;
            return (
              <g key={i}>
                <rect x={x} y="9" width="13" height="9" fill="none"
                      stroke="var(--topo-cyan)" strokeWidth="0.5" strokeDasharray="2 1.5" />
                <text x={x + 6.5} y="14.5" textAnchor="middle"
                      fontFamily="var(--topo-font-mono)" fontSize="1.7"
                      fill="var(--topo-ink-2)">vNIC{i}</text>
                <rect x={x + 2} y="21" width="9" height="1"
                      fill={i < 4 ? 'var(--topo-cyan)' : 'var(--topo-line-3)'} />
              </g>
            );
          })}
        </g>
        {/* abstract status — no real LEDs */}
        <g transform="translate(6, 22)">
          <rect x="0" y="0" width="48" height="4" fill="none"
                stroke="var(--topo-cyan)" strokeWidth="0.4" strokeDasharray="2 1.5" />
          <rect x="0" y="0" width="36" height="4" fill="var(--topo-cyan-soft)" />
          <text x="0" y="9" fontFamily="var(--topo-font-mono)" fontSize="1.7"
                fill="var(--topo-ink-3)">CPU 74%</text>
        </g>
        {/* container badge */}
        <g transform={`translate(${w - 60}, 22)`}>
          <text fontFamily="var(--topo-font-mono)" fontSize="1.8"
                fill="var(--topo-ink-2)">VIRT · K8S NETWORK NODE</text>
        </g>
      </FrontFace>
    </g>
  );
}
function textIso(x, y, z) {
  const p = iso(x, y, z);
  return { x: p.x, y: p.y };
}

// ─── PRIMITIVE 6 · SFP / QSFP module cartridge ────────────────────────────────
// Drawn at much larger scale than chassis — this is a PART, shown alongside its dock.
function Iso_SfpModule() {
  // SFP+ module: 13.5 × 8.5 × 56 mm — we scale up
  const w = 48, h = 11, d = 84;
  // QSFP28 module: 18.35 × 13 × 72 mm
  const qw = 60, qh = 16, qd = 102;

  return (
    <g>
      {/* SFP+ on left */}
      <g transform="translate(0, 0)">
        {/* fiber tail */}
        <g>
          <path d={`M ${iso(0, h / 2, 0).x},${iso(0, h / 2, 0).y}
                    C ${iso(-30, h / 2, 0).x},${iso(-30, h / 2, 0).y - 10}
                    ${iso(-50, h / 2, 0).x},${iso(-50, h / 2, 0).y - 24}
                    ${iso(-72, h / 2, 0).x},${iso(-72, h / 2, 0).y - 18}`}
                fill="none" stroke="var(--topo-cyan)" strokeWidth="1.4" />
          <circle cx={iso(-72, h / 2, 0).x} cy={iso(-72, h / 2, 0).y - 18}
                  r="2.4" fill="var(--topo-cyan)" />
          <text x={iso(-72, h / 2, 0).x - 12} y={iso(-72, h / 2, 0).y - 26}
                fontFamily="var(--topo-font-mono)" fontSize="3"
                fill="var(--topo-ink-3)">LC/UPC duplex</text>
        </g>
        {/* module body */}
        <IsoBox w={w} h={h} d={d} fill="var(--topo-paper)" stroke="var(--topo-line)"
                strokeWidth={1.4} />
        {/* latch handle (bail) on front */}
        <FrontFace h={h}>
          <rect x="4" y="2" width={w - 8} height="3" fill="none"
                stroke="var(--topo-line-2)" strokeWidth="0.5" rx="0.4" />
          <text x={w / 2} y="9" textAnchor="middle"
                fontFamily="var(--topo-font-stencil)" fontSize="3"
                fill="var(--topo-ink)" letterSpacing="0.2">SFP+ 10G</text>
        </FrontFace>
        {/* edge connector hint at back */}
        <g>
          <line {...lineProps(iso(2, 2, d), iso(w - 2, 2, d))}
                stroke="var(--topo-line-3)" strokeWidth="0.5" />
          <line {...lineProps(iso(2, h - 2, d), iso(w - 2, h - 2, d))}
                stroke="var(--topo-line-3)" strokeWidth="0.5" />
        </g>
        {/* annotation */}
        <text x={iso(w / 2, h, d / 2).x} y={iso(w / 2, h + 10, d / 2).y + 16}
              textAnchor="middle"
              fontFamily="var(--topo-font-mono)" fontSize="3"
              fill="var(--topo-ink-2)">SFP+ · 13.4 × 8.5 × 56 mm</text>
      </g>

      {/* QSFP28 on right */}
      <g transform="translate(180, -30)">
        <IsoBox w={qw} h={qh} d={qd} fill="var(--topo-paper)" stroke="var(--topo-line)"
                strokeWidth={1.4} />
        <FrontFace h={qh}>
          {/* pull tab */}
          <rect x="2" y="2.5" width={qw - 4} height="3.5" fill="none"
                stroke="var(--topo-cyan)" strokeWidth="0.6" rx="0.4" />
          <line x1={qw - 4} y1="4" x2={qw + 6} y2="4" stroke="var(--topo-cyan)" strokeWidth="0.6" />
          <text x={qw / 2} y="12" textAnchor="middle"
                fontFamily="var(--topo-font-stencil)" fontSize="3.5"
                fill="var(--topo-ink)" letterSpacing="0.2">QSFP28  100G</text>
          {/* 4 lanes visible on top */}
        </FrontFace>
        <text x={iso(qw / 2, qh, qd / 2).x} y={iso(qw / 2, qh + 10, qd / 2).y + 22}
              textAnchor="middle"
              fontFamily="var(--topo-font-mono)" fontSize="3"
              fill="var(--topo-ink-2)">QSFP28 · 18.4 × 13 × 72 mm</text>
      </g>

      {/* dock — show cage half-inserted (right) */}
      <g transform="translate(300, 60)">
        <text fontFamily="var(--topo-font-mono)" fontSize="3"
              fill="var(--topo-ink-3)" x="0" y="-12">DOCKED · CAGE B7</text>
        {/* host cage */}
        <rect x="0" y="0" width="80" height="20" fill="var(--topo-fill-bay)" />
        <rect x="0.8" y="0.8" width="78.4" height="18.4" fill="none"
              stroke="var(--topo-line-3)" strokeWidth="0.5" />
        {/* lane dividers in cage */}
        {[5, 10, 15].map(yy => (
          <line key={yy} x1="0" y1={yy} x2="80" y2={yy}
                stroke="var(--topo-line-3)" strokeWidth="0.3" />
        ))}
        {/* module half-inserted */}
        <rect x="-22" y="2.5" width="46" height="15"
              fill="var(--topo-paper)" stroke="var(--topo-line)" strokeWidth="1.2" />
        <text x="-19" y="13" fontFamily="var(--topo-font-stencil)" fontSize="3.5"
              fill="var(--topo-ink)" letterSpacing="0.2">SFP+</text>
        <line x1="-22" y1="10" x2="-32" y2="14" stroke="var(--topo-cyan)" strokeWidth="1.6" />
        <line x1="-32" y1="14" x2="-46" y2="6" stroke="var(--topo-cyan)" strokeWidth="1.6" />
      </g>
    </g>
  );
}

// ─── Clickable-zone overlay ───────────────────────────────────────────────────
// Shows the pickable regions OCC must implement on the 3D primitive.
function ClickZoneSwatch({ label, count }) {
  const COLORS = {
    chassis: 'rgba(85,112,130,0.35)',
    port:    'rgba(14,114,160,0.55)',
    bay:     'rgba(199,122,14,0.55)',
    module:  'rgba(122,42,58,0.55)',
    led:     'rgba(44,132,86,0.55)',
    psu:     'rgba(184,51,51,0.45)',
    fan:     'rgba(122,138,149,0.45)',
    blade:   'rgba(14,30,44,0.45)',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-block', width: 12, height: 12,
                     background: COLORS[label], border: '1px solid var(--topo-line-3)' }} />
      <span style={{ fontFamily: 'var(--topo-font-mono)', fontSize: 9.5,
                     color: 'var(--topo-ink-2)' }}>
        {label.toUpperCase()} <span style={{ color: 'var(--topo-ink-4)' }}>· {count}</span>
      </span>
    </div>
  );
}

// ─── Primitive cell ───────────────────────────────────────────────────────────
function PrimitiveCell({ no, name, slug, spec, IsoView, faceplate, paramRows, zones, viewBox, dimensions }) {
  return (
    <div className="topo-cell">
      <span className="cell-no">{no}</span>
      <div className="cell-hd">
        <span className="name">{name}</span>
        <span className="slug">[{slug}]</span>
        <span className="spec">{spec}</span>
      </div>

      {/* HERO axonometric view */}
      <div className="cell-bd" style={{ minHeight: 220, padding: '8px', background: 'var(--topo-paper)' }}>
        <svg viewBox={viewBox} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          {/* construction reference — ground plane line */}
          <line x1="-200" y1="0" x2="600" y2="0" stroke="var(--topo-line-4)" strokeWidth="0.4" />
          {/* dimension annotation */}
          {dimensions && (
            <g fontFamily="var(--topo-font-mono)" fontSize="3" fill="var(--topo-ink-3)">
              {dimensions.map((d, i) => (
                <g key={i}>
                  <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2}
                        stroke="var(--topo-line-3)" strokeWidth="0.4" />
                  <text x={d.tx} y={d.ty} textAnchor={d.anchor || 'middle'}>{d.label}</text>
                </g>
              ))}
            </g>
          )}
          {/* axes legend (top-right of svg) */}
          <g transform="translate(530, -120)">
            <g fontFamily="var(--topo-font-mono)" fontSize="3" fill="var(--topo-ink-3)">
              <line x1="0" y1="0" x2="14" y2="0" stroke="var(--topo-line-2)" strokeWidth="0.6" />
              <text x="16" y="1">W (width)</text>
              <line x1="0" y1="0" x2="0" y2="-14" stroke="var(--topo-line-2)" strokeWidth="0.6" />
              <text x="2" y="-16">H (U)</text>
              <line x1="0" y1="0" x2={ISO_C * ISO_DS * 28} y2={-ISO_S * ISO_DS * 28}
                    stroke="var(--topo-line-2)" strokeWidth="0.6" />
              <text x={ISO_C * ISO_DS * 28 + 2} y={-ISO_S * ISO_DS * 28}>D (depth × 0.5)</text>
            </g>
          </g>
          {IsoView}
        </svg>
      </div>

      {/* Bottom: 3-column split (faceplate · params · zones) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr', gap: 10, marginTop: 4 }}>
        {/* faceplate detail */}
        <div>
          <div className="nano" style={{ marginBottom: 2 }}>A · Faceplate detail (front, flat)</div>
          <div style={{
            border: '1px solid var(--topo-line-4)',
            background: 'var(--topo-paper)',
            padding: 4, height: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {faceplate}
          </div>
        </div>
        {/* procedural params */}
        <div>
          <div className="nano" style={{ marginBottom: 2 }}>B · Procedural parameters</div>
          <div style={{
            border: '1px solid var(--topo-line-4)',
            background: 'var(--topo-paper)',
            padding: '6px 8px', height: 80,
            fontFamily: 'var(--topo-font-mono)', fontSize: 9.5,
            color: 'var(--topo-ink-2)',
            lineHeight: 1.4,
            overflow: 'hidden',
          }}>
            {paramRows.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--topo-ink-3)' }}>{r[0]}</span>
                <span style={{ color: 'var(--topo-ink)' }}>{r[1]}</span>
              </div>
            ))}
          </div>
        </div>
        {/* clickable zones */}
        <div>
          <div className="nano" style={{ marginBottom: 2 }}>C · Pickable zones</div>
          <div style={{
            border: '1px solid var(--topo-line-4)',
            background: 'var(--topo-paper)',
            padding: '6px 8px', height: 80,
            display: 'flex', flexDirection: 'column', gap: 3,
            overflow: 'hidden',
          }}>
            {zones.map((z, i) => <ClickZoneSwatch key={i} label={z[0]} count={z[1]} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Faceplate detail SVGs (flat, in-plane) ───────────────────────────────────
const Faceplate_1U = (
  <svg viewBox="0 0 240 22" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="0.5" y="2" width="239" height="18" fill="var(--topo-paper-sunken)"
          stroke="var(--topo-line)" strokeWidth="0.8" />
    <text x="6" y="6" fontFamily="var(--topo-font-stencil)" fontSize="2.2"
          fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXS-148-G  ·  1U  ·  48× 1G + 4× 10G</text>
    <LedBank x="6" y="9" labels={['SYS', 'FAN', 'PSU', 'MGMT']}
             lit={['var(--topo-ok)', 'var(--topo-ok)', 'var(--topo-warn)', 'var(--topo-ok)']} />
    <RJ45Row x="32" y="8"  n={24} pitchX={5.5} slotW={4} slotH={4}
             live={(i) => [3, 11, 18].includes(i)} />
    <RJ45Row x="32" y="14" n={24} pitchX={5.5} slotW={4} slotH={4}
             live={(i) => [1, 7, 22].includes(i)} />
    <SfpCageRow x={170} y="8" n={4} pitchX={11} slotW={9} slotH={5}
                live={(i) => i === 0 || i === 2} />
    <text x={170} y="17" fontFamily="var(--topo-font-mono)" fontSize="1.8"
          fill="var(--topo-ink-3)">SFP+  49-52</text>
    <rect x={222} y="8" width="6" height="4" fill="var(--topo-fill-port)" />
    <rect x={232} y="8" width="6" height="4" fill="var(--topo-fill-port)" />
    <text x={222} y="17" fontFamily="var(--topo-font-mono)" fontSize="1.7"
          fill="var(--topo-ink-3)">CONS · MGMT</text>
  </svg>
);

const Faceplate_2U = (
  <svg viewBox="0 0 260 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="0.5" y="2" width="259" height="36" fill="var(--topo-paper-sunken)"
          stroke="var(--topo-line)" strokeWidth="0.8" />
    <text x="6" y="6" fontFamily="var(--topo-font-stencil)" fontSize="2.4"
          fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXR-200-2U  ·  ROUTER / FIREWALL</text>
    <rect x="6" y="10" width="36" height="16" fill="var(--topo-cyan-soft)"
          stroke="var(--topo-cyan)" strokeWidth="0.6" />
    <text x="9" y="15" fontFamily="var(--topo-font-mono)" fontSize="2.1"
          fill="var(--topo-cyan-deep)">apex-prod-emea</text>
    <text x="9" y="19" fontFamily="var(--topo-font-mono)" fontSize="1.8"
          fill="var(--topo-ink-3)">CPU 14%</text>
    <text x="9" y="23" fontFamily="var(--topo-font-mono)" fontSize="1.8"
          fill="var(--topo-ink-3)">4 peers up</text>
    <LedBank x="6" y="29" labels={['SYS', 'HA']}
             lit={['var(--topo-ok)', 'var(--topo-ok)']} />
    <SfpCageRow x={50} y="10" n={8} pitchX={11} slotW={9} slotH={10}
                stacked live={(i) => i === 0 || i === 3 || i === 7} />
    <text x={50} y="32" fontFamily="var(--topo-font-mono)" fontSize="2.1"
          fill="var(--topo-ink-3)">SFP+  1-8</text>
    <QsfpCageRow x={148} y="10" n={4} pitchX={15} slotW={13} slotH={10}
                 live={(i) => i === 0 || i === 1} />
    <text x={148} y="32" fontFamily="var(--topo-font-mono)" fontSize="2.1"
          fill="var(--topo-ink-3)">QSFP28  9-12</text>
    <RJ45Row x={216} y="10" n={5} pitchX={5.5} slotW={4} slotH={5}
             live={(i) => i === 0} />
    <text x={216} y="22" fontFamily="var(--topo-font-mono)" fontSize="1.9"
          fill="var(--topo-ink-3)">MGMT · 1G ×4</text>
  </svg>
);

const Faceplate_4U = (
  <svg viewBox="0 0 280 72" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="0.5" y="1" width="279" height="71" fill="var(--topo-paper-sunken)"
          stroke="var(--topo-line)" strokeWidth="0.8" />
    {[0, 1, 2, 3].map(b => {
      const by = 3 + b * 17;
      return (
        <g key={b}>
          <rect x="3" y={by} width="274" height="16"
                fill="var(--topo-paper)"
                stroke="var(--topo-line-2)" strokeWidth="0.5"
                strokeDasharray={b === 2 ? '3 2' : '0'} />
          <text x="6" y={by + 5} fontFamily="var(--topo-font-mono)" fontSize="2"
                fill="var(--topo-ink-3)">LC{b + 1}</text>
          {b === 0 && (
            <g>
              <RJ45Row x={26} y={by + 4} n={24} pitchX={5} slotW={4} slotH={4} />
              <RJ45Row x={26} y={by + 9} n={24} pitchX={5} slotW={4} slotH={4} />
              <SfpCageRow x={170} y={by + 4} n={4} pitchX={11} slotW={9} slotH={5} />
            </g>
          )}
          {b === 1 && (
            <QsfpCageRow x={26} y={by + 3} n={6} pitchX={15} slotW={13} slotH={10}
                         live={(i) => i === 1 || i === 4} />
          )}
          {b === 2 && (
            <text x="140" y={by + 11} textAnchor="middle"
                  fontFamily="var(--topo-font-mono)" fontSize="2.4"
                  fill="var(--topo-ink-4)">— EMPTY BAY (LC3) —</text>
          )}
          {b === 3 && (
            <g>
              <rect x="26" y={by + 3} width="220" height="11"
                    fill="var(--topo-cyan-soft)" stroke="var(--topo-cyan)" strokeWidth="0.5" />
              <text x="30" y={by + 9} fontFamily="var(--topo-font-stencil)" fontSize="2"
                    fill="var(--topo-cyan-deep)">SUPERVISOR · RP-A · ACTIVE</text>
            </g>
          )}
        </g>
      );
    })}
  </svg>
);

const Faceplate_Blade = (
  <svg viewBox="0 0 320 160" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="0.5" y="1" width="319" height="158" fill="var(--topo-paper-sunken)"
          stroke="var(--topo-line)" strokeWidth="0.8" />
    <rect x="3" y="3" width="314" height="10" fill="var(--topo-paper)"
          stroke="var(--topo-line-2)" strokeWidth="0.5" />
    <text x="6" y="9.5" fontFamily="var(--topo-font-stencil)" fontSize="3"
          fill="var(--topo-ink)" letterSpacing="0.2">ANTHRACITE  AXB-10U  BLADE CHASSIS</text>
    {Array.from({ length: 8 }, (_, b) => {
      const bx = 6 + b * 31;
      const populated = b !== 3 && b !== 6;
      return (
        <g key={b}>
          <rect x={bx} y="17" width="28" height="116"
                fill={populated ? 'var(--topo-paper)' : 'var(--topo-paper-sunken)'}
                stroke="var(--topo-line-2)" strokeWidth="0.5"
                strokeDasharray={populated ? '0' : '3 2'} />
          <text x={bx + 14} y="22" textAnchor="middle"
                fontFamily="var(--topo-font-mono)" fontSize="2.2" fill="var(--topo-ink-3)">B{b + 1}</text>
          {populated && (
            <g>
              {Array.from({ length: 4 }, (_, i) => (
                <rect key={i} x={bx + 5} y={25 + i * 6} width="18" height="4.5"
                      fill="var(--topo-fill-bay)" />
              ))}
              <rect x={bx + 4} y="56" width="10" height="6" fill="var(--topo-fill-port)" />
              <rect x={bx + 16} y="56" width="10" height="6" fill="var(--topo-fill-port)" />
              <text x={bx + 14} y="80" textAnchor="middle"
                    fontFamily="var(--topo-font-mono)" fontSize="1.7"
                    fill="var(--topo-ink-3)">esx-{b + 1}</text>
            </g>
          )}
        </g>
      );
    })}
    <rect x="258" y="17" width="59" height="116"
          fill="var(--topo-cyan-soft)" stroke="var(--topo-cyan)" strokeWidth="0.5" />
    <text x="287" y="24" textAnchor="middle" fontFamily="var(--topo-font-stencil)"
          fontSize="2.4" fill="var(--topo-cyan-deep)">FABRIC IM</text>
    <QsfpCageRow x={262} y="30" n={2} pitchX={16} slotW={14} slotH={11} live={() => true} />
    <QsfpCageRow x={262} y="48" n={2} pitchX={16} slotW={14} slotH={11} live={() => true} />
  </svg>
);

const Faceplate_Virtual = (
  <svg viewBox="0 0 260 40" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    <rect x="0.5" y="2" width="259" height="36"
          fill="rgba(211,230,238,0.42)"
          stroke="var(--topo-cyan)" strokeWidth="1" strokeDasharray="3 2" />
    <text x="6" y="7" fontFamily="var(--topo-font-stencil)" fontSize="2.4"
          fill="var(--topo-ink)" letterSpacing="0.2">VIRTUAL  v-RT-01  ·  4 vCPU / 8G</text>
    {Array.from({ length: 6 }, (_, i) => (
      <g key={i}>
        <rect x={12 + i * 18} y="12" width="15" height="11" fill="none"
              stroke="var(--topo-cyan)" strokeWidth="0.6" strokeDasharray="2 1.5" />
        <text x={12 + i * 18 + 7.5} y="19" textAnchor="middle"
              fontFamily="var(--topo-font-mono)" fontSize="1.8"
              fill="var(--topo-ink-2)">vNIC{i}</text>
      </g>
    ))}
    <text x={156} y="20" fontFamily="var(--topo-font-mono)" fontSize="2"
          fill="var(--topo-ink-3)">HOST · esx-fra-04 · ESXi 8.0U2</text>
    <rect x="156" y="24" width="80" height="3" fill="var(--topo-paper-sunken)" />
    <rect x="156" y="24" width="60" height="3" fill="var(--topo-cyan)" />
    <text x={156} y="34" fontFamily="var(--topo-font-mono)" fontSize="1.8"
          fill="var(--topo-ink-3)">CPU 74% · MEM 3.2/8G</text>
  </svg>
);

const Faceplate_Sfp = (
  <svg viewBox="0 0 200 50" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
    {/* SFP+ */}
    <g transform="translate(8, 8)">
      <rect x="0" y="0" width="56" height="14" fill="var(--topo-paper)"
            stroke="var(--topo-line)" strokeWidth="0.8" />
      <text x="28" y="9" textAnchor="middle" fontFamily="var(--topo-font-stencil)"
            fontSize="3.2" fill="var(--topo-ink)" letterSpacing="0.2">SFP+ 10G</text>
      <line x1="-2" y1="7" x2="-8" y2="11" stroke="var(--topo-cyan)" strokeWidth="1.2" />
      <text x="28" y="22" textAnchor="middle" fontFamily="var(--topo-font-mono)"
            fontSize="2.2" fill="var(--topo-ink-3)">13.4 × 8.5 × 56 mm</text>
    </g>
    {/* QSFP28 */}
    <g transform="translate(100, 6)">
      <rect x="0" y="0" width="76" height="18" fill="var(--topo-paper)"
            stroke="var(--topo-line)" strokeWidth="0.8" />
      <text x="38" y="11" textAnchor="middle" fontFamily="var(--topo-font-stencil)"
            fontSize="3.6" fill="var(--topo-ink)" letterSpacing="0.2">QSFP28 100G</text>
      <line x1="-2" y1="9" x2="-8" y2="13" stroke="var(--topo-cyan)" strokeWidth="1.2" />
      <text x="38" y="26" textAnchor="middle" fontFamily="var(--topo-font-mono)"
            fontSize="2.2" fill="var(--topo-ink-3)">18.4 × 13 × 72 mm</text>
    </g>
    {/* docking arrow */}
    <text x="100" y="44" textAnchor="middle" fontFamily="var(--topo-font-mono)"
          fontSize="2.4" fill="var(--topo-ink-2)">CAGE pitch matches host primitive · see SFP/QSFP cage rules above</text>
  </svg>
);

// ─── The sheet ────────────────────────────────────────────────────────────────
function Sheet3DPrimitives() {
  return (
    <div className="topo">
      <div className="topo-sheet">
        <header className="topo-sheet-head">
          <div className="ttl-block">
            <div className="sheet-no">
              <span>SHEET <b>3D-01</b></span>
              <span>REV <b>A · 26.05.23</b></span>
              <span>PROJ <b>CABINET · 30° · DEPTH 0.5×</b></span>
              <span>UNIT <b>1 PRIM UNIT = 1 mm @ scale</b></span>
            </div>
            <h1>Hardware Primitive Family · Procedural 3D</h1>
            <div className="subtitle">
              Six axonometric primitives. Each chassis is a procedural mesh — a parametric box with port grids, status LEDs, module bays, and PSU/fan hints generated from a small parameter set. Faceplate texture is drawn in-plane on the front face. Side faces carry vent / PSU patterns. Every cage, port, and bay is a pickable zone.
            </div>
          </div>
          <div className="stamp">
            <div className="row"><span>DRWN</span><b>D.CLAUDE</b></div>
            <div className="row"><span>RENDER</span><b>BABYLON · LATER</b></div>
            <div className="row"><span>OBEYS</span><b>SoT §5 · D3 §5</b></div>
            <div className="row"><span>PROJ</span><b>CABINET 30°</b></div>
          </div>
        </header>

        <div className="topo-sheet-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            <PrimitiveCell
              no="PRIM-01" name="1U Fixed Switch" slug="1U-FIXED"
              spec="48× 1G RJ45 + 4× SFP+ uplink"
              viewBox="-30 -90 480 130"
              IsoView={<g transform="translate(40, 0)"><Iso_1U /></g>}
              dimensions={[
                { x1: 40, y1: 8, x2: 280, y2: 8, tx: 160, ty: 6, label: 'W = 480 mm' },
                { x1: 286, y1: 0, x2: 286, y2: -18, tx: 290, ty: -8, label: 'H = 1U', anchor: 'start' },
              ]}
              faceplate={Faceplate_1U}
              paramRows={[
                ['U_height', '1'],
                ['rj45.cols × rows', '24 × 2'],
                ['rj45.pitch (x,y)', '5.5 × 6.0'],
                ['sfp.count · pitch', '4 · 11'],
                ['led.bank', "['SYS','FAN','PSU','MGMT']"],
                ['vent.top.slots', 'auto · 8 px pitch'],
              ]}
              zones={[
                ['chassis', '1'],
                ['port', '48'],
                ['module', '4 cages'],
                ['led', '4'],
                ['psu', '1 (right vent)'],
              ]}
            />

            <PrimitiveCell
              no="PRIM-02" name="2U Router / Firewall Appliance" slug="2U-APP"
              spec="8× SFP+ · 4× QSFP28 · LCD · HA"
              viewBox="-30 -90 480 130"
              IsoView={<g transform="translate(40, 0)"><Iso_2U /></g>}
              dimensions={[
                { x1: 40, y1: 8, x2: 280, y2: 8, tx: 160, ty: 6, label: 'W = 480 mm' },
                { x1: 286, y1: 0, x2: 286, y2: -36, tx: 290, ty: -18, label: 'H = 2U', anchor: 'start' },
              ]}
              faceplate={Faceplate_2U}
              paramRows={[
                ['U_height', '2'],
                ['sfp.count · pitch', '8 · 11 (stacked)'],
                ['qsfp.count · pitch', '4 · 15'],
                ['has_lcd', 'true · 34×14'],
                ['led.bank', "['SYS','HA','TUN','IDS']"],
                ['ha.partner', 'optional · twin'],
              ]}
              zones={[
                ['chassis', '1'],
                ['port', '13 (sfp/qsfp/mgmt)'],
                ['module', '12 cages'],
                ['led', '4'],
                ['module', '1 LCD (pickable)'],
              ]}
            />

            <PrimitiveCell
              no="PRIM-03" name="4U Modular Chassis" slug="4U-MOD"
              spec="4 line-card bays · 1 supervisor"
              viewBox="-30 -110 500 160"
              IsoView={<g transform="translate(40, 0)"><Iso_4U /></g>}
              dimensions={[
                { x1: 40, y1: 8, x2: 300, y2: 8, tx: 170, ty: 6, label: 'W = 520 mm' },
                { x1: 306, y1: 0, x2: 306, y2: -72, tx: 310, ty: -36, label: 'H = 4U', anchor: 'start' },
              ]}
              faceplate={Faceplate_4U}
              paramRows={[
                ['U_height', '4'],
                ['bays', '4'],
                ['bay.U_height', '1 (each)'],
                ['bay.card_types', "['rj','sfp','qsfp','sup','—']"],
                ['psu.bays.right', '6 (vent)'],
                ['fan_tray', 'top, slotted'],
              ]}
              zones={[
                ['chassis', '1'],
                ['bay', '4'],
                ['module', 'per card'],
                ['port', 'per card'],
                ['psu', '6'],
              ]}
            />

            <PrimitiveCell
              no="PRIM-04" name="Blade / Datacenter Chassis" slug="10U-BLADE"
              spec="8 vertical blade slots · fabric IM"
              viewBox="-40 -200 520 240"
              IsoView={<g transform="translate(40, 0)"><Iso_Blade /></g>}
              dimensions={[
                { x1: 40, y1: 8, x2: 320, y2: 8, tx: 180, ty: 6, label: 'W = 560 mm' },
                { x1: 326, y1: 0, x2: 326, y2: -180, tx: 330, ty: -90, label: 'H = 10U', anchor: 'start' },
              ]}
              faceplate={Faceplate_Blade}
              paramRows={[
                ['U_height', '10'],
                ['blades.count', '8'],
                ['blade.orientation', 'vertical'],
                ['blade.drive_bays', '4 per blade'],
                ['blade.nic.ports', '2 per blade'],
                ['fabric.qsfp.up', '4 · interconnect'],
                ['psu.count', '4'],
              ]}
              zones={[
                ['chassis', '1'],
                ['blade', '8 (2 empty)'],
                ['port', '16 NIC + 4 fabric'],
                ['led', '24'],
                ['psu', '4'],
              ]}
            />

            <PrimitiveCell
              no="PRIM-05" name="Virtual Appliance" slug="VIRT"
              spec="dashed · hypervisor base · no real ports"
              viewBox="-30 -90 480 140"
              IsoView={<g transform="translate(40, 0)"><Iso_Virtual /></g>}
              dimensions={[
                { x1: 40, y1: 8, x2: 280, y2: 8, tx: 160, ty: 6, label: 'W = 480 (abstract)' },
              ]}
              faceplate={Faceplate_Virtual}
              paramRows={[
                ['virtual', 'true'],
                ['stroke', 'cyan dashed (3 / 2)'],
                ['hypervisor.base', 'visible plate'],
                ['vNIC.count', '6'],
                ['host', 'esx-fra-04'],
                ['real_ports', 'none — abstract'],
              ]}
              zones={[
                ['chassis', '1 (vm)'],
                ['port', '6 vNIC'],
                ['module', '0'],
                ['led', '0 (abstract gauge)'],
              ]}
            />

            <PrimitiveCell
              no="PRIM-06" name="SFP / QSFP Module Cartridge" slug="MODULE"
              spec="part — docks into any cage zone"
              viewBox="-80 -50 540 130"
              IsoView={<g transform="translate(40, 0)"><Iso_SfpModule /></g>}
              dimensions={[]}
              faceplate={Faceplate_Sfp}
              paramRows={[
                ['form', "'SFP+' | 'QSFP28'"],
                ['sfp.dim (mm)', '13.4 × 8.5 × 56'],
                ['qsfp.dim (mm)', '18.4 × 13 × 72'],
                ['has_tail', 'true · fiber LC/UPC'],
                ['inserted.depth', '0 … 1 (animation)'],
                ['compatible_cage', 'matches host pitch'],
              ]}
              zones={[
                ['module', '1 (whole)'],
                ['port', '1 (tip · fiber)'],
                ['module', '1 (latch / bail)'],
              ]}
            />
          </div>

          {/* Conventions strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 12, marginTop: 14,
          }}>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">Projection rules</span><span className="slug">[GEOM]</span></div>
              <div className="topo-anno" style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 4 }}>
                <span><span className="lbl">cabinet</span> 30° from horizontal · depth half-scale (0.5)</span>
                <span><span className="lbl">front face</span> drawn flat — keeps faceplate text legible</span>
                <span><span className="lbl">hidden edges</span> drawn dashed 0.4 px (back panel reference only)</span>
                <span><span className="lbl">top vent</span> auto-generated lines at 8 px pitch on top face</span>
                <span><span className="lbl">ground line</span> 0.4 px hairline · for elevation context</span>
                <span><span className="lbl">babylon target</span> these primitives are the spec — real meshes render at the same proportions in Babylon</span>
              </div>
            </div>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">Procedural mesh contract</span><span className="slug">[MESH]</span></div>
              <div className="topo-anno" style={{ paddingTop: 4 }}>
                Each primitive is one parametric mesh:
                <code style={{
                  display: 'block', marginTop: 4,
                  background: 'var(--topo-paper-sunken)',
                  border: '1px solid var(--topo-line-4)',
                  padding: '6px 8px',
                  fontSize: 9.5,
                  fontFamily: 'var(--topo-font-mono)',
                  color: 'var(--topo-ink-2)',
                  whiteSpace: 'pre',
                  lineHeight: 1.45,
                }}>{`HardwarePrimitive = {
  family:    '1U' | '2U' | '4U' | 'blade' | 'virt' | 'module',
  U:         number,
  dims:      { w, h, d } /* mm */,
  faceplate: FaceplateSpec,
  zones:     PickableZone[],
  virtual:   boolean
}`}</code>
              </div>
            </div>
            <div className="topo-cell">
              <div className="cell-hd"><span className="name">Pickable zone taxonomy</span><span className="slug">[PICK]</span></div>
              <div className="topo-anno" style={{ paddingTop: 4 }}>
                Six zone classes. Each carries a stable id (<code>{`<family>.<role>.<n>`}</code>) so the host can select / inspect / hot-key a region.
                <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
                  <ClickZoneSwatch label="chassis" count="frame" />
                  <ClickZoneSwatch label="port" count="rj45 · sfp · qsfp" />
                  <ClickZoneSwatch label="bay" count="line-card slot" />
                  <ClickZoneSwatch label="module" count="installed unit" />
                  <ClickZoneSwatch label="led" count="status indicator" />
                  <ClickZoneSwatch label="psu" count="power feed" />
                  <ClickZoneSwatch label="fan" count="cooling tray" />
                  <ClickZoneSwatch label="blade" count="server slot" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="topo-sheet-foot">
          <span><b>SHEET 3D-01</b></span><span className="sep" />
          <span>6 primitives · 8 pickable zone classes · 1 procedural contract</span>
          <span className="sep" />
          <span>renders via <span className="mono">Babylon.js 7</span> at runtime</span>
          <div className="grow" />
          <span>© ANTHRACITE — procedural definition, no rendered art</span>
        </footer>
      </div>
    </div>
  );
}

Object.assign(window, {
  iso, IsoBox, FrontFace, RJ45Row, SfpCageRow, QsfpCageRow, LedBank,
  Iso_1U, Iso_2U, Iso_4U, Iso_Blade, Iso_Virtual, Iso_SfpModule,
  Faceplate_1U, Faceplate_2U, Faceplate_4U, Faceplate_Blade, Faceplate_Virtual, Faceplate_Sfp,
  Sheet3DPrimitives,
});
