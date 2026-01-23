"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  total_cards: number;
  total_decks: number;
  total_users: number;
}

interface ScrapeResult {
  status: string;
  new_cards: number;
  updated_cards: number;
  total_cards: number;
  errors: string[];
  message: string;
}

interface AdminDashboardProps {
  idToken: string;
}

export default function AdminDashboard({ idToken }: AdminDashboardProps) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isScraping, setIsScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/stats`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setError(null);
      } else if (response.status === 403) {
        setError("Access denied. Admin privileges required.");
      } else {
        setError("Failed to fetch admin statistics.");
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Network error. Could not fetch statistics.");
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleScrapeCards = async () => {
    setIsScraping(true);
    setScrapeResult(null);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/scrape-cards`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setScrapeResult(data);
        // Refresh stats after successful scraping
        fetchStats();
      } else if (response.status === 403) {
        setError("Access denied. Admin privileges required.");
      } else {
        setScrapeResult(data);
      }
    } catch (err) {
      console.error("Error scraping cards:", err);
      setError("Network error. Could not perform card scraping.");
    } finally {
      setIsScraping(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [idToken]);

  if (error && !stats) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-900/20">
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-red-800 dark:text-red-300">
              Access Denied
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      {isLoadingStats ? (
        <div className="text-center text-gray-500">Loading statistics...</div>
      ) : stats ? (
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 dark:border-gray-700 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  Total Cards
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_cards}
                </p>
              </div>
              <svg
                className="h-12 w-12 text-blue-400 dark:text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-purple-50 to-purple-100 p-6 dark:border-gray-700 dark:from-purple-900/20 dark:to-purple-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  Total Decks
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_decks}
                </p>
              </div>
              <svg
                className="h-12 w-12 text-purple-400 dark:text-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-green-100 p-6 dark:border-gray-700 dark:from-green-900/20 dark:to-green-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  Total Users
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.total_users}
                </p>
              </div>
              <svg
                className="h-12 w-12 text-green-400 dark:text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      ) : null}

      {/* Card Scraping Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Card Master Data Management
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Scrape and update leader card data from the official One Piece Card
              Game website
            </p>
          </div>
          <button
            onClick={handleScrapeCards}
            disabled={isScraping}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {isScraping ? (
              <>
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Scraping...
              </>
            ) : (
              <>
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Scrape Cards
              </>
            )}
          </button>
        </div>

        {/* Scrape Result */}
        {scrapeResult && (
          <div
            className={`mt-6 rounded-lg border p-4 ${
              scrapeResult.status === "success"
                ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-900/20"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20"
            }`}
          >
            <div className="flex items-start gap-3">
              {scrapeResult.status === "success" ? (
                <svg
                  className="h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    scrapeResult.status === "success"
                      ? "text-green-800 dark:text-green-300"
                      : "text-red-800 dark:text-red-300"
                  }`}
                >
                  {scrapeResult.status === "success"
                    ? "Scraping Completed"
                    : "Scraping Failed"}
                </h3>
                <p
                  className={`mt-1 text-sm ${
                    scrapeResult.status === "success"
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-700 dark:text-red-400"
                  }`}
                >
                  {scrapeResult.message}
                </p>
                {scrapeResult.status === "success" && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        New Cards
                      </p>
                      <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                        {scrapeResult.new_cards}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Updated Cards
                      </p>
                      <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {scrapeResult.updated_cards}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        Total Processed
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {scrapeResult.total_cards}
                      </p>
                    </div>
                  </div>
                )}
                {scrapeResult.errors.length > 0 && (
                  <div className="mt-3 rounded bg-red-100 p-3 dark:bg-red-900/30">
                    <p className="text-xs font-medium text-red-800 dark:text-red-300">
                      Errors:
                    </p>
                    <ul className="mt-1 list-inside list-disc text-xs text-red-700 dark:text-red-400">
                      {scrapeResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <svg
                className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-300">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
