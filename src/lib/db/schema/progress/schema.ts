// Later: MeasurementDefinition, DataPoint, TrendSnapshot.
//
// Phase 1 (Progress & Evidence Tracker, Step 1) defines only:
// MeasurementDefinition (simplified per D-34) and DataPoint.
// TrendSnapshot, decision rules, versioning, Quality Gates, and evidence detail
// fields are intentionally NOT defined yet.
// RLS is REQUIRED on every table below and is applied through SQL migrations
// (not by Drizzle).

import { boolean, index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { caseRecord, learner, teamMember } from "../case_mgmt/schema";
import { observation } from "../execution/schema";
import { goal, measurementPlan } from "../planning/schema";

export const measurementDefinitionTypeEnum = pgEnum("measurement_definition_type", [
  "accuracy",
  "frequency",
  "duration",
  "latency",
  "task_analysis",
  "prompt_level",
  "productivity",
  "quality",
  "self_correction",
  "generalization",
]);

export const measurementDefinitionStatusEnum = pgEnum("measurement_definition_status", [
  "draft",
  "active",
]);

export const dataPointUnitEnum = pgEnum("data_point_unit", [
  "percent",
  "count",
  "duration_seconds",
  "duration_minutes",
  "latency_seconds",
  "rate",
  "rubric_score",
  "prompt_level",
  "productivity_rate",
]);

export const dataPointOutcomeCodeEnum = pgEnum("data_point_outcome_code", [
  "success",
  "partial",
  "unsuccessful",
  "not_applicable",
]);

export const dataPointSourceModeEnum = pgEnum("data_point_source_mode", [
  "manual",
  "imported",
  "device_assisted",
  "AI_suggested",
]);

export const dataPointValidationStatusEnum = pgEnum("data_point_validation_status", [
  "draft",
  "validated",
  "corrected",
  "rejected",
]);

export const measurementDefinition = pgTable(
  "measurement_definition",
  {
    measurementDefinitionId: uuid("measurement_definition_id").primaryKey().defaultRandom(),
    measurementPlanId: uuid("measurement_plan_id")
      .notNull()
      .references(() => measurementPlan.measurementPlanId, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goal.goalId, { onDelete: "cascade" }),
    code: text("code").notNull(),
    labelAr: text("label_ar").notNull(),
    measurementType: measurementDefinitionTypeEnum("measurement_type").notNull(),
    unit: text("unit").notNull(),
    numeratorLabel: text("numerator_label"),
    denominatorLabel: text("denominator_label"),
    targetCriterion: text("target_criterion").notNull(),
    collectionCadence: text("collection_cadence").notNull(),
    supportTrackingRequired: boolean("support_tracking_required").notNull().default(false),
    status: measurementDefinitionStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("measurement_definition_plan_id_idx").on(table.measurementPlanId),
    index("measurement_definition_goal_id_idx").on(table.goalId),
    index("measurement_definition_status_idx").on(table.status),
  ],
);

export const dataPoint = pgTable(
  "data_point",
  {
    dataPointId: uuid("data_point_id").primaryKey().defaultRandom(),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => observation.observationId, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => caseRecord.caseId, { onDelete: "cascade" }),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learner.learnerId, { onDelete: "restrict" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goal.goalId, { onDelete: "cascade" }),
    measurementDefinitionId: uuid("measurement_definition_id")
      .notNull()
      .references(() => measurementDefinition.measurementDefinitionId, { onDelete: "restrict" }),
    valueNumeric: numeric("value_numeric"),
    numerator: numeric("numerator"),
    denominator: numeric("denominator"),
    unit: dataPointUnitEnum("unit").notNull(),
    outcomeCode: dataPointOutcomeCodeEnum("outcome_code").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    sourceMode: dataPointSourceModeEnum("source_mode").notNull().default("manual"),
    validationStatus: dataPointValidationStatusEnum("validation_status").notNull().default("draft"),
    recordedByTeamMemberId: uuid("recorded_by_team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("data_point_observation_id_idx").on(table.observationId),
    index("data_point_case_id_idx").on(table.caseId),
    index("data_point_goal_id_idx").on(table.goalId),
    index("data_point_measurement_definition_id_idx").on(table.measurementDefinitionId),
    index("data_point_recorded_at_idx").on(table.recordedAt),
  ],
);

export type MeasurementDefinition = typeof measurementDefinition.$inferSelect;
export type DataPoint = typeof dataPoint.$inferSelect;
