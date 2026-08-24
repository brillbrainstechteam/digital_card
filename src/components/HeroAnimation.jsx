import React, { useEffect, useId, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, Mail, MessageCircle, UserPlus,
  ExternalLink, Check,
  BarChart3, Plus, Globe
} from 'lucide-react';
// lucide-react removed brand/logo icons in newer releases; pull the three
// social icons used here from react-icons instead so the visuals are unchanged.
import { FaInstagram as Instagram, FaLinkedin as Linkedin, FaGithub as Github } from 'react-icons/fa';
import '../hero-animation.css';

/* ══════════════════════════════════════════════════════
   Self-hosted artwork
   Every mark below used to be a third-party request —
   Unsplash portraits, flaticon logos and an api.qrserver.com
   QR image. Three extra CDNs on the critical path of the
   hero, any of which could be slow, blocked or simply go
   away, and the portraits were stock photos of real people
   captioned with invented names. These render inline
   instead: no network, no licensing question, and they
   pick up each persona's palette.
   ══════════════════════════════════════════════════════ */

function AvatarMark({ colors, className }) {
  const id = useId();
  const [c0, c1] = colors;
  return (
    <svg viewBox="0 0 96 96" className={className} role="img" aria-label="Illustrated portrait">
      <defs>
        <linearGradient id={`av-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c0} />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="48" fill={`url(#av-${id})`} />
      <circle cx="48" cy="39" r="15" fill="#fff" fillOpacity="0.93" />
      <path d="M18 88c3.5-17 14.5-25.5 30-25.5S74.5 71 78 88Z" fill="#fff" fillOpacity="0.93" />
    </svg>
  );
}

function LogoMark({ variant, colors, className }) {
  const id = useId();
  const [c0, , c2] = colors;
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Company mark">
      <defs>
        <linearGradient id={`lg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c2} />
          <stop offset="100%" stopColor={c0} />
        </linearGradient>
      </defs>
      {variant === 'wellness' ? (
        // Aura Wellness — a leaf enclosed by an open ring
        <>
          <circle cx="32" cy="32" r="27" fill="none" stroke={`url(#lg-${id})`} strokeWidth="4" strokeLinecap="round" strokeDasharray="128 42" />
          <path d="M32 17c11 6 15 14 12 22-3 8-11 10-18 6-7-4-9-13-6-21 2-4 6-6 12-7Z" fill={`url(#lg-${id})`} />
          <path d="M32 20v26" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" strokeLinecap="round" />
        </>
      ) : (
        // Stellar Studios — stacked architectural planes
        <>
          <path d="M32 6 58 21v8L32 14 6 29v-8Z" fill={`url(#lg-${id})`} />
          <path d="M32 26 58 41v8L32 34 6 49v-8Z" fill={`url(#lg-${id})`} fillOpacity="0.62" />
          <circle cx="32" cy="53" r="5" fill={c0} />
        </>
      )}
    </svg>
  );
}

// A believable QR: three finder patterns plus a deterministic module field.
// Seeded so it renders identically on every paint instead of shimmering.
function QrPattern({ className }) {
  const modules = useMemo(() => {
    const N = 21;
    let seed = 0x2f6e2b1;
    const rand = () => {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      return ((seed >>> 0) % 1000) / 1000;
    };
    const inFinder = (x, y) =>
      (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
    const out = [];
    for (let y = 0; y < N; y += 1) {
      for (let x = 0; x < N; x += 1) {
        if (!inFinder(x, y) && rand() > 0.52) out.push([x, y]);
      }
    }
    return out;
  }, []);

  const finder = (x, y) => (
    <g key={`f-${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );

  return (
    <svg viewBox="0 0 21 21" className={className} shapeRendering="crispEdges" role="img" aria-label="QR code">
      {modules.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />)}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   Personas
   ══════════════════════════════════════════════════════ */

const PRODUCT_DATA = [
  {
    id: 'personal',
    type: 'Personal',
    name: 'Julian Vance',
    title: 'Visual Designer',
    tagline: 'Capturing moments through a digital lens.',
    colors: ['#0F172A', '#334155', '#64748B'], // Slate
    hasLogo: false,
    hasAvatar: true,
  },
  {
    id: 'professional',
    type: 'Professional',
    name: 'Elena Rodriguez',
    title: 'Senior Architect',
    company: 'Stellar Studios',
    tagline: 'Modern spaces for modern living.',
    colors: ['#1E3A8A', '#1D4ED8', '#60A5FA'], // Blue
    hasLogo: true,
    logoVariant: 'architecture',
    hasAvatar: true,
  },
  {
    id: 'business',
    type: 'Business',
    name: 'Aura Wellness',
    title: 'Corporate Health',
    tagline: 'Elevating workspace productivity through health.',
    colors: ['#065F46', '#059669', '#34D399'], // Emerald
    hasLogo: true,
    logoVariant: 'wellness',
    hasAvatar: false,
  },
];

// Per-scene dwell time. A flat 2s x 12 scenes ran for 24 seconds, so a
// visitor who scrolled past the hero in the first few seconds only ever
// caught a fragment out of context. The cumulative build steps (4-8) each
// only add one element, so they need far less time on screen than the
// setup and payoff beats — which brings the whole loop to ~13s.
const SCENE_MS = [1100, 1300, 1500, 650, 900, 900, 650, 900, 1100, 1500, 1700, 1400];
const SCENE_COUNT = SCENE_MS.length;
const RESTING_SCENE = 8; // full card, before the publish overlay

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

const HeroAnimation = () => {
  const reduced = usePrefersReducedMotion();
  const [scene, setScene] = useState(reduced ? RESTING_SCENE : 1);
  const [cardIdx, setCardIdx] = useState(0);
  const active = PRODUCT_DATA[cardIdx];

  // A 13-second looping animation is exactly what "reduce motion" is asking
  // us not to play, so settle on the finished card and stop there.
  useEffect(() => {
    if (reduced) setScene(RESTING_SCENE);
  }, [reduced]);

  useEffect(() => {
    if (reduced) return undefined;
    const t = setTimeout(() => {
      // `scene` is already a dependency, so read it directly rather than
      // advancing the persona from inside a setScene updater. Updaters must
      // be pure — StrictMode double-invokes them, which stepped cardIdx twice
      // per loop and skipped a persona entirely on every cycle in dev.
      if (scene >= SCENE_COUNT) {
        setCardIdx((c) => (c + 1) % PRODUCT_DATA.length);
        setScene(1);
      } else {
        setScene(scene + 1);
      }
    }, SCENE_MS[scene - 1] ?? 1000);
    return () => clearTimeout(t);
  }, [scene, reduced]);

  const floatAnimation = reduced
    ? { rotateY: 0, rotateX: 0, y: 0 }
    : { rotateY: scene >= 11 ? 180 : [-4, 4, -4], rotateX: [2, -2, 2], y: [0, -15, 0] };

  return (
    // The phone mock below is a fixed 248x512px box with no responsive
    // variant (Tailwind arbitrary values like w-[248px] can't respond to
    // viewport size on their own), so on mobile it stayed full-size and
    // inflated the hero section's height well past the fold. framer-motion
    // drives the inner element's own `transform` inline for the 3D rotation,
    // so a competing CSS `transform: scale()` on that same element would be
    // overwritten. Instead scale a plain, non-animated wrapper around it —
    // the two transforms compose normally since they're on different
    // elements — and shrink the wrapper's own box (see hero-animation.css)
    // so the layout actually reclaims the space, not just visually shrinks.
    <div className="hero-phone-scale-outer">
      <div className="hero-phone-scale-inner">
        <motion.div
          animate={floatAnimation}
          transition={reduced ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
          className="relative w-[248px] h-[512px] transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          {/* Phone Frame */}
          <div className="absolute inset-0 bg-[#0a0a0a] rounded-[3rem] border-[8px] border-[#1a1a1a] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">

            {/* FRONT: Card Builder & Final Card */}
            <div className="absolute inset-0 backface-hidden bg-white">
              <CardScreen scene={scene} active={active} />
              {/* Dynamic Reflection Overlay */}
              {!reduced && (
                <motion.div
                  animate={{ x: [-500, 500] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
                />
              )}
            </div>

            {/* BACK: Analytics Dashboard */}
            <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-[#F8F9FA] p-6 text-black">
              <AnalyticsScreen isVisible={scene >= 11} reduced={reduced} />
            </div>

            {/* Camera Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-50" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// --- SCENE COMPONENT: FRONT SCREEN ---
const CardScreen = ({ scene, active }) => {
  return (
    <div className="h-full w-full flex flex-col text-black font-sans">
      <AnimatePresence mode="wait">

        {/* Scene 1: Start State */}
        {scene === 1 && (
          <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
              <Plus className="text-gray-400" />
            </div>
            <button className="px-6 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm">Create New Card</button>
          </motion.div>
        )}

        {/* Scene 2: Choose Card Type */}
        {scene === 2 && (
          <motion.div key="s2" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-6 mt-10">
            <p className="text-[10px] font-bold text-gray-400 tracking-widest mb-4">SELECT PRESET</p>
            {['Personal', 'Professional', 'Business'].map(type => (
              <div key={type} className={`p-4 rounded-xl border-2 mb-3 ${type === active.type ? 'border-blue-500 bg-blue-50' : 'border-gray-100 opacity-60'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">{type}</span>
                  {type === active.type && <Check size={14} className="text-blue-500" />}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Scene 3: Logo & AI Extraction */}
        {scene === 3 && (
          <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="m-auto flex flex-col items-center">
            <div className="text-[10px] font-bold text-gray-400 tracking-widest mb-8">AI COLOR EXTRACTION</div>
            {active.hasLogo && (
              <LogoMark variant={active.logoVariant} colors={active.colors} className="w-16 h-16 mb-8 grayscale opacity-50" />
            )}
            <div className="flex gap-3">
              {active.colors.map((c, i) => (
                <motion.div
                  key={c} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
                  className="w-10 h-10 rounded-full border border-gray-100 shadow-lg" style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="mt-6 text-xs font-mono text-blue-600 animate-pulse">Syncing themes...</p>
          </motion.div>
        )}

        {/* Scene 4-10: The Card Build */}
        {scene >= 4 && scene <= 10 && (
          <motion.div key="card" className="flex flex-col h-full items-center p-6 text-center">
            {/* Header Design */}
            <div className="absolute top-0 w-full h-24 opacity-10" style={{ backgroundColor: active.colors[0] }} />

            {/* Logo (Scene 5+) */}
            {active.hasLogo && scene >= 5 && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 mt-8">
                <LogoMark variant={active.logoVariant} colors={active.colors} className="w-16 h-16" />
              </motion.div>
            )}

            {/* Profile Avatar (Scene 4+) */}
            {active.hasAvatar && scene >= 4 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-4">
                <AvatarMark colors={active.colors} className="w-24 h-24 rounded-full border-4 border-white shadow-xl" />
              </motion.div>
            )}

            {/* Personal Info (Scene 5) */}
            {scene >= 5 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{active.name}</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{active.title}</p>
                {active.company && <p className="text-sm font-semibold text-gray-600">{active.company}</p>}
                <p className="text-[11px] text-gray-400 mt-3 px-4 leading-relaxed italic">"{active.tagline}"</p>
              </motion.div>
            )}

            {/* Contact Buttons (Scene 6) */}
            {scene >= 6 && (
              <div className="grid grid-cols-3 gap-2 w-full mt-6">
                {['Call', 'Email', 'WhatsApp'].map((label, i) => (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={label} className="py-2.5 rounded-lg text-white flex flex-col items-center gap-1 shadow-sm" style={{ backgroundColor: active.colors[0] }}>
                    {label === 'Call' && <Phone size={14} />}
                    {label === 'Email' && <Mail size={14} />}
                    {label === 'WhatsApp' && <MessageCircle size={14} />}
                    <span className="text-[9px] font-bold">{label}</span>
                  </motion.div>
                ))}
              </div>
            )}
            {scene >= 6 && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="w-full mt-2 py-3 bg-[#1A1A1A] text-white rounded-lg flex items-center justify-center gap-2 text-xs font-bold shadow-md">
                <UserPlus size={14} /> Save Contact
              </motion.div>
            )}

            {/* Socials (Scene 7) */}
            {scene >= 7 && (
              <div className="flex gap-6 mt-8 text-gray-300">
                <Instagram size={20} /> <Linkedin size={20} /> <Github size={20} />
              </div>
            )}

            {/* Links (Scene 8) */}
            {scene >= 8 && (
              <div className="w-full space-y-2 mt-6">
                {['View Portfolio', 'Visit Website'].map((link, i) => (
                  <motion.div initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={link} className="w-full py-3 bg-white border border-gray-100 shadow-sm rounded-xl text-[11px] font-bold text-gray-700 flex items-center justify-center gap-2">
                    {link === 'Visit Website' ? <Globe size={14} /> : <ExternalLink size={14} />} {link}
                  </motion.div>
                ))}
              </div>
            )}

            {/* Success/Publish State (Scene 9-10) */}
            {scene >= 9 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                {scene === 9 ? (
                  <>
                    <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl mb-4 flex items-center justify-center p-3">
                      <QrPattern className="w-full h-full text-gray-900 opacity-25" />
                    </div>
                    <p className="text-xs font-mono animate-pulse">GENERATING QR...</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white mb-4 shadow-xl shadow-green-500/20">
                      <Check size={32} />
                    </div>
                    <h4 className="text-xl font-bold">Successfully Published</h4>
                    <p className="text-xs text-gray-400 mt-2">Your digital identity is now live.</p>
                  </>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   Back screen — analytics
   The figures here are illustrative, so they are now
   modest and explicitly badged "sample". The previous
   24,000 views / 120 leads / 16.7% conversion read as a
   real platform statistic on a marketing page.
   ══════════════════════════════════════════════════════ */

const SAMPLE_VIEWS = 1284;

const AnalyticsScreen = ({ isVisible, reduced }) => {
  const [views, setViews] = useState(0);

  useEffect(() => {
    if (!isVisible) { setViews(0); return undefined; }
    if (reduced) { setViews(SAMPLE_VIEWS); return undefined; }
    const step = Math.ceil(SAMPLE_VIEWS / 28);
    const interval = setInterval(() => {
      setViews((prev) => (prev + step >= SAMPLE_VIEWS ? SAMPLE_VIEWS : prev + step));
    }, 45);
    return () => clearInterval(interval);
  }, [isVisible, reduced]);

  return (
    <div className="flex flex-col h-full py-6">
      <div className="flex items-center gap-2 mb-8 border-b border-gray-100 pb-4">
        <BarChart3 size={20} className="text-blue-500" />
        <span className="font-bold text-gray-800">Card Performance</span>
        <span className="ml-auto text-[8px] font-bold tracking-widest text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
          SAMPLE
        </span>
      </div>

      <div className="space-y-6">
        <StatRow label="Total Views" display={views.toLocaleString('en-IN')} fill="72%" />
        <StatRow label="Leads Captured" display="37" fill="41%" />
        <StatRow label="Conversion" display="2.9%" fill="29%" />
      </div>

      <div className="mt-auto">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Activity</p>
          {[
            ['New lead captured', '12m ago'],
            ['Card viewed', '48m ago'],
            ['QR scanned', '2h ago'],
          ].map(([label, when]) => (
            <div key={label} className="flex justify-between items-center mb-3 last:mb-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="text-[10px] font-medium text-gray-700">{label}</span>
              </div>
              <span className="text-[9px] text-gray-300">{when}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Each bar used to animate to a hardcoded 70% no matter what number sat
// above it, so "Conversion 16.7%" rendered a nearly-full bar.
const StatRow = ({ label, display, fill }) => (
  <div>
    <div className="flex justify-between items-end mb-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-xl font-bold text-gray-900">{display}</span>
    </div>
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: fill }} transition={{ duration: 1 }} className="h-full bg-blue-500 rounded-full" />
    </div>
  </div>
);

export default HeroAnimation;
