// 通常の CSS（globals.css など）の副作用 import 用の型宣言。
// Next.js が提供するのは *.module.css の宣言だけなので、新しい TypeScript
// （noUncheckedSideEffectImports が既定で有効）では `import "./globals.css"` がエラーになる。
declare module "*.css";
