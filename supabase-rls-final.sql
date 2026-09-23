-- SUPABASE RLS FIX - ACTUAL TABLE NAMES FROM SCHEMA

-- ============================================================================
-- PUBLIC TABLES - Allow public READ only
-- ============================================================================

ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "category_read" ON "Category" FOR SELECT USING (true);
CREATE POLICY "category_block_write" ON "Category" FOR INSERT WITH CHECK (false);
CREATE POLICY "category_block_update" ON "Category" FOR UPDATE USING (false);
CREATE POLICY "category_block_delete" ON "Category" FOR DELETE USING (false);

ALTER TABLE "Brand" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brand_read" ON "Brand" FOR SELECT USING (true);
CREATE POLICY "brand_block_write" ON "Brand" FOR INSERT WITH CHECK (false);
CREATE POLICY "brand_block_update" ON "Brand" FOR UPDATE USING (false);
CREATE POLICY "brand_block_delete" ON "Brand" FOR DELETE USING (false);

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_read" ON "Product" FOR SELECT USING (true);
CREATE POLICY "product_block_write" ON "Product" FOR INSERT WITH CHECK (false);
CREATE POLICY "product_block_update" ON "Product" FOR UPDATE USING (false);
CREATE POLICY "product_block_delete" ON "Product" FOR DELETE USING (false);

ALTER TABLE "Specification" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spec_read" ON "Specification" FOR SELECT USING (true);
CREATE POLICY "spec_block_write" ON "Specification" FOR INSERT WITH CHECK (false);
CREATE POLICY "spec_block_update" ON "Specification" FOR UPDATE USING (false);
CREATE POLICY "spec_block_delete" ON "Specification" FOR DELETE USING (false);

ALTER TABLE "ProductFaq" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq_read" ON "ProductFaq" FOR SELECT USING (true);
CREATE POLICY "faq_block_write" ON "ProductFaq" FOR INSERT WITH CHECK (false);
CREATE POLICY "faq_block_update" ON "ProductFaq" FOR UPDATE USING (false);
CREATE POLICY "faq_block_delete" ON "ProductFaq" FOR DELETE USING (false);

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_read" ON "Review" FOR SELECT USING (true);
CREATE POLICY "review_block_write" ON "Review" FOR INSERT WITH CHECK (false);
CREATE POLICY "review_block_update" ON "Review" FOR UPDATE USING (false);
CREATE POLICY "review_block_delete" ON "Review" FOR DELETE USING (false);

ALTER TABLE "BlogPost" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_read" ON "BlogPost" FOR SELECT USING (true);
CREATE POLICY "blog_block_write" ON "BlogPost" FOR INSERT WITH CHECK (false);
CREATE POLICY "blog_block_update" ON "BlogPost" FOR UPDATE USING (false);
CREATE POLICY "blog_block_delete" ON "BlogPost" FOR DELETE USING (false);

ALTER TABLE "Testimonial" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonial_read" ON "Testimonial" FOR SELECT USING (true);
CREATE POLICY "testimonial_block_write" ON "Testimonial" FOR INSERT WITH CHECK (false);
CREATE POLICY "testimonial_block_update" ON "Testimonial" FOR UPDATE USING (false);
CREATE POLICY "testimonial_block_delete" ON "Testimonial" FOR DELETE USING (false);

ALTER TABLE "Faq" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq_read" ON "Faq" FOR SELECT USING (true);
CREATE POLICY "faq_block_write" ON "Faq" FOR INSERT WITH CHECK (false);
CREATE POLICY "faq_block_update" ON "Faq" FOR UPDATE USING (false);
CREATE POLICY "faq_block_delete" ON "Faq" FOR DELETE USING (false);

