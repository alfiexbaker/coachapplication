import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { SocialLinksEditor } from '@/components/profile/social-links-editor';
import { EditPhotoSection } from '@/components/profile/edit-photo-section';
import { EditBasicInfo } from '@/components/profile/edit-basic-info';
import { EditContactInfo } from '@/components/profile/edit-contact-info';
import { EditChildrenSection } from '@/components/profile/edit-children-section';
import { EditPricingSection } from '@/components/profile/edit-pricing-section';
import { EditSpecialtiesSection } from '@/components/profile/edit-specialties-section';
import { EditExperienceSection } from '@/components/profile/edit-experience-section';
import { EditLanguagesSection } from '@/components/profile/edit-languages-section';
import { EditCertificationsSection } from '@/components/profile/edit-certifications-section';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEditProfile } from '@/hooks/use-edit-profile';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const profile = useEditProfile();

  const coverPhotoUrl = profile.userIsCoach ? profile.coach?.coverPhotoUrl : undefined;
  const profilePhotoUrl = profile.userIsCoach
    ? profile.coach?.profilePhotoUrl
    : profile.user?.profilePhotoUrl;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <PageHeader title="Edit Profile" showBack action="Save" onActionPress={profile.handleSave} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrapper}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <EditPhotoSection
            colors={colors}
            userIsCoach={profile.userIsCoach}
            coverPhotoUrl={coverPhotoUrl}
            profilePhotoUrl={profilePhotoUrl}
            onPickImage={profile.pickImage}
          />

          <EditBasicInfo
            colors={colors}
            userIsCoach={profile.userIsCoach}
            fullName={profile.fullName}
            onChangeName={profile.setFullName}
            bio={profile.bio}
            onChangeBio={profile.setBio}
          />

          <EditContactInfo
            colors={colors}
            userIsCoach={profile.userIsCoach}
            email={profile.email}
            onChangeEmail={profile.setEmail}
            phone={profile.phone}
            onChangePhone={profile.setPhone}
            website={profile.website}
            onChangeWebsite={profile.setWebsite}
          />

          {!profile.userIsCoach && (
            <EditChildrenSection
              colors={colors}
              children={profile.children}
              onAddChild={profile.addChild}
              onUpdateChild={profile.updateChild}
              onRemoveChild={profile.removeChild}
            />
          )}

          {profile.userIsCoach && (
            <>
              <EditPricingSection
                colors={colors}
                priceMin={profile.priceMin}
                onChangeMin={profile.setPriceMin}
                priceMax={profile.priceMax}
                onChangeMax={profile.setPriceMax}
              />

              <EditSpecialtiesSection
                colors={colors}
                objectives={profile.footballObjectives}
                selectedFocuses={profile.selectedFocuses}
                onToggleFocus={profile.toggleFocus}
              />

              <EditExperienceSection
                colors={colors}
                experiences={profile.experiences}
                onOpenModal={profile.openExperienceModal}
                onRemove={profile.removeExperience}
                modalVisible={profile.isExperienceModalVisible}
                draft={profile.experienceDraft}
                onDraftChange={profile.setExperienceDraft}
                onSave={profile.saveExperience}
                onCloseModal={() => profile.setExperienceModalVisible(false)}
              />

              <EditLanguagesSection
                colors={colors}
                languages={profile.languages}
                onOpenModal={profile.openLanguageModal}
                onRemove={profile.removeLanguage}
                onQuickAdd={profile.quickAddLanguage}
                languageOptions={profile.languageOptions}
                proficiencyOptions={profile.proficiencyOptions}
                modalVisible={profile.isLanguageModalVisible}
                draft={profile.languageDraft}
                onDraftChange={profile.setLanguageDraft}
                onSave={profile.saveLanguage}
                onCloseModal={() => profile.setLanguageModalVisible(false)}
              />

              <SurfaceCard style={styles.section}>
                <SocialLinksEditor
                  socialLinks={profile.socialLinks}
                  onChange={profile.setSocialLinks}
                />
              </SurfaceCard>

              <EditCertificationsSection
                colors={colors}
                certifications={profile.certifications}
                onOpenModal={profile.openCertificationModal}
                onRemove={profile.removeCertification}
                modalVisible={profile.isCertificationModalVisible}
                draft={profile.certificationDraft}
                onDraftChange={profile.setCertificationDraft}
                onSave={profile.saveCertification}
                onCloseModal={() => profile.setCertificationModalVisible(false)}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  wrapper: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  section: { gap: Spacing.md },
});
