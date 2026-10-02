import { Link } from 'react-router-dom'
import { Facebook, Instagram, MapPin, Phone, Twitter, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-graphite-700 bg-graphite-950">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 status-live" />
            <span className="font-display text-2xl tracking-wide text-bone">
              BAY<span className="text-amber-500">LINE</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-bone/50">
            Real-time vehicle service booking — pick a slot, watch your car's status update live,
            no phone tag required.
          </p>
          <div className="mt-5 flex gap-3 text-bone/50">
            <Facebook size={18} className="hover:text-amber-400" />
            <Instagram size={18} className="hover:text-amber-400" />
            <Twitter size={18} className="hover:text-amber-400" />
          </div>
        </div>

        <div>
          <p className="font-display text-sm uppercase tracking-wide text-bone/40">Quick links</p>
          <ul className="mt-4 space-y-2.5 text-sm text-bone/60">
            <li><a href="#services" className="hover:text-amber-400">Services</a></li>
            <li><a href="#centers" className="hover:text-amber-400">Service centers</a></li>
            <li><a href="#enquiry" className="hover:text-amber-400">Get a quote</a></li>
            <li><Link to="/login" className="hover:text-amber-400">Sign in / Book online</Link></li>
          </ul>
        </div>

        <div>
          <p className="font-display text-sm uppercase tracking-wide text-bone/40">Popular services</p>
          <ul className="mt-4 space-y-2.5 text-sm text-bone/60">
            <li>Oil change</li>
            <li>Brake pad replacement</li>
            <li>Wheel alignment &amp; balancing</li>
            <li>AC service &amp; regas</li>
          </ul>
        </div>

        <div>
          <p className="font-display text-sm uppercase tracking-wide text-bone/40">Talk to us</p>
          <ul className="mt-4 space-y-3 text-sm text-bone/60">
            <li className="flex items-center gap-2"><Phone size={15} className="text-amber-500" /> +91-20-5550-1234</li>
            <li className="flex items-center gap-2"><Mail size={15} className="text-amber-500" /> hello@bayline.example</li>
            <li className="flex items-center gap-2"><MapPin size={15} className="text-amber-500" /> 20+ centers across India</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-graphite-800 py-5 text-center text-xs text-bone/30">
        © {new Date().getFullYear()} BayLine Service Centers. Built for demonstration purposes.
      </div>
    </footer>
  )
}
