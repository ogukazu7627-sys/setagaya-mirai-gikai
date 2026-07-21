-- AI Gatewayの有料クレジット投入後、公開AIインタビューをGPT-5.6 Lunaへ切り替える。
-- NULLの設定はアプリ側の DEFAULT_INTERVIEW_CHAT_MODEL を使うため、
-- 既存データで明示指定されているGPT-4o/GPT-5.2のみ更新する。

UPDATE public.interview_configs
SET
  chat_model = 'openai/gpt-5.6-luna',
  updated_at = now()
WHERE chat_model IN ('openai/gpt-4o', 'openai/gpt-5.2');
