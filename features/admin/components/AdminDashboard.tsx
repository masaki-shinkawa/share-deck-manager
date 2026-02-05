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

interface ImageUrlStatus {
  total_cards: number;
  categories: {
    r2_urls: number;
    external_urls: number;
    local_paths: number;
    other: number;
  };
  sample_urls: Array<{
    card_id: string;
    image_path: string;
  }>;
  r2_public_url: string;
  migration_status: {
    migrated: number;
    needs_migration: number;
    is_complete: boolean;
  };
}

interface MigrationResult {
  status: string;
  updated_count: number;
  skipped_count: number;
  total_cards: number;
  r2_public_url: string;
  updated_cards: Array<{
    card_id: string;
    old_path: string;
    new_path: string;
  }>;
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

  // Image URL migration states
  const [urlStatus, setUrlStatus] = useState<ImageUrlStatus | null>(null);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [isCheckingUrls, setIsCheckingUrls] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
        setError("アクセスが拒否されました。管理者権限が必要です。");
      } else {
        setError("統計情報の取得に失敗しました。");
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("ネットワークエラー。統計情報を取得できませんでした。");
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
        setError("アクセスが拒否されました。管理者権限が必要です。");
      } else {
        setScrapeResult(data);
      }
    } catch (err) {
      console.error("Error scraping cards:", err);
      setError("ネットワークエラー。カードのスクレイピングを実行できませんでした。");
    } finally {
      setIsScraping(false);
    }
  };

  const handleCheckImageUrls = async () => {
    setIsCheckingUrls(true);
    setUrlStatus(null);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/check-image-urls`, {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setUrlStatus(data);
      } else if (response.status === 403) {
        setError("アクセスが拒否されました。管理者権限が必要です。");
      } else {
        setError("画像URLの確認に失敗しました。");
      }
    } catch (err) {
      console.error("Error checking image URLs:", err);
      setError("ネットワークエラー。画像URLを確認できませんでした。");
    } finally {
      setIsCheckingUrls(false);
    }
  };

  const handleMigrateImageUrls = async () => {
    setIsMigrating(true);
    setMigrationResult(null);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/api/v1/admin/migrate-image-urls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMigrationResult(data);
        // Refresh URL status after migration
        await handleCheckImageUrls();
      } else if (response.status === 403) {
        setError("アクセスが拒否されました。管理者権限が必要です。");
      } else {
        setError(data.detail || "画像URLの移行に失敗しました。");
      }
    } catch (err) {
      console.error("Error migrating image URLs:", err);
      setError("ネットワークエラー。移行を実行できませんでした。");
    } finally {
      setIsMigrating(false);
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
              アクセス拒否
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
        <div className="text-center text-gray-500">統計情報を読み込み中...</div>
      ) : stats ? (
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-blue-50 to-blue-100 p-6 dark:border-gray-700 dark:from-blue-900/20 dark:to-blue-800/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  総カード数
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
                  総デッキ数
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
                  総ユーザー数
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
              カードマスターデータ管理
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              公式サイトからリーダーカードデータを取得・更新
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
                スクレイピング中...
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
                カードを取得
              </>
            )}
          </button>
        </div>

        {/* Scrape Result */}
        {scrapeResult && (
          <div
            className={`mt-6 rounded-lg border p-4 ${scrapeResult.status === "success"
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
                  className={`font-semibold ${scrapeResult.status === "success"
                    ? "text-green-800 dark:text-green-300"
                    : "text-red-800 dark:text-red-300"
                    }`}
                >
                  {scrapeResult.status === "success"
                    ? "取得完了"
                    : "取得失敗"}
                </h3>
                <p
                  className={`mt-1 text-sm ${scrapeResult.status === "success"
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
                        新規カード
                      </p>
                      <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                        {scrapeResult.new_cards}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        更新カード
                      </p>
                      <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {scrapeResult.updated_cards}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        総処理数
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
                  エラー
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image URL Migration Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Cloudflare R2への画像URL移行
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              外部/ローカルパスの画像URLをチェックし、Cloudflare R2へ移行
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCheckImageUrls}
              disabled={isCheckingUrls}
              className="flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isCheckingUrls ? (
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
                  確認中...
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  ステータス確認
                </>
              )}
            </button>
            <button
              onClick={handleMigrateImageUrls}
              disabled={isMigrating || !urlStatus || urlStatus.migration_status.is_complete}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isMigrating ? (
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
                  移行中...
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  R2へ移行
                </>
              )}
            </button>
          </div>
        </div>

        {/* URL Status */}
        {urlStatus && (
          <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-zinc-800">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                移行ステータス
              </h3>
              {urlStatus.migration_status.is_complete ? (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  ✅ 全 {urlStatus.total_cards} 枚のカードがR2のURLを使用しています
                </p>
              ) : (
                <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                  ⚠️ {urlStatus.total_cards} 枚中 {urlStatus.migration_status.needs_migration} 枚のカードが移行が必要です
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded bg-blue-100 p-3 dark:bg-blue-900/30">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  R2 URL
                </p>
                <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {urlStatus.categories.r2_urls}
                </p>
              </div>
              <div className="rounded bg-orange-100 p-3 dark:bg-orange-900/30">
                <p className="text-xs font-medium text-orange-600 dark:text-orange-400">
                  外部 URL
                </p>
                <p className="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {urlStatus.categories.external_urls}
                </p>
              </div>
              <div className="rounded bg-purple-100 p-3 dark:bg-purple-900/30">
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  ローカルパス
                </p>
                <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {urlStatus.categories.local_paths}
                </p>
              </div>
              <div className="rounded bg-gray-100 p-3 dark:bg-gray-700">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  その他
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {urlStatus.categories.other}
                </p>
              </div>
            </div>

            {urlStatus.sample_urls.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  URLサンプル:
                </p>
                <div className="mt-2 space-y-1">
                  {urlStatus.sample_urls.map((sample, idx) => (
                    <div key={idx} className="text-xs font-mono text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">{sample.card_id}:</span>{" "}
                      <span className="truncate">{sample.image_path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Migration Result */}
        {migrationResult && (
          <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
            <div className="flex items-start gap-3">
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
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  移行完了
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  {migrationResult.status === "no_changes_needed"
                    ? "変更不要 - 全てのカードが既にR2のURLを使用しています"
                    : `{migrationResult.updated_count} 枚のカードをR2へ移行しました`}
                </p>

                {migrationResult.updated_count > 0 && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        更新済み
                      </p>
                      <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                        {migrationResult.updated_count}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        スキップ
                      </p>
                      <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {migrationResult.skipped_count}
                      </p>
                    </div>
                    <div className="rounded bg-white p-3 dark:bg-zinc-800">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        総カード数
                      </p>
                      <p className="mt-1 text-2xl font-bold text-gray-600 dark:text-gray-400">
                        {migrationResult.total_cards}
                      </p>
                    </div>
                  </div>
                )}

                {migrationResult.updated_cards.length > 0 && (
                  <div className="mt-3 rounded bg-white p-3 dark:bg-zinc-800">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      移行サンプル (最初の10件):
                    </p>
                    <div className="mt-2 space-y-2">
                      {migrationResult.updated_cards.map((card, idx) => (
                        <div key={idx} className="text-xs">
                          <p className="font-semibold text-gray-700 dark:text-gray-300">
                            {card.card_id}
                          </p>
                          <p className="font-mono text-red-600 dark:text-red-400">
                            - {card.old_path.slice(0, 60)}...
                          </p>
                          <p className="font-mono text-green-600 dark:text-green-400">
                            + {card.new_path.slice(0, 60)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
