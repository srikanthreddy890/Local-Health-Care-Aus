import { cn } from '@/lib/utils'

type AvatarVariant = 'patient' | 'clinic' | 'doctor'

interface Props {
  variant: AvatarVariant
  className?: string
  /** Override the icon size (defaults to 60% of container) */
  iconScale?: number
  /** Index for color variation (doctors get unique colors based on position) */
  colorIndex?: number
}

const GRADIENTS: Record<AvatarVariant, string> = {
  patient: 'from-[#6EE7B7] to-[#3B82F6]',
  clinic: 'from-[#818CF8] to-[#6366F1]',
  doctor: 'from-[#34D399] to-[#059669]',
}

/** Distinct gradient palette for doctor avatars when colorIndex is provided */
const DOCTOR_GRADIENTS = [
  'from-[#3B82F6] to-[#1D4ED8]',   // blue
  'from-[#F472B6] to-[#DB2777]',   // pink
  'from-[#2DD4BF] to-[#0D9488]',   // teal
  'from-[#A78BFA] to-[#7C3AED]',   // violet
  'from-[#FBBF24] to-[#D97706]',   // amber
  'from-[#34D399] to-[#059669]',   // emerald (original)
  'from-[#F87171] to-[#DC2626]',   // red
  'from-[#38BDF8] to-[#0284C7]',   // sky
]

/**
 * A polished default avatar with a soft gradient background and a clean
 * SVG silhouette. Use when no profile picture / logo has been uploaded.
 *
 * Variants:
 * - `patient` — person silhouette (head + shoulders)
 * - `clinic`  — building silhouette
 * - `doctor`  — person with stethoscope silhouette
 *
 * Pass `colorIndex` for doctors to get unique colors per position.
 */
export default function DefaultAvatar({ variant, className, iconScale = 0.6, colorIndex }: Props) {
  const gradient = variant === 'doctor' && colorIndex !== undefined
    ? DOCTOR_GRADIENTS[colorIndex % DOCTOR_GRADIENTS.length]
    : GRADIENTS[variant]

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        gradient,
        className,
      )}
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute text-white/90"
        style={{ width: `${iconScale * 100}%`, height: `${iconScale * 100}%` }}
      >
        {variant === 'patient' && <PatientIcon />}
        {variant === 'clinic' && <ClinicIcon />}
        {variant === 'doctor' && <DoctorIcon />}
      </svg>
    </div>
  )
}

/* ── SVG icon parts ──────────────────────────────────────────────────────── */

function PatientIcon() {
  return (
    <>
      {/* Head */}
      <circle cx="60" cy="38" r="22" fill="currentColor" />
      {/* Shoulders */}
      <path
        d="M16 110 C16 82, 36 68, 60 68 C84 68, 104 82, 104 110"
        fill="currentColor"
      />
    </>
  )
}

function ClinicIcon() {
  return (
    <>
      {/* Main building */}
      <rect x="28" y="36" width="64" height="74" rx="4" fill="currentColor" />
      {/* Roof/top */}
      <rect x="42" y="14" width="36" height="30" rx="3" fill="currentColor" />
      {/* Cross (cut-out effect) */}
      <rect x="55" y="20" width="10" height="20" rx="2" fill="white" opacity="0.35" />
      <rect x="50" y="25" width="20" height="10" rx="2" fill="white" opacity="0.35" />
      {/* Windows row 1 */}
      <rect x="36" y="46" width="14" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="54" y="46" width="14" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="72" y="46" width="14" height="12" rx="2" fill="currentColor" opacity="0.3" />
      {/* Windows row 2 */}
      <rect x="36" y="64" width="14" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="54" y="64" width="14" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="72" y="64" width="14" height="12" rx="2" fill="currentColor" opacity="0.3" />
      {/* Door */}
      <rect x="50" y="86" width="20" height="24" rx="3" fill="currentColor" opacity="0.3" />
    </>
  )
}

function DoctorIcon() {
  return (
    <>
      {/* Head */}
      <circle cx="60" cy="34" r="20" fill="currentColor" />
      {/* Body / coat */}
      <path
        d="M18 110 C18 84, 36 70, 60 70 C84 70, 102 84, 102 110"
        fill="currentColor"
      />
      {/* Stethoscope tube */}
      <path
        d="M44 58 C44 58, 32 66, 32 82 C32 92, 40 96, 46 96"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
        opacity="0.5"
      />
      {/* Stethoscope chest piece */}
      <circle cx="46" cy="98" r="6" fill="currentColor" opacity="0.5" />
      {/* Coat collar left */}
      <path d="M48 72 L60 88 L52 72Z" fill="currentColor" opacity="0.3" />
      {/* Coat collar right */}
      <path d="M72 72 L60 88 L68 72Z" fill="currentColor" opacity="0.3" />
    </>
  )
}
