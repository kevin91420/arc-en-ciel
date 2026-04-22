import type { Metadata } from "next";

/**
 * /kitchen — KDS (Kitchen Display System).
 *
 * Bare layout: the KDS renders fullscreen on a TV or tablet landscape and
 * must NOT inherit the admin/staff chrome. This wrapper only sets the
 * dark body background and the tab title.
 */

export const metadata: Metadata = {
  title: "KDS Cuisine · L'Arc en Ciel",
  robots: { index: false, follow: false },
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#1a0f0a] text-cream">{children}</div>;
}
