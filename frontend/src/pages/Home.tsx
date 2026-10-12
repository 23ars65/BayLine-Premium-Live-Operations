import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, BadgeCheck, BatteryCharging, CalendarClock, Car, CheckCircle2,
  ChevronRight, Clock3, Droplet, Fan, Gauge, MapPin, Phone, Radar,
  ShieldCheck, Sparkles, Star, Wrench, Zap, Bot, BookOpen, Siren,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Branch, ServiceItem } from '../lib/types'
import { Button, Card } from '../components/UI'
import { BranchesMap } from '../components/BranchesMap'
import { EnquiryForm } from '../components/EnquiryForm'


const SERVICE_ICONS: Record<string, JSX.Element> = {
  'Oil Change': <Droplet className="h-6 w-6" />,
  'Brake Inspection & Pad Replacement': <Gauge className="h-6 w-6" />,
  'General Service': <Wrench className="h-6 w-6" />,
  'Wheel Alignment & Balancing': <Radar className="h-6 w-6" />,
  'AC Service': <Fan className="h-6 w-6" />,
  'Battery Check & Replacement': <Zap className="h-6 w-6" />,
}

const HERO_IMG = 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=1600&q=85'
const CENTER_IMG_POOL = [
  'https://images.unsplash.com/photo-1625047509168-a7026f36de04?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=900&q=80',
]

const TESTIMONIALS = [
  { name: 'Ananya Deshmukh', car: 'Hyundai Creta', quote: 'Booked an oil change in under a minute and watched my car move through the bay live on my phone.' },
  { name: 'Rohit Kulkarni', car: 'Maruti Swift', quote: 'The transparent pricing and status updates made the whole service process much easier to follow.' },
  { name: 'Fatima Sheikh', car: 'Tata Nexon', quote: 'Found the service center on the map, booked same-day, and could track the booking without calling.' },
]