-- ============================================================================
-- SENSITIVE TABLES - Block ALL public access
-- ============================================================================

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_block" ON "Order" FOR SELECT USING (false);
CREATE POLICY "order_block_write" ON "Order" FOR INSERT WITH CHECK (false);
CREATE POLICY "order_block_update" ON "Order" FOR UPDATE USING (false);
CREATE POLICY "order_block_delete" ON "Order" FOR DELETE USING (false);

ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orderitem_block" ON "OrderItem" FOR SELECT USING (false);
CREATE POLICY "orderitem_block_write" ON "OrderItem" FOR INSERT WITH CHECK (false);
CREATE POLICY "orderitem_block_update" ON "OrderItem" FOR UPDATE USING (false);
CREATE POLICY "orderitem_block_delete" ON "OrderItem" FOR DELETE USING (false);

ALTER TABLE "Contact" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_block" ON "Contact" FOR SELECT USING (false);
CREATE POLICY "contact_block_write" ON "Contact" FOR INSERT WITH CHECK (false);
CREATE POLICY "contact_block_update" ON "Contact" FOR UPDATE USING (false);
CREATE POLICY "contact_block_delete" ON "Contact" FOR DELETE USING (false);

ALTER TABLE "Enquiry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enquiry_block" ON "Enquiry" FOR SELECT USING (false);
CREATE POLICY "enquiry_block_write" ON "Enquiry" FOR INSERT WITH CHECK (false);
CREATE POLICY "enquiry_block_update" ON "Enquiry" FOR UPDATE USING (false);
CREATE POLICY "enquiry_block_delete" ON "Enquiry" FOR DELETE USING (false);

ALTER TABLE "Subscriber" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriber_block" ON "Subscriber" FOR SELECT USING (false);
CREATE POLICY "subscriber_block_write" ON "Subscriber" FOR INSERT WITH CHECK (false);
CREATE POLICY "subscriber_block_update" ON "Subscriber" FOR UPDATE USING (false);
CREATE POLICY "subscriber_block_delete" ON "Subscriber" FOR DELETE USING (false);

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customer_block" ON "Customer" FOR SELECT USING (false);
CREATE POLICY "customer_block_write" ON "Customer" FOR INSERT WITH CHECK (false);
CREATE POLICY "customer_block_update" ON "Customer" FOR UPDATE USING (false);
CREATE POLICY "customer_block_delete" ON "Customer" FOR DELETE USING (false);

ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "setting_block" ON "SiteSetting" FOR SELECT USING (false);
CREATE POLICY "setting_block_write" ON "SiteSetting" FOR INSERT WITH CHECK (false);
CREATE POLICY "setting_block_update" ON "SiteSetting" FOR UPDATE USING (false);
CREATE POLICY "setting_block_delete" ON "SiteSetting" FOR DELETE USING (false);

ALTER TABLE "Discount" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discount_block" ON "Discount" FOR SELECT USING (false);
CREATE POLICY "discount_block_write" ON "Discount" FOR INSERT WITH CHECK (false);
CREATE POLICY "discount_block_update" ON "Discount" FOR UPDATE USING (false);
CREATE POLICY "discount_block_delete" ON "Discount" FOR DELETE USING (false);

ALTER TABLE "DeliveryZone" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "zone_block" ON "DeliveryZone" FOR SELECT USING (false);
CREATE POLICY "zone_block_write" ON "DeliveryZone" FOR INSERT WITH CHECK (false);
CREATE POLICY "zone_block_update" ON "DeliveryZone" FOR UPDATE USING (false);
CREATE POLICY "zone_block_delete" ON "DeliveryZone" FOR DELETE USING (false);

ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_block" ON "AdminUser" FOR SELECT USING (false);
CREATE POLICY "admin_block_write" ON "AdminUser" FOR INSERT WITH CHECK (false);
CREATE POLICY "admin_block_update" ON "AdminUser" FOR UPDATE USING (false);
CREATE POLICY "admin_block_delete" ON "AdminUser" FOR DELETE USING (false);

ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_block" ON "ChatConversation" FOR SELECT USING (false);
CREATE POLICY "chat_block_write" ON "ChatConversation" FOR INSERT WITH CHECK (false);
CREATE POLICY "chat_block_update" ON "ChatConversation" FOR UPDATE USING (false);
CREATE POLICY "chat_block_delete" ON "ChatConversation" FOR DELETE USING (false);
