import { ReactNode } from 'react'
import { BookingStatus } from '../lib/types'

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: 'bg-graphite-700 text-bone/80 border-graphite-600',
  confirmed: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  in_progress: 'bg-amber-500/15 text-amber-300 border-amber-500/35 status-live',
  completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-alert-500/15 text-alert-300 border-alert-500/35',
}

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Bay',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider ${STATUS_STYLES[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bayline-card p-5 ${className}`}>
      {children}
    </div>
  )
}

export function Button({
  children, onClick, variant = 'primary', disabled = false, type = 'button', className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const variants: Record<string, string> = {
    primary: 'bg-amber-500 text-graphite-950 hover:bg-amber-400',
    secondary: 'bg-teal-500 text-graphite-950 hover:bg-teal-400',
    ghost: 'border border-graphite-600 bg-transparent text-bone hover:border-amber-500 hover:text-amber-300',
    danger: 'border border-alert-500/50 bg-transparent text-alert-300 hover:bg-alert-500/10',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bayline-button rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="plate inline-block rounded-md border-2 border-bone/80 bg-bone px-2 py-0.5 text-sm font-semibold text-graphite-950">
      {plate}
    </span>
  )
}

export function SectionHeading({
  eyebrow, title, description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div>
      {eyebrow && <p className="text-xs font-mono uppercase tracking-[.22em] text-amber-500">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-3xl text-bone sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-bone/50">{description}</p>}
    </div>
  )
}
