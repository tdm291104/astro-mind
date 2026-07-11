interface AstroLogoProps {
  size?: number;
}

export function AstroLogo({ size = 28 }: AstroLogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="3.5" fill="var(--ld-accent)" />
      <circle cx="16" cy="16" r="8" stroke="var(--ld-accent)" strokeWidth="0.6" opacity="0.35" />
      <circle cx="16" cy="16" r="13" stroke="var(--ld-accent)" strokeWidth="0.4" opacity="0.15" />
      <circle cx="7" cy="9" r="1.3" fill="var(--ld-text-primary)" opacity="0.55" />
      <circle cx="25" cy="11" r="1" fill="var(--ld-text-primary)" opacity="0.45" />
      <circle cx="9" cy="24" r="1.1" fill="var(--ld-text-primary)" opacity="0.5" />
      <circle cx="24" cy="22" r="0.9" fill="var(--ld-text-primary)" opacity="0.4" />
      <line x1="7" y1="9" x2="16" y2="16" stroke="var(--ld-text-primary)" strokeWidth="0.4" opacity="0.25" />
      <line x1="25" y1="11" x2="16" y2="16" stroke="var(--ld-text-primary)" strokeWidth="0.4" opacity="0.25" />
      <line x1="9" y1="24" x2="16" y2="16" stroke="var(--ld-text-primary)" strokeWidth="0.4" opacity="0.25" />
      <line x1="24" y1="22" x2="16" y2="16" stroke="var(--ld-text-primary)" strokeWidth="0.4" opacity="0.25" />
      <line x1="7" y1="9" x2="9" y2="24" stroke="var(--ld-text-primary)" strokeWidth="0.3" opacity="0.15" />
      <line x1="25" y1="11" x2="24" y2="22" stroke="var(--ld-text-primary)" strokeWidth="0.3" opacity="0.15" />
    </svg>
  );
}
