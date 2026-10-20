import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  useColorScheme,
  type ScaledSize,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Symbols from 'expo-symbols';
import { useServers } from '../src/context/ServersContext';
import { getCredential } from '../src/storage/secureStorage';

// iOS Native UI Components
import {
  Host,
  VStack,
  HStack,
  Button,
  Text as SwiftUIText,
} from '@expo/ui/swift-ui';
import {
  padding,
  font,
  foregroundStyle,
  cornerRadius,
  glassEffect,
  buttonStyle,
} from '@expo/ui/swift-ui/modifiers';

const TERMINAL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Terminal</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.3.0/css/xterm.min.css">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background-color: #1e1e1e; }
    #terminal { width: 100%; height: 100%; }
    .xterm { padding: 8px; }
    #status {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #888;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px; text-align: center;
    }
    #status.error { color: #f44336; }
    #status.hidden { display: none; }
  </style>
</head>
<body>
  <div id="terminal"></div>
  <div id="status">Connecting...</div>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/xterm@5.3.0/lib/xterm.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js"></script>
  <script>
    const statusEl = document.getElementById('status');
    let terminal = null;
    let fitAddon = null;
    let ws = null;
    let connected = false;

    function showStatus(text, isError) {
      statusEl.textContent = text;
      statusEl.className = isError ? 'error' : '';
    }
    function hideStatus() { statusEl.className = 'hidden'; }
    function sendToRN(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
      }
    }

    function initTerminal() {
      terminal = new Terminal({
        cursorBlink: true,
        convertEol: true,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 14,
        theme: {
          background: '#1e1e1e',
          foreground: '#d4d4d4',
          cursor: '#d4d4d4',
          cursorAccent: '#1e1e1e',
          selectionBackground: '#264f78',
          black: '#000000',
          red: '#cd3131',
          green: '#0dbc79',
          yellow: '#e5e510',
          blue: '#2472c8',
          magenta: '#bc3fbc',
          cyan: '#11a8cd',
          white: '#e5e5e5',
          brightBlack: '#666666',
          brightRed: '#f14c4c',
          brightGreen: '#23d18b',
          brightYellow: '#f5f543',
          brightBlue: '#3b8eea',
          brightMagenta: '#d670d6',
          brightCyan: '#29b8db',
          brightWhite: '#e5e5e5',
        },
      });
      fitAddon = new FitAddon.FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(document.getElementById('terminal'));
      fitAddon.fit();
      terminal.onData((data) => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
      });
      terminal.onResize(({ cols, rows }) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols, rows }));
        }
      });
      window.addEventListener('resize', () => { if (fitAddon) fitAddon.fit(); });
      sendToRN('ready');
    }

    function connect(wsUrl) {
      showStatus('Connecting...');
      ws = new WebSocket(wsUrl);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => {
        if (fitAddon) {
          fitAddon.fit();
          ws.send(JSON.stringify({ type: 'resize', cols: terminal.cols, rows: terminal.rows }));
        }
      };
      ws.onmessage = (event) => {
        let data;
        if (event.data instanceof ArrayBuffer) {
          data = new TextDecoder().decode(event.data);
        } else {
          data = event.data;
        }
        if (data.startsWith('{')) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'error') {
              showStatus(parsed.message || 'Connection error', true);
              sendToRN('error', { message: parsed.message });
              return;
            }
            if (parsed.type === 'status' && 
                (parsed.message?.includes('Shell ready') || 
                 parsed.message?.includes('Shell 已就绪') ||
                 parsed.message?.includes('authenticated'))) {
              connected = true;
              hideStatus();
              terminal.reset();
              if (fitAddon) fitAddon.fit();
              sendToRN('connected');
              return;
            }
            if (parsed.type) return;
          } catch {}
        }
        terminal.write(data);
      };
      ws.onclose = () => {
        if (!connected) {
          showStatus('Connection closed', true);
        } else {
          terminal.writeln('\\r\\n\\x1b[33mConnection closed\\x1b[0m');
        }
        sendToRN('disconnected');
      };
      ws.onerror = () => {
        showStatus('Connection failed', true);
        sendToRN('error', { message: 'WebSocket connection failed' });
      };
    }
    function disconnect() { if (ws) { ws.close(); ws = null; } }
    function handleMessage(event) {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'connect': connect(msg.wsUrl); break;
          case 'disconnect': disconnect(); break;
          case 'resize': if (fitAddon) fitAddon.fit(); break;
        }
      } catch (e) { console.error('Error handling message:', e); }
    }
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
    initTerminal();
  </script>
