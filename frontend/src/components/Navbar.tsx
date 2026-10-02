import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, X, MapPin, CalendarDays, LayoutDashboard, LogOut, Activity, Car, Sparkles } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from './UI'

export function Navbar() {
  const { profile, session, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const isStaff = profile?.role === 'staff' || profile?.role === 'admin'
  const close = () => setOpen(false)

  async function handleSignOut() {
    close()
    await signOut()
    navigate('/login')
  }

  const homeLink = (hash: string) => location.pathname === '/' ? hash : `/${hash}`
  const active = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 border-b border-white/[.06] bg-graphite-950/85 backdrop-blur-2xl">
      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-6">
        <Link to={session ? '/app' : '/'} onClick={close} className="group flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5"><span className="absolute inset-0 rounded-full bg-amber-500/50 blur-sm" /><span className="relative h-2.5 w-2.5 rounded-full bg-amber-500 status-live" /></span>
          <span className="font-display text-[23px] tracking-[.1em] text-bone">BAY<span className="text-amber-500">LINE</span></span>
          <span className="hidden border-l border-graphite-700 pl-2 font-mono text-[8px] uppercase tracking-[.18em] text-bone/25 lg:block">Vehicle care</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {!session && <>
            {location.pathname === '/' && <>
              <a href="#services" className="rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone">Services</a>
              <a href="#centers" className="rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone">Centers</a>
              <a href="#care" className="rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone">BayLine AI</a>
              <a href="#enquiry" className="rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone">Support</a>
            </>}
            <Link to="/login" className="ml-2"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/login"><Button className="flex items-center gap-2"><CalendarDays size={15} /> Book service</Button></Link>
          </>}

          {session && <>
            {profile?.role === 'customer' && <>
              <Link to="/dashboard" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wide ${active('/dashboard') ? 'bg-amber-500/10 text-amber-400' : 'text-bone/50 hover:bg-white/[.04] hover:text-bone'}`}><LayoutDashboard size={15} /> Dashboard</Link>
              <Link to="/book" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wide ${active('/book') ? 'bg-amber-500/10 text-amber-400' : 'text-bone/50 hover:bg-white/[.04] hover:text-bone'}`}><CalendarDays size={15} /> Book service</Link>
              <Link to="/#centers" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone"><MapPin size={15} /> Centers</Link>
              <Link to="/#care" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone"><Sparkles size={15} /> AI</Link>
              <Link to="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wide text-bone/50 hover:bg-white/[.04] hover:text-bone"><Car size={15} /> My Garage</Link>
            </>}
            {isStaff && <>
              <Link to="/operations" className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs uppercase tracking-wide ${active('/operations') ? 'bg-amber-500/10 text-amber-400' : 'text-bone/50 hover:bg-white/[.04] hover:text-bone'}`}><Activity size={15} /> Live operations</Link>
              <Link to="/board" className={`rounded-lg px-3 py-2 text-xs uppercase tracking-wide ${active('/board') ? 'bg-amber-500/10 text-amber-400' : 'text-bone/50 hover:bg-white/[.04] hover:text-bone'}`}>Bay board</Link>
            </>}
            <div className="ml-2 flex items-center gap-3 border-l border-graphite-700 pl-4">
              <div className="hidden text-right lg:block"><p className="text-xs font-medium text-bone">{profile?.full_name}</p><p className="text-[9px] uppercase tracking-widest text-bone/30">{profile?.role}</p></div>
              <Button variant="ghost" onClick={handleSignOut}><LogOut size={15} className="mr-1.5 inline" /> Sign out</Button>
            </div>
          </>}
        </nav>

        <button onClick={() => setOpen(v => !v)} className="rounded-lg border border-graphite-700 p-2.5 text-bone/80 md:hidden" aria-label="Toggle navigation">{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>

      {open && <div className="border-t border-white/[.06] bg-graphite-950 px-5 py-4 md:hidden"><div className="mx-auto flex max-w-7xl flex-col gap-1">
        {!session && <>
          {location.pathname === '/' && <>
            <a onClick={close} href="#services" className="rounded-lg px-3 py-3 text-sm text-bone/70">Services</a>
            <a onClick={close} href="#centers" className="rounded-lg px-3 py-3 text-sm text-bone/70">Centers</a>
            <a onClick={close} href="#care" className="rounded-lg px-3 py-3 text-sm text-bone/70">BayLine AI</a>
            <a onClick={close} href="#enquiry" className="rounded-lg px-3 py-3 text-sm text-bone/70">Support</a>
          </>}
          <Link onClick={close} to="/login" className="mt-2"><Button variant="ghost" className="w-full">Sign in</Button></Link>
          <Link onClick={close} to="/login"><Button className="w-full">Book a service</Button></Link>
        </>}
        {session && <>
          {profile?.role === 'customer' && <>
            <Link onClick={close} to="/dashboard" className="rounded-lg px-3 py-3 text-sm text-bone/70">My Garage / Dashboard</Link>
            <Link onClick={close} to="/book" className="rounded-lg px-3 py-3 text-sm text-bone/70">Book service</Link>
            <Link onClick={close} to="/#centers" className="rounded-lg px-3 py-3 text-sm text-bone/70">Service centers</Link>
            <Link onClick={close} to="/#care" className="rounded-lg px-3 py-3 text-sm text-bone/70">BayLine AI</Link>
          </>}
          {isStaff && <>
            <Link onClick={close} to="/operations" className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm text-bone/70"><Activity size={15} /> Live operations</Link>
            <Link onClick={close} to="/board" className="rounded-lg px-3 py-3 text-sm text-bone/70">Bay board</Link>
          </>}
          <button onClick={handleSignOut} className="mt-2 flex items-center gap-2 rounded-lg border border-graphite-700 px-3 py-3 text-left text-sm text-alert-300"><LogOut size={15} /> Sign out</button>
        </>}
      </div></div>}
    </header>
  )
}
