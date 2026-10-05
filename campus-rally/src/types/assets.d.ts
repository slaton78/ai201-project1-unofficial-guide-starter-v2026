/// <reference types="expo/types" />

// Metro resolves image imports to an asset reference (a numeric module id on native).
declare module '*.png' {
  const asset: number;
  export default asset;
}
