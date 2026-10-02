import { FormEvent, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Branch } from '../lib/types'
import { Button } from './UI'

const SERVICE_TYPES = [
  'Oil Change',
  'Brake Inspection & Pad Replacement',
  'General Service',
  'Wheel Alignment & Balancing',
  'AC Service',
  'Battery Check & Replacement',
  'Insurance Claim / Body Work',
  'Something else',
]

const inputClass =
  'w-full rounded-lg border border-graphite-600 bg-graphite-900 px-3 py-2.5 text-sm text-bone outline-none transition focus:border-amber-500 placeholder:text-bone/30'
const labelClass = 'mb-1.5 block text-xs uppercase tracking-wide text-bone/50'

export function EnquiryForm({ branches }: { branches: Branch[] }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    car_make: '',
    car_model: '',
    car_year: '',
    registration_no: '',
    service_type: SERVICE_TYPES[0],
    preferred_branch: '',
    preferred_date: '',
    message: '',
  })

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')
    try {
      const { error } = await supabase.from('enquiries').insert({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        car_make: form.car_make,
        car_model: form.car_model,
        car_year: form.car_year ? Number(form.car_year) : null,
        registration_no: form.registration_no || null,
        service_type: form.service_type,
        preferred_branch: form.preferred_branch || null,
        preferred_date: form.preferred_date || null,
        message: form.message || null,
      })
      if (error) throw error
      setStatus('done')
      setForm({
        full_name: '',
        phone: '',
        email: '',
        car_make: '',
        car_model: '',
        car_year: '',
        registration_no: '',
        service_type: SERVICE_TYPES[0],
        preferred_branch: '',
        preferred_date: '',
        message: '',
      })
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Could not submit your enquiry. Please try again.')
    }
  }

  return (
    <div className="relative rounded-2xl border border-graphite-700 bg-graphite-800/60 p-6 sm:p-8">
      <AnimatePresence mode="wait">
        {status === 'done' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[320px] flex-col items-center justify-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }}
            >
              <CheckCircle2 className="h-14 w-14 text-teal-400" />
            </motion.div>
            <h3 className="mt-4 font-display text-2xl">Enquiry sent</h3>
            <p className="mt-2 max-w-sm text-sm text-bone/60">
              Thanks — a service advisor will call or email you shortly to confirm details and lock in a slot.
            </p>
            <Button variant="ghost" className="mt-6" onClick={() => setStatus('idle')}>
              Submit another enquiry
            </Button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <h3 className="font-display text-2xl">Get a free quote</h3>
              <p className="mt-1 text-sm text-bone/50">
                Tell us about your vehicle and what it needs — no account required.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Full name *</label>
                <input required className={inputClass} placeholder="Riya Sharma" value={form.full_name}
                  onChange={(e) => update('full_name', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Phone number *</label>
                <input required type="tel" className={inputClass} placeholder="+91 98xxxxxxx0" value={form.phone}
                  onChange={(e) => update('phone', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Email (optional)</label>
              <input type="email" className={inputClass} placeholder="you@example.com" value={form.email}
                onChange={(e) => update('email', e.target.value)} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Car make *</label>
                <input required className={inputClass} placeholder="Maruti Suzuki" value={form.car_make}
                  onChange={(e) => update('car_make', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Model *</label>
                <input required className={inputClass} placeholder="Swift" value={form.car_model}
                  onChange={(e) => update('car_model', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Year</label>
                <input type="number" min={1980} max={2026} className={inputClass} placeholder="2021" value={form.car_year}
                  onChange={(e) => update('car_year', e.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Registration number</label>
                <input className={`${inputClass} plate`} placeholder="MH 12 AB 1234" value={form.registration_no}
                  onChange={(e) => update('registration_no', e.target.value.toUpperCase())} />
              </div>
              <div>
                <label className={labelClass}>Service needed *</label>
                <select required className={inputClass} value={form.service_type}
                  onChange={(e) => update('service_type', e.target.value)}>
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Preferred service center</label>
                <select className={inputClass} value={form.preferred_branch}
                  onChange={(e) => update('preferred_branch', e.target.value)}>
                  <option value="">No preference / nearest to me</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} — {b.city}, {b.state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Preferred date</label>
                <input type="date" className={inputClass} value={form.preferred_date}
                  onChange={(e) => update('preferred_date', e.target.value)} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Tell us what's going on (optional)</label>
              <textarea rows={3} className={inputClass} placeholder="e.g. grinding noise when braking, check engine light on…"
                value={form.message} onChange={(e) => update('message', e.target.value)} />
            </div>

            {status === 'error' && <p className="text-sm text-alert-400">{errorMsg}</p>}

            <Button type="submit" disabled={status === 'submitting'} className="flex w-full items-center justify-center gap-2">
              {status === 'submitting' ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  <Send size={16} /> Send enquiry
                </>
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
