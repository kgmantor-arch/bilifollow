import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] || ".";
const htmlFiles = readdirSync(root).filter((file) => file.endsWith(".html"));
const errors = [];

for (const file of htmlFiles) {
  const content = readFileSync(join(root, file), "utf8");
  for (const match of content.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const reference = match[1];
    if (reference === "#" || /^(https?:|mailto:|#)/.test(reference)) continue;
    if (!existsSync(join(root, reference))) errors.push(`${file}: missing ${reference}`);
  }
}

const pairs = [
  ["promote.html", "js/promote.js", ["taskForm", "taskTitle", "taskInstructions", "category", "taskUrl", "deadline", "target", "reward", "estimatedCost", "balance", "message", "logoutBtn"]],
  ["task.html", "js/task.js", ["taskTitle", "taskDescription", "taskMeta", "taskReward", "taskLink", "submissionForm", "proofFile", "existingSubmission", "message", "logoutBtn"]],
  ["coin-history.html", "js/coin-history.js", ["balance", "transactionList", "logoutBtn"]],
  ["profile.html", "js/profile.js", ["profileForm", "username", "referenceUrl", "message", "logoutBtn"]],
  ["notifications.html", "js/notifications.js", ["notificationList", "logoutBtn"]]
];

for (const [html, js, ids] of pairs) {
  const markup = readFileSync(join(root, html), "utf8");
  const script = readFileSync(join(root, js), "utf8");
  for (const id of ids) {
    if (!markup.includes(`id="${id}"`)) errors.push(`${html}: missing #${id}`);
    if (!script.includes(`"${id}"`)) errors.push(`${js}: does not use #${id}`);
  }
}

const taskScript = readFileSync(join(root, "js/task.js"), "utf8");
if (!taskScript.includes('rpc("submit_proof"')) errors.push("task.js: proof submission must use submit_proof RPC");
if (taskScript.includes('.from("submissions")') && taskScript.includes('.insert(')) {
  errors.push("task.js: direct submissions table write found");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`OK: ${htmlFiles.length} pages passed internal consistency checks.`);
