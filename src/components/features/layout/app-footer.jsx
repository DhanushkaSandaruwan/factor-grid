import pkg from '../../../../package.json';

/**
 * Application footer: copyright owner and the running version. It sits in
 * the fixed-height app shell beneath the page, so it never adds page scroll.
 */
export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border/70 text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t px-4 py-1.5 text-[0.7rem] sm:px-6">
      <p>
        Developed by <span className="text-foreground font-medium">AQORD PRIVATE LIMITED</span> · © {year} All
        rights reserved
      </p>
      <p className="font-mono">Factor Grid v{pkg.version}</p>
    </footer>
  );
}
