"use client";

type BrandMarkProps = {
  className?: string;
  showProductLabel?: boolean;
};

const LOGO_SRC =
  "https://images.squarespace-cdn.com/content/66af73533f79120d397e78d1/85a060c9-1f1f-4532-a81d-6a0ad8cc6f74/Timbre_white.png?content-type=image%2Fpng&format=1500w";

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
