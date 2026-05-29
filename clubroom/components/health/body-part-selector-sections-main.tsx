import React from 'react';
import { View } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { withAlpha } from '@/constants/theme';
import type { BodyPart } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';
import { injuryService } from '@/services/injury-service';
import { Row } from '@/components/primitives';

import { getPartStyle } from './body-part-selector-helpers';
import { styles } from './body-part-selector-styles';

interface BodyDiagramProps {
  selectedPart: BodyPart | null;
  onSelectPart?: (part: BodyPart) => void;
  palette: ThemeColors;
}

export const BodyDiagram = function BodyDiagram({
  selectedPart,
  onSelectPart,
  palette,
}: BodyDiagramProps) {
  const buildPartProps = (part: BodyPart) => ({
    disabled: !onSelectPart,
    onPress: () => onSelectPart?.(part),
    accessibilityRole: 'button' as const,
    accessibilityState: { selected: selectedPart === part },
    accessibilityLabel: `Select ${injuryService.getBodyPartLabel(part)}`,
  });

  return (
    <View
      style={[
        styles.bodyDiagram,
        {
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: withAlpha(palette.tint, 0.18),
        },
      ]}
    >
      <View style={styles.bodyFigure}>
        <Clickable
          {...buildPartProps('HEAD')}
          style={[styles.head, getPartStyle('HEAD', selectedPart, palette)]}
        />
        <Clickable
          {...buildPartProps('NECK')}
          style={[styles.neck, getPartStyle('NECK', selectedPart, palette)]}
        />
        <Row style={styles.torsoContainer}>
          <Clickable
            {...buildPartProps('LEFT_SHOULDER')}
            style={[
              styles.shoulder,
              styles.leftShoulder,
              getPartStyle('LEFT_SHOULDER', selectedPart, palette),
            ]}
          />
          <Clickable
            {...buildPartProps('CHEST')}
            style={[styles.torso, getPartStyle('CHEST', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('RIGHT_SHOULDER')}
            style={[
              styles.shoulder,
              styles.rightShoulder,
              getPartStyle('RIGHT_SHOULDER', selectedPart, palette),
            ]}
          />
        </Row>
        <Row style={styles.armsContainer}>
          <Clickable
            {...buildPartProps('LEFT_ARM')}
            style={[styles.arm, getPartStyle('LEFT_ARM', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('ABDOMEN')}
            style={[styles.core, getPartStyle('ABDOMEN', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('RIGHT_ARM')}
            style={[styles.arm, getPartStyle('RIGHT_ARM', selectedPart, palette)]}
          />
        </Row>
        <Row style={styles.legsContainer}>
          <Clickable
            {...buildPartProps('LEFT_THIGH')}
            style={[styles.thigh, getPartStyle('LEFT_THIGH', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('RIGHT_THIGH')}
            style={[styles.thigh, getPartStyle('RIGHT_THIGH', selectedPart, palette)]}
          />
        </Row>
        <Row style={styles.kneesContainer}>
          <Clickable
            {...buildPartProps('LEFT_KNEE')}
            style={[styles.knee, getPartStyle('LEFT_KNEE', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('RIGHT_KNEE')}
            style={[styles.knee, getPartStyle('RIGHT_KNEE', selectedPart, palette)]}
          />
        </Row>
        <Row style={styles.lowerLegsContainer}>
          <Clickable
            {...buildPartProps('LEFT_CALF')}
            style={[styles.calf, getPartStyle('LEFT_CALF', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('RIGHT_CALF')}
            style={[styles.calf, getPartStyle('RIGHT_CALF', selectedPart, palette)]}
          />
        </Row>
        <Row style={styles.feetContainer}>
          <Clickable
            {...buildPartProps('LEFT_FOOT')}
            style={[styles.foot, getPartStyle('LEFT_FOOT', selectedPart, palette)]}
          />
          <Clickable
            {...buildPartProps('RIGHT_FOOT')}
            style={[styles.foot, getPartStyle('RIGHT_FOOT', selectedPart, palette)]}
          />
        </Row>
      </View>
    </View>
  );
};
