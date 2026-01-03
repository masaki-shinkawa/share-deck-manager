import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 dark:bg-black">
      <main className="flex flex-col items-center justify-center space-y-8 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-black dark:text-white">
          Share Deck Manager
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400">
          Manage and share your trading card game decks.
        </p>
        <div className="flex gap-4">
          <Link
            href="/login"
            className="rounded-full bg-black px-8 py-3 font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Get Started
          </Link>
        </div>
      </main>
    </div>
  );
}
