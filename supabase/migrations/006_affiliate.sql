-- Affiliate products (mocked third-party catalog for AI Stylist recommendations)
create table if not exists public.affiliate_products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text not null,
  color          text,
  style          text[] not null default '{}',
  formality      text not null,
  price          int not null,
  size           text,
  store          text not null,
  platform       text not null,
  emoji          text not null,
  image_url      text,
  description    text,
  affiliate_url  text not null,
  created_at     timestamptz not null default now()
);

alter table public.affiliate_products enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'affiliate_products' and policyname = 'Public read catalog'
  ) then
    create policy "Public read catalog" on public.affiliate_products for select using (true);
  end if;
end $$;

alter table public.matches add column if not exists affiliate_product_ids uuid[] not null default '{}';

insert into public.affiliate_products (name, category, color, style, formality, price, size, store, platform, emoji, description, affiliate_url) values
('เสื้อเชิ้ตขาวลินิน', 'top', 'ขาว', '{"minimal","classic"}', 'smart-casual', 590, 'S/M/L/XL', 'Uniqlo', 'Shopee', '👔', 'เสื้อเชิ้ตลินินทรงหลวม สวมใส่สบาย ใส่ได้ทั้งลำลองและทางการ', 'https://shopee.co.th/search?keyword=%E0%B9%80%E0%B8%AA%E0%B8%B7%E0%B9%89%E0%B8%AD%E0%B9%80%E0%B8%8A%E0%B8%B4%E0%B9%89%E0%B8%95%E0%B8%82%E0%B8%B2%E0%B8%A7%E0%B8%A5%E0%B8%B4%E0%B8%99%E0%B8%B4%E0%B8%99'),
('เสื้อยืดโอเวอร์ไซส์สีดำ', 'top', 'ดำ', '{"casual","streetwear"}', 'casual', 259, 'M/L/XL', 'H&M', 'Lazada', '👕', 'เสื้อยืดคอกลมทรงโอเวอร์ไซส์ เนื้อผ้าคอตตอน 100%', 'https://www.lazada.co.th/catalog/?q=%E0%B9%80%E0%B8%AA%E0%B8%B7%E0%B9%89%E0%B8%AD%E0%B8%A2%E0%B8%B7%E0%B8%94%E0%B9%82%E0%B8%AD%E0%B9%80%E0%B8%A7%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B9%84%E0%B8%8B%E0%B8%AA%E0%B9%8C%E0%B8%AA%E0%B8%B5%E0%B8%94%E0%B8%B3'),
('กางเกงยีนส์ขากระบอกสีน้ำเงิน', 'bottom', 'น้ำเงิน', '{"casual","classic"}', 'casual', 690, '28/30/32/34', 'Levi''s', 'Shopee', '👖', 'กางเกงยีนส์ทรงขากระบอก ใส่ได้ทุกโอกาส', 'https://shopee.co.th/search?keyword=%E0%B8%81%E0%B8%B2%E0%B8%87%E0%B9%80%E0%B8%81%E0%B8%87%E0%B8%A2%E0%B8%B5%E0%B8%99%E0%B8%AA%E0%B9%8C%E0%B8%82%E0%B8%B2%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B8%9A%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B5%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99'),
('กางเกงสแล็คสีเทา', 'bottom', 'เทา', '{"formal","office"}', 'formal', 790, 'S/M/L', 'Zara', 'Lazada', '👖', 'กางเกงสแล็คทรงตรง เหมาะกับชุดทำงาน', 'https://www.lazada.co.th/catalog/?q=%E0%B8%81%E0%B8%B2%E0%B8%87%E0%B9%80%E0%B8%81%E0%B8%87%E0%B8%AA%E0%B9%81%E0%B8%A5%E0%B9%87%E0%B8%84%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%97%E0%B8%B2'),
('เบลเซอร์สีเบจตัดกระดุม', 'outerwear', 'เบจ', '{"smart","office"}', 'smart-casual', 1290, 'S/M/L', 'Mango', 'Shopee', '🧥', 'เบลเซอร์ทรงสวย ใส่ทับเสื้อยืดหรือเชิ้ตก็เท่', 'https://shopee.co.th/search?keyword=%E0%B9%80%E0%B8%9A%E0%B8%A5%E0%B9%80%E0%B8%8B%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%9A%E0%B8%88'),
('แจ็คเก็ตยีนส์สีฟ้า', 'outerwear', 'ฟ้า', '{"casual","denim"}', 'casual', 890, 'M/L/XL', 'Levi''s', 'Lazada', '🧥', 'แจ็คเก็ตยีนส์คลาสสิก ใส่คลุมได้ทุกลุค', 'https://www.lazada.co.th/catalog/?q=%E0%B9%81%E0%B8%88%E0%B9%87%E0%B8%84%E0%B9%80%E0%B8%81%E0%B9%87%E0%B8%95%E0%B8%A2%E0%B8%B5%E0%B8%99%E0%B8%AA%E0%B9%8C%E0%B8%AA%E0%B8%B5%E0%B8%9F%E0%B9%89%E0%B8%B2'),
('รองเท้าผ้าใบสีขาว', 'shoes', 'ขาว', '{"casual","minimal"}', 'casual', 1190, '36-44', 'Converse', 'Shopee', '👟', 'รองเท้าผ้าใบคลาสสิก ใส่ได้ทุกชุด', 'https://shopee.co.th/search?keyword=%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%97%E0%B9%89%E0%B8%B2%E0%B8%9C%E0%B9%89%E0%B8%B2%E0%B9%83%E0%B8%9A%E0%B8%AA%E0%B8%B5%E0%B8%82%E0%B8%B2%E0%B8%A7'),
('รองเท้าส้นสูงสีดำ', 'shoes', 'ดำ', '{"elegant","office"}', 'formal', 1590, '35-40', 'Charles & Keith', 'Lazada', '👠', 'รองเท้าส้นสูงทรงหัวแหลม เหมาะกับชุดทำงานหรือออกงาน', 'https://www.lazada.co.th/catalog/?q=%E0%B8%A3%E0%B8%AD%E0%B8%87%E0%B9%80%E0%B8%97%E0%B9%89%E0%B8%B2%E0%B8%AA%E0%B9%89%E0%B8%99%E0%B8%AA%E0%B8%B9%E0%B8%87%E0%B8%AA%E0%B8%B5%E0%B8%94%E0%B8%B3'),
('เดรสลายดอกสีเขียว', 'dress', 'เขียว', '{"feminine","summer"}', 'smart-casual', 990, 'S/M/L', 'Zara', 'Shopee', '👗', 'เดรสผ้าพลิ้วลายดอกไม้ เหมาะกับหน้าร้อน', 'https://shopee.co.th/search?keyword=%E0%B9%80%E0%B8%94%E0%B8%A3%E0%B8%AA%E0%B8%A5%E0%B8%B2%E0%B8%A2%E0%B8%94%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B5%E0%B9%80%E0%B8%82%E0%B8%B5%E0%B8%A2%E0%B8%A7'),
('เดรสสีดำเรียบหรู', 'dress', 'ดำ', '{"elegant","classic"}', 'formal', 1490, 'S/M/L/XL', 'Mango', 'Lazada', '👗', 'เดรสสีดำเรียบหรู ใส่ออกงานได้ทันที', 'https://www.lazada.co.th/catalog/?q=%E0%B9%80%E0%B8%94%E0%B8%A3%E0%B8%AA%E0%B8%AA%E0%B8%B5%E0%B8%94%E0%B8%B3%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%9A%E0%B8%AB%E0%B8%A3%E0%B8%B9'),
('กระเป๋าสะพายหนังสีน้ำตาล', 'accessory', 'น้ำตาล', '{"classic","chic"}', 'smart-casual', 890, 'Free Size', 'Charles & Keith', 'Shopee', '👜', 'กระเป๋าสะพายหนัง PU ทรงคลาสสิก จุของได้เยอะ', 'https://shopee.co.th/search?keyword=%E0%B8%81%E0%B8%A3%E0%B8%B0%E0%B9%80%E0%B8%9B%E0%B9%8B%E0%B8%B2%E0%B8%AA%E0%B8%B0%E0%B8%9E%E0%B8%B2%E0%B8%A2%E0%B8%AB%E0%B8%99%E0%B8%B1%E0%B8%87%E0%B8%AA%E0%B8%B5%E0%B8%99%E0%B9%89%E0%B8%B3%E0%B8%95%E0%B8%B2%E0%B8%A5'),
('แว่นกันแดดทรงคลาสสิก', 'accessory', 'ดำ', '{"chic","summer"}', 'casual', 390, 'Free Size', 'Ray-Ban', 'Lazada', '🕶️', 'แว่นกันแดดทรงคลาสสิก กันแดดกัน UV', 'https://www.lazada.co.th/catalog/?q=%E0%B9%81%E0%B8%A7%E0%B9%88%E0%B8%99%E0%B8%81%E0%B8%B1%E0%B8%99%E0%B9%81%E0%B8%94%E0%B8%94%E0%B8%97%E0%B8%A3%E0%B8%87%E0%B8%84%E0%B8%A5%E0%B8%B2%E0%B8%AA%E0%B8%AA%E0%B8%B4%E0%B8%81'),
('เข็มขัดหนังสีดำ', 'accessory', 'ดำ', '{"classic","office"}', 'formal', 350, 'Free Size', 'Uniqlo', 'Shopee', '👞', 'เข็มขัดหนังแท้ หัวเข็มขัดเรียบหรู เหมาะกับชุดทำงาน', 'https://shopee.co.th/search?keyword=%E0%B9%80%E0%B8%82%E0%B9%87%E0%B8%A1%E0%B8%82%E0%B8%B1%E0%B8%94%E0%B8%AB%E0%B8%99%E0%B8%B1%E0%B8%87%E0%B8%AA%E0%B8%B5%E0%B8%94%E0%B8%B3'),
('เสื้อสเวตเตอร์คอกลมสีครีม', 'top', 'ครีม', '{"cozy","minimal"}', 'casual', 490, 'S/M/L', 'Uniqlo', 'Lazada', '🧶', 'เสื้อไหมพรมเนื้อนุ่ม ใส่สบายหน้าหนาว', 'https://www.lazada.co.th/catalog/?q=%E0%B9%80%E0%B8%AA%E0%B8%B7%E0%B9%89%E0%B8%AD%E0%B8%AA%E0%B9%80%E0%B8%A7%E0%B8%95%E0%B9%80%E0%B8%95%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%84%E0%B8%AD%E0%B8%81%E0%B8%A5%E0%B8%A1%E0%B8%AA%E0%B8%B5%E0%B8%84%E0%B8%A3%E0%B8%B5%E0%B8%A1');
