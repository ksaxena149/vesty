-- CreateEnum
CREATE TYPE "public"."ImageType" AS ENUM ('USER', 'OUTFIT', 'RESULT');

-- CreateEnum
CREATE TYPE "public"."SwapStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."ImageType" NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."swaps" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userImageId" TEXT NOT NULL,
    "outfitImageId" TEXT NOT NULL,
    "resultImageId" TEXT,
    "status" "public"."SwapStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- AddForeignKey
ALTER TABLE "public"."images" ADD CONSTRAINT "images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swaps" ADD CONSTRAINT "swaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swaps" ADD CONSTRAINT "swaps_userImageId_fkey" FOREIGN KEY ("userImageId") REFERENCES "public"."images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swaps" ADD CONSTRAINT "swaps_outfitImageId_fkey" FOREIGN KEY ("outfitImageId") REFERENCES "public"."images"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."swaps" ADD CONSTRAINT "swaps_resultImageId_fkey" FOREIGN KEY ("resultImageId") REFERENCES "public"."images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
