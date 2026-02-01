# Share Deck Manager - アーキテクチャ設計

## プロジェクト概要
デッキのメタデータ（名前、説明、レシピURL）を管理するWebアプリケーション

**Phase 1スコープ:**
- デッキ情報の登録・編集・削除
- グループベースのアクセス管理
- 実際のカード内容は外部システム（実物カード、別アプリ等）で管理する想定
- デッキレシピへの外部リンク機能

**ドキュメント:**
- [認証アーキテクチャ](docs/AUTHENTICATION.md) - Google OAuth 2.0とJWT認証の詳細設計

## 技術スタック選定

### フロントエンド
- **フレームワーク**: Next.js (React)
- **デプロイ**: Vercel
- **スタイリング**: TBD (CSS/Tailwind CSS)

### バックエンド
- **フレームワーク**: FastAPI (Python)
  - 選定理由:
    - 非同期対応で高速
    - 自動APIドキュメント生成（OpenAPI/Swagger）
    - Pydanticによる型安全性
    - Vercelサーバーレス環境との相性◎
- **ORM**: SQLModel
  - 選定理由:
    - FastAPI作者が開発、完璧な統合
    - PydanticとSQLAlchemyを統合
    - 型ヒント・型安全性が最高
    - DBモデルとAPIモデルを統一可能
    - 非同期対応（asyncio）
    - PostgreSQL完全サポート
- **デプロイ**: Vercel Serverless Functions
- **API構造**: RESTful API

### データベース
- **DB**: Vercel Postgres (Neonベース)
  - 選定理由:
    - Vercel環境に完全統合
    - サーバーレス専用PostgreSQL
    - 自動スケーリング
    - Vercelダッシュボードから直接管理可能
    - 環境変数の自動統合

### 認証
- **ライブラリ**: NextAuth.js (Auth.js)
  - 選定理由:
    - Next.js公式認証ライブラリ
    - 完全無料・オープンソース
    - Vercelとの統合が最高
    - JWT対応
  - **プロバイダー候補**:
    - Google OAuth
    - GitHub OAuth (オプション)
    - Email (マジックリンク、オプション)

**NextAuth-FastAPI認証連携方式：JWT共有**

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser   │────→│   Next.js    │────→│   FastAPI    │
│             │     │ (NextAuth.js)│     │              │
└─────────────┘     └──────────────┘     └──────────────┘
      ↓                    ↓                     ↓
  Cookie保存          JWT発行             JWT検証
  (session-token)     (secret共有)        (同じsecret)
```

**フロー:**
1. ユーザーがGoogle OAuthでログイン（NextAuth.js）
2. NextAuthがJWTトークンを発行、Cookieに保存
3. フロントエンドがFastAPI呼び出し時、JWTをAuthorizationヘッダーに含める
4. FastAPIが同じsecretでJWTを検証
5. ユーザー情報を取得し、認可チェック

**実装例:**
```python
# api/auth.py
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
import os

SECRET_KEY = os.getenv("NEXTAUTH_SECRET")
ALGORITHM = "HS256"

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## システムアーキテクチャ

```
┌─────────────────────────────────────────────┐
│           Vercel Platform                    │
├─────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────┐    │
│  │  Next.js Frontend                  │    │
│  │  - React Components                │    │
│  │  - Server Components               │    │
│  │  - Client Components               │    │
│  └──────────┬─────────────────────────┘    │
│             │                                │
│             ├──→ NextAuth.js (認証)         │
│             │    - OAuth Providers           │
│             │    - Session Management        │
│             │                                │
│             ├──→ FastAPI (Python)           │
│             │    - /api/groups/*             │
│             │    - /api/decks/*              │
│             │    - /api/users/*              │
│             │    - 認可チェック               │
│             │                                │
│             └──→ Vercel Postgres            │
│                  - users テーブル            │
│                  - groups テーブル           │
│                  - group_members テーブル    │
│                  - decks テーブル            │
│                  - sessions テーブル         │
│                                              │
└─────────────────────────────────────────────┘

データモデル関係図（簡易版）:
users ←── group_members ──→ groups
  │                            │
  └─────────→ decks ←──────────┘
```

## セキュリティ設計

### 認可モデル（Authorization）

#### 権限レベル
システムはグループベースの3段階権限モデルを採用：

1. **admin権限**（システム運用者）
   - すべてのグループを閲覧・編集可能
   - ユーザー管理、グループ管理
   
2. **owner権限**（グループオーナー）
   - グループ内のすべてのユーザー、デッキを閲覧・編集可能
   - メンバーの追加・削除・権限変更
   
3. **member権限**（グループメンバー）
   - グループ内の自分のデッキのみ編集可能
   - 他のメンバーのデッキは閲覧のみ可能

#### 認可マトリクス

| リソース | admin | owner | member（自分） | member（他人） |
|---------|-------|-------|--------------|--------------|
| **グループ** |
| グループ一覧閲覧 | ✅ 全て | ✅ 所属グループ | ✅ 所属グループ | ✅ 所属グループ |
| グループ作成 | ✅ | ✅ | ❌ | ❌ |
| グループ編集 | ✅ 全て | ✅ 自グループ | ❌ | ❌ |
| グループ削除 | ✅ 全て | ✅ 自グループ | ❌ | ❌ |
| **ユーザー（メンバー管理）** |
| メンバー一覧閲覧 | ✅ 全て | ✅ 自グループ | ✅ 自グループ | ✅ 自グループ |
| メンバー追加 | ✅ | ✅ | ❌ | ❌ |
| メンバー削除 | ✅ | ✅ | ❌ | ❌ |
| メンバー権限変更 | ✅ | ✅ | ❌ | ❌ |
| **デッキ** |
| デッキ一覧閲覧 | ✅ 全て | ✅ グループ内全て | ✅ グループ内全て | ✅ グループ内全て |
| デッキ詳細閲覧 | ✅ 全て | ✅ グループ内全て | ✅ グループ内全て | ✅ グループ内全て |
| デッキ作成 | ✅ | ✅ | ✅ | ✅ |
| デッキ編集 | ✅ 全て | ✅ グループ内全て | ✅ 自分のみ | ❌ |
| デッキ削除 | ✅ 全て | ✅ グループ内全て | ✅ 自分のみ | ❌ |
| **カード** |
| カード一覧閲覧 | ✅ 全て | ✅ グループ内全て | ✅ グループ内全て | ✅ グループ内全て |
| カード作成 | ✅ | ✅ | ✅ 自デッキのみ | ❌ |
| カード編集 | ✅ | ✅ | ✅ 自デッキのみ | ❌ |
| カード削除 | ✅ | ✅ | ✅ 自デッキのみ | ❌ |

