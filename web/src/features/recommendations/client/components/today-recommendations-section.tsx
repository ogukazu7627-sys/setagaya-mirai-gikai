"use client";

import {
  Bell,
  BellOff,
  History,
  Settings,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import { routes } from "@/lib/routes";
import type { RecommendationSmallTag } from "../../shared/constants/recommendation-taxonomy";
import type {
  RecommendationAvailability,
  StoredRecommendationProfile,
  TodayRecommendationsResponse,
} from "../../shared/types/recommendation";
import { getJstDateKey } from "../../shared/utils/jst-date";
import { getAvailableTags } from "../../shared/utils/recommendation-availability";
import {
  deleteRecommendationData,
  fetchRandomRecommendations,
  fetchRecommendationAvailability,
  fetchTodayRecommendations,
  RecommendationClientError,
  recordRecommendationImpressions,
  resetRecommendationHistory,
  savePreferences,
} from "../utils/recommendation-api-client";
import { createRecommendationImpressionBatcher } from "../utils/recommendation-impression-batcher";
import {
  canPersistRecommendationProfile,
  createAnonymousInstallationId,
  getBrowserRecommendationStorage,
  notifyRecommendationProfileUpdated,
  readRecommendationOnboardingDismissed,
  readRecommendationProfile,
  removeRecommendationOnboardingDismissed,
  removeRecommendationProfile,
  writeRecommendationOnboardingDismissed,
  writeRecommendationProfile,
} from "../utils/recommendation-storage";
import {
  isTodayRecommendationsCacheFresh,
  readTodayRecommendationsCache,
  removeTodayRecommendationsCache,
  writeTodayRecommendationsCache,
} from "../utils/today-recommendations-cache";
import {
  disableWebPush,
  enableWebPush,
  getPushSupport,
  type PushSupport,
} from "../utils/web-push-client";
import { RecommendationBillsCarousel } from "./recommendation-bills-carousel";
import { RecommendationOnboardingDialog } from "./recommendation-onboarding-dialog";

type TodayRecommendationsSectionProps = {
  currentDifficulty: DifficultyLevelEnum;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";
type AvailabilityStatus = "idle" | "loading" | "ready" | "error";
type RandomStatus = "idle" | "loading" | "ready" | "error";

export function TodayRecommendationsSection({
  currentDifficulty,
}: TodayRecommendationsSectionProps) {
  const [profile, setProfile] = useState<StoredRecommendationProfile | null>(
    null
  );
  const [data, setData] = useState<TodayRecommendationsResponse | null>(null);
  const [availability, setAvailability] =
    useState<RecommendationAvailability | null>(null);
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus>("idle");
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(
    null
  );
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [randomBills, setRandomBills] = useState<
    TodayRecommendationsResponse["bills"] | null
  >(null);
  const [randomStatus, setRandomStatus] = useState<RandomStatus>("idle");
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushSupport, setPushSupport] = useState<PushSupport | null>(null);
  const storageRef = useRef<Storage | null>(null);
  const availabilityRef = useRef<RecommendationAvailability | null>(null);
  const availabilityRequestRef =
    useRef<Promise<RecommendationAvailability> | null>(null);
  const todayRequestIdRef = useRef(0);
  const impressionBatcherRef = useRef<ReturnType<
    typeof createRecommendationImpressionBatcher
  > | null>(null);
  if (!impressionBatcherRef.current) {
    impressionBatcherRef.current = createRecommendationImpressionBatcher(
      recordRecommendationImpressions
    );
  }
  const impressionBatcher = impressionBatcherRef.current;

  const storeTodayData = useCallback(
    (
      currentProfile: StoredRecommendationProfile,
      recommendations: TodayRecommendationsResponse
    ) => {
      if (!storageRef.current) {
        return;
      }
      writeTodayRecommendationsCache(
        storageRef.current,
        {
          installationId: currentProfile.installationId,
          preferenceVersion: currentProfile.preferenceVersion,
          difficultyLevel: currentDifficulty,
        },
        recommendations
      );
    },
    [currentDifficulty]
  );

  const loadAvailability = useCallback(async () => {
    if (availabilityRef.current) {
      return availabilityRef.current;
    }
    if (availabilityRequestRef.current) {
      return availabilityRequestRef.current;
    }

    setAvailabilityStatus("loading");
    setAvailabilityMessage(null);
    const request = fetchRecommendationAvailability();
    availabilityRequestRef.current = request;
    try {
      const result = await request;
      availabilityRef.current = result;
      setAvailability(result);
      setAvailabilityStatus("ready");
      return result;
    } catch (error) {
      setAvailabilityStatus("error");
      setAvailabilityMessage(
        error instanceof Error
          ? error.message
          : "おすすめ設定を読み込めませんでした"
      );
      throw error;
    } finally {
      availabilityRequestRef.current = null;
    }
  }, []);

  const loadRandom = useCallback(async () => {
    setRandomStatus("loading");
    try {
      const result = await fetchRandomRecommendations();
      setRandomBills(result.bills);
      setRandomStatus("ready");
    } catch {
      setRandomStatus("error");
    }
  }, []);

  const dismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (storageRef.current) {
      writeRecommendationOnboardingDismissed(storageRef.current);
    }
    void loadRandom();
  }, [loadRandom]);

  const prepareOnboarding = useCallback(async () => {
    try {
      const result = await loadAvailability();
      if (getAvailableTags(result).length < 3) {
        setAvailabilityStatus("error");
        setAvailabilityMessage("おすすめ機能を一時的に利用できません");
        return;
      }
      setAvailabilityMessage(null);
      setOnboardingOpen(true);
    } catch {
      // 表示用エラーは loadAvailability 側で設定済み。
    }
  }, [loadAvailability]);

  const loadToday = useCallback(
    async (currentProfile: StoredRecommendationProfile) => {
      const requestId = ++todayRequestIdRef.current;
      setMessage(null);
      const cachedEntry = storageRef.current
        ? readTodayRecommendationsCache(storageRef.current, {
            installationId: currentProfile.installationId,
            preferenceVersion: currentProfile.preferenceVersion,
            difficultyLevel: currentDifficulty,
            recommendationDate: getJstDateKey(),
          })
        : null;
      const cached = cachedEntry?.data ?? null;
      if (cached) {
        setData(cached);
        setStatus("ready");
      } else {
        setStatus("loading");
      }
      if (cachedEntry && isTodayRecommendationsCacheFresh(cachedEntry)) {
        return;
      }

      try {
        const result = await fetchTodayRecommendations(
          currentProfile.installationId
        );
        if (requestId !== todayRequestIdRef.current) {
          return;
        }
        const nextProfile = {
          ...currentProfile,
          selectedSmallTags: result.selectedSmallTags,
          selectedParentCategoryIds: result.selectedParentCategoryIds,
          preferenceVersion: result.preferenceVersion,
        };
        setProfile(nextProfile);
        if (storageRef.current) {
          writeRecommendationProfile(storageRef.current, nextProfile);
        }
        storeTodayData(nextProfile, result);
        setData(result);
        setStatus("ready");
      } catch (error) {
        if (requestId !== todayRequestIdRef.current) {
          return;
        }
        if (
          error instanceof RecommendationClientError &&
          error.code === "profile-not-found"
        ) {
          if (storageRef.current) {
            removeRecommendationProfile(storageRef.current);
            removeTodayRecommendationsCache(storageRef.current);
          }
          setProfile(null);
          setData(null);
          setStatus("idle");
          await prepareOnboarding();
          return;
        }
        if (cached) {
          setStatus("ready");
          return;
        }
        setMessage(
          error instanceof Error
            ? error.message
            : "おすすめを読み込めませんでした"
        );
        setStatus("error");
      }
    },
    [currentDifficulty, prepareOnboarding, storeTodayData]
  );

  useEffect(() => {
    setPushSupport(getPushSupport());
    const storage = getBrowserRecommendationStorage();
    storageRef.current = storage;
    if (!storage) {
      setStorageUnavailable(true);
      return;
    }
    const stored = readRecommendationProfile(storage);
    if (stored.status === "unavailable") {
      setStorageUnavailable(true);
      return;
    }
    if (stored.status === "invalid") {
      removeRecommendationProfile(storage);
      removeTodayRecommendationsCache(storage);
    }
    if (stored.status === "valid") {
      setProfile(stored.profile);
      void loadToday(stored.profile);
      return;
    }
    // 一度「今は選ばない」を選んだ利用者へは、毎回モーダルを出さずランダム表示にする。
    if (readRecommendationOnboardingDismissed(storage)) {
      setOnboardingDismissed(true);
      void loadRandom();
      return;
    }
    void prepareOnboarding();
  }, [loadRandom, loadToday, prepareOnboarding]);

  useEffect(() => {
    const flushImpressions = () => {
      void impressionBatcher.flush();
    };
    window.addEventListener("pagehide", flushImpressions);
    return () => {
      window.removeEventListener("pagehide", flushImpressions);
      todayRequestIdRef.current += 1;
      impressionBatcher.dispose();
    };
  }, [impressionBatcher]);

  const recordViewedBill = useCallback(
    (billId: string) => {
      if (!profile || !data) {
        return;
      }
      impressionBatcher.record(
        {
          installationId: profile.installationId,
          preferenceVersion: data.preferenceVersion,
          recommendationDate: data.recommendationDate,
        },
        billId
      );
    },
    [data, impressionBatcher, profile]
  );

  async function completeOnboarding(tags: RecommendationSmallTag[]) {
    const storage = storageRef.current;
    if (!storage || !canPersistRecommendationProfile(storage)) {
      setStorageUnavailable(true);
      throw new Error("このブラウザでは設定を保存できません");
    }

    const isNewProfile = profile == null;
    const installationId =
      profile?.installationId ?? createAnonymousInstallationId(window.crypto);
    todayRequestIdRef.current += 1;
    await impressionBatcher.flush();
    const response = await savePreferences({
      installationId,
      selectedSmallTags: tags,
      timezone:
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo",
    });
    const nextProfile: StoredRecommendationProfile = {
      installationId,
      selectedSmallTags: response.selectedSmallTags,
      selectedParentCategoryIds: response.selectedParentCategoryIds,
      completedAt: profile?.completedAt ?? new Date().toISOString(),
      preferenceVersion: response.preferenceVersion,
    };

    if (!writeRecommendationProfile(storage, nextProfile)) {
      if (isNewProfile) {
        await deleteRecommendationData(installationId).catch(() => null);
      }
      setStorageUnavailable(true);
      throw new Error("このブラウザでは設定を保存できません");
    }

    removeTodayRecommendationsCache(storage);
    removeRecommendationOnboardingDismissed(storage);
    notifyRecommendationProfileUpdated();
    setOnboardingDismissed(false);
    setRandomBills(null);
    setRandomStatus("idle");
    setProfile(nextProfile);
    setOnboardingOpen(false);
    await loadToday(nextProfile);
  }

  async function enableNotifications() {
    if (!profile || !data?.vapidPublicKey) {
      setMessage("この環境では通知を設定できません");
      return;
    }
    todayRequestIdRef.current += 1;
    setBusy(true);
    setMessage(null);
    try {
      await enableWebPush({
        installationId: profile.installationId,
        vapidPublicKey: data.vapidPublicKey,
      });
      const nextData = { ...data, pushEnabled: true };
      setData(nextData);
      storeTodayData(profile, nextData);
    } catch {
      setPushSupport(getPushSupport());
      setMessage(
        typeof Notification !== "undefined" &&
          Notification.permission === "denied"
          ? "通知が拒否されています。ブラウザのサイト設定から変更できます。"
          : "通知を設定できませんでした。今日のおすすめはサイト内で確認できます。"
      );
    } finally {
      setBusy(false);
    }
  }

  async function stopNotifications() {
    if (!profile || !data) {
      return;
    }
    todayRequestIdRef.current += 1;
    setBusy(true);
    setMessage(null);
    try {
      await disableWebPush(profile.installationId);
      const nextData = { ...data, pushEnabled: false };
      setData(nextData);
      storeTodayData(profile, nextData);
    } catch {
      setMessage("通知を停止できませんでした。もう一度お試しください。");
    } finally {
      setBusy(false);
    }
  }

  async function resetHistory() {
    if (!profile) {
      return;
    }
    todayRequestIdRef.current += 1;
    setBusy(true);
    setMessage(null);
    try {
      await impressionBatcher.flush();
      const response = await resetRecommendationHistory(profile.installationId);
      const nextProfile = {
        ...profile,
        preferenceVersion: response.preferenceVersion,
      };
      if (storageRef.current) {
        writeRecommendationProfile(storageRef.current, nextProfile);
        removeTodayRecommendationsCache(storageRef.current);
      }
      setProfile(nextProfile);
      setResetOpen(false);
      await loadToday(nextProfile);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "履歴をリセットできません"
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteAllData() {
    if (!profile) {
      return;
    }
    todayRequestIdRef.current += 1;
    setBusy(true);
    setMessage(null);
    try {
      await disableWebPush(profile.installationId).catch(() => null);
      await deleteRecommendationData(profile.installationId).catch((error) => {
        if (
          error instanceof RecommendationClientError &&
          error.code === "profile-not-found"
        ) {
          return;
        }
        throw error;
      });
      if (storageRef.current) {
        removeRecommendationProfile(storageRef.current);
        removeTodayRecommendationsCache(storageRef.current);
        removeRecommendationOnboardingDismissed(storageRef.current);
      }
      notifyRecommendationProfileUpdated();
      setProfile(null);
      setData(null);
      setStatus("idle");
      setOnboardingDismissed(false);
      setRandomBills(null);
      setRandomStatus("idle");
      setDeleteOpen(false);
      setSettingsOpen(false);
      await prepareOnboarding();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "設定を削除できません"
      );
    } finally {
      setBusy(false);
    }
  }

  const notificationUnavailable =
    pushSupport != null &&
    (!pushSupport.supported || data?.vapidPublicKey == null);

  return (
    <section id="today-recommendations" className="scroll-mt-20 bg-white py-10">
      <Container>
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="min-w-0 text-balance text-[22px] font-bold leading-[1.48] text-black">
              {onboardingDismissed && !profile
                ? "今日のおすすめ"
                : "今日のあなたへのおすすめ"}
            </h2>
            {profile && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings />
                設定
              </Button>
            )}
            {!profile && onboardingDismissed && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => void prepareOnboarding()}
                disabled={availabilityStatus === "loading"}
              >
                <SlidersHorizontal />
                興味分野を選ぶ
              </Button>
            )}
          </div>

          {storageUnavailable && (
            <p role="alert" className="text-sm text-mirai-text-secondary">
              このブラウザではおすすめ設定を保存できません。通常の案件一覧は引き続き利用できます。
            </p>
          )}

          {!storageUnavailable &&
            !profile &&
            availabilityStatus === "loading" && (
              <p
                className="text-sm text-mirai-text-secondary"
                aria-live="polite"
              >
                おすすめ設定を準備しています...
              </p>
            )}

          {!storageUnavailable &&
            !profile &&
            availabilityStatus === "error" && (
              <div className="space-y-4">
                <p role="alert" className="text-sm text-mirai-text-secondary">
                  {availabilityMessage ?? "おすすめ設定を読み込めませんでした"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void prepareOnboarding()}
                >
                  もう一度試す
                </Button>
              </div>
            )}

          {!storageUnavailable && status === "loading" && (
            <p className="text-sm text-mirai-text-secondary" aria-live="polite">
              おすすめを読み込んでいます...
            </p>
          )}

          {!storageUnavailable && status === "error" && (
            <div className="space-y-4">
              <p role="alert" className="text-sm text-mirai-text-secondary">
                {message}
              </p>
              <Button asChild variant="outline">
                <Link href={routes.bills() as Route}>
                  議会ページで案件を探す
                </Link>
              </Button>
            </div>
          )}

          {status === "ready" && data && data.bills.length > 0 && (
            <RecommendationBillsCarousel
              bills={data.bills}
              onBillViewed={recordViewedBill}
            />
          )}

          {status === "ready" && data && data.bills.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                新しくおすすめできる案件がありません。
                <br />
                設定から興味分野の変更や表示履歴のリセットを行うと、ほかの案件を表示できます。
              </p>
            </div>
          )}

          {!profile && onboardingDismissed && randomStatus === "loading" && (
            <p className="text-sm text-mirai-text-secondary" aria-live="polite">
              おすすめを読み込んでいます...
            </p>
          )}

          {!profile &&
            onboardingDismissed &&
            randomStatus === "ready" &&
            randomBills != null && (
              <div className="flex flex-col gap-4">
                <p className="text-sm leading-relaxed text-mirai-text-secondary">
                  興味分野が未設定のため、公開中の案件からランダムに表示しています。
                </p>
                {randomBills.length > 0 ? (
                  <RecommendationBillsCarousel bills={randomBills} />
                ) : (
                  <p className="text-sm text-mirai-text-secondary">
                    表示できる案件がありません。
                  </p>
                )}
              </div>
            )}

          {!profile && onboardingDismissed && randomStatus === "error" && (
            <div className="space-y-4">
              <p role="alert" className="text-sm text-mirai-text-secondary">
                おすすめを読み込めませんでした。
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadRandom()}
              >
                もう一度試す
              </Button>
            </div>
          )}

          {profile &&
            status === "ready" &&
            !data?.pushEnabled &&
            notificationUnavailable && (
              <p className="text-xs text-mirai-text-secondary">
                このブラウザでは通知を利用できません。今日のおすすめはサイト内で確認できます。
              </p>
            )}
          {message && status !== "error" && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
          {profile && availabilityMessage && (
            <p role="alert" className="text-sm text-destructive">
              {availabilityMessage}
            </p>
          )}
        </div>
      </Container>

      {availability && (
        <RecommendationOnboardingDialog
          open={onboardingOpen}
          required={profile == null && !storageUnavailable}
          availability={availability}
          profile={profile}
          onOpenChange={setOnboardingOpen}
          onComplete={completeOnboarding}
          onDismiss={dismissOnboarding}
        />
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="rounded-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>おすすめ設定</DialogTitle>
            <DialogDescription>
              興味分野、通知、表示履歴、このブラウザに保存した匿名設定を管理します。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-start gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSettingsOpen(false);
                void prepareOnboarding();
              }}
              disabled={availabilityStatus === "loading"}
            >
              <SlidersHorizontal />
              興味分野を変更
            </Button>
            {data?.pushEnabled ? (
              <Button
                type="button"
                variant="outline"
                onClick={stopNotifications}
                disabled={busy}
              >
                <BellOff />
                通知を停止
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={enableNotifications}
                disabled={busy || notificationUnavailable}
              >
                <Bell />
                毎朝、おすすめを受け取る
              </Button>
            )}
            {!data?.pushEnabled && !notificationUnavailable && (
              <p className="text-xs leading-relaxed text-mirai-text-secondary">
                毎朝、その日のおすすめ案件を1回お知らせします。通知はいつでも停止できます。通知を有効にすると、Webプッシュ通知に必要な購読情報をサーバーへ保存します。
              </p>
            )}
            {notificationUnavailable && (
              <p className="text-xs text-mirai-text-secondary">
                このブラウザでは通知を利用できません。今日のおすすめはサイト内で確認できます。
              </p>
            )}
            <p className="text-xs leading-relaxed text-mirai-text-secondary">
              興味分野や履歴は匿名の設定としてこのブラウザに保存されます。
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSettingsOpen(false);
                setResetOpen(true);
              }}
            >
              <History />
              表示履歴をリセット
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setSettingsOpen(false);
                setDeleteOpen(true);
              }}
            >
              <Trash2 />
              おすすめ設定をすべて削除
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="表示履歴をリセット"
        description="これまで表示した案件を、再びおすすめに含めますか？"
        confirmLabel="リセットする"
        busy={busy}
        onConfirm={resetHistory}
      />
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="おすすめ設定をすべて削除"
        description="通知、興味分野、表示履歴を削除し、最初の選択画面へ戻ります。"
        confirmLabel="すべて削除"
        destructive
        busy={busy}
        onConfirm={deleteAllData}
      />
    </section>
  );
}

function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = false,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy: boolean;
  onConfirm: () => Promise<void>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => void onConfirm()}
            disabled={busy}
          >
            {busy ? "処理中..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
