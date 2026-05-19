"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export function NewHandoffButton() {
  return (
    <Link href="/contexts/new" className="btn-primary">
      <Plus className="h-4 w-4" /> New Handoff
    </Link>
  );
}
