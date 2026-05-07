"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function StoreHydrator() {
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
