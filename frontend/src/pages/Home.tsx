import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'motion/react'
import {
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  BatteryCharging,
  CalendarClock,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Droplet,
  Fan,
  Gauge,
  MapPin,
  Phone,
  Radar,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
  Bot,
  BookOpen,
  Siren,
  MoveUpRight,
  CircleDot,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Branch, ServiceItem } from '../lib/types'
import { Button, Card } from '../components/UI'
import { BranchesMap } from '../components/BranchesMap'
import { EnquiryForm } from '../components/EnquiryForm'
import { SaarthiAI } from '../components/SaarthiAI'

const RANDOM_HERO_IMAGES = [
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1100&q=70",
  "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1100&q=70",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1100&q=70",
  "https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&w=1100&q=70",
  "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1100&q=70",
]

const HERO_IMAGE_ROTATION_INTERVAL = 5000
  RANDOM_HERO_IMAGES[Math.floor(Math.random() * RANDOM_HERO_IMAGES.length)]

const SERVICE_ICONS: Record<string, JSX.Element> = {
  'Oil Change': <Droplet className="h-5 w-5" />,
  'Brake Inspection & Pad Replacement': <Gauge className="h-5 w-5" />,
  'General Service': <Wrench className="h-5 w-5" />,
  'Wheel Alignment & Balancing': <Radar className="h-5 w-5" />,
  'AC Service': <Fan className="h-5 w-5" />,
  'Battery Check & Replacement': <Zap className="h-5 w-5" />,
}

const HERO_IMG =
  'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1100&q=70'

const CENTER_IMG_POOL = [
  'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=900&q=80',
]

function useCountUp(target: number, inView: boolean, duration = 1000) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, duration])

  return value
}

