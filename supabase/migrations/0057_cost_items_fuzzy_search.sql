-- =============================================================================
-- Matadora — Phase 57: fix Polish-declension search misses in cost_items
-- =============================================================================
-- Live test after 0056 shipped: searching "pompa ciepła" (nominative) found
-- nothing because the seeded name is "Montaż pompy ciepła..." (genitive) —
-- plain ILIKE substring matching can't handle Polish noun declension.
-- word_similarity() from pg_trgm (already enabled in 0056) tolerates this
-- (0.73 similarity for that exact pair), so move search server-side into a
-- SQL function PostgREST can call via rpc(), combining substring matches
-- (still useful for KNR codes and exact fragments) with fuzzy matches.

create or replace function public.search_cost_items(q text, result_limit int default 25)
returns setof public.cost_items
language sql
stable
as $$
  select *
  from public.cost_items
  where
    name ilike '%' || q || '%'
    or code ilike '%' || q || '%'
    or word_similarity(q, name) > 0.3
  order by
    greatest(word_similarity(q, name), similarity(code, q)) desc,
    name asc
  limit result_limit;
$$;

grant execute on function public.search_cost_items(text, int) to anon, authenticated;