### CORS設定
- **許可オリジン**: フロントエンドのみ（Vercel デプロイURL）
- 本番: `https://share-deck-manager.vercel.app`
- プレビュー: `https://*.vercel.app`
- ローカル開発: `http://localhost:3000`

### レート制限
- **方針**: 現状は実装しない
- 将来的に必要に応じてVercel Edge Middlewareで実装を検討

### エラーハンドリング

**APIエラーレスポンス形式の統一:**

```python
# api/exceptions.py
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

class APIError(HTTPException):
    """統一されたエラーレスポンスを返すカスタム例外"""
    
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        headers: Optional[dict] = None
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "error": {
                    "code": code,
                    "message": message,
                    "statusCode": status_code
                }
            },
            headers=headers
        )

# 使用例
from api.exceptions import APIError

@app.get("/api/decks/{deck_id}")
async def get_deck(deck_id: UUID):
    deck = session.get(Deck, deck_id)
    if not deck:
        raise APIError(
            status_code=404,
            code="DECK_NOT_FOUND",
            message="指定されたデッキが見つかりません"
        )
    return deck

# レスポンス例:
# {
#   "error": {
#     "code": "DECK_NOT_FOUND",
#     "message": "指定されたデッキが見つかりません",
#     "statusCode": 404
#   }
# }
```

**エラーコード一覧:**
- `UNAUTHORIZED`: 認証エラー (401)
- `FORBIDDEN`: 権限エラー (403)
- `DECK_NOT_FOUND`: デッキが見つからない (404)
- `GROUP_NOT_FOUND`: グループが見つからない (404)
- `VALIDATION_ERROR`: 入力検証エラー (422)
- `INTERNAL_ERROR`: サーバーエラー (500)

### 入力検証
- **フロントエンド（Next.js）**: Zod
  - フォーム入力時のバリデーション
  - 型安全なスキーマ定義
  
- **バックエンド（FastAPI）**: Pydantic（組み込み）
  - リクエストボディの自動検証
  - レスポンスの型チェック

**検証項目例：**
- デッキ名: 1-100文字、必須
- 説明: 最大1000文字、任意
- レシピURL: URL形式、任意
- メールアドレス: RFC準拠
- XSS対策: HTML特殊文字のエスケープ

### 認可チェック実装

**FastAPI依存性注入パターン:**

```python
# api/auth.py
from sqlmodel import Session, select
from fastapi import Depends, HTTPException

async def check_deck_access(
    deck_id: UUID,
    action: str,  # "read" | "update" | "delete"
    user_id: str = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """デッキへのアクセス権限をチェック"""
    deck = session.get(Deck, deck_id)
    if not deck:
        raise HTTPException(status_code=404, detail="Deck not found")
    
    # 読み取りアクセス: 同じグループメンバーなら可
    if action == "read":
        is_member = session.exec(
            select(GroupMember)
            .where(GroupMember.group_id == deck.group_id)
            .where(GroupMember.user_id == user_id)
        ).first()
        if not is_member:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # 更新・削除: 作成者のみ
    elif action in ["update", "delete"]:
        if deck.user_id != user_id:
            raise HTTPException(status_code=403, detail="Permission denied")
    
    return deck

# 使用例
@app.put("/api/decks/{deck_id}")
async def update_deck(
    deck_id: UUID,
    deck_data: DeckUpdate,
    deck: Deck = Depends(lambda: check_deck_access(deck_id, "update"))
):
    # deck はすでに権限チェック済み
    pass
```

### 外部リンクセキュリティ

**recipe_url表示時の注意:**

```tsx
// components/DeckCard.tsx
{deck.recipe_url && (
  <a 
    href={deck.recipe_url} 
    target="_blank" 
    rel="noopener noreferrer"  // 必須！
    className="recipe-link"
  >
    レシピを見る
  </a>
)}
```

**`rel="noopener noreferrer"`の理由:**
- `noopener`: 新しいタブが`window.opener`でアクセスできないようにする
- `noreferrer`: リファラー情報を送信しない
- セキュリティ: タブナビゲーション攻撃を防止

## データベーススキーマ案

### users
- `id`: UUID (PK)
- `name`: TEXT
- `email`: TEXT (UNIQUE)
- `email_verified`: TIMESTAMP
- `image`: TEXT
- `is_admin`: BOOLEAN (DEFAULT false)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### groups
- `id`: UUID (PK)
- `name`: TEXT (NOT NULL)
- `description`: TEXT
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### group_members
- `id`: UUID (PK)
- `group_id`: UUID (FK → groups.id ON DELETE CASCADE)
- `user_id`: UUID (FK → users.id ON DELETE CASCADE)
- `role`: TEXT (CHECK IN ('owner', 'member'))
- `joined_at`: TIMESTAMP
- UNIQUE(group_id, user_id)

### decks
- `id`: UUID (PK)
- `group_id`: UUID (FK → groups.id ON DELETE CASCADE)
- `user_id`: UUID (FK → users.id) -- 作成者
- `name`: TEXT (NOT NULL)
- `description`: TEXT
- `recipe_url`: TEXT -- デッキレシピの外部リンク（任意）
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

