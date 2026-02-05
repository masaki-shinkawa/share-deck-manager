# API Naming Convention

## 概要
Share Deck Managerでは、APIレスポンス・リクエストのフィールド名に **camelCase** を統一して使用します。

## 命名規則

### フィールド名の形式
- **API (Request/Response)**: `camelCase`
- **Database (Prisma Schema)**: `camelCase`
- **TypeScript Types**: `camelCase`

### 理由
1. **一貫性**: JavaScriptエコシステムの標準規約に準拠
2. **可読性**: フロントエンド（TypeScript/React）とバックエンド（Next.js API）で同じ命名規則を使用
3. **メンテナンス性**: データ変換の必要性を最小化し、バグを減らす

## 例

### ✅ 正しい例 (camelCase)

```typescript
// API Response
{
  "id": "uuid",
  "listId": "uuid",
  "cardName": "ブラック・マジシャン",
  "quantity": 3,
  "createdAt": "2026-02-06T12:00:00Z",
  "priceEntries": [
    {
      "id": "uuid",
      "itemId": "uuid",
      "storeId": "uuid",
      "price": 1000,
      "updatedAt": "2026-02-06T12:00:00Z"
    }
  ]
}
```

```typescript
// TypeScript Interface
export interface PurchaseItemWithCard {
  id: string;
  listId: string;
  cardName: string | null;
  quantity: number;
  createdAt: string;
  priceEntries?: PriceEntry[];
}
```

### ❌ 間違った例 (snake_case)

```typescript
// 使わない
{
  "list_id": "uuid",
  "card_name": "ブラック・マジシャン",
  "created_at": "2026-02-06T12:00:00Z",
  "price_entries": [...]
}
```

## 主要なエンティティのフィールド名

### Store
```typescript
{
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
```

### PurchaseList
```typescript
{
  id: string;
  userId: string;
  name: string | null;
  status: 'planning' | 'purchased';
  createdAt: string;
  updatedAt: string;
}
```

### PurchaseItem
```typescript
{
  id: string;
  listId: string;
  cardId: string | null;
  customCardId: string | null;
  quantity: number;
  createdAt: string;
}
```

### PurchaseItemWithCard
```typescript
{
  id: string;
  listId: string;
  cardId: string | null;
  customCardId: string | null;
  quantity: number;
  createdAt: string;
  cardName: string | null;
  cardColor: string | null;
  cardImagePath: string | null;
  priceEntries?: PriceEntry[];
  allocations: AllocationInfo[];
}
```

### PriceEntry
```typescript
{
  id: string;
  itemId: string;
  storeId: string;
  price: number | null;
  updatedAt: string;
}
```

### AllocationInfo
```typescript
{
  id: string;
  storeId: string;
  storeName: string;
  storeColor: string;
  quantity: number;
}
```

## API実装のポイント

### Next.js API Route (例)

```typescript
// app/api/v1/purchases/[listId]/items/route.ts
export async function GET(request: Request, { params }: Params) {
  const { listId } = await params;
  return withAuth(request, async (user) => {
    const items = await prisma.purchaseItem.findMany({
      where: { listId },
      include: {
        priceEntries: true,
        allocations: true,
      },
    });

    // レスポンスはcamelCaseで返す
    return items.map((item) => ({
      id: item.id,
      listId: item.listId,
      cardName: item.card?.name ?? null,
      quantity: item.quantity,
      createdAt: item.createdAt,
      priceEntries: item.priceEntries.map((pe) => ({
        id: pe.id,
        itemId: pe.itemId,
        storeId: pe.storeId,
        price: pe.price,
        updatedAt: pe.updatedAt,
      })),
    }));
  });
}
```

### TypeScript API Client (例)

```typescript
// features/purchase/api/purchases.ts
export const purchaseItemsApi = {
  create: (listId: string, data: {
    cardId?: string | null;
    customCardId?: string | null;
    quantity: number;
  }, token?: string) =>
    apiCall<PurchaseItem>(`/api/v1/purchases/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify(data), // camelCaseのまま送信
    }, token),
};
```

## データベースとの対応

Prisma Schemaもcamelcaseを使用しているため、変換は不要です。

```prisma
model PurchaseItem {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  listId        String    @map("list_id") @db.Uuid
  cardId        String?   @map("card_id") @db.Uuid
  customCardId  String?   @map("custom_card_id") @db.Uuid
  quantity      Int
  createdAt     DateTime  @default(now()) @map("created_at")

  list          PurchaseList     @relation(fields: [listId], references: [id], onDelete: Cascade)
  card          Card?            @relation(fields: [cardId], references: [id], onDelete: SetNull)
  customCard    CustomCard?      @relation(fields: [customCardId], references: [id], onDelete: SetNull)
  priceEntries  PriceEntry[]
  allocations   Allocation[]

  @@map("purchase_items")
}
```

Prismaは `@map` で DB列名（snake_case）とTypeScript型（camelCase）を自動マッピングしてくれます。

## まとめ

- **すべてのAPI通信でcamelCaseを使用**
- **snake_caseは使わない**
- **データベース列名は@mapでマッピング**
- **型定義とAPI実装を常に一致させる**

この規約に従うことで、フロントエンドとバックエンドの間でデータを扱う際の混乱を防ぎ、コードの保守性を高めることができます。

## 修正履歴

### 2026-02-06: 全APIエンドポイントをcamelCaseに統一

#### 修正したファイル

1. **API Routes (Backend)**
   - `app/api/v1/purchases/[listId]/items/route.ts` - レスポンスをcamelCaseに変更
   - `app/api/v1/purchases/items/[itemId]/allocations/route.ts` - リクエスト/レスポンスをcamelCaseに変更
   - `app/api/v1/purchases/allocations/[allocationId]/route.ts` - レスポンスをcamelCaseに変更

2. **API Client (Frontend)**
   - `features/purchase/api/purchases.ts` - 型定義とリクエストをcamelCaseに統一
   - `features/purchase/api/custom-cards.ts` - 型定義をcamelCaseに変更

3. **Page Component**
   - `app/purchase/page.tsx` - データ変換処理をcamelCaseに対応

#### 主な変更点

**Allocations API**
- リクエスト: `store_id` → `storeId`
- レスポンス: `store_name` → `storeName`, `store_color` → `storeColor`

**Purchase Items API**
- レスポンス: `price_entries` → `priceEntries`
- レスポンス: `card_name` → `cardName`
- リクエスト: `custom_card_id` → `customCardId`

**Custom Cards API**
- レスポンス: `user_id` → `userId`, `created_at` → `createdAt`, `updated_at` → `updatedAt`

**Optimal Plan API**
- レスポンス: すべてのフィールドをcamelCaseに統一

#### 修正の効果

- ✅ 価格設定後のリロードで価格が消える問題を解決
- ✅ Allocation作成時の Internal Server Error を解決
- ✅ フロントエンドとバックエンドのフィールド名が完全に一致
- ✅ TypeScript型定義との整合性を確保
