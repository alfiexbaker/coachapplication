import { StyleSheet } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  progressCard: { padding: Spacing.md },
  progressHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  progressLabel: { fontSize: scaleFont(13), marginBottom: Spacing.micro },
  progressValue: { fontSize: scaleFont(32), fontWeight: '700' },
  progressValueZero: { fontSize: scaleFont(22) },
  statusBadge: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
    gap: Spacing.xxs,
  },
  statusText: { fontSize: scaleFont(13), fontWeight: '600' },
  progressBarContainer: {
    height: 12,
    borderRadius: Radii.sm,
    overflow: 'visible',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  progressBarFill: { height: '100%', borderRadius: Radii.sm },
  expectedMarker: {
    position: 'absolute',
    top: -4,
    alignItems: 'center',
    marginLeft: -1,
  },
  expectedLine: { width: 2, height: 20 },
  expectedLabel: { fontSize: scaleFont(10), marginTop: Spacing.micro },
  datesRow: { justifyContent: 'space-between' },
  dateItem: { flex: 1 },
  dateItemRight: { alignItems: 'flex-end' },
  dateLabel: {
    fontSize: scaleFont(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.micro,
  },
  dateValue: { fontSize: scaleFont(14), fontWeight: '600' },
  daysRemaining: {
    fontSize: scaleFont(12),
    fontWeight: '500',
    marginTop: Spacing.micro,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.xs,
  },
  emptyText: { fontSize: scaleFont(15), fontWeight: '600' },
  emptySubtext: { fontSize: scaleFont(13), textAlign: 'center' },
  timelineItem: { gap: Spacing.sm },
  timelineConnector: {
    width: 20,
    alignItems: 'center',
    paddingTop: Spacing.xxs,
  },
  connectorLine: { width: 2, flex: 1, minHeight: 20 },
  connectorLineBottom: { marginTop: 0 },
  connectorDot: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
    marginVertical: Spacing.xxs,
  },
  noteCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.md,
    marginBottom: Spacing.sm,
  },
  noteHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  noteDate: { fontSize: scaleFont(14), fontWeight: '600' },
  noteTime: { fontSize: scaleFont(12) },
  progressBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  progressBadgeText: { fontSize: scaleFont(12), fontWeight: '700' },
  noteContent: { fontSize: scaleFont(14), lineHeight: scaleFont(20) },
  noteAuthor: {
    fontSize: scaleFont(12),
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
});