function Stat({
  value,
  suffix = '',
  label,
}: {
  value: number
  suffix?: string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(value, inView)

  return (
    <div ref={ref}>
      <p className="font-display text-3xl tracking-tight text-bone sm:text-4xl">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-1 text-[10px] uppercase tracking-[.17em] text-bone/45">{label}</p>
    </div>
  )
}

function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const quickActions = [
  {
    number: '01',
    icon: <Car size={19} />,
    title: 'My Garage',
    description: 'Vehicles, bookings and service history.',
    href: '/dashboard',
  },
  {
    number: '02',
    icon: <CalendarClock size={19} />,
    title: 'Book a service',
    description: 'Choose a service, center and slot.',
    href: '/login',
  },
  {
    number: '03',
    icon: <MapPin size={19} />,
    title: 'Find a center',
    description: 'Explore the BayLine service network.',
    href: '#centers',
  },
  {
    number: '04',
    icon: <Sparkles size={19} />,
    title: 'Get guidance',
    description: 'Start with the issue your car is facing.',
    href: '#care',
  },
]

const journey = [
  { number: '01', title: 'Choose', detail: 'Your vehicle and service' },
  { number: '02', title: 'Schedule', detail: 'A center and time slot' },
  { number: '03', title: 'Check in', detail: 'Your vehicle enters the bay' },
  { number: '04', title: 'Follow along', detail: 'See service progress' },
  { number: '05', title: 'Drive away', detail: 'Collect your serviced car' },
]

export function Home() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])

  const [heroImageIndex, setHeroImageIndex] = useState(
    () => Math.floor(Math.random() * RANDOM_HERO_IMAGES.length)
  )
  const heroImage = RANDOM_HERO_IMAGES[heroImageIndex]

  useEffect(() => {
    const interval = window.setInterval(() => {
      setHeroImageIndex((current) => (current + 1) % RANDOM_HERO_IMAGES.length)
    }, HERO_IMAGE_ROTATION_INTERVAL)

    return () => window.clearInterval(interval)
  }, [])

  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadHomeData() {
      const [branchesResult, servicesResult] = await Promise.all([
        supabase.from('branches').select('*').order('state').order('city'),
        supabase.from('services').select('*').eq('active', true).order('price'),
      ])

      if (branchesResult.error) console.error('BayLine: unable to load branches', branchesResult.error)
      if (servicesResult.error) console.error('BayLine: unable to load services', servicesResult.error)

      if (!cancelled) {
        setBranches((branchesResult.data as Branch[]) ?? [])
        setServices((servicesResult.data as ServiceItem[]) ?? [])
        setLoading(false)
      }
    }

    loadHomeData()
    return () => {
      cancelled = true
    }
  }, [])

  const states = useMemo(
    () => ['All', ...Array.from(new Set(branches.map((branch) => branch.state))).sort()],
    [branches],
  )
  const filteredBranches =
    stateFilter === 'All' ? branches : branches.filter((branch) => branch.state === stateFilter)
  const featuredServices = services.slice(0, 6)

  return (
    <main className="overflow-hidden bg-graphite-950 text-bone">
      {/* CINEMATIC AUTOMOTIVE STUDIO */}
      <section className="bl-studio-hero relative isolate min-h-[780px] overflow-hidden border-b border-white/[.08] lg:min-h-[850px]">
        <div className="bl-studio-backdrop absolute inset-0 -z-30">
          <img
            src={heroImage}
            alt="Sculpted sports car in a dark studio"
            key={heroImage} className="h-full w-full object-cover object-[center_58%] bl-hero-image-transition"
          />
        </div>
        <div className="bl-studio-vignette pointer-events-none absolute inset-0 -z-20" />
        <div className="bayline-grid pointer-events-none absolute inset-0 -z-10 opacity-20" />
        <div className="pointer-events-none absolute -right-20 top-16 -z-10 h-96 w-96 rounded-full bg-amber-500/[.12] blur-[120px]" />

        <div className="relative mx-auto flex min-h-[780px] max-w-[1600px] flex-col justify-between px-5 pb-8 pt-20 sm:px-8 lg:min-h-[850px] lg:px-14 lg:pb-10 lg:pt-24">
          <div className="grid flex-1 items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 max-w-2xl py-10 lg:py-0"
            >
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/15 bg-black/35 px-4 py-2.5 backdrop-blur-xl">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" /></span>
                <span className="font-mono text-[10px] uppercase tracking-[.24em] text-white/75">Automotive care, reimagined</span>
              </div>
              <h1 className="bl-studio-title font-display text-[clamp(3.6rem,8.4vw,8.8rem)] leading-[.82] tracking-[-.075em] text-white">
                YOUR CAR<span className="text-amber-400">.</span><br />
                <span className="bl-title-outline">YOUR BAY.</span><br />
                YOUR TIME<span className="text-amber-400">.</span>
              </h1>
              <p className="mt-8 max-w-lg text-base leading-7 text-white/65 sm:text-lg sm:leading-8">
                Precision service. Clear choices. No guesswork. Bring every part of your car-care journey into one considered experience.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/login" className="inline-flex">
                  <Button className="flex min-h-14 items-center justify-center gap-3 px-7 text-base">Start your booking <ArrowRight size={18} /></Button>
                </Link>
                <a href="#services" className="bl-studio-secondary inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-white/20 bg-black/25 px-7 text-sm font-medium text-white transition hover:border-white/45 hover:bg-white/[.08]">
                  Explore services <MoveUpRight size={16} />
                </a>
              </div>
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-white/55">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-amber-400" /> Transparent service details</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-amber-400" /> A smoother booking journey</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: .96, x: 28 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 1, delay: .12, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-3xl lg:ml-auto"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                className="relative aspect-[1.18/1] overflow-hidden rounded-[1.8rem] border border-white/20 bg-black/20 shadow-[0_40px_120px_rgba(0,0,0,.55)] lg:aspect-[1.12/1]"
              >
                <img src={heroImage} alt="Premium sports car" key={heroImage} className="h-full w-full object-cover object-center bl-hero-image-transition" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/10" />
                <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3 py-2 backdrop-blur-xl sm:left-7 sm:top-7">
                  <CircleDot size={13} className="text-amber-400" />
                  <span className="font-mono text-[9px] uppercase tracking-[.2em] text-white/80">Designed around your drive</span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8 sm:right-8">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[.22em] text-amber-400">BayLine / vehicle care</p>
                      <p className="mt-2 font-display text-3xl leading-tight text-white sm:text-5xl">Every detail.<br />Under control.</p>
                    </div>
                    <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/30 text-amber-400 backdrop-blur md:flex"><ArrowDownRight size={25} /></div>
                  </div>
                  <div className="mt-6 grid grid-cols-4 gap-2">
                    {['Choose', 'Schedule', 'Track', 'Drive'].map((stage, index) => (
                      <div key={stage}>
                        <div className={`mb-2 h-1 rounded-full ${index === 0 ? 'bg-amber-400' : 'bg-white/25'}`} />
                        <p className="text-[9px] uppercase tracking-[.12em] text-white/60 sm:text-[10px]">{stage}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                className="bl-booking-float absolute -bottom-5 left-4 right-4 rounded-2xl border border-white/15 bg-[#151613]/95 p-4 shadow-2xl backdrop-blur-2xl sm:-bottom-6 sm:left-8 sm:right-8 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400"><CalendarClock size={21} /></span>
                    <div><p className="text-sm font-semibold text-white">Your next service starts here.</p><p className="mt-1 text-xs text-white/45">Choose a service and continue to booking.</p></div>
                  </div>
                  <Link to="/login" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-xs font-bold text-[#15130f] transition hover:bg-amber-300">Book a service <ArrowRight size={15} /></Link>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="relative mt-16 grid grid-cols-3 gap-4 border-t border-white/20 pt-6 sm:mt-20 sm:gap-8 lg:mt-12">
            <div><p className="font-display text-3xl tracking-tight text-white sm:text-5xl">{branches.length.toLocaleString()}<span className="text-amber-400">+</span></p><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-white/45 sm:text-[10px]">Service centers listed</p></div>
            <div><p className="font-display text-3xl tracking-tight text-white sm:text-5xl">LIVE<span className="text-amber-400">.</span></p><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-white/45 sm:text-[10px]">Booking access</p></div>
            <div><p className="font-display text-3xl tracking-tight text-white sm:text-5xl">AI<span className="text-amber-400">.</span></p><p className="mt-2 text-[9px] uppercase tracking-[.18em] text-white/45 sm:text-[10px]">Service guidance</p></div>
          </div>
        </div>
      </section>

      {/* QUICK ACCESS STRIP */}
      <section className="relative z-10 mx-auto -mt-1 max-w-7xl px-5 sm:px-8">
        <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-graphite-900 shadow-2xl shadow-black/25 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, index) => (
            <Link
              key={action.number}
              to={action.href}
              className={`group relative p-5 transition duration-300 hover:bg-white/[.045] sm:p-6 ${
                index < quickActions.length - 1 ? 'border-b border-white/[.08] sm:border-r lg:border-b-0' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 transition group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-graphite-950">
                  {action.icon}
                </span>
                <span className="font-mono text-[10px] text-bone/25">{action.number}</span>
              </div>
              <h2 className="mt-5 flex items-center gap-2 font-display text-xl text-bone">
                {action.title}
                <ChevronRight size={15} className="text-amber-400 transition group-hover:translate-x-1" />
              </h2>
              <p className="mt-1 text-xs leading-5 text-bone/45">{action.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* SERVICE MENU */}
      <section id="services" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-amber-400">01 / Workshop menu</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.02] tracking-tight text-bone sm:text-6xl">
                The right care.
                <br />
                <span className="text-bone/45">Without the guesswork.</span>
              </h2>
            </div>
            <Link to="/login" className="inline-flex items-center gap-2 pb-1 text-sm text-amber-400 transition hover:text-amber-300">
              See booking options <ArrowRight size={16} />
            </Link>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(loading ? Array.from({ length: 6 }) : featuredServices).map((service, index) => {
            const svc = service as ServiceItem | undefined
            return (
              <Reveal key={svc?.id ?? index} delay={index * 0.055}>
                <Link to="/login" className="group block h-full">
                  <Card className="h-full border-white/10 bg-graphite-900/75 p-5 transition duration-300 group-hover:-translate-y-1 group-hover:border-amber-500/45 group-hover:bg-graphite-800/80 sm:p-6">
                    <div className="flex items-start justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 transition group-hover:bg-amber-500 group-hover:text-graphite-950">
                        {svc ? SERVICE_ICONS[svc.name] ?? <Wrench className="h-5 w-5" /> : <Wrench className="h-5 w-5" />}
                      </span>
                      <ArrowDownRight size={20} className="text-bone/25 transition group-hover:translate-x-1 group-hover:translate-y-1 group-hover:text-amber-400" />
                    </div>
                    <h3 className="mt-7 font-display text-2xl text-bone">{svc?.name ?? 'Loading service…'}</h3>
                    <p className="mt-2 min-h-[3rem] text-sm leading-6 text-bone/50">
                      {svc?.description ?? 'Service details will appear here.'}
                    </p>
                    <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-bone/40">
                        <Clock3 size={13} /> {svc ? `${svc.duration_minutes} min` : '—'}
                      </span>
                      <span className="font-display text-2xl text-amber-400">{svc ? `₹${svc.price}` : '—'}</span>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            )
          })}
        </div>
        {!loading && services.length === 0 && (
          <p className="mt-4 text-sm text-bone/45">Service details are temporarily unavailable. Please continue to booking or contact the team.</p>
        )}
      </section>

      {/* GARAGE FEATURE */}
      <section className="border-y border-white/[.07] bg-[#131513]">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1fr]">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-graphite-900 p-5 sm:p-8">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-amber-500/[.07] blur-3xl" />
              <div className="relative flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[.2em] text-amber-400">My Garage / Overview</p>
                  <h3 className="mt-2 font-display text-2xl text-bone sm:text-3xl">Your car, organized.</h3>
                </div>
                <Car size={29} className="text-amber-400" />
              </div>
              <div className="relative mt-6 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                <img src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85" alt="Car ready for its next drive" className="h-48 w-full object-cover opacity-75 sm:h-56" />
                <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[9px] uppercase tracking-[.2em] text-white/55">Your vehicle profile</p>
                    <p className="mt-1 font-display text-2xl text-white">Ready for the road</p>
                  </div>
                  <span className="rounded-md border border-white/20 bg-black/30 px-2 py-1 font-mono text-[9px] text-white/75">GARAGE</span>
                </div>
              </div>
              <div className="relative mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: 'Bookings', value: 'Manage' },
                  { label: 'History', value: 'Review' },
                  { label: 'Next step', value: 'Book' },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-white/[.07] bg-white/[.025] p-3 sm:p-4">
                    <p className="text-[9px] uppercase tracking-[.15em] text-bone/35">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-bone">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="font-mono text-[10px] uppercase tracking-[.22em] text-teal-400">02 / Made for owners</p>
            <h2 className="mt-4 font-display text-4xl leading-[1.03] tracking-tight text-bone sm:text-6xl">
              Every vehicle
              <br />
              <span className="text-bone/45">has a story.</span>
              <br />
              Keep it together.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-bone/55">
              Use My Garage to keep vehicle details, bookings and service history together, making your next visit easier to manage.
            </p>
            <div className="mt-7 space-y-3">
              {[
                'Keep vehicle profiles together',
                'Return to booking and service history',
                'Follow the status of your service',
                'Start your next booking with less friction',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-bone/70">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-400/10 text-teal-400">
                    <Check size={12} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
            <Link to="/login" className="mt-8 inline-flex">
              <Button className="flex items-center gap-2">Open My Garage <ArrowRight size={17} /></Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* SERVICE JOURNEY */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-amber-400">03 / The BayLine flow</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.03] tracking-tight text-bone sm:text-5xl">
                From first click
                <br />
                to pickup.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-bone/50 lg:justify-self-end">
              A clear process helps you know what to do next. Start with the booking flow, then use the available status information to follow your service.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {journey.map((step, index) => (
            <Reveal key={step.number} delay={index * 0.06}>
              <div className="group h-full border-t border-white/15 bg-gradient-to-b from-white/[.035] to-transparent p-5 transition hover:border-amber-500/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-amber-400">{step.number}</span>
                  {index === journey.length - 1 ? <CheckCircle2 size={17} className="text-teal-400" /> : <ArrowRight size={16} className="text-bone/25 transition group-hover:translate-x-1 group-hover:text-amber-400" />}
                </div>
                <h3 className="mt-7 font-display text-2xl text-bone">{step.title}</h3>
                <p className="mt-2 text-xs leading-5 text-bone/45">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* AI AND CARE */}
      <section id="care" className="border-y border-white/[.07] bg-[#131513]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
              <div className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[.13] via-graphite-900 to-graphite-900 p-6 sm:p-9">
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <Bot size={24} />
                </div>
                <p className="relative mt-7 font-mono text-[10px] uppercase tracking-[.22em] text-amber-400">04 / BayLine intelligence</p>
                <h2 className="relative mt-3 max-w-2xl font-display text-3xl leading-tight text-bone sm:text-5xl">
                  Tell us what feels wrong.
                  <br />
                  Find a place to start.
                </h2>
                <p className="relative mt-4 max-w-xl text-sm leading-6 text-bone/55">
                  BayLine’s booking experience can use your vehicle details, mileage and reported issue to help guide the service selection.
                </p>
                <Link to="/login" className="relative mt-7 inline-flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300">
                  Start with booking <ArrowRight size={16} />
                </Link>
              </div>
              <div className="rounded-2xl border border-white/10 bg-graphite-900 p-6 sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-400/10 text-teal-300">
                  <BookOpen size={23} />
                </div>
                <p className="mt-7 font-mono text-[10px] uppercase tracking-[.22em] text-teal-300">Practical car care</p>
                <h3 className="mt-3 font-display text-3xl text-bone">Understand your car better.</h3>
                <p className="mt-4 text-sm leading-6 text-bone/50">
                  Get a clearer starting point for maintenance questions and discuss your needs with the service team.
                </p>
                <a href="#enquiry" className="mt-7 inline-flex items-center gap-2 text-sm text-teal-300 hover:text-teal-200">
                  Ask the team <ArrowRight size={16} />
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* SERVICE CENTERS */}
      <section id="centers" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-amber-400">05 / The network</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.03] tracking-tight text-bone sm:text-6xl">
                Your next stop.
                <br />
                <span className="text-bone/45">Closer than you think.</span>
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-bone/50">
              Browse the service centers listed in BayLine. Select a state, map marker or center card to explore available location details.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.06} className="mt-8">
          <div className="flex flex-wrap gap-2">
            {states.map((state) => (
              <button
                key={state}
                onClick={() => {
                  setStateFilter(state)
                  setActiveBranchId(null)
                }}
                className={`rounded-full border px-4 py-2.5 text-xs transition ${
                  stateFilter === state
                    ? 'border-amber-400 bg-amber-400 text-graphite-950'
                    : 'border-white/10 bg-white/[.025] text-bone/55 hover:border-white/25 hover:text-bone'
                }`}
              >
                {state === 'All' ? 'All states' : state}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <Reveal>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-graphite-900 p-2 sm:p-3">
              <BranchesMap branches={filteredBranches} activeBranchId={activeBranchId} onSelect={(branch) => setActiveBranchId(branch.id)} />
            </div>
          </Reveal>
          <div className="grid max-h-[540px] content-start gap-3 overflow-y-auto pr-1">
            {(loading ? Array.from({ length: 4 }) : filteredBranches).map((item, index) => {
              const branch = item as Branch | undefined
              const active = branch?.id === activeBranchId
              return (
                <Reveal key={branch?.id ?? index} delay={index * 0.025}>
                  <button
                    onClick={() => branch && setActiveBranchId(branch.id)}
                    className={`w-full rounded-xl border p-3 text-left transition sm:p-4 ${
                      active
                        ? 'border-amber-400/70 bg-amber-400/[.08]'
                        : 'border-white/10 bg-white/[.025] hover:border-white/25 hover:bg-white/[.045]'
                    }`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={CENTER_IMG_POOL[index % CENTER_IMG_POOL.length]}
                        alt=""
                        className="h-[76px] w-[76px] shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1 py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-display text-lg text-bone">{branch?.name ?? 'Loading center…'}</p>
                          <ChevronRight size={16} className={`mt-1 shrink-0 ${active ? 'text-amber-400' : 'text-bone/25'}`} />
                        </div>
                        <p className="mt-1 flex gap-1.5 text-xs leading-5 text-bone/45">
                          <MapPin size={12} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">{branch ? `${branch.address}, ${branch.city}, ${branch.state}` : 'Loading location details'}</span>
                        </p>
                        {branch?.phone && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-bone/45">
                            <Phone size={12} /> {branch.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                </Reveal>
              )
            })}
            {!loading && filteredBranches.length === 0 && (
              <p className="rounded-xl border border-white/10 p-6 text-center text-sm text-bone/45">
                No centers are listed for {stateFilter} yet.
              </p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-bone/35">
          {loading ? 'Loading service centers…' : `${filteredBranches.length} ${filteredBranches.length === 1 ? 'center' : 'centers'} shown`}
        </p>
      </section>

      {/* TRUST / VALUE */}
      <section className="border-y border-white/[.07] bg-[#131513]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
          <Reveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-teal-300">06 / The BayLine standard</p>
              <h2 className="mt-4 font-display text-4xl leading-[1.03] tracking-tight text-bone sm:text-6xl">
                Less uncertainty.
                <br />
                <span className="text-bone/45">More time on the road.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-bone/50">
                Bring booking, location discovery and service information into one practical experience.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: <CalendarClock size={22} />,
                number: '01',
                title: 'A clearer booking flow',
                text: 'Choose your service and continue through the existing online booking experience.',
              },
              {
                icon: <MapPin size={22} />,
                number: '02',
                title: 'Centers you can explore',
                text: 'Use branch information and the interactive map to compare locations.',
              },
              {
                icon: <ShieldCheck size={22} />,
                number: '03',
                title: 'Service details upfront',
                text: 'Review the listed service descriptions, displayed prices and estimated durations.',
              },
            ].map((item, index) => (
              <Reveal key={item.number} delay={index * 0.07}>
                <Card className="h-full border-white/10 bg-graphite-900/75 p-6 transition duration-300 hover:-translate-y-1 hover:border-amber-500/35 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-300/15 bg-teal-300/[.07] text-teal-300">
                      {item.icon}
                    </span>
                    <span className="font-mono text-[10px] text-bone/25">{item.number}</span>
                  </div>
                  <h3 className="mt-6 font-display text-2xl text-bone">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-bone/50">{item.text}</p>
                </Card>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EXISTING SAARTHI AI COMPONENT */}
      <SaarthiAI />

      {/* ROAD-SIDE SUPPORT AND ENQUIRY */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="flex flex-col gap-5 rounded-2xl border border-red-400/20 bg-red-400/[.035] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/[.08] text-red-300">
                <Siren size={22} />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[.2em] text-red-300">Roadside assistance</p>
                <h2 className="mt-2 font-display text-2xl text-bone sm:text-3xl">Need help before you reach a center?</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-bone/50">
                  If the issue needs immediate attention, contact the support team rather than waiting for a scheduled workshop visit.
                </p>
              </div>
            </div>
            <a href="#enquiry" className="inline-flex shrink-0 items-center gap-2 text-sm text-red-300 hover:text-red-200">
              Contact support <ArrowRight size={16} />
            </a>
          </div>
        </Reveal>

        <div id="enquiry" className="mx-auto mt-16 max-w-4xl scroll-mt-24">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-mono text-[10px] uppercase tracking-[.22em] text-amber-400">07 / Human support</p>
              <h2 className="mt-4 font-display text-4xl leading-tight tracking-tight text-bone sm:text-6xl">
                Let’s get your car
                <br />
                <span className="text-bone/45">back on track.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-bone/50">
                Share your vehicle details and what you need. Your enquiry will go through the existing BayLine staff workflow.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08} className="mt-9">
            <EnquiryForm branches={branches} />
          </Reveal>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.5rem] border border-amber-400/25 bg-graphite-900">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[.15] via-transparent to-teal-400/[.08]" />
            <div className="bayline-grid pointer-events-none absolute inset-0 opacity-20" />
            <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-amber-400/10 blur-[90px]" />
            <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-amber-400">
                  <BatteryCharging size={16} /> Ready when your car is
                </div>
                <h2 className="mt-4 max-w-3xl font-display text-4xl leading-[1.02] tracking-tight text-bone sm:text-6xl">
                  Make the next service
                  <br />
                  the easiest one yet.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-6 text-bone/55">
                  Create your account, add a vehicle and continue into the BayLine booking experience.
                </p>
              </div>
              <Link to="/login" className="inline-flex">
                <Button className="flex min-h-12 items-center gap-3 px-6">
                  Enter BayLine <ArrowRight size={17} />
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
