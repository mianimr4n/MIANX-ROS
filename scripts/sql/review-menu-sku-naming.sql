-- Phase 4 SKU naming + integrity review (read-only).
\pset border 0
select 'size_label_distribution' as section, coalesce(size_label,'(none)') as label, count(*) as skus
from menu_items group by 1,2 order by 3 desc;

select 'integrity' as section,
  (select count(*) from menu_items where slug is null or slug = '') as bad_slug,
  (select count(*) from menu_items where name is null or name = '') as bad_name,
  (select count(*) from menu_items where product_group_slug is null) as null_group,
  (select count(*) from menu_items where sort_order is null) as null_sort,
  (select count(*) from menu_items where is_available is null) as null_available,
  (select count(*) from menu_items where category_id is null) as null_category,
  (select count(*) from menu_items where price is null or price < 0) as bad_price,
  (select count(*) from (select slug from menu_items group by slug having count(*) > 1) d) as dup_slug,
  (select count(*) from (select product_group_slug, coalesce(size_label,'') from menu_items group by 1,2 having count(*) > 1) d) as dup_family_size;

select 'family_size_matrix' as section, product_group_slug, count(*) as sku_count,
  string_agg(coalesce(size_label,'(single)'), ' | ' order by sort_order, slug) as sizes,
  string_agg(price::text, ' | ' order by sort_order, slug) as prices
from menu_items
where product_type <> 'topping'
group by product_group_slug
having count(*) > 1
order by product_group_slug
limit 40;

select 'single_price_families' as section, count(*) as families
from (select product_group_slug from menu_items group by product_group_slug having count(*) = 1) d;
