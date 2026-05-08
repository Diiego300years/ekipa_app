import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createIdeaVotePushPayload,
  createScheduledEventPushPayload,
} from "../../lib/push/push-utils";

function readProjectFile(filePath: string) {
  return fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
}

test.describe("push notification guardrails", () => {
  test("migration grants service role access only for push delivery", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260508000000_grant_push_subscriptions_service_role.sql",
    );

    expect(migration).toContain("grant usage on schema public to service_role;");
    expect(migration).toContain(
      "grant select, delete on table public.push_subscriptions to service_role;",
    );
    expect(migration).toContain("isolated server-side push delivery module");
    expect(migration).not.toMatch(
      /grant\s+(?:select|all)[^;]*public\.push_subscriptions[^;]*\b(?:anon|public)\b/i,
    );
    expect(migration).not.toMatch(/disable\s+row\s+level\s+security/i);
  });

  test("payload builders use neutral Polish copy and safe targets", () => {
    expect(
      createScheduledEventPushPayload({
        ideaTitle: "Planszówki",
      }),
    ).toEqual({
      title: "Nowy termin",
      body: "Nowy termin dla pomysłu: Planszówki",
      url: "/calendar",
    });

    expect(
      createIdeaVotePushPayload({
        voterDisplayName: "  Ola   Test  ",
        ideaTitle: "Kajaki",
      }),
    ).toEqual({
      title: "Nowy głos",
      body: "Użytkownik Ola Test oddał głos na Twój pomysł: Kajaki",
      url: "/ideas",
    });

    expect(
      createIdeaVotePushPayload({
        voterDisplayName: "ola@example.com",
        ideaTitle: "Kino",
      }).body,
    ).toBe("Użytkownik oddał głos na Twój pomysł: Kino");
  });

  test("service-role push module only queries push subscriptions", () => {
    const pushAdmin = readProjectFile("lib/push/push-admin.ts");
    const queriedTables = Array.from(
      pushAdmin.matchAll(/\.from\("([^"]+)"\)/g),
      (match) => match[1],
    );

    expect(new Set(queriedTables)).toEqual(new Set(["push_subscriptions"]));
    expect(pushAdmin).toContain('import "server-only";');
    expect(pushAdmin).not.toMatch(
      /\.from\("(?:ideas|votes|profiles|calendar_events)"\)/,
    );
  });

  test("schedule action queues scheduled-event push after successful insert", () => {
    const scheduleAction = readProjectFile(
      "app/(app)/ideas/[id]/schedule/actions.ts",
    );

    expect(scheduleAction).toContain('import { after } from "next/server";');
    expect(scheduleAction).toContain('.select("id,title,created_by")');
    expect(scheduleAction).toContain("sendScheduledEventPush");
    expect(scheduleAction.indexOf('revalidatePath("/calendar")')).toBeLessThan(
      scheduleAction.indexOf("sendScheduledEventPush"),
    );
  });

  test("vote action queues push only for new non-self votes", () => {
    const ideasAction = readProjectFile("app/(app)/ideas/actions.ts");
    const voteStart = ideasAction.indexOf("export async function voteForIdeaAction");
    const undoStart = ideasAction.indexOf(
      "export async function removeVoteForIdeaAction",
    );
    const voteAction = ideasAction.slice(voteStart, undoStart);
    const undoAction = ideasAction.slice(undoStart);

    expect(voteAction).toContain("after(async () =>");
    expect(voteAction).toContain("sendIdeaVotePush");
    expect(voteAction).toContain('.select("id,title,created_by")');
    expect(voteAction).toContain("idea.created_by === user.id");
    expect(voteAction.indexOf('mutationError.code === "23505"')).toBeLessThan(
      voteAction.indexOf("sendIdeaVotePush"),
    );
    expect(undoAction).not.toContain("sendIdeaVotePush");
  });
});
