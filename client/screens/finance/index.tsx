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

interface Transaction {
  id: number;
  date: string;
  type: 'income' | 'expense';
  amount: string;
  category: 'work' | 'life';
  description: string;
  is_invoiced: boolean;
}

export default function FinanceScreen() {
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Transaction | null>(null);

  // Form state
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<'work' | 'life'>('life');
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
    setDescription('');
    setIsInvoiced(false);
    setModalVisible(true);
  };

  const openEditModal = (item: Transaction) => {
    setEditingItem(item);
    setType(item.type);
    setAmount(item.amount);
    setCategory(item.category);
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

    const payload = {
      type,
      amount: parseFloat(amount),
      category,
      description: description.trim(),
      is_invoiced: type === 'expense' && category === 'work' ? isInvoiced : false,
    };

    try {
      if (editingItem) {
        // Update
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/transactions/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create
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

  const todayTotal = transactions
    .filter(t => t.date === new Date().toISOString().split('T')[0])
    .reduce((acc, t) => {
      const amt = parseFloat(t.amount);
      return t.type === 'income' ? acc + amt : acc - amt;
    }, 0);

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>收支记录</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <FontAwesome6 name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Today Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.shadowDark}>
            <View style={styles.shadowLight}>
              <Text style={styles.summaryLabel}>今日结余</Text>
              <Text style={[styles.summaryValue, { color: todayTotal >= 0 ? '#00B894' : '#FF6B6B' }]}>
                {todayTotal >= 0 ? '+' : ''}{todayTotal.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Transaction List */}
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="receipt" size={48} color="#B2BEC3" />
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
              <View style={styles.shadowDark}>
                <View style={styles.shadowLight}>
                  <View style={styles.transactionRow}>
                    <View style={[
                      styles.typeIcon,
                      { backgroundColor: item.type === 'income' ? 'rgba(0,184,148,0.12)' : 'rgba(255,107,107,0.12)' }
                    ]}>
                      <FontAwesome6
                        name={item.type === 'income' ? 'arrow-down' : 'arrow-up'}
                        size={16}
                        color={item.type === 'income' ? '#00B894' : '#FF6B6B'}
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
                          {item.is_invoiced && (
                            <Text style={[styles.tag, styles.invoiceTag]}>已开票</Text>
                          )}
                        </View>
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: item.type === 'income' ? '#00B894' : '#FF6B6B' }
                    ]}>
                      {item.type === 'income' ? '+' : '-'}{parseFloat(item.amount).toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? '编辑记录' : '新增记录'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#636E72" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Type Toggle */}
              <View style={styles.typeToggle}>
                <TouchableOpacity
                  style={[styles.typeButton, type === 'expense' && styles.typeButtonActive]}
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
                  <Text style={[styles.typeButtonText, type === 'income' && styles.incomeButtonTextActive]}>
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
                    placeholderTextColor="#B2BEC3"
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
                    <FontAwesome6 name="house" size={14} color={category === 'life' ? '#6C63FF' : '#636E72'} />
                    <Text style={[styles.categoryButtonText, category === 'life' && styles.categoryButtonTextActive]}>
                      生活
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.categoryButton, category === 'work' && styles.categoryButtonActive]}
                    onPress={() => setCategory('work')}
                  >
                    <FontAwesome6 name="briefcase" size={14} color={category === 'work' ? '#6C63FF' : '#636E72'} />
                    <Text style={[styles.categoryButtonText, category === 'work' && styles.categoryButtonTextActive]}>
                      工作
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Invoice Toggle (only for work expense) */}
              {type === 'expense' && category === 'work' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>发票</Text>
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
                  placeholderTextColor="#B2BEC3"
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
    backgroundColor: '#F0F0F3',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3436',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  summaryCard: {
    marginBottom: 16,
  },
  shadowDark: {
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    borderRadius: 24,
  },
  shadowLight: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    backgroundColor: '#F0F0F3',
    borderRadius: 24,
    padding: 20,
    elevation: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 13,
    color: '#B2BEC3',
    marginTop: 8,
  },
  transactionCard: {
    marginBottom: 12,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    color: '#2D3436',
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#636E72',
  },
  tagContainer: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  tag: {
    fontSize: 10,
    color: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
  },
  workTag: {
    color: '#F0932B',
    backgroundColor: 'rgba(240,147,43,0.1)',
  },
  invoiceTag: {
    color: '#00B894',
    backgroundColor: 'rgba(0,184,148,0.1)',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F0F0F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3436',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#E8E8EB',
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
  typeButtonActive: {
    backgroundColor: '#FF6B6B',
  },
  incomeButtonActive: {
    backgroundColor: '#00B894',
  },
  typeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636E72',
  },
  typeButtonTextActive: {
    color: '#FFF',
  },
  incomeButtonTextActive: {
    color: '#FFF',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E8EB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#636E72',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3436',
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
    backgroundColor: '#E8E8EB',
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(108,99,255,0.15)',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#636E72',
  },
  categoryButtonTextActive: {
    color: '#6C63FF',
    fontWeight: '600',
  },
  invoiceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#B2BEC3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  invoiceText: {
    fontSize: 14,
    color: '#2D3436',
  },
  textInput: {
    backgroundColor: '#E8E8EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2D3436',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#E8E8EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636E72',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});
