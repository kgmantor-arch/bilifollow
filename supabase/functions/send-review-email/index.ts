// Optional Supabase Edge Function for review emails.
// Set RESEND_API_KEY and APP_URL with: supabase secrets set ...
// Deploy with: supabase functions deploy send-review-email
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const auth = request.headers.get("Authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });
  const { to, status, taskTitle } = await request.json();
  if (!to || !["approved", "rejected"].includes(status)) return new Response("Invalid payload", { status: 400 });
  const subject = status === "approved" ? "Your BiliFollow submission was approved" : "Your BiliFollow submission needs changes";
  const text = status === "approved"
    ? `Your submission for “${taskTitle}” was approved. Open BiliFollow to view your reward.`
    : `Your submission for “${taskTitle}” was rejected. Open BiliFollow to view the note and submit a new proof.`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "BiliFollow <notifications@example.com>", to: [to], subject, text })
  });
  return new Response(await response.text(), { status: response.status, headers: { "Content-Type": "application/json" } });
});
