export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <img
      className={`brand-image ${className}`}
      src="/brand/symbol.svg"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
