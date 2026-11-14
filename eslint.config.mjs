import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts"],
  },

  // Next.js 公式ルール（React Hooks / next/image など）＋ typescript-eslint 推奨ルール
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // 型情報を使うルール（TS ファイルのみ）。tsconfig を読んで型を解決するため、通常のルールでは検出できない誤りを拾える
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // await し忘れた Promise を検出（例: deleteSession() を await せずにリダイレクト → 削除前に処理が進む）
      "@typescript-eslint/no-floating-promises": "error",
      // Promise を返す関数を、戻り値を待たない場所（if 条件など）に渡すのを検出
      // JSX 属性（onClick={async () => ...}）は React の慣習として許可する
      "@typescript-eslint/no-misused-promises": [
        "error",
        { checksVoidReturn: { attributes: false } },
      ],
      // Promise 以外を await していないか
      "@typescript-eslint/await-thenable": "error",
      // 型だけの import は `import type` に統一（バンドルに不要なモジュールが混ざるのを防ぐ）
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      // 未使用変数。意図的に使わない引数は _ 始まりで許可
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  // 整形に関わる ESLint ルールを無効化し、整形は Prettier に一任する（必ず最後に置く）
  eslintConfigPrettier,
];

export default eslintConfig;
