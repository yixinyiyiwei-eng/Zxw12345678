import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/reading-notes?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    let query = client.from('reading_notes').select('*');
    if (date) {
      query = query.eq('date', date as string);
    }
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).limit(50);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reading notes' });
  }
});

// POST /api/v1/reading-notes
router.post('/', async (req, res) => {
  try {
    const { date, title, source, content } = req.body;
    const { data, error } = await client
      .from('reading_notes')
      .insert({
        date: date || new Date().toISOString().split('T')[0],
        title: title || '',
        source: source || '',
        content,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create reading note' });
  }
});

// PUT /api/v1/reading-notes/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, title, source, content } = req.body;
    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = date;
    if (title !== undefined) updateData.title = title;
    if (source !== undefined) updateData.source = source;
    if (content !== undefined) updateData.content = content;

    const { data, error } = await client
      .from('reading_notes')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update reading note' });
  }
});

// DELETE /api/v1/reading-notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client
      .from('reading_notes')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete reading note' });
  }
});

export default router;
