import { inferCronWindow, runReminderCron } from "@/lib/push/runCron";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const windowParam = url.searchParams.get("window");
  const window =
    windowParam === "morning" || windowParam === "evening"
      ? windowParam
      : inferCronWindow(new Date());

  const result = await runReminderCron(new Date(), window);
  return Response.json({ ok: true, window, ...result });
}
