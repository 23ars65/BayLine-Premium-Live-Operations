import { useEffect, useMemo, useState } from 'react'
import { useRazorpay } from 'react-razorpay'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  Clock3,
  MapPin,
  Search,
  CarFront,
  Wrench,
  CalendarDays,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Bay, Booking, Branch, ServiceItem, Vehicle } from '../lib/types'
import { Button, Card } from '../components/UI'
import { BranchesMap } from '../components/BranchesMap'

interface Slot {
  start: Date
  end: Date
  freeBays: string[]
}

export function NewBooking() {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [branches, setBranches] = useState<Branch[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])

  const [branchId, setBranchId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [date, setDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )

  const [bays, setBays] = useState<Bay[]>([])
  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [mapQuery, setMapQuery] = useState('')
  const [stateFilter, setStateFilter] = useState('All')
  const [confirmed, setConfirmed] = useState(false)

  // =========================================================
  // RAZORPAY / BILLING STATE
  // =========================================================

  const { Razorpay, isLoading: razorpayLoaded } = useRazorpay()

  const [showBill, setShowBill] = useState(false)
  const [pendingSlot, setPendingSlot] = useState<Slot | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // =========================================================
  // AI STATE
  // =========================================================

  const [complaint, setComplaint] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(
    null
  )
  const [aiConfidence, setAiConfidence] = useState<number | null>(null)
  const [aiPriority, setAiPriority] = useState<string | null>(null)
  const [aiPriorityConfidence, setAiPriorityConfidence] = useState<number | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  const selectedBranch = branches.find((b) => b.id === branchId)
  const selectedService = services.find((s) => s.id === serviceId)
  const selectedVehicle = vehicles.find((v) => v.id === vehicleId)

  // =========================================================
  // LOAD BRANCHES, SERVICES AND VEHICLES
  // =========================================================

  useEffect(() => {
    async function load() {
      const [{ data: b }, { data: s }, { data: v }] = await Promise.all([
        supabase
          .from('branches')
          .select('*')
          .order('state')
          .order('city'),

        supabase
          .from('services')
          .select('*')
          .eq('active', true)
          .order('price'),

        profile
          ? supabase
              .from('vehicles')
              .select('*')
              .eq('owner_id', profile.id)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as Vehicle[] }),
      ])

      const branchRows = (b as Branch[]) ?? []

      setBranches(branchRows)
      setServices((s as ServiceItem[]) ?? [])
      setVehicles((v as Vehicle[]) ?? [])

      if (branchRows.length) {
        setBranchId(branchRows[0].id)
      }
    }

    load()
  }, [profile])

  // =========================================================
  // LOAD LIVE AVAILABILITY
  // =========================================================

  useEffect(() => {
    if (!branchId) return

    async function loadAvailability() {
      const [{ data: bayData }, { data: bookingData }] = await Promise.all([
        supabase
          .from('bays')
          .select('*')
          .eq('branch_id', branchId)
          .order('bay_number'),

        supabase
          .from('bookings')
          .select('*')
          .eq('branch_id', branchId)
          .gte('scheduled_start', `${date}T00:00:00`)
          .lt('scheduled_start', `${date}T23:59:59`)
          .not('status', 'in', '("cancelled")'),
      ])

      setBays((bayData as Bay[]) ?? [])
      setDayBookings((bookingData as Booking[]) ?? [])
    }

    loadAvailability()

    const channel = supabase
      .channel(`branch-availability-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `branch_id=eq.${branchId}`,
        },
        () => loadAvailability()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [branchId, date])

  // =========================================================
  // CALCULATE AVAILABLE SLOTS
  // =========================================================

  const slots: Slot[] = useMemo(() => {
    if (!selectedBranch || !selectedService || bays.length === 0) {
      return []
    }

    const duration = selectedService.duration_minutes

    const [openH, openM] = selectedBranch.opens_at
      .split(':')
      .map(Number)

    const [closeH, closeM] = selectedBranch.closes_at
      .split(':')
      .map(Number)

    const dayStart = new Date(`${date}T00:00:00`)

    const rangeStart = new Date(dayStart)
    rangeStart.setHours(openH, openM, 0, 0)

    const rangeEnd = new Date(dayStart)
    rangeEnd.setHours(closeH, closeM, 0, 0)

    const result: Slot[] = []

    for (
      let t = new Date(rangeStart);
      t < rangeEnd;
      t = new Date(t.getTime() + 30 * 60000)
    ) {
      const slotStart = new Date(t)
      const slotEnd = new Date(
        t.getTime() + duration * 60000
      )

      if (slotEnd > rangeEnd) continue

      const freeBays = bays.filter(
        (bay) =>
          !dayBookings.some((bk) => {
            if (bk.bay_id !== bay.id) return false

            const bkStart = new Date(bk.scheduled_start)
            const bkEnd = new Date(bk.scheduled_end)

            return (
              slotStart < bkEnd &&
              slotEnd > bkStart
            )
          })
      )

      if (slotStart > new Date()) {
        result.push({
          start: slotStart,
          end: slotEnd,
          freeBays: freeBays.map((b) => b.id),
        })
      }
    }

    return result
  }, [
    selectedBranch,
    selectedService,
    bays,
    dayBookings,
    date,
  ])

  // =========================================================
  // MAP FILTERS
  // =========================================================

  const states = useMemo(
    () => [
      'All',
      ...Array.from(
        new Set(branches.map((b) => b.state))
      ).sort(),
    ],
    [branches]
  )

  const mapBranches = useMemo(
    () =>
      branches.filter((b) => {
        const matchesState =
          stateFilter === 'All' ||
          b.state === stateFilter

        const q = mapQuery.trim().toLowerCase()

        const matchesQuery =
          !q ||
          `${b.name} ${b.city} ${b.state} ${b.address}`
            .toLowerCase()
            .includes(q)

        return matchesState && matchesQuery
      }),
    [branches, stateFilter, mapQuery]
  )

  // =========================================================
  // AI VEHICLE PROBLEM ANALYSIS
  // =========================================================

  async function analyzeVehicleProblem() {
    if (!selectedVehicle) {
      setAiError('Please select a vehicle first.')
      return
    }

    if (!complaint.trim()) {
      setAiError(
        'Please describe the problem with your vehicle.'
      )
      return
    }

    setAiLoading(true)
    setAiError(null)
    setAiRecommendation(null)
    setAiConfidence(null)
    setAiPriority(null)
    setAiPriorityConfidence(null)

    try {
      // Calculate vehicle age from the vehicle year
      const vehicleAge =
        new Date().getFullYear() -
        selectedVehicle.year

      const response = await fetch(
        'http://127.0.0.1:5000/predict',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vehicle_type: selectedVehicle.vehicle_type,
            vehicle_age: vehicleAge,
            mileage: selectedVehicle.mileage,
            complaint: complaint.trim(),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(
          'AI service is unavailable.'
        )
      }

      const result = await response.json()

      setAiRecommendation(result.service)
      setAiConfidence(result.service_confidence ?? result.confidence)
      setAiPriority(result.priority ?? null)
      setAiPriorityConfidence(result.priority_confidence ?? null)
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Unable to contact the AI service.'
      )
    } finally {
      setAiLoading(false)
    }
  }

  // =========================================================
  // APPLY AI RECOMMENDATION
  // =========================================================

  function useAIRecommendation() {
    if (!aiRecommendation) return

    const recommendedService =
      services.find(
        (service) =>
          service.name.toLowerCase() ===
          aiRecommendation.toLowerCase()
      )

    if (recommendedService) {
      setServiceId(recommendedService.id)
      setAiError(null)
    } else {
      setAiError(
        `The recommended service "${aiRecommendation}" is not currently available.`
      )
    }
  }

  // =========================================================
  // BOOK SERVICE / BILLING / PAYMENT
  // =========================================================

  async function handleBook(slot: Slot) {
    if (
      !profile ||
      !vehicleId ||
      !serviceId ||
      !branchId ||
      !slot.freeBays.length
    ) {
      return
    }

    setError(null)
    setPaymentError(null)
    setPendingSlot(slot)
    setShowBill(true)
  }

  async function createBookingAfterPayment() {
    if (
      !profile ||
      !pendingSlot ||
      !vehicleId ||
      !serviceId ||
      !branchId ||
      !pendingSlot.freeBays.length
    ) {
      throw new Error('Booking information is incomplete.')
    }

    for (const bayId of pendingSlot.freeBays) {
      const { error: insertError } =
        await supabase.from('bookings').insert({
          customer_id: profile.id,
          vehicle_id: vehicleId,
          branch_id: branchId,
          service_id: serviceId,
          bay_id: bayId,
          scheduled_start: pendingSlot.start.toISOString(),
          scheduled_end: pendingSlot.end.toISOString(),
          status: 'confirmed',
        })

      if (!insertError) {
        setShowBill(false)
        setPendingSlot(null)
        setConfirmed(true)

        window.setTimeout(() => navigate('/dashboard'), 1500)
        return
      }

      if (insertError.code !== '23P01') {
        throw new Error(insertError.message)
      }
    }

    throw new Error(
      'That slot was just taken. Your payment was not converted into a booking. Please contact BayLine support before trying again.'
    )
  }

  async function handlePayment() {
    if (!selectedService || !pendingSlot) {
      setPaymentError('Please select a service and time slot first.')
      return
    }

    if (!razorpayLoaded || !Razorpay) {
      setPaymentError(
        'Payment gateway is still loading. Please try again in a moment.'
      )
      return
    }

    setPaymentLoading(true)
    setPaymentError(null)

    try {
      // Create the Razorpay order through the Flask backend.
      const orderResponse = await fetch(
        'http://127.0.0.1:5000/create-payment-order',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: Number(selectedService.price),
          }),
        }
      )

      const orderData = await orderResponse.json()

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(
          orderData.error || 'Unable to create payment order.'
        )
      }

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'BayLine',
        description: `${selectedService.name} — ${selectedVehicle?.plate_number ?? 'Vehicle Service'}`,
        order_id: orderData.order_id,

        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          try {
            const verifyResponse = await fetch(
              'http://127.0.0.1:5000/verify-payment',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_payment_id:
                    response.razorpay_payment_id,
                  razorpay_order_id:
                    response.razorpay_order_id,
                  razorpay_signature:
                    response.razorpay_signature,
                }),
              }
            )

            const verifyData = await verifyResponse.json()

            if (!verifyResponse.ok || !verifyData.verified) {
              throw new Error(
                verifyData.error ||
                  'Payment verification failed.'
              )
            }

            await createBookingAfterPayment()
          } catch (err) {
            setPaymentError(
              err instanceof Error
                ? err.message
                : 'Payment verification failed.'
            )
            setPaymentLoading(false)
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoading(false)
          },
        },

        theme: {
          color: '#E8961F',
        },
      }

      const razorpay = new Razorpay(options)

      razorpay.on(
        'payment.failed',
        (response: {
          error?: {
            description?: string
          }
        }) => {
          setPaymentError(
            response.error?.description ||
              'Payment failed. Please try again.'
          )
          setPaymentLoading(false)
        }
      )

      razorpay.open()
    } catch (err) {
      setPaymentError(
        err instanceof Error
          ? err.message
          : 'Unable to start payment.'
      )
      setPaymentLoading(false)
    }
  }

  // =========================================================
  // SERVICE ICON
  // =========================================================

  const serviceIcon = (name: string) => {
    if (/oil/i.test(name)) return '◉'
    if (/brake/i.test(name)) return '◈'
    if (/wheel|alignment/i.test(name)) return '◎'
    if (/ac|air/i.test(name)) return '◇'
    if (/battery/i.test(name)) return '⚡'

    return '✦'
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-[calc(100vh-72px)]">

      {/* =====================================================
          MAP MODAL
      ===================================================== */}

      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-6">

          <div className="bayline-modal w-full max-w-6xl overflow-hidden rounded-2xl border border-graphite-600 bg-graphite-950 shadow-2xl">

            <div className="flex items-center justify-between border-b border-graphite-700 px-5 py-4">

              <div>
                <p className="text-[10px] font-mono uppercase tracking-[.2em] text-amber-500">
                  Location
                </p>

                <h2 className="font-display text-xl text-bone">
                  Find a BayLine center
                </h2>
              </div>

              <button
                onClick={() =>
                  setShowMap(false)
                }
                className="rounded-lg border border-graphite-700 p-2 text-bone/60 hover:text-bone"
              >
                <X size={18} />
              </button>

            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-[1fr_300px]">

              <div className="order-2 lg:order-1">
                <BranchesMap
                  branches={mapBranches}
                  activeBranchId={branchId}
                  selectable
                  onSelect={(b) => {
                    setBranchId(b.id)
                    setShowMap(false)
                    setMapQuery('')
                  }}
                  height="560px"
                />
              </div>

              <div className="order-1 flex flex-col gap-3 lg:order-2">

                <div className="flex items-center gap-2 rounded-xl border border-graphite-700 bg-graphite-900 px-3 py-2.5">

                  <Search
                    size={16}
                    className="text-bone/40"
                  />

                  <input
                    value={mapQuery}
                    onChange={(e) =>
                      setMapQuery(e.target.value)
                    }
                    placeholder="Search city or center..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-bone/30"
                  />

                </div>

                <select
                  value={stateFilter}
                  onChange={(e) =>
                    setStateFilter(e.target.value)
                  }
                  className="rounded-xl border border-graphite-700 bg-graphite-900 px-3 py-2.5 text-sm outline-none focus:border-amber-500"
                >
                  {states.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>

                <div className="max-h-[470px] space-y-2 overflow-y-auto pr-1">

                  {mapBranches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBranchId(b.id)
                        setShowMap(false)
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        b.id === branchId
                          ? 'border-amber-500/60 bg-amber-500/10'
                          : 'border-graphite-700 bg-graphite-900 hover:border-graphite-500'
                      }`}
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>
                          <p className="text-sm font-semibold text-bone">
                            {b.name}
                          </p>

                          <p className="mt-1 text-xs text-bone/45">
                            {b.city}, {b.state}
                          </p>
                        </div>

                        {b.id === branchId && (
                          <Check
                            size={16}
                            className="text-amber-400"
                          />
                        )}

                      </div>

                    </button>
                  ))}

                  {!mapBranches.length && (
                    <p className="p-5 text-center text-sm text-bone/40">
                      No centers match that search.
                    </p>
                  )}

                </div>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          BILLING / RAZORPAY
      ===================================================== */}

      {showBill && pendingSlot && selectedService && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 sm:p-6">
          <div className="bayline-modal w-full max-w-lg overflow-hidden rounded-3xl border border-graphite-600 bg-graphite-950 shadow-2xl">
            <div className="border-b border-graphite-700 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[.2em] text-amber-500">
                    BayLine billing
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-bone">
                    Review & pay
                  </h2>
                  <p className="mt-2 text-sm text-bone/45">
                    Confirm your service details before opening the secure
                    Razorpay checkout.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={paymentLoading}
                  onClick={() => {
                    setShowBill(false)
                    setPendingSlot(null)
                    setPaymentError(null)
                  }}
                  className="rounded-lg border border-graphite-700 p-2 text-bone/60 transition hover:text-bone disabled:opacity-40"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-2xl border border-graphite-700 bg-graphite-900/70 p-4">
                <p className="text-[10px] font-mono uppercase tracking-widest text-bone/30">
                  Service appointment
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-bone/40">Center</span>
                    <span className="max-w-[250px] text-right text-bone">
                      {selectedBranch?.name ?? '—'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-bone/40">Service</span>
                    <span className="text-right text-bone">
                      {selectedService.name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-bone/40">Vehicle</span>
                    <span className="text-right text-bone">
                      {selectedVehicle?.plate_number ?? '—'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-bone/40">Date</span>
                    <span className="text-right text-bone">
                      {date}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-bone/40">Time</span>
                    <span className="text-right text-bone">
                      {pendingSlot.start.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' – '}
                      {pendingSlot.end.toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-widest text-bone/35">
                      Total payable
                    </p>
                    <p className="mt-1 text-sm text-bone/50">
                      {selectedService.name}
                    </p>
                  </div>

                  <p className="font-display text-3xl text-amber-400">
                    ₹{Number(selectedService.price).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {paymentError && (
                <div className="rounded-xl border border-alert-500/30 bg-alert-500/10 p-3 text-xs leading-5 text-alert-300">
                  {paymentError}
                </div>
              )}

              <button
                type="button"
                onClick={handlePayment}
                disabled={paymentLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-4 text-sm font-bold text-graphite-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentLoading
                  ? 'Processing payment...'
                  : `Pay ₹${Number(selectedService.price).toLocaleString('en-IN')}`}
              </button>

              <p className="text-center text-[10px] leading-5 text-bone/30">
                Test Mode is active. This project is using Razorpay sandbox
                payments; no live payment should be processed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          BOOKING CONFIRMATION
      ===================================================== */}

      {confirmed && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6">

          <div className="bayline-modal max-w-md rounded-3xl border border-teal-500/30 bg-graphite-900 p-8 text-center shadow-2xl">

            <div className="success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/15 text-teal-300">
              <Check size={32} />
            </div>

            <p className="mt-5 text-xs font-mono uppercase tracking-[.2em] text-teal-300">
              Booking confirmed
            </p>

            <h2 className="mt-2 font-display text-3xl">
              You're all set.
            </h2>

            <p className="mt-3 text-sm leading-6 text-bone/50">
              {selectedBranch?.name} ·{' '}
              {selectedService?.name}
              <br />
              {date} ·{' '}
              {selectedVehicle?.plate_number}
            </p>

          </div>

        </div>
      )}

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">

        {/* HEADER */}

        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">

          <div>

            <p className="text-xs font-mono uppercase tracking-[.22em] text-amber-500">
              BayLine booking
            </p>

            <h1 className="mt-2 font-display text-4xl text-bone sm:text-5xl">
              Book your service.
            </h1>

            <p className="mt-3 max-w-xl text-sm text-bone/50">
              Choose a center, service, vehicle and a live bay slot.
              Everything else is handled for you.
            </p>

          </div>

          <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-xs text-teal-300">

            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-teal-400" />

            Live availability

          </div>

        </div>

        {/* ===================================================
            PROGRESS INDICATOR
        =================================================== */}

        <div className="mb-7 grid grid-cols-4 gap-2">

          {[
            ['01', 'Center', !!selectedBranch],
            ['02', 'Service', !!selectedService],
            ['03', 'Vehicle', !!selectedVehicle],
            [
              '04',
              'Time',
              !!selectedService &&
                !!selectedVehicle &&
                !!selectedBranch,
            ],
          ].map(([num, label, done]) => (

            <div
              key={String(num)}
              className={`rounded-xl border px-3 py-3 ${
                done
                  ? 'border-amber-500/30 bg-amber-500/[.06]'
                  : 'border-graphite-700 bg-graphite-900/50'
              }`}
            >

              <p
                className={`text-[10px] font-mono ${
                  done
                    ? 'text-amber-400'
                    : 'text-bone/30'
                }`}
              >
                {num}
              </p>

              <p className="mt-1 text-xs text-bone/65">
                {label}
              </p>

            </div>

          ))}

        </div>

        {/* ===================================================
            TWO COLUMN LAYOUT
        =================================================== */}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">

          <section className="space-y-6">

            {/* =================================================
                01 / LOCATION
            ================================================= */}

            <Card>

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <p className="text-xs font-mono uppercase tracking-widest text-amber-500">
                    01 / Location
                  </p>

                  <h2 className="mt-1 font-display text-xl">
                    Where should we service it?
                  </h2>

                </div>

                <MapPin
                  className="text-amber-500"
                  size={22}
                />

              </div>

              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="bayline-hover w-full rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent p-4 text-left"
              >

                <div className="flex items-center justify-between gap-4">

                  <div className="min-w-0">

                    <p className="text-[10px] uppercase tracking-widest text-bone/35">
                      Selected center
                    </p>

                    <p className="mt-1 truncate font-display text-lg">
                      {selectedBranch?.name ??
                        'Choose a service center'}
                    </p>

                    {selectedBranch && (
                      <p className="mt-1 text-xs text-bone/45">
                        {selectedBranch.city},{' '}
                        {selectedBranch.state} ·{' '}
                        {selectedBranch.opens_at.slice(
                          0,
                          5
                        )}
                        –
                        {selectedBranch.closes_at.slice(
                          0,
                          5
                        )}
                      </p>
                    )}

                  </div>

                  <ChevronRight className="shrink-0 text-amber-400" />

                </div>

              </button>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">

                <label>

                  <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-bone/35">
                    State
                  </span>

                  <select
                    value={stateFilter}
                    onChange={(e) =>
                      setStateFilter(e.target.value)
                    }
                    className={selectCls}
                  >
                    {states.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>

                </label>

                <label>

                  <span className="mb-1.5 block text-[10px] uppercase tracking-widest text-bone/35">
                    Quick branch
                  </span>

                  <select
                    value={branchId}
                    onChange={(e) =>
                      setBranchId(e.target.value)
                    }
                    className={selectCls}
                  >
                    {branches
                      .filter(
                        (b) =>
                          stateFilter === 'All' ||
                          b.state === stateFilter
                      )
                      .map((b) => (
                        <option
                          key={b.id}
                          value={b.id}
                        >
                          {b.name} — {b.city}
                        </option>
                      ))}
                  </select>

                </label>

              </div>

            </Card>

            {/* =================================================
                02 / SERVICE
            ================================================= */}

            <Card>

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <p className="text-xs font-mono uppercase tracking-widest text-amber-500">
                    02 / Service
                  </p>

                  <h2 className="mt-1 font-display text-xl">
                    What does your car need?
                  </h2>

                </div>

                <Wrench
                  className="text-amber-500"
                  size={22}
                />

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                {services.map((s) => (

                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setServiceId(s.id)}
                    className={`bayline-hover rounded-xl border p-4 text-left ${
                      serviceId === s.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-graphite-700 bg-graphite-900/50'
                    }`}
                  >

                    <div className="flex items-start justify-between">

                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${
                          serviceId === s.id
                            ? 'bg-amber-500 text-graphite-950'
                            : 'bg-graphite-800 text-amber-400'
                        }`}
                      >
                        {serviceIcon(s.name)}
                      </span>

                      {serviceId === s.id && (
                        <Check
                          size={18}
                          className="text-amber-400"
                        />
                      )}

                    </div>

                    <p className="mt-4 font-semibold text-bone">
                      {s.name}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-bone/40">
                      {s.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-graphite-700 pt-3">

                      <span className="flex items-center gap-1 text-[11px] text-bone/35">
                        <Clock3 size={12} />
                        {s.duration_minutes} min
                      </span>

                      <span className="font-display text-lg text-amber-400">
                        ₹{s.price}
                      </span>

                    </div>

                  </button>

                ))}

              </div>

            </Card>

            {/* =================================================
                03 / VEHICLE
            ================================================= */}

            <Card>

              <div className="mb-5 flex items-center justify-between">

                <div>

                  <p className="text-xs font-mono uppercase tracking-widest text-amber-500">
                    03 / Vehicle
                  </p>

                  <h2 className="mt-1 font-display text-xl">
                    Which car are we servicing?
                  </h2>

                </div>

                <CarFront
                  className="text-amber-500"
                  size={22}
                />

              </div>

              <div className="grid gap-3 sm:grid-cols-2">

                {vehicles.map((v) => (

                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleId(v.id)}
                    className={`bayline-hover rounded-xl border p-4 text-left ${
                      vehicleId === v.id
                        ? 'border-teal-500/60 bg-teal-500/10'
                        : 'border-graphite-700 bg-graphite-900/50'
                    }`}
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <p className="font-semibold">
                          {v.year} {v.make} {v.model}
                        </p>

                        <p className="mt-1 text-xs text-bone/40">
                          {v.plate_number}
                        </p>

                      </div>

                      {vehicleId === v.id ? (
                        <Check
                          className="text-teal-300"
                          size={18}
                        />
                      ) : (
                        <CarFront
                          size={18}
                          className="text-bone/25"
                        />
                      )}

                    </div>

                  </button>

                ))}

              </div>

              {vehicles.length === 0 && (
                <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
                  Add a vehicle from My Garage before booking.
                </p>
              )}

              {/* =================================================
                  AI SERVICE ASSISTANT
              ================================================= */}

              <div className="mt-6 border-t border-graphite-700 pt-6">

                <div className="mb-4">

                  <div className="flex items-center gap-2">

                    <Sparkles
                      size={17}
                      className="text-teal-300"
                    />

                    <p className="text-xs font-mono uppercase tracking-widest text-teal-300">
                      AI Service Assistant
                    </p>

                  </div>

                  <h3 className="mt-2 font-display text-lg">
                    Not sure what service you need?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-bone/40">
                    Describe the problem with your vehicle.
                    Our AI will recommend the most suitable
                    service.
                  </p>

                </div>

                {/* Complaint input */}

                <textarea
                  value={complaint}
                  onChange={(e) => {
                    setComplaint(e.target.value)
                    setAiError(null)
                  }}
                  placeholder="Example: My car makes a grinding noise whenever I apply the brakes..."
                  rows={4}
                  className="w-full resize-none rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3 text-sm text-bone outline-none transition placeholder:text-bone/25 focus:border-teal-500"
                />

                {/* Analyze button */}

                <button
                  type="button"
                  onClick={analyzeVehicleProblem}
                  disabled={
                    aiLoading ||
                    !selectedVehicle ||
                    !complaint.trim()
                  }
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-teal-500/40 bg-teal-500/10 px-4 py-3 text-sm font-semibold text-teal-300 transition hover:bg-teal-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <Sparkles size={16} />

                  {aiLoading
                    ? 'Analyzing problem...'
                    : 'Analyze Problem'}

                </button>

                {/* AI error */}

                {aiError && (
                  <div className="mt-3 rounded-xl border border-alert-500/30 bg-alert-500/10 p-3 text-xs text-alert-300">
                    {aiError}
                  </div>
                )}

                {/* AI result */}

                {aiRecommendation && (
                  <div className="mt-4 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4">

                    <div className="flex items-start gap-3">

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15">
                        <Sparkles
                          size={19}
                          className="text-teal-300"
                        />
                      </div>

                      <div className="min-w-0 flex-1">

                        <p className="text-[10px] font-mono uppercase tracking-widest text-teal-300">
                          AI Recommendation
                        </p>

                        <p className="mt-1 font-display text-xl text-bone">
                          {aiRecommendation}
                        </p>

                        <p className="mt-2 text-xs text-bone/40">
                          Analyzed using:{' '}
                          <span className="text-bone/60">
                            {selectedVehicle?.vehicle_type ?? 'Vehicle'}
                            {' · '}
                            {selectedVehicle?.mileage?.toLocaleString() ?? '—'} km
                            {' · '}
                            {selectedVehicle
                              ? new Date().getFullYear() - selectedVehicle.year
                              : '—'}{' '}
                            years old
                          </span>
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-graphite-700 bg-graphite-900/60 p-3">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-bone/30">
                              Service confidence
                            </p>
                            <p className="mt-1 text-sm font-semibold text-teal-300">
                              {aiConfidence !== null ? `${aiConfidence.toFixed(1)}%` : '—'}
                            </p>
                          </div>

                          <div className="rounded-xl border border-graphite-700 bg-graphite-900/60 p-3">
                            <p className="text-[9px] font-mono uppercase tracking-widest text-bone/30">
                              Priority
                            </p>
                            <p className={`mt-1 text-sm font-semibold ${
                              aiPriority === 'High'
                                ? 'text-alert-300'
                                : aiPriority === 'Medium'
                                  ? 'text-amber-300'
                                  : 'text-teal-300'
                            }`}>
                              {aiPriority ?? '—'}
                            </p>
                          </div>
                        </div>

                        {aiPriorityConfidence !== null && (
                          <p className="mt-2 text-[10px] text-bone/30">
                            Priority confidence:{' '}
                            <span className="text-bone/50">
                              {aiPriorityConfidence.toFixed(1)}%
                            </span>
                          </p>
                        )}

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={useAIRecommendation}
                      className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 text-xs font-semibold text-graphite-950 transition hover:bg-teal-400"
                    >
                      Use This Recommendation
                    </button>

                  </div>
                )}

              </div>

            </Card>

          </section>

          {/* =================================================
              04 / TIME
          ================================================= */}

          <aside className="lg:sticky lg:top-24 lg:h-fit">

            <Card className="overflow-hidden p-0">

              <div className="border-b border-graphite-700 p-5">

                <p className="text-xs font-mono uppercase tracking-widest text-amber-500">
                  04 / Time
                </p>

                <h2 className="mt-1 font-display text-xl">
                  Choose a live slot
                </h2>

                <div className="mt-4 flex items-center gap-2 rounded-xl border border-graphite-700 bg-graphite-900 p-2.5">

                  <CalendarDays
                    size={17}
                    className="text-amber-400"
                  />

                  <input
                    type="date"
                    value={date}
                    min={new Date()
                      .toISOString()
                      .slice(0, 10)}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    className="w-full bg-transparent text-sm outline-none"
                  />

                </div>

              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto p-4">

                {!selectedService && (
                  <p className="py-12 text-center text-sm text-bone/35">
                    Choose a service to see available times.
                  </p>
                )}

                {selectedService &&
                  slots.map((slot) => {

                    const free =
                      slot.freeBays.length

                    const disabled =
                      free === 0 ||
                      !vehicleId ||
                      submitting ||
                      paymentLoading

                    return (
                      <button
                        key={slot.start.toISOString()}
                        disabled={disabled}
                        onClick={() =>
                          handleBook(slot)
                        }
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          free === 0
                            ? 'cursor-not-allowed border-graphite-800 bg-graphite-900/40 opacity-40'
                            : 'border-graphite-700 bg-graphite-900/60 hover:border-amber-500/60 hover:bg-amber-500/5'
                        }`}
                      >

                        <div className="flex items-center justify-between">

                          <span className="font-mono text-sm">
                            {slot.start.toLocaleTimeString(
                              undefined,
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>

                          <span
                            className={`text-[10px] font-mono uppercase ${
                              free
                                ? 'text-teal-300'
                                : 'text-bone/25'
                            }`}
                          >
                            {free
                              ? `${free} bay${
                                  free > 1
                                    ? 's'
                                    : ''
                                } free`
                              : 'Full'}
                          </span>

                        </div>

                      </button>
                    )
                  })}

                {selectedService &&
                  slots.length === 0 && (
                    <p className="py-12 text-center text-sm text-bone/35">
                      No slots available for this date.
                      Try another day.
                    </p>
                  )}

              </div>

              {/* Booking summary */}

              <div className="border-t border-graphite-700 bg-graphite-900/50 p-4">

                <p className="text-[10px] uppercase tracking-widest text-bone/30">
                  Booking summary
                </p>

                <div className="mt-3 space-y-2 text-xs">

                  <div className="flex justify-between gap-4">

                    <span className="text-bone/40">
                      Center
                    </span>

                    <span className="max-w-[170px] truncate text-right">
                      {selectedBranch?.name ?? '—'}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4">

                    <span className="text-bone/40">
                      Service
                    </span>

                    <span>
                      {selectedService?.name ?? '—'}
                    </span>

                  </div>

                  <div className="flex justify-between gap-4">

                    <span className="text-bone/40">
                      Vehicle
                    </span>

                    <span>
                      {selectedVehicle?.plate_number ?? '—'}
                    </span>

                  </div>

                </div>

              </div>

            </Card>

          </aside>

        </div>

        {/* General error */}

        {error && (
          <div className="mt-5 rounded-xl border border-alert-500/30 bg-alert-500/10 p-4 text-sm text-alert-300">
            {error}
          </div>
        )}

      </main>

    </div>
  )
}

const selectCls =
  'w-full rounded-xl border border-graphite-700 bg-graphite-900 px-3 py-2.5 text-sm text-bone outline-none transition focus:border-amber-500'