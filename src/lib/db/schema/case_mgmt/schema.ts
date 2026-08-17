// Later: Learner, Case, TeamMember, CaseMembership, CurrentPerformance.
//
// Phase 1 scope: only Learner, TeamMember, Case, CaseMembership are defined.
// Target: Supabase PostgreSQL 16+. RLS is REQUIRED on every table below and is
// applied through Supabase migrations (not by Drizzle). No table here is
// reachable without an explicit policy + GRANT.
// CurrentPerformance and all downstream entities (Need, Goal, Plan, ...) are
// intentionally NOT defined yet.

import { sql } from "drizzle-orm";
import { date, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const caseStatusEnum = pgEnum("case_status", ["active", "review_due", "closed"]);

export const casePriorityLevelEnum = pgEnum("case_priority_level", ["high", "medium", "low"]);

export const caseMembershipRoleEnum = pgEnum("case_membership_role", [
  "case_manager",
  "special_educator",
  "therapist",
  "supervisor",
  "observer",
]);

export const learner = pgTable(
  "learner",
  {
    learnerId: uuid("learner_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    fullName: text("full_name").notNull(),
    fullNameEn: text("full_name_en"),
    dateOfBirth: date("date_of_birth"),
    externalReference: text("external_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learner_organization_id_idx").on(table.organizationId)],
);

export const teamMember = pgTable(
  "team_member",
  {
    teamMemberId: uuid("team_member_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    // References auth.users(id) in Supabase; kept as a plain uuid at the Drizzle level.
    userId: uuid("user_id"),
    fullName: text("full_name").notNull(),
    fullNameEn: text("full_name_en"),
    jobTitleAr: text("job_title_ar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("team_member_organization_id_idx").on(table.organizationId)],
);

// Case is the operational hub of HIMAM (product name: "مساحة عمل الحالة").
export const caseRecord = pgTable(
  "case",
  {
    caseId: uuid("case_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learner.learnerId, { onDelete: "restrict" }),
    caseNumber: text("case_number").notNull(),
    titleAr: text("title_ar").notNull(),
    status: caseStatusEnum("status").notNull().default("active"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    // Closure is always a human decision (Approval Gate). Never set automatically.
    closedByTeamMemberId: uuid("closed_by_team_member_id").references(() => teamMember.teamMemberId, {
      onDelete: "set null",
    }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    summaryAr: text("summary_ar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("case_org_case_number_key").on(table.organizationId, table.caseNumber),
    index("case_learner_id_idx").on(table.learnerId),
    index("case_status_idx").on(table.status),
  ],
);

export const caseMembership = pgTable(
  "case_membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.caseId, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "cascade" }),
    role: caseMembershipRoleEnum("role").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("case_membership_case_member_role_key").on(
      table.caseId,
      table.teamMemberId,
      table.role,
    ),
    index("case_membership_team_member_id_idx").on(table.teamMemberId),
  ],
);

export type Learner = typeof learner.$inferSelect;
export type TeamMember = typeof teamMember.$inferSelect;
export type Case = typeof caseRecord.$inferSelect;
export type CaseMembership = typeof caseMembership.$inferSelect;
export type CaseStatus = Case["status"];
export type CasePriorityLevel = (typeof casePriorityLevelEnum.enumValues)[number];
