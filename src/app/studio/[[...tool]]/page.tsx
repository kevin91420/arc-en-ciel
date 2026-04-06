"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

export const dynamic = "force-dynamic";

export default function StudioPage() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Redirect /studio to /studio/structure
    if (pathname === "/studio" || pathname === "/studio/") {
      router.replace("/studio/structure");
    }
  }, [pathname, router]);

  return <NextStudio config={config} />;
}
