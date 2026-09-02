import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useFocusEffect } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type WorkoutPlan = {
  id: number;
  date: string;
  exercise_type: string;
  duration: number;
  intensity: string;
  notes?: string;
  is_completed: boolean;
};

const exerciseTypes = [
  { label: '跑步', icon: 'person-running', color: '#2D7D46' },
  { label: '游泳', icon: 'water', color: '#0EA5E9' },
  { label: '瑜伽', icon: 'heart', color: '#F43F5E' },
  { label: '力量训练', icon: 'dumbbell', color: '#8B5CF6' },
  { label: '骑行', icon: 'bicycle', color: '#F59E0B' },
  { label: '其他', icon: 'ellipsis', color: '#6B7280' },
];

const intensities = [
  { label: '低强度', value: 'low', color: '#10B981' },
  { label: '中强度', value: 'medium', color: '#F59E0B' },
  { label: '高强度', value: 'high', color: '#EF4444' },
];

export default function WorkoutScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [duration, setDuration] = useState('');
  const [selectedIntensity, setSelectedIntensity] = useState('medium');
  const [notes, setNotes] = useState('');

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/workout-plans?date=${selectedDate}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      console.error('Failed to fetch workout plans:', error);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
    }, [fetchPlans])
  );

  const handleAdd = async () => {
    if (!selectedExercise || !duration) {
      Alert.alert('提示', '请选择运动类型和时长');
      return;
    }

    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/workout-plans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          exercise_type: selectedExercise,
          duration: parseInt(duration),
          intensity: selectedIntensity,
          notes,
        }),
      });

      if (!response.ok) throw new Error('Failed to create');

      setSelectedExercise('');
      setDuration('');
      setNotes('');
      fetchPlans();
      Alert.alert('成功', '锻炼计划已添加');
    } catch (error) {
      console.error('Failed to create workout plan:', error);
      Alert.alert('错误', '添加失败');
    }
  };

  const handleToggleComplete = async (plan: WorkoutPlan) => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/workout-plans/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...plan,
          is_completed: !plan.is_completed,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');
      fetchPlans();
    } catch (error) {
      console.error('Failed to update workout plan:', error);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('确认删除', '确定要删除这个锻炼计划吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/workout-plans/${id}`, {
              method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
            fetchPlans();
          } catch (error) {
            console.error('Failed to delete workout plan:', error);
          }
        },
      },
    ]);
  };

  const getRecentDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dates.push({
        date: date.toISOString().split('T')[0],
        day: date.getDate(),
        weekday: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
        isToday: i === 0,
      });
    }
    return dates;
  };

  const recentDates = getRecentDates();

  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1F2937' }}>今日锻炼</Text>
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>制定每天的锻炼计划</Text>
          </View>

          {/* Date Selector */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
            {recentDates.map((item) => (
              <TouchableOpacity
                key={item.date}
                onPress={() => setSelectedDate(item.date)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: selectedDate === item.date ? '#2D7D46' : '#F3F4F6',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: selectedDate === item.date ? '#FFFFFF' : '#1F2937',
                  }}
                >
                  {item.day}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: selectedDate === item.date ? '#FFFFFF' : '#6B7280',
                    marginTop: 2,
                  }}
                >
                  周{item.weekday}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Exercise Type Selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
              运动类型
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {exerciseTypes.map((type) => (
                <TouchableOpacity
                  key={type.label}
                  onPress={() => setSelectedExercise(type.label)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedExercise === type.label ? type.color : '#F3F4F6',
                    borderWidth: 2,
                    borderColor: selectedExercise === type.label ? type.color : 'transparent',
                  }}
                >
                  <FontAwesome6
                    name={type.icon as any}
                    size={20}
                    color={selectedExercise === type.label ? '#FFFFFF' : '#6B7280'}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: selectedExercise === type.label ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
              时长（分钟）
            </Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              placeholder="输入锻炼时长..."
              keyboardType="numeric"
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#1F2937',
              }}
            />
          </View>

          {/* Intensity Selector */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
              强度
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {intensities.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setSelectedIntensity(item.value)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: selectedIntensity === item.value ? item.color : '#F3F4F6',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: selectedIntensity === item.value ? '#FFFFFF' : '#6B7280',
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 }}>
              备注（可选）
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="输入备注..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={{
                backgroundColor: '#F3F4F6',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#1F2937',
                minHeight: 80,
              }}
            />
          </View>

          {/* Add Button */}
          <TouchableOpacity
            onPress={handleAdd}
            style={{
              backgroundColor: '#2D7D46',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>添加锻炼计划</Text>
          </TouchableOpacity>

          {/* Plans List */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 }}>
              当日计划 ({plans.length})
            </Text>
          </View>

          {plans.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <FontAwesome6 name="dumbbell" size={48} color="#D1D5DB" />
              <Text style={{ fontSize: 16, color: '#9CA3AF', marginTop: 16 }}>
                暂无锻炼计划
              </Text>
              <Text style={{ fontSize: 14, color: '#D1D5DB', marginTop: 8 }}>
                添加你的第一个锻炼计划
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {plans.map((plan) => (
                <View
                  key={plan.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <TouchableOpacity onPress={() => handleToggleComplete(plan)}>
                        <View
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 12,
                            borderWidth: 2,
                            borderColor: plan.is_completed ? '#2D7D46' : '#D1D5DB',
                            backgroundColor: plan.is_completed ? '#2D7D46' : 'transparent',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          {plan.is_completed && (
                            <FontAwesome6 name="check" size={14} color="#FFFFFF" />
                          )}
                        </View>
                      </TouchableOpacity>
                      <View>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '600',
                            color: plan.is_completed ? '#9CA3AF' : '#1F2937',
                            textDecorationLine: plan.is_completed ? 'line-through' : 'none',
                          }}
                        >
                          {plan.exercise_type}
                        </Text>
                        <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                          {plan.duration} 分钟 · {plan.intensity === 'low' ? '低强度' : plan.intensity === 'medium' ? '中强度' : '高强度'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(plan.id)}>
                      <FontAwesome6 name="trash" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  {plan.notes && (
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 8 }}>
                      {plan.notes}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
