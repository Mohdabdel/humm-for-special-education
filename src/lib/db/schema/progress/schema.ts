// Later: DataPoint, TrendSnapshot, DecisionRecord.
//
// Phase 1 (Progress & Evidence Tracker, Step 1) defines only:
// MeasurementDefinition (simplified) and DataPoint (full).
// TrendSnapshot and DecisionRecord are intentionally NOT defined yet.
// RLS is REQUIRED on every table below and is applied through SQL migrations
// (not by Drizzle).

import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { caseRecord, learner, teamMember } from "../case_mgmt/schema";
import { goal, measurementPlan } from "../planning/schema";
import { observation, session } from "../execution/schema";

export const measurementValueTypeEnum = pgEnum("measurement_value_type", [
  "count",
  "percentage",
  "duration_seconds",
  "frequency",
  "rating_scale",
  "trials_correct",
  "yes_no",
]);

export const measurementDirectionEnum = pgEnum("measurement_direction", [
  "increase",
  "decrease",
  "maintain",
]);

export const dataPointSourceTypeEnum = pgEnum("data_point_source_type", [
  "direct_observation",
  "session_record",
  "task_performance",
  "family_report",
  "learner_report",
  "assessment",
]);

export const dataPointStatusEnum = pgEnum("data_point_status", [
  "draft",
  "confirmed",
  "superseded",
]);

// Simplified version: only the fields required to interpret a recorded value.
export const measurementDefinition = pgTable(
  "measurement_definition",
  {
    measurementDefinitionId: uuid("measurement_definition_id").primaryKey().defaultRandom(),
    measurementPlanId: uuid("measurement_plan_id")
      .notNull()
      .references(() => measurementPlan.measurementPlanId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    valueType: measurementValueTypeEnum("value_type").notNull(),
    unit: text("unit"),
    scaleMin: numeric("scale_min"),
    scaleMax: numeric("scale_max"),
    direction: measurementDirectionEnum("direction").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("measurement_definition_plan_id_idx").on(table.measurementPlanId)],
);

export const dataPoint = pgTable(
  "data_point",
  {
    dataPointId: uuid("data_point_id").primaryKey().defaultRandom(),
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
    observationId: uuid("observation_id").references(() => observation.observationId, {
      onDelete: "set null",
    }),
    sessionId: uuid("session_id").references(() => session.sessionId, { onDelete: "set null" }),
    recordedByTeamMemberId: uuid("recorded_by_team_member_id")
      .notNull()
      .references(() => teamMember.teamMemberId, { onDelete: "restrict" }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    valueNumeric: numeric("value_numeric"),
    valueBoolean: boolean("value_boolean"),
    trialsTotal: integer("trials_total"),
    trialsCorrect: integer("trials_correct"),
    isBaseline: boolean("is_baseline").notNull().default(false),
    sourceType: dataPointSourceTypeEnum("source_type").notNull(),
    contextNote: text("context_note"),
    status: dataPointStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("data_point_case_id_idx").on(table.caseId),
    index("data_point_goal_id_idx").on(table.goalId),
    index("data_point_measurement_definition_id_idx").on(table.measurementDefinitionId),
    index("data_point_recorded_at_idx").on(table.recordedAt),
  ],
);

export type MeasurementDefinition = typeof measurementDefinition.$inferSelect;
export type DataPoint = typeof dataPoint.$inferSelect;
