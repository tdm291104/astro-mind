/**
 * Pulsar — loading indicator shaped like radio pulses from a pulsar:
 * a cyan core with rings that expand and fade. Replaces spinners.
 */
export function Pulsar({ label = "Đang phân tích…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ivory/60">
      <span className="pulsar" aria-hidden="true">
        <span />
      </span>
      <span>{label}</span>
    </div>
  );
}
