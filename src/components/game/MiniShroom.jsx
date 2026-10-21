export default function MiniShroom({ color, size = 40, dead = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={dead ? { opacity: 0.5 } : undefined}>
      <rect x="17" y="24" width="14" height="18" rx="6" fill="#f3e9d2" />
      <path d="M4 28A20 20 0 0 1 44 28Z" fill={color} />
      <circle cx="16" cy="18" r="3.2" fill="#fff" opacity="0.85" />
      <circle cx="29" cy="14" r="3.8" fill="#fff" opacity="0.85" />
      <circle cx="35" cy="23" r="2.6" fill="#fff" opacity="0.85" />
      <circle cx="21" cy="33" r="1.8" fill="#222" />
      <circle cx="27" cy="33" r="1.8" fill="#222" />
    </svg>
  );
}