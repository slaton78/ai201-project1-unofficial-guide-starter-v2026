# Phaser assets

The game board ships **no image files**. Every token, special overlay, Penalty Block, lock,
Rally Tile and effect texture is drawn procedurally at runtime in
`src/game/phaser/scenes/textures.ts` (shapes come from `src/game/shared/tokenArt.ts`).

To replace placeholders with final art later, add image files here, load them in
`BoardScene.preload()`, and point `createTextures()` at the loaded keys. Record every new
file in `docs/asset-attribution.md`.
