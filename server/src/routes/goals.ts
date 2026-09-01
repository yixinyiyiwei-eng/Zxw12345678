import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/goals
router.get('/', async (req, res) => {
  try {
    const { data: goals, error: goalsError } = await client
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });
    if (goalsError) throw goalsError;

    // Get sub-goals for each goal
    const goalsWithSubGoals = await Promise.all(
      (goals || []).map(async (goal) => {
        const { data: subGoals, error: subError } = await client
          .from('sub_goals')
          .select('*')
          .eq('goal_id', goal.id)
          .order('created_at', { ascending: true });
        if (subError) throw subError;
        return { ...goal, sub_goals: subGoals || [] };
      })
    );

    res.json(goalsWithSubGoals);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

// GET /api/v1/goals/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: goal, error: goalError } = await client
      .from('goals')
      .select('*')
      .eq('id', parseInt(id))
      .maybeSingle();
    if (goalError) throw goalError;
    if (!goal) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const { data: subGoals, error: subError } = await client
      .from('sub_goals')
      .select('*')
      .eq('goal_id', goal.id)
      .order('created_at', { ascending: true });
    if (subError) throw subError;

    res.json({ ...goal, sub_goals: subGoals || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch goal' });
  }
});

// POST /api/v1/goals
router.post('/', async (req, res) => {
  try {
    const { title, description } = req.body;
    const { data, error } = await client
      .from('goals')
      .insert({ title, description: description || '' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ ...data, sub_goals: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

// PUT /api/v1/goals/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, progress } = req.body;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (progress !== undefined) updateData.progress = progress;

    const { data, error } = await client
      .from('goals')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// DELETE /api/v1/goals/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client
      .from('goals')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// POST /api/v1/goals/:id/sub-goals
router.post('/:id/sub-goals', async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const { title } = req.body;

    const { data, error } = await client
      .from('sub_goals')
      .insert({ goal_id: goalId, title })
      .select()
      .single();
    if (error) throw error;

    // Recalculate progress
    await recalcProgress(goalId);

    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create sub-goal' });
  }
});

// PUT /api/v1/goals/sub-goals/:id
router.put('/sub-goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, is_completed } = req.body;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (is_completed !== undefined) updateData.is_completed = is_completed;

    const { data, error } = await client
      .from('sub_goals')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;

    // Recalculate parent goal progress
    await recalcProgress(data.goal_id);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update sub-goal' });
  }
});

// DELETE /api/v1/goals/sub-goals/:id
router.delete('/sub-goals/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get goal_id before deleting
    const { data: subGoal } = await client
      .from('sub_goals')
      .select('goal_id')
      .eq('id', parseInt(id))
      .maybeSingle();

    const { error } = await client
      .from('sub_goals')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;

    if (subGoal) {
      await recalcProgress(subGoal.goal_id);
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete sub-goal' });
  }
});

async function recalcProgress(goalId: number): Promise<void> {
  const { data: subGoals } = await client
    .from('sub_goals')
    .select('is_completed')
    .eq('goal_id', goalId);

  const total = subGoals?.length || 0;
  const completed = subGoals?.filter(sg => sg.is_completed).length || 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  await client
    .from('goals')
    .update({ progress })
    .eq('id', goalId);
}

export default router;
