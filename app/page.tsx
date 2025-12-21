"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col">
        <h1 className="text-6xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          Share Deck Manager
        </h1>
        <p className="text-xl mb-12 text-gray-400 text-center max-w-2xl">
          Manage your card game decks, organize them into groups, and keep track of your strategies.
          Simple, fast, and effective.
        </p>

        <button
          onClick={() => signIn(undefined, { callbackUrl: "/dashboard" })}
          className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          Get Started
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </main>
  );
}
