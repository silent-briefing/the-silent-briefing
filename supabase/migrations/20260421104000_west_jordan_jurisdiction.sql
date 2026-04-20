-- P2.4 sample node: city under Salt Lake County (tree QA in Directus)
INSERT INTO public.jurisdictions (name, level, state_code, slug)
VALUES ('West Jordan', 'city', 'UT', 'ut-slco-west-jordan')
ON CONFLICT (slug) DO NOTHING;

UPDATE public.jurisdictions j
SET parent_id = p.id
FROM public.jurisdictions p
WHERE j.slug = 'ut-slco-west-jordan'
  AND p.slug = 'ut-slco'
  AND (j.parent_id IS DISTINCT FROM p.id);
