import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  createQuestion,
  deleteQuestion,
  getQuestionFilters,
  getQuestionStats,
  listQuestions,
  updateQuestionStatus,
} from "./db";

const statusSchema = z.enum(["Not started", "In progress", "Solved"]);
const difficultySchema = z.enum(["Easy", "Medium", "Hard"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  questions: router({
    list: publicProcedure
      .input(z.object({
        search: z.string().optional(),
        section: z.string().optional(),
        pattern: z.string().optional(),
        difficulty: z.union([z.literal("all"), difficultySchema]).optional(),
        status: z.union([z.literal("all"), statusSchema]).optional(),
      }).optional())
      .query(({ input }) => listQuestions(input ?? {})),
    stats: publicProcedure.query(() => getQuestionStats()),
    filters: publicProcedure.query(() => getQuestionFilters()),
    add: publicProcedure
      .input(z.object({
        title: z.string().trim().min(2).max(255),
        leetcodeNumber: z.number().int().positive().optional(),
        section: z.string().trim().min(2).max(128),
        pattern: z.string().trim().min(2).max(255),
        difficulty: difficultySchema,
        url: z.string().url().optional().or(z.literal("")),
        notes: z.string().max(5000).optional(),
      }))
      .mutation(({ input }) => createQuestion({
        ...input,
        url: input.url || null,
        notes: input.notes || null,
        source: "Manual",
        status: "Not started",
      })),
    updateStatus: publicProcedure
      .input(z.object({ id: z.number().int().positive(), status: statusSchema }))
      .mutation(({ input }) => updateQuestionStatus(input.id, input.status)),
    remove: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => deleteQuestion(input.id)),
  }),
});

export type AppRouter = typeof appRouter;
