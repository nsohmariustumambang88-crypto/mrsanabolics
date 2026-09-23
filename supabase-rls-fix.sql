-- SUPABASE ROW-LEVEL SECURITY (RLS) FIX
-- Run this in Supabase SQL Editor to secure all tables
-- This prevents unauthorized access to sensitive data

-- ============================================================================
-- PUBLIC TABLES (Product, Category, Brand) - Allow public READ only
-- ============================================================================

-- Product table: Allow public read, restrict write to admins
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "Product"
  FOR SELECT
  USING (true);

CREATE POLICY "Restrict write to admins" ON "Product"
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Restrict update to admins" ON "Product"
  FOR UPDATE
  WITH CHECK (false);

CREATE POLICY "Restrict delete to admins" ON "Product"
  FOR DELETE
  USING (false);

-- Category table: Allow public read
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "Category"
  FOR SELECT
  USING (true);

CREATE POLICY "Restrict write to admins" ON "Category"
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Restrict update to admins" ON "Category"
  FOR UPDATE
  WITH CHECK (false);

CREATE POLICY "Restrict delete to admins" ON "Category"
  FOR DELETE
  USING (false);

-- Brand table: Allow public read
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "Brand"
  FOR SELECT
  USING (true);

CREATE POLICY "Restrict write to admins" ON "Brand"
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Restrict update to admins" ON "Brand"
  FOR UPDATE
  WITH CHECK (false);

CREATE POLICY "Restrict delete to admins" ON "Brand"
  FOR DELETE
  USING (false);

-- ============================================================================
-- SENSITIVE TABLES - Block all public access
-- ============================================================================

-- Order table: Authenticated users only
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "Order"
  FOR ALL
  USING (false);

-- Contact table: Block public access
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "Contact"
  FOR ALL
  USING (false);

-- Subscriber table: Block public access
ALTER TABLE "Subscriber" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "Subscriber"
  FOR ALL
  USING (false);

-- Customer table: Block public access
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "Customer"
  FOR ALL
  USING (false);

-- BlogPost table: Allow public read
ALTER TABLE "BlogPost" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "BlogPost"
  FOR SELECT
  USING (true);

CREATE POLICY "Block writes" ON "BlogPost"
  FOR INSERT, UPDATE, DELETE
  USING (false);

-- Specification table: Allow public read (via Product)
ALTER TABLE "Specification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "Specification"
  FOR SELECT
  USING (true);

CREATE POLICY "Block writes" ON "Specification"
  FOR INSERT, UPDATE, DELETE
  USING (false);

-- ProductFaq table: Allow public read
ALTER TABLE "ProductFaq" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "ProductFaq"
  FOR SELECT
  USING (true);

CREATE POLICY "Block writes" ON "ProductFaq"
  FOR INSERT, UPDATE, DELETE
  USING (false);

-- Review table: Allow public read, restrict write
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON "Review"
  FOR SELECT
  USING (true);

CREATE POLICY "Block direct inserts" ON "Review"
  FOR INSERT, UPDATE, DELETE
  USING (false);

-- ============================================================================
-- ADMIN-ONLY TABLES
-- ============================================================================

-- Setting table: Block all public access
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "Setting"
  FOR ALL
  USING (false);

-- DeliveryZone table: Block public access
ALTER TABLE "DeliveryZone" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "DeliveryZone"
  FOR ALL
  USING (false);

-- Discount table: Block public access
ALTER TABLE "Discount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block all public access" ON "Discount"
  FOR ALL
  USING (false);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- Row-Level Security is now enabled on all tables.
-- Public users can only read: Product, Category, Brand, BlogPost, Specification, ProductFaq, Review
-- All writes are blocked for public users.
-- Sensitive tables (Order, Contact, Subscriber, Customer, Setting, etc.) are completely hidden.
-- ============================================================================
