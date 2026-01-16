import { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ScreenHeader } from '@/components/primitives/screen-header';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Components } from '@/constants/theme';
import { coachProfiles } from '@/constants/mock-data';
import {
  CoachPost,
  CoachExperience,
  CoachCertification,
  CoachLanguage,
  SessionOffering,
} from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { SocialLinks } from '@/components/profile/social-links';
import { followService } from '@/services/follow-service';

type TabType = 'posts' | 'about' | 'photos' | 'sessions' | 'reviews';

export default function CoachProfileScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser, logout } = useAuth();

  // For demo, use first coach profile - in production, use currentUser.id
  const coach = coachProfiles[0];

  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Following system state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // Go-Live state
  const [isLive, setIsLive] = useState(currentUser?.isLive ?? false);
  const [liveLoading, setLiveLoading] = useState(false);

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser?.role === 'COACH' && currentUser?.id === coach?.id;

  // Load following status and follower count
  useEffect(() => {
    const loadFollowData = async () => {
      if (!currentUser || !coach) return;

      try {
        const [following, count] = await Promise.all([
          followService.isFollowing(currentUser.id, coach.id),
          followService.getFollowerCount(coach.id),
        ]);
        setIsFollowing(following);
        setFollowerCount(count);
      } catch (error) {
        console.error('Failed to load follow data:', error);
      }
    };

    loadFollowData();
  }, [currentUser, coach]);

  // Handle follow/unfollow action
  const handleFollowToggle = useCallback(async () => {
    if (!currentUser || !coach || followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        await followService.unfollow(currentUser.id, coach.id);
        setIsFollowing(false);
        setFollowerCount((prev) => Math.max(0, prev - 1));
      } else {
        await followService.follow({
          followerId: currentUser.id,
          followerName: currentUser.name || currentUser.fullName || 'User',
          followerType: currentUser.role === 'COACH' ? 'COACH' : 'USER',
          followingId: coach.id,
          followingName: coach.fullName,
          followingType: 'COACH',
          followingAvatar: coach.profilePhotoUrl,
        });
        setIsFollowing(true);
        setFollowerCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [currentUser, coach, isFollowing, followLoading]);

  // Profile completion check for go-live
  const getProfileCompletion = () => {
    const checks = [
      { label: 'Profile photo', done: !!coach?.profilePhotoUrl, icon: 'camera' as const },
      { label: 'Bio written', done: !!(coach?.bio || coach?.shortBio), icon: 'document-text' as const },
      { label: 'Hourly rate set', done: !!(coach?.sessionRate && coach.sessionRate > 0), icon: 'cash' as const },
      { label: 'At least 1 certification', done: !!(coach?.certifications && coach.certifications.length > 0), icon: 'ribbon' as const },
      { label: 'Availability set', done: true, icon: 'calendar' as const }, // Assume set for demo
    ];
    const completed = checks.filter(c => c.done).length;
    return { checks, completed, total: checks.length, percentage: Math.round((completed / checks.length) * 100) };
  };

  const profileCompletion = getProfileCompletion();
  const canGoLive = profileCompletion.percentage >= 80;

  // Handle go-live toggle
  const handleGoLiveToggle = async (value: boolean) => {
    if (!canGoLive && value) {
      Alert.alert(
        'Complete Your Profile',
        'You need to complete at least 80% of your profile before going live. Complete the missing items to start receiving bookings.',
        [{ text: 'OK' }]
      );
      return;
    }

    setLiveLoading(true);
    try {
      // In production, this would call an API
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsLive(value);

      if (value) {
        Alert.alert(
          'You\'re Live! 🎉',
          'Athletes can now discover and book sessions with you.',
          [{ text: 'Great!' }]
        );
      }
    } catch (error) {
      console.error('Failed to update live status:', error);
      Alert.alert('Error', 'Failed to update your status. Please try again.');
    } finally {
      setLiveLoading(false);
    }
  };

  // Load coach's session offerings
  useEffect(() => {
    const loadSessionOfferings = async () => {
      try {
        const stored = await AsyncStorage.getItem('session_offerings');
        if (stored) {
          const offerings: SessionOffering[] = JSON.parse(stored);
          const coachOfferings = offerings.filter(o => o.coachId === coach.id && o.status === 'active');
          setSessionOfferings(coachOfferings);
        }
      } catch (error) {
        console.error('Failed to load session offerings', error);
      }
    };
    loadSessionOfferings();
  }, [coach.id]);

  const renderTabButton = (tab: TabType, label: string) => (
    <Pressable
      onPress={() => setActiveTab(tab)}
      style={[
        styles.tabButton,
        activeTab === tab && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
      ]}>
      <ThemedText
        style={[styles.tabText, activeTab === tab && { fontWeight: '700', color: palette.tint }]}>
        {label}
      </ThemedText>
    </Pressable>
  );

  const renderPost = ({ item }: { item: CoachPost }) => (
    <SurfaceCard style={styles.postCard}>
      <View style={styles.postHeader}>
        <Image source={{ uri: coach.profilePhotoUrl }} style={styles.postAvatar} />
        <View style={styles.postHeaderText}>
          <ThemedText type="subtitle">{coach.fullName}</ThemedText>
          <ThemedText style={styles.postDate}>
            {new Date(item.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={styles.postContent}>{item.content}</ThemedText>

      {item.mediaUrls && item.mediaUrls.length > 0 && (
        <View style={styles.postMedia}>
          {item.mediaType === 'photo' &&
            item.mediaUrls.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.postImage} />
            ))}
        </View>
      )}

      <View style={styles.postActions}>
        <Pressable style={styles.actionButton}>
          <Ionicons name="heart-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.actionText}>{item.likes}</ThemedText>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="chatbubble-outline" size={20} color={palette.foreground} />
          <ThemedText style={styles.actionText}>{item.comments}</ThemedText>
        </Pressable>
        <Pressable style={styles.actionButton}>
          <Ionicons name="share-outline" size={20} color={palette.foreground} />
        </Pressable>
      </View>
    </SurfaceCard>
  );

  const renderExperience = (exp: CoachExperience) => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
    };

    return (
      <View key={exp.id} style={styles.experienceItem}>
        <View style={styles.experienceIcon}>
          <Ionicons name="briefcase" size={20} color={palette.tint} />
        </View>
        <View style={styles.experienceContent}>
          <ThemedText type="subtitle">{exp.title}</ThemedText>
          <ThemedText style={styles.experienceOrg}>{exp.organization}</ThemedText>
          <ThemedText style={styles.experienceDate}>
            {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate!)}
          </ThemedText>
          {exp.description && (
            <ThemedText style={styles.experienceDesc}>{exp.description}</ThemedText>
          )}
        </View>
        {currentUser?.role === 'COACH' && (
          <Pressable
            onPress={() => alert('Edit experience: ' + exp.title)}
            style={styles.editButton}>
            <Ionicons name="pencil" size={16} color={palette.muted} />
          </Pressable>
        )}
      </View>
    );
  };

  const renderCertification = (cert: CoachCertification) => {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const isExpiring = cert.expiryDate
      ? new Date(cert.expiryDate).getTime() - Date.now() < 90 * 24 * 60 * 60 * 1000
      : false;

    return (
      <View key={cert.id} style={styles.certItem}>
        <View style={styles.certIcon}>
          <Ionicons
            name={isExpiring ? 'warning' : 'ribbon'}
            size={20}
            color={isExpiring ? palette.warning : palette.success}
          />
        </View>
        <View style={styles.certContent}>
          <ThemedText type="subtitle">{cert.name}</ThemedText>
          <ThemedText style={styles.certIssuer}>{cert.issuer}</ThemedText>
          <ThemedText style={styles.certDate}>
            Issued {formatDate(cert.issueDate)}
            {cert.expiryDate && ` • Expires ${formatDate(cert.expiryDate)}`}
          </ThemedText>
          {isExpiring && (
            <ThemedText style={[styles.certWarning, { color: palette.warning }]}>
              Expiring soon - renewal required
            </ThemedText>
          )}
        </View>
        {currentUser?.role === 'COACH' && (
          <Pressable
            onPress={() => alert('Edit certification: ' + cert.name)}
            style={styles.editButton}>
            <Ionicons name="pencil" size={16} color={palette.muted} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScreenHeader
        title="Coach Profile"
        subtitle="Your coaching identity"
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Go-Live Card - Only for coaches viewing their own profile */}
        {currentUser?.role === 'COACH' && (
          <View style={styles.goLiveSection}>
            <SurfaceCard style={styles.goLiveCard}>
              <View style={styles.goLiveHeader}>
                <View style={styles.goLiveInfo}>
                  <View style={styles.goLiveTitleRow}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: isLive ? palette.success : palette.muted }
                    ]} />
                    <ThemedText type="subtitle">
                      {isLive ? 'You\'re Live' : 'Profile Offline'}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.goLiveSubtitle, { color: palette.muted }]}>
                    {isLive
                      ? 'Athletes can find and book you'
                      : 'Go live to start receiving bookings'}
                  </ThemedText>
                </View>
                <Switch
                  value={isLive}
                  onValueChange={handleGoLiveToggle}
                  trackColor={{ false: palette.border, true: palette.success }}
                  thumbColor="#fff"
                  disabled={liveLoading}
                />
              </View>

              {/* Progress bar */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <ThemedText style={[styles.progressLabel, { color: palette.muted }]}>
                    Profile completion
                  </ThemedText>
                  <ThemedText style={[styles.progressPercent, { color: canGoLive ? palette.success : palette.warning }]}>
                    {profileCompletion.percentage}%
                  </ThemedText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        backgroundColor: canGoLive ? palette.success : palette.warning,
                        width: `${profileCompletion.percentage}%`,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Checklist */}
              {!canGoLive && (
                <View style={styles.checklistSection}>
                  {profileCompletion.checks.map((check, index) => (
                    <View key={index} style={styles.checklistItem}>
                      <Ionicons
                        name={check.done ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={check.done ? palette.success : palette.muted}
                      />
                      <ThemedText
                        style={[
                          styles.checklistLabel,
                          { color: check.done ? palette.foreground : palette.muted },
                        ]}
                      >
                        {check.label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </SurfaceCard>
          </View>
        )}

        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          {coach.coverPhotoUrl ? (
            <Image source={{ uri: coach.coverPhotoUrl }} style={styles.coverPhoto} />
          ) : (
            <View style={[styles.coverPhoto, { backgroundColor: palette.border }]} />
          )}
        </View>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} />
            {currentUser?.role === 'Coach' && (
              <Pressable style={[styles.editAvatarButton, { backgroundColor: palette.tint }]}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          <View style={styles.profileInfo}>
            <ThemedText type="title">{coach.fullName}</ThemedText>
            <ThemedText style={styles.schoolName}>{coach.schoolName}</ThemedText>
            <ThemedText style={styles.location}>
              {coach.city}, {coach.state}
            </ThemedText>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText type="subtitle">{coach.totalSessions}</ThemedText>
                <ThemedText style={styles.statLabel}>Sessions</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="subtitle">{followerCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Followers</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="subtitle">{coach.rating.average.toFixed(1)}</ThemedText>
                <ThemedText style={styles.statLabel}>Rating</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText type="subtitle">{coach.rating.reviewCount}</ThemedText>
                <ThemedText style={styles.statLabel}>Reviews</ThemedText>
              </View>
            </View>

            {/* Follow Button - shown when viewing another coach's profile */}
            {!isOwnProfile && currentUser && (
              <Pressable
                style={({ pressed }) => [
                  styles.followButton,
                  isFollowing
                    ? [styles.followingButton, { borderColor: palette.tint }]
                    : { backgroundColor: palette.tint },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleFollowToggle}
                disabled={followLoading}>
                {followLoading ? (
                  <ActivityIndicator size="small" color={isFollowing ? palette.tint : '#FFFFFF'} />
                ) : (
                  <>
                    <Ionicons
                      name={isFollowing ? 'checkmark' : 'add'}
                      size={18}
                      color={isFollowing ? palette.tint : '#FFFFFF'}
                    />
                    <ThemedText
                      style={[
                        styles.followButtonText,
                        { color: isFollowing ? palette.tint : '#FFFFFF' },
                      ]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            )}

            {coach.badges && coach.badges.length > 0 && (
              <View style={styles.badgesRow}>
                {coach.badges.map((badge) => (
                  <View
                    key={badge.id}
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          badge.tone === 'success'
                            ? `${palette.success}20`
                            : badge.tone === 'warning'
                              ? `${palette.warning}20`
                              : `${palette.tint}20`,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.badgeText,
                        {
                          color:
                            badge.tone === 'success'
                              ? palette.success
                              : badge.tone === 'warning'
                                ? palette.warning
                                : palette.tint,
                        },
                      ]}>
                      {badge.label}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {currentUser?.role === 'Coach' && (
              <Pressable
                style={[styles.editProfileButton, { backgroundColor: palette.tint }]}
                onPress={() => router.push('/(tabs)/edit-profile')}>
                <ThemedText style={styles.editProfileText} lightColor="#FFFFFF" darkColor="#000000">
                  Edit Profile
                </ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
          {renderTabButton('posts', 'Posts')}
          {renderTabButton('about', 'About')}
          {renderTabButton('sessions', 'Sessions')}
          {renderTabButton('photos', 'Photos')}
          {renderTabButton('reviews', 'Reviews')}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'posts' && (
            <>
              {currentUser?.role === 'Coach' && (
                <Pressable
                  style={[styles.createPostButton, { backgroundColor: palette.card }]}
                  onPress={() => alert('Create post')}>
                  <Ionicons name="add-circle" size={24} color={palette.tint} />
                  <ThemedText style={styles.createPostText}>Share an update...</ThemedText>
                </Pressable>
              )}

              {coach.posts && coach.posts.length > 0 ? (
                coach.posts.map((post) => <View key={post.id}>{renderPost({ item: post })}</View>)
              ) : (
                <SurfaceCard style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No posts yet</ThemedText>
                </SurfaceCard>
              )}
            </>
          )}

          {activeTab === 'about' && (
            <View style={styles.aboutContent}>
              {/* Bio */}
              <SurfaceCard style={styles.section}>
                <ThemedText type="subtitle">About</ThemedText>
                <ThemedText style={styles.bio}>{coach.bio || coach.shortBio}</ThemedText>
              </SurfaceCard>

              {/* Contact Info */}
              <SurfaceCard style={styles.section}>
                <ThemedText type="subtitle">Contact Information</ThemedText>
                {coach.email && (
                  <Pressable
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(`mailto:${coach.email}`)}>
                    <Ionicons name="mail" size={20} color={palette.tint} />
                    <ThemedText style={styles.contactText}>{coach.email}</ThemedText>
                  </Pressable>
                )}
                {coach.phone && (
                  <Pressable
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(`tel:${coach.phone}`)}>
                    <Ionicons name="call" size={20} color={palette.tint} />
                    <ThemedText style={styles.contactText}>{coach.phone}</ThemedText>
                  </Pressable>
                )}
                {coach.website && (
                  <Pressable
                    style={styles.contactItem}
                    onPress={() => Linking.openURL(coach.website!)}>
                    <Ionicons name="globe" size={20} color={palette.tint} />
                    <ThemedText style={styles.contactText}>{coach.website}</ThemedText>
                  </Pressable>
                )}
              </SurfaceCard>

              {/* Social Links */}
              {coach.socialLinks && Object.values(coach.socialLinks).some(v => v) && (
                <SurfaceCard style={styles.section}>
                  <ThemedText type="subtitle">Social Media</ThemedText>
                  <SocialLinks socialLinks={coach.socialLinks} size="md" variant="icons" />
                </SurfaceCard>
              )}

              {/* Experience */}
              <SurfaceCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Experience</ThemedText>
                  {currentUser?.role === 'COACH' && (
                    <Pressable
                      onPress={() => alert('Add new experience')}
                      style={styles.addButton}>
                      <Ionicons name="add-circle" size={20} color={palette.tint} />
                      <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>
                        Add
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                {coach.experiences && coach.experiences.length > 0 ? (
                  coach.experiences.map(renderExperience)
                ) : (
                  <ThemedText style={styles.emptyText}>
                    No experience added yet. Share your coaching and playing background.
                  </ThemedText>
                )}
              </SurfaceCard>

              {/* Certifications */}
              <SurfaceCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText type="subtitle">Certifications & Licences</ThemedText>
                  {currentUser?.role === 'COACH' && (
                    <Pressable
                      onPress={() => alert('Add new certification')}
                      style={styles.addButton}>
                      <Ionicons name="add-circle" size={20} color={palette.tint} />
                      <ThemedText style={[styles.addButtonText, { color: palette.tint }]}>
                        Add
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                {coach.certifications && coach.certifications.length > 0 ? (
                  coach.certifications.map(renderCertification)
                ) : (
                  <ThemedText style={styles.emptyText}>
                    No certifications added yet. Add your FA, UEFA, or other coaching qualifications.
                  </ThemedText>
                )}
              </SurfaceCard>

              {/* Achievements */}
              {coach.achievements && coach.achievements.length > 0 && (
                <SurfaceCard style={styles.section}>
                  <ThemedText type="subtitle">Achievements</ThemedText>
                  {coach.achievements.map((achievement, index) => (
                    <View key={index} style={styles.achievementItem}>
                      <Ionicons name="trophy" size={18} color={palette.warning} />
                      <ThemedText style={styles.achievementText}>{achievement}</ThemedText>
                    </View>
                  ))}
                </SurfaceCard>
              )}

              {/* Languages */}
              {coach.languages && coach.languages.length > 0 && (
                <SurfaceCard style={styles.section}>
                  <ThemedText type="subtitle">Languages</ThemedText>
                  <View style={styles.languagesRow}>
                    {coach.languages.map((lang: CoachLanguage) => (
                      <View
                        key={lang.id}
                        style={[styles.languageTag, { backgroundColor: `${palette.tint}20` }]}>
                        <ThemedText style={[styles.languageText, { color: palette.tint }]}>
                          {lang.name}
                        </ThemedText>
                        <ThemedText style={[styles.languageLevel, { color: palette.muted }]}>
                          {lang.proficiency}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </SurfaceCard>
              )}

              {/* Specialties */}
              <SurfaceCard style={styles.section}>
                <ThemedText type="subtitle">Coaching Specialties</ThemedText>
                <View style={styles.specialtiesRow}>
                  {coach.footballFocuses.map((focus) => (
                    <View
                      key={focus}
                      style={[styles.specialtyTag, { backgroundColor: palette.card }]}>
                      <ThemedText style={styles.specialtyText}>{focus}</ThemedText>
                    </View>
                  ))}
                </View>
              </SurfaceCard>
            </View>
          )}

          {activeTab === 'photos' && (
            <View style={styles.photosGrid}>
              {coach.photoGallery && coach.photoGallery.length > 0 ? (
                coach.photoGallery.map((url, index) => (
                  <Image key={index} source={{ uri: url }} style={styles.gridPhoto} />
                ))
              ) : (
                <SurfaceCard style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No photos yet</ThemedText>
                </SurfaceCard>
              )}
            </View>
          )}

          {activeTab === 'sessions' && (
            <>
              {sessionOfferings.length > 0 ? (
                sessionOfferings.map((offering) => (
                  <SessionOfferingCard
                    key={offering.id}
                    offering={offering}
                    showCoach={false}
                    showCapacity={true}
                    onPress={() => {
                      setSelectedOffering(offering);
                      setShowDetailModal(true);
                    }}
                  />
                ))
              ) : (
                <SurfaceCard style={styles.emptyState}>
                  <ThemedText style={styles.emptyStateText}>No active sessions available</ThemedText>
                </SurfaceCard>
              )}
            </>
          )}

          {activeTab === 'reviews' && (
            <SurfaceCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No reviews yet</ThemedText>
            </SurfaceCard>
          )}
        </View>

        {/* Session Detail Modal */}
        <SessionDetailModal
          visible={showDetailModal}
          offering={selectedOffering}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedOffering(null);
          }}
          onUpdate={async () => {
            // Reload offerings after booking
            const stored = await AsyncStorage.getItem('session_offerings');
            if (stored) {
              const offerings: SessionOffering[] = JSON.parse(stored);
              const coachOfferings = offerings.filter(o => o.coachId === coach.id && o.status === 'active');
              setSessionOfferings(coachOfferings);
            }
          }}
        />

        {/* Coach Quick Access - Only visible to coach viewing their own profile */}
        {currentUser?.role === 'COACH' && (
          <View style={styles.quickAccessSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Quick Access
            </ThemedText>

            <SurfaceCard
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/more')}>
              <View style={styles.quickAccessRow}>
                <View style={[styles.quickAccessIcon, { backgroundColor: `${palette.success}15` }]}>
                  <Ionicons name="analytics" size={24} color={palette.success} />
                </View>
                <View style={styles.quickAccessText}>
                  <ThemedText type="defaultSemiBold">Analytics & Development</ThemedText>
                  <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
                    View athlete progress and session data
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              </View>
            </SurfaceCard>

            <SurfaceCard
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/availability')}>
              <View style={styles.quickAccessRow}>
                <View style={[styles.quickAccessIcon, { backgroundColor: `${palette.tint}15` }]}>
                  <Ionicons name="calendar" size={24} color={palette.tint} />
                </View>
                <View style={styles.quickAccessText}>
                  <ThemedText type="defaultSemiBold">Set Availability</ThemedText>
                  <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
                    Manage your coaching schedule
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              </View>
            </SurfaceCard>

            <SurfaceCard
              style={styles.quickAccessCard}
              onPress={() => router.push('/(tabs)/settings')}>
              <View style={styles.quickAccessRow}>
                <View style={[styles.quickAccessIcon, { backgroundColor: `${palette.accent}15` }]}>
                  <Ionicons name="settings" size={24} color={palette.accent} />
                </View>
                <View style={styles.quickAccessText}>
                  <ThemedText type="defaultSemiBold">Settings & Preferences</ThemedText>
                  <ThemedText style={[styles.quickAccessDesc, { color: palette.muted }]}>
                    Manage account, privacy, notifications & more
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={palette.muted} />
              </View>
            </SurfaceCard>

            {/* Sign Out Button */}
            <Pressable
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  borderColor: Colors.light.error,
                  backgroundColor: pressed ? `${Colors.light.error}10` : 'transparent',
                },
              ]}
              onPress={async () => {
                await logout();
                router.replace('/');
              }}>
              <Ionicons name="log-out-outline" size={20} color={Colors.light.error} />
              <ThemedText style={[styles.signOutText, { color: Colors.light.error }]}>
                Sign Out
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  // Go-Live Card Styles
  goLiveSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  goLiveCard: {
    gap: Spacing.md,
  },
  goLiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goLiveInfo: {
    flex: 1,
    gap: 2,
  },
  goLiveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  goLiveSubtitle: {
    fontSize: 13,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  checklistSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checklistLabel: {
    fontSize: 13,
  },
  coverContainer: {
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: 200,
  },
  profileHeader: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  avatarContainer: {
    marginTop: -50,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    gap: Spacing.xs,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.8,
  },
  location: {
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  statItem: {
    gap: 2,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editProfileButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  editProfileText: {
    fontWeight: '600',
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
    gap: Spacing.xs,
    marginTop: Spacing.md,
    minWidth: 120,
    height: 40,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  followButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  createPostText: {
    opacity: 0.6,
  },
  postCard: {
    gap: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postHeaderText: {
    flex: 1,
    gap: 2,
  },
  postDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  postContent: {
    lineHeight: 20,
  },
  postMedia: {
    gap: Spacing.xs,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: Radii.md,
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingTop: Spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 14,
  },
  aboutContent: {
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  bio: {
    lineHeight: 20,
    opacity: 0.8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  contactText: {
    flex: 1,
  },
  experienceItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  experienceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99,102,241,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  experienceContent: {
    flex: 1,
    gap: 2,
  },
  experienceOrg: {
    fontWeight: '500',
    opacity: 0.8,
  },
  experienceDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  experienceDesc: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
    lineHeight: 18,
  },
  certItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.md,
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,217,163,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  certContent: {
    flex: 1,
    gap: 2,
  },
  certIssuer: {
    fontWeight: '500',
    opacity: 0.8,
  },
  certDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  certWarning: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  editButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  achievementText: {
    flex: 1,
  },
  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  languageTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },
  languageText: {
    fontWeight: '600',
  },
  languageLevel: {
    fontSize: 12,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  specialtyTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  specialtyText: {
    fontWeight: '600',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridPhoto: {
    width: '32.5%',
    aspectRatio: 1,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyStateText: {
    opacity: 0.6,
  },
  // Quick Access Styles
  quickAccessSection: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  quickAccessCard: {
    padding: 0,
  },
  quickAccessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  quickAccessIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAccessText: {
    flex: 1,
    gap: 4,
  },
  quickAccessDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  signOutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1.5,
    marginTop: Spacing.sm,
  },
  signOutText: {
    fontWeight: '600',
    fontSize: 16,
  },
});
