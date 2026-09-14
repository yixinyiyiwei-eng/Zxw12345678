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
import { localStorage, STORAGE_KEYS } from '@/utils/localStorage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import CalendarModal from '@/components/CalendarModal';
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
  const [exportType, setExportType] = useState<'work' | 'life' | 'all'>('work');
  const scrollRef = useRef<ScrollView>(null);

  // 编辑状态
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'work' | 'life'>('life');
  const [workCategory, setWorkCategory] = useState<WorkCategory>('accommodation');
  const [description, setDescription] = useState('');
  const [isInvoiced, setIsInvoiced] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const recentDates = useMemo(() => getRecentDates(), []);

  const fetchTransactions = useCallback(async () => {
    try {
      const data = await localStorage.getAll<Transaction>(STORAGE_KEYS.TRANSACTIONS);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      setExportMonth(new Date().toISOString().slice(0, 7));
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
        await localStorage.update(STORAGE_KEYS.TRANSACTIONS, editingId.toString(), payload);
      } else {
        await localStorage.add(STORAGE_KEYS.TRANSACTIONS, payload as any);
      }
      // 清空表单
      setAmount('');
      setDescription('');
      setEditingId(null);
      await fetchTransactions();
      // 滚动到列表顶部
      setTimeout(() => {
        try {
          scrollRef.current?.scrollTo({ x: 0, y: 0, animated: true });
        } catch (e) {
          // Web 平台可能不支持 scrollTo，忽略错误
        }
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
            await localStorage.delete(STORAGE_KEYS.TRANSACTIONS, id.toString());
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
      const allTransactions = await localStorage.getAll<Transaction>(STORAGE_KEYS.TRANSACTIONS);
      const filteredTransactions = allTransactions.filter((t: any) => {
        if (t.date < startDate || t.date > endDate) return false;
        if (exportType === 'work' && t.category !== 'work') return false;
        if (exportType === 'life' && t.category !== 'life') return false;
        return true;
      });

      if (filteredTransactions.length === 0) {
        Alert.alert('提示', '该月份没有符合条件的记录');
        return;
      }

      // 生成 CSV 内容
      const typeName = exportType === 'work' ? '工作支出' : exportType === 'life' ? '生活支出' : '全部收支';
      const csvHeader = '日期,类型,类别,工作分类,描述,金额,是否开票\n';
      const csvRows = filteredTransactions.map((t: any) => {
        const subCat = t.category === 'work' && t.work_category
          ? (WORK_CATEGORY_LABELS[t.work_category as WorkCategory] || '')
          : '';
        return `${t.date},${t.type === 'expense' ? '支出' : '收入'},${t.category === 'work' ? '工作' : '生活'},${subCat},${t.description || ''},${t.amount},${t.is_invoiced ? '是' : '否'}`;
      }).join('\n');
      const csvContent = '\uFEFF' + csvHeader + csvRows; // BOM for Excel encoding
      const filename = `expenses-${exportType}-${exportMonth}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
        Alert.alert('导出成功', `已导出 ${filteredTransactions.length} 条${typeName}记录`);
      } else {
        // 使用 expo-file-system 写入文件
        const fileUri = (FileSystem as any).documentDirectory + filename;
        await (FileSystem as any).writeAsStringAsync(fileUri, csvContent, {
          encoding: (FileSystem as any).EncodingType.UTF8,
        });
        // 使用 expo-sharing 分享/保存文件
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: `导出${typeName}清单`,
            UTI: 'public.comma-separated-values-text',
          });
          Alert.alert('导出成功', `已导出 ${filteredTransactions.length} 条${typeName}记录`);
        } else {
          // 共享不可用时，将 CSV 内容复制到剪贴板作为备选
          await Clipboard.setStringAsync(csvContent);
          Alert.alert(
            '导出成功',
            `已导出 ${filteredTransactions.length} 条${typeName}记录\n\n由于系统限制无法直接分享文件，CSV 内容已复制到剪贴板，您可以粘贴到 Excel 或记事本中保存。`,
            [
              { text: '好的' },
              { text: '再次复制', onPress: () => Clipboard.setStringAsync(csvContent) },
            ]
          );
        }
      }
      setShowExport(false);
    } catch (error) {
      console.error('Export failed:', error);
      // 出错时也尝试复制 CSV 内容到剪贴板
      try {
        const allTransactions = await localStorage.getAll<Transaction>(STORAGE_KEYS.TRANSACTIONS);
        const filtered = allTransactions.filter((t: any) => {
          if (t.date < startDate || t.date > endDate) return false;
          if (exportType === 'work' && t.category !== 'work') return false;
          if (exportType === 'life' && t.category !== 'life') return false;
          return true;
        });
        if (filtered.length > 0) {
          const csvBody = filtered.map((t: any) => {
            const subCat = t.category === 'work' && t.work_category
              ? (WORK_CATEGORY_LABELS[t.work_category as WorkCategory] || '')
              : '';
            return `${t.date},${t.type === 'expense' ? '支出' : '收入'},${t.category === 'work' ? '工作' : '生活'},${subCat},${t.description || ''},${t.amount},${t.is_invoiced ? '是' : '否'}`;
          }).join('\n');
          await Clipboard.setStringAsync('\uFEFF日期,类型,类别,工作分类,描述,金额,是否开票\n' + csvBody);
          Alert.alert('导出完成', `数据已复制到剪贴板，您可以粘贴到 Excel 中保存`);
        } else {
          Alert.alert('错误', `导出失败: ${error}`);
        }
      } catch {
        Alert.alert('错误', `导出失败: ${error}`);
      }
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
        {/* 日期选择器（圆形日期行 + 日历按钮） */}
        <View style={styles.dateSelector}>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateContainer}>
              {recentDates.map((date) => {
                const isSelected = date === selectedDate;
                const hasRecord = datesWithRecords.has(date);
                return (
                  <TouchableOpacity
                    key={date}
                    style={[styles.dateItem, isSelected && styles.dateItemActive]}
                    onPress={() => {
                      setSelectedDate(date);
                      resetForm();
                    }}
                  >
                    <Text style={[styles.dateItemText, isSelected && styles.dateItemTextActive]}>
                      {new Date(date).getDate()}
                    </Text>
                    {hasRecord && <View style={[styles.dateDot, isSelected && styles.dateDotActive]} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.dateDisplay}>{formatDate(selectedDate)}</Text>
            <TouchableOpacity style={styles.calendarBtn} onPress={() => setShowCalendar(true)}>
              <FontAwesome6 name="calendar-days" size={16} color="#2D7D46" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 当日结余 */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>{formatDate(selectedDate)}结余</Text>
          <Text style={[styles.summaryValue, { color: dayTotal >= 0 ? '#2D7D46' : '#E53E3E' }]}>
            {dayTotal >= 0 ? '+' : ''}{dayTotal.toFixed(2)}
          </Text>
        </View>

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

        {/* 当日记录列表 */}
        {selectedDateTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>当日记录 ({selectedDateTransactions.length})</Text>
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

        {/* 导出选项 */}
        {showExport && (
          <View style={styles.exportCard}>
            <Text style={styles.exportLabel}>导出费用清单</Text>
            <View style={styles.exportTypeRow}>
              <TouchableOpacity
                style={[styles.exportTypeBtn, exportType === 'work' && styles.exportTypeActive]}
                onPress={() => setExportType('work')}
              >
                <Text style={[styles.exportTypeText, exportType === 'work' && styles.exportTypeTextActive]}>工作</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportTypeBtn, exportType === 'life' && styles.exportTypeActive]}
                onPress={() => setExportType('life')}
              >
                <Text style={[styles.exportTypeText, exportType === 'life' && styles.exportTypeTextActive]}>生活</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportTypeBtn, exportType === 'all' && styles.exportTypeActive]}
                onPress={() => setExportType('all')}
              >
                <Text style={[styles.exportTypeText, exportType === 'all' && styles.exportTypeTextActive]}>全部</Text>
              </TouchableOpacity>
            </View>
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

        <View style={{ height: 40 }} />
      </ScrollView>

      <CalendarModal
        visible={showCalendar}
        selectedDate={selectedDate}
        onSelect={(date) => {
          setSelectedDate(date);
          resetForm();
        }}
        onClose={() => setShowCalendar(false)}
      />
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
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  dateContainer: {
    gap: 8,
    marginBottom: 8,
  },
  dateItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dateItemActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  dateItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  dateItemTextActive: {
    color: '#FFFFFF',
  },
  dateDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2D7D46',
  },
  dateDotActive: {
    backgroundColor: '#FFFFFF',
  },
  dateDisplay: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
  },
  calendarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
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
  exportTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  exportTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  exportTypeActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  exportTypeText: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '500',
  },
  exportTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
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
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  transactionDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A202C',
  },
  tagContainer: {
    flexDirection: 'row',
    marginTop: 3,
    gap: 4,
  },
  tag: {
    fontSize: 9,
    color: '#718096',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workTag: {
    color: '#2D7D46',
    backgroundColor: '#E8F5E9',
  },
  workCategoryTag: {
    fontSize: 9,
    color: '#2B6CB0',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invoiceTag: {
    fontSize: 9,
    color: '#2D7D46',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionAmount: {
    fontSize: 14,
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