**インデックス:**
```sql
CREATE INDEX idx_decks_group_id ON decks(group_id);
CREATE INDEX idx_decks_user_id ON decks(user_id);
CREATE INDEX idx_decks_created_at ON decks(created_at DESC);
```

### NextAuth.js用テーブル（JWTモード）

**認証戦略: JWT**  
NextAuth.jsはJWTモードで動作するため、`sessions`テーブルは不要です。

```sql
-- accountsテーブル: OAuth連携情報
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,  -- 'oauth'
  provider TEXT NOT NULL,  -- 'google', 'github'
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, provider_account_id)
);

-- verification_tokensテーブル: メール検証用（Email Provider使用時のみ）
CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  UNIQUE(identifier, token)
);
```

**NextAuth.js設定例:**
```typescript
// app/api/auth/[...nextauth]/route.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",  // ← JWTモード（DBセッション不要）
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account) {
        token.accessToken = account.access_token;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.userId as string;
      return session;
    },
  },
};
```

---

## データモデル関係図

```mermaid
erDiagram
    users ||--o{ group_members : belongs_to
    groups ||--o{ group_members : has
    groups ||--o{ decks : contains
    users ||--o{ decks : creates
    
    users {
        uuid id PK
        text name
        text email UK
        timestamp email_verified
        text image
        boolean is_admin
        timestamp created_at
        timestamp updated_at
    }
    
    groups {
        uuid id PK
        text name
        text description
        timestamp created_at
        timestamp updated_at
    }
    
    group_members {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        text role
        timestamp joined_at
    }
    
    decks {
        uuid id PK
        uuid group_id FK
        uuid user_id FK
        text name
        text description
        text recipe_url
        timestamp created_at
        timestamp updated_at
    }
```

## ディレクトリ構造案

```
share-deck-manager/
├── app/                      # Next.js App Router
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts  # NextAuth設定
│   ├── (dashboard)/          # 認証後のページ
│   │   └── page.tsx          # ダッシュボード（デッキ一覧）
│   ├── (auth)/               # 認証ページ
│   │   └── signin/
│   └── page.tsx              # トップページ
│
├── api/                      # Python FastAPI
│   ├── __init__.py
│   ├── main.py               # FastAPIエントリーポイント
│   ├── database.py           # DB接続（SQLModel engine）
│   ├── models.py             # SQLModelモデル定義
│   ├── auth.py               # 認可ヘルパー関数
│   ├── exceptions.py         # カスタムエラークラス
│   └── routes/
│       ├── groups.py         # グループ管理
│       ├── decks.py
│       └── users.py
│
├── migrations/               # Alembicマイグレーション
│   ├── versions/
│   │   └── xxxx_initial.py
│   ├── env.py
│   └── alembic.ini
│
├── components/               # Reactコンポーネント
│   ├── DeckCard.tsx
│   ├── DeckForm.tsx
│   ├── GroupSelector.tsx
│   └── ...
│
├── lib/                      # ユーティリティ
│   ├── db.ts                 # DB接続ヘルパー
│   ├── auth.ts               # NextAuth設定
│   ├── authorization.ts      # 認可チェック関数
│   └── validations.ts        # Zodスキーマ
│
├── tests/                    # テストコード
│   ├── test_api/
│   │   ├── test_decks.py
│   │   └── test_auth.py
│   └── test_db/
│       └── test_models.py
│
├── scripts/                  # 開発用スクリプト
│   └── seed_data.py          # シードデータ投入
│
├── .env.example              # 環境変数テンプレート
├── .env.local                # ローカル環境変数（.gitignore）
├── .gitignore
├── docker-compose.yml        # ローカルPostgreSQL
├── vercel.json               # Vercel設定
├── requirements.txt          # Python依存関係
├── package.json              # Node.js依存関係
└── tsconfig.json
```

## API設計案

### 認証
- `GET /api/auth/session` - セッション取得（NextAuth）
- `POST /api/auth/signin` - ログイン（NextAuth）
- `POST /api/auth/signout` - ログアウト（NextAuth）

### グループ管理
- `GET /api/groups` - グループ一覧取得（所属グループのみ、adminは全て）
- `GET /api/groups/:id` - グループ詳細取得
- `POST /api/groups` - グループ作成（owner/admin）
- `PUT /api/groups/:id` - グループ更新（owner/admin）
- `DELETE /api/groups/:id` - グループ削除（owner/admin）
- `GET /api/groups/:id/members` - グループメンバー一覧
- `POST /api/groups/:id/members` - メンバー追加（owner/admin）
- `PUT /api/groups/:id/members/:userId` - メンバー権限変更（owner/admin）
- `DELETE /api/groups/:id/members/:userId` - メンバー削除（owner/admin）

### デッキ管理
- `GET /api/groups/:groupId/decks` - グループ内デッキ一覧取得
- `GET /api/decks/:id` - デッキ詳細取得
- `POST /api/groups/:groupId/decks` - デッキ作成
- `PUT /api/decks/:id` - デッキ更新（所有者/owner/admin）
- `DELETE /api/decks/:id` - デッキ削除（所有者/owner/admin）

### ユーザー管理
- `GET /api/users/me` - 自分の情報取得
- `PUT /api/users/me` - 自分の情報更新

## 機能ロードマップ

### Phase 1: MVP（Minimum Viable Product）🎯
**目標**: デッキのメタデータ管理システムを構築

> **重要な設計変更**: このアプリはデッキのメタデータ（名前、説明、レシピURL）のみを管理します。
> 実際のカード内容は外部システム（実物カード、別アプリ等）で管理する想定です。

#### 実装機能
1. **認証**
   - [x] NextAuth.jsセットアップ
   - [x] Google OAuth ログイン
   - [x] セッション管理

