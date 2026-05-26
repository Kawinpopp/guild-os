import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background bg-grid px-4">
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="relative text-center">
        <h1
          className="font-display font-bold text-gradient-primary"
          style={{ fontSize: "clamp(80px, 20vw, 160px)" }}
        >
          404
        </h1>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
