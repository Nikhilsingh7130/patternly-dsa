import { describe, expect, it } from "vitest";
import { seedQuestions } from "../shared/seedQuestions";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("seed question catalog", () => {
  it("contains the imported sheet questions with unique problem keys", () => {
    expect(seedQuestions).toHaveLength(414);
    const keys = seedQuestions.map((question) => `${question.leetcodeNumber}:${question.title}`);
    expect(new Set(keys).size).toBe(seedQuestions.length);
    expect(new Set(seedQuestions.map((question) => question.section)).size).toBe(10);
    expect(seedQuestions.every((question) => question.pattern && question.source === "Thita patterns sheet")).toBe(true);
  });
});

describe("questions.add validation", () => {
  it("rejects an empty title before touching the database", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.questions.add({
      title: " ",
      section: "Dynamic Programming",
      pattern: "1D DP",
      difficulty: "Medium",
      url: "",
      notes: "",
    })).rejects.toThrow();
  });
});
