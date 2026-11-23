/** Re-mounts on every navigation, replaying a pure-CSS page enter (no JS needed, no hydration flash). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-[page-in_0.55s_var(--ease-out)_both]">{children}</div>;
}
