import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Users, Zap, Video, Terminal, Shield, Globe, Sparkles, Cpu, Paintbrush } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/shared/Navbar';
import Logo from '../components/shared/Logo';

/* ── Animated typing code block for the hero ────────────────────── */
const CODE_LINES = [
  { text: 'function fibonacci(n) {', color: '#C084FC' },
  { text: '  if (n <= 1) return n;', color: '#818CF8' },
  { text: '  return fibonacci(n - 1) + fibonacci(n - 2);', color: '#FFC107' },
  { text: '}', color: '#C084FC' },
  { text: '', color: '' },
  { text: 'console.log(fibonacci(10)); // 55', color: '#62666d' },
];

const TypingCode = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (visibleLines >= CODE_LINES.length) return;
    const currentLine = CODE_LINES[visibleLines].text;
    if (visibleChars < currentLine.length) {
      const timer = setTimeout(() => setVisibleChars(c => c + 1), 25 + Math.random() * 25);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setVisibleLines(l => l + 1);
        setVisibleChars(0);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, visibleChars]);

  return (
    <div className="font-mono text-[13px] leading-relaxed">
      {CODE_LINES.map((line, i) => (
        <div key={i} className="flex">
          <span className="text-surface-500 w-8 text-right mr-4 select-none">{i + 1}</span>
          <span style={{ color: line.color || '#d0d6e0' }}>
            {i < visibleLines ? line.text : i === visibleLines ? line.text.slice(0, visibleChars) : ''}
            {i === visibleLines && visibleChars < line.text.length && (
              <span className="inline-block w-[2px] h-[16px] bg-hive-400 animate-pulse ml-[1px] align-text-bottom" />
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Particle constellation background ──────────────────────────── */
const ParticleField = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Main orbs */}
    <div className="absolute top-20 left-[10%] w-[500px] h-[500px] bg-hive-600/8 rounded-full blur-[150px] animate-float" />
    <div className="absolute top-40 right-[5%] w-[600px] h-[600px] bg-honey-500/5 rounded-full blur-[180px] animate-float-delayed" />
    <div className="absolute bottom-20 left-[25%] w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[140px] animate-float-slow" />
    {/* Secondary accents */}
    <div className="absolute top-[60%] right-[30%] w-[300px] h-[300px] bg-hive-400/4 rounded-full blur-[120px] animate-float" />
    <div className="absolute top-10 left-[50%] w-[200px] h-[200px] bg-violet-500/6 rounded-full blur-[100px] animate-float-slow" />
  </div>
);

/* ── Scroll-triggered reveal ────────────────────────────────────── */
const Reveal = ({ children, className = '', delay = 0 }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/* ── Stats counter animation ────────────────────────────────────── */
const AnimatedNumber = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = Math.max(1, Math.floor(target / 40));
        const timer = setInterval(() => {
          start += step;
          if (start >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(start);
          }
        }, 30);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
};

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-surface-950 overflow-x-hidden">
      <Navbar />

      {/* ── Hero Section ─────────────────────────────────────────── */}
      <div className="relative pt-32 pb-28 overflow-hidden">
        <ParticleField />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-hive-900/20 via-surface-950/0 to-surface-950/0" />
        <div className="absolute inset-0 dot-pattern opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Floating UI Elements to fill space */}
          <div className="absolute top-[15%] left-[10%] hidden lg:flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-surface-900/60 border border-surface-700/40 backdrop-blur-md animate-float-slow shadow-2xl">
            <Code2 size={24} className="text-hive-400" />
          </div>
          <div className="absolute top-[30%] right-[12%] hidden lg:flex flex-col items-center justify-center w-14 h-14 rounded-2xl bg-surface-900/60 border border-surface-700/40 backdrop-blur-md animate-float shadow-2xl" style={{ animationDelay: '1s' }}>
            <Terminal size={20} className="text-emerald-400" />
          </div>
          <div className="absolute bottom-[40%] left-[5%] hidden xl:flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-surface-900/60 border border-surface-700/40 backdrop-blur-md animate-float" style={{ animationDelay: '2s' }}>
            <Zap size={18} className="text-honey-400" />
          </div>
          <div className="absolute bottom-[35%] right-[8%] hidden xl:flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-surface-900/60 border border-surface-700/40 backdrop-blur-md animate-float-slow" style={{ animationDelay: '1.5s' }}>
            <Users size={24} className="text-violet-400" />
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-8 animate-slide-up leading-[0.95]">
            <span className="text-white">Code together</span>
            <br />
            <span className="text-gradient-premium inline-block animate-shimmer bg-[length:200%_100%] mt-2">
              in real-time
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl text-surface-300 mb-14 animate-slide-up leading-relaxed" style={{ animationDelay: '100ms' }}>
            The collaborative IDE for modern teams. Write, execute, 
            and debug code in 10+ languages — with AI assistance, 
            video calls, and a built-in whiteboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link to="/signup" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 group text-base px-8 py-3.5">
              Start Coding Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <a href="#features" className="btn-secondary w-full sm:w-auto text-base px-8 py-3.5">
              Explore Features
            </a>
          </div>

          {/* ── Interactive Editor Mockup ──────────────────────────── */}
          <div className="mt-24 mx-auto max-w-5xl animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="relative group">
              {/* Glow effect behind */}
              <div className="absolute -inset-2 bg-gradient-to-r from-hive-600/15 via-violet-500/10 to-honey-500/15 rounded-3xl blur-2xl opacity-40 group-hover:opacity-80 transition-opacity duration-700" />
              
              <div className="relative rounded-2xl border border-surface-700/40 bg-surface-900/80 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center justify-between px-4 h-11 bg-surface-800/60 border-b border-surface-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/70 hover:bg-red-500 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-honey-500/70 hover:bg-honey-500 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/70 hover:bg-emerald-500 transition-colors" />
                  </div>
                  <span className="text-xs text-surface-400 font-mono tracking-wider">index.js — CodeHive</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />2 online
                    </span>
                  </div>
                </div>

                {/* Editor body */}
                <div className="flex">
                  {/* Sidebar mock */}
                  <div className="w-48 border-r border-surface-700/20 bg-surface-900/60 py-3 hidden md:block">
                    <div className="px-3 mb-3 text-[10px] uppercase tracking-[0.15em] text-surface-400 font-semibold">Explorer</div>
                    <div className="px-3 py-1.5 text-[12px] text-surface-300 flex items-center gap-2 hover:bg-surface-800/40 rounded-lg mx-1 cursor-default transition-colors">
                      <span className="text-[11px]">📁</span> src
                    </div>
                    <div className="px-3 py-1.5 text-[12px] text-hive-300 bg-hive-600/10 flex items-center gap-2 rounded-lg mx-1 ml-5 cursor-default border-l-2 border-hive-500/40">
                      <span className="text-[11px]">🟨</span> index.js
                    </div>
                    <div className="px-3 py-1.5 text-[12px] text-surface-400 flex items-center gap-2 hover:bg-surface-800/40 rounded-lg mx-1 ml-5 cursor-default transition-colors">
                      <span className="text-[11px]">📄</span> utils.js
                    </div>
                    <div className="px-3 py-1.5 text-[12px] text-surface-400 flex items-center gap-2 hover:bg-surface-800/40 rounded-lg mx-1 cursor-default transition-colors">
                      <span className="text-[11px]">📄</span> package.json
                    </div>
                  </div>
                  
                  {/* Code area */}
                  <div className="flex-1 p-6 min-h-[280px]">
                    <TypingCode />
                  </div>

                  {/* Chat mock */}
                  <div className="w-56 border-l border-surface-700/20 bg-surface-900/40 hidden lg:flex flex-col">
                    <div className="px-3 py-2.5 border-b border-surface-700/20 text-[11px] text-surface-400 font-semibold tracking-wider uppercase">Chat</div>
                    <div className="flex-1 px-3 py-3 text-[11px] space-y-3">
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] text-surface-500 font-medium">Alice</span>
                        <span className="bg-surface-800/60 px-2.5 py-1.5 rounded-xl rounded-tl-sm text-surface-200 mt-0.5">Ready to pair? 🚀</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-surface-500 font-medium">You</span>
                        <span className="bg-hive-600/20 px-2.5 py-1.5 rounded-xl rounded-tr-sm text-hive-200 mt-0.5">Let's go!</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────────── */}
      <div className="border-y border-surface-700/20 bg-surface-900/30 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: 10, suffix: '+', label: 'Languages' },
            { value: 50, suffix: 'ms', label: 'Sync Latency' },
            { value: 99, suffix: '%', label: 'Uptime' },
            { value: 4, suffix: '', label: 'Users / Room' },
          ].map((stat, i) => (
            <Reveal key={i} delay={i * 100} className="flex flex-col items-center text-center">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </span>
              <span className="text-sm text-surface-400 mt-2 font-medium">{stat.label}</span>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── Features Section ─────────────────────────────────────── */}
      <div id="features" className="py-32 relative">
        <ParticleField />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Reveal className="text-center mb-20">
            <span className="inline-flex items-center gap-2 text-sm text-hive-400 font-semibold mb-4 tracking-wide uppercase">
              <Sparkles size={16} /> Features
            </span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight">
              Everything you need to <br className="hidden sm:block" />
              <span className="text-gradient">build together</span>
            </h2>
            <p className="text-surface-300 max-w-2xl mx-auto text-lg">
              No setup required. Just share a link and start coding instantly.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: <Zap size={22} />, color: 'from-honey-500/20 to-honey-500/5', iconColor: 'text-honey-400', iconBg: 'bg-honey-500/10 border-honey-500/20', title: 'Real-time Sync', desc: 'Zero-latency collaboration powered by Operational Transformation. Like Google Docs for code.' },
              { icon: <Video size={22} />, color: 'from-hive-500/20 to-hive-500/5', iconColor: 'text-hive-400', iconBg: 'bg-hive-500/10 border-hive-500/20', title: 'Built-in Video Calls', desc: 'WebRTC-powered peer-to-peer video and audio calls right alongside your code.' },
              { icon: <Terminal size={22} />, color: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border-emerald-500/20', title: 'Instant Execution', desc: 'Run your code in isolated Docker containers. Supports Python, JS, Java, C++, and more.' },
              { icon: <Code2 size={22} />, color: 'from-sky-500/20 to-sky-500/5', iconColor: 'text-sky-400', iconBg: 'bg-sky-500/10 border-sky-500/20', title: 'Multi-file Projects', desc: 'Built-in file explorer with folder structure. Organize your code like a real IDE.' },
              { icon: <Cpu size={22} />, color: 'from-violet-500/20 to-violet-500/5', iconColor: 'text-violet-400', iconBg: 'bg-violet-500/10 border-violet-500/20', title: 'AI Assistant', desc: 'Bring your own API key and get AI-powered code suggestions, chat, and autocomplete.' },
              { icon: <Paintbrush size={22} />, color: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-400', iconBg: 'bg-rose-500/10 border-rose-500/20', title: 'Whiteboard Mode', desc: 'Sketch ideas, draw diagrams, and plan architecture with a collaborative whiteboard.' },
            ].map((feature, i) => (
              <Reveal key={i} delay={i * 80}>
                <FeatureCard {...feature} />
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA Section ──────────────────────────────────────────── */}
      <div className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-hive-950/15 to-surface-950" />
        <div className="absolute inset-0 dot-pattern opacity-10" />
        <Reveal className="relative max-w-3xl mx-auto px-4 text-center">
          <Logo size={48} className="mx-auto mb-8 opacity-60" />
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-8 tracking-tight">
            Ready to code <span className="text-gradient">together</span>?
          </h2>
          <p className="text-lg text-surface-300 mb-12 max-w-xl mx-auto">
            Join developers who collaborate in real-time with CodeHive. Free forever for small teams.
          </p>
          <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-lg px-10 py-4 group">
            Get Started Free
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </Reveal>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-surface-700/20 py-12 bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo size={24} withText />
            </div>
            <p className="text-xs text-surface-500">
              &copy; {new Date().getFullYear()} CodeHive. Built for developers, by developers.
            </p>
            <div className="flex items-center gap-6 text-xs text-surface-400">
              <a href="#" className="hover:text-white transition-colors duration-200">Privacy</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Terms</a>
              <a href="#" className="hover:text-white transition-colors duration-200">Help</a>
              <a href="https://github.com/priyanshi-chaudharyy/codehive" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-200">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc, color, iconColor, iconBg }) => (
  <div className="group relative rounded-2xl border border-surface-700/30 bg-surface-900/40 p-7 hover:border-surface-600/50 transition-all duration-500 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1.5 overflow-hidden">
    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
    <div className="relative">
      <div className={`w-12 h-12 rounded-xl ${iconBg} border flex items-center justify-center mb-6 ${iconColor} group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-3 text-white tracking-tight">{title}</h3>
      <p className="text-surface-300 leading-relaxed text-[15px]">{desc}</p>
    </div>
  </div>
);

export default LandingPage;
