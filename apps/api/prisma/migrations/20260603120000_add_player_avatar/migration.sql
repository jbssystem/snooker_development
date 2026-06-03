-- Add an optional avatar to the player profile. Stores either a preset id
-- (e.g. "preset:athlete-1") or a cropped image data URL.
ALTER TABLE "PlayerProfile" ADD COLUMN "avatar" TEXT;
