import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeSearchParams } from '@/hooks/useSafeRouter';

const EXPO_PUBLIC_BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;

type NoteType = 'money' | 'review' | 'english' | 'reading' | 'ai';

interface NoteItem {
  id: number;
  date: string;
  content: string;
  title?: string;
  source?: string;
  observation?: string;
  thought?: string;
}

const NOTE_CONFIG: Record<NoteType, { title: string; shortTitle: string; icon: keyof typeof FontAwesome6.glyphMap }> = {
  money: { title: '赚钱心得', shortTitle: '赚钱', icon: 'lightbulb' },
  review: { title: '工作复盘', shortTitle: '复盘', icon: 'clipboard-check' },
  english: { title: '英语学习', shortTitle: '英语', icon: 'language' },
  reading: { title: '阅读积累', shortTitle: '阅读', icon: 'book' },
  ai: { title: 'AI/副业', shortTitle: 'AI', icon: 'robot' },
};

const API_ENDPOINTS: Record<NoteType, string> = {
  money: '/api/v1/money-insights',
  review: '/api/v1/daily-reviews',
  english: '/api/v1/english-notes',
  reading: '/api/v1/reading-notes',
  ai: '/api/v1/ai-learning',
};

// 获取今天的日期字符串 (YYYY-MM-DD)
const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 格式化日期显示
const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 ${weekday}`;
};

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const params = useSafeSearchParams<{ type?: string }>();
  const initialType = params.type;
  const [activeTab, setActiveTab] = useState<NoteType>(() => {
    if (initialType && ['money', 'review', 'english', 'reading', 'ai'].includes(initialType as string)) {
      return initialType as NoteType;
    }
    return 'money';
  });
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [currentNote, setCurrentNote] = useState<NoteItem | null>(null);
  const [content, setContent] = useState('');
  const [observation, setObservation] = useState('');
  const [thought, setThought] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const endpoint = API_ENDPOINTS[activeTab];
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}${endpoint}`);
      const data = await response.json();
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      setNotes([]);
    }
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  // 当日期或标签切换时，加载对应日期的笔记
  useEffect(() => {
    const noteForDate = notes.find(n => n.date === selectedDate);
    setCurrentNote(noteForDate || null);
    if (noteForDate) {
      setContent(noteForDate.content || '');
      setObservation(noteForDate.observation || '');
      setThought(noteForDate.thought || '');
      setTitle(noteForDate.title || '');
      setSource(noteForDate.source || '');
    } else {
      setContent('');
      setObservation('');
      setThought('');
      setTitle('');
      setSource('');
    }
  }, [selectedDate, activeTab, notes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }, [fetchNotes]);

  const handleSave = async () => {
    setIsSaving(true);
    const endpoint = API_ENDPOINTS[activeTab];

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === 'money') {
        if (!observation.trim() || !thought.trim()) {
          Alert.alert('提示', '请填写观察和想法');
          setIsSaving(false);
          return;
        }
        payload = { observation: observation.trim(), thought: thought.trim() };
      } else if (activeTab === 'review') {
        if (!content.trim()) {
          Alert.alert('提示', '请填写复盘内容');
          setIsSaving(false);
          return;
        }
        payload = { content: content.trim() };
      } else if (activeTab === 'reading') {
        if (!content.trim()) {
          Alert.alert('提示', '请填写摘录内容');
          setIsSaving(false);
          return;
        }
        payload = { content: content.trim(), title: title.trim(), source: source.trim() };
      } else {
        if (!content.trim()) {
          Alert.alert('提示', '请填写内容');
          setIsSaving(false);
          return;
        }
        payload = { content: content.trim() };
      }

      if (currentNote) {
        // 更新现有笔记
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}${endpoint}/${currentNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // 创建新笔记
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      await fetchNotes();
      Alert.alert('成功', '保存成功');
    } catch (error) {
      console.error('Failed to save note:', error);
      Alert.alert('错误', '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const config = NOTE_CONFIG[activeTab];
  const tabs: NoteType[] = ['money', 'review', 'english', 'reading', 'ai'];

  // 获取最近 7 天的日期列表
  const getRecentDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
    }
    return dates;
  };

  const recentDates = getRecentDates();

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F5FAF5">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>笔记</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {tabs.map((tab) => {
            const tabConfig = NOTE_CONFIG[tab];
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <FontAwesome6
                  name={tabConfig.icon}
                  size={12}
                  color={isActive ? '#2D7D46' : '#718096'}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tabConfig.shortTitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Date Selector */}
      <View style={styles.dateSelector}>
        <View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateContainer}
          >
          {recentDates.map((date) => {
            const isSelected = date === selectedDate;
            const hasNote = notes.some(n => n.date === date);
            return (
              <TouchableOpacity
                key={date}
                style={[styles.dateItem, isSelected && styles.dateItemSelected]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateItemText, isSelected && styles.dateItemTextSelected]}>
                  {new Date(date).getDate()}
                </Text>
                {hasNote && <View style={styles.dateDot} />}
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>
        <Text style={styles.dateDisplay}>{formatDateDisplay(selectedDate)}</Text>
      </View>

      {/* Notebook Editor */}
      <KeyboardAvoidingView
        style={styles.editorContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.editorContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {activeTab === 'money' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>今天观察到的</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={observation}
                  onChangeText={setObservation}
                  placeholder="描述你看到的与赚钱相关的事情..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>我的想法</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={thought}
                  onChangeText={setThought}
                  placeholder="写下你的思考和想法..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                />
              </View>
            </>
          ) : activeTab === 'reading' ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>标题（可选）</Text>
                <TextInput
                  style={styles.textInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="文章或书名..."
                  placeholderTextColor="#A0AEC0"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>来源（可选）</Text>
                <TextInput
                  style={styles.textInput}
                  value={source}
                  onChangeText={setSource}
                  placeholder="作者、网站等..."
                  placeholderTextColor="#A0AEC0"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>摘录内容</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={content}
                  onChangeText={setContent}
                  placeholder="摘录的内容..."
                  placeholderTextColor="#A0AEC0"
                  multiline
                />
              </View>
            </>
          ) : (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {activeTab === 'review' ? '今日工作复盘' :
                 activeTab === 'english' ? '今日英语学习' :
                 '今日 AI/副业学习'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.multilineInput]}
                value={content}
                onChangeText={setContent}
                placeholder={
                  activeTab === 'review' ? '总结今天的工作...' :
                  activeTab === 'english' ? '今天学到的英语知识...' :
                  '今天学到的 AI/副业知识...'
                }
                placeholderTextColor="#A0AEC0"
                multiline
              />
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Save Button */}
        <View style={styles.saveBar}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <FontAwesome6 name="check" size={16} color="#FFF" />
            <Text style={styles.saveButtonText}>{isSaving ? '保存中...' : '保存'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#F5FAF5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A202C',
  },
  tabWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabContainer: {
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 5,
  },
  tabActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2D7D46',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  tabTextActive: {
    color: '#2D7D46',
  },
  dateSelector: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  dateItemSelected: {
    backgroundColor: '#2D7D46',
    borderColor: '#2D7D46',
  },
  dateItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  dateItemTextSelected: {
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
  dateDisplay: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
  },
  editorContainer: {
    flex: 1,
  },
  editorContent: {
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1A202C',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  multilineInput: {
    minHeight: 150,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  saveBar: {
    padding: 16,
    backgroundColor: '#F5FAF5',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2D7D46',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
