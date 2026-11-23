-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key","window_start")
);

-- Supabase の Data API（anon キー）からは読み書きさせない（ポリシーは作らない＝全拒否。Prisma の接続ロールは RLS をバイパスする）
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
