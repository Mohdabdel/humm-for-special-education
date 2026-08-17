// Later: Need, Goal, GoalNeedLink, GoalVersion, MeasurementPlan, MeasurementDefinition, Plan.
//
// Phase 1 (Goal & Plan Studio, Step 1) defines only: Need, Goal, GoalNeedLink,
// MeasurementPlan. RLS is REQUIRED on every table below and is applied through
// SQL migrations (not by Drizzle).

import {
  boolean,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { caseRecord, learner, teamMember } from "../case_mgmt/schema";

export const needTypeEnum = pgEnum("need_type", [
  "skill_gap",
  "access_barrier",
  "environmental_barrier",
  "communication",
  "behavior",
  "functional",
  "vocational",
  "transition",
  "safety",
  "assessment_gap",
]);

export const needPriorityLevelEnum = pgEnum("need_priority_level", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const needPriorityBasisEnum = pgEnum("need_priority_basis", [
  "assessment",
  "learner_priority",
  "family_priority",
  "team_decision",
  "transition_requirement",
  "safety",
]);

export const needStatusEnum = pgEnum("need_status", [
  "draft",
  "active",
  "addressed_by_goal",
  "addressed_by_support",
  "monitor",
  "deferred",
  "resolved",
  "archived",
]);

export const needSourceConfidenceEnum = pgEnum("need_source_confidence", [
  "low",
  "medium",
  "high",
]);

export const goalTypeEnum = pgEnum("goal_type", [
  "academic",
  "communication",
  "behavior",
  "functional",
  "adaptive",
  "vocational",
  "transition",
  "therapy",
  "self_determination",
]);

export const goalStatusEnum = pgEnum("goal_status", [
  "draft",
  "in_review",
  "approved",
  "active",
  "paused",
  "generalization_pending",
  "generalized",
  "revised",
  "closed",
  "archived",
]);

export const goalHumanApprovalStatusEnum = pgEnum("goal_human_approval_status", [
  "pending",
  "approved",
  "approved_with_conditions",
  "rejected",
]);

export const goalNeedRelationshipTypeEnum = pgEnum("goal_need_relationship_type", [
  "directly_addresses",
  "partially_addresses",
  "supports",
]);

export const need = pgTable(
  "need",
  {
    needId: uuid("need_id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.caseId, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learner.learnerId, { onDelete: "restrict" }),
    domainId: uuid("domain_id"),
    subdomainId: uuid("subdomain_id"),
    needType: needTypeEnum("need_type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    functionalImpact: text("functional_impact").notNull(),
    priorityLevel: needPriorityLevelEnum("priority_level").notNull(),
    priorityBasis: needPriorityBasisEnum("priority_basis").notNull(),
    status: needStatusEnum("status").notNull().default("draft"),
    identifiedAt: timestamp("identified_at", { withTimezone: true }).notNull().defaultNow(),
    identifiedByTeamMemberId: uuid("identified_by_team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "restrict" }),
    reviewDueDate: date("review_due_date"),
    sourceConfidence: needSourceConfidenceEnum("source_confidence").notNull().default("medium"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("need_case_id_idx").on(table.caseId),
    index("need_learner_id_idx").on(table.learnerId),
    index("need_status_idx").on(table.status),
  ],
);

export const goal = pgTable(
  "goal",
  {
    goalId: uuid("goal_id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.caseId, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learner.learnerId, { onDelete: "restrict" }),
    domainId: uuid("domain_id"),
    goalType: goalTypeEnum("goal_type").notNull(),
    title: text("title").notNull(),
    status: goalStatusEnum("status").notNull().default("draft"),
    ownerTeamMemberId: uuid("owner_team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "restrict" }),
    startDate: date("start_date"),
    targetDate: date("target_date"),
    reviewDate: date("review_date"),
    observableBehavior: text("observable_behavior").notNull(),
    conditions: text("conditions"),
    allowedSupports: text("allowed_supports"),
    baselineSummary: text("baseline_summary").notNull(),
    criterion: text("criterion").notNull(),
    timeframe: text("timeframe").notNull(),
    functionalContext: text("functional_context"),
    humanApprovalStatus: goalHumanApprovalStatusEnum("human_approval_status")
      .notNull()
      .default("pending"),
    approvedByTeamMemberId: uuid("approved_by_team_member_id").references(
      () => teamMember.teamMemberId,
      { onDelete: "set null" },
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    goalVersionId: uuid("goal_version_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("goal_case_id_idx").on(table.caseId),
    index("goal_learner_id_idx").on(table.learnerId),
    index("goal_status_idx").on(table.status),
    index("goal_owner_team_member_id_idx").on(table.ownerTeamMemberId),
  ],
);

export const goalNeedLink = pgTable(
  "goal_need_link",
  {
    goalNeedLinkId: uuid("goal_need_link_id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goal.goalId, { onDelete: "cascade" }),
    needId: uuid("need_id")
      .notNull()
      .references(() => need.needId, { onDelete: "restrict" }),
    relationshipType: goalNeedRelationshipTypeEnum("relationship_type").notNull(),
    primaryLink: boolean("primary_link").notNull().default(false),
    rationale: text("rationale").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("goal_need_link_goal_id_idx").on(table.goalId),
    index("goal_need_link_need_id_idx").on(table.needId),
  ],
);

export const measurementPlan = pgTable(
  "measurement_plan",
  {
    measurementPlanId: uuid("measurement_plan_id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goal.goalId, { onDelete: "cascade" }),
    measurementType: text("measurement_type").notNull(),
    targetCriterion: text("target_criterion").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("measurement_plan_goal_id_idx").on(table.goalId)],
);

export type Need = typeof need.$inferSelect;
export type Goal = typeof goal.$inferSelect;
export type GoalNeedLink = typeof goalNeedLink.$inferSelect;
export type MeasurementPlan = typeof measurementPlan.$inferSelect;
