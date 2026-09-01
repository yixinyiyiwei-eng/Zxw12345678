import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/money-insights?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let query = client.from('money_insights').select('*');
    if (date) {
      query = query.eq('date', date as string);
    }
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch money insights' });
  }
});

// POST /api/v1/money-insights
router.post('/', async (req, res) => {
  try {
    const { date, observation, thought } = req.body;
    const { data, error } = await client
      .from('money_insights')
      .insert({
        date: date || new Date().toISOString().split('T')[0],
        observation,
        thought,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create money insight' });
  }
});

// PUT /api/v1/money-insights/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, observation, thought } = req.body;
    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = date;
    if (observation !== undefined) updateData.observation = observation;
    if (thought !== undefined) updateData.thought = thought;

    const { data, error } = await client
      .from('money_insights')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update money insight' });
  }
});

// DELETE /api/v1/money-insights/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client
      .from('money_insights')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete money insight' });
  }
});

export default router;
