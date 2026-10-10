import { FormEvent, useEffect, useMemo, useState } from 'react'

import { Link } from 'react-router-dom'

import {

  CalendarDays,

  CarFront,

  ChevronRight,

  Clock3,

  Plus,

  ShieldCheck,

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

  return (

    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">

      {/* =====================================================*

*          HEADER*

*      ===================================================== */}

      <section className="relative overflow-hidden rounded-3xl border border-graphite-700 bg-gradient-to-br from-amber-500/[.11] via-graphite-900 to-teal-500/[.06] p-6 sm:p-8">

        <div className="bayline-grid pointer-events-none absolute inset-0" />

        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">

          <div>

            <p className="text-xs font-mono uppercase tracking-[.22em] text-amber-500">

              Driver dashboard

            </p>

            <h1 className="mt-2 font-display text-4xl sm:text-5xl">

              Good to see you,{' '}

              {profile?.full_name?.split(

                ' '

              )[0] || 'there'}.

            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-bone/50">

              Your vehicles, upcoming

              service and live booking

              status in one place.

            </p>

          </div>

          <Link to="/book">

            <Button className="flex items-center gap-2">

              <Plus size={16} />

              Book a service

            </Button>

          </Link>

        </div>

        <div className="relative mt-8 grid gap-3 sm:grid-cols-3">

          <MiniStat

label="Vehicles"

value={vehicles.length}

icon={

              <CarFront size={16} />

            }

          />

          <MiniStat

label="Upcoming"

value={upcoming.length}

icon={

              <CalendarDays

size={16}

              />

            }

          />

          <MiniStat

label="Completed"

value={completedCount}

icon={

              <ShieldCheck

size={16}

              />

            }

          />

        </div>

      </section>

      {/* =====================================================*

*          NEXT SERVICE*

*      ===================================================== */}

      {latest ? (

        <section className="mt-7">

          <div className="mb-3 flex items-center justify-between">

            <div>

              <p className="text-xs font-mono uppercase tracking-widest text-teal-300">

                Next service

              </p>

              <h2 className="mt-1 font-display text-2xl">

                Your upcoming booking

              </h2>

            </div>

            <StatusBadge

status={latest.status}

            />

          </div>

          <Card className="overflow-hidden border-teal-500/20 bg-gradient-to-r from-teal-500/[.07] to-transparent">

            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">

              <div className="flex items-start gap-4">

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500/15 text-teal-300">

                  <Wrench size={23} />

                </div>

                <div>

                  <p className="font-display text-xl">

                    {latest.services?.name ||

                      'Vehicle service'}

                  </p>

                  <p className="mt-1 text-sm text-bone/50">

                    {latest.branches?.name}{' '}

                    ·{' '}

                    {latest.branches?.city}

                  </p>

                  <p className="mt-3 flex items-center gap-2 text-xs font-mono text-bone/50">

                    <Clock3 size={13} />

                    {new Date(

                      latest.scheduled_start

                    ).toLocaleString(

                      undefined,

                      {

                        weekday:

                          'short',

                        month:

                          'short',

                        day: 'numeric',

                        hour:

                          '2-digit',

                        minute:

                          '2-digit',

                      }

                    )}

                  </p>

                </div>

              </div>

              <div className="flex items-center gap-3 md:justify-end">

                {latest.vehicles && (

                  <PlateBadge

plate={

                      latest

                        .vehicles

                        .plate_number

                    }

                  />

                )}

              </div>

            </div>

          </Card>

        </section>

      ) : (

        <section className="mt-7">

          <Card className="border-amber-500/20 bg-amber-500/[.04]">

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

              <div>

                <p className="text-xs font-mono uppercase tracking-widest text-amber-400">

                  Ready when you are

                </p>

                <h2 className="mt-1 font-display text-2xl">

                  No upcoming service.

                </h2>

                <p className="mt-2 text-sm text-bone/45">

                  Pick a center and grab

                  a live bay slot in

                  minutes.

                </p>

              </div>

              <Link to="/book">

                <Button>

                  Find a slot

                  <ChevronRight

className="ml-1 inline"

size={16}

                  />

                </Button>

              </Link>

            </div>

          </Card>

        </section>

      )}

      {/* =====================================================*

*          GARAGE + BOOKING HISTORY*

*      ===================================================== */}

      <div className="mt-9 grid gap-7 lg:grid-cols-[.85fr_1.15fr]">

        {/* ===================================================*

*            MY GARAGE*

*        =================================================== */}

        <section>

          <div className="mb-3 flex items-center justify-between">

            <h2 className="font-display text-xl">

              My garage

            </h2>

            <button

onClick={() =>

                setShowAddVehicle(

                  (v) => !v

                )

              }

className="text-xs font-mono text-amber-400 hover:text-amber-300"

            >

              {showAddVehicle

                ? 'cancel'

                : '+ add vehicle'}

            </button>

          </div>

          {showAddVehicle && (

            <AddVehicleForm

onDone={() => {

                setShowAddVehicle(

                  false

                )

                loadData()

              }}

            />

          )}

          <div className="space-y-3">

            {vehicles.map((v) => (

              <Card

key={v.id}

className="bayline-hover"

              >

                <div className="flex items-center justify-between gap-4">

                  <div className="flex items-center gap-3">

                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-graphite-700 text-amber-400">

                      <CarFront size={20} />

                    </span>

                    <div>

                      <p className="font-semibold">

                        {v.year}{' '}

                        {v.make}{' '}

                        {v.model}

                      </p>

                      <p className="mt-1 text-xs text-bone/40">

                        {v.vehicle_type ||

                          'Vehicle'}

                        {' · '}

                        {Number.isFinite(

                          v.mileage

                        )

                          ? `${v.mileage.toLocaleString()} km`

                          : 'Mileage not added'}

                      </p>

                      <p className="mt-1 text-xs text-bone/40">

                        {v.vin

                          ? `VIN ${v.vin}`

                          : 'VIN not added'}

                      </p>

                    </div>

                  </div>

                  <PlateBadge

plate={

                      v.plate_number

                    }

                  />

                </div>

              </Card>

            ))}

            {!loading &&

              vehicles.length ===

                0 &&

              !showAddVehicle && (

                <Card className="border-dashed text-sm text-bone/40">

                  Your garage is empty.

                  Add a vehicle before

                  booking.

                </Card>

              )}

          </div>

        </section>

        {/* ===================================================*

*            BOOKING HISTORY*

*        =================================================== */}

        <section>

          <div className="mb-3 flex items-center justify-between">

            <h2 className="font-display text-xl">

              Booking history

            </h2>

            <span className="text-xs text-bone/35">

              {bookings.length}{' '}

              total

            </span>

          </div>

          <div className="space-y-3">

            {bookings.map((b) => (

              <Card

key={b.id}

className="bayline-hover"

              >

                <div className="flex items-start justify-between gap-4">

                  <div className="min-w-0">

                    <p className="truncate font-semibold">

                      {b.services?.name}

                    </p>

                    <p className="mt-1 text-xs text-bone/45">

                      {b.branches?.name}

                      {' · '}

                      {b.vehicles?.make}{' '}

                      {b.vehicles?.model}

                    </p>

                    <p className="mt-2 text-[11px] font-mono text-bone/35">

                      {new Date(

b.scheduled_start

                      ).toLocaleString(

                        undefined,

                        {

                          weekday:

                            'short',

                          month:

                            'short',

                          day: 'numeric',

                          hour:

                            '2-digit',

                          minute:

                            '2-digit',

                        }

                      )}

                    </p>

                  </div>

                  <StatusBadge

status={

b.status

                    }

                  />

                </div>

              </Card>

            ))}

            {!loading &&

              bookings.length ===

                0 && (

                <Card className="border-dashed text-sm text-bone/40">

                  No bookings yet.

                </Card>

              )}

          </div>

        </section>

      </div>

    </main>

  )

}

