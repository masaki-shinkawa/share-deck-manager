import * as cheerio from "cheerio";
import { prisma } from "@/app/lib/prisma";
import { getR2Storage, R2StorageError } from "./r2-storage";

const CARD_LIST_URL = "https://www.onepiece-cardgame.com/cardlist/";

interface CardData {
  cardId: string;
  name: string;
  color: string;
  blockIcon: number;
  imageUrl: string;
}

interface ScrapeResult {
  newCards: number;
  updatedCards: number;
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

      // カードIDを画像ファイル名から抽出
      const cardId = absoluteImageUrl.split("/").pop()?.replace(".jpg", "") ?? "";

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
      });
    } catch (e) {
      console.error("Error parsing card:", e);
    }
  });

  return cards;
}

/**
 * 画像をダウンロードしてR2にアップロード
 */
async function downloadAndUploadImage(
  imageUrl: string,
  cardId: string
): Promise<string | null> {
  try {
    const r2Storage = getR2Storage();

    // R2に既に存在するかチェック
    if (await r2Storage.imageExists(cardId)) {
      console.log(`✅ Image already exists in R2: ${cardId}`);
      return r2Storage.getImageUrl(cardId);
    }

    // 画像をダウンロード
    console.log(`Downloading image for ${cardId}...`);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    console.log(`Downloaded ${imageBuffer.length} bytes for ${cardId}`);

    // R2にアップロード
    console.log(`Uploading ${cardId} to R2...`);
    const r2Url = await r2Storage.uploadImage(cardId, imageBuffer);
    console.log(`✅ Upload successful: ${cardId} -> ${r2Url}`);

    return r2Url;
  } catch (error) {
    if (error instanceof R2StorageError) {
      console.error(`❌ R2 storage error for ${cardId}:`, error);
    } else {
      console.error(`❌ Error downloading/uploading ${cardId}:`, error);
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

  for (const cardData of cardsData) {
    // 画像をダウンロードしてR2にアップロード
    const r2Url = await downloadAndUploadImage(cardData.imageUrl, cardData.cardId);
    if (!r2Url) continue;

    // 既存のカードをチェック
    const existingCard = await prisma.card.findUnique({
      where: { cardId: cardData.cardId },
    });

    if (existingCard) {
      // 既存のカードを更新
      await prisma.card.update({
        where: { cardId: cardData.cardId },
        data: {
          name: cardData.name,
          color: cardData.color,
          blockIcon: cardData.blockIcon,
          imagePath: r2Url,
        },
      });
      updatedCards++;
    } else {
      // 新規カードを作成
      await prisma.card.create({
        data: {
          cardId: cardData.cardId,
          name: cardData.name,
          color: cardData.color,
          blockIcon: cardData.blockIcon,
          imagePath: r2Url,
        },
      });
      newCards++;
    }
  }

  return {
    newCards,
    updatedCards,
    totalCards: cardsData.length,
  };
}
