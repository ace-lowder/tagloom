import Image from "next/image";
import Link from "next/link";

type BrandMarkProps = {
  href?: string;
  size?: "nav" | "footer";
  className?: string;
};

export default function BrandMark({ href = "/", size = "nav", className = "" }: BrandMarkProps) {
  const logoClasses = size === "nav" ? "h-8 w-8" : "h-7 w-7";
  const textClasses = size === "nav" ? "text-lg" : "text-base";

  return (
    <Link href={href} className={`brand-link inline-flex items-center gap-2 ${className}`.trim()}>
      <Image
        src="/logo.png"
        alt="updatetags"
        width={64}
        height={64}
        className={`brand-logo ${logoClasses} rounded-lg object-contain`}
        priority={size === "nav"}
      />
      <span
        className={`brand-text ${textClasses} font-semibold leading-none`}
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        <span className="text-stone-700">Update</span>
        <span className="text-orange-600">Tags</span>
      </span>
    </Link>
  );
}
