import Link from "next/link";

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-900 p-8">
      <div className="mx-auto max-w-2xl text-center">
        {/* Lock Icon */}
        <div className="mb-8 flex justify-center">
          <div className="rounded-full bg-zinc-800 p-8">
            <svg
              className="h-24 w-24 text-gray-400"
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
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-5xl font-bold text-white">Coming Soon</h1>

        {/* Description */}
        <p className="mb-8 text-xl text-gray-400">
          We're working on exciting new features to enhance your deck management experience.
          Stay tuned!
        </p>

        {/* Features List */}
        <div className="mb-12 rounded-2xl bg-zinc-800 p-8 text-left">
          <h2 className="mb-4 text-2xl font-semibold text-white">
            What's in the works:
          </h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-5 w-5 flex-shrink-0 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Advanced deck analytics and statistics</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-5 w-5 flex-shrink-0 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Deck sharing and collaboration tools</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-5 w-5 flex-shrink-0 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Tournament preparation features</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="mt-1 h-5 w-5 flex-shrink-0 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Mobile app companion</span>
            </li>
          </ul>
        </div>

        {/* Back to Dashboard Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-8 py-3 font-semibold text-white transition-colors hover:bg-teal-700"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
