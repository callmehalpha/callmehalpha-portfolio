-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('PROJECT_UPDATE', 'CV');

-- CreateEnum
CREATE TYPE "SourceStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'DONE', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PubStatus" AS ENUM ('PENDING', 'PUBLISHED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "PersonaKind" AS ENUM ('PERSONALITY', 'BRANDING');

-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('CLIENT', 'PRODUCT', 'OSS');

-- CreateEnum
CREATE TYPE "OssRole" AS ENUM ('AUTHOR', 'MAINTAINER', 'CONTRIBUTOR');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SourceDocument" (
    "id" TEXT NOT NULL,
    "kind" "SourceKind" NOT NULL DEFAULT 'PROJECT_UPDATE',
    "filename" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "projectId" TEXT,
    "frontmatter" JSONB,
    "rawMarkdown" TEXT NOT NULL,
    "originalPath" TEXT,
    "routing" JSONB,
    "status" "SourceStatus" NOT NULL DEFAULT 'RECEIVED',
    "error" TEXT,
    "triggerAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastTriggeredAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ProjectKind" NOT NULL,
    "url" TEXT,
    "repoUrl" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonaDocument" (
    "id" TEXT NOT NULL,
    "kind" "PersonaKind" NOT NULL,
    "version" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "distilled" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonaDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "projectId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "tags" TEXT[],
    "pillars" TEXT[],
    "coverImageUrl" TEXT,
    "seo" JSONB,
    "socialDrafts" JSONB,
    "llmMeta" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudy" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "currentRevisionId" TEXT,

    CONSTRAINT "CaseStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStudyRevision" (
    "id" TEXT NOT NULL,
    "caseStudyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "focus" TEXT[],
    "context" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "decisions" TEXT[],
    "challenges" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "lessons" TEXT NOT NULL,
    "changelog" TEXT NOT NULL,
    "sourceIds" TEXT[],
    "llmMeta" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStudyRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OssProject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "OssRole" NOT NULL,
    "summary" TEXT NOT NULL,
    "myImpact" TEXT NOT NULL,
    "stack" TEXT[],
    "highlights" TEXT[],
    "githubStats" JSONB,
    "llmMeta" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OssProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OssContribution" (
    "id" TEXT NOT NULL,
    "ossProjectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "summary" TEXT,

    CONSTRAINT "OssContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL DEFAULT 'me',
    "currentRevisionId" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRevision" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "privacy" JSONB NOT NULL,
    "changelog" TEXT NOT NULL,
    "sourceIds" TEXT[],
    "llmMeta" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalItem" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "resumeUrl" TEXT,
    "resumeDeliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "workflow" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifier" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "workflow" TEXT NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "Notifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrls" TEXT[],
    "status" "PubStatus" NOT NULL DEFAULT 'PENDING',
    "externalId" TEXT,
    "externalUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "n8nExecutionId" TEXT,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "meta" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "PipelineRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourceDocument_contentHash_key" ON "SourceDocument"("contentHash");

-- CreateIndex
CREATE INDEX "SourceDocument_status_receivedAt_idx" ON "SourceDocument"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PersonaDocument_kind_version_key" ON "PersonaDocument"("kind", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Note_slug_key" ON "Note"("slug");

-- CreateIndex
CREATE INDEX "Note_status_publishedAt_idx" ON "Note"("status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_projectId_key" ON "CaseStudy"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudy_currentRevisionId_key" ON "CaseStudy"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStudyRevision_caseStudyId_version_key" ON "CaseStudyRevision"("caseStudyId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "OssProject_projectId_key" ON "OssProject"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "OssContribution_url_key" ON "OssContribution"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_currentRevisionId_key" ON "Profile"("currentRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileRevision_profileId_version_key" ON "ProfileRevision"("profileId", "version");

-- CreateIndex
CREATE INDEX "ApprovalItem_entityType_entityId_idx" ON "ApprovalItem"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Channel_key_key" ON "Channel"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Notifier_key_key" ON "Notifier"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_noteId_channelId_key" ON "Publication"("noteId", "channelId");

-- AddForeignKey
ALTER TABLE "SourceDocument" ADD CONSTRAINT "SourceDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudy" ADD CONSTRAINT "CaseStudy_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "CaseStudyRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStudyRevision" ADD CONSTRAINT "CaseStudyRevision_caseStudyId_fkey" FOREIGN KEY ("caseStudyId") REFERENCES "CaseStudy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OssProject" ADD CONSTRAINT "OssProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OssContribution" ADD CONSTRAINT "OssContribution_ossProjectId_fkey" FOREIGN KEY ("ossProjectId") REFERENCES "OssProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_currentRevisionId_fkey" FOREIGN KEY ("currentRevisionId") REFERENCES "ProfileRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileRevision" ADD CONSTRAINT "ProfileRevision_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRun" ADD CONSTRAINT "PipelineRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "SourceDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
