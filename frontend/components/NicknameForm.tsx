"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface NicknameFormProps {
  idToken: string;
}

export default function NicknameForm({ idToken }: NicknameFormProps) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ nickname }),
      });

      if (response.ok) {
        router.push("/dashboard");
      } else {
        console.error("Failed to update nickname");
      }
    } catch (error) {
      console.error("Error updating nickname:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <div>
        <label
          htmlFor="nickname"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Nickname
        </label>
        <input
          id="nickname"
          type="text"
          required
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 dark:border-gray-600 dark:bg-zinc-700 dark:text-white"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {isLoading ? "Saving..." : "Get Started"}
      </button>
    </form>
  );
}
