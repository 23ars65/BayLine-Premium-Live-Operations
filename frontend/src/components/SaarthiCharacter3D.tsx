import { useEffect, useState } from 'react'

/** Image-based Saarthi mascot. Keeps the existing component API so SaarthiAI.tsx does not need changes. */
export default function SaarthiCharacter3D() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  return (
    <div className={`saarthi-image-mascot ${reducedMotion ? 'saarthi-image-mascot-static' : ''}`} aria-hidden="true">
      <div className="saarthi-image-halo" />
      <img
        className="saarthi-image-mascot-art"
        src="/saarthi-robot.png"
        alt=""
        draggable={false}
        fetchPriority="high"
      />
      {!reducedMotion && <span className="saarthi-image-spark saarthi-image-spark-one" />}
      {!reducedMotion && <span className="saarthi-image-spark saarthi-image-spark-two" />}
      <style>{`
        .saarthi-image-mascot{position:relative;width:100%;height:100%;min-height:90px;display:flex;align-items:center;justify-content:center;isolation:isolate;overflow:visible}
        .saarthi-image-halo{position:absolute;width:72%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,rgba(213,255,69,.18) 0%,rgba(213,255,69,.06) 38%,transparent 72%);filter:blur(9px);z-index:-1;animation:saarthi-halo-pulse 4s ease-in-out infinite}
        .saarthi-image-mascot-art{position:relative;display:block;width:100%;height:100%;max-width:320px;max-height:320px;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 8px 22px rgba(0,0,0,.32)) drop-shadow(0 0 12px rgba(213,255,69,.10));animation:saarthi-mascot-float 4.8s ease-in-out infinite;user-select:none;-webkit-user-drag:none}
        .saarthi-image-spark{position:absolute;width:5px;height:5px;border-radius:50%;background:#d5ff45;box-shadow:0 0 12px #d5ff45;opacity:.8}
        .saarthi-image-spark-one{top:24%;right:16%;animation:saarthi-spark 3.2s ease-in-out infinite}
        .saarthi-image-spark-two{top:56%;left:12%;animation:saarthi-spark 3.8s ease-in-out infinite reverse}
        .saarthi-image-mascot-static .saarthi-image-mascot-art,.saarthi-image-mascot-static .saarthi-image-halo,.saarthi-image-mascot-static .saarthi-image-spark{animation:none}
        @keyframes saarthi-mascot-float{0%,100%{transform:translateY(0) rotate(-.5deg)}50%{transform:translateY(-5px) rotate(.5deg)}}
        @keyframes saarthi-halo-pulse{0%,100%{opacity:.65;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}}
        @keyframes saarthi-spark{0%,100%{opacity:.25;transform:scale(.7)}50%{opacity:1;transform:scale(1.2)}}
        @media(prefers-reduced-motion:reduce){.saarthi-image-mascot-art,.saarthi-image-halo,.saarthi-image-spark{animation:none!important}}
      `}</style>
    </div>
  )
}
