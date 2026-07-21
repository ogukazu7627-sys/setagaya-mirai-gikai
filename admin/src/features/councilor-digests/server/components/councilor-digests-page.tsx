import { Copy, MailCheck, Plus, UserPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  addCommitteeCouncilorAction,
  createCommitteeAction,
  markCouncilorDigestSentAction,
  removeCommitteeCouncilorAction,
  upsertCouncilorContactAction,
} from "../actions/councilor-digest-actions";
import {
  listCommitteesWithMembers,
  listCouncilorContacts,
  listPendingCouncilorDigestGroups,
} from "../repositories/councilor-digest-repository";

export async function CouncilorDigestsPage() {
  const [groups, contacts, committees] = await Promise.all([
    listPendingCouncilorDigestGroups(),
    listCouncilorContacts(),
    listCommitteesWithMembers(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">議員宛レポート</h1>
        <p className="mt-1 text-gray-600">
          ユーザーが「この議員に伝えたい」と選択したAIインタビューレポートを、議員ごとのメール本文にまとめます。
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">未送信レポート</h2>
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-gray-600">
              未送信の議員宛レポートはありません。
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <Card key={group.councilorId}>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                        {group.councilorName}議員
                        <Badge variant="secondary">
                          {group.items.length}件
                        </Badge>
                        {group.isDeliveryEnabled ? (
                          <Badge>送付対象</Badge>
                        ) : (
                          <Badge variant="outline">送付対象未設定</Badge>
                        )}
                      </CardTitle>
                      <p className="mt-1 text-sm text-gray-600">
                        宛先: {group.email || "メール未設定"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor={`subject-${group.councilorId}`}
                      className="text-sm font-bold"
                    >
                      件名
                    </label>
                    <Input
                      id={`subject-${group.councilorId}`}
                      value={group.subject}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor={`body-${group.councilorId}`}
                      className="text-sm font-bold"
                    >
                      メール本文
                    </label>
                    <Textarea
                      id={`body-${group.councilorId}`}
                      value={group.body}
                      readOnly
                      rows={18}
                    />
                  </div>
                  <form action={markCouncilorDigestSentAction}>
                    <input
                      type="hidden"
                      name="councilor_id"
                      value={group.councilorId}
                    />
                    <input type="hidden" name="subject" value={group.subject} />
                    <input type="hidden" name="body" value={group.body} />
                    {group.recipientIds.map((recipientId) => (
                      <input
                        key={recipientId}
                        type="hidden"
                        name="recipient_id"
                        value={recipientId}
                      />
                    ))}
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="submit" variant="outline">
                        <MailCheck className="size-4" />
                        送信済みにする
                      </Button>
                      <p className="flex items-center gap-2 text-sm text-gray-600">
                        <Copy className="size-4" />
                        件名と本文をコピーして、手元のメールソフトから送信してください。
                      </p>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">議員連絡先</h2>
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <form
              key={contact.councilorId}
              action={upsertCouncilorContactAction}
              className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-[180px_1fr_auto_auto]"
            >
              <input
                type="hidden"
                name="councilor_id"
                value={contact.councilorId}
              />
              <div className="font-bold">{contact.councilorName}議員</div>
              <Input
                name="email"
                type="email"
                defaultValue={contact.email ?? ""}
                placeholder="メールアドレス"
              />
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  name="is_delivery_enabled"
                  defaultChecked={contact.isDeliveryEnabled}
                  className="size-4"
                />
                送付対象
              </label>
              <Button type="submit" variant="outline">
                保存
              </Button>
            </form>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">委員会メンバー</h2>
          <p className="mt-1 text-sm text-gray-600">
            案件情報から委員会名を読み取れた場合、ここで登録した議員を「伝える相手」の候補に出します。
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">委員会を追加</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={createCommitteeAction}
              className="grid gap-3 md:grid-cols-[1fr_auto]"
            >
              <Input
                name="name"
                placeholder="例: 企画総務常任委員会"
                required
              />
              <Button type="submit" variant="outline">
                <Plus className="size-4" />
                追加
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {committees.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-sm text-gray-600">
                登録済みの委員会はありません。
              </CardContent>
            </Card>
          ) : (
            committees.map((committee) => (
              <Card key={committee.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{committee.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form
                    action={addCommitteeCouncilorAction}
                    className="grid gap-3 md:grid-cols-[1fr_auto]"
                  >
                    <input
                      type="hidden"
                      name="committee_id"
                      value={committee.id}
                    />
                    <select
                      name="councilor_id"
                      required
                      className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="">議員を選択</option>
                      {contacts.map((contact) => (
                        <option
                          key={`${committee.id}-${contact.councilorId}`}
                          value={contact.councilorId}
                        >
                          {contact.councilorName}議員
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="outline">
                      <UserPlus className="size-4" />
                      メンバーに追加
                    </Button>
                  </form>

                  {committee.members.length === 0 ? (
                    <p className="rounded-lg border bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      メンバー未登録です。
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {committee.members.map((member) => (
                        <form
                          key={`${committee.id}-${member.councilorId}`}
                          action={removeCommitteeCouncilorAction}
                          className="flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm font-bold"
                        >
                          <input
                            type="hidden"
                            name="committee_id"
                            value={committee.id}
                          />
                          <input
                            type="hidden"
                            name="councilor_id"
                            value={member.councilorId}
                          />
                          <span>{member.councilorName}議員</span>
                          <button
                            type="submit"
                            className="text-gray-500 hover:text-red-600"
                            aria-label={`${member.councilorName}議員を委員会から外す`}
                          >
                            <X className="size-4" />
                          </button>
                        </form>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
