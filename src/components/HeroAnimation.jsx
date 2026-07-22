import React, { useState, useEffect } from 'react';
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

// --- Professional Demo Data (Replaces Screenshot Data) ---
const PRODUCT_DATA = [
  {
    id: 'personal',
    type: 'Personal',
    name: 'Julian Vance',
    title: 'Visual Designer',
    tagline: 'Capturing moments through a digital lens.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    colors: ['#0F172A', '#334155', '#64748B'], // Slate Theme
    hasLogo: false
  },
  {
    id: 'professional',
    type: 'Professional',
    name: 'Elena Rodriguez',
    title: 'Senior Architect',
    company: 'Stellar Studios',
    tagline: 'Modern spaces for modern living.',
    logo: 'https://cdn-icons-png.flaticon.com/512/2111/2111463.png',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
    colors: ['#1E3A8A', '#1D4ED8', '#60A5FA'], // Blue Theme
    hasLogo: true
  },
  {
    id: 'business',
    type: 'Business',
    name: 'Aura Wellness',
    title: 'Corporate Health',
    tagline: 'Elevating workspace productivity through health.',
    logo: 'https://cdn-icons-png.flaticon.com/512/6062/6062646.png',
    colors: ['#065F46', '#059669', '#34D399'], // Emerald Theme
    hasLogo: true,
    noPhoto: true
  }
];

// Extracted from the original combined hero section: only the animated
// phone mockup (right side). The left-side marketing copy from the
// pasted design is intentionally NOT included here — Landing.jsx keeps
// its own existing heading/description/CTA untouched.
const HeroAnimation = () => {
  const [scene, setScene] = useState(1);
  const [cardIdx, setCardIdx] = useState(0);
  const active = PRODUCT_DATA[cardIdx];

  // Loop Control: 12 Scenes, ~22 Seconds total
  useEffect(() => {
    const timer = setInterval(() => {
      setScene((prev) => {
        if (prev === 12) {
          setCardIdx((c) => (c + 1) % 3);
          return 1;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      animate={{
        rotateY: scene >= 11 ? 180 : [-4, 4, -4],
        rotateX: [2, -2, 2],
        y: [0, -15, 0]
      }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      className="relative w-[248px] h-[512px] transition-transform duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]"
    >
      {/* Phone Frame */}
      <div className="absolute inset-0 bg-[#0a0a0a] rounded-[3rem] border-[8px] border-[#1a1a1a] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden">

        {/* FRONT: Card Builder & Final Card */}
        <div className="absolute inset-0 backface-hidden bg-white">
          <CardScreen scene={scene} active={active} />
          {/* Dynamic Reflection Overlay */}
          <motion.div
            animate={{ x: [-500, 500] }} transition={{ duration: 3, repeat: Infinity, repeatDelay: 4 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
          />
        </div>

        {/* BACK: Analytics Dashboard */}
        <div className="absolute inset-0 backface-hidden [transform:rotateY(180deg)] bg-[#F8F9FA] p-6 text-black">
          <AnalyticsScreen isVisible={scene >= 11} />
        </div>

        {/* Camera Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1a1a1a] rounded-b-2xl z-50" />
      </div>
    </motion.div>
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
             {active.hasLogo && <img src={active.logo} className="w-16 h-16 mb-8 grayscale opacity-50" alt="logo" />}
             <div className="flex gap-3">
               {active.colors.map((c, i) => (
                 <motion.div
                   key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1 }}
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
               <motion.img initial={{ scale: 0 }} animate={{ scale: 1 }} src={active.logo} className="w-16 h-16 mb-4 mt-8 object-contain" />
             )}

             {/* Profile Photo (Scene 4+) */}
             {active.photo && !active.noPhoto && scene >= 4 && (
               <motion.img initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} src={active.photo} className="w-24 h-24 rounded-full border-4 border-white shadow-xl mb-4 object-cover" />
             )}

             {/* Personal Info (Scene 5) */}
             {scene >= 5 && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                 <h2 className="text-2xl font-bold text-gray-900 leading-tight">{active.name}</h2>
                 <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{active.title}</p>
                 {active.company && <p className="text-sm font-semibold text-gray-600">{active.company}</p>}
                 <p className="text-[11px] text-gray-400 mt-3 px-4 leading-relaxed italic">"{active.tagline}"</p>
                 <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-tighter">Global Citizen</p>
               </motion.div>
             )}

             {/* Contact Buttons (Scene 6) */}
             {scene >= 6 && (
               <div className="grid grid-cols-3 gap-2 w-full mt-6">
                 {['Call', 'Email', 'WhatsApp'].map((label, i) => (
                    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={label} className="py-2.5 rounded-lg text-white flex flex-col items-center gap-1 shadow-sm" style={{ backgroundColor: active.colors[0] }}>
                       {label === 'Call' && <Phone size={14}/>}
                       {label === 'Email' && <Mail size={14}/>}
                       {label === 'WhatsApp' && <MessageCircle size={14}/>}
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
                     {link === 'Visit Website' ? <Globe size={14} /> : <ExternalLink size={14}/>} {link}
                   </motion.div>
                 ))}
               </div>
             )}

             {/* Success/Publish State (Scene 9-10) */}
             {scene >= 9 && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 text-center">
                  {scene === 9 ? (
                    <>
                      <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl mb-4 flex items-center justify-center p-2">
                         <div className="w-full h-full bg-[url('https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=PROMO')] opacity-20" />
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

// --- SCENE COMPONENT: BACK SCREEN (ANALYTICS) ---
const AnalyticsScreen = ({ isVisible }) => {
  const [v, setV] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const interval = setInterval(() => {
        setV(prev => (prev < 24000 ? prev + 800 : 24000));
      }, 50);
      return () => clearInterval(interval);
    } else {
      setV(0);
    }
  }, [isVisible]);

  return (
    <div className="flex flex-col h-full py-6">
      <div className="flex items-center gap-2 mb-8 border-b border-gray-100 pb-4">
        <BarChart3 size={20} className="text-blue-500" />
        <span className="font-bold text-gray-800">Card Performance</span>
      </div>

      <div className="space-y-6">
        <StatRow label="Total Views" val={v} suffix="K" isK />
        <StatRow label="Leads Generated" val={120} />
        <StatRow label="Conversion" val={16.7} suffix="%" />
      </div>

      <div className="mt-auto">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Recent Activity</p>
          {[1,2,3].map(i => (
             <div key={i} className="flex justify-between items-center mb-3 last:mb-0">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-medium text-gray-700">New lead captured</span>
               </div>
               <span className="text-[9px] text-gray-300">12m ago</span>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatRow = ({ label, val, suffix = "", isK = false }) => (
  <div>
    <div className="flex justify-between items-end mb-2">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-xl font-bold text-gray-900">{isK ? (val/1000).toFixed(1) : val}{suffix}</span>
    </div>
    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 1 }} className="h-full bg-blue-500 rounded-full" />
    </div>
  </div>
);

export default HeroAnimation;
