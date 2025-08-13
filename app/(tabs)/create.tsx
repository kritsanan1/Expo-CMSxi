
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';
import { generateBlogContent, createBlogPost, BlogDraft } from '@/lib/api';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function CreateScreen() {
  const { user } = useAuth();
  const { canCreatePost, postsCount, maxPosts, incrementPostCount } = useSubscription();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<BlogDraft | null>(null);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiType, setAiType] = useState<'idea' | 'outline' | 'content'>('content');
  const [previewMode, setPreviewMode] = useState(false);
  
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadDraft();
  }, []);

  const loadDraft = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem('currentBlogDraft');
      if (savedDraft) {
        const draft: BlogDraft = JSON.parse(savedDraft);
        setCurrentDraft(draft);
        setTitle(draft.title);
        setContent(draft.markdown_content);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const draft: BlogDraft = {
        id: currentDraft?.id || Date.now().toString(),
        title,
        content: stripMarkdown(content),
        markdown_content: content,
        author_id: user?.id,
        created_at: currentDraft?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await AsyncStorage.setItem('currentBlogDraft', JSON.stringify(draft));
      setCurrentDraft(draft);
      
      // Save to drafts list
      const savedDrafts = await AsyncStorage.getItem('blogDrafts');
      let drafts: BlogDraft[] = savedDrafts ? JSON.parse(savedDrafts) : [];
      const existingIndex = drafts.findIndex(d => d.id === draft.id);
      
      if (existingIndex >= 0) {
        drafts[existingIndex] = draft;
      } else {
        drafts.unshift(draft);
      }

      await AsyncStorage.setItem('blogDrafts', JSON.stringify(drafts));
      Alert.alert('Success', 'Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft');
    }
  };

  const generateWithAI = async () => {
    if (!aiTopic.trim()) {
      Alert.alert('Error', 'Please enter a topic for AI generation');
      return;
    }

    setLoading(true);
    try {
      const result = await generateBlogContent(aiTopic, aiType);
      
      if (result.success) {
        if (aiType === 'content') {
          // Extract title and content from generated markdown
          const lines = result.content.split('\n');
          const titleLine = lines.find(line => line.startsWith('# '));
          if (titleLine) {
            setTitle(titleLine.substring(2));
            setContent(result.content);
          } else {
            setContent(result.content);
          }
        } else {
          setContent(content + '\n\n' + result.content);
        }
        setAiModalVisible(false);
        setAiTopic('');
      } else {
        Alert.alert('Error', 'Failed to generate content');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const publishPost = async () => {
    if (!canCreatePost) {
      Alert.alert(
        'Limit Reached',
        `You've reached your limit of ${maxPosts} posts this month. Upgrade to Pro for unlimited posts.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/subscription') },
        ]
      );
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to publish');
      return;
    }

    setLoading(true);
    try {
      const postData = {
        title: title.trim(),
        content: stripMarkdown(content),
        markdown_content: content,
        excerpt: excerpt.trim() || generateExcerpt(content),
        author_id: user.id,
        published: true,
        published_at: new Date().toISOString(),
      };

      const result = await createBlogPost(postData);
      
      if (result.success) {
        // Clear draft
        await AsyncStorage.removeItem('currentBlogDraft');
        incrementPostCount();
        
        Alert.alert('Success', 'Blog post published successfully!', [
          { text: 'OK', onPress: () => router.push('/(tabs)/') }
        ]);
        
        // Reset form
        setTitle('');
        setContent('');
        setExcerpt('');
        setCurrentDraft(null);
      } else {
        Alert.alert('Error', result.error || 'Failed to publish post');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const stripMarkdown = (markdown: string): string => {
    return markdown
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim();
  };

  const generateExcerpt = (content: string): string => {
    const plainText = stripMarkdown(content);
    return plainText.length > 200 ? plainText.substring(0, 200) + '...' : plainText;
  };

  const renderMarkdownPreview = (markdown: string) => {
    // Basic markdown preview (in a real app, you'd use a proper markdown renderer)
    const lines = markdown.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <Text key={index} style={styles.previewH1}>{line.substring(2)}</Text>;
      } else if (line.startsWith('## ')) {
        return <Text key={index} style={styles.previewH2}>{line.substring(3)}</Text>;
      } else if (line.startsWith('### ')) {
        return <Text key={index} style={styles.previewH3}>{line.substring(4)}</Text>;
      } else if (line.trim() === '') {
        return <View key={index} style={styles.previewSpacing} />;
      } else {
        return <Text key={index} style={styles.previewText}>{line}</Text>;
      }
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <LinearGradient
        colors={['#1f2937', '#374151']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={styles.headerTitle}>Write Blog Post</Text>
          <Text style={styles.headerSubtitle}>
            {postsCount}/{maxPosts} posts used this month
          </Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Title Input */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.inputCard}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            ref={titleInputRef}
            style={styles.titleInput}
            placeholder="Enter your blog post title..."
            placeholderTextColor="#6B7280"
            value={title}
            onChangeText={setTitle}
          />
        </Animatable.View>

        {/* Content Editor */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.editorCard}>
          <View style={styles.editorHeader}>
            <Text style={styles.inputLabel}>Content (Markdown)</Text>
            <View style={styles.editorControls}>
              <TouchableOpacity
                style={[styles.modeButton, !previewMode && styles.modeButtonActive]}
                onPress={() => setPreviewMode(false)}
              >
                <Text style={[styles.modeButtonText, !previewMode && styles.modeButtonTextActive]}>
                  Edit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, previewMode && styles.modeButtonActive]}
                onPress={() => setPreviewMode(true)}
              >
                <Text style={[styles.modeButtonText, previewMode && styles.modeButtonTextActive]}>
                  Preview
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {previewMode ? (
            <ScrollView style={styles.previewContainer}>
              {renderMarkdownPreview(content)}
            </ScrollView>
          ) : (
            <TextInput
              ref={contentInputRef}
              style={styles.contentEditor}
              placeholder="Start writing your blog post in markdown...

# Main Heading
## Subheading
**Bold text**
*Italic text*
- Bullet point
1. Numbered list

[Link text](https://example.com)"
              placeholderTextColor="#6B7280"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          )}

          <View style={styles.editorFooter}>
            <Text style={styles.characterCount}>
              {content.length} characters
            </Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={() => setAiModalVisible(true)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.aiButtonText}>✨ AI Assist</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Excerpt Input */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.inputCard}>
          <Text style={styles.inputLabel}>Excerpt (Optional)</Text>
          <TextInput
            style={styles.excerptInput}
            placeholder="Brief description of your post..."
            placeholderTextColor="#6B7280"
            value={excerpt}
            onChangeText={setExcerpt}
            multiline
            textAlignVertical="top"
          />
        </Animatable.View>

        {/* Action Buttons */}
        <Animatable.View animation="fadeInUp" delay={800} style={styles.actionsCard}>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.draftButton}
              onPress={saveDraft}
              disabled={loading}
            >
              <Text style={styles.draftButtonText}>💾 Save Draft</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.publishButton,
                (!canCreatePost || loading) && styles.publishButtonDisabled
              ]}
              onPress={publishPost}
              disabled={!canCreatePost || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.publishButtonText}>🚀 Publish</Text>
              )}
            </TouchableOpacity>
          </View>
          
          {!canCreatePost && (
            <Text style={styles.limitWarning}>
              You've reached your monthly limit. Upgrade to Pro for unlimited posts.
            </Text>
          )}
        </Animatable.View>
      </View>

      {/* AI Assistant Modal */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>AI Content Assistant</Text>
            <TouchableOpacity onPress={() => setAiModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalLabel}>What would you like to generate?</Text>
            <View style={styles.aiTypeButtons}>
              {[
                { key: 'idea', label: 'Ideas' },
                { key: 'outline', label: 'Outline' },
                { key: 'content', label: 'Full Content' }
              ].map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.aiTypeButton,
                    aiType === type.key && styles.aiTypeButtonActive
                  ]}
                  onPress={() => setAiType(type.key as any)}
                >
                  <Text style={[
                    styles.aiTypeButtonText,
                    aiType === type.key && styles.aiTypeButtonTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Topic or subject:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter a topic (e.g., 'React Native development')"
              placeholderTextColor="#6B7280"
              value={aiTopic}
              onChangeText={setAiTopic}
            />

            <TouchableOpacity
              style={[styles.generateButton, loading && styles.generateButtonDisabled]}
              onPress={generateWithAI}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.generateButtonText}>Generate Content</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  titleInput: {
    fontSize: 18,
    color: '#f9fafb',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    fontWeight: '600',
  },
  editorCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editorControls: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 4,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  modeButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  contentEditor: {
    fontSize: 16,
    color: '#f9fafb',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    minHeight: 300,
    textAlignVertical: 'top',
    fontFamily: 'monospace',
  },
  previewContainer: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    minHeight: 300,
    maxHeight: 400,
  },
  previewH1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f9fafb',
    marginBottom: 16,
  },
  previewH2: {
    fontSize: 20,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  previewH3: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
    marginBottom: 8,
  },
  previewSpacing: {
    height: 16,
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  characterCount: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  aiButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  excerptInput: {
    fontSize: 14,
    color: '#f9fafb',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionsCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  limitWarning: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#111827',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f9fafb',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 24,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
    marginBottom: 12,
  },
  aiTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  aiTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#374151',
    borderRadius: 8,
    alignItems: 'center',
  },
  aiTypeButtonActive: {
    backgroundColor: '#3B82F6',
  },
  aiTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  aiTypeButtonTextActive: {
    color: 'white',
  },
  modalInput: {
    fontSize: 16,
    color: '#f9fafb',
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#6B7280',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
