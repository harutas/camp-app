-- すべてのテーブルで Row Level Security を有効にし、ポリシーは作らない。
--
-- Supabase は public スキーマのテーブルを Data API（REST）で公開でき、anon キーはブラウザに配る前提の公開値。
-- RLS が有効でポリシーがないテーブルは、anon / authenticated ロールからの読み書きがすべて拒否される。
-- このアプリは Data API を使わないため、Data API 経由のアクセスは全て拒否してよい。
--
-- Prisma が接続する postgres ロールは BYPASSRLS 権限を持ち、かつテーブルの所有者でもあるため RLS の対象外。
-- アプリからの読み書きには影響しない。
--
-- Supabase の「新しいテーブルで RLS を自動で有効にする」設定に頼らず、どの環境でも同じ状態になるよう明示する。
-- すでに有効なテーブルに実行してもエラーにならない。
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;

-- Prisma のマイグレーション履歴テーブル。prisma migrate dev が検証に使うシャドウDBには存在しないため、あるときだけ有効にする
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
