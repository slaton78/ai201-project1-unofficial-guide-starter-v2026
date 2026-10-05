/// <reference types="expo/types" />

// Metro resolves media imports to an asset reference (a numeric module id on native).
declare module '*.wav' {
  const asset: number;
  export default asset;
}

declare module '*.png' {
  const asset: number;
  export default asset;
}
