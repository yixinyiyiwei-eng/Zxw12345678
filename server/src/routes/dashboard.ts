import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/dashboard - Overview data for home page
router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Today's transactions summary
    const { data: txData, error: txError } = await client
      .from('transactions')
      .select('type, amount')
      .eq('date', today);
    if (txError) throw txError;

    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of (txData || [])) {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') totalIncome += amount;
      else totalExpense += amount;
    }

    // Today's plan items
    let planItems: any[] = [];
    const { data: planData, error: planError } = await client
      .from('daily_plans')
      .select('id')
      .eq('date', today)
      .maybeSingle();
    if (planError) throw planError;

    if (planData) {
      const { data: items, error: itemsError } = await client
        .from('plan_items')
        .select('*')
        .eq('plan_id', planData.id)
        .neq('status', 'completed')
        .order('scheduled_time', { ascending: true, nullsFirst: false });
      if (itemsError) throw itemsError;
      planItems = items || [];
    }

    // Goals overview
    const { data: goals, error: goalsError } = await client
      .from('goals')
      .select('id, title, progress')
      .order('created_at', { ascending: false })
      .limit(5);
    if (goalsError) throw goalsError;

    // Today's review exists?
    const { data: reviewData, error: reviewError } = await client
      .from('daily_reviews')
      .select('id')
      .eq('date', today)
      .maybeSingle();
    if (reviewError) throw reviewError;

    // Today's notes count
    const { count: englishCount, error: englishError } = await client
      .from('english_notes')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);
    if (englishError) throw englishError;

    const { count: readingCount, error: readingError } = await client
      .from('reading_notes')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);
    if (readingError) throw readingError;

    const { count: aiCount, error: aiError } = await client
      .from('ai_learning_notes')
      .select('*', { count: 'exact', head: true })
      .eq('date', today);
    if (aiError) throw aiError;

    res.json({
      date: today,
      finance: { total_income: totalIncome, total_expense: totalExpense },
      plan_items: planItems,
      goals: goals || [],
      has_review: !!reviewData,
      notes_summary: {
        english: englishCount || 0,
        reading: readingCount || 0,
        ai_learning: aiCount || 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

export default router;
