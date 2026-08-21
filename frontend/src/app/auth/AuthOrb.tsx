/**
 * The order desk, as light: a jade core that breathes while fragments of a
 * buyer's chat drift in and resolve into one steady point — the product's whole
 * promise (messy DM in, confirmed order out) told without a screenshot.
 *
 * Built from layered gradients rather than three.js on purpose. The 3D bundle is
 * ~818 kB; spending that on a login-screen decoration would make the first screen
 * a seller ever sees the slowest one. Everything here is compositor-only
 * (transform/opacity), so it costs the main thread nothing while they type.
 */
export function AuthOrb() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {/* outer bloom — the light this thing throws onto the panel */}
      <div className="absolute size-[min(56vw,620px)] rounded-full bg-[radial-gradient(circle,rgb(var(--jade-500)/0.30),transparent_62%)] blur-3xl auth-orb-breathe" />

      {/* the sphere */}
      <div className="relative size-[min(34vw,380px)]">
        {/* slow conic sweep = a light source travelling round the body */}
        <div className="absolute inset-[-14%] rounded-full opacity-70 blur-2xl auth-orb-spin bg-[conic-gradient(from_0deg,transparent,rgb(var(--jade-400)/0.55),transparent_38%,rgb(var(--gold-400)/0.20),transparent_72%)]" />

        {/* body: lit from upper-left, shadowed lower-right — that asymmetry is
            what makes a flat circle read as a sphere */}
        <div
          className="absolute inset-0 rounded-full auth-orb-breathe"
          style={{
            background:
              'radial-gradient(circle at 34% 28%, rgb(var(--jade-300)/0.95), rgb(var(--jade-600)/0.85) 42%, rgb(var(--jade-700)/0.55) 66%, transparent 76%)',
            boxShadow:
              'inset -22px -30px 60px -20px rgb(0 0 0 / 0.65), inset 14px 18px 44px -18px rgb(255 255 255 / 0.35), 0 40px 120px -30px rgb(var(--jade-700) / 0.7)',
          }}
        />

        {/* specular hotspot */}
        <div className="absolute left-[26%] top-[20%] size-[22%] rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.75),transparent_70%)] blur-md" />

        {/* orbit ring — the thin line of an object with a plane around it */}
        <div className="absolute inset-[-9%] rounded-full border border-[rgb(var(--jade-300)/0.22)] auth-orb-tilt" />
      </div>
    </div>
  );
}
