
import { Link } from 'react-router-dom'
import { Linkedin, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-graphite-700 bg-graphite-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        {/* Brand */}
        <div>
          <Link to="/" className="flex items-center gap-2">
            <span className="status-live h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="font-display text-2xl tracking-wide text-bone">
              BAY<span className="text-amber-500">LINE</span>
            </span>
          </Link>

          <p className="mt-3 max-w-xs text-sm leading-6 text-bone/50">
            Vehicle service booking made simpler. Book a service, manage your
            vehicles, and keep track of your bookings with BayLine.
          </p>

          {/* LinkedIn */}
          <div className="mt-5 flex gap-4 text-bone/50">
            <a
              href="https://www.linkedin.com/in/aarshabh-d-7648482a1/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className="transition-colors hover:text-amber-400"
            >
              <Linkedin size={18} />
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-bone/40">
            Quick links
          </p>
          <ul className="mt-4 space-y-3 text-sm text-bone/60">
            <li>
              <Link to="/" className="transition-colors hover:text-amber-400">
                Home
              </Link>
            </li>
            <li>
              <Link
                to="/login"
                className="transition-colors hover:text-amber-400"
              >
                Sign in / Book online
              </Link>
            </li>
            <li>
              <Link
                to="/dashboard"
                className="transition-colors hover:text-amber-400"
              >
                Customer dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/privacy-policy"
                className="transition-colors hover:text-amber-400"
              >
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>

        {/* Services */}
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-bone/40">
            Popular services
          </p>
          <ul className="mt-4 space-y-3 text-sm text-bone/60">
            <li>Oil change</li>
            <li>Brake pad replacement</li>
            <li>Wheel alignment &amp; balancing</li>
            <li>AC service &amp; regas</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-bone/40">
            Privacy &amp; contact
          </p>
          <p className="mt-4 text-sm leading-6 text-bone/60">
            For privacy questions, personal data requests, or general enquiries,
            contact the BayLine operator.
          </p>

          <a
            href="mailto:aarshabh.99@gmail.com"
            className="mt-4 inline-flex items-center gap-2 break-all text-sm text-bone/70 transition-colors hover:text-amber-400"
          >
            <Mail size={16} className="shrink-0 text-amber-500" />
            aarshabh.99@gmail.com
          </a>

          <p className="mt-3 text-xs leading-5 text-bone/40">
            Operated by Aarshabh Dhoot.
          </p>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-graphite-800 px-6 py-5 text-center text-xs text-bone/30">
        <p>© {new Date().getFullYear()} BayLine. All rights reserved.</p>
        <p className="mt-2">
          <Link
            to="/privacy-policy"
            className="transition-colors hover:text-amber-400"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </footer>
  )
}
