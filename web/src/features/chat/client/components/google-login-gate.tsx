"use client";

interface GoogleLoginGateProps {
  message: string;
  isAuthLoading: boolean;
  onSignInWithGoogle: () => Promise<void>;
  className?: string;
}

export function GoogleGIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px] flex-shrink-0"
      focusable="false"
      viewBox="0 0 18 18"
    >
      <path
        d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleLoginGate({
  message,
  isAuthLoading,
  onSignInWithGoogle,
  className = "",
}: GoogleLoginGateProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <p className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-mirai-text sm:text-xs">
        {isAuthLoading ? "ログイン状態を確認中です" : message}
      </p>
      <button
        type="button"
        disabled={isAuthLoading}
        onClick={onSignInWithGoogle}
        aria-label="Google でログイン"
        className="inline-flex h-10 flex-shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full border border-[#747775] bg-white pl-3 pr-3 text-sm font-medium leading-5 text-[#1F1F1F] shadow-sm transition-colors hover:bg-[#F8F8F8] disabled:cursor-wait disabled:opacity-60"
        style={{ fontFamily: "Roboto, Arial, sans-serif" }}
      >
        <GoogleGIcon />
        Google でログイン
      </button>
    </div>
  );
}
