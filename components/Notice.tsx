export default function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="my-4 border-l-2 border-gold bg-gold-soft/60 px-3 py-2 text-sm text-ink">
      {children}
    </p>
  );
}
