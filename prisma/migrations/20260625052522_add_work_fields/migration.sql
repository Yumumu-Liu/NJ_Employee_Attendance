-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "workTime" TEXT,
ADD COLUMN     "workType" TEXT NOT NULL DEFAULT 'full';
