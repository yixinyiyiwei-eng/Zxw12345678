import { Router } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

const router = Router();
const client = getSupabaseClient();

// GET /api/v1/transactions?date=YYYY-MM-DD&start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { date, start, end } = req.query;
    let query = client.from('transactions').select('*');
    if (date) {
      query = query.eq('date', date as string);
    } else if (start && end) {
      query = query.gte('date', start as string).lte('date', end as string);
    }
    query = query.order('date', { ascending: false }).order('created_at', { ascending: false }).limit(100);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// GET /api/v1/transactions/summary?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/summary', async (req, res) => {
  try {
    const { start, end } = req.query;
    const startDate = (start as string) || new Date().toISOString().split('T')[0];
    const endDate = (end as string) || startDate;
    const { data, error } = await client
      .from('transactions')
      .select('type, amount')
      .gte('date', startDate)
      .lte('date', endDate);
    if (error) throw error;

    let totalIncome = 0;
    let totalExpense = 0;
    for (const tx of (data || [])) {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') totalIncome += amount;
      else totalExpense += amount;
    }
    res.json({ total_income: totalIncome, total_expense: totalExpense, total_count: data?.length || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// GET /api/v1/transactions/export?start=YYYY-MM-DD&end=YYYY-MM-DD - 导出工作支出清单
router.get('/export', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end parameters are required' });
    }
    const { data, error } = await client
      .from('transactions')
      .select('*')
      .eq('category', 'work')
      .eq('type', 'expense')
      .gte('date', start as string)
      .lte('date', end as string)
      .order('date', { ascending: true });
    if (error) throw error;

    // 生成CSV格式数据
    const headers = ['日期', '金额', '分类', '描述', '已开票'];
    const categoryMap: Record<string, string> = {
      accommodation: '住宿费',
      fuel: '油费',
      printing: '打印费',
      transport: '通行费',
    };
    const rows = (data || []).map((tx) => [
      tx.date,
      tx.amount,
      categoryMap[tx.work_category as string] || tx.work_category || '',
      tx.description || '',
      tx.is_invoiced ? '是' : '否',
    ]);
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=work-expenses-${start}-${end}.csv`);
    // 添加BOM以支持Excel打开中文
    res.send('\ufeff' + csvContent);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to export transactions' });
  }
});

// POST /api/v1/transactions
router.post('/', async (req, res) => {
  try {
    const { date, type, amount, category, description, is_invoiced, work_category } = req.body;
    const insertData: Record<string, unknown> = {
      date: date || new Date().toISOString().split('T')[0],
      type,
      amount: amount.toString(),
      category,
      description: description || '',
      is_invoiced: is_invoiced || false,
    };
    if (category === 'work' && type === 'expense' && work_category) {
      insertData.work_category = work_category;
    }
    const { data, error } = await client
      .from('transactions')
      .insert(insertData)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /api/v1/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, type, amount, category, description, is_invoiced, work_category } = req.body;
    const updateData: Record<string, unknown> = {};
    if (date !== undefined) updateData.date = date;
    if (type !== undefined) updateData.type = type;
    if (amount !== undefined) updateData.amount = amount.toString();
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (is_invoiced !== undefined) updateData.is_invoiced = is_invoiced;
    if (work_category !== undefined) updateData.work_category = work_category;

    const { data, error } = await client
      .from('transactions')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /api/v1/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await client.from('transactions').delete().eq('id', parseInt(id));
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
