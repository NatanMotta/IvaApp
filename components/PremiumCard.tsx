import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../lib/theme';

interface PremiumCardProps {
  title: string;
  description?: string;
  badge?: string;
  badgeType?: 'primary' | 'warning' | 'success';
  onPress?: () => void;
  style?: ViewStyle;
}

export function PremiumCard({ title, description, badge, badgeType = 'primary', onPress, style }: PremiumCardProps) {
  
  const getBadgeStyle = () => {
    switch(badgeType) {
      case 'warning': return { bg: theme.colors.warningBg, text: theme.colors.warning };
      case 'success': return { bg: theme.colors.successBg, text: theme.colors.success };
      case 'primary':
      default: return { bg: theme.colors.accentLight, text: theme.colors.accent };
    }
  };

  const badgeTheme = getBadgeStyle();

  return (
    <TouchableOpacity
      style={[styles.card, theme.shadows.mild, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeTheme.bg }]}>
            <Text style={[styles.badgeText, { color: badgeTheme.text }]}>{badge}</Text>
          </View>
        )}
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>
      )}

      <View style={styles.bottomRow}>
        <Text style={styles.actionText}>Apri</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.accent} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9', // Bordo chiarissimo per evidenziare l'ombra
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.accent,
  },
});
