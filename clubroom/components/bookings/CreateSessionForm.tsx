import { ScrollView, View, StyleSheet, TextInput, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FootballObjective } from '@/constants/types';
import { scale, scaleFont } from '@/utils/scale';

// Web-compatible clickable wrapper using Pressable
type ClickableProps = {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
};

function Clickable({ onPress, style, children }: ClickableProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [style, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export type SessionType = '1on1' | 'group';
export type RecurrenceType = 'none' | 'weekly';

export interface CreateSessionFormProps {
  // Form values
  sessionType: SessionType;
  onSessionTypeChange: (type: SessionType) => void;
  recurrenceType: RecurrenceType;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  sessionTitle: string;
  onSessionTitleChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  maxParticipants: string;
  onMaxParticipantsChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  showDatePicker: boolean;
  onShowDatePickerChange: (show: boolean) => void;
  showTimePicker: boolean;
  onShowTimePickerChange: (show: boolean) => void;
  price: string;
  onPriceChange: (value: string) => void;
  ageMin: string;
  onAgeMinChange: (value: string) => void;
  ageMax: string;
  onAgeMaxChange: (value: string) => void;
  footballSkill: FootballObjective | '';
  onFootballSkillChange: (skill: FootballObjective | '') => void;
  // Actions
  onSubmit: () => void;
}

export function CreateSessionForm({
  sessionType,
  onSessionTypeChange,
  recurrenceType,
  onRecurrenceTypeChange,
  sessionTitle,
  onSessionTitleChange,
  description,
  onDescriptionChange,
  maxParticipants,
  onMaxParticipantsChange,
  location,
  onLocationChange,
  selectedDate,
  onDateChange,
  showDatePicker,
  onShowDatePickerChange,
  showTimePicker,
  onShowTimePickerChange,
  price,
  onPriceChange,
  ageMin,
  onAgeMinChange,
  ageMax,
  onAgeMaxChange,
  footballSkill,
  onFootballSkillChange,
  onSubmit,
}: CreateSessionFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <ScrollView
      style={styles.formContainer}
      contentContainerStyle={styles.formContent}
      showsVerticalScrollIndicator={false}>
      {/* Session Type Selector */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Session Type
      </ThemedText>
      <View style={styles.sessionTypeContainer}>
        <Clickable
          onPress={() => onSessionTypeChange('1on1')}
          style={[
            styles.sessionTypeButton,
            {
              backgroundColor: sessionType === '1on1' ? palette.tint : palette.card,
              borderColor: sessionType === '1on1' ? palette.tint : palette.border,
            },
          ]}>
          <Ionicons
            name="person-outline"
            size={24}
            color={sessionType === '1on1' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
          />
          <ThemedText
            style={[
              styles.sessionTypeText,
              sessionType === '1on1' && {
                color: scheme === 'light' ? '#FFFFFF' : '#000000',
                fontWeight: '700',
              },
            ]}>
            1:1 Session
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={() => onSessionTypeChange('group')}
          style={[
            styles.sessionTypeButton,
            {
              backgroundColor: sessionType === 'group' ? palette.tint : palette.card,
              borderColor: sessionType === 'group' ? palette.tint : palette.border,
            },
          ]}>
          <Ionicons
            name="people-outline"
            size={24}
            color={sessionType === 'group' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
          />
          <ThemedText
            style={[
              styles.sessionTypeText,
              sessionType === 'group' && {
                color: scheme === 'light' ? '#FFFFFF' : '#000000',
                fontWeight: '700',
              },
            ]}>
            Group Session
          </ThemedText>
        </Clickable>
      </View>

      {/* Recurrence Type Selector */}
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        Schedule Type
      </ThemedText>
      <View style={styles.sessionTypeContainer}>
        <Clickable
          onPress={() => onRecurrenceTypeChange('none')}
          style={[
            styles.sessionTypeButton,
            {
              backgroundColor: recurrenceType === 'none' ? palette.tint : palette.card,
              borderColor: recurrenceType === 'none' ? palette.tint : palette.border,
            },
          ]}>
          <Ionicons
            name="calendar-outline"
            size={24}
            color={recurrenceType === 'none' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
          />
          <ThemedText
            style={[
              styles.sessionTypeText,
              recurrenceType === 'none' && {
                color: scheme === 'light' ? '#FFFFFF' : '#000000',
                fontWeight: '700',
              },
            ]}>
            One-time
          </ThemedText>
        </Clickable>

        <Clickable
          onPress={() => onRecurrenceTypeChange('weekly')}
          style={[
            styles.sessionTypeButton,
            {
              backgroundColor: recurrenceType === 'weekly' ? palette.tint : palette.card,
              borderColor: recurrenceType === 'weekly' ? palette.tint : palette.border,
            },
          ]}>
          <Ionicons
            name="repeat-outline"
            size={24}
            color={recurrenceType === 'weekly' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
          />
          <ThemedText
            style={[
              styles.sessionTypeText,
              recurrenceType === 'weekly' && {
                color: scheme === 'light' ? '#FFFFFF' : '#000000',
                fontWeight: '700',
              },
            ]}>
            Weekly Recurring
          </ThemedText>
        </Clickable>
      </View>

      {/* Form Fields */}
      <View style={styles.formFields}>
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Session Title *</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="e.g., Advanced Dribbling Skills, Goalkeeper Training"
            placeholderTextColor={palette.muted}
            value={sessionTitle}
            onChangeText={onSessionTitleChange}
          />
        </View>

        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Description (Optional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.multilineInput,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="Add details about the session..."
            placeholderTextColor={palette.muted}
            value={description}
            onChangeText={onDescriptionChange}
            multiline
            numberOfLines={3}
          />
        </View>

        {sessionType === 'group' && (
          <View style={styles.fieldContainer}>
            <ThemedText style={styles.label}>Max Participants</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              placeholder="Enter maximum number of participants"
              placeholderTextColor={palette.muted}
              value={maxParticipants}
              onChangeText={onMaxParticipantsChange}
              keyboardType="number-pad"
            />
          </View>
        )}

        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Location</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="Enter session location"
            placeholderTextColor={palette.muted}
            value={location}
            onChangeText={onLocationChange}
          />
        </View>

        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Date & Time</ThemedText>
          <Clickable
            onPress={() => {
              if (Platform.OS === 'android') {
                // On Android, show date picker first
                onShowDatePickerChange(true);
              } else {
                // On iOS/web, show combined datetime picker
                onShowDatePickerChange(true);
              }
            }}
            style={[
              styles.dateButton,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
              },
            ]}>
            <Ionicons name="calendar-outline" size={20} color={palette.icon} />
            <ThemedText style={styles.dateText}>
              {selectedDate.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}{' '}
              at{' '}
              {selectedDate.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </ThemedText>
          </Clickable>

          {/* Platform-specific date/time picker */}
          {Platform.OS === 'android' ? (
            <>
              {/* Android: Separate date and time pickers */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    onShowDatePickerChange(false);
                    if (date && event.type === 'set') {
                      // Preserve the time from selectedDate
                      const updatedDate = new Date(date);
                      updatedDate.setHours(selectedDate.getHours());
                      updatedDate.setMinutes(selectedDate.getMinutes());
                      onDateChange(updatedDate);
                      // After date is selected, show time picker
                      onShowTimePickerChange(true);
                    }
                  }}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="time"
                  display="default"
                  onChange={(event, date) => {
                    onShowTimePickerChange(false);
                    if (date && event.type === 'set') {
                      onDateChange(date);
                    }
                  }}
                />
              )}
            </>
          ) : (
            <>
              {/* iOS/Web: Combined datetime picker */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  display="default"
                  onChange={(event, date) => {
                    onShowDatePickerChange(Platform.OS === 'ios');
                    if (date) onDateChange(date);
                  }}
                />
              )}
            </>
          )}
        </View>

        {/* Price */}
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Price (£) - Optional</ThemedText>
          <View style={styles.priceInputRow}>
            <View style={[styles.currencyPrefix, { backgroundColor: palette.border }]}>
              <ThemedText style={styles.currencyText}>£</ThemedText>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.priceInput,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              placeholder="e.g., 35"
              placeholderTextColor={palette.muted}
              value={price}
              onChangeText={onPriceChange}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Age Range */}
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Age Range - Optional</ThemedText>
          <View style={styles.ageRangeRow}>
            <TextInput
              style={[
                styles.input,
                styles.ageInput,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              placeholder="Min"
              placeholderTextColor={palette.muted}
              value={ageMin}
              onChangeText={onAgeMinChange}
              keyboardType="number-pad"
            />
            <ThemedText style={styles.ageSeparator}>to</ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.ageInput,
                {
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  color: palette.text,
                },
              ]}
              placeholder="Max"
              placeholderTextColor={palette.muted}
              value={ageMax}
              onChangeText={onAgeMaxChange}
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Football Skill Focus */}
        <View style={styles.fieldContainer}>
          <ThemedText style={styles.label}>Skill Focus - Optional</ThemedText>
          <View style={styles.skillPicker}>
            {(['Dribbling', 'Passing', 'Defending', 'Finishing', 'Goalkeeping', 'Conditioning'] as FootballObjective[]).map((skill) => (
              <Clickable
                key={skill}
                onPress={() => onFootballSkillChange(footballSkill === skill ? '' : skill)}
                style={[
                  styles.skillButton,
                  {
                    backgroundColor: footballSkill === skill ? palette.tint : palette.card,
                    borderColor: footballSkill === skill ? palette.tint : palette.border,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.skillButtonText,
                    footballSkill === skill && {
                      color: scheme === 'light' ? '#FFFFFF' : '#000000',
                      fontWeight: '700',
                    },
                  ]}>
                  {skill}
                </ThemedText>
              </Clickable>
            ))}
          </View>
        </View>
      </View>

      {/* Create Button */}
      <Clickable
        onPress={onSubmit}
        style={[styles.createButton, { backgroundColor: palette.tint }]}>
        <Ionicons
          name="checkmark-circle-outline"
          size={24}
          color={scheme === 'light' ? '#FFFFFF' : '#000000'}
        />
        <ThemedText
          style={styles.createButtonText}
          lightColor="#FFFFFF"
          darkColor="#000000">
          Create Session Offering
        </ThemedText>
      </Clickable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingTop: 14,
    gap: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  sessionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: scale(18),
    borderRadius: 12,
    borderWidth: 2,
  },
  sessionTypeText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  formFields: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: scaleFont(16),
    lineHeight: scaleFont(20),
  },
  multilineInput: {
    minHeight: scale(100),
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateText: {
    fontSize: scaleFont(16),
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  currencyPrefix: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  currencyText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  priceInput: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  ageRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
  },
  ageSeparator: {
    fontSize: scaleFont(15),
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  skillPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  skillButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
