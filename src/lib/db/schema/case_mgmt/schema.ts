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

export const learners = pgTable(
  "learners",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    fullNameAr: text("full_name_ar").notNull(),
    fullNameEn: text("full_name_en"),
    dateOfBirth: date("date_of_birth"),
    externalReference: text("external_reference"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learners_organization_id_idx").on(table.organizationId)],
);

export const teamMembers = pgTable(
  "team_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    // References auth.users(id) in Supabase; kept as a plain uuid at the Drizzle level.
    userId: uuid("user_id"),
    fullNameAr: text("full_name_ar").notNull(),
    fullNameEn: text("full_name_en"),
    jobTitleAr: text("job_title_ar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("team_members_organization_id_idx").on(table.organizationId)],
);

// Case is the operational hub of HIMAM (product name: "مساحة عمل الحالة").
export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id, { onDelete: "restrict" }),
    caseNumber: text("case_number").notNull(),
    titleAr: text("title_ar").notNull(),
    status: caseStatusEnum("status").notNull().default("active"),
    openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
    reviewDueAt: timestamp("review_due_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    // Closure is always a human decision (Approval Gate). Never set automatically.
    closedByTeamMemberId: uuid("closed_by_team_member_id").references(() => teamMembers.id, {
      onDelete: "set null",
    }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    summaryAr: text("summary_ar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cases_org_case_number_key").on(table.organizationId, table.caseNumber),
    index("cases_learner_id_idx").on(table.learnerId),
    index("cases_status_idx").on(table.status),
  ],
);

export const caseMemberships = pgTable(
  "case_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    teamMemberId: uuid("team_member_id")
      .notNull()
      .references(() => teamMembers.id, { onDelete: "cascade" }),
    role: caseMembershipRoleEnum("role").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("case_memberships_case_member_role_key").on(
      table.caseId,
      table.teamMemberId,
      table.role,
    ),
    index("case_memberships_team_member_id_idx").on(table.teamMemberId),
  ],
);

export type Learner = typeof learners.$inferSelect;
export type TeamMember = typeof teamMembers.$inferSelect;
export type CaseRecord = typeof cases.$inferSelect;
export type CaseMembership = typeof caseMemberships.$inferSelect;
export type CaseStatus = CaseRecord["status"];
export type CasePriorityLevel = (typeof casePriorityLevelEnum.enumValues)[number];
