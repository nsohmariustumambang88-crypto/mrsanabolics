-- SUPABASE ROW-LEVEL SECURITY (RLS) FIX - CORRECTED
-- Each operation (SELECT, INSERT, UPDATE, DELETE) needs its own policy

-- ============================================================================
-- PUBLIC TABLES - Allow public READ only
-- ============================================================================

-- Product table
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_allow_public_read" ON "Product" FOR SELECT USING (true);
CREATE POLICY "product_block_insert" ON "Product" FOR INSERT WITH CHECK (false);
CREATE POLICY "product_block_update" ON "Product" FOR UPDATE USING (false);
CREATE POLICY "product_block_delete" ON "Product" FOR DELETE USING (false);

-- Category table
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_allow_public_read" ON "Category" FOR SELECT USING (true);
CREATE POLICY "category_block_insert" ON "Category" FOR INSERT WITH CHECK (false);
CREATE POLICY "category_block_update" ON "Category" FOR UPDATE USING (false);
CREATE POLICY "category_block_delete" ON "Category" FOR DELETE USING (false);

-- Brand table
ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_allow_public_read" ON "Brand" FOR SELECT USING (true);
CREATE POLICY "brand_block_insert" ON "Brand" FOR INSERT WITH CHECK (false);
CREATE POLICY "brand_block_update" ON "Brand" FOR UPDATE USING (false);
CREATE POLICY "brand_block_delete" ON "Brand" FOR DELETE USING (false);

-- BlogPost table
ALTER TABLE "BlogPost" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blogpost_allow_public_read" ON "BlogPost" FOR SELECT USING (true);
CREATE POLICY "blogpost_block_insert" ON "BlogPost" FOR INSERT WITH CHECK (false);
CREATE POLICY "blogpost_block_update" ON "BlogPost" FOR UPDATE USING (false);
CREATE POLICY "blogpost_block_delete" ON "BlogPost" FOR DELETE USING (false);

-- Specification table
ALTER TABLE "Specification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spec_allow_public_read" ON "Specification" FOR SELECT USING (true);
CREATE POLICY "spec_block_insert" ON "Specification" FOR INSERT WITH CHECK (false);
CREATE POLICY "spec_block_update" ON "Specification" FOR UPDATE USING (false);
CREATE POLICY "spec_block_delete" ON "Specification" FOR DELETE USING (false);

-- ProductFaq table
ALTER TABLE "ProductFaq" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq_allow_public_read" ON "ProductFaq" FOR SELECT USING (true);
CREATE POLICY "faq_block_insert" ON "ProductFaq" FOR INSERT WITH CHECK (false);
CREATE POLICY "faq_block_update" ON "ProductFaq" FOR UPDATE USING (false);
CREATE POLICY "faq_block_delete" ON "ProductFaq" FOR DELETE USING (false);

-- Review table
ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_allow_public_read" ON "Review" FOR SELECT USING (true);
CREATE POLICY "review_block_insert" ON "Review" FOR INSERT WITH CHECK (false);
CREATE POLICY "review_block_update" ON "Review" FOR UPDATE USING (false);
CREATE POLICY "review_block_delete" ON "Review" FOR DELETE USING (false);

-- ============================================================================
-- SENSITIVE TABLES - Block ALL public access
-- ============================================================================

-- Order table
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_block_select" ON "Order" FOR SELECT USING (false);
CREATE POLICY "order_block_insert" ON "Order" FOR INSERT WITH CHECK (false);
CREATE POLICY "order_block_update" ON "Order" FOR UPDATE USING (false);
CREATE POLICY "order_block_delete" ON "Order" FOR DELETE USING (false);

-- Contact table
ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_block_select" ON "Contact" FOR SELECT USING (false);
CREATE POLICY "contact_block_insert" ON "Contact" FOR INSERT WITH CHECK (false);
CREATE POLICY "contact_block_update" ON "Contact" FOR UPDATE USING (false);
CREATE POLICY "contact_block_delete" ON "Contact" FOR DELETE USING (false);

-- Subscriber table
ALTER TABLE "Subscriber" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriber_block_select" ON "Subscriber" FOR SELECT USING (false);
CREATE POLICY "subscriber_block_insert" ON "Subscriber" FOR INSERT WITH CHECK (false);
CREATE POLICY "subscriber_block_update" ON "Subscriber" FOR UPDATE USING (false);
CREATE POLICY "subscriber_block_delete" ON "Subscriber" FOR DELETE USING (false);

-- Customer table
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_block_select" ON "Customer" FOR SELECT USING (false);
CREATE POLICY "customer_block_insert" ON "Customer" FOR INSERT WITH CHECK (false);
CREATE POLICY "customer_block_update" ON "Customer" FOR UPDATE USING (false);
CREATE POLICY "customer_block_delete" ON "Customer" FOR DELETE USING (false);

-- Setting table
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setting_block_select" ON "Setting" FOR SELECT USING (false);
CREATE POLICY "setting_block_insert" ON "Setting" FOR INSERT WITH CHECK (false);
CREATE POLICY "setting_block_update" ON "Setting" FOR UPDATE USING (false);
CREATE POLICY "setting_block_delete" ON "Setting" FOR DELETE USING (false);

-- Discount table
ALTER TABLE "Discount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discount_block_select" ON "Discount" FOR SELECT USING (false);
CREATE POLICY "discount_block_insert" ON "Discount" FOR INSERT WITH CHECK (false);
CREATE POLICY "discount_block_update" ON "Discount" FOR UPDATE USING (false);
CREATE POLICY "discount_block_delete" ON "Discount" FOR DELETE USING (false);

-- DeliveryZone table
ALTER TABLE "DeliveryZone" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zone_block_select" ON "DeliveryZone" FOR SELECT USING (false);
CREATE POLICY "zone_block_insert" ON "DeliveryZone" FOR INSERT WITH CHECK (false);
CREATE POLICY "zone_block_update" ON "DeliveryZone" FOR UPDATE USING (false);
CREATE POLICY "zone_block_delete" ON "DeliveryZone" FOR DELETE USING (false);
