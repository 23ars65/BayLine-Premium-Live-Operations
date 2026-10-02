import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, LockKeyhole, Mail, KeyRound } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { Button } from '../components/UI'

export function Login() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return

      // Supabase adds a recovery session when the user opens the
      // password-reset link from their email.
      if (data.session && window.location.hash.includes('type=recovery')) {
        setMode('reset')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) {
        setMode('reset')
        setError(null)
        setMessage(null)
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)

    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        })

        if (error) throw error

        setMessage('Password reset link sent. Check your email and open the link to create a new password.')
        return
      }

      if (mode === 'reset') {
        if (newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters.')
        }

        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.')
        }

        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })

        if (error) throw error

        setMessage('Password updated successfully. You can now sign in with your new password.')
        setPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setMode('signin')
        return
      }

      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }

      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const isForgot = mode === 'forgot'
  const isReset = mode === 'reset'

  return (
    <main className="relative flex min-h-[calc(100vh-72px)] items-center justify-center overflow-hidden px-5 py-12">
      <div className="bayline-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-graphite-700 bg-graphite-900/85 shadow-2xl lg:grid-cols-2">
        <section className="hidden flex-col justify-between border-r border-graphite-700 bg-gradient-to-br from-amber-500/[.11] via-transparent to-teal-500/[.06] p-10 lg:flex">
          <div>
            <p className="text-xs font-mono uppercase tracking-[.22em] text-amber-500">BAYLINE</p>
            <h1 className="mt-5 font-display text-5xl leading-[.98]">Service without the waiting.</h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-bone/50">Find a center, see live bay availability and book your vehicle in minutes.</p>
          </div>
          <div className="space-y-3">
            {['Real-time bay availability', 'Upfront service pricing', 'Live booking status'].map((x) => (
              <div key={x} className="flex items-center gap-2 text-sm text-bone/65">
                <CheckCircle2 size={16} className="text-teal-300" />{x}
              </div>
            ))}
          </div>
        </section>

        <section className="p-6 sm:p-9">
          <div className="mb-8">
            <p className="text-xs font-mono uppercase tracking-[.2em] text-amber-500">Welcome</p>
            <h2 className="mt-2 font-display text-3xl">
              {isForgot ? 'Reset your password' : isReset ? 'Create a new password' : mode === 'signin' ? 'Sign in to BayLine' : 'Create your account'}
            </h2>
            <p className="mt-2 text-sm text-bone/40">
              {isForgot
                ? 'Enter your email and we will send you a secure reset link.'
                : isReset
                  ? 'Choose a new password for your BayLine account.'
                  : mode === 'signin'
                    ? 'Your garage and bookings are waiting.'
                    : 'Your first service booking is only a few clicks away.'}
            </p>
          </div>

          {!isForgot && !isReset && (
            <div className="mb-6 grid grid-cols-2 rounded-xl border border-graphite-700 p-1">
              <button onClick={() => { setMode('signin'); setError(null); setMessage(null) }} className={`rounded-lg py-2 text-sm font-medium transition ${mode === 'signin' ? 'bg-amber-500 text-graphite-950' : 'text-bone/50'}`}>Sign in</button>
              <button onClick={() => { setMode('signup'); setError(null); setMessage(null) }} className={`rounded-lg py-2 text-sm font-medium transition ${mode === 'signup' ? 'bg-amber-500 text-graphite-950' : 'text-bone/50'}`}>Create account</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <Field label="Full name">
                <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} placeholder="Your name" />
              </Field>
            )}

            <Field label="Email">
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
            </Field>

          {(mode === 'signin' || mode === 'signup') && (
  <Field label="Password">
    <input
      required
      type="password"
      minLength={6}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className={inputCls}
      placeholder="••••••••"
    />
  </Field>
)}

{mode === 'signin' && (
  <div className="-mt-1 text-right">
    <button
      type="button"
      onClick={() => {
        setMode('forgot')
        setError(null)
        setMessage(null)
      }}
      className="text-xs font-medium text-amber-400 transition hover:text-amber-300"
    >
      Forgot password?
    </button>
  </div>
)}

            {mode === 'reset' && (
              <>
                <Field label="New password">
                  <input required type="password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
                </Field>
                <Field label="Confirm new password">
                  <input required type="password" minLength={6} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
                </Field>
              </>
            )}

            {error && <p className="rounded-xl border border-alert-500/30 bg-alert-500/10 p-3 text-sm text-alert-300">{error}</p>}
            {message && <p className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-sm text-teal-300">{message}</p>}

            <Button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 py-3">
              {isForgot ? <Mail size={16} /> : isReset ? <KeyRound size={16} /> : <LockKeyhole size={16} />}
              {busy ? 'Please wait…' : isForgot ? 'Send reset link' : isReset ? 'Update password' : mode === 'signin' ? 'Sign in' : 'Create account'}
              <ArrowRight size={16} />
            </Button>
          </form>

          {(isForgot || isReset) && (
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setMessage(null) }}
              className="mt-5 flex w-full items-center justify-center text-xs text-bone/40 transition hover:text-bone/70"
            >
              ← Back to sign in
            </button>
          )}

          <p className="mt-6 text-center text-[11px] leading-5 text-bone/30">New accounts are created as customer accounts. Staff/admin roles can be assigned from Supabase.</p>
        </section>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-[10px] uppercase tracking-widest text-bone/35">{label}</span>{children}</label>
}

const inputCls = 'w-full rounded-xl border border-graphite-700 bg-graphite-950 px-3 py-3 text-sm outline-none transition focus:border-amber-500'
