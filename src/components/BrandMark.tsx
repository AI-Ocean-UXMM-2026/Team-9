export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <img
      className={`brand-image ${className}`}
      src="/brand/symbol-transparent.png"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
