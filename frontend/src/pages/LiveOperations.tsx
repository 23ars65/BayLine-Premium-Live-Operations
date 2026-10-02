import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Activity, CheckCircle2, Clock3, RefreshCw, Users, Wrench, Zap } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Branch, Booking, BayBoardRow } from '../lib/types'
import { Button, Card, PlateBadge, StatusBadge } from '../components/UI'

type ActivityItem = {
  id: string
  kind: 'booking' | 'bay' | 'status'
  title: string
  detail: string
  at: Date
}

export function LiveOperations() {
  const { profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [board, setBoard] = useState<BayBoardRow[]>([])
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [connected, setConnected] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase
        .from('branches')
        .select('*')
        .order('name')

      const rows = (data as Branch[]) ?? []
      setBranches(rows)
      setBranchId(profile?.branch_id ?? rows[0]?.id ?? '')
    }

    loadBranches()
  }, [profile])

  async function loadLiveData(addActivity = false) {
    if (!branchId) return

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const [{ data: boardData }, { data: bookingData }] = await Promise.all([
      supabase
        .from('v_bay_board')
        .select('*')
        .eq('branch_id', branchId)
        .order('bay_number'),

      supabase
        .from('bookings')
        .select('*, vehicles(*), services(*), branches(*)')
        .eq('branch_id', branchId)
        .gte('scheduled_start', start.toISOString())
        .lt('scheduled_start', end.toISOString())
        .order('scheduled_start'),
    ])

    const nextBoard = (boardData as BayBoardRow[]) ?? []
    const nextBookings = (bookingData as Booking[]) ?? []

    setBoard(nextBoard)
    setTodayBookings(nextBookings)

    if (addActivity) {
      const activityItem: ActivityItem = {
        id: crypto.randomUUID(),
        kind: 'status',
        title: 'Live data refreshed',
        detail: `${nextBookings.length} bookings · ${nextBoard.filter(x => !x.booking_id).length} bays available`,
        at: new Date(),
      }

      setActivity(old => [activityItem, ...old].slice(0, 12))
    }
  }

  useEffect(() => {
    if (!branchId) return

    loadLiveData()

    const channel = supabase
      .channel(`live-operations-${branchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `branch_id=eq.${branchId}`,
        },
        payload => {
          const activityItem: ActivityItem = {
            id: crypto.randomUUID(),
            kind: 'booking',
            title:
              payload.eventType === 'INSERT'
                ? 'New booking received'
                : payload.eventType === 'UPDATE'
                  ? 'Booking updated'
                  : 'Booking removed',
            detail:
              branches.find(b => b.id === branchId)?.name ??
              'Selected branch',
            at: new Date(),
          }

          setActivity(old => [activityItem, ...old].slice(0, 12))

          loadLiveData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bays',
          filter: `branch_id=eq.${branchId}`,
        },
        () => {
          const activityItem: ActivityItem = {
            id: crypto.randomUUID(),
            kind: 'bay',
            title: 'Bay status changed',
            detail:
              branches.find(b => b.id === branchId)?.name ??
              'Selected branch',
            at: new Date(),
          }

          setActivity(old => [activityItem, ...old].slice(0, 12))

          loadLiveData()
        }
      )
      .subscribe(status => setConnected(status === 'SUBSCRIBED'))

    return () => {
      supabase.removeChannel(channel)
      setConnected(false)
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  async function refresh() {
    setRefreshing(true)
    await loadLiveData(true)
    setRefreshing(false)
  }

  const active = useMemo(
    () => board.filter(x => x.booking_status === 'in_progress').length,
    [board]
  )

  const free = useMemo(
    () => board.filter(x => !x.booking_id).length,
    [board]
  )

  const confirmed = useMemo(
    () => todayBookings.filter(x => x.status === 'confirmed').length,
    [todayBookings]
  )

  const sortedBookings = [...todayBookings].sort(
    (a, b) =>
      new Date(a.scheduled_start).getTime() -
      new Date(b.scheduled_start).getTime()
  )

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-mono uppercase tracking-[.22em] text-amber-500">
              BayLine operations
            </p>

            <span
              className={`rounded-full border px-2.5 py-1 text-[9px] font-mono uppercase tracking-widest ${
                connected
                  ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
                  : 'border-alert-500/30 bg-alert-500/10 text-alert-300'
              }`}
            >
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current" />
              {connected ? 'Live' : 'Connecting'}
            </span>
          </div>

          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            Live operations.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/45">
            Real-time workshop capacity, bookings and bay activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={branchId}
            onChange={e => setBranchId(e.target.value)}
            className="rounded-xl border border-graphite-700 bg-graphite-900 px-3 py-2.5 text-sm"
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <Button variant="ghost" onClick={refresh}>
            <RefreshCw
              size={15}
              className={refreshing ? 'animate-spin' : ''}
            />
          </Button>
        </div>
      </div>

      <div className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Today's bookings"
          value={todayBookings.length}
          icon={<Clock3 size={17} />}
        />
        <Metric
          label="Confirmed"
          value={confirmed}
          icon={<CheckCircle2 size={17} />}
        />
        <Metric
          label="In service"
          value={active}
          icon={<Wrench size={17} />}
        />
        <Metric
          label="Bays available"
          value={free}
          icon={<Zap size={17} />}
        />
      </div>

      <div className="grid gap-7 lg:grid-cols-[1.45fr_.55fr]">
        <section>
          <div className="mb-3">
            <p className="text-xs font-mono uppercase tracking-widest text-amber-500">
              Workshop floor
            </p>
            <h2 className="mt-1 font-display text-2xl">Bay status</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {board.map(row => {
              const live = row.booking_status === 'in_progress'
              const booked = !!row.booking_id

              return (
                <Card
                  key={row.bay_id}
                  className={
                    live
                      ? 'border-amber-500/40 bg-amber-500/[.05]'
                      : ''
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-bone/30">
                        Workshop bay
                      </p>
                      <p className="mt-1 font-display text-2xl">
                        BAY {String(row.bay_number).padStart(2, '0')}
                      </p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase ${
                        booked
                          ? live
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                            : 'border-teal-500/30 bg-teal-500/10 text-teal-300'
                          : 'border-graphite-600 text-bone/35'
                      }`}
                    >
                      {live ? 'In service' : booked ? 'Booked' : 'Available'}
                    </span>
                  </div>

                  {booked ? (
                    <div className="mt-5">
                      <p className="font-semibold">
                        {row.service_name || 'Service'}
                      </p>

                      <p className="mt-1 text-xs text-bone/45">
                        {row.customer_name || 'Customer'}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        {row.plate_number ? (
                          <PlateBadge plate={row.plate_number} />
                        ) : (
                          <span />
                        )}

                        {row.scheduled_start && (
                          <span className="text-[10px] font-mono text-bone/35">
                            {new Date(
                              row.scheduled_start
                            ).toLocaleTimeString(undefined, {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 flex items-center gap-2 text-sm text-teal-300">
                      <CheckCircle2 size={17} />
                      Ready for the next vehicle
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </section>

        <aside>
          <div className="mb-3">
            <p className="text-xs font-mono uppercase tracking-widest text-teal-300">
              Realtime feed
            </p>
            <h2 className="mt-1 font-display text-2xl">Activity</h2>
          </div>

          <Card className="max-h-[610px] overflow-y-auto">
            {activity.length ? (
              <div className="space-y-5">
                {activity.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <span
                      className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        item.kind === 'booking'
                          ? 'bg-amber-500/10 text-amber-400'
                          : item.kind === 'bay'
                            ? 'bg-teal-500/10 text-teal-300'
                            : 'bg-graphite-700 text-bone/50'
                      }`}
                    >
                      {item.kind === 'booking' ? (
                        <Users size={14} />
                      ) : item.kind === 'bay' ? (
                        <Zap size={14} />
                      ) : (
                        <Activity size={14} />
                      )}
                    </span>

                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-bone/40">
                        {item.detail}
                      </p>
                      <p className="mt-1 text-[10px] font-mono text-bone/25">
                        {item.at.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <Activity
                  className="mx-auto text-bone/20"
                  size={25}
                />
                <p className="mt-3 text-sm text-bone/35">
                  Waiting for live activity…
                </p>
              </div>
            )}
          </Card>
        </aside>
      </div>

      <section className="mt-10">
        <div className="mb-3">
          <p className="text-xs font-mono uppercase tracking-widest text-amber-500">
            Today's schedule
          </p>
          <h2 className="mt-1 font-display text-2xl">Booking feed</h2>
        </div>

        <Card className="overflow-x-auto p-0">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[100px_1.4fr_1fr_140px_120px] border-b border-graphite-700 px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-bone/30">
              <span>Time</span>
              <span>Vehicle</span>
              <span>Service</span>
              <span>Center</span>
              <span>Status</span>
            </div>

            {sortedBookings.map(b => (
              <div
                key={b.id}
                className="grid grid-cols-[100px_1.4fr_1fr_140px_120px] items-center border-b border-graphite-800 px-5 py-4 last:border-0"
              >
                <span className="font-mono text-xs">
                  {new Date(b.scheduled_start).toLocaleTimeString(
                    undefined,
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                </span>

                <span>
                  <span className="block text-sm font-medium">
                    {b.vehicles?.make} {b.vehicles?.model}
                  </span>
                  <span className="text-[10px] text-bone/35">
                    {b.vehicles?.plate_number}
                  </span>
                </span>

                <span className="text-xs text-bone/60">
                  {b.services?.name}
                </span>

                <span className="text-xs text-bone/45">
                  {b.branches?.city}
                </span>

                <StatusBadge status={b.status} />
              </div>
            ))}

            {!sortedBookings.length && (
              <div className="p-10 text-center text-sm text-bone/35">
                No bookings scheduled today.
              </div>
            )}
          </div>
        </Card>
      </section>
    </main>
  )
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-bone/35">
          {label}
        </p>
        <p className="mt-1 font-display text-3xl">{value}</p>
      </div>

      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
        {icon}
      </span>
    </Card>
  )
}
