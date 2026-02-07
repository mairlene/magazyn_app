/*
  Warnings:

  - A unique constraint covering the columns `[name,size,type]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Product_name_size_key";

-- CreateIndex
CREATE UNIQUE INDEX "Product_name_size_type_key" ON "public"."Product"("name", "size", "type");
