import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type WorkCategory = 'accommodation' | 'fuel' | 'printing' | 'transport';

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  amount: string;
  category: 'work' | 'life';
  description: string;
  is_invoiced: boolean;
  work_category: WorkCategory | null;
}

const WORK_CATEGORY_LABELS: Record<WorkCategory, string> = {
  accommodation: '住宿费',
  fuel: '油费',
  printing: '打印费',
  transport: '通行费',
};

const WORK_CATEGORY_ICONS: Record<WorkCategory, keyof typeof FontAwesome6.glyphMap> = {
  accommodation: 'hotel',
  fuel: 'gas-pump',
  printing: 'print',
  transport: 'car',
};

// 获取最近 7 天日期
const getRecentDates = () => {
  const dates = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  
  if (dateStr === today.toISOString().split('T')[0]) return '今天';
  if (dateStr === yesterday.toISOString().split('T')[0]) return '昨天';
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${month}月${day}日 ${weekDays[date.getDay()]}`;
};

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showExport, setShowExport] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // 编辑状态
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'work' | 'life'>('life');
  const [workCategory, setWorkCategory] = useState<WorkCategory>('accommodation');
  const [description, setDescription] = useState('');
  const [isInvoiced, setIsInvoiced] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const recentDates = useMemo(() => getRecentDates(), []);

  const fetchTransactions = useCallback(async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions`);
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [fetchTransactions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  // 获取选中日期的记录
  const selectedDateTransactions = useMemo(() => {
    return transactions.filter(t => t.date === selectedDate);
  }, [transactions, selectedDate]);

  // 计算当日结余
  const dayTotal = useMemo(() => {
    return selectedDateTransactions.reduce((acc, t) => {
      const amt = parseFloat(t.amount);
      return t.type === 'income' ? acc + amt : acc - amt;
    }, 0);
  }, [selectedDateTransactions]);

  // 有记录的日期（用于显示绿点）
  const datesWithRecords = useMemo(() => {
    return new Set(transactions.map(t => t.date));
  }, [transactions]);

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (!description.trim()) {
      Alert.alert('提示', '请输入描述');
      return;
    }

    const payload: Record<string, unknown> = {
      date: selectedDate,
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      is_invoiced: type === 'expense' && category === 'work' ? isInvoiced : false,
    };
    
    if (type === 'expense' && category === 'work') {
      payload.work_category = workCategory;
    }

    try {
      if (editingId) {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      // 清空表单
      setAmount('');
      setDescription('');
      setEditingId(null);
      await fetchTransactions();
      // 滚动到列表顶部
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
      }, 100);
      Alert.alert('成功', '记录已保存');
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  const handleEdit = (item: Transaction) => {
    setEditingId(item.id);
    setType(item.type);
    setAmount(item.amount);
    setCategory(item.category);
    setWorkCategory(item.work_category || 'accommodation');
    setDescription(item.description);
    setIsInvoiced(item.is_invoiced);
  };

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '确定要删除这条记录吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions/${id}`, {
              method: 'DELETE',
            });
            if (editingId === id) {
              setEditingId(null);
              setAmount('');
              setDescription('');
            }
            fetchTransactions();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  const handleExport = async () => {
    const [year, month] = exportMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions/export?start=${startDate}&end=${endDate}`
      );
      if (!response.ok) throw new Error('Export failed');
      const csvContent = await response.text();
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `work-expenses-${exportMonth}.csv`;
        link.click();
        URL.revokeObjectURL(url);
      } else {
        Alert.alert('导出成功', `文件已保存，月份：${exportMonth}`);
      }
      setShowExport(false);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('错误', '导出失败');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setType('expense');
    setAmount('');
    setCategory('life');
    setWorkCategory('accommodation');
    setDescription('');
    setIsInvoiced(false);
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F5FAF5">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>收支记录</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportButton} onPress={() => setShowExport(!showExport)}>
            <FontAwesome6 name="download" size={14} color="#2D7D46" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
        {/* 日期选择器 */}
        <View style={styles.dateSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recentDates.map((date) => (
              <TouchableOpacity
                key={date}
                style={[
                  styles.dateItem,
                  selectedDate === date && styles.dateItemActive,
                ]}
                onPress={() => {
                  setSelectedDate(date);
                  resetForm();
                }}
              >
                <Text style={[
                  styles.dateText,
                  selectedDate === date && styles.dateTextActive,
                ]}>
                  {formatDate(date)}
                </Text>
                {datesWithRecords.has(date) && (
                  <View style={styles.dateDot} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 当日结余 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{formatDate(selectedDate)}结余</Text>
          <Text style={[styles.summaryValue, { color: dayTotal >= 0 ? '#2D7D46' : '#E53E3E' }]}>
            {dayTotal >= 0 ? '+' : ''}{dayTotal.toFixed(2)}
          </Text>
        </View>

        {/* 导出选项 */}
        {showExport && (
          <View style={styles.exportCard}>
            <Text style={styles.exportLabel}>导出工作支出清单</Text>
            <View style={styles.exportRow}>
              <TextInput
                style={styles.exportInput}
                value={exportMonth}
                onChangeText={setExportMonth}
                placeholder="YYYY-MM"
                placeholderTextColor="#A0AEC0"
              />
              <TouchableOpacity style={styles.exportBtn} onPress={handleExport}>
                <Text style={styles.exportBtnText}>导出</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 当日记录列表 */}
        {selectedDateTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>当日记录</Text>
            {selectedDateTransactions.map((item) => (
              <TouchableOpacity
                key={item.id}
                onLongPress={() => handleDelete(item.id)}
                onPress={() => handleEdit(item)}
                style={[
                  styles.transactionCard,
                  editingId === item.id && styles.transactionCardActive,
                ]}
              >
                <View style={styles.transactionRow}>
                  <View style={[
                    styles.typeIcon,
                    { backgroundColor: item.type === 'income' ? '#E8F5E9' : '#FFEBEE' }
                  ]}>
                    <FontAwesome6
                      name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
                      size={14}
                      color={item.type === 'income' ? '#2D7D46' : '#E53E3E'}
                    />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDesc} numberOfLines={1}>{item.description}</Text>
                    <View style={styles.tagContainer}>
                      <Text style={[styles.tag, item.category === 'work' && styles.workTag]}>
                        {item.category === 'work' ? '工作' : '生活'}
                      </Text>
                      {item.category === 'work' && item.work_category && (
                        <Text style={styles.workCategoryTag}>
                          {WORK_CATEGORY_LABELS[item.work_category]}
                        </Text>
                      )}
                      {item.is_invoiced && (
                        <Text style={styles.invoiceTag}>已开票</Text>
                      )}
                    </View>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: item.type === 'income' ? '#2D7D46' : '#E53E3E' }
                  ]}>
                    {item.type === 'income' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 编辑表单 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{editingId ? '编辑记录' : '新增记录'}</Text>
          
          {/* 类型切换 */}
          <View style={styles.typeToggle}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'expense' && styles.expenseButtonActive]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                支出
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeButton, type === 'income' && styles.incomeButtonActive]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.typeButtonText, type === 'income' && styles.typeButtonTextActive]}>
                收入
              </Text>
            </TouchableOpacity>
          </View>

          {/* 金额输入 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>金额</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>¥</Text>
              <TextInput
                style={styles.amountInput}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="#A0AEC0"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* 类别 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>类别</Text>
            <View style={styles.categoryToggle}>
              <TouchableOpacity
                style={[styles.categoryButton, category === 'life' && styles.categoryButtonActive]}
                onPress={() => setCategory('life')}
              >
                <FontAwesome6 name="house" size={14} color={category === 'life' ? '#2D7D46' : '#4A5568'} />
                <Text style={[styles.categoryButtonText, category === 'life' && styles.categoryButtonTextActive]}>
                  生活
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.categoryButton, category === 'work' && styles.categoryButtonActive]}
                onPress={() => setCategory('work')}
              >
                <FontAwesome6 name="briefcase" size={14} color={category === 'work' ? '#2D7D46' : '#4A5568'} />
                <Text style={[styles.categoryButtonText, category === 'work' && styles.categoryButtonTextActive]}>
                  工作
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 工作支出分类 */}
          {type === 'expense' && category === 'work' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>工作支出分类</Text>
              <View style={styles.workCategoryGrid}>
                {(Object.keys(WORK_CATEGORY_LABELS) as WorkCategory[]).map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.workCategoryItem, workCategory === cat && styles.workCategoryItemActive]}
                    onPress={() => setWorkCategory(cat)}
                  >
                    <FontAwesome6
                      name={WORK_CATEGORY_ICONS[cat]}
                      size={18}
                      color={workCategory === cat ? '#2D7D46' : '#4A5568'}
                    />
                    <Text style={[styles.workCategoryText, workCategory === cat && styles.workCategoryTextActive]}>
                      {WORK_CATEGORY_LABELS[cat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* 发票标记 */}
          {type === 'expense' && category === 'work' && (
            <View style={styles.inputGroup}>
              <TouchableOpacity
                style={styles.invoiceToggle}
                onPress={() => setIsInvoiced(!isInvoiced)}
              >
                <View style={[styles.checkbox, isInvoiced && styles.checkboxActive]}>
                  {isInvoiced && <FontAwesome6 name="check" size={12} color="#FFF" />}
                </View>
                <Text style={styles.invoiceText}>已开具发票</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 描述 */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>描述</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="输入描述..."
              placeholderTextColor="#A0AEC0"
              multiline
            />
          </View>

          {/* 保存按钮 */}
          <View style={styles.actionRow}>
            {editingId && (
              <TouchableOpacity style={styles.resetButton} onPress={resetForm}>
                <Text style={styles.resetButtonText}>取消编辑</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <FontAwesome6 name="check" size={16} color="#FFF" />
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#F5FAF5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  dateSelector: {
    marginBottom: 16,
  },
  dateItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateItemActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  dateText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2D7D46',
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#2D7D46',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  exportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 12,
  },
  exportInput: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportBtn: {
    backgroundColor: '#2D7D46',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A202C',
    marginBottom: 12,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  transactionCardActive: {
    borderColor: '#2D7D46',
    backgroundColor: '#F0FFF4',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A202C',
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  tag: {
    fontSize: 10,
    color: '#718096',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workTag: {
    color: '#2D7D46',
    backgroundColor: '#E8F5E9',
  },
  workCategoryTag: {
    fontSize: 10,
    color: '#2B6CB0',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invoiceTag: {
    fontSize: 10,
    color: '#2D7D46',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  expenseButtonActive: {
    backgroundColor: '#E53E3E',
  },
  incomeButtonActive: {
    backgroundColor: '#2D7D46',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A5568',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
    paddingVertical: 12,
  },
  categoryToggle: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2D7D46',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#4A5568',
  },
  categoryButtonTextActive: {
    color: '#2D7D46',
    fontWeight: '600',
  },
  workCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  workCategoryItemActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2D7D46',
  },
  workCategoryText: {
    fontSize: 13,
    color: '#4A5568',
  },
  workCategoryTextActive: {
    color: '#2D7D46',
    fontWeight: '600',
  },
  invoiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  invoiceText: {
    fontSize: 14,
    color: '#4A5568',
  },
  textInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  saveButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2D7D46',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
