export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="sanity-studio"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#101112",
      }}
    >
      {children}
    </div>
  );
}
