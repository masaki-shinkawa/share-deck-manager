-- CreateEnum
CREATE TYPE "DeckRegulation" AS ENUM ('standard', 'extra');

-- AlterTable
ALTER TABLE "decks" ADD COLUMN     "regulation" "DeckRegulation" NOT NULL DEFAULT 'standard';
