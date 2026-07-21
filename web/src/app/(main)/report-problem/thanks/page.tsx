import type { Metadata, Route } from "next";
import Link from "next/link";
import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "送信しました | みらい議会＠世田谷区",
  description: "問題報告・お問い合わせの送信完了",
};

export default function ReportProblemThanksPage() {
  return (
    <main className="bg-mirai-surface-light pt-24 pb-16 md:pt-12">
      <Container className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">送信しました</CardTitle>
            <CardDescription>
              内容を確認し、必要に応じて掲載情報の修正や改善に活用します。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={routes.home() as Route}>トップへ戻る</Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
    </main>
  );
}
