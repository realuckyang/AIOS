import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react'
import {
  MessageCircle,
  ListChecks,
  NotebookPen,
  Wallet,
  BookOpen,
  Rss,
  TrendingUp,
  Rocket,
  Layers,
  Shield,
  Sparkles,
  Bot,
  Brain,
  Github,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'

/* ── Smooth scroll helper ── */
function smoothScrollTo(href: string) {
  if (!href.startsWith('#')) return
  const el = document.getElementById(href.slice(1))
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

/* ── Smooth anchor link ── */
function SmoothA({
  href,
  className,
  children,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (href?.startsWith('#')) {
        e.preventDefault()
        smoothScrollTo(href)
      }
    },
    [href],
  )
  return (
    <a href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}

/* ── Scroll Reveal ── */
function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true)
      },
      { threshold: 0.15 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s ease-out ${delay}s, transform 0.7s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  )
}

/* ── Data ── */
const iconProps = { className: 'w-6 h-6 text-muted-foreground', strokeWidth: 1.5 } as const

const features: { icon: LucideIcon; title: string; desc: string }[] = [
  {
    icon: MessageCircle,
    title: 'Conversation-First',
    desc: 'Speak your intent, skip the menus. Dialogue is the primary interface — every action begins with a conversation.',
  },
  {
    icon: Layers,
    title: 'AI-Native Apps',
    desc: 'Apps that delegate complex decisions to AI, and AI that orchestrates apps. A bidirectional, living ecosystem.',
  },
  {
    icon: Shield,
    title: 'Local & Private',
    desc: 'Runs entirely on your machine. Your data never leaves, no cloud dependency, no subscriptions, no compromises.',
  },
  {
    icon: Sparkles,
    title: 'Zero-Code Creation',
    desc: 'Describe what you need. AIOS builds the complete app — routes, database, frontend — from a single conversation.',
  },
  {
    icon: Bot,
    title: 'Autonomous Agents',
    desc: 'Schedule AI agents on cron. From daily news digests to autonomous crypto trading — tasks that run while you sleep.',
  },
  {
    icon: Brain,
    title: 'Persistent Memory',
    desc: 'System-wide context that flows across conversations and apps. AIOS remembers, so you never repeat yourself.',
  },
]

const apps: { icon: LucideIcon; name: string; desc: string }[] = [
  { icon: MessageCircle, name: 'Chat', desc: 'Multi-session AI conversations with streaming and tool calling' },
  { icon: ListChecks, name: 'Tasks', desc: 'Schedule and execute AI agent tasks in the background' },
  { icon: NotebookPen, name: 'Notebook', desc: 'Lightweight notes with search, pinning, and AI sync' },
  { icon: Wallet, name: 'Finance', desc: 'Intelligent income and expense tracking' },
  { icon: BookOpen, name: 'Reader', desc: 'Interactive AI-driven fiction with branching narratives' },
  { icon: Rss, name: 'Subscriber', desc: 'AI-curated daily digests from your topic subscriptions' },
  { icon: TrendingUp, name: 'CryptoBot', desc: 'Autonomous cryptocurrency trading via AI decisions' },
  { icon: Rocket, name: 'Create', desc: 'Generate entirely new apps through conversation' },
]

const installCmds: Record<string, string> = {
  macos:
    'curl -fsSL https://raw.githubusercontent.com/valueriver/aios/main/deploy/install-macos.sh | bash',
  linux:
    'curl -fsSL https://raw.githubusercontent.com/valueriver/aios/main/deploy/install-linux.sh | bash',
  windows:
    'irm https://raw.githubusercontent.com/valueriver/aios/main/deploy/install-windows.ps1 | iex',
}

const serif = { fontFamily: "'Instrument Serif', serif" }

