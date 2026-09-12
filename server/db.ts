import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, Question, questions, InsertQuestion, users } from "../drizzle/schema";
import { seedQuestions } from "../shared/seedQuestions";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let seedPromise: Promise<void> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

async function ensureSeeded() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const db = await getDb();
    if (!db) return;
    const [{ total }] = await db.select({ total: count() }).from(questions);
    if (Number(total) > 0) return;
    const values: InsertQuestion[] = seedQuestions.map((item) => ({
      title: item.title,
      leetcodeNumber: item.leetcodeNumber,
      section: item.section,
      pattern: item.pattern,
      difficulty: item.difficulty,
      status: item.status,
      source: item.source,
      url: `https://leetcode.com/problems/${item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}/`,
    }));
    for (let index = 0; index < values.length; index += 100) {
      await db.insert(questions).values(values.slice(index, index + 100));
    }
  })().finally(() => {
    seedPromise = null;
  });
  return seedPromise;
}

type QuestionFilters = {
  search?: string;
  section?: string;
  pattern?: string;
  difficulty?: "all" | "Easy" | "Medium" | "Hard";
  status?: "all" | "Not started" | "In progress" | "Solved";
};

export async function listQuestions(filters: QuestionFilters = {}): Promise<Question[]> {
  await ensureSeeded();
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters.search?.trim()) {
    const query = `%${filters.search.trim()}%`;
    conditions.push(or(like(questions.title, query), like(questions.pattern, query), like(questions.section, query)));
  }
  if (filters.section && filters.section !== "all") conditions.push(eq(questions.section, filters.section));
  if (filters.pattern && filters.pattern !== "all") conditions.push(eq(questions.pattern, filters.pattern));
  if (filters.difficulty && filters.difficulty !== "all") conditions.push(eq(questions.difficulty, filters.difficulty));
  if (filters.status && filters.status !== "all") conditions.push(eq(questions.status, filters.status));
  const query = db.select().from(questions).orderBy(asc(questions.section), asc(questions.pattern), asc(questions.leetcodeNumber), asc(questions.id));
  return conditions.length ? query.where(and(...conditions)) : query;
}

export async function getQuestionStats() {
  await ensureSeeded();
  const db = await getDb();
  if (!db) return { total: 0, solved: 0, inProgress: 0, notStarted: 0, easy: 0, medium: 0, hard: 0, sections: 0 };
  const rows = await db.select().from(questions);
  return {
    total: rows.length,
    solved: rows.filter((row) => row.status === "Solved").length,
    inProgress: rows.filter((row) => row.status === "In progress").length,
    notStarted: rows.filter((row) => row.status === "Not started").length,
    easy: rows.filter((row) => row.difficulty === "Easy").length,
    medium: rows.filter((row) => row.difficulty === "Medium").length,
    hard: rows.filter((row) => row.difficulty === "Hard").length,
    sections: new Set(rows.map((row) => row.section)).size,
  };
}

export async function getQuestionFilters() {
  await ensureSeeded();
  const db = await getDb();
  if (!db) return { sections: [], patterns: [] };
  const rows = await db.select({ section: questions.section, pattern: questions.pattern }).from(questions).orderBy(asc(questions.section), asc(questions.pattern));
  return {
    sections: Array.from(new Set(rows.map((row) => row.section))),
    patterns: Array.from(new Set(rows.map((row) => row.pattern))),
  };
}

export async function createQuestion(input: InsertQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(questions).values(input);
  const id = Number(result[0].insertId);
  const created = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return created[0];
}

export async function updateQuestionStatus(id: number, status: Question["status"]) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(questions).set({ status, updatedAt: new Date() }).where(eq(questions.id, id));
  const updated = await db.select().from(questions).where(eq(questions.id, id)).limit(1);
  return updated[0];
}

export async function deleteQuestion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(questions).where(eq(questions.id, id));
  return { success: true } as const;
}
