CREATE OR REPLACE FUNCTION public.queue_council_search_bill_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.enqueue_council_search_index_job(NEW.id);
    RETURN NEW;
  END IF;

  IF
    OLD.diet_session_id IS NOT DISTINCT FROM NEW.diet_session_id
    AND OLD.name IS NOT DISTINCT FROM NEW.name
    AND OLD.item_type IS NOT DISTINCT FROM NEW.item_type
    AND OLD.major_category IS NOT DISTINCT FROM NEW.major_category
    AND OLD.status_label IS NOT DISTINCT FROM NEW.status_label
    AND OLD.status_note IS NOT DISTINCT FROM NEW.status_note
    AND OLD.submitted_date IS NOT DISTINCT FROM NEW.submitted_date
    AND OLD.publish_status IS NOT DISTINCT FROM NEW.publish_status
    AND OLD.publication_category IS NOT DISTINCT FROM NEW.publication_category
  THEN
    RETURN NEW;
  END IF;

  PERFORM public.enqueue_council_search_index_job(NEW.id);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.queue_council_search_bill_row() IS
  '案件の検索索引ソース列が変わった場合だけ索引更新ジョブをenqueueする';
