import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/daily-plans?date=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = (date as string) || new Date().toISOString().split('T')[0];

    // Get or create plan for the date
    let { data: planData, error: planError } = await client
      .from('daily_plans')
      .select('*')
      .eq('date', targetDate)
      .maybeSingle();

    if (planError) throw planError;

    if (!planData) {
      const { data: newPlan, error: insertError } = await client
        .from('daily_plans')
        .insert({ date: targetDate })
        .select()
        .single();
      if (insertError) throw insertError;
      planData = newPlan;
    }

    // Get items for this plan
    const { data: items, error: itemsError } = await client
      .from('plan_items')
      .select('*')
      .eq('plan_id', planData.id)
      .order('scheduled_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    res.json({ ...planData, items: items || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch daily plan' });
  }
});

// GET /api/v1/daily-plans/pending - Get pending items across all future dates
router.get('/pending', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: plans, error: plansError } = await client
      .from('daily_plans')
      .select('id, date')
      .gte('date', today);
    if (plansError) throw plansError;

    if (!plans || plans.length === 0) {
      res.json([]);
      return;
    }

    const planIds = plans.map(p => p.id);
    const { data: items, error: itemsError } = await client
      .from('plan_items')
      .select('*')
      .in('plan_id', planIds)
      .neq('status', 'completed')
      .order('scheduled_time', { ascending: true, nullsFirst: false });
    if (itemsError) throw itemsError;

    // Map plan dates to items
    const planDateMap = new Map(plans.map(p => [p.id, p.date]));
    const result = (items || []).map(item => ({
      ...item,
      plan_date: planDateMap.get(item.plan_id),
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending items' });
  }
});

// POST /api/v1/daily-plans/items
router.post('/items', async (req, res) => {
  try {
    const { date, title, scheduled_time } = req.body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get or create plan
    let { data: planData, error: planError } = await client
      .from('daily_plans')
      .select('*')
      .eq('date', targetDate)
      .maybeSingle();
    if (planError) throw planError;

    if (!planData) {
      const { data: newPlan, error: insertError } = await client
        .from('daily_plans')
        .insert({ date: targetDate })
        .select()
        .single();
      if (insertError) throw insertError;
      planData = newPlan;
    }

    const { data, error } = await client
      .from('plan_items')
      .insert({
        plan_id: planData.id,
        title,
        scheduled_time: scheduled_time || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create plan item' });
  }
});

// PUT /api/v1/daily-plans/items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, scheduled_time, status, postpone_until } = req.body;
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (scheduled_time !== undefined) updateData.scheduled_time = scheduled_time;
    if (status !== undefined) updateData.status = status;
    if (postpone_until !== undefined) updateData.postpone_until = postpone_until;

    const { data, error } = await client
      .from('plan_items')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update plan item' });
  }
});

// DELETE /api/v1/daily-plans/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client
      .from('plan_items')
      .delete()
      .eq('id', parseInt(id));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete plan item' });
  }
});

export default router;