function useCountUp(target: number, inView: boolean, duration = 1200) {
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

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const count = useCountUp(value, inView)
  return (
    <div ref={ref} className="text-center sm:text-left">
      <p className="font-display text-3xl text-amber-500 sm:text-4xl">{count.toLocaleString()}{suffix}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[.18em] text-bone/45">{label}</p>
    </div>
  )
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

const actions = [
  { icon: <Car size={20} />, title: 'My Garage', text: 'Keep your vehicles and service history together.', href: '/dashboard' },
  { icon: <CalendarClock size={20} />, title: 'Book Service', text: 'Choose a vehicle, branch and available slot.', href: '/login' },
  { icon: <MapPin size={20} />, title: 'Find a Center', text: 'Explore branches and locations on the live map.', href: '#centers' },
  { icon: <Sparkles size={20} />, title: 'Get a Quote', text: 'Tell us what your car needs before booking.', href: '#enquiry' },
]

export function Home() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [stateFilter, setStateFilter] = useState('All')
  const [loading, setLoading] = useState(true)

useEffect(() => {
  let cancelled = false

  async function load() {
    console.log('🔍 BayLine: Loading branches and services...')

    const branchesResult = await supabase
      .from('branches')
      .select('*')
      .order('state')
      .order('city')

    const servicesResult = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('price')

    console.log('📍 Branch result:', branchesResult)
    console.log('🔧 Services result:', servicesResult)

    if (branchesResult.error) {
      console.error(
        '❌ Branch loading error:',
        branchesResult.error
      )
    }

    if (servicesResult.error) {
      console.error(
        '❌ Service loading error:',
        servicesResult.error
      )
    }

    if (!cancelled) {
      setBranches(
        (branchesResult.data as Branch[]) ?? []
      )

      setServices(
        (servicesResult.data as ServiceItem[]) ?? []
      )

      setLoading(false)
    }
  }

  load()

  return () => {
    cancelled = true
  }
}, [])

  const states = ['All', ...Array.from(new Set(branches.map((b) => b.state))).sort()]
  const filteredBranches = stateFilter === 'All' ? branches : branches.filter((b) => b.state === stateFilter)
  const featuredServices = services.slice(0, 6)

  return (
    <div className="overflow-hidden">
      {/* HERO / AUTOMOTIVE COCKPIT */}
      <section className="relative border-b border-white/[.05]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-[-12rem] top-[-10rem] h-[32rem] w-[32rem] rounded-full bg-amber-500/[.07] blur-3xl" />
          <div className="absolute right-[-10rem] top-20 h-[28rem] w-[28rem] rounded-full bg-teal-500/[.08] blur-3xl" />
          <div className="bayline-grid absolute inset-0 opacity-20" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-10 pt-10 sm:px-6 sm:pt-16 lg:pb-14">
          <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_.98fr]">
            <motion.div initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .65 }}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-graphite-600 bg-graphite-900/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 status-live" /> Vehicle service, reimagined
              </div>
              <h1 className="max-w-3xl font-display text-5xl leading-[.95] tracking-tight text-bone sm:text-6xl lg:text-[5.25rem]">
                Your car.<br />
                <span className="text-amber-500">Your bay.</span><br />
                Your time.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-bone/55 sm:text-lg">
                A modern vehicle service experience built around online booking, location-aware service centers, live bay status and AI-assisted recommendations.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/login">
                  <Button className="flex items-center gap-2 px-6 py-3 text-base">Book a service <ArrowRight size={18} /></Button>
                </Link>
                <a href="#centers"><Button variant="ghost" className="px-6 py-3 text-base">Explore centers</Button></a>
              </div>

              <div className="mt-9 grid grid-cols-3 gap-4 border-t border-graphite-700 pt-7">
                <Stat value={branches.length || 20} suffix="+" label="Service centers" />
                <Stat value={40000} suffix="+" label="Cars serviced" />
                <Stat value={48} suffix=" min" label="Avg. min to bay" />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7, delay: .1 }} className="relative">
              <div className="relative overflow-hidden rounded-[1.6rem] border border-graphite-600 bg-graphite-900 shadow-2xl shadow-black/40">
                <img src={HERO_IMG} alt="Mechanic servicing a car" className="h-[360px] w-full object-cover sm:h-[460px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/10 bg-graphite-950/75 p-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-[.2em] text-teal-400">Live service journey</p>
                      <p className="mt-1 font-display text-xl text-bone">Track every stage</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/15 text-teal-400"><BadgeCheck size={20} /></span>
                  </div>
                  <div className="mt-4 flex items-center gap-1">
                    {['Booked', 'Received', 'In service', 'Ready'].map((stage, i) => (
                      <div key={stage} className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${i < 2 ? 'bg-teal-400' : 'bg-graphite-600'}`} />
                        <span className="truncate text-[9px] uppercase tracking-wide text-bone/45">{stage}</span>
                        {i < 3 && <span className="hidden h-px flex-1 bg-graphite-600 sm:block" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -bottom-5 -left-4 hidden rounded-xl border border-graphite-600 bg-graphite-900/95 p-4 shadow-xl backdrop-blur sm:block">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"><Gauge size={18} /></span>
                  <div><p className="text-xs font-semibold text-bone">Bay availability</p><p className="text-[10px] text-bone/45">Updated from operations</p></div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          {/* QUICK ACTION COCKPIT */}
          <div className="relative mt-10 grid overflow-hidden rounded-2xl border border-graphite-700 bg-graphite-900/80 shadow-xl sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((action, i) => (
              <Link key={action.title} to={action.href} className={`group p-5 transition hover:bg-white/[.035] ${i < actions.length - 1 ? 'border-b sm:border-r sm:border-b-0 lg:border-b-0' : ''} border-graphite-700`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 transition group-hover:bg-amber-500 group-hover:text-graphite-950">{action.icon}</span>
                  <ChevronRight size={17} className="text-bone/20 transition group-hover:translate-x-1 group-hover:text-amber-400" />
                </div>
                <h3 className="mt-4 font-display text-lg text-bone">{action.title}</h3>
                <p className="mt-1 text-xs leading-5 text-bone/40">{action.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <FadeIn>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-xs font-mono uppercase tracking-[.2em] text-amber-500">Workshop menu</p><h2 className="mt-2 font-display text-4xl text-bone sm:text-5xl">Service, without the guesswork.</h2></div>
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300">View booking flow <ArrowRight size={16} /></Link>
          </div>
        </FadeIn>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(loading ? Array.from({ length: 6 }) : featuredServices).map((s, i) => {
            const svc = s as ServiceItem | undefined
            return <FadeIn key={svc?.id ?? i} delay={i * .05}>
              <Link to="/login" className="group block h-full">
                <Card className="h-full border-graphite-700 transition duration-300 group-hover:-translate-y-1 group-hover:border-amber-500/40 group-hover:bg-graphite-800/70">
                  <div className="flex items-start justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 transition group-hover:bg-amber-500 group-hover:text-graphite-950">{svc ? (SERVICE_ICONS[svc.name] ?? <Wrench className="h-6 w-6" />) : <Wrench className="h-6 w-6" />}</span><ArrowRight size={17} className="text-bone/15 transition group-hover:translate-x-1 group-hover:text-amber-400" /></div>
                  <h3 className="mt-5 font-display text-xl text-bone">{svc?.name ?? 'Loading…'}</h3>
                  <p className="mt-2 text-sm leading-6 text-bone/45">{svc?.description ?? 'Loading service details…'}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-graphite-700 pt-4"><span className="flex items-center gap-1.5 text-xs text-bone/35"><Clock3 size={13} /> {svc ? `${svc.duration_minutes} min` : '—'}</span><span className="font-display text-lg text-amber-500">{svc ? `₹${svc.price}` : '—'}</span></div>
                </Card>
              </Link>
            </FadeIn>
          })}
        </div>
      </section>

      {/* MY GARAGE EXPERIENCE */}
      <section className="border-y border-graphite-700 bg-graphite-950/70 py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-6 lg:grid-cols-2">
          <FadeIn>
            <div className="rounded-[1.5rem] border border-graphite-700 bg-gradient-to-br from-graphite-800 to-graphite-900 p-6 shadow-xl sm:p-8">
              <div className="flex items-center justify-between border-b border-graphite-700 pb-5"><div><p className="font-mono text-[9px] uppercase tracking-[.2em] text-amber-500">My Garage</p><h3 className="mt-1 font-display text-2xl text-bone">Your vehicle dashboard</h3></div><Car className="text-amber-500" size={25} /></div>
              <div className="mt-6 rounded-xl border border-graphite-700 bg-graphite-950/70 p-5">
                <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-bone/35">Primary vehicle</p><p className="mt-1 font-display text-2xl text-bone">Your car</p></div><span className="rounded-md border border-graphite-600 px-2 py-1 font-mono text-[9px] text-bone/40">GARAGE</span></div>
                <div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-lg bg-graphite-800 p-3"><p className="text-[9px] uppercase text-bone/30">Bookings</p><p className="mt-1 text-sm text-bone">Live</p></div><div className="rounded-lg bg-graphite-800 p-3"><p className="text-[9px] uppercase text-bone/30">History</p><p className="mt-1 text-sm text-bone">Saved</p></div><div className="rounded-lg bg-graphite-800 p-3"><p className="text-[9px] uppercase text-bone/30">Status</p><p className="mt-1 text-sm text-teal-400">Tracked</p></div></div>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={.08}>
            <p className="text-xs font-mono uppercase tracking-[.2em] text-teal-400">One place for your car</p>
            <h2 className="mt-2 font-display text-4xl text-bone sm:text-5xl">Build your digital garage.</h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-bone/50">Save your vehicles, access bookings, review service history and move into the next service without starting from zero.</p>
            <div className="mt-7 space-y-3">
              {['Vehicle profiles in one place', 'Booking and service history', 'Live booking status', 'Faster repeat service booking'].map((item) => <div key={item} className="flex items-center gap-3 text-sm text-bone/65"><CheckCircle2 size={17} className="text-teal-400" /> {item}</div>)}
            </div>
            <Link to="/login" className="mt-8 inline-block"><Button className="flex items-center gap-2">Open My Garage <ArrowRight size={17} /></Button></Link>
          </FadeIn>
        </div>
      </section>

      {/* SERVICE JOURNEY */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <FadeIn><p className="text-xs font-mono uppercase tracking-[.2em] text-amber-500">The BayLine flow</p><h2 className="mt-2 font-display text-4xl text-bone sm:text-5xl">From booking to pickup.</h2></FadeIn>
        <div className="mt-10 grid gap-3 md:grid-cols-5">
          {[
            ['01', 'Choose', 'Vehicle + service'], ['02', 'Book', 'Center + slot'], ['03', 'Receive', 'Vehicle enters bay'], ['04', 'Service', 'Live status updates'], ['05', 'Collect', 'Ready for pickup'],
          ].map(([num, title, text], i) => <FadeIn key={num} delay={i * .06}><div className="relative h-full rounded-xl border border-graphite-700 bg-graphite-900/70 p-5"><span className="font-mono text-[10px] text-amber-500">{num}</span><h3 className="mt-5 font-display text-xl text-bone">{title}</h3><p className="mt-1 text-xs text-bone/40">{text}</p></div></FadeIn>)}
        </div>
      </section>

      {/* AI + CARE */}
      <section id="care" className="border-y border-graphite-700 bg-graphite-950/60 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <FadeIn><div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-graphite-900 p-6 lg:col-span-2"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400"><Bot size={23} /></div><p className="mt-6 text-xs font-mono uppercase tracking-[.2em] text-amber-500">BayLine AI</p><h2 className="mt-2 font-display text-3xl text-bone sm:text-4xl">Describe the problem. Start with a direction.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-bone/45">The booking flow can use vehicle details, mileage and your complaint to generate an AI-assisted service recommendation and priority signal.</p><Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm text-amber-400">Try it in booking <ArrowRight size={16} /></Link></div>
            <div className="rounded-2xl border border-graphite-700 bg-graphite-900 p-6"><BookOpen className="text-teal-400" size={24} /><p className="mt-6 text-xs font-mono uppercase tracking-[.2em] text-teal-400">Car care</p><h3 className="mt-2 font-display text-2xl text-bone">Know your car better.</h3><p className="mt-3 text-sm leading-6 text-bone/45">A dedicated space for service guidance, maintenance education and practical ownership tips.</p><a href="#enquiry" className="mt-6 inline-flex items-center gap-2 text-sm text-teal-400">Ask an advisor <ArrowRight size={16} /></a></div>
          </div></FadeIn>
        </div>
      </section>

      {/* CENTERS */}
      <section id="centers" className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <FadeIn><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-mono uppercase tracking-[.2em] text-amber-500">Network</p><h2 className="mt-2 font-display text-4xl text-bone sm:text-5xl">Find your service center.</h2></div><p className="max-w-md text-sm leading-6 text-bone/40">Explore branches by state. Select a card or map marker to see the location details.</p></div></FadeIn>
        <FadeIn delay={.05} className="mt-8"><div className="flex flex-wrap gap-2">{states.map((state) => <button key={state} onClick={() => { setStateFilter(state); setActiveBranchId(null) }} className={`rounded-full border px-4 py-2 text-xs transition ${stateFilter === state ? 'border-amber-500 bg-amber-500 text-graphite-950' : 'border-graphite-700 bg-graphite-900 text-bone/45 hover:border-graphite-500 hover:text-bone'}`}>{state === 'All' ? 'All states' : state}</button>)}</div></FadeIn>
        <div className="mt-7 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <FadeIn><BranchesMap branches={filteredBranches} activeBranchId={activeBranchId} onSelect={(b) => setActiveBranchId(b.id)} /></FadeIn>
          <div className="grid max-h-[500px] gap-3 overflow-y-auto pr-1">
            {(loading ? Array.from({ length: 4 }) : filteredBranches).map((b, i) => { const branch = b as Branch | undefined; const active = branch?.id === activeBranchId; return <FadeIn key={branch?.id ?? i} delay={i * .03}><button onClick={() => branch && setActiveBranchId(branch.id)} className={`w-full rounded-xl border p-4 text-left transition ${active ? 'border-amber-500 bg-amber-500/10' : 'border-graphite-700 bg-graphite-900/70 hover:border-graphite-500'}`}><div className="flex gap-3"><img src={CENTER_IMG_POOL[i % CENTER_IMG_POOL.length]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" /><div className="min-w-0"><p className="truncate font-display text-base text-bone">{branch?.name ?? 'Loading…'}</p><p className="mt-1 flex gap-1 text-xs text-bone/40"><MapPin size={12} className="mt-0.5 shrink-0" /><span className="truncate">{branch ? `${branch.address}, ${branch.city}, ${branch.state}` : ''}</span></p>{branch?.phone && <p className="mt-1 flex items-center gap-1 text-xs text-bone/40"><Phone size={12} />{branch.phone}</p>}</div></div></button></FadeIn> })}
            {!loading && filteredBranches.length === 0 && <p className="rounded-xl border border-graphite-700 p-6 text-center text-sm text-bone/40">No centers in {stateFilter} yet.</p>}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-y border-graphite-700 bg-graphite-950/60 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6"><FadeIn><p className="text-center text-xs font-mono uppercase tracking-[.2em] text-teal-400">Driver stories</p><h2 className="mt-2 text-center font-display text-4xl text-bone sm:text-5xl">A service experience people remember.</h2></FadeIn><div className="mt-10 grid gap-5 md:grid-cols-3">{TESTIMONIALS.map((t, i) => <FadeIn key={t.name} delay={i * .08}><Card className="h-full"><div className="flex gap-1 text-amber-500">{Array.from({ length: 5 }).map((_, s) => <Star key={s} size={13} fill="currentColor" />)}</div><p className="mt-4 text-sm leading-6 text-bone/60">“{t.quote}”</p><div className="mt-5 flex items-center gap-2 border-t border-graphite-700 pt-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-graphite-700 text-bone/60"><Car size={14} /></span><div><p className="text-xs font-semibold text-bone">{t.name}</p><p className="text-[10px] text-bone/35">{t.car}</p></div></div></Card></FadeIn>)}</div></div>
      </section>

      {/* ROADSIDE / ENQUIRY */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24">
        <FadeIn><div className="mb-10 rounded-2xl border border-alert-500/20 bg-alert-500/[.04] p-6 sm:flex sm:items-center sm:justify-between sm:p-8"><div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-alert-500/10 text-alert-400"><Siren size={22} /></span><div><p className="text-xs font-mono uppercase tracking-[.2em] text-alert-400">Roadside assistance</p><h3 className="mt-1 font-display text-2xl text-bone">Need help before you reach a center?</h3><p className="mt-2 text-sm text-bone/45">Keep roadside assistance as a separate support path from scheduled workshop service.</p></div></div><a href="#enquiry" className="mt-5 inline-flex items-center gap-2 text-sm text-alert-400 sm:mt-0">Contact support <ArrowRight size={16} /></a></div></FadeIn>
        <div id="enquiry" className="mx-auto max-w-4xl"><FadeIn><p className="text-center text-xs font-mono uppercase tracking-[.2em] text-amber-500">Need a human first?</p><h2 className="mt-2 text-center font-display text-4xl text-bone sm:text-5xl">Talk to the service team.</h2><p className="mx-auto mt-3 max-w-xl text-center text-sm text-bone/45">Share your vehicle details and what you need. Your enquiry is saved for the staff workflow already built into BayLine.</p></FadeIn><FadeIn delay={.08} className="mt-9"><EnquiryForm branches={branches} /></FadeIn></div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6"><FadeIn><div className="relative overflow-hidden rounded-[1.5rem] border border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-graphite-800 to-teal-500/10 px-6 py-12 text-center sm:px-10"><div className="pointer-events-none absolute inset-0 bayline-grid opacity-20" /><div className="relative"><BatteryCharging className="mx-auto text-amber-400" size={25} /><h2 className="mt-4 font-display text-4xl text-bone sm:text-5xl">Ready when your car is.</h2><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-bone/50">Create your account, add a vehicle and enter the full BayLine booking experience.</p><Link to="/login" className="mt-7 inline-block"><Button className="flex items-center gap-2 px-6 py-3">Enter BayLine <ArrowRight size={17} /></Button></Link></div></div></FadeIn></section>

      
    </div>
  )
}