2. **自動グループ作成**
   - [x] 初回ログイン時に自動的に個人グループ作成
   - [x] ユーザーは自動的にownerとして設定
   - [x] グループ名: "{ユーザー名}'s Workspace"
   - [x] サンプルデッキ: 作成しない（空の状態）
   - [x] ウェルカム表示: なし（シンプルに）

3. **デッキ管理（基本CRUD）**
   - [x] デッキ一覧表示（自分のグループ内）
   - [x] デッキ作成（名前、説明、レシピURL）
   - [x] デッキ編集
   - [x] デッキ削除
   - [x] フロントエンド検索（デッキ名・説明で絞り込み）

4. **入力検証**
   - [x] Zodスキーマ（フロントエンド）
     - デッキ名: 1-100文字、必須
     - 説明: 最大1000文字、任意
     - レシピURL: URL形式、任意
   - [x] Pydanticモデル（バックエンド）

5. **シンプルなUI**
   - [x] レスポンシブデザイン（モバイル対応）
   - [x] デッキ一覧（テーブル形式）
   - [x] デッキ作成/編集フォーム
   - [x] 基本的なスタイリング（ダークテーマ）

#### 実装しない機能（Phase 1では見送り）
- ❌ カード管理（外部で管理する想定）
- ❌ カード枚数フィールド
- ❌ 複数グループ対応
- ❌ メンバー招待・管理
- ❌ グループ切り替え
- ❌ 学習機能
- ❌ デッキの公開共有
- ❌ 画像アップロード
- ❌ タグ・カテゴリ管理
- ❌ エクスポート/インポート
- ❌ ページネーション（全件表示）

#### 技術的成果物
- Next.js + FastAPI の基本構造
- Vercel Postgres接続
- SQLModel ORM
- NextAuth.js認証フロー
- 基本的な認可チェック（自分のデッキのみ編集可能）
- Zodバリデーション
- Alembicマイグレーション

---

### Phase 2: コラボレーション機能 👥
**目標**: 複数人でデッキを共有・管理できるようにする

#### 実装機能
1. **グループ管理**
   - [ ] グループ作成UI
   - [ ] グループ切り替え
   - [ ] グループ設定編集

2. **メンバー管理**
   - [ ] メンバー招待（メールアドレス）
   - [ ] メンバー一覧表示
   - [ ] 権限変更（owner/member）
   - [ ] メンバー削除

3. **権限による表示制御**
   - [ ] 他人のデッキは閲覧のみ（memberの場合）
   - [ ] 編集ボタンの出し分け

4. **通知機能**
   - [ ] 招待通知
   - [ ] デッキ更新通知（オプション）

---

### Phase 3: 学習機能 📚
**目標**: デッキを使った学習・復習機能を追加

#### 実装機能
1. **フラッシュカード学習**
   - [ ] カードめくり機能
   - [ ] 学習モード（ランダム/順番）
   - [ ] 進捗表示

2. **学習履歴**
   - [ ] 学習記録テーブル追加
   - [ ] 正解/不正解の記録
   - [ ] 習得度の可視化

3. **復習アルゴリズム（簡易版）**
   - [ ] 間隔反復学習（Spaced Repetition）
   - [ ] 習得度に応じたカード出現頻度調整

4. **統計・分析**
   - [ ] 学習時間の記録
   - [ ] 正答率のグラフ表示
   - [ ] デッキ別の習得状況

---

### Phase 4以降: 拡張機能 🚀
- [ ] デッキの公開・共有（リンク共有）
- [ ] 画像・音声のアップロード
- [ ] タグ・カテゴリ管理
- [ ] エクスポート/インポート（CSV、JSON）
- [ ] テンプレート機能
- [ ] モバイルアプリ（PWA）
- [ ] AI自動生成（問題文から自動でカード作成）

---

## Phase 1 MVP 詳細仕様

### 初回ログインフロー
```mermaid
graph TD
    A[ユーザーがGoogle OAuthでログイン] --> B{初回ログイン?}
    B -->|Yes| C[usersテーブルに新規ユーザー作成]
    C --> D[個人グループ自動作成]
    D --> E[group_membersにowner権限で追加]
    E --> F[ダッシュボードへリダイレクト]
    B -->|No| F
    F --> G[デッキ一覧画面表示]
```

### データフロー例（デッキ作成）
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as FastAPI
    participant D as Postgres
    
    U->>F: デッキ作成フォーム送信
    F->>F: Zodバリデーション
    F->>A: POST /api/groups/:groupId/decks
    A->>A: セッション確認（NextAuth）
    A->>A: 権限チェック（groupメンバー?）
    A->>A: Pydanticバリデーション
    A->>D: INSERT INTO decks
    D-->>A: デッキID返却
    A-->>F: 201 Created + デッキ情報
    F->>F: デッキ一覧を更新
    F-->>U: 成功メッセージ表示
```

### 画面構成（Phase 1）

1. **トップページ** (`/`)
   - サービス説明
   - ログインボタン

2. **ログイン後ダッシュボード** (`/dashboard`)
   - デッキ一覧（テーブル形式）
   - 新規デッキ作成ボタン
   - 検索バー
   - 各デッキ行に編集/削除アイコン

3. **デッキ作成/編集モーダル**
   - デッキ名入力（textarea）
   - 説明入力（textarea）
   - レシピURL入力（input type="url"）
   - 保存/キャンセルボタン

**注意:** デッキ詳細ページは作成しません。全ての操作をダッシュボード上で完結します。

### 認可ロジック（Phase 1簡易版）

```typescript
// lib/authorization.ts
export async function canEditDeck(userId: string, deckId: string) {
  // Phase 1: デッキの作成者のみ編集可能
  const deck = await getDeck(deckId);
  return deck.user_id === userId;
}
```

```python
# api/auth.py
async def check_deck_permission(user_id: str, deck_id: str, action: str):
    """Phase 1: 簡易権限チェック"""
    deck = await get_deck(deck_id)
    
    if action in ["read"]:
        # 同じグループメンバーなら閲覧可能
        return await is_same_group(user_id, deck.user_id)
    
    if action in ["update", "delete"]:
        # 作成者のみ編集・削除可能
        return deck.user_id == user_id
    
    return False
