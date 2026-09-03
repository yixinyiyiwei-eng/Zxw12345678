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

interface SubGoal {
  id: number;
  goal_id: number;
  title: string;
  is_completed: boolean;
}

interface Goal {
  id: number;
  title: string;
  description: string;
  progress: number;
  summary: string;
  sub_goals: SubGoal[];
}

export default function GoalsScreen() {
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [subGoalModalVisible, setSubGoalModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [subGoalTitle, setSubGoalTitle] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const data = await localStorage.getAll<Goal>(STORAGE_KEYS.GOALS);
      setGoals(data || []);
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  }, [fetchGoals]);

  const openAddModal = () => {
    setEditingGoal(null);
    setTitle('');
    setDescription('');
    setSummary('');
    setModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setSummary(goal.summary || '');
    setModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入目标标题');
      return;
    }

    try {
      const allGoals = await localStorage.getAll<Goal>(STORAGE_KEYS.GOALS);

      if (editingGoal) {
        const goalIndex = allGoals.findIndex((g: any) => g.id === editingGoal.id);
        if (goalIndex !== -1) {
          allGoals[goalIndex] = {
            ...allGoals[goalIndex],
            title: title.trim(),
            description: description.trim(),
            summary: summary.trim(),
          };
        }
      } else {
        allGoals.push({
          id: Date.now(),
          title: title.trim(),
          description: description.trim(),
          summary: summary.trim(),
          sub_goals: [],
        } as unknown as Goal);
      }

      await localStorage.saveAll(STORAGE_KEYS.GOALS, allGoals);
      setModalVisible(false);
      fetchGoals();
    } catch (error) {
      console.error('Failed to save goal:', error);
      Alert.alert('错误', '保存失败');
    }
  };

  const openSubGoalModal = (goalId: number) => {
    setSelectedGoalId(goalId);
    setSubGoalTitle('');
    setSubGoalModalVisible(true);
  };

  const handleAddSubGoal = async () => {
    if (!subGoalTitle.trim() || !selectedGoalId) {
      Alert.alert('提示', '请输入子目标标题');
      return;
    }

    try {
      const allGoals = await localStorage.getAll<Goal>(STORAGE_KEYS.GOALS);
      const goal = allGoals.find((g: any) => g.id === selectedGoalId);
      if (goal) {
        if (!goal.sub_goals) goal.sub_goals = [];
        goal.sub_goals.push({
          id: Date.now(),
          goal_id: selectedGoalId,
          title: subGoalTitle.trim(),
          is_completed: false,
        });
        await localStorage.saveAll(STORAGE_KEYS.GOALS, allGoals);
      }
      setSubGoalModalVisible(false);
      fetchGoals();
    } catch (error) {
      console.error('Failed to add sub-goal:', error);
      Alert.alert('错误', '添加失败');
    }
  };

  const toggleSubGoal = async (subGoal: SubGoal) => {
    try {
      const allGoals = await localStorage.getAll<Goal>(STORAGE_KEYS.GOALS);
      const goal = allGoals.find((g: any) => g.id === subGoal.goal_id);
      if (goal && goal.sub_goals) {
        const subGoalIndex = goal.sub_goals.findIndex((sg: any) => sg.id === subGoal.id);
        if (subGoalIndex !== -1) {
          goal.sub_goals[subGoalIndex].is_completed = !goal.sub_goals[subGoalIndex].is_completed;
          await localStorage.saveAll(STORAGE_KEYS.GOALS, allGoals);
          fetchGoals();
        }
      }
    } catch (error) {
      console.error('Failed to toggle sub-goal:', error);
    }
  };

  const deleteSubGoal = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个子目标吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const allGoals = await localStorage.getAll<Goal>(STORAGE_KEYS.GOALS);
            for (const goal of allGoals) {
              if (goal.sub_goals) {
                goal.sub_goals = goal.sub_goals.filter((sg: any) => sg.id !== id);
              }
            }
            await localStorage.saveAll(STORAGE_KEYS.GOALS, allGoals);
            fetchGoals();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  const deleteGoal = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个目标吗？所有子目标也会被删除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const allGoals = await localStorage.getAll<Goal>(STORAGE_KEYS.GOALS);
            const filteredGoals = allGoals.filter((g: any) => g.id !== id);
            await localStorage.saveAll(STORAGE_KEYS.GOALS, filteredGoals);
            fetchGoals();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F5FAF5">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>目标管理</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <FontAwesome6 name="plus" size={14} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="bullseye" size={48} color="#C6E5C6" />
            <Text style={styles.emptyText}>还没有设定目标</Text>
            <Text style={styles.emptySubText}>点击右上角 + 创建你的第一个目标</Text>
          </View>
        ) : (
          goals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <TouchableOpacity
                onPress={() => openEditModal(goal)}
                onLongPress={() => deleteGoal(goal.id)}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalInfo}>
                    <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                    {goal.description ? (
                      <Text style={styles.goalDesc} numberOfLines={2}>{goal.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressText}>{goal.progress}%</Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
                </View>

                {/* Summary Box */}
                {goal.summary ? (
                  <View style={styles.summaryBox}>
                    <View style={styles.summaryHeader}>
                      <FontAwesome6 name="clipboard-list" size={12} color="#2D7D46" />
                      <Text style={styles.summaryLabel}>进程总结</Text>
                    </View>
                    <Text style={styles.summaryText}>{goal.summary}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>

              {/* Sub Goals */}
              {goal.sub_goals.length > 0 && (
                <View style={styles.subGoalsContainer}>
                  {goal.sub_goals.map((subGoal) => (
                    <View key={subGoal.id} style={styles.subGoalRow}>
                      <TouchableOpacity
                        style={styles.subGoalCheckbox}
                        onPress={() => toggleSubGoal(subGoal)}
                      >
                        <FontAwesome6
                          name={subGoal.is_completed ? 'check-circle' : 'circle'}
                          size={18}
                          color={subGoal.is_completed ? '#2D7D46' : '#CBD5E0'}
                        />
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.subGoalTitle,
                          subGoal.is_completed && styles.subGoalCompleted
                        ]}
                        numberOfLines={1}
                      >
                        {subGoal.title}
                      </Text>
                      <TouchableOpacity onPress={() => deleteSubGoal(subGoal.id)}>
                        <FontAwesome6 name="trash" size={12} color="#E53E3E" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.addSubGoalButton}
                onPress={() => openSubGoalModal(goal.id)}
              >
                <FontAwesome6 name="plus" size={12} color="#2D7D46" />
                <Text style={styles.addSubGoalText}>添加子目标</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Goal Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingGoal ? '编辑目标' : '新增目标'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>目标标题</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="输入目标标题..."
                  placeholderTextColor="#A0AEC0"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>目标描述（可选）</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="描述你的目标..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>进程总结</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={summary}
                  onChangeText={setSummary}
                  placeholder="记录目标进展、遇到的问题、下一步计划..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sub-Goal Modal */}
      <Modal visible={subGoalModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>添加子目标</Text>
              <TouchableOpacity onPress={() => setSubGoalModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>子目标标题</Text>
                <TextInput
                  style={styles.textInput}
                  value={subGoalTitle}
                  onChangeText={setSubGoalTitle}
                  placeholder="输入子目标..."
                  placeholderTextColor="#A0AEC0"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setSubGoalModalVisible(false)}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddSubGoal}>
                <Text style={styles.saveButtonText}>添加</Text>
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
  goalCard: {
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
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalInfo: {
    flex: 1,
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A202C',
  },
  goalDesc: {
    fontSize: 13,
    color: '#718096',
    marginTop: 4,
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D7D46',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2D7D46',
    borderRadius: 3,
  },
  summaryBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F0FFF4',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2D7D46',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2D7D46',
  },
  summaryText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 20,
  },
  subGoalsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  subGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  subGoalCheckbox: {
    marginRight: 10,
  },
  subGoalTitle: {
    flex: 1,
    fontSize: 14,
    color: '#1A202C',
  },
  subGoalCompleted: {
    textDecorationLine: 'line-through',
    color: '#A0AEC0',
  },
  addSubGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    backgroundColor: '#F0FFF4',
    borderRadius: 10,
    gap: 6,
  },
  addSubGoalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D7D46',
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
    maxHeight: '80%',
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
  multilineInput: {
    minHeight: 100,
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
    color: '#FFFFFF',
  },
});