/* ===========================================================*

*   MINI STAT*

*=========================================================== */

function MiniStat({

label,

value,

icon,

}: {

  label: string

  value: number

  icon: React.ReactNode

}) {

  return (

    <div className="rounded-2xl border border-white/[.06] bg-black/10 p-4">

      <div className="flex items-center gap-2 text-bone/45">

        {icon}

        <span className="text-[10px] uppercase tracking-widest">

          {label}

        </span>

      </div>

      <p className="mt-2 font-display text-2xl">

        {value}

      </p>

    </div>

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
    <Card className="mb-3">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs text-bone/60">
            Vehicle type
          </label>
          <select
            value={vehicleKind}
            onChange={(e) => {
              setVehicleKind(e.target.value)
              setMake('')
            }}
            className={fieldClass}
          >
            <option value="Car">Car</option>
            <option value="Bike">Bike / Two-wheeler</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-bone/60">
              Company / Make
            </label>
            <select
              required
              value={make}
              onChange={(e) => setMake(e.target.value)}
              className={fieldClass}
            >
              <option value="">Select company</option>
              {(vehicleKind === 'Car' ? carCompanies : bikeCompanies).map(
                (company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-bone/60">
              Model
            </label>
            <input
              required
              placeholder="e.g. Creta, Nexon, Swift"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={fieldClass}
            />
          </div>

          {vehicleKind === 'Car' && (
            <div>
              <label className="mb-1.5 block text-xs text-bone/60">
                Body type / category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={fieldClass}
              >
                {carCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs text-bone/60">
              Manufacturing year
            </label>
            <input
              required
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-bone/60">
              Registration / Number plate
            </label>
            <input
              required
              placeholder="e.g. MH12AB1234"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className={`${fieldClass} font-mono uppercase`}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-bone/60">
              Total kilometres driven
            </label>
            <input
              required
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 45000"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-bone/35">
              Enter the current odometer reading in kilometres.
            </p>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs text-bone/60">
            VIN / Chassis number (optional)
          </label>
          <input
            placeholder="Enter VIN if available"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            className={`${fieldClass} font-mono`}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-graphite-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving vehicle…' : 'Save vehicle'}
        </button>
      </form>
    </Card>
  )
}
