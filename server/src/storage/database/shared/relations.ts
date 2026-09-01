import { relations } from "drizzle-orm/relations";
import { dailyPlans, planItems, goals, subGoals } from "./schema";

export const planItemsRelations = relations(planItems, ({one}) => ({
	dailyPlan: one(dailyPlans, {
		fields: [planItems.planId],
		references: [dailyPlans.id]
	}),
}));

export const dailyPlansRelations = relations(dailyPlans, ({many}) => ({
	planItems: many(planItems),
}));

export const subGoalsRelations = relations(subGoals, ({one}) => ({
	goal: one(goals, {
		fields: [subGoals.goalId],
		references: [goals.id]
	}),
}));

export const goalsRelations = relations(goals, ({many}) => ({
	subGoals: many(subGoals),
}));