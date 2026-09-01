import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/ai-learning?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let query = client.from('ai_learning_notes').select('*');
    if (date) {
      query = query.eq('date', date as string);
    }
    query = query.order('date', { ascending: false }).limit(30);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch AI learning notes' });
  }
});

// POST /api/v1/ai-learning (upsert - one per day)
router.post('/', async (req, res) => {
  try {
    const { date, content } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const { data, error } = await client
      .from('ai_learning_notes')
      .upsert({ date: targetDate, content }, { onConflict: 'date' })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create AI learning note' });
  }
});

// PUT /api/v1/ai-learning/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const { data, error } = await client
      .from('ai_learning_notes')
      .update({ content })
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update AI learning note' });
  }
});

// DELETE /api/v1/ai-learning/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client
      .from('ai_learning_notes')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete AI learning note' });
  }
});

export default router;
