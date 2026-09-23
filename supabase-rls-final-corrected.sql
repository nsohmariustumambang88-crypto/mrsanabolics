-- SUPABASE RLS FIX - LOWERCASE TABLE NAMES

-- ============================================================================
-- PUBLIC TABLES - Allow public READ only
-- ============================================================================

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON "categories" FOR SELECT USING (true);
CREATE POLICY "categories_block_write" ON "categories" FOR INSERT WITH CHECK (false);
CREATE POLICY "categories_block_update" ON "categories" FOR UPDATE USING (false);
CREATE POLICY "categories_block_delete" ON "categories" FOR DELETE USING (false);

ALTER TABLE "brands" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_read" ON "brands" FOR SELECT USING (true);
CREATE POLICY "brands_block_write" ON "brands" FOR INSERT WITH CHECK (false);
CREATE POLICY "brands_block_update" ON "brands" FOR UPDATE USING (false);
CREATE POLICY "brands_block_delete" ON "brands" FOR DELETE USING (false);

ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read" ON "products" FOR SELECT USING (true);
CREATE POLICY "products_block_write" ON "products" FOR INSERT WITH CHECK (false);
CREATE POLICY "products_block_update" ON "products" FOR UPDATE USING (false);
CREATE POLICY "products_block_delete" ON "products" FOR DELETE USING (false);

ALTER TABLE "specifications" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specifications_read" ON "specifications" FOR SELECT USING (true);
CREATE POLICY "specifications_block_write" ON "specifications" FOR INSERT WITH CHECK (false);
CREATE POLICY "specifications_block_update" ON "specifications" FOR UPDATE USING (false);
CREATE POLICY "specifications_block_delete" ON "specifications" FOR DELETE USING (false);

ALTER TABLE "product_faqs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_faqs_read" ON "product_faqs" FOR SELECT USING (true);
CREATE POLICY "product_faqs_block_write" ON "product_faqs" FOR INSERT WITH CHECK (false);
CREATE POLICY "product_faqs_block_update" ON "product_faqs" FOR UPDATE USING (false);
CREATE POLICY "product_faqs_block_delete" ON "product_faqs" FOR DELETE USING (false);

ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews_read" ON "reviews" FOR SELECT USING (true);
CREATE POLICY "reviews_block_write" ON "reviews" FOR INSERT WITH CHECK (false);
CREATE POLICY "reviews_block_update" ON "reviews" FOR UPDATE USING (false);
CREATE POLICY "reviews_block_delete" ON "reviews" FOR DELETE USING (false);

ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_read" ON "blog_posts" FOR SELECT USING (true);
CREATE POLICY "blog_posts_block_write" ON "blog_posts" FOR INSERT WITH CHECK (false);
CREATE POLICY "blog_posts_block_update" ON "blog_posts" FOR UPDATE USING (false);
CREATE POLICY "blog_posts_block_delete" ON "blog_posts" FOR DELETE USING (false);

ALTER TABLE "testimonials" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials_read" ON "testimonials" FOR SELECT USING (true);
CREATE POLICY "testimonials_block_write" ON "testimonials" FOR INSERT WITH CHECK (false);
CREATE POLICY "testimonials_block_update" ON "testimonials" FOR UPDATE USING (false);
CREATE POLICY "testimonials_block_delete" ON "testimonials" FOR DELETE USING (false);

ALTER TABLE "faqs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_read" ON "faqs" FOR SELECT USING (true);
CREATE POLICY "faqs_block_write" ON "faqs" FOR INSERT WITH CHECK (false);
CREATE POLICY "faqs_block_update" ON "faqs" FOR UPDATE USING (false);
CREATE POLICY "faqs_block_delete" ON "faqs" FOR DELETE USING (false);

-- ============================================================================
-- SENSITIVE TABLES - Block ALL public access
-- ============================================================================

ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_block" ON "orders" FOR SELECT USING (false);
CREATE POLICY "orders_block_write" ON "orders" FOR INSERT WITH CHECK (false);
CREATE POLICY "orders_block_update" ON "orders" FOR UPDATE USING (false);
CREATE POLICY "orders_block_delete" ON "orders" FOR DELETE USING (false);

ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_block" ON "order_items" FOR SELECT USING (false);
CREATE POLICY "order_items_block_write" ON "order_items" FOR INSERT WITH CHECK (false);
CREATE POLICY "order_items_block_update" ON "order_items" FOR UPDATE USING (false);
CREATE POLICY "order_items_block_delete" ON "order_items" FOR DELETE USING (false);

ALTER TABLE "contacts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_block" ON "contacts" FOR SELECT USING (false);
CREATE POLICY "contacts_block_write" ON "contacts" FOR INSERT WITH CHECK (false);
CREATE POLICY "contacts_block_update" ON "contacts" FOR UPDATE USING (false);
CREATE POLICY "contacts_block_delete" ON "contacts" FOR DELETE USING (false);

ALTER TABLE "enquiries" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enquiries_block" ON "enquiries" FOR SELECT USING (false);
CREATE POLICY "enquiries_block_write" ON "enquiries" FOR INSERT WITH CHECK (false);
CREATE POLICY "enquiries_block_update" ON "enquiries" FOR UPDATE USING (false);
CREATE POLICY "enquiries_block_delete" ON "enquiries" FOR DELETE USING (false);

