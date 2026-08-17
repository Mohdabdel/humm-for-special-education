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

export const caseTypeEnum = pgEnum("case_type", [
  "IEP",
  "transition",
  "behavior",
  "therapy",
  "vocational",
  "combined",
]);

export const casePrimaryStageEnum = pgEnum("case_primary_stage", [
  "assessment",
  "planning",
  "implementation",
  "review",
  "transition",
]);

export const caseRiskLevelEnum = pgEnum("case_risk_level", [
  "none",
  "watch",
  "needs_attention",
  "urgent",
]);

export const caseConfidentialityLevelEnum = pgEnum("case_confidentiality_level", [
  "standard",
  "restricted",
  "highly_restricted",
]);

export const caseTransitionStageEnum = pgEnum("case_transition_stage", [
  "not_applicable",
  "pre_transition",
  "exploration",
  "planning",
  "vocational_training",
  "home_based_project",
  "active_implementation",
  "employment_or_further_education",
  "follow_up",
]);

export const learner = pgTable(
  "learner",
  {
    learnerId: uuid("learner_id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    fullName: text("full_name").notNull(),
    dateOfBirth: date("date_of_birth"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("learner_organization_id_idx").on(table.organizationId)],
);

export const teamMember = pgTable(
  "team_member",
  {
    teamMemberId: uuid("team_member_id").primaryKey().defaultRandom(),
    userId: uuid("user_id"),
    organizationId: uuid("organization_id").notNull(),
    fullName: text("full_name").notNull(),
    role: text("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
    caseType: caseTypeEnum("case_type").notNull().default("IEP"),
    programId: uuid("program_id"),
    ownerTeamMemberId: uuid("owner_team_member_id").references(() => teamMember.teamMemberId, {
      onDelete: "set null",
    }),
    status: caseStatusEnum("status").notNull().default("active"),
    primaryStage: casePrimaryStageEnum("primary_stage").notNull().default("assessment"),
    riskLevel: caseRiskLevelEnum("risk_level").notNull().default("none"),
    confidentialityLevel: caseConfidentialityLevelEnum("confidentiality_level")
      .notNull()
      .default("standard"),
    transitionStage: caseTransitionStageEnum("transition_stage"),
    intakeDate: date("intake_date").notNull(),
    startDate: date("start_date").notNull(),
    targetReviewDate: date("target_review_date"),
    closeDate: date("close_date"),
    currentPrioritySummary: text("current_priority_summary"),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
  },
  (table) => [
    uniqueIndex("case_org_case_number_key").on(table.organizationId, table.caseNumber),
    index("case_learner_id_idx").on(table.learnerId),
    index("case_status_idx").on(table.status),
    index("case_owner_team_member_id_idx").on(table.ownerTeamMemberId),
    index("case_program_id_idx").on(table.programId),
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
