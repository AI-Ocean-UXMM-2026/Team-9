export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <img
      className={`brand-image ${className}`}
      src="/brand/peacock.png"
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
