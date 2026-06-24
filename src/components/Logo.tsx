import Link from "next/link";

export function Logo({ size = "lg" }: { size?: "sm" | "md" | "lg" }) {
  const dim = size === "sm" ? 24 : size === "lg" ? 48 : 36;
  const text = size === "sm" ? "text-lg" : size === "lg" ? "text-2xl" : "text-xl";
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <img
        src="/logo-guildos.svg"
        width={dim}
        height={dim}
        alt="GuildOS logo"
        className="shrink-0"
      />
      <span
        className={`font-display font-bold ${text} tracking-wide text-foreground group-hover:text-gradient-primary transition`}
      >
        GuildOS
      </span>
    </Link>
  );
}
