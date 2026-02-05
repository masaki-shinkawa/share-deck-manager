import * as cheerio from "cheerio";
import { prisma } from "@/app/lib/prisma";
import { getStorageInstance } from "./storage-factory";
import { StorageError } from "./storage-interface";

const CARD_LIST_URL = "https://www.onepiece-cardgame.com/cardlist/";

interface CardData {
  cardId: string;
  name: string;
  color: string;
  blockIcon: number;
  imageUrl: string;
  imageExtension: string; // 画像の拡張子 (jpg, png, etc.)
}

interface ScrapeResult {
  newCards: number;
  updatedCards: number;
  skippedCards: number;
  totalCards: number;
}

/**
 * カードリストのHTMLを取得
 */
async function fetchCardList(): Promise<string> {
  const headers = {
    accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "accept-language": "ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7",
    "content-type": "application/x-www-form-urlencoded",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };

  // リーダーカードのみをフィルタ
  const body = new URLSearchParams({
    freewords: "",
    series: "",
    "categories[]": "リーダー",
  });

  const response = await fetch(CARD_LIST_URL, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch card list: ${response.status}`);
  }

  return response.text();
}

/**
 * HTMLからカードデータをパース
 */
function parseCards(html: string): CardData[] {
  const $ = cheerio.load(html);
  const cards: CardData[] = [];

  $(".modalCol").each((_, element) => {
    try {
      const $el = $(element);

      // カード画像URL
      const imgTag = $el.find("img.lazy");
      const imageUrl = imgTag.attr("data-src");

      if (!imageUrl) return;

      // 相対URLを絶対URLに変換
      const absoluteImageUrl = imageUrl.startsWith("../")
        ? "https://www.onepiece-cardgame.com" + imageUrl.slice(2)
        : imageUrl;

      // カードIDを画像ファイル名から抽出（クエリパラメータと拡張子を除去）
      const urlWithoutQuery = absoluteImageUrl.split("?")[0]; // クエリパラメータを除去
      const fileName = urlWithoutQuery.split("/").pop() ?? "";

      // 拡張子を抽出
      const extensionMatch = fileName.match(/\.(jpg|png|jpeg|gif|webp)$/i);
      const imageExtension = extensionMatch ? extensionMatch[1].toLowerCase() : "jpg"; // デフォルトはjpg

      // カードIDから拡張子を除去
      const cardId = fileName.replace(/\.(jpg|png|jpeg|gif|webp)$/i, "");

      // カード名
      const name = $el.find(".cardName").text().trim() || "Unknown";

      // カラー
      const colorText = $el.find(".color").text().trim();
      const color = colorText.replace("色", "").trim();

      // ブロックアイコン
      const blockText = $el.find(".block").text().trim();
      const blockMatch = blockText.match(/\d+/);
      const blockIcon = blockMatch ? parseInt(blockMatch[0], 10) : 0;

      cards.push({
        cardId,
        name,
        color,
        blockIcon,
        imageUrl: absoluteImageUrl,
        imageExtension,
      });
    } catch (e) {
      console.error("Error parsing card:", e);
    }
  });

  return cards;
}

/**
 * 画像をダウンロードしてストレージにアップロード
 */
async function downloadAndUploadImage(
  imageUrl: string,
  cardId: string,
  extension: string
): Promise<string | null> {
  try {
    const storage = getStorageInstance();

    // ストレージに既に存在するかチェック
    if (await storage.imageExists(cardId, extension)) {
      console.log(`✅ Image already exists in storage: ${cardId}.${extension}`);
      return storage.getImageUrl(cardId, extension);
    }

    // 画像をダウンロード
    console.log(`Downloading image for ${cardId}.${extension}...`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    console.log(`Downloaded ${imageBuffer.length} bytes for ${cardId}.${extension}`);

    // ストレージにアップロード
    console.log(`Uploading ${cardId}.${extension} to storage...`);
    const storageUrl = await storage.uploadImage(cardId, imageBuffer, extension);
    console.log(`✅ Upload successful: ${cardId}.${extension} -> ${storageUrl}`);

    return storageUrl;
  } catch (error) {
    if (error instanceof StorageError) {
      console.error(`❌ Storage error for ${cardId}.${extension}:`, error);
    } else {
      console.error(`❌ Error downloading/uploading ${cardId}.${extension}:`, error);
    }
    return null;
  }
}

/**
 * カードをスクレイピングしてDBに保存
 */
export async function scrapeAndSaveCards(): Promise<ScrapeResult> {
  // カードリストを取得してパース
  const html = await fetchCardList();
  const cardsData = parseCards(html);

  let newCards = 0;
  let updatedCards = 0;
  let skippedCards = 0;

  const storage = getStorageInstance();

  for (const cardData of cardsData) {
    try {
      // 1. DBで既存カードをチェック（処理順序の最適化）
      const existingCard = await prisma.card.findUnique({
        where: { cardId: cardData.cardId },
      });

      // 2. カードが存在し、画像パスもある場合はスキップ
      if (existingCard && existingCard.imagePath) {
        console.log(`⏭️ Skipping existing card: ${cardData.cardId} (${cardData.name})`);
        skippedCards++;
        continue;
      }

      // 3. 画像が必要な場合のみアップロード
      let storageUrl: string;

      // 画像がストレージに存在するかチェック
      const imageExists = await storage.imageExists(cardData.cardId, cardData.imageExtension);

      if (imageExists) {
        // 既存の画像URLを取得
        storageUrl = storage.getImageUrl(cardData.cardId, cardData.imageExtension);
        console.log(`✅ Image already exists in storage: ${cardData.cardId}.${cardData.imageExtension}`);
      } else {
        // 画像をダウンロードしてアップロード
        const uploadedUrl = await downloadAndUploadImage(
          cardData.imageUrl,
          cardData.cardId,
          cardData.imageExtension
        );
        if (!uploadedUrl) {
          console.error(`❌ Failed to upload image for ${cardData.cardId}.${cardData.imageExtension}, skipping card`);
          continue;
        }
        storageUrl = uploadedUrl;
      }

      // 4. upsertでアトミックに作成または更新（レースコンディション対策）
      const result = await prisma.card.upsert({
        where: { cardId: cardData.cardId },
        update: {
          name: cardData.name,
          color: cardData.color,
          blockIcon: cardData.blockIcon,
          imagePath: storageUrl,
        },
        create: {
          cardId: cardData.cardId,
          name: cardData.name,
          color: cardData.color,
          blockIcon: cardData.blockIcon,
          imagePath: storageUrl,
        },
      });

      // カウントを更新
      if (existingCard) {
        console.log(`🔄 Updated card: ${cardData.cardId} (${cardData.name})`);
        updatedCards++;
      } else {
        console.log(`✨ Created new card: ${cardData.cardId} (${cardData.name})`);
        newCards++;
      }
    } catch (error: any) {
      // P2002: Prismaの一意制約違反エラー（レースコンディション時）
      if (error.code === "P2002") {
        console.log(
          `⚠️ Card ${cardData.cardId} already exists (concurrent execution detected), skipping`
        );
        skippedCards++;
        continue;
      }

      // その他のエラーはログに記録して処理を続行
      console.error(`❌ Error processing card ${cardData.cardId}:`, error);
      continue;
    }
  }

  // 結果サマリーをログ出力
  console.log("\n📊 Scraping Summary:");
  console.log(`  Total cards found: ${cardsData.length}`);
  console.log(`  ✨ New cards created: ${newCards}`);
  console.log(`  🔄 Cards updated: ${updatedCards}`);
  console.log(`  ⏭️ Cards skipped: ${skippedCards}`);

  return {
    newCards,
    updatedCards,
    skippedCards,
    totalCards: cardsData.length,
  };
}