```

---

## Phase 1 開発の推奨順序

1. **環境セットアップ** (1-2日)
   - Next.js プロジェクト作成
   - Vercel Postgres セットアップ
   - FastAPI セットアップ
   - Vercel デプロイ設定

2. **認証実装** (1-2日)
   - NextAuth.js Google OAuth設定
   - セッション管理
   - ミドルウェアで認証チェック

3. **データベース構築** (1日)
   - スキーマ作成（SQL）
   - ORM選定・設定（Prisma推奨）
   - マイグレーション

4. **バックエンドAPI** (2-3日)
   - FastAPI基本構造
   - デッキCRUD エンドポイント
   - カードCRUD エンドポイント
   - 認可ミドルウェア

5. **フロントエンド実装** (3-4日)
   - デッキ一覧画面
   - デッキ詳細画面
   - カード作成/編集UI
   - Zodバリデーション

6. **テスト・デバッグ** (1-2日)
   - 手動テスト
   - バグ修正
   - UI調整

**合計見積もり: 10-15日（約2-3週間）**

---

## UI/UX デザイン

### デザインシステム

**カラーパレット**
- **Primary**: Purple/Blue gradient (#8B5CF6 → #3B82F6)
- **Background**: White (#FFFFFF)
- **Text**: Dark Gray (#1F2937)
- **Border**: Light Gray (#E5E7EB)
- **Success**: Green (#10B981)
- **Danger**: Red (#EF4444)

**タイポグラフィ**
- **Font**: Inter または System fonts
- **Heading**: Bold, 24-32px
- **Body**: Regular, 16px
- **Small**: 14px

**コンポーネント**
- カードに subtle shadow と hover effect
- モダンなグラスモーフィズム
- Rounded corners (8-12px)
- 十分な余白とスペーシング

### 主要画面モックアップ（Phase 1）

#### 1. ランディングページ (`/`)
初回訪問者向けのトップページ。サービスの価値を伝え、Google OAuthでのログインを促す。

![ランディングページ](C:/Users/slink/.gemini/antigravity/brain/c01bd818-3296-4c70-8657-9975b4fc6caa/landing_page_mockup_1764213602956.png)

**主要要素:**
- ヒーローセクション: キャッチコピー
- 機能紹介カード
- Google ログインボタン

---

#### 2. ダッシュボード (`/dashboard`)
ログイン後のメイン画面。ユーザーのデッキ一覧をテーブル形式で表示。

![ダッシュボード](C:/Users/slink/.gemini/antigravity/brain/c01bd818-3296-4c70-8657-9975b4fc6caa/dashboard_mockup_1764213625016.png)

**主要要素:**
- ナビゲーションバー（ロゴ、ユーザーアバター）
- "+ New Deck" ボタン
- デッキテーブル表示
  - デッキ名
  - 説明（truncate）
  - レシピURLリンク
  - 作成日
  - 編集/削除アイコン
- 検索バー（フロントエンド検索）

---

#### 3. デッキ作成/編集フォーム（モーダル）
デッキの作成・編集用のモーダルダイアログ。

![カード編集モーダル](C:/Users/slink/.gemini/antigravity/brain/c01bd818-3296-4c70-8657-9975b4fc6caa/card_edit_modal_1764213714772.png)

**主要要素:**
- モーダルオーバーレイ
- デッキ名入力欄（必須）
- 説明入力欄（任意）
- レシピURL入力欄（任意）
- Cancel / Save ボタン

**注意:** Phase 1ではデッキ詳細ページは作成せず、全ての操作をダッシュボードとモーダルで完結します。

---

### レスポンシブデザイン

**ブレークポイント**
- Mobile: < 640px (1列表示)
- Tablet: 640px - 1024px (2列表示)
- Desktop: > 1024px (3列表示)

**モバイル最適化**
- タッチ操作しやすいボタンサイズ（最小44px）
- スワイプジェスチャー対応（カード削除など）
- 画面下部に主要アクション配置

---

---

## 既存レイアウトの活用方針

### ベースレイアウト: layout2.html

既存の[layout2.html](file:///c:/Private/share-deck-manager/layout2.html)をベースに、Phase 1のUIを構築します。

**layout2の利点:**
- ✅ モダンなダークテーマデザイン
- ✅ レスポンシブ対応済み（Mobile/Tablet/Desktop）
- ✅ テーブル形式でデータ表示に最適
- ✅ Inter フォント使用（設計仕様と一致）
- ✅ 検索機能、フィルタータブ実装済み

**カラーパレット（layout2.css）:**
```css
--primary: #3B82F6;          /* ブルー系 */
--success: #10B981;
--danger: #EF4444;
--bg-primary: #111827;       /* ダーク背景 */
--bg-secondary: #1F2937;
--text-primary: #F9FAFB;
```

### 実装アプローチ

#### オプション1: 段階的移行（推奨）⭐

1. **Phase 1.0: プロトタイプ（HTML/CSS/JS）**
   - layout2.htmlを拡張してデッキ管理機能を実装
   - モックデータでUI/UXを検証
   - 認証なし、ローカルストレージ使用

2. **Phase 1.5: Next.js移行**
   - layout2のデザインをNext.js + Tailwind CSSに移植
   - コンポーネント化
   - FastAPI + Vercel Postgresに接続
   - NextAuth.js認証追加

#### オプション2: 直接Next.js実装

- layout2のスタイルを参考に、最初からNext.jsで構築
- Tailwind CSSでダークテーマを再現

### layout2 → Share Deck Manager 変換マップ

| layout2の要素 | Share Deck Managerでの用途 |
|--------------|-------------------------|
| デッキ名 | デッキ名（そのまま） |
| ゲーム | 削除（不要） |
| 所有者 | 作成者（ユーザー名 + アバター） |
| カード枚数 | カード枚数（そのまま） |
| フォーマット | 削除（Phase 1不要） |
| カラー | 削除（Phase 1不要） |
| **追加要素** | 説明、作成日、編集/削除ボタン |

### 推奨実装計画

**Step 1: layout2ベースのプロトタイプ作成（1-2日）**
- layout2.htmlをコピーして`prototype-dashboard.html`作成
- テーブル列を調整（ゲーム、フォーマット、カラーを削除 → 説明、作成日、アクションを追加）
- デッキ詳細ページ（カード一覧）のHTMLプロトタイプ作成
- カード編集モーダルのHTMLプロトタイプ作成

**Step 2: UI/UX検証（1日）**
- ユーザーフローのテスト
- デザインの微調整
- レスポンシブ動作確認

**Step 3: Next.js移行（3-4日）**
- Next.jsプロジェクトセットアップ
- layout2のCSSをTailwind CSS classesに変換
- Reactコンポーネント化
- 状態管理（useState、useContext）

**Step 4: バックエンド統合（3-4日）**
- FastAPI構築
- Vercel Postgres接続
- NextAuth.js認証
- API統合

---

## ヒアリング結果まとめ

### 初期データ・ユーザーフロー
- ✅ **グループ名**: `"{ユーザー名}'s Workspace"`（例: "Taro's Workspace"）
- ✅ **サンプルデッキ**: 作成しない（空の状態からスタート）
- ✅ **初回ログイン時の説明**: 何も表示しない（シンプルに）
- ✅ **マイグレーションツール**: Alembic

### エラーハンドリング
- ✅ **エラーレスポンス形式**: 標準的なJSON形式
  ```json
  {
    "error": {
      "code": "DECK_NOT_FOUND",
      "message": "指定されたデッキが見つかりません",
      "statusCode": 404
    }
  }
  ```
- ✅ **ロギング**: Vercel Logs（Phase 1はシンプルに）

### パフォーマンス設計
- ✅ **デッキ一覧**: 全件表示（Phase 1ではページネーションなし）
- ✅ **検索機能**: フロントエンド検索（表示中のデッキのみ）

### 機能範囲の重要な変更
- ❌ **カード管理**: 実装しない（外部システムで管理する想定）
- ❌ **カード枚数フィールド**: 不要
- ✅ **デッキレシピURL**: 追加（任意フィールド）

### デッキのフィールド構成
```
Deck:
├─ id (UUID)
├─ group_id (UUID)
├─ user_id (UUID)
├─ name (必須、1-100文字)
├─ description (任意、最大1000文字)
├─ recipe_url (任意、URL形式)
├─ created_at (自動)
└─ updated_at (自動)
```

---

## 環境変数管理

### 管理方針

- **`.env.example`**: 環境変数のキーを管理（Git管理対象）
- **`.env.local`**: ローカル開発用の実際の値（.gitignore）
- **`.env.production`**: 本番環境用（.gitignore）
- **Vercel Dashboard**: 本番環境の環境変数はVercelで管理

### 必要な環境変数

#### 共通
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database
POSTGRES_POOLING_URL=postgresql://user:password@host:port/database?pgbouncer=true

# Environment
NODE_ENV=development  # or production
```

