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
    <Link href={href} className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <Image
        src="/logo.png"
        alt="tagloom"
        width={64}
        height={64}
        className={`${logoClasses} rounded-lg object-contain`}
        priority={size === "nav"}
      />
      <span
        className={`${textClasses} font-semibold lowercase leading-none`}
        style={{ fontFamily: "var(--font-outfit)" }}
      >
        <span className="text-stone-700">tag</span>
        <span className="text-orange-600">loom</span>
      </span>
    </Link>
  );
}
