"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const InterviewLayoutContext = createContext({
  isInterviewActive: false,
  setInterviewActive: (_active: boolean) => {},
});

export function InterviewLayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [activePath, setActivePath] = useState<string | null>(null);
  const setInterviewActive = useCallback(
    (active: boolean) => {
      setActivePath((current) =>
        active ? pathname : current === pathname ? null : current
      );
    },
    [pathname]
  );
  const value = useMemo(
    () => ({
      isInterviewActive: activePath === pathname,
      setInterviewActive,
    }),
    [activePath, pathname, setInterviewActive]
  );

  return (
    <InterviewLayoutContext.Provider value={value}>
      {children}
    </InterviewLayoutContext.Provider>
  );
}

export function useInterviewLayout() {
  return useContext(InterviewLayoutContext);
}

export function useActiveInterviewLayout() {
  const { setInterviewActive } = useInterviewLayout();
  useLayoutEffect(() => {
    setInterviewActive(true);
    return () => setInterviewActive(false);
  }, [setInterviewActive]);
}