#### Next.js（フロントエンド）
```bash
# NextAuth.js
NEXTAUTH_URL=http://localhost:3000  # 本番: https://your-domain.vercel.app
NEXTAUTH_SECRET=your-secret-key-here  # openssl rand -base64 32

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API Endpoint (FastAPI)
NEXT_PUBLIC_API_URL=http://localhost:8000/api  # 本番: https://your-domain.vercel.app/api
```

#### FastAPI（バックエンド）
```bash
# Database (same as above)
DATABASE_URL=postgresql://user:password@host:port/database

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.vercel.app

# Session/JWT (NextAuthから渡される場合は不要)
# SECRET_KEY=your-secret-key-here
```

### .gitignore追加内容

```gitignore
# Environment variables
.env
.env.local
.env.development
.env.production
.env.*.local

# Keep example file
!.env.example
```

### .env.example ファイル

```bash
# ==============================================
# Share Deck Manager - Environment Variables
# ==============================================
# Copy this file to .env.local and fill in the values

# ----------------------------------------------
# Database (Vercel Postgres)
# ----------------------------------------------
DATABASE_URL=
POSTGRES_POOLING_URL=

# ----------------------------------------------
# NextAuth.js
# ----------------------------------------------
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# ----------------------------------------------
# OAuth Providers
# ----------------------------------------------
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth (optional)
# GITHUB_CLIENT_ID=
# GITHUB_CLIENT_SECRET=

# ----------------------------------------------
# API Configuration
# ----------------------------------------------
NEXT_PUBLIC_API_URL=http://localhost:8000/api

# ----------------------------------------------
# FastAPI Backend
# ----------------------------------------------
ALLOWED_ORIGINS=http://localhost:3000

# ----------------------------------------------
# Environment
# ----------------------------------------------
NODE_ENV=development
```

### セットアップ手順

1. `.env.example` を `.env.local` にコピー
   ```bash
   cp .env.example .env.local
   ```

2. `.env.local` に実際の値を記入

3. Vercel Postgres作成後、`DATABASE_URL` を取得

4. Google OAuth設定後、Client IDとSecretを取得

5. `NEXTAUTH_SECRET` を生成
   ```bash
   openssl rand -base64 32
   ```

### ローカル開発環境のデータベース

