import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

interface DashboardData {
  date: string;
  finance: {
    total_income: number;
    total_expense: number;
  };
  plan_items: Array<{
    id: number;
    title: string;
    scheduled_time: string | null;
    status: string;
  }>;
  goals: Array<{
    id: number;
    title: string;
    progress: number;
  }>;
  has_review: boolean;
  notes_summary: {
    english: number;
    reading: number;
    ai_learning: number;
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useSafeRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/dashboard`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDay = weekDays[today.getDay()];

  const netIncome = data ? data.finance.total_income - data.finance.total_expense : 0;

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F0F0F3">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={styles.greeting}>个人工作台</Text>
            <Text style={styles.dateText}>{dateStr} {weekDay}</Text>
          </View>
        </View>

        {/* Finance Summary Card */}
        <View style={styles.cardContainer}>
          <View style={styles.shadowDark}>
            <View style={styles.shadowLight}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <FontAwesome6 name="wallet" size={20} color="#6C63FF" />
                </View>
                <Text style={styles.cardTitle}>今日财务</Text>
              </View>
              <View style={styles.financeRow}>
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>收入</Text>
                  <Text style={[styles.financeValue, { color: '#00B894' }]}>
                    +{data?.finance.total_income.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.financeDivider} />
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>支出</Text>
                  <Text style={[styles.financeValue, { color: '#FF6B6B' }]}>
                    -{data?.finance.total_expense.toFixed(2) || '0.00'}
                  </Text>
                </View>
                <View style={styles.financeDivider} />
                <View style={styles.financeItem}>
                  <Text style={styles.financeLabel}>结余</Text>
                  <Text style={[styles.financeValue, { color: netIncome >= 0 ? '#00B894' : '#FF6B6B' }]}>
                    {netIncome >= 0 ? '+' : ''}{netIncome.toFixed(2)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/finance')}
              >
                <Text style={styles.viewAllText}>查看详情</Text>
                <FontAwesome6 name="chevron-right" size={12} color="#6C63FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Today's Plan Card */}
        <View style={styles.cardContainer}>
          <View style={styles.shadowDark}>
            <View style={styles.shadowLight}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,101,132,0.12)' }]}>
                  <FontAwesome6 name="calendar-check" size={20} color="#FF6584" />
                </View>
                <Text style={styles.cardTitle}>今日计划</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {data?.plan_items.length || 0}项待办
                  </Text>
                </View>
              </View>
              {data?.plan_items && data.plan_items.length > 0 ? (
                <View style={styles.planList}>
                  {data.plan_items.slice(0, 3).map((item) => (
                    <View key={item.id} style={styles.planItem}>
                      <View style={styles.planDot} />
                      <Text style={styles.planTitle} numberOfLines={1}>
                        {item.scheduled_time ? `${item.scheduled_time.slice(0, 5)} ` : ''}{item.title}
                      </Text>
                    </View>
                  ))}
                  {data.plan_items.length > 3 && (
                    <Text style={styles.moreText}>还有{data.plan_items.length - 3}项...</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyText}>暂无计划，享受悠闲时光</Text>
              )}
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/schedule')}
              >
                <Text style={styles.viewAllText}>管理计划</Text>
                <FontAwesome6 name="chevron-right" size={12} color="#6C63FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Goals Overview */}
        <View style={styles.cardContainer}>
          <View style={styles.shadowDark}>
            <View style={styles.shadowLight}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,184,148,0.12)' }]}>
                  <FontAwesome6 name="flag-checkered" size={20} color="#00B894" />
                </View>
                <Text style={styles.cardTitle}>目标进度</Text>
              </View>
              {data?.goals && data.goals.length > 0 ? (
                <View style={styles.goalsList}>
                  {data.goals.slice(0, 3).map((goal) => (
                    <View key={goal.id} style={styles.goalItem}>
                      <Text style={styles.goalTitle} numberOfLines={1}>{goal.title}</Text>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${Math.min(goal.progress, 100)}%` }
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>{goal.progress}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>还没有设定目标</Text>
              )}
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/goals')}
              >
                <Text style={styles.viewAllText}>查看全部</Text>
                <FontAwesome6 name="chevron-right" size={12} color="#6C63FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notes Summary */}
        <View style={styles.cardContainer}>
          <View style={styles.shadowDark}>
            <View style={styles.shadowLight}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(253,203,110,0.2)' }]}>
                  <FontAwesome6 name="book-open" size={20} color="#F0932B" />
                </View>
                <Text style={styles.cardTitle}>今日学习</Text>
              </View>
              <View style={styles.notesGrid}>
                <TouchableOpacity
                  style={styles.noteItem}
                  onPress={() => router.push('/notes?type=money')}
                >
                  <FontAwesome6 name="lightbulb" size={24} color="#6C63FF" />
                  <Text style={styles.noteCount}>{data?.notes_summary.english || 0}</Text>
                  <Text style={styles.noteLabel}>赚钱心得</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noteItem}
                  onPress={() => router.push('/notes?type=english')}
                >
                  <FontAwesome6 name="language" size={24} color="#FF6584" />
                  <Text style={styles.noteCount}>{data?.notes_summary.english || 0}</Text>
                  <Text style={styles.noteLabel}>英语学习</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noteItem}
                  onPress={() => router.push('/notes?type=reading')}
                >
                  <FontAwesome6 name="book" size={24} color="#00B894" />
                  <Text style={styles.noteCount}>{data?.notes_summary.reading || 0}</Text>
                  <Text style={styles.noteLabel}>阅读积累</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.noteItem}
                  onPress={() => router.push('/notes?type=ai')}
                >
                  <FontAwesome6 name="robot" size={24} color="#F0932B" />
                  <Text style={styles.noteCount}>{data?.notes_summary.ai_learning || 0}</Text>
                  <Text style={styles.noteLabel}>AI/副业</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/notes')}
              >
                <Text style={styles.viewAllText}>进入笔记</Text>
                <FontAwesome6 name="chevron-right" size={12} color="#6C63FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Work Review Card */}
        <View style={styles.cardContainer}>
          <View style={styles.shadowDark}>
            <View style={styles.shadowLight}>
              <TouchableOpacity
                style={styles.reviewCard}
                onPress={() => router.push('/notes?type=review')}
              >
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(108,99,255,0.12)' }]}>
                  <FontAwesome6 name="clipboard-check" size={20} color="#6C63FF" />
                </View>
                <View style={styles.reviewContent}>
                  <Text style={styles.reviewTitle}>今日工作复盘</Text>
                  <Text style={styles.reviewDesc}>
                    {data?.has_review ? '已完成今日复盘' : '点击开始今日复盘'}
                  </Text>
                </View>
                <FontAwesome6 name="chevron-right" size={14} color="#B2BEC3" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3436',
  },
  dateText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 4,
  },
  cardContainer: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108,99,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3436',
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
  },
  financeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  financeItem: {
    flex: 1,
    alignItems: 'center',
  },
  financeDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E8E8EB',
  },
  financeLabel: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 4,
  },
  financeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8EB',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6C63FF',
    marginRight: 6,
  },
  planList: {
    marginBottom: 8,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  planDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6584',
    marginRight: 12,
  },
  planTitle: {
    fontSize: 14,
    color: '#2D3436',
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: '#636E72',
    marginLeft: 20,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#B2BEC3',
    textAlign: 'center',
    paddingVertical: 16,
  },
  goalsList: {
    marginBottom: 8,
  },
  goalItem: {
    marginBottom: 12,
  },
  goalTitle: {
    fontSize: 14,
    color: '#2D3436',
    marginBottom: 6,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E8E8EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00B894',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#636E72',
    width: 35,
    textAlign: 'right',
  },
  notesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  noteItem: {
    width: '25%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  noteCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3436',
    marginTop: 8,
  },
  noteLabel: {
    fontSize: 11,
    color: '#636E72',
    marginTop: 4,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewContent: {
    flex: 1,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
  },
  reviewDesc: {
    fontSize: 13,
    color: '#636E72',
    marginTop: 2,
  },
});
