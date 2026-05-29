import React, { useEffect, useState, startTransition } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export interface RetainedTabPanel<T extends string> {
  id: T;
  content: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

interface RetainedTabPanelsProps<T extends string> {
  activeTab: T;
  panels: ReadonlyArray<RetainedTabPanel<T>>;
  style?: StyleProp<ViewStyle>;
}

export function RetainedTabPanels<T extends string>({
  activeTab,
  panels,
  style,
}: RetainedTabPanelsProps<T>) {
  const [visitedTabs, setVisitedTabs] = useState<Set<T>>(() => new Set([activeTab]));

  useEffect(() => {
    startTransition(() => {
      setVisitedTabs((current) => {
        if (current.has(activeTab)) {
          return current;
        }
        const next = new Set(current);
        next.add(activeTab);
        return next;
      });
    });
  }, [activeTab]);

  return (
    <View style={style}>
      {panels.map((panel) => {
        if (!visitedTabs.has(panel.id)) {
          return null;
        }

        const isActive = panel.id === activeTab;
        return (
          <View
            key={panel.id}
            style={[styles.panel, !isActive ? styles.hiddenPanel : null, panel.style]}
            pointerEvents={isActive ? 'auto' : 'none'}
            importantForAccessibility={isActive ? 'auto' : 'no-hide-descendants'}
            accessibilityElementsHidden={!isActive}
          >
            {panel.content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: '100%',
  },
  hiddenPanel: {
    display: 'none',
  },
});
