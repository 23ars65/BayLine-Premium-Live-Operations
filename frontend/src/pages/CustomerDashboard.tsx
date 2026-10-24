import { FormEvent, useEffect, useMemo, useState } from 'react'

import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import {

  ArrowUpRight,
  CalendarCheck,
  CalendarDays,
  CarFront,
  ChevronRight,
  Clock3,
  Gauge,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,

} from 'lucide-react'

import { supabase } from '../lib/supabaseClient'

import { useAuth } from '../context/AuthContext'

import { Booking, Vehicle } from '../lib/types'

import {

  Button,

  Card,

  PlateBadge,

  StatusBadge,

} from '../components/UI'

export function CustomerDashboard() {

  const { profile } = useAuth()
  const prefersReducedMotion = useReducedMotion()
  const entranceTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
  const sectionVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition: { ...entranceTransition, staggerChildren: prefersReducedMotion ? 0 : 0.075 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 12 },
    visible: { opacity: 1, y: 0, transition: entranceTransition },
  }

  const [vehicles, setVehicles] =

    useState<Vehicle[]>([])

  const [bookings, setBookings] =

    useState<Booking[]>([])

  const [showAddVehicle, setShowAddVehicle] =

    useState(false)

  const [loading, setLoading] =

    useState(true)

  async function loadData() {

    if (!profile) return

    const [{ data: v }, { data: b }] =

      await Promise.all([

        supabase

          .from('vehicles')

          .select('*')

          .eq('owner_id', profile.id)

          .order('created_at', {

            ascending: false,

          }),

        supabase

          .from('bookings')

          .select(

            '*, vehicles(*), services(*), branches(*)'

          )

          .eq(

            'customer_id',

            profile.id

          )

          .order(

            'scheduled_start',

            {

              ascending: false,

            }

          ),

      ])

    setVehicles(

      (v as Vehicle[]) ?? []

    )

    setBookings(

      (b as Booking[]) ?? []

    )

    setLoading(false)

  }

  useEffect(() => {

    if (!profile) return

    loadData()

    const channel = supabase

      .channel('customer-bookings')

      .on(

        'postgres_changes',

        {

          event: '*',

          schema: 'public',

          table: 'bookings',

          filter: `customer_id=eq.${profile.id}`,

        },

        () => loadData()

      )

      .subscribe()

    return () => {

      supabase.removeChannel(

        channel

      )

    }

// eslint-disable-next-line react-hooks/exhaustive-deps*

  }, [profile])

  const upcoming = useMemo(

    () =>

      bookings.filter(

        (b) =>

          ![

            'cancelled',

            'completed',

          ].includes(b.status) &&

          new Date(

            b.scheduled_start

          ) >= new Date()

      ),

    [bookings]

  )

  const latest = upcoming[0]

  const completedCount =

    bookings.filter(

      (b) =>

        b.status === 'completed'

    ).length

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

  return (
    <main className="customer-dashboard mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9 lg:px-10">
      <motion.div
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        className="space-y-7"
      >
        <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/60">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d5ff45] shadow-[0_0_10px_#d5ff45]" />
              BAYLINE / CUSTOMER SPACE
            </div>
            <h1 className="text-3xl font-semibold tracking-[-.055em] text-white sm:text-4xl lg:text-5xl">
              Welcome back<span className="text-[#d5ff45]">,</span>{' '}
              {profile?.full_name?.split(' ')[0] || 'there'}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
              Your garage, service schedule and booking updates — all in one place.
            </p>
          </div>
          <Link to="/book" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#d5ff45] px-5 py-3 text-sm font-semibold text-[#11120f] transition duration-200 hover:-translate-y-0.5 hover:bg-[#e1ff79]">
            <Plus size={17} /> Book a service <ArrowUpRight size={16} />
          </Link>
        </header>

        <motion.section variants={itemVariants} className="grid gap-3 sm:grid-cols-3">
          <DashboardMetric label="Vehicles in garage" value={vehicles.length} icon={<CarFront size={18} />} detail="Your registered vehicles" />
          <DashboardMetric label="Upcoming services" value={upcoming.length} icon={<CalendarCheck size={18} />} detail={latest ? 'Next appointment scheduled' : 'No appointments scheduled'} />
          <DashboardMetric label="Services completed" value={completedCount} icon={<ShieldCheck size={18} />} detail="Your service history" />
        </motion.section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
          <motion.div
            variants={itemVariants}
            whileHover={prefersReducedMotion ? undefined : { y: -3, borderColor: 'rgba(213,255,69,0.22)' }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative overflow-hidden rounded-[28px] border border-white/[.09] bg-[#151613] p-5 sm:p-7 lg:p-8"
          >
            <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[#d5ff45]/[.07] blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/40">Your next stop</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white sm:text-3xl">{latest ? 'Service at a glance' : 'Ready for your next service?'}</h2>
              </div>
              {latest ? <StatusBadge status={latest.status} /> : <span className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/45">No active booking</span>}
            </div>
            {latest ? (
              <div className="relative mt-7 rounded-2xl border border-white/[.08] bg-black/20 p-4 sm:p-5">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#d5ff45]/10 text-[#d5ff45]"><Wrench size={21} /></div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold tracking-tight text-white sm:text-xl">{latest.services?.name || 'Vehicle service'}</h3>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-white/45"><MapPin size={14} />{latest.branches?.name || 'BayLine service centre'}{latest.branches?.city ? ` · ${latest.branches.city}` : ''}</p>
                      <p className="mt-3 flex items-center gap-2 text-xs text-white/55"><Clock3 size={14} className="text-[#d5ff45]" />{formatDate(latest.scheduled_start)}</p>
                    </div>
                  </div>
                  {latest.vehicles && <div className="sm:shrink-0"><PlateBadge plate={latest.vehicles.plate_number} /></div>}
                </div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4">
                  <span className="text-xs text-white/35">Booking updates appear here automatically</span>
                  <Link to="/book" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d5ff45] transition hover:gap-2.5">Manage service <ArrowUpRight size={14} /></Link>
                </div>
              </div>
            ) : (
              <div className="relative mt-7 rounded-2xl border border-dashed border-white/[.14] bg-black/15 p-5 sm:p-6">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#d5ff45]/10 text-[#d5ff45]"><Sparkles size={20} /></div>
                    <div><h3 className="font-semibold text-white">Give your vehicle some care</h3><p className="mt-1 max-w-md text-sm leading-5 text-white/45">Choose a service centre and book a convenient time in a few steps.</p></div>
                  </div>
                  <Link to="/book" className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-medium text-white transition hover:border-[#d5ff45]/60 hover:text-[#d5ff45]">Find a slot <ChevronRight size={16} /></Link>
                </div>
              </div>
            )}
          </motion.div>

          <motion.aside
            variants={itemVariants}
            whileHover={prefersReducedMotion ? undefined : { y: -3, borderColor: 'rgba(213,255,69,0.22)' }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="flex flex-col rounded-[28px] border border-white/[.09] bg-[#10110f] p-5 sm:p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-white/35">Your garage</p><h2 className="mt-1 text-xl font-semibold tracking-[-.04em] text-white">My vehicles</h2></div>
              <button onClick={() => setShowAddVehicle((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition hover:border-[#d5ff45]/50 hover:text-[#d5ff45]">
                {showAddVehicle ? 'Cancel' : <><Plus size={14} /> Add vehicle</>}
              </button>
            </div>
            <AnimatePresence initial={false}>
              {showAddVehicle && (
                <motion.div
                  key="add-vehicle-form"
                  initial={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : -6 }}
                  transition={entranceTransition}
                  className="mt-4 overflow-hidden"
                >
                  <AddVehicleForm onDone={() => { setShowAddVehicle(false); loadData() }} />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="mt-5 space-y-2.5">
              {vehicles.slice(0, 3).map((v, index) => (
                <motion.div key={v.id} layout initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 12 }} animate={{ opacity: 1, x: 0 }} transition={{ ...entranceTransition, delay: prefersReducedMotion ? 0 : index * 0.055 }} whileHover={prefersReducedMotion ? undefined : { x: 3 }} className="group flex items-center justify-between gap-3 rounded-2xl border border-white/[.07] bg-white/[.025] p-3.5 transition hover:border-white/[.15] hover:bg-white/[.04]">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[.06] text-white/70 transition group-hover:bg-[#d5ff45]/10 group-hover:text-[#d5ff45]"><CarFront size={19} /></div>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{v.year} {v.make} {v.model}</p><p className="mt-1 text-xs text-white/40">{v.vehicle_type || 'Vehicle'} · {Number.isFinite(v.mileage) ? `${v.mileage.toLocaleString()} km` : 'Mileage not added'}</p></div>
                  </div>
                  <span className="shrink-0 scale-[.88] origin-right"><PlateBadge plate={v.plate_number} /></span>
                </motion.div>
              ))}
              {!loading && vehicles.length === 0 && !showAddVehicle && <div className="rounded-2xl border border-dashed border-white/[.12] p-5 text-sm leading-6 text-white/40">Your garage is empty. Add your first vehicle to make booking faster.</div>}
              {vehicles.length > 3 && <p className="px-1 pt-1 text-xs text-white/35">+ {vehicles.length - 3} more {vehicles.length - 3 === 1 ? 'vehicle' : 'vehicles'} in your garage</p>}
              {loading && <div className="space-y-2"><div className="h-[68px] animate-pulse rounded-2xl bg-white/[.04]" /><div className="h-[68px] animate-pulse rounded-2xl bg-white/[.04]" /></div>}
            </div>
            <div className="mt-auto pt-5"><button onClick={() => setShowAddVehicle(true)} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[.09] py-3 text-sm text-white/55 transition hover:border-[#d5ff45]/40 hover:text-[#d5ff45]"><Plus size={15} /> Add another vehicle</button></div>
          </motion.aside>
        </section>

        <section>
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div><p className="text-[11px] font-semibold uppercase tracking-[.2em] text-white/35">All activity</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.045em] text-white sm:text-3xl">Booking history</h2><p className="mt-1 text-sm text-white/40">A clear view of your past and upcoming visits.</p></div>
            <span className="w-fit rounded-full border border-white/[.09] px-3 py-1.5 text-xs text-white/45">{bookings.length} {bookings.length === 1 ? 'booking' : 'bookings'}</span>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-white/[.09] bg-[#10110f]">
            {bookings.map((b, index) => (
              <motion.div key={b.id} layout initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...entranceTransition, delay: prefersReducedMotion ? 0 : Math.min(index * 0.035, 0.25) }} whileHover={prefersReducedMotion ? undefined : { backgroundColor: 'rgba(255,255,255,0.035)' }} className="flex flex-col justify-between gap-4 border-b border-white/[.065] px-4 py-4 transition last:border-b-0 hover:bg-white/[.025] sm:flex-row sm:items-center sm:px-5">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[.05] text-white/55"><Wrench size={17} /></div>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{b.services?.name || 'Vehicle service'}</p><p className="mt-1 truncate text-xs text-white/40">{b.branches?.name || 'Service centre'}{b.vehicles ? ` · ${b.vehicles.make} ${b.vehicles.model}` : ''}</p><p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/35"><CalendarDays size={12} />{formatDate(b.scheduled_start)}</p></div>
                </div>
                <div className="flex items-center justify-between gap-3 pl-[54px] sm:pl-0"><StatusBadge status={b.status} /><span className="text-[10px] font-mono text-white/25">#{String(b.id).slice(0, 8).toUpperCase()}</span></div>
              </motion.div>
            ))}
            {!loading && bookings.length === 0 && <div className="flex flex-col items-center px-5 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[.05] text-white/45"><CalendarCheck size={21} /></div><h3 className="mt-4 font-semibold text-white">No bookings yet</h3><p className="mt-1 max-w-sm text-sm text-white/40">Your service appointments will show up here once you book your first visit.</p><Link to="/book" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d5ff45] px-4 py-2.5 text-sm font-semibold text-[#11120f] transition hover:bg-[#e1ff79]">Book your first service <ArrowUpRight size={15} /></Link></div>}
            {loading && <div className="space-y-px p-4"><div className="h-16 animate-pulse rounded-xl bg-white/[.04]" /><div className="h-16 animate-pulse rounded-xl bg-white/[.04]" /><div className="h-16 animate-pulse rounded-xl bg-white/[.04]" /></div>}
          </div>
        </section>
      </motion.div>
    </main>
  )
}

function DashboardMetric({ label, value, icon, detail }: { label: string; value: number; icon: React.ReactNode; detail: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={{ y: -4, borderColor: 'rgba(213,255,69,0.28)' }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="group rounded-[22px] border border-white/[.09] bg-[#10110f] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-white/45">{label}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[.07] bg-white/[.035] text-[#d5ff45] transition group-hover:border-[#d5ff45]/20 group-hover:bg-[#d5ff45]/10">{icon}</span>
      </div>
      <div className="mt-4 flex items-end justify-between gap-2"><span className="text-3xl font-semibold tracking-[-.06em] text-white sm:text-4xl">{value}</span><Gauge size={16} className="mb-1 text-white/15" /></div>
      <p className="mt-2 text-xs text-white/35">{detail}</p>
    </motion.div>
  )
}

function AddVehicleForm({
  onDone,
}: {
  onDone: () => void
}) {
  const { profile } = useAuth()

  const carCompanies = [
    'Maruti Suzuki', 'Hyundai', 'Tata', 'Mahindra', 'Toyota',
    'Honda', 'Kia', 'Volkswagen', 'Skoda', 'Renault', 'Nissan',
    'MG', 'Jeep', 'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'BYD',
    'Citroen', 'Force Motors', 'Isuzu', 'Lexus', 'Porsche', 'Jaguar',
    'Land Rover', 'Fiat', 'Chevrolet', 'Ford', 'Other',
  ]

  const bikeCompanies = [
    'Hero', 'Honda', 'TVS', 'Bajaj', 'Royal Enfield', 'Yamaha',
    'Suzuki', 'KTM', 'Kawasaki', 'Triumph', 'Harley-Davidson',
    'Ducati', 'Aprilia', 'BMW Motorrad', 'Jawa', 'Yezdi', 'Other',
  ]

  const carCategories = [
    'Hatchback', 'Sedan', 'SUV', 'MUV/MPV', 'Coupe',
    'Convertible', 'Pickup', '4x4', 'Other',
  ]

  const [vehicleKind, setVehicleKind] = useState('Car')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [plate, setPlate] = useState('')
  const [vin, setVin] = useState('')
  const [category, setCategory] = useState('SUV')
  const [mileage, setMileage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fieldClass =
    'w-full rounded-xl border border-graphite-700 bg-graphite-900 px-3 py-2.5 text-sm text-bone outline-none focus:border-amber-500'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!profile || saving) return

    setError(null)

    const yearNumber = Number(year)
    const mileageNumber = Number(mileage)
    const registration = plate.trim().toUpperCase()

    if (
      !Number.isInteger(yearNumber) ||
      yearNumber < 1900 ||
      yearNumber > new Date().getFullYear() + 1
    ) {
      setError('Please enter a valid manufacturing year.')
      return
    }

    if (
      mileage.trim() === '' ||
      !Number.isFinite(mileageNumber) ||
      !Number.isInteger(mileageNumber) ||
      mileageNumber < 0
    ) {
      setError('Enter total kilometres driven as a whole number.')
      return
    }

    if (!make.trim() || !model.trim() || !registration) {
      setError('Please complete the company, model and registration number.')
      return
    }

    setSaving(true)
    try {
      const { error: saveError } = await supabase
        .from('vehicles')
        .insert({
          owner_id: profile.id,
          make: make.trim(),
          model: model.trim(),
          year: yearNumber,
          plate_number: registration,
          vin: vin.trim() || null,
          vehicle_type: vehicleKind,
          body_type: vehicleKind === 'Car' ? category : null,
          mileage: mileageNumber,
        })

      if (saveError) {
        setError(saveError.message)
        return
      }

      onDone()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save the vehicle. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, y: 10 }}
      animate={{ opacity: 1, height: 'auto', y: 0 }}
      exit={{ opacity: 0, height: 0, y: 8 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="bl-add-vehicle-wrap mb-4 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="bl-add-vehicle-form">
        <div className="bl-vehicle-form-heading">
          <div className="bl-vehicle-form-icon"><CarFront size={21} /></div>
          <div className="min-w-0 flex-1">
            <p className="bl-eyebrow">YOUR GARAGE</p>
            <h3>Add a vehicle</h3>
            <p>Save your vehicle details once to make future bookings faster.</p>
          </div>
          <span className="bl-form-step">01 <span>/ 03</span></span>
        </div>

        <div className="bl-vehicle-type-picker" role="group" aria-label="Choose vehicle type">
          <button
            type="button"
            aria-pressed={vehicleKind === 'Car'}
            onClick={() => { setVehicleKind('Car'); setMake('') }}
            className={`bl-vehicle-type-option ${vehicleKind === 'Car' ? 'is-active' : ''}`}
          >
            <CarFront size={20} />
            <span><strong>Car</strong><small>Four-wheeler</small></span>
            <span className="bl-type-radio" />
          </button>
          <button
            type="button"
            aria-pressed={vehicleKind === 'Bike'}
            onClick={() => { setVehicleKind('Bike'); setMake('') }}
            className={`bl-vehicle-type-option ${vehicleKind === 'Bike' ? 'is-active' : ''}`}
          >
            <span className="bl-bike-symbol">⌁</span>
            <span><strong>Bike</strong><small>Two-wheeler</small></span>
            <span className="bl-type-radio" />
          </button>
        </div>

        <div className="bl-form-section-label"><span>Vehicle details</span><span>Required fields *</span></div>
        <div className="bl-vehicle-fields">
          <div className="bl-field">
            <label htmlFor="vehicle-make">Company / make <span>*</span></label>
            <select id="vehicle-make" required value={make} onChange={(e) => setMake(e.target.value)} className={fieldClass}>
              <option value="">Select company</option>
              {(vehicleKind === 'Car' ? carCompanies : bikeCompanies).map((company) => <option key={company} value={company}>{company}</option>)}
            </select>
          </div>
          <div className="bl-field">
            <label htmlFor="vehicle-model">Model name <span>*</span></label>
            <input id="vehicle-model" required placeholder={vehicleKind === 'Car' ? 'e.g. Creta, Nexon, Swift' : 'e.g. Classic 350, R15'} value={model} onChange={(e) => setModel(e.target.value)} className={fieldClass} />
          </div>
          {vehicleKind === 'Car' && (
            <div className="bl-field">
              <label htmlFor="vehicle-category">Body type</label>
              <select id="vehicle-category" value={category} onChange={(e) => setCategory(e.target.value)} className={fieldClass}>
                {carCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          )}
          <div className="bl-field">
            <label htmlFor="vehicle-year">Manufacturing year <span>*</span></label>
            <input id="vehicle-year" required type="number" min="1900" max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(e.target.value)} className={fieldClass} />
          </div>
          <div className="bl-field bl-field-wide">
            <label htmlFor="vehicle-plate">Registration number <span>*</span></label>
            <input id="vehicle-plate" required placeholder="e.g. MH12AB1234" autoComplete="off" value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className={`${fieldClass} bl-registration-input`} />
            <small>Enter the number exactly as shown on your number plate.</small>
          </div>
          <div className="bl-field bl-field-wide">
            <label htmlFor="vehicle-mileage">Odometer reading <span>*</span></label>
            <div className="bl-input-with-suffix">
              <input id="vehicle-mileage" required type="number" min="0" step="1" placeholder="e.g. 45000" value={mileage} onChange={(e) => setMileage(e.target.value)} className={fieldClass} />
              <span>KM</span>
            </div>
            <small>Current total kilometres driven.</small>
          </div>
          <div className="bl-field bl-field-wide">
            <label htmlFor="vehicle-vin">VIN / chassis number <span className="bl-optional">Optional</span></label>
            <input id="vehicle-vin" placeholder="Enter VIN if available" autoComplete="off" value={vin} onChange={(e) => setVin(e.target.value)} className={`${fieldClass} bl-registration-input`} />
          </div>
        </div>

        {error && <p role="alert" className="bl-vehicle-form-error">{error}</p>}

        <div className="bl-vehicle-form-footer">
          <p><ShieldCheck size={15} /> Your vehicle details are saved securely to your account.</p>
          <button type="submit" disabled={saving} className="bl-save-vehicle-button">
            {saving ? <><span className="bl-button-spinner" /> Saving vehicle…</> : <>Save vehicle <ArrowUpRight size={16} /></>}
          </button>
        </div>
      </form>
    </motion.div>
  )
}