**Docker Compose でローカルPostgreSQLを使用**

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: deck-manager-db
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: deck_manager_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**使用方法:**
```bash
# 起動
docker-compose up -d

# 停止
docker-compose down

# データ削除して再起動
docker-compose down -v
docker-compose up -d
```

**.env.local の DATABASE_URL:**
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/deck_manager_dev
```

---

## 設計レビュー反映まとめ

### 2025-11-27 レビュー実施

**✅ 承認・実装済み:**
1. **DBインデックス追加** - `decks`テーブルに3つのインデックス
2. **JWT認証連携** - NextAuth-FastAPI間のJWT共有方式を設計
3. **認可チェック実装** - FastAPI依存性注入パターン
4. **外部リンクセキュリティ** - `rel="noopener noreferrer"`
5. **ローカルDB環境** - Docker Compose PostgreSQL
6. **UI簡素化** - デッキ詳細ページ削除、ダッシュボードで完結

**❌ 却下:**
- recipe_urlのDB CHECK制約（アプリケーション層で検証）

**📊 設計完成度: 95%**
- 残タスク: 実装計画書の作成
- Phase 1実装準備完了

---

## Railway デプロイ

### プロダクション環境

**Platform**: Railway (https://railway.app)

**デプロイ済みサービス:**
- Backend (FastAPI): `share-deck-manager-backend`
- Frontend (Next.js): `share-deck-manager-frontend`
- Database: PostgreSQL (Postgres)

### ログ確認コマンド

```bash
# Backend ログ
railway logs --service share-deck-manager-backend --environment production

# Frontend ログ
railway logs --service share-deck-manager-frontend --environment production

# PostgreSQL ログ
railway logs --service Postgres --environment production
```

### デプロイ方法

1. **GitHub経由の自動デプロイ**（推奨）
   - `master` ブランチへのpush で自動デプロイ

2. **手動デプロイ**
   ```bash
   # Railway ダッシュボードで "Deploy" ボタンをクリック
   ```

### 環境変数設定

**Backend:**
- `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`（自動設定）
- `ALLOWED_ORIGINS`: `https://<frontend-url>.up.railway.app`
- `NEXTAUTH_SECRET`: （共通シークレット）

**Frontend:**
- `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`（自動設定）
- `NEXT_PUBLIC_API_URL`: `https://<backend-url>.up.railway.app`
- `API_URL`: `http://backend.railway.internal:8000`
- `NEXTAUTH_URL`: `https://<frontend-url>.up.railway.app`
- `NEXTAUTH_SECRET`: （バックエンドと同じ）
- `GOOGLE_CLIENT_ID`: （Google OAuth）
- `GOOGLE_CLIENT_SECRET`: （Google OAuth）

---

## メモ

### 検討したが選ばなかった選択肢
- **Supabase**: 認証・ストレージ・リアルタイム機能が魅力的だが、Vercel完結を優先
- **Clerk**: UIが美しく簡単だが、無料枠とコストを考慮しNextAuthを選択
- **PlanetScale**: スキーママイグレーションが優れているが、外部キー制約なしがデメリット
- **Vercel (Full Stack)**: Next.jsは最高だがFastAPIのサーバーレス制限（10秒タイムアウト、マイグレーション不可）が問題
- **Cloudflare Pages/Workers**: FastAPIをそのまま使えず、大きな書き換えが必要

---

## Phase 2: シングルカード購入管理機能 (2026-01実装完了) ✅

### 概要
デッキに必要なシングルカードの購入計画を管理し、複数のショップの価格を比較して最適な購入プランを自動計算する機能

### 実装済み機能

#### 1. データベーススキーマ（Issue #8）
4つの新規テーブルを実装：

**stores（ショップマスタ）**
```sql
- id: UUID (PK)
- user_id: UUID (FK → users.id ON DELETE CASCADE)
- name: TEXT (max 50文字)
- color: TEXT (hex color code, 7文字)
- created_at, updated_at: TIMESTAMP
- UNIQUE(user_id, name): ユーザーごとにショップ名の重複防止
```

**purchase_lists（購入リスト）**
```sql
- id: UUID (PK)
- user_id: UUID (FK → users.id ON DELETE CASCADE)
- name: TEXT (max 100文字, 任意)
- status: TEXT ('planning' | 'purchased')
- created_at, updated_at: TIMESTAMP
※ グローバル購入リスト（デッキには紐付かない）
```

**purchase_items（購入アイテム）**
```sql
- id: UUID (PK)
- list_id: UUID (FK → purchase_lists.id ON DELETE CASCADE)
- card_id: UUID (FK → cards.id ON DELETE SET NULL, 任意)
- custom_card_id: UUID (FK → custom_cards.id ON DELETE SET NULL, 任意)
- quantity: INT (CHECK: 1-10枚)
- selected_store_id: UUID (FK → stores.id ON DELETE SET NULL, 任意)
- created_at: TIMESTAMP
- CHECK: (card_id IS NOT NULL XOR custom_card_id IS NOT NULL)
```

**price_entries（価格エントリ）**
```sql
- id: UUID (PK)
- item_id: UUID (FK → purchase_items.id ON DELETE CASCADE)
- store_id: UUID (FK → stores.id ON DELETE CASCADE)
- price: INT (CHECK: 1-9999円, NULLは在庫なし)
- updated_at: TIMESTAMP
- UNIQUE(item_id, store_id): アイテム×ショップの組み合わせで一意
```

**マイグレーション:**
- Alembic Migration ID: `9dab9ac600e2`
- 正常にupgrade/downgradeテスト済み

#### 2. バックエンドAPI（Issue #9）
FastAPI RESTful エンドポイントを実装：

**Store Management**
- `GET /api/v1/stores` - ストア一覧取得
- `POST /api/v1/stores` - ストア作成
- `PATCH /api/v1/stores/{store_id}` - ストア更新
- `DELETE /api/v1/stores/{store_id}` - ストア削除

