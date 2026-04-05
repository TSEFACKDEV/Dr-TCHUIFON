-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VISITOR');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('ARTICLE', 'CONFERENCE', 'BOOK_CHAPTER', 'THESIS', 'PATENT', 'POSTER');

-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('LICENCE', 'MASTER', 'INGENIEUR', 'DOCTORAT');

-- CreateEnum
CREATE TYPE "SupervisionLevel" AS ENUM ('INGENIEUR', 'MASTER_2', 'DOCTORAT', 'POST_DOC');

-- CreateEnum
CREATE TYPE "SupervisionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "photoUrl" TEXT,
    "cvUrl" TEXT,
    "specializations" TEXT[],
    "degrees" TEXT[],
    "institution" TEXT,
    "department" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "officeLocation" TEXT,
    "googleScholar" TEXT,
    "researchGate" TEXT,
    "orcid" TEXT,
    "linkedin" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "authors" TEXT[],
    "journal" TEXT,
    "conference" TEXT,
    "publicationDate" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "volume" TEXT,
    "issue" TEXT,
    "pages" TEXT,
    "publisher" TEXT,
    "doi" TEXT,
    "isbn" TEXT,
    "issn" TEXT,
    "pdfUrl" TEXT,
    "type" "PublicationType" NOT NULL DEFAULT 'ARTICLE',
    "keywords" TEXT[],
    "citations" INTEGER NOT NULL DEFAULT 0,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "code" TEXT,
    "level" "CourseLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "credits" INTEGER,
    "hours" INTEGER,
    "semester" TEXT,
    "syllabus" TEXT,
    "objectives" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "level" "SupervisionLevel" NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SupervisionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "thesisUrl" TEXT,
    "publications" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supervisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborators" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "institution" TEXT NOT NULL,
    "department" TEXT,
    "country" TEXT,
    "email" TEXT,
    "website" TEXT,
    "photoUrl" TEXT,
    "researchArea" TEXT,
    "googleScholar" TEXT,
    "orcid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publication_collaborators" (
    "publicationId" TEXT NOT NULL,
    "collaboratorId" TEXT NOT NULL,

    CONSTRAINT "publication_collaborators_pkey" PRIMARY KEY ("publicationId","collaboratorId")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "publications_doi_key" ON "publications"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "publications_slug_key" ON "publications"("slug");

-- CreateIndex
CREATE INDEX "publications_year_idx" ON "publications"("year" DESC);

-- CreateIndex
CREATE INDEX "publications_type_idx" ON "publications"("type");

-- CreateIndex
CREATE INDEX "publications_slug_idx" ON "publications"("slug");

-- CreateIndex
CREATE INDEX "courses_level_idx" ON "courses"("level");

-- CreateIndex
CREATE INDEX "supervisions_level_idx" ON "supervisions"("level");

-- CreateIndex
CREATE INDEX "supervisions_status_idx" ON "supervisions"("status");

-- CreateIndex
CREATE INDEX "contact_messages_isRead_idx" ON "contact_messages"("isRead");

-- CreateIndex
CREATE INDEX "contact_messages_sentAt_idx" ON "contact_messages"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "page_views_page_idx" ON "page_views"("page");

-- CreateIndex
CREATE INDEX "page_views_viewedAt_idx" ON "page_views"("viewedAt" DESC);

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supervisions" ADD CONSTRAINT "supervisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborators" ADD CONSTRAINT "collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_collaborators" ADD CONSTRAINT "publication_collaborators_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publication_collaborators" ADD CONSTRAINT "publication_collaborators_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "collaborators"("id") ON DELETE CASCADE ON UPDATE CASCADE;
