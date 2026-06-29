import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MeterMark } from "@/components/MeterMark";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] grid place-items-center text-center">
      <div>
        <div className="mx-auto mb-6 w-fit opacity-80">
          <MeterMark />
        </div>
        <p className="font-display text-6xl font-bold text-white">404</p>
        <p className="mt-3 text-slate-400 text-sm max-w-sm mx-auto">
          That page slipped through the meter. Let&apos;s get you back to the dashboard.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400 transition"
        >
          <ArrowLeft size={15} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
