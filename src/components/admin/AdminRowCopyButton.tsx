"use client";

import { Copy } from "lucide-react";
import AdminCopyButton from "@/components/admin/AdminCopyButton";

export default function AdminRowCopyButton({ payload }: { payload: unknown }) {
  return (
    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
      <AdminCopyButton
        payload={payload}
        label={<Copy className="h-3.5 w-3.5" />}
        ariaLabel="Copy row JSON"
        iconOnly
      />
    </div>
  );
}
