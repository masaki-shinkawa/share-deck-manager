# Quick Start Guide - Development Agents

## 🚀 5分で始める

### 1. 環境確認

```bash
# Python 3.8+とPyYAMLが必要
python3 --version
python3 -c "import yaml; print('✅ PyYAML installed')"

# PyYAMLが未インストールの場合
pip install pyyaml
```

### 2. 実行権限の確認

```bash
# すでに設定済みですが、念のため
chmod +x .claude/agents/run-agent.sh
chmod +x .claude/agents/orchestrator.py
```

### 3. 最初のagentを実行

```bash
# プロジェクトルートから実行
cd /home/user/share-deck-manager

# Design Agentで機能設計
.claude/agents/run-agent.sh design "Add pagination to deck list"
```

---

## 📖 典型的な使用パターン

### パターン1: 新機能の追加（フルワークフロー）

```bash
# 1コマンドで設計→実装→テスト→レビューを実行
.claude/agents/run-agent.sh workflow "Add deck sorting by creation date"
```

**出力**:
- Design Agent: API設計、DB変更案
- Implementation Agent: コード実装
- Testing Agent: テスト作成
- Review Agent: コードレビュー

---

### パターン2: 段階的な開発

```bash
# ステップ1: 設計
.claude/agents/run-agent.sh design "Add user avatar upload"

# ステップ2: 実装（設計を見てから）
.claude/agents/run-agent.sh implementation "Implement avatar upload feature"

# ステップ3: テスト
.claude/agents/run-agent.sh testing "Test avatar upload functionality"

# ステップ4: レビュー
.claude/agents/run-agent.sh review "Review avatar upload code"
```

---

### パターン3: バグ修正

```bash
# デバッグ
.claude/agents/run-agent.sh debug "Railway backend returns 500 on deck creation"

# 修正実装
.claude/agents/run-agent.sh implementation "Fix deck validation in API"

# テスト
.claude/agents/run-agent.sh testing "Test deck creation edge cases"
```

---

## 🎯 即座に試せる実例

### 例1: デッキフィルタリング機能

```bash
# 完全ワークフロー
.claude/agents/run-agent.sh workflow "Add filtering by deck name and owner"
```

### 例2: パフォーマンス改善

```bash
# 設計
.claude/agents/run-agent.sh design "Optimize deck list query with pagination"

# 実装
.claude/agents/run-agent.sh implementation "Add pagination to deck list API"

# レビュー
.claude/agents/run-agent.sh review "Review pagination implementation performance"
```

### 例3: セキュリティ強化

```bash
# 設計
.claude/agents/run-agent.sh design "Add rate limiting to authentication endpoints"

# 実装
.claude/agents/run-agent.sh implementation "Implement rate limiting middleware"

# テスト
.claude/agents/run-agent.sh testing "Test rate limiting behavior"
```

---

## 🛠️ トラブルシューティング

### Q: `Permission denied`エラー

```bash
# 解決: 実行権限を付与
chmod +x .claude/agents/run-agent.sh
```

### Q: `ModuleNotFoundError: No module named 'yaml'`

```bash
# 解決: PyYAMLをインストール
pip install pyyaml
```

### Q: Agentが見つからない

```bash
# 確認: Agent設定ファイルが存在するか
ls -la .claude/agents/*.yaml
```

---

## 📊 Agent実行フロー

```
User Input
    ↓
run-agent.sh (Shell Wrapper)
    ↓
orchestrator.py (Python Orchestrator)
    ↓
Load agent config (*.yaml)
    ↓
Build prompt with system instructions
    ↓
Execute agent (TODO: integrate with Claude Code SDK)
    ↓
Return result
```

---

## 🔧 カスタマイズ

### Agent設定の編集

各agent設定ファイル（`.claude/agents/*-agent.yaml`）を編集することで、agentの動作を調整できます。

```yaml
# 例: testing-agent.yamlのモデルを変更
model: haiku  # より高速・低コスト
```

---

## 📚 次のステップ

1. **README.md** - 詳細なドキュメントを確認
2. **CLAUDE.md** - プロジェクト設計書を参照
3. **実際のタスク** - 現在のMVP開発に活用

---

## ✅ 動作確認済み

- ✅ Agent設定ファイル読み込み
- ✅ Design Agent実行
- ✅ Implementation Agent実行
- ✅ Testing Agent実行
- ✅ Review Agent実行
- ✅ Debug Agent実行
- ✅ Full workflow実行
- ✅ Shell wrapper動作

---

## 📝 実行例（出力サンプル）

```bash
$ .claude/agents/run-agent.sh design "Add deck export feature"

Running full development workflow...
Loaded 5 agents: debug, implementation, review, testing, design

################################################################################
# Starting Workflow: Add deck export feature
# Agents: design → implementation → testing → review
################################################################################

================================================================================
Running design-agent
Task: Add deck export feature
================================================================================

Agent: design-agent
Model: sonnet
Tools: Read, Write, Edit, Glob, Grep, WebSearch, WebFetch

[Design output...]
```

---

## 🎉 準備完了！

これで開発agentシステムが使用可能です。実際のMVP開発でどんどん活用してください！

質問やフィードバックは、プロジェクトのIssuesで受け付けています。
