"use client";

import type { ReactNode } from "react";

import { PosGate } from "@/components/pos/pos-gate";

export default function PosLayout({ children }: { children: ReactNode }) {
  return <PosGate>{children}</PosGate>;
}
