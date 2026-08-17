update public.bills
set major_category = '予算全体'
where publication_category = 'budget'
  and major_category = '全体';
