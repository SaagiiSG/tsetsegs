/** floweros geometric flower mark. Inherits color via currentColor. */
export const BrandMark = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="40 200 1840 1540" className={className} fill="currentColor" aria-hidden="true">
    <polygon points="960,228 1307,730 975,945 940,1580 915,945 603,730" />
    <polygon points="60,605 820,985 935,1710 345,1305" />
    <polygon points="1858,605 1550,1305 945,1710 1075,985" />
  </svg>
);

export default BrandMark;
