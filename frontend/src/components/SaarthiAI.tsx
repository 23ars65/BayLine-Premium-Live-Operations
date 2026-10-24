import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import SaarthiCharacter3D from './SaarthiCharacter3D'
import {
  Bot,
  MessageCircle,
  Send,
  X,
  LoaderCircle,
  Sparkles,
  CarFront,
  Gauge,
  CalendarDays,
  ShieldCheck,
  ArrowUpRight,
} from 'lucide-react'

type Message = { role: 'assistant' | 'user'; text: string }

const currentYear = new Date().getFullYear()

export function SaarthiAI() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [vehicleType, setVehicleType] = useState('Car')
  const [vehicleYear, setVehicleYear] = useState(String(currentYear - 5))
  const [mileage, setMileage] = useState('50000')
  const [detailsConfirmed, setDetailsConfirmed] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Welcome to BayLine. I'm Saarthi, your personal car-care assistant. Let's understand your vehicle and find the right next step.",
    },
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, loading])

  async function sendMessage() {
    const complaint = input.trim()
    if (!complaint || loading) return

    const year = Number(vehicleYear)
    const km = Number(mileage)

    if (
      !detailsConfirmed ||
      !vehicleType ||
      !Number.isInteger(year) ||
      year < 1980 ||
      year > currentYear ||
      mileage.trim() === '' ||
      !Number.isFinite(km) ||
      km < 0
    ) {
      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          text: 'Before I check that, please enter and confirm your vehicle type, manufacturing year and current mileage.',
        },
      ])
      return
    }

    setMessages(previous => [...previous, { role: 'user', text: complaint }])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch(
        'https://bayline-ai-backend.onrender.com/predict',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vehicle_type: vehicleType,
            vehicle_age: currentYear - year,
            mileage: km,
            complaint,
          }),
        },
      )

      if (!response.ok) throw new Error('Recommendation service unavailable')

      const result = await response.json()
      const recommendation = result.service
        ? `Based on the details you shared, BayLine AI suggests: ${result.service}.`
        : 'I could not identify a suitable service from that description. Try adding a little more detail about the symptoms.'

      const priority = result.priority
        ? ` The predicted service priority is ${result.priority}.`
        : ''

      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          text: recommendation + priority + ' This is an AI-generated suggestion, not a confirmed diagnosis. Our service team can verify it.',
        },
      ])
    } catch {
      setMessages(previous => [
        ...previous,
        {
          role: 'assistant',
          text: 'I cannot reach the recommendation service right now. Your details are still here. Please try again later or contact the BayLine team on WhatsApp.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function confirmVehicle() {
    const year = Number(vehicleYear)
    const km = Number(mileage)
    const valid =
      Number.isInteger(year) &&
      year >= 1980 &&
      year <= currentYear &&
      mileage.trim() !== '' &&
      Number.isFinite(km) &&
      km >= 0

    setDetailsConfirmed(valid)
    setMessages(previous => [
      ...previous,
      {
        role: 'assistant',
        text: valid
          ? `Vehicle details confirmed: ${vehicleType}, ${year}, ${km.toLocaleString('en-IN')} km. Tell me what's happening with your vehicle.`
          : 'Please enter a valid manufacturing year and non-negative mileage.',
      },
    ])
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            key="saarthi-panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed bottom-24 right-4 z-[70] flex h-[min(690px,calc(100dvh-125px))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[26px] border border-white/[0.10] bg-[#111311] shadow-[0_28px_100px_rgba(0,0,0,0.65)]"
            aria-label="Saarthi AI chat"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.12),transparent_45%)]" />

            <header className="relative flex shrink-0 items-center justify-between border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ boxShadow: ['0 0 16px rgba(245,158,11,0.12)', '0 0 30px rgba(245,158,11,0.35)', '0 0 16px rgba(245,158,11,0.12)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-300/20 via-amber-500/10 to-transparent text-amber-300"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 16, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-1 rounded-xl border border-dashed border-amber-300/25"
                  />
                  <Bot size={23} />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold tracking-tight text-[#f4f0e8]">Saarthi</h2>
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-amber-300">AI</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/45">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    BayLine car-care concierge
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Saarthi AI"
                className="rounded-xl border border-white/[0.08] p-2.5 text-white/55 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
              >
                <X size={17} />
              </button>
            </header>

            <div className="relative shrink-0 border-b border-white/[0.07] px-4 py-3.5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-amber-300/80">Your vehicle</p>
                  <p className="mt-1 text-xs text-white/40">Personalise your recommendation</p>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ${detailsConfirmed ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/[0.05] text-white/40'}`}>
                  <ShieldCheck size={12} />
                  {detailsConfirmed ? 'Confirmed' : 'Details needed'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="min-w-0 text-[10px] text-white/45">
                  <span className="mb-1.5 flex items-center gap-1"><CarFront size={12} /> Type</span>
                  <select
                    value={vehicleType}
                    onChange={event => { setVehicleType(event.target.value); setDetailsConfirmed(false) }}
                    className="w-full rounded-xl border border-white/[0.09] bg-[#1b1d1a] px-2 py-2.5 text-xs text-[#f4f0e8] outline-none transition focus:border-amber-400/50"
                  >
                    <option value="Car">Car</option>
                    <option value="SUV">SUV</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Sedan">Sedan</option>
                    <option value="Bike">Bike</option>
                  </select>
                </label>
                <label className="min-w-0 text-[10px] text-white/45">
                  <span className="mb-1.5 flex items-center gap-1"><CalendarDays size={12} /> Year</span>
                  <input
                    type="number"
                    min="1980"
                    max={currentYear}
                    value={vehicleYear}
                    onChange={event => { setVehicleYear(event.target.value); setDetailsConfirmed(false) }}
                    className="w-full rounded-xl border border-white/[0.09] bg-[#1b1d1a] px-2 py-2.5 text-xs text-[#f4f0e8] outline-none transition focus:border-amber-400/50"
                  />
                </label>
                <label className="min-w-0 text-[10px] text-white/45">
                  <span className="mb-1.5 flex items-center gap-1"><Gauge size={12} /> Odometer</span>
                  <input
                    type="number"
                    min="0"
                    value={mileage}
                    onChange={event => { setMileage(event.target.value); setDetailsConfirmed(false) }}
                    className="w-full min-w-0 rounded-xl border border-white/[0.09] bg-[#1b1d1a] px-2 py-2.5 text-xs text-[#f4f0e8] outline-none transition focus:border-amber-400/50"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={confirmVehicle}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] py-2.5 text-xs font-semibold text-amber-200 transition hover:border-amber-300/40 hover:bg-amber-300/[0.12] active:scale-[0.99]"
              >
                <ShieldCheck size={14} />
                {detailsConfirmed ? 'Update vehicle details' : 'Confirm vehicle details'}
              </button>
            </div>

            <div className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => (
                  <motion.div
                    key={`${message.role}-${index}`}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-300/[0.08] text-amber-300">
                        <Sparkles size={13} />
                      </div>
                    )}
                    <div className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-[12px] leading-[1.75] ${message.role === 'user' ? 'rounded-br-md bg-gradient-to-br from-amber-300 to-amber-500 font-medium text-[#201a0d]' : 'rounded-bl-md border border-white/[0.07] bg-white/[0.035] text-[#e9e5dc]/85'}`}>
                      {message.text}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 pl-1 text-xs text-white/45">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber-300/15 bg-amber-300/[0.08] text-amber-300">
                    <LoaderCircle size={14} className="animate-spin" />
                  </span>
                  <span>Saarthi is thinking<span className="animate-pulse">…</span></span>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="relative shrink-0 border-t border-white/[0.08] bg-[#111311]/95 p-3.5">
              <form onSubmit={event => { event.preventDefault(); void sendMessage() }}>
                <div className="flex items-center gap-2 rounded-2xl border border-white/[0.10] bg-[#1a1c19] p-1.5 transition focus-within:border-amber-300/35 focus-within:shadow-[0_0_0_3px_rgba(245,158,11,0.05)]">
                  <input
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    placeholder={detailsConfirmed ? 'Describe your car problem…' : 'Confirm vehicle details first…'}
                    aria-label="Describe your car problem"
                    maxLength={1000}
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs text-[#f4f0e8] outline-none placeholder:text-white/25"
                  />
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    type="submit"
                    disabled={!input.trim() || loading}
                    aria-label="Send message"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-[#21190b] shadow-lg shadow-amber-500/10 transition disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Send size={15} />
                  </motion.button>
                </div>
              </form>

              <a
                href="https://wa.me/917558559836?text=Hi%20BayLine%2C%20I%20need%20help%20with%20my%20car"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-white/40 transition hover:text-emerald-300"
              >
                <MessageCircle size={13} />
                Prefer a person? Talk to BayLine on WhatsApp
                <ArrowUpRight size={11} />
              </a>
              <p className="mt-2 text-center text-[9px] text-white/20">AI suggestions are guidance, not a confirmed diagnosis.</p>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen(value => !value)}
        whileHover={{ scale: 1.06, y: -3 }}
        whileTap={{ scale: 0.94 }}
        aria-label={open ? 'Close Saarthi AI' : 'Open Saarthi AI'}
        aria-expanded={open}
        className="fixed bottom-3 right-3 z-[71] flex h-[142px] w-[132px] flex-col items-center justify-end outline-none focus-visible:ring-2 focus-visible:ring-amber-300 sm:bottom-4 sm:right-5 sm:h-[166px] sm:w-[150px]"
      >
        <motion.span
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-x-0 top-0 h-[118px] sm:h-[138px]"
        >
          <SaarthiCharacter3D />
        </motion.span>

        <span className="relative z-10 mb-1 rounded-full border border-orange-300/30 bg-[#15100d]/95 px-3 py-1.5 text-[10px] font-bold tracking-[0.15em] text-orange-200 shadow-[0_0_24px_rgba(255,100,0,0.3)] backdrop-blur-md">
          {open ? 'CLOSE SAARTHI' : 'ASK SAARTHI'}
        </span>
      </motion.button>
    </>
  )
}
