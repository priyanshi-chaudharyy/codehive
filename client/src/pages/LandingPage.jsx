import { Link } from 'react-router-dom';
import { ArrowRight, Code2, Users, Zap, Video, Terminal, Shield, Globe, Sparkles } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import Navbar from '../components/shared/Navbar';

/* ── Animated typing code block for the hero ────────────────────── */
const CODE_LINES = [
  { text: 'function fibonacci(n) {', color: '#c792ea' },
  { text: '  if (n <= 1) return n;', color: '#82aaff' },
  { text: '  return fibonacci(n - 1) + fibonacci(n - 2);', color: '#c3e88d' },
  { text: '}', color: '#c792ea' },
  { text: '', color: '' },
  { text: 'console.log(fibonacci(10)); // 55', color: '#676e95' },
];

const TypingCode = () => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [visibleChars, setVisibleChars] = useState(0);

  useEffect(() => {
    if (visibleLines >= CODE_LINES.length) return;
    const currentLine = CODE_LINES[visibleLines].text;
    if (visibleChars < currentLine.length) {
      const timer = setTimeout(() => setVisibleChars(c => c + 1), 30 + Math.random() * 30);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setVisibleLines(l => l + 1);
        setVisibleChars(0);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, visibleChars]);

  return (
    <div className="font-mono text-[13px] leading-relaxed">
      {CODE_LINES.map((line, i) => (
        <div key={i} className="flex">
          <span className="text-surface-600 w-8 text-right mr-4 select-none">{i + 1}</span>
          <span style={{ color: line.color || '#babed8' }}>
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

/* ── Floating particles background ──────────────────────────────── */
const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-20 left-[10%] w-72 h-72 bg-hive-500/15 rounded-full blur-[100px] animate-float" />
    <div className="absolute top-40 right-[15%] w-96 h-96 bg-honey-500/10 rounded-full blur-[120px] animate-float-delayed" />
    <div className="absolute bottom-20 left-[30%] w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] animate-float-slow" />
  </div>
);

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
      <div className="relative pt-28 pb-24 overflow-hidden">
        <FloatingOrbs />
        <div className="absolute inset-0 dot-pattern opacity-30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-800/80 border border-surface-700/60 mb-8 animate-fade-in backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-sm text-surface-300">CodeHive Beta is live</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 animate-slide-up">
            Code together in <br />
            <span className="text-gradient inline-block animate-shimmer bg-[length:200%_100%]">real-time</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg text-surface-400 mb-12 animate-slide-up leading-relaxed" style={{ animationDelay: '100ms' }}>
            The collaborative IDE for modern development teams. Write code, jump on a video call, and execute in 10+ languages directly from your browser.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <Link to="/signup" className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 group">
              Start Coding Free
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="btn-secondary w-full sm:w-auto">
              Explore Features
            </a>
          </div>

          {/* ── Interactive Editor Mockup ──────────────────────────── */}
          <div className="mt-20 mx-auto max-w-5xl animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="relative group">
              {/* Glow effect behind */}
              <div className="absolute -inset-1 bg-gradient-to-r from-hive-600/20 via-honey-500/10 to-emerald-500/20 rounded-2xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative rounded-xl border border-surface-700/60 bg-surface-900/90 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* Title bar */}
                <div className="flex items-center justify-between px-4 h-10 bg-surface-800/80 border-b border-surface-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-honey-500/80 hover:bg-honey-500 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors" />
                  </div>
                  <span className="text-xs text-surface-500 font-mono">index.js — CodeHive</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />2 online
                    </span>
                  </div>
                </div>

                {/* Editor body */}
                <div className="flex">
                  {/* Sidebar mock */}
                  <div className="w-44 border-r border-surface-800/50 bg-surface-950/50 py-3 hidden md:block">
                    <div className="px-3 mb-2 text-[10px] uppercase tracking-widest text-surface-600 font-semibold">Explorer</div>
                    <div className="px-3 py-1 text-[12px] text-surface-400 flex items-center gap-1.5 hover:bg-surface-800/40 rounded mx-1 cursor-default">
                      <span className="text-[11px]">📁</span> src
                    </div>
                    <div className="px-3 py-1 text-[12px] text-hive-300 bg-hive-600/15 flex items-center gap-1.5 rounded mx-1 ml-5 cursor-default">
                      <span className="text-[11px]">🟨</span> index.js
                    </div>
                    <div className="px-3 py-1 text-[12px] text-surface-500 flex items-center gap-1.5 hover:bg-surface-800/40 rounded mx-1 ml-5 cursor-default">
                      <span className="text-[11px]">📄</span> utils.js
                    </div>
                    <div className="px-3 py-1 text-[12px] text-surface-500 flex items-center gap-1.5 hover:bg-surface-800/40 rounded mx-1 cursor-default">
                      <span className="text-[11px]">📄</span> package.json
                    </div>
                  </div>
                  
                  {/* Code area */}
                  <div className="flex-1 p-6 min-h-[260px]">
                    <TypingCode />
                  </div>

                  {/* Chat mock */}
                  <div className="w-52 border-l border-surface-800/50 bg-surface-900/40 hidden lg:flex flex-col">
                    <div className="px-3 py-2 border-b border-surface-800/50 text-[11px] text-surface-500 font-semibold">CHAT</div>
                    <div className="flex-1 px-3 py-2 text-[11px] space-y-2">
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] text-surface-600">Alice</span>
                        <span className="bg-surface-800/80 px-2 py-1 rounded-lg text-surface-300 mt-0.5">Ready to pair? 🚀</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-surface-600">You</span>
                        <span className="bg-hive-600/30 px-2 py-1 rounded-lg text-hive-200 mt-0.5">Let's go!</span>
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
      <div className="border-y border-surface-800/50 bg-surface-900/20 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 10, suffix: '+', label: 'Languages' },
            { value: 50, suffix: 'ms', label: 'Sync latency' },
            { value: 99, suffix: '%', label: 'Uptime' },
            { value: 4, suffix: '', label: 'Users per room' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center">
              <span className="text-3xl font-bold text-white"><AnimatedNumber target={stat.value} suffix={stat.suffix} /></span>
              <span className="text-sm text-surface-500 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features Section ─────────────────────────────────────── */}
      <div id="features" className="py-28 relative">
        <FloatingOrbs />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 text-sm text-hive-400 font-medium mb-4">
              <Sparkles size={16} /> Features
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-5">Everything you need to build together</h2>
            <p className="text-surface-400 max-w-2xl mx-auto text-lg">No setup required. Just share a link and start coding instantly.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Zap />}
              color="from-honey-500/20 to-honey-500/5"
              iconColor="text-honey-400"
              title="Real-time Sync"
              description="Zero-latency collaboration powered by Operational Transformation. Like Google Docs for code."
            />
            <FeatureCard 
              icon={<Video />}
              color="from-hive-500/20 to-hive-500/5"
              iconColor="text-hive-400"
              title="Built-in Video Calls"
              description="WebRTC-powered peer-to-peer video and audio calls right alongside your code."
            />
            <FeatureCard 
              icon={<Terminal />}
              color="from-emerald-500/20 to-emerald-500/5"
              iconColor="text-emerald-400"
              title="Instant Execution"
              description="Run your code in isolated Docker containers. Supports Python, JS, Java, C++, and more."
            />
            <FeatureCard 
              icon={<Code2 />}
              color="from-sky-500/20 to-sky-500/5"
              iconColor="text-sky-400"
              title="Multi-file Projects"
              description="Built-in file explorer with folder structure. Organize your code like a real IDE."
            />
            <FeatureCard 
              icon={<Shield />}
              color="from-rose-500/20 to-rose-500/5"
              iconColor="text-rose-400"
              title="Snapshots & Diff"
              description="Save snapshots of your work and compare changes with a visual diff viewer."
            />
            <FeatureCard 
              icon={<Globe />}
              color="from-violet-500/20 to-violet-500/5"
              iconColor="text-violet-400"
              title="Share Instantly"
              description="Share a room link and anyone can join. No downloads, no accounts required."
            />
          </div>
        </div>
      </div>

      {/* ── CTA Section ──────────────────────────────────────────── */}
      <div className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-surface-950 via-hive-950/20 to-surface-950" />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to code together?</h2>
          <p className="text-lg text-surface-400 mb-10">Join thousands of developers who collaborate in real-time with CodeHive.</p>
          <Link to="/signup" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4 group">
            Get Started Free
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="border-t border-surface-800/50 py-10 bg-surface-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl opacity-80">🐝</span>
            <span className="text-sm font-semibold text-surface-400">CodeHive</span>
          </div>
          <p className="text-xs text-surface-500">
            &copy; {new Date().getFullYear()} CodeHive. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-surface-500">
            <a href="#" className="hover:text-surface-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-surface-300 transition-colors">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, color, iconColor }) => (
  <div className="group relative rounded-2xl border border-surface-800/60 bg-surface-900/40 p-7 hover:border-surface-700/80 transition-all duration-300 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-1">
    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="relative">
      <div className={`w-12 h-12 rounded-xl bg-surface-800/80 flex items-center justify-center border border-surface-700/50 mb-6 ${iconColor} group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <p className="text-surface-400 leading-relaxed">{description}</p>
    </div>
  </div>
);

export default LandingPage;
