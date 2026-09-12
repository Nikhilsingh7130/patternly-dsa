import { seedQuestions } from "../../shared/seedQuestions";

type Env = { DSA_DB: D1Database };

type Question = {
  id: number;
  title: string;
  leetcodeNumber: number | null;
  section: string;
  pattern: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status: "Not started" | "In progress" | "Solved";
  url: string | null;
  notes: string | null;
  source: string;
};

const headers = { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function ensureDatabase(db: D1Database) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, leetcodeNumber INTEGER, section TEXT NOT NULL, pattern TEXT NOT NULL, difficulty TEXT NOT NULL DEFAULT 'Medium', status TEXT NOT NULL DEFAULT 'Not started', url TEXT, notes TEXT, source TEXT NOT NULL DEFAULT 'Manual', createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  const row = await db.prepare("SELECT COUNT(*) AS total FROM questions").first<{ total: number }>();
  if (Number(row?.total ?? 0) > 0) return;
  for (let index = 0; index < seedQuestions.length; index += 50) {
    const batch = seedQuestions.slice(index, index + 50).map((item) => db.prepare("INSERT INTO questions (title, leetcodeNumber, section, pattern, difficulty, status, url, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(item.title, item.leetcodeNumber, item.section, item.pattern, item.difficulty, "Not started", `https://leetcode.com/problems/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}/`, "Thita patterns sheet"));
    await db.batch(batch);
  }
}

async function getQuestions(db: D1Database) {
  const result = await db.prepare("SELECT id, title, leetcodeNumber, section, pattern, difficulty, status, url, notes, source FROM questions ORDER BY section, pattern, leetcodeNumber, id").all<Question>();
  return result.results ?? [];
}

function summarize(questions: Question[]) {
  return {
    total: questions.length,
    solved: questions.filter((q) => q.status === "Solved").length,
    inProgress: questions.filter((q) => q.status === "In progress").length,
    notStarted: questions.filter((q) => q.status === "Not started").length,
    easy: questions.filter((q) => q.difficulty === "Easy").length,
    medium: questions.filter((q) => q.difficulty === "Medium").length,
    hard: questions.filter((q) => q.difficulty === "Hard").length,
    sections: new Set(questions.map((q) => q.section)).size,
  };
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (!env.DSA_DB) return json({ error: "DSA_DB binding is not configured" }, 500);
  await ensureDatabase(env.DSA_DB);
  const path = Array.isArray(params.path) ? params.path.join("/") : String(params.path ?? "");
  try {
    if (request.method === "GET" && path === "bootstrap") {
      const questions = await getQuestions(env.DSA_DB);
      return json({ questions, stats: summarize(questions), filters: { sections: Array.from(new Set(questions.map((q) => q.section))), patterns: Array.from(new Set(questions.map((q) => q.pattern))) } });
    }
    if (request.method === "POST" && path === "questions") {
      const body = await request.json() as Partial<Question>;
      if (!body.title || !body.section || !body.pattern || !["Easy", "Medium", "Hard"].includes(String(body.difficulty))) return json({ error: "title, section, pattern, and valid difficulty are required" }, 400);
      const result = await env.DSA_DB.prepare("INSERT INTO questions (title, leetcodeNumber, section, pattern, difficulty, status, url, notes, source) VALUES (?, ?, ?, ?, ?, 'Not started', ?, ?, 'Manual')").bind(body.title, body.leetcodeNumber ?? null, body.section, body.pattern, body.difficulty, body.url || null, body.notes || null).run();
      return json({ id: result.meta.last_row_id }, 201);
    }
    const match = path.match(/^questions\/(\d+)$/);
    if (match && request.method === "PATCH") {
      const body = await request.json() as { status?: string };
      if (!["Not started", "In progress", "Solved"].includes(String(body.status))) return json({ error: "Invalid status" }, 400);
      await env.DSA_DB.prepare("UPDATE questions SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?").bind(body.status, Number(match[1])).run();
      return json({ success: true });
    }
    if (match && request.method === "DELETE") {
      await env.DSA_DB.prepare("DELETE FROM questions WHERE id = ? AND source = 'Manual'").bind(Number(match[1])).run();
      return json({ success: true });
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "Internal API error" }, 500);
  }
};
