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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { BillCard } from "@/features/bills/client/components/bill-list/bill-card";
import { routes } from "@/lib/routes";
import type { RecommendationSmallTag } from "../../shared/constants/recommendation-taxonomy";
import { RECOMMENDATION_SMALL_TAGS } from "../../shared/constants/recommendation-taxonomy";
import type {
  RecommendationAvailability,
  StoredRecommendationProfile,
  TodayRecommendationsResponse,
} from "../../shared/types/recommendation";
import {
  deleteRecommendationData,
  fetchTodayRecommendations,
  RecommendationClientError,
  recordRecommendationImpressions,
  resetRecommendationHistory,
  savePreferences,
} from "../utils/recommendation-api-client";
import {
  canPersistRecommendationProfile,
  createAnonymousInstallationId,
  getBrowserRecommendationStorage,
  readRecommendationProfile,
  removeRecommendationProfile,
  writeRecommendationProfile,
} from "../utils/recommendation-storage";
import {
  disableWebPush,
  enableWebPush,
  getPushSupport,
  type PushSupport,
} from "../utils/web-push-client";
import { RecommendationOnboardingDialog } from "./recommendation-onboarding-dialog";

type TodayRecommendationsSectionProps = {
  availability: RecommendationAvailability;
};

type LoadStatus = "idle" | "loading" | "ready" | "error";

export function TodayRecommendationsSection({
  availability,
}: TodayRecommendationsSectionProps) {
  const [profile, setProfile] = useState<StoredRecommendationProfile | null>(
    null
  );
  const [data, setData] = useState<TodayRecommendationsResponse | null>(null);
  const [status, setStatus] = useState<LoadStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pushSupport, setPushSupport] = useState<PushSupport | null>(null);
  const sentImpressionKeys = useRef(new Set<string>());
  const storageRef = useRef<Storage | null>(null);
  const hasAvailableTags = RECOMMENDATION_SMALL_TAGS.some(
    (tag) => availability[tag] > 0
  );

  const loadToday = useCallback(
    async (currentProfile: StoredRecommendationProfile) => {
      setStatus("loading");
      setMessage(null);
      try {
        const result = await fetchTodayRecommendations(
          currentProfile.installationId
        );
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
        setData(result);
        setStatus("ready");
      } catch (error) {
        if (
          error instanceof RecommendationClientError &&
          error.code === "profile-not-found"
        ) {
          if (storageRef.current) {
            removeRecommendationProfile(storageRef.current);
          }
          setProfile(null);
          setData(null);
          setStatus("idle");
          setOnboardingOpen(true);
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
    []
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
    }
    if (stored.status === "valid") {
      setProfile(stored.profile);
      void loadToday(stored.profile);
      return;
    }
    if (!hasAvailableTags) {
      setMessage("おすすめ機能を一時的に利用できません");
      setStatus("error");
      return;
    }
    setOnboardingOpen(true);
  }, [hasAvailableTags, loadToday]);

  const billIds = useMemo(
    () => data?.bills.map((bill) => bill.id) ?? [],
    [data]
  );
  useEffect(() => {
    if (!profile || !data || billIds.length === 0) {
      return;
    }
    const key = [
      profile.installationId,
      data.preferenceVersion,
      data.recommendationDate,
      billIds.join(","),
    ].join(":");
    if (sentImpressionKeys.current.has(key)) {
      return;
    }
    sentImpressionKeys.current.add(key);
    void recordRecommendationImpressions(profile.installationId, billIds).catch(
      () => {
        sentImpressionKeys.current.delete(key);
      }
    );
  }, [billIds, data, profile]);

  async function completeOnboarding(tags: RecommendationSmallTag[]) {
    const storage = storageRef.current;
    if (!storage || !canPersistRecommendationProfile(storage)) {
      setStorageUnavailable(true);
      throw new Error("このブラウザでは設定を保存できません");
    }

    const isNewProfile = profile == null;
    const installationId =
      profile?.installationId ?? createAnonymousInstallationId(window.crypto);
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

    setProfile(nextProfile);
    setOnboardingOpen(false);
    await loadToday(nextProfile);
  }

  async function enableNotifications() {
    if (!profile || !data?.vapidPublicKey) {
      setMessage("この環境では通知を設定できません");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      await enableWebPush({
        installationId: profile.installationId,
        vapidPublicKey: data.vapidPublicKey,
      });
      setData({ ...data, pushEnabled: true });
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
    setBusy(true);
    setMessage(null);
    try {
      await disableWebPush(profile.installationId);
      setData({ ...data, pushEnabled: false });
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
    setBusy(true);
    setMessage(null);
    try {
      const response = await resetRecommendationHistory(profile.installationId);
      const nextProfile = {
        ...profile,
        preferenceVersion: response.preferenceVersion,
      };
      if (storageRef.current) {
        writeRecommendationProfile(storageRef.current, nextProfile);
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
      }
      setProfile(null);
      setData(null);
      setStatus("idle");
      setDeleteOpen(false);
      setSettingsOpen(false);
      setOnboardingOpen(true);
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
            <h2 className="text-[22px] font-bold leading-[1.48] text-black">
              今日のあなたへのおすすめ
            </h2>
            {profile && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings />
                設定
              </Button>
            )}
          </div>

          {storageUnavailable && (
            <p role="alert" className="text-sm text-mirai-text-secondary">
              このブラウザではおすすめ設定を保存できません。通常の案件一覧は引き続き利用できます。
            </p>
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
                <a href="#theme-bills">テーマから案件を探す</a>
              </Button>
            </div>
          )}

          {status === "ready" && data && data.bills.length > 0 && (
            <div className="flex flex-col gap-4">
              {data.bills.map((bill) => (
                <Link key={bill.id} href={routes.billDetail(bill.id) as Route}>
                  <BillCard bill={bill} />
                </Link>
              ))}
            </div>
          )}

          {status === "ready" && data && data.bills.length === 0 && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-mirai-text-secondary">
                新しくおすすめできる案件がありません。
                <br />
                興味分野を変更するか、表示履歴をリセットすると、ほかの案件を表示できます。
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOnboardingOpen(true)}
                >
                  <SlidersHorizontal />
                  興味分野を変更
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetOpen(true)}
                >
                  <History />
                  表示履歴をリセット
                </Button>
              </div>
            </div>
          )}

          {profile && status === "ready" && (
            <div className="flex flex-wrap gap-3">
              {(data?.bills.length ?? 0) > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOnboardingOpen(true)}
                >
                  <SlidersHorizontal />
                  興味分野を変更
                </Button>
              )}
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
            </div>
          )}

          {profile && status === "ready" && !data?.pushEnabled && (
            <p className="text-xs leading-relaxed text-mirai-text-secondary">
              毎朝、その日のおすすめ案件を1回お知らせします。通知はいつでも停止できます。通知を有効にすると、Webプッシュ通知に必要な購読情報をサーバーへ保存します。
            </p>
          )}
          {profile && status === "ready" && notificationUnavailable && (
            <p className="text-xs text-mirai-text-secondary">
              このブラウザでは通知を利用できません。今日のおすすめはサイト内で確認できます。
            </p>
          )}
          {message && status !== "error" && (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          )}
        </div>
      </Container>

      <RecommendationOnboardingDialog
        open={onboardingOpen}
        required={profile == null && !storageUnavailable}
        availability={availability}
        profile={profile}
        onOpenChange={setOnboardingOpen}
        onComplete={completeOnboarding}
      />

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="rounded-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>おすすめ設定</DialogTitle>
            <DialogDescription>
              表示履歴と、このブラウザに保存した匿名設定を管理します。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-start gap-3">
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