</body>
</html>`;

type ConnectionStatus = 'initializing' | 'connecting' | 'connected' | 'error' | 'disconnected';

export default function TerminalScreen() {
  const router = useRouter();
  const { serverId, sshHostId, sshHostName } = useLocalSearchParams<{
    serverId: string;
    sshHostId: string;
    sshHostName: string;
  }>();
  const { servers, getApiClient, addSession, updateSession, removeSession } = useServers();
  const colorScheme = useColorScheme();
  
  const webViewRef = useRef<WebView<object>>(null);
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));

  const server = servers.find(s => s.id === serverId);
  const apiClient = serverId ? getApiClient(serverId) : null;
  const hostName = sshHostName ?? 'Terminal';

  const handleDisconnect = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (sessionId) {
      removeSession(sessionId);
    }
    webViewRef.current?.postMessage(JSON.stringify({ type: 'disconnect' }));
    router.back();
  }, [sessionId, removeSession, router]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
      setDimensions(window);
      webViewRef.current?.postMessage(JSON.stringify({ type: 'resize' }));
    });
    return () => subscription?.remove();
  }, []);

  const startSession = useCallback(async () => {
    if (!apiClient || !server || !sshHostId) {
      setStatus('error');
      setErrorMessage('Server configuration not found');
      return;
    }

    try {
      setStatus('connecting');
      
      const response = await apiClient.createSession(sshHostId);
      const wsUrl = apiClient.getTerminalWsUrl(response.sessionId);
      
      setSessionId(response.sessionId);
      
      addSession({
        id: `${serverId}-${response.sessionId}`,
        serverId: serverId!,
        sshHostId: sshHostId!,
        sessionId: response.sessionId,
        wsUrl: response.wsUrl,
        sftpWsUrl: response.sftpWsUrl,
        status: 'connecting',
        createdAt: new Date().toISOString(),
      });

      let finalWsUrl = wsUrl;
      
      if (server.authType === 'basic' && server.username) {
        const password = await getCredential(server.id);
        if (password) {
          const url = new URL(wsUrl);
          url.username = server.username;
          url.password = password;
          finalWsUrl = url.toString();
        }
      }

      webViewRef.current?.postMessage(JSON.stringify({
        type: 'connect',
        wsUrl: finalWsUrl,
      }));
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to create session');
    }
  }, [apiClient, server, serverId, sshHostId, addSession]);

  const handleWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as {
        type: string;
        message?: string;
      };
      
      switch (msg.type) {
        case 'ready':
          startSession();
          break;
        case 'connected':
          setStatus('connected');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (sessionId) {
            updateSession(sessionId, { status: 'open' });
          }
          break;
        case 'disconnected':
          setStatus('disconnected');
          if (sessionId) {
            updateSession(sessionId, { status: 'closed' });
          }
          break;
        case 'error':
          setStatus('error');
          setErrorMessage(msg.message ?? 'Connection error');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          if (sessionId) {
            updateSession(sessionId, { status: 'error' });
          }
          break;
      }
    } catch {
      // Ignore parse errors
    }
  }, [startSession, sessionId, updateSession]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus('initializing');
    setErrorMessage(null);
    webViewRef.current?.reload();
  }, []);

  if (!server) {
    return (
      <>
        <Stack.Screen options={{ title: 'Terminal' }} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Server not found</Text>
          <Pressable 
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]} 
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const renderOverlay = () => {
    if (status !== 'error' && status !== 'disconnected') return null;

    const isError = status === 'error';
    const title = isError ? 'Connection Error' : 'Disconnected';
    const message = isError ? (errorMessage ?? 'Unknown error') : 'The connection was closed.';
    const retryLabel = isError ? 'Retry' : 'Reconnect';
    const iconName = isError ? 'exclamationmark.triangle' : 'cable.connector';
    const iconColor = isError ? '#FF453A' : '#FF9500';

    // iOS: Glass overlay using native components
    if (Platform.OS === 'ios') {
      return (
        <View style={styles.overlay}>
          <Host style={styles.overlayContent}>
            <VStack
              modifiers={[
                padding({ all: 28 }),
                cornerRadius(20),
                glassEffect({ glass: { variant: 'regular' } }),
              ]}
            >
              <Symbols.SymbolView
                name={iconName}
                style={{ width: 48, height: 48, marginBottom: 16, alignSelf: 'center' }}
                tintColor={iconColor}
                weight="medium"
              />
              <SwiftUIText
                modifiers={[
                  font({ textStyle: 'title3', weight: 'semibold' }),
                  foregroundStyle('primary'),
                ]}
              >
                {title}
              </SwiftUIText>
              <SwiftUIText
                modifiers={[
                  font({ textStyle: 'body' }),
                  foregroundStyle('secondary'),
                  padding({ top: 8, bottom: 24 }),
                ]}
              >
                {message}
              </SwiftUIText>
              <HStack>
                <Button
                  label={retryLabel}
                  onPress={handleRetry}
                  modifiers={[buttonStyle('glassProminent')]}
                />
                <Button
                  label="Close"
                  role="cancel"
                  onPress={handleDisconnect}
                  modifiers={[buttonStyle('glass')]}
                />
              </HStack>
            </VStack>
          </Host>
        </View>
      );
    }

    // Android: Material Design overlay
    return (
      <View style={styles.overlay}>
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>{isError ? '⚠️' : '🔌'}</Text>
          <Text style={styles.errorTitle}>{title}</Text>
          <Text style={styles.errorMessage}>{message}</Text>
          <View style={styles.errorButtons}>
            <Pressable 
              style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]} 
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>{retryLabel}</Text>
            </Pressable>
            <Pressable 
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]} 
              onPress={handleDisconnect}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: hostName,
          headerStyle: {
            backgroundColor: '#1e1e1e',
          },
          headerTitleStyle: {
            color: '#FFFFFF',
          },
          headerTintColor: Platform.OS === 'ios' ? '#0A84FF' : '#BB86FC',
          contentStyle: {
            backgroundColor: '#1e1e1e',
          },
          headerRight: () => (
            <Pressable 
              onPress={handleDisconnect}
              style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            >
              <Text style={styles.headerButtonText}>Close</Text>
            </Pressable>
          ),
        }}
      />
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          source={{ html: TERMINAL_HTML }}
          style={[styles.webView, { width: dimensions.width, height: dimensions.height }]}
          onMessage={handleWebViewMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          mixedContentMode="always"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          scrollEnabled={false}
          bounces={false}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView
          textInteractionEnabled
        />
        {renderOverlay()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 32,
  },
  webView: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButtonText: {
    color: Platform.select({ ios: '#0A84FF', android: '#BB86FC' }),
    fontSize: 17,
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    maxWidth: 320,
    marginHorizontal: 32,
  },
  errorBox: {
    backgroundColor: '#2d2d2d',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 320,
    marginHorizontal: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#BB86FC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: '#444444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonPressed: {
    backgroundColor: '#555555',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Platform.select({ ios: '#0A84FF', android: '#BB86FC' }),
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#FF453A',
    textAlign: 'center',
  },
});
