-- 既存のAIインタビュー設定をGPT-6世代へ移行する。
-- NULLはアプリ側のDEFAULT_INTERVIEW_CHAT_MODELを参照するため更新不要。

UPDATE public.interview_configs
SET
  chat_model = CASE chat_model
    WHEN 'openai/gpt-5.6-luna' THEN 'openai/gpt-6-luna'
    WHEN 'openai/gpt-5.6-sol' THEN 'openai/gpt-6-sol'
  END,
  updated_at = now()
WHERE chat_model IN ('openai/gpt-5.6-luna', 'openai/gpt-5.6-sol');
