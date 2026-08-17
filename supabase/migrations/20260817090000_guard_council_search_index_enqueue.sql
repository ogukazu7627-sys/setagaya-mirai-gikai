CREATE OR REPLACE FUNCTION public.enqueue_council_search_index_job(
  p_bill_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_bill_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bills AS bill
    WHERE bill.id = p_bill_id
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.council_search_index_jobs (
    bill_id,
    status,
    attempt_count,
    requested_at,
    available_at,
    locked_at,
    last_error
  )
  VALUES (
    p_bill_id,
    'pending',
    0,
    now(),
    now(),
    NULL,
    NULL
  )
  ON CONFLICT (bill_id) DO UPDATE
  SET
    status = 'pending',
    attempt_count = 0,
    requested_at = now(),
    available_at = now(),
    locked_at = NULL,
    last_error = NULL,
    updated_at = now();
END;
$$;
