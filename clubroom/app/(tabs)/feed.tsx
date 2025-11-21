import React from 'react';
import { StyleSheet } from 'react-native';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SocialFeed } from '@/components/social/social-feed';
import { Spacing } from '@/constants/theme';
import { router } from 'expo-router';

export default function FeedScreen() {
  return (
    <PageContainer
      horizontalSpacing={0}
      gap={0}
      header={
        <PageHeader
          title="Social Feed"
          action="New Post"
          actionIcon="add"
          onActionPress={() => router.push('/(modal)/create-post')}
        />
      }
    >
      <SocialFeed />
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  // Styles handled by PageContainer and PageHeader
});
