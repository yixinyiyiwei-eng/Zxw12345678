import express from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = express.Router();
const client = getSupabaseClient();

// GET /api/v1/workout-plans?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const query = client.from('workout_plans').select('*');
    if (date) {
      query.eq('date', date as string);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Failed to fetch workout plans:', error);
    res.status(500).json({ error: 'Failed to fetch workout plans' });
  }
});

// POST /api/v1/workout-plans
router.post('/', async (req, res) => {
  try {
    const { date, exercise_type, duration, intensity, notes } = req.body;
    const { data, error } = await client
      .from('workout_plans')
      .insert([{ date, exercise_type, duration, intensity, notes }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Failed to create workout plan:', error);
    res.status(500).json({ error: 'Failed to create workout plan' });
  }
});

// PUT /api/v1/workout-plans/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { exercise_type, duration, intensity, notes, is_completed } = req.body;
    const { data, error } = await client
      .from('workout_plans')
      .update({ exercise_type, duration, intensity, notes, is_completed })
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Failed to update workout plan:', error);
    res.status(500).json({ error: 'Failed to update workout plan' });
  }
});

// DELETE /api/v1/workout-plans/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client
      .from('workout_plans')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete workout plan:', error);
    res.status(500).json({ error: 'Failed to delete workout plan' });
  }
});

export default router;