/* ── App ── */
export default function App() {
  const [platform, setPlatform] = useState<'macos' | 'linux' | 'windows'>('macos')

  return (
    <div className="bg-background text-foreground font-body">
      {/* ═══════════════════ Hero ═══════════════════ */}
      <div className="relative min-h-screen overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
        >
          <source src="/video/hero.mp4" type="video/mp4" />
        </video>

        {/* Bottom gradient blend into solid background */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-b from-transparent to-background z-[1]" />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
          <span className="text-3xl tracking-tight text-foreground" style={serif}>
            AIOS<sup className="text-xs">®</sup>
          </span>
          <div className="hidden md:flex items-center gap-8">
            <SmoothA href="#" className="text-sm text-foreground transition-colors">
              Home
            </SmoothA>
            <SmoothA href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </SmoothA>
            <SmoothA href="#apps" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Apps
            </SmoothA>
            <SmoothA href="#open-source" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Open Source
            </SmoothA>
            <SmoothA href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Docs
            </SmoothA>
          </div>
          <SmoothA
            href="#open-source"
            className="liquid-glass rounded-full px-6 py-2.5 text-sm text-foreground hover:scale-[1.03] transition-transform cursor-pointer"
          >
            Begin Journey
          </SmoothA>
        </nav>

        {/* Hero Content */}
        <section className="relative z-10 flex flex-col items-center text-center px-6 pt-32 pb-40">
          <h1
            className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-7xl font-normal animate-fade-rise"
            style={serif}
          >
            Where <em className="not-italic text-muted-foreground">dialogue</em> becomes{' '}
            <em className="not-italic text-muted-foreground">your operating system.</em>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay">
            A personal AI operating system that runs locally on your machine. Converse to
            build apps, automate tasks with AI agents, and own your entire digital world —
            no code, no cloud, no compromise.
          </p>
          <SmoothA
            href="#open-source"
            className="liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-12 hover:scale-[1.03] transition-transform cursor-pointer animate-fade-rise-delay-2"
          >
            Begin Journey
          </SmoothA>
        </section>
      </div>

      {/* ═══════════════════ Features ═══════════════════ */}
      <section id="features" className="py-24 sm:py-32 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-[-1.5px] text-center font-normal"
              style={serif}
            >
              Built for a new kind of{' '}
              <span className="text-muted-foreground">computing</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-center mt-6 leading-relaxed">
              AIOS reimagines how humans and machines collaborate. Every feature serves one
              mission — making dialogue the most powerful interface on your desktop.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-16">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={0.1 + i * 0.08} className="h-full">
                <div className="liquid-glass rounded-2xl p-8 h-full">
                  <f.icon {...iconProps} className={`${iconProps.className} mb-4`} />
                  <h3 className="text-lg font-medium text-foreground mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ Apps ═══════════════════ */}
      <section id="apps" className="py-24 sm:py-32 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-[-1.5px] text-center font-normal"
              style={serif}
            >
              An ecosystem that{' '}
              <span className="text-muted-foreground">thinks with you</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-center mt-6 leading-relaxed">
              16+ built-in applications, each AI-aware. From personal notes to autonomous
              trading, every app understands your intent.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-16">
            {apps.map((app, i) => (
              <Reveal key={app.name} delay={0.1 + i * 0.06} className="h-full">
                <div className="liquid-glass rounded-2xl p-6 h-full hover:scale-[1.02] transition-transform cursor-default">
                  <app.icon {...iconProps} />
                  <h3 className="text-base font-medium text-foreground mt-3 mb-1">
                    {app.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{app.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ Open Source ═══════════════════ */}
      <section id="open-source" className="py-24 sm:py-32 px-6 sm:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <Reveal>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-[-1.5px] font-normal"
              style={serif}
            >
              Open source.{' '}
              <span className="text-muted-foreground">One command.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mt-6 leading-relaxed">
              Free, transparent, and community-driven. Install in seconds, customize
              forever.
            </p>
          </Reveal>

          {/* Platform tabs */}
          <Reveal delay={0.2}>
            <div className="flex justify-center gap-2 mt-12">
              {(['macos', 'linux', 'windows'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`rounded-full px-5 py-2 text-sm transition-all cursor-pointer ${
                    platform === p
                      ? 'liquid-glass text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'macos' ? 'macOS' : p === 'linux' ? 'Linux' : 'Windows'}
                </button>
              ))}
            </div>
          </Reveal>

          {/* Terminal */}
          <Reveal delay={0.3}>
            <div className="liquid-glass rounded-2xl mt-6 text-left overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <span className="w-3 h-3 rounded-full bg-white/10" />
                <span className="w-3 h-3 rounded-full bg-white/10" />
                <span className="w-3 h-3 rounded-full bg-white/10" />
                <span className="text-xs text-muted-foreground ml-2">terminal</span>
              </div>
              <div className="p-5 font-mono text-sm text-foreground/90 overflow-x-auto whitespace-nowrap">
                <span className="text-muted-foreground select-none">$ </span>
                {installCmds[platform]}
              </div>
            </div>
          </Reveal>

          {/* GitHub CTA */}
          <Reveal delay={0.4}>
            <a
              href="https://github.com/valueriver/aios"
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-glass rounded-full px-8 py-4 text-base text-foreground hover:scale-[1.03] transition-transform cursor-pointer inline-flex items-center gap-3 mt-10"
            >
              <Github className="w-5 h-5" />
              View on GitHub
              <ArrowRight className="w-4 h-4" />
            </a>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ Docs ═══════════════════ */}
      <section id="docs" className="py-24 sm:py-32 px-6 sm:px-8">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-[-1.5px] text-center font-normal"
              style={serif}
            >
              How it <span className="text-muted-foreground">works</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto text-center mt-6 leading-relaxed">
              Three layers, one philosophy. Dialogue drives everything — apps persist
              your results, agents handle the rest.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {[
              {
                step: '01',
                title: 'You speak',
                desc: 'Type or describe what you need — a note, a task, a brand-new app. No menu hunting, no configuration screens.',
              },
              {
                step: '02',
                title: 'AI reasons',
                desc: 'The agent loop calls your LLM, invokes tools, reads context, and orchestrates the right apps — all in real time.',
              },
              {
                step: '03',
                title: 'Apps persist',
                desc: 'Results land in structured, searchable apps — notebooks, ledgers, readers — not buried in a chat log.',
              },
            ].map((item, i) => (
              <Reveal key={item.step} delay={0.15 + i * 0.1} className="h-full">
                <div className="liquid-glass rounded-2xl p-8 h-full">
                  <span className="text-sm font-mono text-muted-foreground">{item.step}</span>
                  <h3
                    className="text-2xl sm:text-3xl font-normal text-foreground mt-3 mb-3"
                    style={serif}
                  >
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ CTA Band ═══════════════════ */}
      <section className="py-24 sm:py-32 px-6 sm:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <h2
              className="text-4xl sm:text-5xl md:text-6xl leading-[0.95] tracking-[-1.5px] font-normal"
              style={serif}
            >
              Your machine.{' '}
              <span className="text-muted-foreground">Your rules.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto mt-6 leading-relaxed">
              No accounts. No subscriptions. No data leaves your device. Just install and
              start building.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <SmoothA
              href="#open-source"
              className="liquid-glass rounded-full px-14 py-5 text-base text-foreground mt-10 hover:scale-[1.03] transition-transform cursor-pointer inline-block"
            >
              Begin Journey
            </SmoothA>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════ Footer ═══════════════════ */}
      <footer className="py-16 px-6 sm:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <span className="text-2xl tracking-tight text-foreground" style={serif}>
            AIOS<sup className="text-[10px]">®</sup>
          </span>
          <p className="text-sm text-muted-foreground mt-3">
            A personal AI operating system.
          </p>
          <div className="flex items-center gap-6 mt-6">
            <SmoothA href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </SmoothA>
            <SmoothA href="#apps" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Apps
            </SmoothA>
            <SmoothA href="#open-source" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Install
            </SmoothA>
            <a
              href="https://github.com/valueriver/aios"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
          <p className="text-xs text-muted-foreground/50 mt-8">
            &copy; {new Date().getFullYear()} AIOS. Open source software.
          </p>
        </div>
      </footer>
    </div>
  )
}
