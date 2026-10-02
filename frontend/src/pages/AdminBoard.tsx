import { useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, Clock3, MapPin, RefreshCw, Wrench, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { BayBoardRow, Booking, BookingStatus, Branch } from '../lib/types'
import { Button, Card, PlateBadge, StatusBadge } from '../components/UI'

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = { pending: 'confirmed', confirmed: 'in_progress', in_progress: 'completed' }
const NEXT_LABEL: Partial<Record<BookingStatus, string>> = { pending: 'Confirm', confirmed: 'Start Service', in_progress: 'Mark Completed' }

export function AdminBoard() {
  const { profile } = useAuth()
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState('')
  const [board, setBoard] = useState<BayBoardRow[]>([])
  const [pending, setPending] = useState<Booking[]>([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    async function loadBranches() {
      const { data } = await supabase.from('branches').select('*').order('name')
      const rows = (data as Branch[]) ?? []
      setBranches(rows)
      setBranchId(profile?.branch_id ?? rows[0]?.id ?? '')
    }
    loadBranches()
  }, [profile])

  async function loadBoard() {
    if (!branchId) return
    const [{ data: boardData }, { data: pendingData }] = await Promise.all([
      supabase.from('v_bay_board').select('*').eq('branch_id', branchId).order('bay_number'),
      supabase.from('bookings').select('*, vehicles(*), services(*), profiles(*)').eq('branch_id', branchId).eq('status', 'pending').order('scheduled_start'),
    ])
    setBoard((boardData as BayBoardRow[]) ?? [])
    setPending((pendingData as Booking[]) ?? [])
  }

  useEffect(() => {
    if (!branchId) return
    loadBoard()
    const channel = supabase.channel(`admin-board-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `branch_id=eq.${branchId}` }, () => loadBoard())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bays', filter: `branch_id=eq.${branchId}` }, () => loadBoard())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId])

  async function advanceStatus(id: string, current: BookingStatus) {
    const next = NEXT_STATUS[current]
    if (!next) return
    await supabase.from('bookings').update({ status: next }).eq('id', id)
  }

  async function cancelBooking(id: string) {
    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id)
  }

  async function refresh() {
    setRefreshing(true)
    await loadBoard()
    setRefreshing(false)
  }

  const activeCount = useMemo(() => board.filter((r) => r.booking_status === 'in_progress').length, [board])
  const freeCount = useMemo(() => board.filter((r) => !r.booking_id).length, [board])

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-mono uppercase tracking-[.22em] text-amber-500">Operations</p>
          <h1 className="mt-2 font-display text-4xl">Live bay board.</h1>
          <p className="mt-2 text-sm text-bone/45">Every bay updates in real time as bookings move through the workshop.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-xl border border-graphite-700 bg-graphite-900 px-3 py-2.5 text-sm">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <Button variant="ghost" onClick={refresh}><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /></Button>
        </div>
      </div>

      <div className="mb-7 grid gap-3 sm:grid-cols-3">
        <OpsStat label="Total bays" value={board.length} icon={<Activity size={16} />} />
        <OpsStat label="In service" value={activeCount} icon={<Wrench size={16} />} />
        <OpsStat label="Free now" value={freeCount} icon={<CheckCircle2 size={16} />} />
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {board.map((row) => {
          const live = row.booking_status === 'in_progress'
          return (
            <Card key={row.bay_id} className={live ? 'border-amber-500/40 bg-amber-500/[.05]' : ''}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-bone/30">Workshop bay</p>
                  <p className="mt-1 font-display text-2xl">BAY {String(row.bay_number).padStart(2, '0')}</p>
                </div>
                {row.booking_status ? <StatusBadge status={row.booking_status} /> : <span className="rounded-full bg-teal-500/10 px-2.5 py-1 text-[10px] font-mono text-teal-300">FREE</span>}
              </div>
              {row.booking_id ? (
                <div className="mt-5 space-y-2">
                  <p className="font-semibold">{row.service_name}</p>
                  <p className="text-xs text-bone/45">{row.customer_name}</p>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    {row.plate_number && <PlateBadge plate={row.plate_number} />}
                    {row.scheduled_start && <span className="text-[10px] font-mono text-bone/35">{new Date(row.scheduled_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  {row.booking_status && NEXT_STATUS[row.booking_status] && <Button variant="secondary" className="mt-3 w-full" onClick={() => advanceStatus(row.booking_id!, row.booking_status!)}>{NEXT_LABEL[row.booking_status]}</Button>}
                </div>
              ) : <p className="mt-5 text-sm text-bone/30">No active job in this bay.</p>}
            </Card>
          )
        })}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div><p className="text-xs font-mono uppercase tracking-widest text-amber-500">Queue</p><h2 className="mt-1 font-display text-2xl">Pending confirmation</h2></div>
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-300">{pending.length} waiting</span>
        </div>
        <div className="space-y-3">
          {pending.map((b) => (
            <Card key={b.id}>
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold">{b.services?.name}</p>
                  <p className="mt-1 text-xs text-bone/45">{b.profiles?.full_name} · {b.vehicles?.year} {b.vehicles?.make} {b.vehicles?.model}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-bone/35"><Clock3 size={12} />{new Date(b.scheduled_start).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="flex gap-2"><Button variant="danger" onClick={() => cancelBooking(b.id)}><XCircle size={15} className="mr-1 inline" />Cancel</Button><Button variant="secondary" onClick={() => advanceStatus(b.id, 'pending')}>Confirm</Button></div>
              </div>
            </Card>
          ))}
          {!pending.length && <Card className="border-dashed text-center text-sm text-bone/35">No bookings awaiting confirmation.</Card>}
        </div>
      </section>
    </main>
  )
}

function OpsStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <Card className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-bone/35">{label}</p><p className="mt-1 font-display text-3xl">{value}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">{icon}</span></Card>
}
