/**
 * ROBOT THEME UI COMPONENTS
 * Premium robot-themed UI elements for Butler AI app
 * Includes: Robot toolbar, chat box, buttons, and themed containers
 */

import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, Dimensions, ScrollView, TextInput,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Image as ExpoImage } from 'expo-image';

const MONO: any = Platform.OS === 'ios' ? 'Courier' : 'monospace';
const { width: SW } = Dimensions.get('window');

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────
export const ROBOT_THEME = {
  bg: '#000000',
  surface: '#0A0A0A',
  card: '#111111',
  cyan: '#00E5FF',
  cyanDim: '#0099BB',
  green: '#FFFFFF',
  amber: '#FFB020',
  purple: '#CC00FF',
  teal: '#00D4CC',
  red: '#FF2244',
  text: '#FFFFFF',
  textMid: '#B0B0B0',
  textDim: '#555555',
  border: 'rgba(0,229,255,0.15)',
  borderHi: 'rgba(0,229,255,0.35)',
};

// ─────────────────────────────────────────────────────────────────
// ROBOT TOOLBAR COMPONENT
// ─────────────────────────────────────────────────────────────────
export function RobotToolbar({
  activeTab = 'home',
  onTabChange,
  mascotImage,
}: {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  mascotImage?: string;
}) {
  const tabs = [
    { id: 'home', label: 'HOME', icon: 'home' },
    { id: 'scripts', label: 'SCRIPTS', icon: 'code' },
    { id: 'chat', label: 'BUTLER AI', icon: 'chat' },
    { id: 'files', label: 'FILES', icon: 'folder' },
    { id: 'settings', label: 'SETTINGS', icon: 'settings' },
  ];

  return (
    <View style={styles.toolbarContainer}>
      {/* Toolbar background with robot pattern */}
      <View style={styles.toolbarBg} pointerEvents="none">
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="toolbarGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={ROBOT_THEME.cyanDim} stopOpacity="0.1" />
              <Stop offset="50%" stopColor={ROBOT_THEME.cyan} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={ROBOT_THEME.cyanDim} stopOpacity="0.1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#toolbarGrad)" />
          {/* Circuit pattern lines */}
          {[0, 1, 2, 3].map((i) => (
            <Path
              key={`line${i}`}
              d={`M0,${(i + 1) * 12} L${SW},${(i + 1) * 12}`}
              stroke={ROBOT_THEME.cyan}
              strokeWidth="0.5"
              opacity="0.2"
            />
          ))}
        </Svg>
      </View>

      {/* Toolbar content */}
      <View style={styles.toolbarContent}>
        {/* Left: Robot mascot or logo */}
        <View style={styles.toolbarLeft}>
          {mascotImage ? (
            <ExpoImage
              source={{ uri: mascotImage }}
              style={styles.toolbarMascot}
              contentFit="contain"
            />
          ) : (
            <View style={styles.toolbarLogoPlaceholder}>
              <MaterialCommunityIcons name="robot" size={20} color={ROBOT_THEME.cyan} />
            </View>
          )}
        </View>

        {/* Center: Tab buttons */}
        <View style={styles.toolbarTabs}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onTabChange?.(tab.id)}
                style={[styles.toolbarTab, isActive && styles.toolbarTabActive]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={tab.icon as any}
                  size={16}
                  color={isActive ? ROBOT_THEME.cyan : ROBOT_THEME.textDim}
                />
                <Text
                  style={[
                    styles.toolbarTabLabel,
                    isActive && { color: ROBOT_THEME.cyan, fontWeight: '900' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Right: Status indicator */}
        <View style={styles.toolbarRight}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>ONLINE</Text>
        </View>
      </View>

      {/* Bottom accent line */}
      <View style={styles.toolbarAccent} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROBOT CHAT BOX COMPONENT
// ─────────────────────────────────────────────────────────────────
export function RobotChatBox({
  messages = [],
  onSendMessage,
  mascotImage,
  isLoading = false,
}: {
  messages?: Array<{ id: string; text: string; isUser: boolean; timestamp?: number }>;
  onSendMessage?: (text: string) => void;
  mascotImage?: string;
  isLoading?: boolean;
}) {
  const [inputText, setInputText] = React.useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage?.(inputText);
      setInputText('');
    }
  };

  return (
    <View style={styles.chatContainer}>
      {/* Chat header with robot */}
      <View style={styles.chatHeader}>
        {mascotImage ? (
          <ExpoImage
            source={{ uri: mascotImage }}
            style={styles.chatMascot}
            contentFit="contain"
          />
        ) : (
          <View style={styles.chatMascotPlaceholder}>
            <MaterialCommunityIcons name="robot-happy" size={24} color={ROBOT_THEME.cyan} />
          </View>
        )}
        <View style={styles.chatHeaderText}>
          <Text style={styles.chatTitle}>BUTLER AI</Text>
          <Text style={styles.chatSubtitle}>Ready to assist</Text>
        </View>
      </View>

      {/* Messages area */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatMessages}
        contentContainerStyle={styles.chatMessagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.length === 0 ? (
          <View style={styles.chatEmpty}>
            <MaterialCommunityIcons name="robot-happy" size={48} color={ROBOT_THEME.cyanDim} />
            <Text style={styles.chatEmptyText}>Start a conversation with Butler AI</Text>
          </View>
        ) : (
          messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.isUser ? styles.messageBubbleUser : styles.messageBubbleBot,
              ]}
            >
              {!msg.isUser && (
                <View style={styles.messageBotIcon}>
                  <MaterialCommunityIcons name="robot" size={12} color={ROBOT_THEME.cyan} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubbleContent,
                  msg.isUser ? styles.messageBubbleContentUser : styles.messageBubbleContentBot,
                ]}
              >
                <Text style={styles.messageText}>{msg.text}</Text>
              </View>
            </View>
          ))
        )}
        {isLoading && (
          <View style={styles.messageBubble}>
            <View style={styles.messageBotIcon}>
              <MaterialCommunityIcons name="robot" size={12} color={ROBOT_THEME.cyan} />
            </View>
            <View style={styles.messageBubbleContentBot}>
              <View style={styles.typingIndicator}>
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
                <View style={styles.typingDot} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input area */}
      <View style={styles.chatInput}>
        <TextInput
          style={styles.chatInputField}
          placeholder="Ask Butler AI..."
          placeholderTextColor={ROBOT_THEME.textDim}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
          style={[styles.chatSendBtn, (!inputText.trim() || isLoading) && styles.chatSendBtnDisabled]}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="send"
            size={18}
            color={inputText.trim() && !isLoading ? ROBOT_THEME.cyan : ROBOT_THEME.textDim}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROBOT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────
export function RobotCard({
  children,
  title,
  icon,
  accentColor = ROBOT_THEME.cyan,
  onPress,
  style,
}: {
  children?: React.ReactNode;
  title?: string;
  icon?: string;
  accentColor?: string;
  onPress?: () => void;
  style?: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      style={[styles.robotCard, { borderColor: accentColor + '40' }, style]}
    >
      <View style={[styles.robotCardTopBar, { backgroundColor: accentColor }]} />
      {title && (
        <View style={styles.robotCardHeader}>
          {icon && <MaterialIcons name={icon as any} size={16} color={accentColor} />}
          <Text style={[styles.robotCardTitle, { color: accentColor }]}>{title}</Text>
        </View>
      )}
      <View style={styles.robotCardContent}>{children}</View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// ROBOT BUTTON COMPONENT
// ─────────────────────────────────────────────────────────────────
export function RobotButton({
  label,
  onPress,
  icon,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  style?: any;
}) {
  const colors = {
    primary: ROBOT_THEME.cyan,
    secondary: ROBOT_THEME.amber,
    danger: ROBOT_THEME.red,
  };

  const sizes = {
    small: { padding: 8, fontSize: 12 },
    medium: { padding: 12, fontSize: 14 },
    large: { padding: 16, fontSize: 16 },
  };

  const color = colors[variant];
  const sizeStyle = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.robotButton,
        {
          borderColor: color,
          backgroundColor: disabled ? ROBOT_THEME.textDim + '20' : color + '15',
          paddingVertical: sizeStyle.padding,
        },
        style,
      ]}
    >
      <View style={styles.robotButtonContent}>
        {icon && <MaterialIcons name={icon as any} size={sizeStyle.fontSize + 2} color={color} />}
        <Text
          style={[
            styles.robotButtonLabel,
            { fontSize: sizeStyle.fontSize, color: disabled ? ROBOT_THEME.textDim : color },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Toolbar
  toolbarContainer: {
    backgroundColor: ROBOT_THEME.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: ROBOT_THEME.border,
    paddingTop: Platform.OS === 'ios' ? 8 : 4,
    paddingBottom: 8,
  },
  toolbarBg: {
    ...StyleSheet.absoluteFillObject,
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    gap: 8,
  },
  toolbarLeft: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: ROBOT_THEME.card,
    borderWidth: 1,
    borderColor: ROBOT_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarMascot: {
    width: 36,
    height: 36,
  },
  toolbarLogoPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: ROBOT_THEME.cyan + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarTabs: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  toolbarTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toolbarTabActive: {
    borderColor: ROBOT_THEME.cyan + '50',
    backgroundColor: ROBOT_THEME.cyan + '10',
  },
  toolbarTabLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: MONO,
    color: ROBOT_THEME.textDim,
    letterSpacing: 0.5,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ROBOT_THEME.green,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '900',
    fontFamily: MONO,
    color: ROBOT_THEME.green,
    letterSpacing: 1,
  },
  toolbarAccent: {
    height: 1,
    backgroundColor: ROBOT_THEME.cyan,
    opacity: 0.3,
    marginTop: 4,
  },

  // Chat Box
  chatContainer: {
    flex: 1,
    backgroundColor: ROBOT_THEME.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ROBOT_THEME.border,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: ROBOT_THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: ROBOT_THEME.border,
  },
  chatMascot: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  chatMascotPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: ROBOT_THEME.cyan + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: ROBOT_THEME.cyan,
    fontFamily: MONO,
  },
  chatSubtitle: {
    fontSize: 11,
    color: ROBOT_THEME.textMid,
    marginTop: 2,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    gap: 8,
  },
  chatEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  chatEmptyText: {
    fontSize: 12,
    color: ROBOT_THEME.textMid,
    textAlign: 'center',
  },
  messageBubble: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  messageBubbleUser: {
    justifyContent: 'flex-end',
  },
  messageBubbleBot: {
    justifyContent: 'flex-start',
  },
  messageBotIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: ROBOT_THEME.cyan + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubbleContent: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  messageBubbleContentUser: {
    backgroundColor: ROBOT_THEME.cyan + '20',
    borderColor: ROBOT_THEME.cyan + '50',
  },
  messageBubbleContentBot: {
    backgroundColor: ROBOT_THEME.card,
    borderColor: ROBOT_THEME.border,
  },
  messageText: {
    fontSize: 13,
    color: ROBOT_THEME.text,
    lineHeight: 18,
  },
  typingIndicator: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ROBOT_THEME.cyan,
    opacity: 0.6,
  },
  chatInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: ROBOT_THEME.surface,
    borderTopWidth: 1,
    borderTopColor: ROBOT_THEME.border,
  },
  chatInputField: {
    flex: 1,
    backgroundColor: ROBOT_THEME.card,
    borderWidth: 1,
    borderColor: ROBOT_THEME.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: ROBOT_THEME.text,
    fontSize: 13,
    fontFamily: MONO,
    maxHeight: 100,
  },
  chatSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: ROBOT_THEME.cyan + '20',
    borderWidth: 1,
    borderColor: ROBOT_THEME.cyan + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatSendBtnDisabled: {
    backgroundColor: ROBOT_THEME.textDim + '10',
    borderColor: ROBOT_THEME.textDim + '30',
  },

  // Robot Card
  robotCard: {
    backgroundColor: ROBOT_THEME.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  robotCardTopBar: {
    height: 2,
    width: '100%',
  },
  robotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,229,255,0.1)',
  },
  robotCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  robotCardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Robot Button
  robotButton: {
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  robotButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  robotButtonLabel: {
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
});
