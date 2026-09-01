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

interface PlanItem {
  id: number;
  plan_id: number;
  title: string;
  scheduled_time: string | null;
  status: 'pending' | 'completed' | 'postponed';
  postpone_until: string | null;
}

interface DailyPlan {
  id: number;
  date: string;
  items: PlanItem[];
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const fetchPlan = useCallback(async () => {
    try {
      const response = await fetch(
        `${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/daily-plans?date=${selectedDate}`
      );
      const data = await response.json();
      setPlan(data);
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchPlan();
    }, [fetchPlan])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPlan();
    setRefreshing(false);
  }, [fetchPlan]);

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setScheduledTime('');
    setModalVisible(true);
  };

  const openEditModal = (item: PlanItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setScheduledTime(item.scheduled_time ? item.scheduled_time.slice(0, 5) : '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入事项标题');
      return;
    }

    try {
      if (editingItem) {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/daily-plans/items/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            scheduled_time: scheduledTime || null,
          }),
        });
      } else {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/daily-plans/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: selectedDate,
            title: title.trim(),
            scheduled_time: scheduledTime || null,
          }),
        });
      }
      setModalVisible(false);
      fetchPlan();
    } catch (error) {
      console.error('Failed to save item:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  const handleComplete = async (item: PlanItem) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/daily-plans/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      fetchPlan();
    } catch (error) {
      console.error('Failed to complete item:', error);
    }
  };

  const handlePostpone = async (item: PlanItem) => {
    // Show postpone options
    Alert.alert('延后办理', '选择延后时间', [
      { text: '30分钟', onPress: () => postponeItem(item, 30) },
      { text: '1小时', onPress: () => postponeItem(item, 60) },
      { text: '2小时', onPress: () => postponeItem(item, 120) },
      { text: '明天', onPress: () => postponeItem(item, 24 * 60) },
      { text: '取消', style: 'cancel' },
    ]);
  };

  const postponeItem = async (item: PlanItem, minutes: number) => {
    const postponeUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/daily-plans/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'postponed',
          postpone_until: postponeUntil,
        }),
      });
      fetchPlan();
    } catch (error) {
      console.error('Failed to postpone item:', error);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个事项吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/daily-plans/items/${id}`, {
              method: 'DELETE',
            });
            fetchPlan();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return `${month}月${day}日 ${weekDays[date.getDay()]}`;
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const pendingItems = plan?.items.filter(i => i.status === 'pending') || [];
  const postponedItems = plan?.items.filter(i => i.status === 'postponed') || [];
  const completedItems = plan?.items.filter(i => i.status === 'completed') || [];

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>每日计划</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <FontAwesome6 name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
          <FontAwesome6 name="chevron-left" size={16} color="#6C63FF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateDisplay} onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {isToday && <Text style={styles.todayBadge}>今天</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
          <FontAwesome6 name="chevron-right" size={16} color="#6C63FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>待办事项</Text>
            {pendingItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.shadowDark}>
                  <View style={styles.shadowLight}>
                    <View style={styles.itemRow}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleComplete(item)}
                      >
                        <FontAwesome6 name="circle" size={24} color="#B2BEC3" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.itemContent}
                        onPress={() => openEditModal(item)}
                        onLongPress={() => handleDelete(item.id)}
                      >
                        <Text style={styles.itemTitle}>{item.title}</Text>
                        {item.scheduled_time && (
                          <Text style={styles.itemTime}>
                            <FontAwesome6 name="clock" size={10} color="#636E72" /> {item.scheduled_time.slice(0, 5)}
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.postponeButton}
                        onPress={() => handlePostpone(item)}
                      >
                        <FontAwesome6 name="clock-rotate-left" size={14} color="#F0932B" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Postponed Items */}
        {postponedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>已延后</Text>
            {postponedItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.shadowDark}>
                  <View style={[styles.shadowLight, { opacity: 0.7 }]}>
                    <View style={styles.itemRow}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleComplete(item)}
                      >
                        <FontAwesome6 name="circle" size={24} color="#F0932B" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.itemContent}
                        onPress={() => openEditModal(item)}
                        onLongPress={() => handleDelete(item.id)}
                      >
                        <Text style={[styles.itemTitle, { color: '#636E72' }]}>{item.title}</Text>
                        {item.postpone_until && (
                          <Text style={styles.itemTime}>
                            <FontAwesome6 name="clock" size={10} color="#F0932B" /> 延后至 {new Date(item.postpone_until).toLocaleTimeString().slice(0, 5)}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Completed Items */}
        {completedItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>已完成</Text>
            {completedItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.shadowDark}>
                  <View style={[styles.shadowLight, { opacity: 0.6 }]}>
                    <View style={styles.itemRow}>
                      <TouchableOpacity
                        style={styles.checkbox}
                        onPress={() => handleDelete(item.id)}
                      >
                        <FontAwesome6 name="circle-check" size={24} color="#00B894" />
                      </TouchableOpacity>
                      <Text style={[styles.itemTitle, styles.completedTitle]}>
                        {item.title}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {pendingItems.length === 0 && postponedItems.length === 0 && completedItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="calendar-check" size={48} color="#B2BEC3" />
            <Text style={styles.emptyText}>今天还没有计划</Text>
            <Text style={styles.emptySubText}>点击右上角 + 添加事项</Text>
          </View>
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
              <Text style={styles.modalTitle}>{editingItem ? '编辑事项' : '新增事项'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#636E72" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>事项标题</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="输入事项标题..."
                  placeholderTextColor="#B2BEC3"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>提醒时间（可选）</Text>
                <TextInput
                  style={styles.textInput}
                  value={scheduledTime}
                  onChangeText={setScheduledTime}
                  placeholder="例如: 09:30"
                  placeholderTextColor="#B2BEC3"
                />
              </View>
            </View>

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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(108,99,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  todayBadge: {
    fontSize: 11,
    color: '#6C63FF',
    backgroundColor: 'rgba(108,99,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 12,
    marginLeft: 4,
  },
  itemCard: {
    marginBottom: 10,
  },
  shadowDark: {
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    borderRadius: 16,
  },
  shadowLight: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    backgroundColor: '#F0F0F3',
    borderRadius: 16,
    padding: 14,
    elevation: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  itemTime: {
    fontSize: 12,
    color: '#636E72',
    marginTop: 4,
  },
  postponeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(240,147,43,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F0F0F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '60%',
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
  textInput: {
    backgroundColor: '#E8E8EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2D3436',
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
