// Later: Session, Observation, TeachingActivity, FunctionalTask, GeneralizationProbe, ContextRecord, SupportRecord.
//
// Phase 1 (Daily Practice Workspace, Step 1) defines only: Session, Observation.
// RLS is REQUIRED on every table below and is applied through SQL migrations
// (not by Drizzle).

import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { caseRecord, learner, teamMember } from "../case_mgmt/schema";
import { goal } from "../planning/schema";

export const sessionTypeEnum = pgEnum("session_type", [
  "special_education",
  "therapy",
  "behavior_support",
  "vocational_training",
  "functional_activity",
  "classroom_support",
  "community_based",
  "family_coaching",
  "meeting",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "scheduled",
  "in_progress",
  "completed",
  "missed",
  "cancelled",
  "documented",
]);

export const sessionCompletionStatusEnum = pgEnum("session_completion_status", [
  "complete",
  "partial",
  "not_completed",
]);

export const observationTypeEnum = pgEnum("observation_type", [
  "structured",
  "narrative",
  "ABC",
  "functional",
  "classroom",
  "family_report",
  "learner_report",
  "task_performance",
]);

export const observationPurposeEnum = pgEnum("observation_purpose", [
  "baseline",
  "progress",
  "incident",
  "generalization",
  "quality_check",
  "follow_up",
]);

export const observationStatusEnum = pgEnum("observation_status", [
  "draft",
  "reviewed",
  "approved",
  "superseded",
]);

export const session = pgTable(
  "session",
  {
    sessionId: uuid("session_id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.caseId, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learner.learnerId, { onDelete: "restrict" }),
    sessionType: sessionTypeEnum("session_type").notNull(),
    scheduledStartAt: timestamp("scheduled_start_at", { withTimezone: true }),
    scheduledEndAt: timestamp("scheduled_end_at", { withTimezone: true }),
    actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
    actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
    deliveredByTeamMemberId: uuid("delivered_by_team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "restrict" }),
    planId: uuid("plan_id"),
    goalId: uuid("goal_id").references(() => goal.goalId, { onDelete: "set null" }),
    status: sessionStatusEnum("status").notNull().default("scheduled"),
    completionStatus: sessionCompletionStatusEnum("completion_status"),
    briefNote: text("brief_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("session_case_id_idx").on(table.caseId),
    index("session_learner_id_idx").on(table.learnerId),
    index("session_status_idx").on(table.status),
    index("session_goal_id_idx").on(table.goalId),
    index("session_delivered_by_team_member_id_idx").on(table.deliveredByTeamMemberId),
  ],
);

export const observation = pgTable(
  "observation",
  {
    observationId: uuid("observation_id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.caseId, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learner.learnerId, { onDelete: "restrict" }),
    sessionId: uuid("session_id").references(() => session.sessionId, { onDelete: "set null" }),
    goalId: uuid("goal_id").references(() => goal.goalId, { onDelete: "set null" }),
    observerTeamMemberId: uuid("observer_team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "restrict" }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    observationType: observationTypeEnum("observation_type").notNull(),
    purpose: observationPurposeEnum("purpose").notNull(),
    narrativeText: text("narrative_text"),
    status: observationStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("observation_case_id_idx").on(table.caseId),
    index("observation_learner_id_idx").on(table.learnerId),
    index("observation_session_id_idx").on(table.sessionId),
    index("observation_goal_id_idx").on(table.goalId),
    index("observation_status_idx").on(table.status),
    index("observation_observer_team_member_id_idx").on(table.observerTeamMemberId),
  ],
);

export type Session = typeof session.$inferSelect;
export type Observation = typeof observation.$inferSelect;