**Purchase List Management**
- `GET /api/v1/purchases` - 購入リスト一覧取得（ユーザーの全リスト）
- `POST /api/v1/purchases` - 購入リスト作成（グローバルリスト）
- `GET /api/v1/purchases/{list_id}` - 購入リスト詳細取得
- `PATCH /api/v1/purchases/{list_id}` - 購入リスト更新
- `DELETE /api/v1/purchases/{list_id}` - 購入リスト削除

**Purchase Item Management**
- `GET /api/v1/purchases/{list_id}/items` - アイテム一覧取得
- `POST /api/v1/purchases/{list_id}/items` - アイテム追加
- `PATCH /api/v1/purchases/{list_id}/items/{item_id}` - アイテム更新
- `DELETE /api/v1/purchases/{list_id}/items/{item_id}` - アイテム削除

**Price Management**
- `GET /api/v1/purchases/items/{item_id}/prices` - 価格一覧取得
- `PUT /api/v1/purchases/items/{item_id}/prices/{store_id}` - 価格更新
- `DELETE /api/v1/purchases/items/{item_id}/prices/{store_id}` - 価格削除

**Optimal Plan Calculation**
- `GET /api/v1/purchases/{list_id}/optimal-plan` - 最適購入プラン計算

**最適購入プランアルゴリズム:**
```python
# Greedy アプローチ
for each card in purchase_list:
    prices = get_available_prices(card)  # price != NULL のみ
    if prices:
        cheapest_store = min(prices, key=lambda p: (p.price, p.store.created_at))
        select_store(cheapest_store)
    else:
        mark_as_out_of_stock(card)

# 結果:
# - 総額
# - アイテムごとの選択ショップ・価格
# - ショップ別購入金額サマリー
```

**認証・認可:**
- NextAuth JWT認証（Cookie経由）
- ユーザー所有権チェック（全操作）
- Foreign key整合性検証
- バリデーションエラー処理（422, 404, 400, 401）

#### 3. フロントエンド統合（Issue #10）
Next.js App Routerで実装：

**API Client (`frontend/app/lib/api/purchases.ts`)**
- TypeScript完全型定義
- 全APIエンドポイントのラッパー関数
- エラーハンドリング
- NextAuth Cookie認証統合

**Purchase Page (`/purchase`)**
- グローバル購入リスト管理
- ストア管理（CRUD）
- 購入アイテム表示
- 最適購入プラン計算・表示
- ストア別購入金額サマリー
- レスポンシブデザイン

**UI Components:**
- Store list with color indicators
- Purchase items grid
- Optimal plan summary
- Inline store creation form
- Loading & error states

#### 4. デプロイ（Issue #11-12）
- Railway自動デプロイ設定済み
- PostgreSQL migration実行済み
- 本番環境動作確認済み

### アーキテクチャ図（更新版）

```
┌─────────────────────────────────────────────┐
│           Railway Platform                   │
├─────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────┐    │
│  │  Next.js Frontend                  │    │
│  │  - /purchase                       │    │
│  │  - Purchase API Client             │    │
│  └──────────┬─────────────────────────┘    │
│             │                                │
│             ├──→ NextAuth.js (認証)         │
│             │                                │
│             ├──→ FastAPI (Python)           │
│             │    - /api/v1/stores/*         │
│             │    - /api/v1/purchases/*      │
│             │    - /api/v1/purchases/items/*│
│             │    - Optimal Plan Algorithm   │
│             │                                │
│             └──→ PostgreSQL                 │
│                  - stores                    │
│                  - purchase_lists            │
│                  - purchase_items            │
│                  - price_entries             │
│                                              │
└─────────────────────────────────────────────┘
```

### データフロー例

**最適購入プラン計算:**
```
1. User clicks "Calculate Optimal Plan"
   ↓
2. Frontend: GET /api/v1/purchases/{list_id}/optimal-plan
   ↓
3. Backend:
   - Fetch all items in list
   - Fetch all user stores (ordered by created_at)
   - Fetch all price entries (exclude NULL prices)
   - For each item:
     - Find cheapest price
     - If tie: select earlier created store
     - Calculate subtotal
   - Sum totals by store
   ↓
4. Return:
   {
     total_price: 15000,
     items: [...],
     store_summary: {
       "Card Shop A": 8000,
       "Card Shop B": 7000
     }
   }
```

### 今後の拡張予定

**Phase 2.1: UI強化**
- v0コンポーネントの完全統合
- カードビジュアル表示
- ドラッグ&ドロップUI
- 価格履歴グラフ

**Phase 2.2: 高度な機能**
- 価格アラート通知
- 在庫状況追跡
- 購入履歴記録
- エクスポート機能（CSV, PDF）

**Phase 2.3: 最適化**
- 価格比較サイトAPI連携
- 送料計算
- ポイント還元率考慮
- 複数デッキ一括最適化

---

## 実装完了サマリー（2026-01）

### Issue #8: Database Schema ✅
- 4テーブル追加 (stores, purchase_lists, purchase_items, price_entries)
- Alembic migration作成・テスト完了
- 全制約・インデックス適用済み

### Issue #9: Backend API ✅
- 4エンドポイントモジュール実装
- 最適購入プランアルゴリズム実装
- 認証・認可・バリデーション完備
- Swagger UIで全エンドポイント確認可能

### Issue #10: Frontend Integration ✅
- TypeScript API Client実装
- Purchase Page実装 (/purchase)
- 基本的なCRUD操作対応
- 最適プラン表示機能実装

### Issue #11-12: Testing & Deployment ✅
- Railway自動デプロイ完了
- 本番環境マイグレーション実行済み
- ドキュメント更新完了

**実装期間:** 約4時間  
**コミット数:** 3コミット  
**追加ファイル:** 18ファイル  
**追加行数:** ~1,800行

