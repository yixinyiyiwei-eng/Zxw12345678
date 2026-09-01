import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  RefreshControl,
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

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7));

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'work' | 'life'>('life');
  const [workCategory, setWorkCategory] = useState<WorkCategory>('accommodation');
  const [description, setDescription] = useState('');
  const [isInvoiced, setIsInvoiced] = useState(false);

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

  const openAddModal = () => {
    setEditingItem(null);
    setType('expense');
    setAmount('');
    setCategory('life');
    setWorkCategory('accommodation');
    setDescription('');
    setIsInvoiced(false);
    setModalVisible(true);
  };

  const openEditModal = (item: Transaction) => {
    setEditingItem(item);
    setType(item.type);
    setAmount(item.amount);
    setCategory(item.category);
    setWorkCategory(item.work_category || 'accommodation');
    setDescription(item.description);
    setIsInvoiced(item.is_invoiced);
    setModalVisible(true);
  };

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
      if (editingItem) {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions/${editingItem.id}`, {
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
      setModalVisible(false);
      fetchTransactions();
    } catch (error) {
      console.error('Failed to save transaction:', error);
      Alert.alert('错误', '保存失败');
    }
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
      
      // 在Web端下载，在移动端显示内容
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
      setExportModalVisible(false);
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('错误', '导出失败');
    }
  };

  const todayTotal = transactions
    .filter(t => t.date === new Date().toISOString().split('T')[0])
    .reduce((acc, t) => {
      const amt = parseFloat(t.amount);
      return t.type === 'income' ? acc + amt : acc - amt;
    }, 0);

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F5FAF5">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>收支记录</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportButton} onPress={() => setExportModalVisible(true)}>
            <FontAwesome6 name="download" size={14} color="#2D7D46" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <FontAwesome6 name="plus" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Today Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>今日结余</Text>
          <Text style={[styles.summaryValue, { color: todayTotal >= 0 ? '#2D7D46' : '#E53E3E' }]}>
            {todayTotal >= 0 ? '+' : ''}{todayTotal.toFixed(2)}
          </Text>
        </View>

        {/* Transaction List */}
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="receipt" size={48} color="#C6E5C6" />
            <Text style={styles.emptyText}>暂无记录</Text>
            <Text style={styles.emptySubText}>点击右上角 + 添加第一笔记录</Text>
          </View>
        ) : (
          transactions.map((item) => (
            <TouchableOpacity
              key={item.id}
              onLongPress={() => handleDelete(item.id)}
              onPress={() => openEditModal(item)}
              style={styles.transactionCard}
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
                  <View style={styles.transactionMeta}>
                    <Text style={styles.transactionDate}>{item.date}</Text>
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
                </View>
                <Text style={[
                  styles.transactionAmount,
                  { color: item.type === 'income' ? '#2D7D46' : '#E53E3E' }
                ]}>
                  {item.type === 'income' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Export Modal */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.exportModalContent}>
            <Text style={styles.modalTitle}>导出工作支出清单</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>选择月份</Text>
              <TextInput
                style={styles.textInput}
                value={exportMonth}
                onChangeText={setExportMonth}
                placeholder="YYYY-MM"
                placeholderTextColor="#A0AEC0"
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setExportModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleExport}>
                <Text style={styles.saveButtonText}>导出CSV</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.editModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? '编辑记录' : '新增记录'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Type Toggle */}
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

              {/* Amount Input */}
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

              {/* Category */}
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

              {/* Work Category (only for work expense) */}
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

              {/* Invoice Toggle (only for work expense) */}
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

              {/* Description */}
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
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D7D46',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#4A5568',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#A0AEC0',
    marginTop: 8,
  },
  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#718096',
  },
  tagContainer: {
    flexDirection: 'row',
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  exportModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
  },
  modalBody: {
    padding: 20,
    maxHeight: 450,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
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
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2D7D46',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
