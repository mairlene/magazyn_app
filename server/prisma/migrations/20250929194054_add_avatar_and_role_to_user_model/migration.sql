-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';
