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
  const [subGoalTitle, setSubGoalTitle] = useState('');

  const fetchGoals = useCallback(async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals`);
      const data = await response.json();
      setGoals(data);
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
    setModalVisible(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setDescription(goal.description || '');
    setModalVisible(true);
  };

  const handleSaveGoal = async () => {
    if (!title.trim()) {
      Alert.alert('提示', '请输入目标标题');
      return;
    }

    try {
      if (editingGoal) {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
          }),
        });
      } else {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
          }),
        });
      }
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
      await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals/${selectedGoalId}/sub-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: subGoalTitle.trim() }),
      });
      setSubGoalModalVisible(false);
      fetchGoals();
    } catch (error) {
      console.error('Failed to add sub-goal:', error);
      Alert.alert('错误', '添加失败');
    }
  };

  const toggleSubGoal = async (subGoal: SubGoal) => {
    try {
      await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals/sub-goals/${subGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !subGoal.is_completed }),
      });
      fetchGoals();
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
            await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals/sub-goals/${id}`, {
              method: 'DELETE',
            });
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
            await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/goals/${id}`, {
              method: 'DELETE',
            });
            fetchGoals();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>目标管理</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <FontAwesome6 name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {goals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="bullseye" size={48} color="#B2BEC3" />
            <Text style={styles.emptyText}>还没有设定目标</Text>
            <Text style={styles.emptySubText}>点击右上角 + 创建你的第一个目标</Text>
          </View>
        ) : (
          goals.map((goal) => (
            <View key={goal.id} style={styles.goalCard}>
              <View style={styles.shadowDark}>
                <View style={styles.shadowLight}>
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
                              color={subGoal.is_completed ? '#00B894' : '#B2BEC3'}
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
                            <FontAwesome6 name="trash" size={12} color="#FF6B6B" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.addSubGoalButton}
                    onPress={() => openSubGoalModal(goal.id)}
                  >
                    <FontAwesome6 name="plus" size={12} color="#6C63FF" />
                    <Text style={styles.addSubGoalText}>添加子目标</Text>
                  </TouchableOpacity>
                </View>
              </View>
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
                <FontAwesome6 name="xmark" size={20} color="#636E72" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>目标标题</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="输入目标标题..."
                  placeholderTextColor="#B2BEC3"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>目标描述（可选）</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="描述你的目标..."
                  placeholderTextColor="#B2BEC3"
                  multiline
                />
              </View>
            </View>

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
                <FontAwesome6 name="xmark" size={20} color="#636E72" />
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
                  placeholderTextColor="#B2BEC3"
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
  goalCard: {
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
    color: '#2D3436',
  },
  goalDesc: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 4,
  },
  progressCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,184,148,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00B894',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E8E8EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 4,
  },
  subGoalsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8EB',
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
    color: '#2D3436',
  },
  subGoalCompleted: {
    textDecorationLine: 'line-through',
    color: '#B2BEC3',
  },
  addSubGoalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    backgroundColor: 'rgba(108,99,255,0.08)',
    borderRadius: 12,
  },
  addSubGoalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6C63FF',
    marginLeft: 6,
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
  multilineInput: {
    minHeight: 100,
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
