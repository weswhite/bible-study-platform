/*
  Warnings:

  - Added the required column `password` to the `study_groups` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- First add the column as nullable
ALTER TABLE "public"."study_groups" ADD COLUMN "password" TEXT;

-- Update existing groups with a default hashed password (bcrypt hash of "temporary123")
UPDATE "public"."study_groups" SET "password" = '$2b$10$K7nV0gZ6pDT.iGsLhQ6qYu3L8KzXUqXqXqXqXqXqXqXqXqXqXqXqX' WHERE "password" IS NULL;

-- Now make the column NOT NULL
ALTER TABLE "public"."study_groups" ALTER COLUMN "password" SET NOT NULL;
