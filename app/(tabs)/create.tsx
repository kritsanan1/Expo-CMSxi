
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getTrendingTopics, generateContentIdeas, TrendingTopic } from '@/lib/api';

const { width } = Dimensions.get('window');

export default function TrendingTopicsScreen() {
  const { user } = useAuth();
  const { isSubscribed } = useSubscription();
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TrendingTopic | null>(null);
  const [contentIdeas, setContentIdeas] = useState<string>('');
  const [selectedPlatform, setSelectedPlatform] = useState<'twitter' | 'linkedin'>('twitter');
  const [customTopic, setCustomTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [industry, setIndustry] = useState('general business');
  
  const customTopicRef = useRef<TextInput>(null);

  useEffect(() => {
    loadTrendingTopics();
  }, [industry]);

  const loadTrendingTopics = async () => {
    setLoading(true);
    try {
      const result = await getTrendingTopics(industry);
      if (result.success) {
        setTrendingTopics(result.data);
      }
    } catch (error) {
      console.error('Error loading trending topics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicSelect = async (topic: TrendingTopic) => {
    if (!isSubscribed && trendingTopics.indexOf(topic) >= 3) {
      Alert.alert(
        'Premium Feature',
        'Upgrade to Pro to access all trending topics and content suggestions.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Upgrade', onPress: () => {} }
        ]
      );
      return;
    }

    setSelectedTopic(topic);
    setLoading(true);
    
    try {
      const result = await generateContentIdeas(topic.topic, selectedPlatform);
      if (result.success) {
        setContentIdeas(result.content);
      } else {
        setContentIdeas('Failed to generate content ideas. Please try again.');
      }
    } catch (error) {
      console.error('Error generating content ideas:', error);
      setContentIdeas('Error generating content ideas.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomTopicSubmit = async () => {
    if (!customTopic.trim()) return;
    
    const customTopicData: TrendingTopic = {
      topic: customTopic,
      volume: 0,
      category: 'Custom',
      suggested_content: '',
      hashtags: []
    };
    
    setSelectedTopic(customTopicData);
    setLoading(true);
    
    try {
      const result = await generateContentIdeas(customTopic, selectedPlatform);
      if (result.success) {
        setContentIdeas(result.content);
      }
    } catch (error) {
      console.error('Error generating custom content:', error);
    } finally {
      setLoading(false);
    }
  };

  const industries = [
    'general business',
    'technology',
    'marketing',
    'healthcare',
    'finance',
    'education',
    'retail',
    'real estate'
  ];

  const getVolumeColor = (volume: number) => {
    if (volume >= 80) return '#EF4444'; // High
    if (volume >= 60) return '#F59E0B'; // Medium-High
    if (volume >= 40) return '#10B981'; // Medium
    return '#6B7280'; // Low
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      >
        <Animatable.View animation="fadeInUp" duration={800}>
          <Text style={styles.headerTitle}>Trending Topics</Text>
          <Text style={styles.headerSubtitle}>
            Discover what's trending and get AI-powered content ideas
          </Text>
        </Animatable.View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Industry Selection */}
        <Animatable.View animation="fadeInUp" delay={200} style={styles.industryCard}>
          <Text style={styles.sectionTitle}>Industry Focus</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.industryScroll}
          >
            {industries.map((ind) => (
              <TouchableOpacity
                key={ind}
                style={[
                  styles.industryChip,
                  industry === ind && styles.industryChipActive
                ]}
                onPress={() => setIndustry(ind)}
              >
                <Text style={[
                  styles.industryChipText,
                  industry === ind && styles.industryChipTextActive
                ]}>
                  {ind.charAt(0).toUpperCase() + ind.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animatable.View>

        {/* Platform Selection */}
        <Animatable.View animation="fadeInUp" delay={300} style={styles.platformCard}>
          <Text style={styles.sectionTitle}>Target Platform</Text>
          <View style={styles.platformButtons}>
            <TouchableOpacity
              style={[
                styles.platformButton,
                selectedPlatform === 'twitter' && styles.platformButtonActive
              ]}
              onPress={() => setSelectedPlatform('twitter')}
            >
              <Text style={styles.platformEmoji}>🐦</Text>
              <Text style={[
                styles.platformButtonText,
                selectedPlatform === 'twitter' && styles.platformButtonTextActive
              ]}>
                Twitter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.platformButton,
                selectedPlatform === 'linkedin' && styles.platformButtonActive
              ]}
              onPress={() => setSelectedPlatform('linkedin')}
            >
              <Text style={styles.platformEmoji}>💼</Text>
              <Text style={[
                styles.platformButtonText,
                selectedPlatform === 'linkedin' && styles.platformButtonTextActive
              ]}>
                LinkedIn
              </Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Custom Topic Input */}
        <Animatable.View animation="fadeInUp" delay={400} style={styles.customTopicCard}>
          <Text style={styles.sectionTitle}>Custom Topic</Text>
          <View style={styles.customTopicRow}>
            <TextInput
              ref={customTopicRef}
              style={styles.customTopicInput}
              placeholder="Enter your own topic..."
              placeholderTextColor="#94A3B8"
              value={customTopic}
              onChangeText={setCustomTopic}
              onSubmitEditing={handleCustomTopicSubmit}
            />
            <TouchableOpacity
              style={styles.customTopicButton}
              onPress={handleCustomTopicSubmit}
              disabled={!customTopic.trim() || loading}
            >
              <Text style={styles.customTopicButtonText}>✨ Generate</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Trending Topics */}
        <Animatable.View animation="fadeInUp" delay={500} style={styles.topicsCard}>
          <View style={styles.topicsHeader}>
            <Text style={styles.sectionTitle}>🔥 Trending Now</Text>
            <TouchableOpacity 
              onPress={loadTrendingTopics}
              disabled={loading}
            >
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          
          {loading && !selectedTopic ? (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Loading trending topics...</Text>
            </View>
          ) : (
            trendingTopics.map((topic, index) => {
              const isLocked = !isSubscribed && index >= 3;
              
              return (
                <Animatable.View
                  key={index}
                  animation="fadeInUp"
                  delay={600 + index * 100}
                >
                  <TouchableOpacity
                    style={[
                      styles.topicItem,
                      selectedTopic?.topic === topic.topic && styles.topicItemActive,
                      isLocked && styles.topicItemLocked
                    ]}
                    onPress={() => handleTopicSelect(topic)}
                    disabled={loading}
                  >
                    <View style={styles.topicContent}>
                      <View style={styles.topicHeader}>
                        <Text style={styles.topicTitle}>
                          {topic.topic}
                          {isLocked && ' 🔒'}
                        </Text>
                        <View style={[
                          styles.volumeBadge,
                          { backgroundColor: getVolumeColor(topic.volume) }
                        ]}>
                          <Text style={styles.volumeText}>{topic.volume}</Text>
                        </View>
                      </View>
                      
                      <Text style={styles.topicCategory}>{topic.category}</Text>
                      <Text style={styles.topicDescription} numberOfLines={2}>
                        {topic.suggested_content}
                      </Text>
                      
                      <View style={styles.hashtagsContainer}>
                        {topic.hashtags.slice(0, 3).map((hashtag, hashIndex) => (
                          <Text key={hashIndex} style={styles.hashtag}>
                            {hashtag}
                          </Text>
                        ))}
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animatable.View>
              );
            })
          )}
        </Animatable.View>

        {/* Content Ideas */}
        {selectedTopic && (
          <Animatable.View animation="fadeInUp" delay={800} style={styles.contentIdeasCard}>
            <Text style={styles.sectionTitle}>
              💡 Content Ideas for "{selectedTopic.topic}"
            </Text>
            
            {loading ? (
              <View style={styles.loadingState}>
                <Text style={styles.loadingText}>Generating content ideas...</Text>
              </View>
            ) : (
              <View style={styles.contentIdeasContainer}>
                <Text style={styles.contentIdeasText}>
                  {contentIdeas}
                </Text>
              </View>
            )}
          </Animatable.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  industryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  industryScroll: {
    flexDirection: 'row',
  },
  industryChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  industryChipActive: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  industryChipText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  industryChipTextActive: {
    color: 'white',
  },
  platformCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  platformButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  platformButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  platformButtonActive: {
    backgroundColor: '#EBF4FF',
    borderColor: '#1E40AF',
  },
  platformEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  platformButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  platformButtonTextActive: {
    color: '#1E40AF',
  },
  customTopicCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  customTopicRow: {
    flexDirection: 'row',
    gap: 12,
  },
  customTopicInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  customTopicButton: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  customTopicButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  topicsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  topicsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '600',
  },
  topicItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topicItemActive: {
    backgroundColor: '#EBF4FF',
    borderColor: '#1E40AF',
  },
  topicItemLocked: {
    opacity: 0.6,
  },
  topicContent: {
    flex: 1,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginRight: 12,
  },
  volumeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  volumeText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  topicCategory: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    marginBottom: 8,
  },
  topicDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hashtag: {
    fontSize: 12,
    color: '#1E40AF',
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  contentIdeasCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  contentIdeasContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  contentIdeasText: {
    fontSize: 14,
    color: '#1E293B',
    lineHeight: 22,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
});
