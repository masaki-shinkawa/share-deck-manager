"use client";

import Link from "next/link";
import { DashboardCardProps } from "@/types/dashboard";

export default function DashboardCard({
  title,
  description,
  href,
  icon,
  disabled = false,
}: DashboardCardProps) {
  const cardContent = (
    <div
      className={`
        relative rounded-2xl bg-zinc-800 p-6 transition-all duration-200
        ${
          disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:bg-zinc-700 cursor-pointer group"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>

        {icon === "arrow" && !disabled && (
          <svg
            className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        )}

        {icon === "lock" && (
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        )}
      </div>
    </div>
  );

  if (disabled || !href) {
    return cardContent;
  }

  return <Link href={href}>{cardContent}</Link>;
}
