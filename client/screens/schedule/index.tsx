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
import { localStorage, STORAGE_KEYS } from '@/utils/localStorage';

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

// Clock-style time picker component
function ClockTimePicker({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [hours, setHours] = useState(() => {
    if (value) return parseInt(value.split(':')[0]) || 0;
    return 9;
  });
  const [minutes, setMinutes] = useState(() => {
    if (value) return parseInt(value.split(':')[1]) || 0;
    return 0;
  });
  const [mode, setMode] = useState<'hour' | 'minute'>('hour');

  const hourMarkers = Array.from({ length: 12 }, (_, i) => i);
  const minuteMarkers = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleHourSelect = (hour: number) => {
    const currentIsPM = hours >= 12;
    const newHour = currentIsPM ? hour + 12 : hour;
    setHours(newHour);
    const timeStr = `${newHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr);
    setMode('minute'); // 选择小时后自动切换到分钟模式
  };

  const handleMinuteSelect = (minute: number) => {
    setMinutes(minute);
    const timeStr = `${hours.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    onChange(timeStr);
  };

  const toggleAMPM = () => {
    const newHours = hours >= 12 ? hours - 12 : hours + 12;
    setHours(newHours);
    const timeStr = `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    onChange(timeStr);
  };

  const isPM = hours >= 12;
  const displayHour = hours % 12 || 12;

  return (
    <View style={clockStyles.container}>
      {/* Digital Display */}
      <View style={clockStyles.digitalDisplay}>
        <Text style={clockStyles.digitalTime}>
          {displayHour.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
        </Text>
        <TouchableOpacity style={clockStyles.ampmButton} onPress={toggleAMPM}>
          <Text style={clockStyles.ampmText}>{isPM ? 'PM' : 'AM'}</Text>
        </TouchableOpacity>
      </View>

      {/* Mode Switcher */}
      <View style={clockStyles.modeSwitcher}>
        <TouchableOpacity
          style={[clockStyles.modeButton, mode === 'hour' && clockStyles.modeButtonActive]}
          onPress={() => setMode('hour')}
        >
          <Text style={[clockStyles.modeText, mode === 'hour' && clockStyles.modeTextActive]}>时</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[clockStyles.modeButton, mode === 'minute' && clockStyles.modeButtonActive]}
          onPress={() => setMode('minute')}
        >
          <Text style={[clockStyles.modeText, mode === 'minute' && clockStyles.modeTextActive]}>分</Text>
        </TouchableOpacity>
      </View>

      {/* Clock Face */}
      <View style={clockStyles.clockContainer}>
        <View style={clockStyles.clockFace}>
          {/* Center dot */}
          <View style={clockStyles.centerDot} />
          
          {mode === 'hour' ? (
            /* Hour markers */
            hourMarkers.map((hour) => {
              const angle = (hour * 30 - 90) * (Math.PI / 180);
              const radius = 70;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isSelected = (hours % 12) === hour;
              
              return (
                <TouchableOpacity
                  key={`hour-${hour}`}
                  style={[
                    clockStyles.hourMarker,
                    {
                      left: 90 + x - 16,
                      top: 90 + y - 16,
                    },
                    isSelected && clockStyles.hourMarkerSelected,
                  ]}
                  onPress={() => handleHourSelect(hour === 0 ? 12 : hour)}
                >
                  <Text style={[
                    clockStyles.hourText,
                    isSelected && clockStyles.hourTextSelected,
                  ]}>
                    {hour === 0 ? 12 : hour}
                  </Text>
                </TouchableOpacity>
              );
            })
          ) : (
            /* Minute markers */
            minuteMarkers.map((minute) => {
              const angle = (minute * 6 - 90) * (Math.PI / 180);
              const radius = 70;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const isSelected = minutes === minute;
              
              return (
                <TouchableOpacity
                  key={`minute-${minute}`}
                  style={[
                    clockStyles.hourMarker,
                    {
                      left: 90 + x - 16,
                      top: 90 + y - 16,
                    },
                    isSelected && clockStyles.hourMarkerSelected,
                  ]}
                  onPress={() => handleMinuteSelect(minute)}
                >
                  <Text style={[
                    clockStyles.hourText,
                    isSelected && clockStyles.hourTextSelected,
                  ]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          {/* Hour hand */}
          <View
            style={[
              clockStyles.hand,
              clockStyles.hourHand,
              {
                transform: [
                  { rotate: `${(hours % 12) * 30 + minutes * 0.5}deg` },
                ],
              },
            ]}
          />
          
          {/* Minute hand */}
          <View
            style={[
              clockStyles.hand,
              clockStyles.minuteHand,
              {
                transform: [
                  { rotate: `${minutes * 6}deg` },
                ],
              },
            ]}
          />
        </View>
      </View>

      {/* Quick Minute Buttons */}
      <View style={clockStyles.quickMinuteContainer}>
        {[0, 15, 30, 45].map((minute) => (
          <TouchableOpacity
            key={`quick-${minute}`}
            style={[
              clockStyles.quickMinuteButton,
              minutes === minute && clockStyles.quickMinuteButtonActive,
            ]}
            onPress={() => handleMinuteSelect(minute)}
          >
            <Text style={[
              clockStyles.quickMinuteText,
              minutes === minute && clockStyles.quickMinuteTextActive,
            ]}>
              {minute.toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
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
      const allPlans = await localStorage.getAll<DailyPlan>(STORAGE_KEYS.SCHEDULE);
      const plan = allPlans.find((p: any) => p.date === selectedDate);
      setPlan(plan || { id: Date.now(), date: selectedDate, items: [] });
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
      const allPlans = await localStorage.getAll(STORAGE_KEYS.SCHEDULE);
      let plan = allPlans.find((p: any) => p.date === selectedDate);

      if (!plan) {
        plan = { id: Date.now(), date: selectedDate, items: [] };
        allPlans.push(plan);
      }

      if (editingItem) {
        const itemIndex = (plan as any).items.findIndex((item: any) => item.id === editingItem.id);
        if (itemIndex !== -1) {
          (plan as any).items[itemIndex] = {
            ...(plan as any).items[itemIndex],
            title: title.trim(),
            scheduled_time: scheduledTime || null,
          };
        }
      } else {
        (plan as any).items.push({
          id: Date.now(),
          plan_id: (plan as any).id,
          title: title.trim(),
          scheduled_time: scheduledTime || null,
          status: 'pending',
          postpone_until: null,
        });
      }

      await localStorage.saveAll(STORAGE_KEYS.SCHEDULE, allPlans);
      setModalVisible(false);
      fetchPlan();
    } catch (error) {
      console.error('Failed to save item:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  const handleComplete = async (item: PlanItem) => {
    try {
      const allPlans = await localStorage.getAll(STORAGE_KEYS.SCHEDULE);
      const plan = allPlans.find((p: any) => p.date === selectedDate);
      if (plan) {
        const itemIndex = (plan as any).items.findIndex((i: any) => i.id === item.id);
        if (itemIndex !== -1) {
          (plan as any).items[itemIndex].status = 'completed';
          await localStorage.saveAll(STORAGE_KEYS.SCHEDULE, allPlans);
          fetchPlan();
        }
      }
    } catch (error) {
      console.error('Failed to complete item:', error);
    }
  };

  const handlePostpone = async (item: PlanItem) => {
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
      const allPlans = await localStorage.getAll(STORAGE_KEYS.SCHEDULE);
      const plan = allPlans.find((p: any) => p.date === selectedDate);
      if (plan) {
        const itemIndex = (plan as any).items.findIndex((i: any) => i.id === item.id);
        if (itemIndex !== -1) {
          (plan as any).items[itemIndex].status = 'postponed';
          (plan as any).items[itemIndex].postpone_until = postponeUntil;
          await localStorage.saveAll(STORAGE_KEYS.SCHEDULE, allPlans);
          fetchPlan();
        }
      }
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
            const allPlans = await localStorage.getAll(STORAGE_KEYS.SCHEDULE);
            const plan = allPlans.find((p: any) => p.date === selectedDate);
            if (plan) {
              (plan as any).items = (plan as any).items.filter((i: any) => i.id !== id);
              await localStorage.saveAll(STORAGE_KEYS.SCHEDULE, allPlans);
              fetchPlan();
            }
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
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F5FAF5">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>每日计划</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <FontAwesome6 name="plus" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)}>
          <FontAwesome6 name="chevron-left" size={14} color="#2D7D46" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateDisplay} onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}>
          <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          {isToday && <Text style={styles.todayBadge}>今天</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)}>
          <FontAwesome6 name="chevron-right" size={14} color="#2D7D46" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Pending Items */}
        {pendingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>待办事项</Text>
            {pendingItems.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleComplete(item)}
                  >
                    <FontAwesome6 name="circle" size={22} color="#CBD5E0" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itemContent}
                    onPress={() => openEditModal(item)}
                    onLongPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.scheduled_time && (
                      <View style={styles.timeBadge}>
                        <FontAwesome6 name="clock" size={10} color="#2D7D46" />
                        <Text style={styles.itemTime}>{item.scheduled_time.slice(0, 5)}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.postponeButton}
                    onPress={() => handlePostpone(item)}
                  >
                    <FontAwesome6 name="clock-rotate-left" size={14} color="#D69E2E" />
                  </TouchableOpacity>
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
                <View style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleComplete(item)}
                  >
                    <FontAwesome6 name="circle" size={22} color="#D69E2E" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.itemContent}
                    onPress={() => openEditModal(item)}
                    onLongPress={() => handleDelete(item.id)}
                  >
                    <Text style={[styles.itemTitle, { color: '#718096' }]}>{item.title}</Text>
                    {item.postpone_until && (
                      <View style={styles.timeBadge}>
                        <FontAwesome6 name="clock" size={10} color="#D69E2E" />
                        <Text style={[styles.itemTime, { color: '#D69E2E' }]}>
                          延后至 {new Date(item.postpone_until).toLocaleTimeString().slice(0, 5)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
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
              <View key={item.id} style={[styles.itemCard, { opacity: 0.6 }]}>
                <View style={styles.itemRow}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => handleDelete(item.id)}
                  >
                    <FontAwesome6 name="circle-check" size={22} color="#2D7D46" />
                  </TouchableOpacity>
                  <Text style={[styles.itemTitle, styles.completedTitle]}>
                    {item.title}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {pendingItems.length === 0 && postponedItems.length === 0 && completedItems.length === 0 && (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="calendar-check" size={48} color="#C6E5C6" />
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
                <FontAwesome6 name="xmark" size={20} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>事项标题</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="输入事项标题..."
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>提醒时间（可选）</Text>
                <ClockTimePicker value={scheduledTime} onChange={setScheduledTime} />
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

const clockStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  digitalDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  digitalTime: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1A202C',
    fontVariant: ['tabular-nums'],
  },
  ampmButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D7D46',
  },
  clockContainer: {
    marginBottom: 16,
  },
  clockFace: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2D7D46',
    position: 'absolute',
    zIndex: 10,
  },
  hourMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  hourMarkerSelected: {
    backgroundColor: '#2D7D46',
  },
  hourText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  hourTextSelected: {
    color: '#FFFFFF',
  },
  hand: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    transformOrigin: 'bottom center',
  },
  hourHand: {
    width: 3,
    height: 40,
    backgroundColor: '#1A202C',
    borderRadius: 2,
    marginLeft: -1.5,
  },
  minuteHand: {
    width: 2,
    height: 60,
    backgroundColor: '#2D7D46',
    borderRadius: 1,
    marginLeft: -1,
  },
  minuteContainer: {
    width: '100%',
  },
  minuteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 8,
    textAlign: 'center',
  },
  minuteScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  minuteItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  minuteItemSelected: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  minuteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  minuteTextSelected: {
    color: '#FFFFFF',
  },
  modeSwitcher: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modeButtonActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  modeTextActive: {
    color: '#FFFFFF',
  },
  quickMinuteContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickMinuteButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickMinuteButtonActive: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  quickMinuteText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
  },
  quickMinuteTextActive: {
    color: '#FFFFFF',
  },
});

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
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2D7D46',
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
    backgroundColor: '#E8F5E9',
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
    color: '#1A202C',
  },
  todayBadge: {
    fontSize: 11,
    color: '#2D7D46',
    backgroundColor: '#E8F5E9',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 12,
    marginLeft: 4,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
    color: '#1A202C',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    gap: 4,
  },
  itemTime: {
    fontSize: 11,
    color: '#2D7D46',
    fontWeight: '500',
  },
  postponeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFF0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    flex: 1,
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
    flex: 1,
    padding: 20,
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
  textInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#FFFFFF',
  },
});
