"use client";

type BrandMarkProps = {
  className?: string;
  showProductLabel?: boolean;
};

const LOGO_SRC = "/brand/timbre-white.webp";

export function BrandMark({ className = "", showProductLabel = true }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${className}`.trim()}>
      <img
        className="brand-logo"
        src={LOGO_SRC}
        alt="Timbre Pro Audio"
        loading="eager"
        decoding="async"
      />
      {showProductLabel ? <span className="brand-product">OPS</span> : null}
    </span>
  );
}
