## 詳細仕様

### 概要
未発売のリーダーカードは公式サイトからスクレイピングで取得できないため、リーダー選択に表示されない。
手動入力オプションを追加し、未発売カードでもデッキを作成できるようにする。

---

### データモデル

#### 新規テーブル: `custom_cards`

| カラム | 型 | 制約 |
|--------|----|------|
| id | UUID | PK |
| user_id | UUID | FK → users.id, NOT NULL |
| name | TEXT | NOT NULL |
| color | TEXT | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

- 作成したユーザー本人のみが使用可能
- カードグリッドには表示しない（「+ 手動入力」から都度作成）

#### `decks` テーブルの変更

| 変更 | 内容 |
|------|------|
| `leader_card_id` | nullable に変更（公式カード用） |
| `custom_card_id` | 新規追加、UUID, nullable（FK → custom_cards.id） |
| CHECK制約 | `leader_card_id` と `custom_card_id` のどちらか一方が必ずセット |

---

### API

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/v1/custom-cards/` | カスタムカード作成（name, color） |
| POST | `/api/v1/decks/` | 拡張: `custom_card_id` も受付可能に |

---

### UI フロー

1. デッキ作成モーダルを開く
2. カードグリッドの **先頭** に「+ 手動入力」カードを表示
3. クリックすると入力モーダルが表示:
   - カード名（テキスト入力、必須）
   - カラー（既存カラーからドロップダウン選択、必須）
4. 入力後、カスタムカードを作成 → そのままデッキ作成
5. デッキ名は公式カードと同じルール: `"{カラー} {カード名}"`

---

### 表示仕様

- **MyDecks / All Decks 共通**: カスタムカードのデッキは画像の代わりに **カード名 + カラーをテキスト表示**
- 公式リリース後はユーザーが手動でリーダーを差し替え

---

### 対象画面

- [x] MyDecks（`/decks`）
- [x] All Decks（`/all-decks`）

---

### 権限

- 全ユーザーが手動入力可能
- カスタムカードは作成者本人のデッキでのみ使用可能
