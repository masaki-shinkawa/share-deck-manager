"use client";

import Image from "next/image";
import { UserInfoCardProps } from "@/types/dashboard";

export default function UserInfoCard({ user }: UserInfoCardProps) {
  const displayName = user.nickname || user.email.split("@")[0];

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-zinc-800 p-6">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {user.image ? (
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gradient-to-br from-teal-400 to-teal-600">
            <Image
              src={user.image}
              alt={displayName}
              width={64}
              height={64}
              className="rounded-full object-cover"
              unoptimized={!user.image.includes('googleusercontent.com')}
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-2xl font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold text-white truncate">
          {displayName}
        </h2>
        <p className="text-sm text-gray-400 truncate">{user.email}</p>
      </div>
    </div>
  );
}
