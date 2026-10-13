-- CreateTable
CREATE TABLE "ResumeBuild" (
    "id" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "inputs" JSONB NOT NULL,
    "curated" JSONB NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "htmlPath" TEXT NOT NULL,
    "pages" INTEGER,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ResumeBuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResumeBuild_variant_status_publishedAt_idx" ON "ResumeBuild"("variant", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeBuild_variant_contentHash_key" ON "ResumeBuild"("variant", "contentHash");
