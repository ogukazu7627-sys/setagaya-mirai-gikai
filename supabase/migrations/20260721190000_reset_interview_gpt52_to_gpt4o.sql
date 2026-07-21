-- 公開AIインタビューの安定運用のため、暫定的にGPT-5.2指定をGPT-4oへ戻す。
-- NULLの設定はアプリ側の DEFAULT_INTERVIEW_CHAT_MODEL を使うため、明示指定された行だけ更新する。

UPDATE public.interview_configs
SET
  chat_model = 'openai/gpt-4o',
  updated_at = now()
WHERE chat_model = 'openai/gpt-5.2';
