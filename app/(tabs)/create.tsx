
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

interface Draft {
  id: string;
  content: string;
  platforms: {
    twitter: boolean;
    linkedin: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

interface AISuggestion {
  id: string;
  content: string;
  tone: string;
}

export default function CreateScreen() {
  const { canCreatePost, postsCount, maxPosts, incrementPostCount } = useSubscription();
  const [content, setContent] = useState('');
  const [platforms, setPlatforms] = useState({
    twitter: false,
    linkedin: false,
  });
  const [loading, setLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentDraft, setCurrentDraft] = useState<Draft | null>(null);
  const textInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadDraft();
  }, []);

  const loadDraft = async () => {
    try {
      const savedDraft = await AsyncStorage.getItem('currentDraft');
      if (savedDraft) {
        const draft: Draft = JSON.parse(savedDraft);
        setCurrentDraft(draft);
        setContent(draft.content);
        setPlatforms(draft.platforms);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  const saveDraft = async () => {
    try {
      const draft: Draft = {
        id: currentDraft?.id || Date.now().toString(),
        content,
        platforms,
        createdAt: currentDraft?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('currentDraft', JSON.stringify(draft));
      setCurrentDraft(draft);
      
      // Save to drafts list
      const savedDrafts = await AsyncStorage.getItem('drafts');
      let drafts: Draft[] = savedDrafts ? JSON.parse(savedDrafts) : [];
      const existingIndex = drafts.findIndex(d => d.id === draft.id);
      
      if (existingIndex >= 0) {
        drafts[existingIndex] = draft;
      } else {
        drafts.unshift(draft);
      }

      await AsyncStorage.setItem('drafts', JSON.stringify(drafts));
      Alert.alert('Success', 'Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      Alert.alert('Error', 'Failed to save draft');
    }
  };

  const generateAISuggestions = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content first');
      return;
    }

    setLoading(true);
    try {
      // Mock AI suggestions - Replace with actual Gemini API call
      const mockSuggestions: AISuggestion[] = [
        {
          id: '1',
          content: `${content} 🚀\n\nKey takeaways:\n• Innovation drives success\n• Consistency is key\n• Engage with your audience`,
          tone: 'Professional'
        },
        {
          id: '2',
          content: `${content} 💡\n\nWhat do you think? Drop your thoughts below! 👇\n\n#ContentCreation #SocialMedia`,
          tone: 'Casual'
        },
        {
          id: '3',
          content: `📈 ${content}\n\nThis strategy has helped countless creators:\n\n✅ Plan ahead\n✅ Stay consistent\n✅ Engage authentically\n\nYour turn to implement!`,
          tone: 'Motivational'
        }
      ];

      setTimeout(() => {
        setAiSuggestions(mockSuggestions);
        setShowSuggestions(true);
        setLoading(false);
      }, 1500);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to generate suggestions');
    }
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    setContent(suggestion.content);
    setShowSuggestions(false);
    textInputRef.current?.focus();
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

    if (!content.trim()) {
      Alert.alert('Error', 'Please enter some content');
      return;
    }

    const selectedPlatforms = Object.keys(platforms).filter(
      platform => platforms[platform as keyof typeof platforms]
    );

    if (selectedPlatforms.length === 0) {
      Alert.alert('Error', 'Please select at least one platform');
      return;
    }

    setLoading(true);
    try {
      // Mock API call to Ayrshare - Replace with actual API integration
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Save published post
      const post = {
        id: Date.now().toString(),
        content,
        platforms: selectedPlatforms,
        createdAt: new Date().toISOString(),
        status: 'published' as const,
        engagement: {
          likes: Math.floor(Math.random() * 50),
          shares: Math.floor(Math.random() * 20),
          comments: Math.floor(Math.random() * 15),
        }
      };

      const savedPosts = await AsyncStorage.getItem('posts');
      const posts = savedPosts ? JSON.parse(savedPosts) : [];
      posts.unshift(post);
      await AsyncStorage.setItem('posts', JSON.stringify(posts));

      // Clear draft
      await AsyncStorage.removeItem('currentDraft');
      
      // Increment post count
      incrementPostCount();

      Alert.alert('Success', 'Post published successfully!');
      
      // Reset form
      setContent('');
      setPlatforms({ twitter: false, linkedin: false });
      setCurrentDraft(null);
      
    } catch (error) {
      Alert.alert('Error', 'Failed to publish post');
    } finally {
      setLoading(false);
    }
  };

  const characterCount = content.length;
  const twitterLimit = 280;
  const linkedinLimit = 3000;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={styles.headerTitle}>Create Content</Text>
          <Text style={styles.headerSubtitle}>
            {postsCount}/{maxPosts} posts used this month
          </Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Content Editor */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.editorCard}>
          <Text style={styles.sectionTitle}>Your Content</Text>
          <TextInput
            ref={textInputRef}
            style={styles.textEditor}
            placeholder="What's on your mind? Share your thoughts..."
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            placeholderTextColor="#9CA3AF"
          />
          
          <View style={styles.editorFooter}>
            <Text style={[
              styles.characterCount,
              { color: characterCount > twitterLimit ? '#EF4444' : '#6B7280' }
            ]}>
              {characterCount} characters
            </Text>
            <TouchableOpacity
              style={styles.aiButton}
              onPress={generateAISuggestions}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text style={styles.aiButtonText}>✨ AI Enhance</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* AI Suggestions */}
        {showSuggestions && (
          <Animatable.View animation="slideInUp" style={styles.suggestionsCard}>
            <Text style={styles.sectionTitle}>AI Suggestions</Text>
            {aiSuggestions.map((suggestion, index) => (
              <Animatable.View
                key={suggestion.id}
                animation="fadeInUp"
                delay={index * 100}
                style={styles.suggestionItem}
              >
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionTone}>{suggestion.tone}</Text>
                  <TouchableOpacity
                    style={styles.applySuggestionButton}
                    onPress={() => applySuggestion(suggestion)}
                  >
                    <Text style={styles.applySuggestionText}>Apply</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.suggestionContent} numberOfLines={3}>
                  {suggestion.content}
                </Text>
              </Animatable.View>
            ))}
            <TouchableOpacity
              style={styles.closeSuggestions}
              onPress={() => setShowSuggestions(false)}
            >
              <Text style={styles.closeSuggestionsText}>Close</Text>
            </TouchableOpacity>
          </Animatable.View>
        )}

        {/* Platform Selection */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.platformCard}>
          <Text style={styles.sectionTitle}>Select Platforms</Text>
          
          <View style={styles.platformItem}>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>🐦 Twitter</Text>
              <Text style={styles.platformLimit}>
                {characterCount > twitterLimit && '⚠️ '}{characterCount}/{twitterLimit}
              </Text>
            </View>
            <Switch
              value={platforms.twitter}
              onValueChange={(value) => setPlatforms(prev => ({ ...prev, twitter: value }))}
              trackColor={{ false: '#F3F4F6', true: '#3B82F6' }}
              thumbColor={platforms.twitter ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>

          <View style={styles.platformItem}>
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>💼 LinkedIn</Text>
              <Text style={styles.platformLimit}>
                {characterCount}/{linkedinLimit}
              </Text>
            </View>
            <Switch
              value={platforms.linkedin}
              onValueChange={(value) => setPlatforms(prev => ({ ...prev, linkedin: value }))}
              trackColor={{ false: '#F3F4F6', true: '#3B82F6' }}
              thumbColor={platforms.linkedin ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </Animatable.View>

        {/* Action Buttons */}
        <Animatable.View animation="fadeInUp" delay={600} style={styles.actionsCard}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    color: 'rgba(255, 255, 255, 0.8)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  editorCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  textEditor: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    padding: 0,
  },
  editorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  characterCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  aiButton: {
    backgroundColor: '#F3F4F6',
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
  suggestionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionItem: {
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionTone: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  applySuggestionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  applySuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  suggestionContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  closeSuggestions: {
    alignSelf: 'center',
    paddingVertical: 8,
  },
  closeSuggestionsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  platformCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  platformItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  platformLimit: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  publishButtonDisabled: {
    backgroundColor: '#9CA3AF',
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
});
