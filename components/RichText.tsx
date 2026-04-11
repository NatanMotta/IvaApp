import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { theme } from '../lib/theme';

type Props = {
  content: string;
};

type Node =
  | { t: 'h'; level: 1 | 2 | 3; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'code'; text: string };

function parseRichText(input: string): Node[] {
  const raw = (input ?? '').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];

  const lines = raw.split('\n');
  const nodes: Node[] = [];

  let paragraph: string[] = [];
  let ul: string[] | null = null;
  let ol: string[] | null = null;
  let code: string[] | null = null;

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) nodes.push({ t: 'p', text });
    paragraph = [];
  };
  const flushUl = () => {
    if (ul && ul.length) nodes.push({ t: 'ul', items: ul });
    ul = null;
  };
  const flushOl = () => {
    if (ol && ol.length) nodes.push({ t: 'ol', items: ol });
    ol = null;
  };
  const flushCode = () => {
    if (code && code.length) nodes.push({ t: 'code', text: code.join('\n') });
    code = null;
  };
  const flushAll = () => {
    flushCode();
    flushUl();
    flushOl();
    flushParagraph();
  };

  for (const line0 of lines) {
    const line = line0.trimEnd();

    // Code fence
    if (line.trim() === '```') {
      if (code) {
        flushCode();
      } else {
        flushUl();
        flushOl();
        flushParagraph();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line0); // keep original spacing inside code blocks
      continue;
    }

    // Blank line -> block break
    if (!line.trim()) {
      flushUl();
      flushOl();
      flushParagraph();
      continue;
    }

    // Headings: #, ##, ###
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      flushUl();
      flushOl();
      flushParagraph();
      const level = headingMatch[1].length as 1 | 2 | 3;
      const text = headingMatch[2].trim();
      if (text) nodes.push({ t: 'h', level, text });
      continue;
    }

    // Unordered list: - item / * item
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      flushOl();
      flushParagraph();
      if (!ul) ul = [];
      const text = ulMatch[1].trim();
      if (text) ul.push(text);
      continue;
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      flushUl();
      flushParagraph();
      if (!ol) ol = [];
      const text = olMatch[1].trim();
      if (text) ol.push(text);
      continue;
    }

    // Normal paragraph line
    flushUl();
    flushOl();
    paragraph.push(line.trim());
  }

  flushAll();
  return nodes;
}

export function RichText({ content }: Props) {
  const nodes = useMemo(() => parseRichText(content), [content]);
  if (!nodes.length) return null;

  return (
    <View style={styles.container}>
      {nodes.map((n, i) => {
        if (n.t === 'h') {
          const style =
            n.level === 1 ? styles.h1 : n.level === 2 ? styles.h2 : styles.h3;
          return (
            <Text key={`h-${i}`} style={style} selectable>
              {n.text}
            </Text>
          );
        }

        if (n.t === 'p') {
          return (
            <Text key={`p-${i}`} style={styles.p} selectable>
              {n.text}
            </Text>
          );
        }

        if (n.t === 'code') {
          return (
            <View key={`c-${i}`} style={styles.codeBox}>
              <Text style={styles.code} selectable>
                {n.text}
              </Text>
            </View>
          );
        }

        if (n.t === 'ul') {
          return (
            <View key={`ul-${i}`} style={styles.list}>
              {n.items.map((item, idx) => (
                <View key={`ul-${i}-${idx}`} style={styles.listRow}>
                  <Text style={styles.bullet} selectable>
                    {'\u2022'}
                  </Text>
                  <Text style={styles.liText} selectable>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          );
        }

        // ordered list
        return (
          <View key={`ol-${i}`} style={styles.list}>
            {n.items.map((item, idx) => (
              <View key={`ol-${i}-${idx}`} style={styles.listRow}>
                <Text style={styles.ord} selectable>
                  {idx + 1}.
                </Text>
                <Text style={styles.liText} selectable>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  h1: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.text,
    lineHeight: 24,
  },
  h2: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.text,
    lineHeight: 22,
  },
  h3: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.text,
    lineHeight: 20,
  },
  p: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  list: {
    gap: 10,
  },
  listRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  bullet: {
    width: 18,
    color: theme.colors.textMuted,
    lineHeight: 22,
    fontSize: 14,
    marginTop: 1,
    textAlign: 'center',
  },
  ord: {
    width: 22,
    color: theme.colors.textMuted,
    lineHeight: 22,
    fontSize: 14,
    marginTop: 1,
    textAlign: 'right',
  },
  liText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textSecondary,
    lineHeight: 22,
  },
  codeBox: {
    backgroundColor: '#0B1220',
    borderRadius: theme.borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  code: {
    color: '#E5E7EB',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