ALTER TABLE "subscribers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscribers_block" ON "subscribers" FOR SELECT USING (false);
CREATE POLICY "subscribers_block_write" ON "subscribers" FOR INSERT WITH CHECK (false);
CREATE POLICY "subscribers_block_update" ON "subscribers" FOR UPDATE USING (false);
CREATE POLICY "subscribers_block_delete" ON "subscribers" FOR DELETE USING (false);

ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_block" ON "customers" FOR SELECT USING (false);
CREATE POLICY "customers_block_write" ON "customers" FOR INSERT WITH CHECK (false);
CREATE POLICY "customers_block_update" ON "customers" FOR UPDATE USING (false);
CREATE POLICY "customers_block_delete" ON "customers" FOR DELETE USING (false);

ALTER TABLE "site_settings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings_block" ON "site_settings" FOR SELECT USING (false);
CREATE POLICY "site_settings_block_write" ON "site_settings" FOR INSERT WITH CHECK (false);
CREATE POLICY "site_settings_block_update" ON "site_settings" FOR UPDATE USING (false);
CREATE POLICY "site_settings_block_delete" ON "site_settings" FOR DELETE USING (false);

ALTER TABLE "discounts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "discounts_block" ON "discounts" FOR SELECT USING (false);
CREATE POLICY "discounts_block_write" ON "discounts" FOR INSERT WITH CHECK (false);
CREATE POLICY "discounts_block_update" ON "discounts" FOR UPDATE USING (false);
CREATE POLICY "discounts_block_delete" ON "discounts" FOR DELETE USING (false);

ALTER TABLE "delivery_zones" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_zones_block" ON "delivery_zones" FOR SELECT USING (false);
CREATE POLICY "delivery_zones_block_write" ON "delivery_zones" FOR INSERT WITH CHECK (false);
CREATE POLICY "delivery_zones_block_update" ON "delivery_zones" FOR UPDATE USING (false);
CREATE POLICY "delivery_zones_block_delete" ON "delivery_zones" FOR DELETE USING (false);

ALTER TABLE "delivery_rates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_rates_block" ON "delivery_rates" FOR SELECT USING (false);
CREATE POLICY "delivery_rates_block_write" ON "delivery_rates" FOR INSERT WITH CHECK (false);
CREATE POLICY "delivery_rates_block_update" ON "delivery_rates" FOR UPDATE USING (false);
CREATE POLICY "delivery_rates_block_delete" ON "delivery_rates" FOR DELETE USING (false);

ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_block" ON "admin_users" FOR SELECT USING (false);
CREATE POLICY "admin_users_block_write" ON "admin_users" FOR INSERT WITH CHECK (false);
CREATE POLICY "admin_users_block_update" ON "admin_users" FOR UPDATE USING (false);
CREATE POLICY "admin_users_block_delete" ON "admin_users" FOR DELETE USING (false);

ALTER TABLE "chat_conversations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_conversations_block" ON "chat_conversations" FOR SELECT USING (false);
CREATE POLICY "chat_conversations_block_write" ON "chat_conversations" FOR INSERT WITH CHECK (false);
CREATE POLICY "chat_conversations_block_update" ON "chat_conversations" FOR UPDATE USING (false);
CREATE POLICY "chat_conversations_block_delete" ON "chat_conversations" FOR DELETE USING (false);

ALTER TABLE "chat_messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages_block" ON "chat_messages" FOR SELECT USING (false);
CREATE POLICY "chat_messages_block_write" ON "chat_messages" FOR INSERT WITH CHECK (false);
CREATE POLICY "chat_messages_block_update" ON "chat_messages" FOR UPDATE USING (false);
CREATE POLICY "chat_messages_block_delete" ON "chat_messages" FOR DELETE USING (false);

ALTER TABLE "contact_activities" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_activities_block" ON "contact_activities" FOR SELECT USING (false);
CREATE POLICY "contact_activities_block_write" ON "contact_activities" FOR INSERT WITH CHECK (false);
CREATE POLICY "contact_activities_block_update" ON "contact_activities" FOR UPDATE USING (false);
CREATE POLICY "contact_activities_block_delete" ON "contact_activities" FOR DELETE USING (false);

ALTER TABLE "contact_notes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_notes_block" ON "contact_notes" FOR SELECT USING (false);
CREATE POLICY "contact_notes_block_write" ON "contact_notes" FOR INSERT WITH CHECK (false);
CREATE POLICY "contact_notes_block_update" ON "contact_notes" FOR UPDATE USING (false);
CREATE POLICY "contact_notes_block_delete" ON "contact_notes" FOR DELETE USING (false);

ALTER TABLE "campaigns" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_block" ON "campaigns" FOR SELECT USING (false);
CREATE POLICY "campaigns_block_write" ON "campaigns" FOR INSERT WITH CHECK (false);
CREATE POLICY "campaigns_block_update" ON "campaigns" FOR UPDATE USING (false);
CREATE POLICY "campaigns_block_delete" ON "campaigns" FOR DELETE USING (false);
