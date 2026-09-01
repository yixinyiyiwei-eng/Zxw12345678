import React, { useState, useCallback, useEffect } from 'react';
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

const NOTE_CONFIG: Record<NoteType, { title: string; icon: string; color: string; bgColor: string }> = {
  money: { title: '赚钱心得', icon: 'lightbulb', color: '#6C63FF', bgColor: 'rgba(108,99,255,0.12)' },
  review: { title: '工作复盘', icon: 'clipboard-check', color: '#6C63FF', bgColor: 'rgba(108,99,255,0.12)' },
  english: { title: '英语学习', icon: 'language', color: '#FF6584', bgColor: 'rgba(255,101,132,0.12)' },
  reading: { title: '阅读积累', icon: 'book', color: '#00B894', bgColor: 'rgba(0,184,148,0.12)' },
  ai: { title: 'AI/副业学习', icon: 'robot', color: '#F0932B', bgColor: 'rgba(240,147,43,0.12)' },
};

const API_ENDPOINTS: Record<NoteType, string> = {
  money: '/api/v1/money-insights',
  review: '/api/v1/daily-reviews',
  english: '/api/v1/english-notes',
  reading: '/api/v1/reading-notes',
  ai: '/api/v1/ai-learning',
};

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const params = useSafeSearchParams<{ type?: string }>();
  // Set active tab from params - use useSafeSearchParams which handles this reactively
  const initialType = params.type;
  const [activeTab, setActiveTab] = useState<NoteType>(() => {
    if (initialType && ['money', 'review', 'english', 'reading', 'ai'].includes(initialType as string)) {
      return initialType as NoteType;
    }
    return 'money';
  });
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<NoteItem | null>(null);

  // Form state
  const [content, setContent] = useState('');
  const [observation, setObservation] = useState('');
  const [thought, setThought] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotes();
    setRefreshing(false);
  }, [fetchNotes]);

  const openAddModal = () => {
    setEditingItem(null);
    setContent('');
    setObservation('');
    setThought('');
    setTitle('');
    setSource('');
    setModalVisible(true);
  };

  const openEditModal = (item: NoteItem) => {
    setEditingItem(item);
    setContent(item.content || '');
    setObservation(item.observation || '');
    setThought(item.thought || '');
    setTitle(item.title || '');
    setSource(item.source || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    const endpoint = API_ENDPOINTS[activeTab];

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === 'money') {
        if (!observation.trim() || !thought.trim()) {
          Alert.alert('提示', '请填写观察和想法');
          return;
        }
        payload = { observation: observation.trim(), thought: thought.trim() };
      } else if (activeTab === 'review') {
        if (!content.trim()) {
          Alert.alert('提示', '请填写复盘内容');
          return;
        }
        payload = { content: content.trim() };
      } else if (activeTab === 'reading') {
        if (!content.trim()) {
          Alert.alert('提示', '请填写摘录内容');
          return;
        }
        payload = { content: content.trim(), title: title.trim(), source: source.trim() };
      } else {
        if (!content.trim()) {
          Alert.alert('提示', '请填写内容');
          return;
        }
        payload = { content: content.trim() };
      }

      if (editingItem) {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}${endpoint}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      setModalVisible(false);
      fetchNotes();
    } catch (error) {
      console.error('Failed to save note:', error);
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
            const endpoint = API_ENDPOINTS[activeTab];
            await fetch(`${EXPO_PUBLIC_BACKEND_BASE_URL}${endpoint}/${id}`, {
              method: 'DELETE',
            });
            fetchNotes();
          } catch (error) {
            console.error('Failed to delete:', error);
          }
        },
      },
    ]);
  };

  const config = NOTE_CONFIG[activeTab];
  const tabs: NoteType[] = ['money', 'review', 'english', 'reading', 'ai'];

  const renderNoteContent = (item: NoteItem) => {
    if (activeTab === 'money') {
      return (
        <View>
          <View style={styles.moneySection}>
            <Text style={styles.moneyLabel}>观察到的</Text>
            <Text style={styles.moneyContent}>{item.observation}</Text>
          </View>
          <View style={styles.moneySection}>
            <Text style={styles.moneyLabel}>我的想法</Text>
            <Text style={styles.moneyContent}>{item.thought}</Text>
          </View>
        </View>
      );
    }
    if (activeTab === 'reading' && item.title) {
      return (
        <View>
          <Text style={styles.readingTitle}>{item.title}</Text>
          {item.source ? <Text style={styles.readingSource}>来源: {item.source}</Text> : null}
          <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>
        </View>
      );
    }
    return <Text style={styles.noteContent} numberOfLines={4}>{item.content}</Text>;
  };

  return (
    <Screen safeAreaEdges={['left', 'right', 'bottom']} backgroundColor="#F0F0F3">
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>笔记</Text>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <FontAwesome6 name="plus" size={16} color="#FFF" />
        </TouchableOpacity>
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
                style={[styles.tab, isActive && { backgroundColor: tabConfig.bgColor }]}
                onPress={() => setActiveTab(tab)}
              >
                <FontAwesome6
                  name={tabConfig.icon as any}
                  size={14}
                  color={isActive ? tabConfig.color : '#636E72'}
                />
                <Text style={[styles.tabText, isActive && { color: tabConfig.color }]}>
                  {tabConfig.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {notes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name={config.icon as any} size={48} color="#B2BEC3" />
            <Text style={styles.emptyText}>暂无{config.title}记录</Text>
            <Text style={styles.emptySubText}>点击右上角 + 添加第一条记录</Text>
          </View>
        ) : (
          notes.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.noteCard}
              onPress={() => openEditModal(item)}
              onLongPress={() => handleDelete(item.id)}
            >
              <View style={styles.shadowDark}>
                <View style={styles.shadowLight}>
                  <View style={styles.noteHeader}>
                    <View style={[styles.dateIcon, { backgroundColor: config.bgColor }]}>
                      <Text style={[styles.dateText, { color: config.color }]}>
                        {new Date(item.date).getDate()}
                      </Text>
                    </View>
                    <View style={styles.noteInfo}>
                      <Text style={styles.noteDate}>
                        {new Date(item.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                  {renderNoteContent(item)}
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
              <Text style={styles.modalTitle}>
                {editingItem ? '编辑' : '新增'}{config.title}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome6 name="xmark" size={20} color="#636E72" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {activeTab === 'money' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>今天观察到的</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={observation}
                      onChangeText={setObservation}
                      placeholder="描述你看到的与赚钱相关的事情..."
                      placeholderTextColor="#B2BEC3"
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
                      placeholderTextColor="#B2BEC3"
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
                      placeholderTextColor="#B2BEC3"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>来源（可选）</Text>
                    <TextInput
                      style={styles.textInput}
                      value={source}
                      onChangeText={setSource}
                      placeholder="作者、网站等..."
                      placeholderTextColor="#B2BEC3"
                    />
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>摘录内容</Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={content}
                      onChangeText={setContent}
                      placeholder="摘录的内容..."
                      placeholderTextColor="#B2BEC3"
                      multiline
                    />
                  </View>
                </>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>内容</Text>
                  <TextInput
                    style={[styles.textInput, styles.multilineInput]}
                    value={content}
                    onChangeText={setContent}
                    placeholder={
                      activeTab === 'review' ? '总结今天的工作...' :
                      activeTab === 'english' ? '今天学到的英语知识...' :
                      '今天学到的AI/副业知识...'
                    }
                    placeholderTextColor="#B2BEC3"
                    multiline
                  />
                </View>
              )}
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
    paddingBottom: 12,
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
  tabWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tabContainer: {
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E8E8EB',
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#636E72',
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
  noteCard: {
    marginBottom: 12,
  },
  shadowDark: {
    shadowColor: '#D1D9E6',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    borderRadius: 20,
  },
  shadowLight: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: -4, height: -4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    backgroundColor: '#F0F0F3',
    borderRadius: 20,
    padding: 16,
    elevation: 4,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
  },
  noteInfo: {
    marginLeft: 12,
  },
  noteDate: {
    fontSize: 13,
    color: '#636E72',
  },
  noteContent: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 22,
  },
  moneySection: {
    marginBottom: 12,
  },
  moneyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6C63FF',
    marginBottom: 4,
  },
  moneyContent: {
    fontSize: 14,
    color: '#2D3436',
    lineHeight: 20,
  },
  readingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  readingSource: {
    fontSize: 12,
    color: '#636E72',
    marginBottom: 8,
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
  textInput: {
    backgroundColor: '#E8E8EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2D3436',
  },
  multilineInput: {
    minHeight: 120,
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
