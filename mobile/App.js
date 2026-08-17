import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_BASE_URL, SOCKET_URL } from './src/config';

const PINK = '#F6B7C0';
const GREEN = '#CFF4E5';
const BLUE = '#77A6B6';
const DARK = '#33434B';
const BG = '#F7F7F7';

async function api(path, options = {}) {
  const token = await AsyncStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Erro de comunicação com a API');
  return data;
}

export default function App() {
  const [screen, setScreen] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('senha123');
  const [me, setMe] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [error, setError] = useState('');
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return setBooting(false);
      try {
        const profile = await api('/auth/me');
        setMe(profile); setScreen('community');
      } catch { await AsyncStorage.removeItem('accessToken'); }
      finally { setBooting(false); }
    })();
  }, []);

  async function login() {
  console.log('LOGIN 1 - iniciando');
  console.log('LOGIN 2 - email:', email);
  console.log('LOGIN 3 - API:', API_BASE_URL);

  setError('');

  try {
    console.log('LOGIN 4 - chamando /auth/login');

    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });

    console.log('LOGIN 5 - resposta login:', data);

    await AsyncStorage.setItem('accessToken', data.accessToken);

    console.log('LOGIN 6 - token salvo');
    console.log('LOGIN 7 - chamando /auth/me');

    const profile = await api('/auth/me');

    console.log('LOGIN 8 - perfil:', profile);

    setMe(profile);
    setScreen('community');

    console.log('LOGIN 9 - entrou na comunidade');
  } catch (e) {
    console.log('LOGIN ERRO:', e);
    console.log('LOGIN ERRO MESSAGE:', e?.message);

    setError(e?.message || 'Erro ao fazer login');
  }
}

  async function logout() {
    await AsyncStorage.removeItem('accessToken');
    setMe(null); setConversation(null); setScreen('login');
  }

  if (booting) return <Centered><ActivityIndicator size="large" color={BLUE} /></Centered>;
  if (screen === 'login') return <Login email={email} setEmail={setEmail} password={password} setPassword={setPassword} error={error} onLogin={login} />;
  if (screen === 'community') return <Community me={me} onOpenChat={(item) => { if (item?.__createGroup) { setScreen('create-group'); } else { setConversation(item); setScreen('chat'); } }} onLogout={logout} />;
  if (screen === 'create-group') return <CreateGroup me={me} onBack={() => setScreen('community')} onCreated={(group) => { setConversation(group); setScreen('chat'); }} />;
  return <Chat me={me} conversation={conversation} onBack={() => setScreen('community')} />;
}

function Login({ email, setEmail, password, setPassword, error, onLogin }) {
  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle="dark-content" />
    <View style={styles.loginCard}>
      <Image source={require('./original.png')} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>Comunidade em tempo real</Text>
      <Text style={styles.subtitle}>MVP de demonstração WebSocket</Text>
      <Field label="E-mail" value={email} onChangeText={setEmail} placeholder="eduardo@demo.candi" autoCapitalize="none" />
      <Field label="Senha" value={password} onChangeText={setPassword} placeholder="senha123" secureTextEntry />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Entrar" onPress={() => {
  console.log('BOTÃO LOGIN CLICADO');
  onLogin();
}} />
      <Text style={styles.hint}>Maicon · Eduardo · Andre</Text>
    </View>
  </SafeAreaView>;
}

function Community({ me, onOpenChat, onLogout }) {
  const [inbox, setInbox] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [privateChats, myGroups] = await Promise.all([api('/chat/inbox'), api('/chat/groups')]);
      setInbox(privateChats || []); setGroups(myGroups || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    refresh();
    let socket;
    (async () => {
      const token = await AsyncStorage.getItem('accessToken');
      socket = io(SOCKET_URL, { transports: ['websocket'], auth: { token } });
      socket.on('group_created', () => refresh());
      socket.on('inbox_update', () => refresh());
    })();
    return () => { if (socket) socket.disconnect(); };
  }, []);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <View><Text style={styles.brand}>CANDI</Text><Text style={styles.headerSub}>Comunidade</Text></View>
      <Pressable onPress={onLogout}><Text style={styles.link}>Sair</Text></Pressable>
    </View>
    <View style={styles.content}>
      <Text style={styles.greeting}>Olá, {me?.profile_nickname || me?.profile_name}! 👋</Text>
      {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 10 }} /> : null}

      <View style={styles.sectionHeaderRow}>
        <View><Text style={styles.sectionTitle}>Conversas</Text><Text style={styles.sectionSub}>Privadas em tempo real via Socket.IO</Text></View>
      </View>
      {!loading && inbox.length === 0 ? <Text style={styles.muted}>Nenhuma conversa privada ainda.</Text> : null}
      {inbox.map((item) => <Pressable key={item.conversation_id} style={styles.conversationCard} onPress={() => onOpenChat(item)}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(item.other_user_name || '?').slice(0, 1)}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.personName}>{item.other_user_name}</Text><Text style={styles.lastMessage} numberOfLines={1}>{item.last_message || 'Toque para abrir a conversa'}</Text></View>
        {item.unread_count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.unread_count}</Text></View> : null}
      </Pressable>)}

      <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
        <View><Text style={styles.sectionTitle}>Grupos</Text><Text style={styles.sectionSub}>Crie um grupo selecionando os participantes</Text></View>
        <Pressable style={styles.smallButton} onPress={() => onOpenChat({ __createGroup: true })}><Text style={styles.smallButtonText}>+ Grupo</Text></Pressable>
      </View>
      {groups.length === 0 ? <View style={styles.empty}><Text style={styles.emptyTitle}>Nenhum grupo</Text><Text style={styles.emptyText}>Você pode criar um agora selecionando Maicon, Eduardo ou Andre.</Text><Button title="Criar grupo" onPress={() => onOpenChat({ __createGroup: true })} /></View> : null}
      {groups.map((group) => <Pressable key={group.group_id} style={styles.conversationCard} onPress={() => onOpenChat(group)}>
        <View style={[styles.avatar, { backgroundColor: GREEN }]}><Text style={styles.avatarText}>👥</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.personName}>{group.group_name}</Text><Text style={styles.lastMessage}>{group.members?.length || group.member_ids?.length || 0} participantes</Text></View>
      </Pressable>)}

      <Pressable style={styles.refreshButton} onPress={refresh}><Text style={styles.link}>Atualizar</Text></Pressable>
    </View>
  </SafeAreaView>;
}

function CreateGroup({ me, onBack, onCreated }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { (async () => { try { setUsers(await api('/chat/users')); } catch (e) { setError(e.message); } finally { setLoading(false); } })(); }, []);

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  async function create() {
    setError('');
    if (!name.trim()) return setError('Digite um nome para o grupo.');
    if (!selected.length) return setError('Selecione pelo menos um participante.');
    setSaving(true);
    try {
      const group = await api('/chat/groups', { method: 'POST', body: JSON.stringify({ groupName: name.trim(), memberIds: selected }) });
      onCreated(group);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return <SafeAreaView style={styles.safe}>
    <View style={styles.chatHeader}><Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable><Text style={styles.chatName}>Novo grupo</Text></View>
    <View style={styles.content}>
      <Text style={styles.sectionTitle}>Criar grupo</Text>
      <Text style={styles.sectionSub}>Você será incluído automaticamente. Selecione quem mais participa.</Text>
      <Field label="Nome do grupo" value={name} onChangeText={setName} placeholder="Ex.: Apoio Candi" />
      {loading ? <ActivityIndicator color={BLUE} /> : users.map((user) => {
        const checked = selected.includes(user.profile_id);
        return <Pressable key={user.profile_id} style={[styles.userSelect, checked && styles.userSelectChecked]} onPress={() => toggle(user.profile_id)}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(user.profile_nickname || user.profile_name || '?').slice(0, 1)}</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.personName}>{user.profile_nickname || user.profile_name}</Text><Text style={styles.lastMessage}>{user.profile_email}</Text></View>
          <Text style={styles.checkbox}>{checked ? '✓' : '○'}</Text>
        </Pressable>;
      })}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={saving ? 'Criando...' : 'Criar grupo'} onPress={create} />
    </View>
  </SafeAreaView>;
}

function Chat({ me, conversation, onBack }) {
  const socketRef = useRef(null);
  const typingTimer = useRef(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [read, setRead] = useState(false);
  const [loading, setLoading] = useState(true);
  const myId = me?.profile_id;
  const conversationId = conversation?.conversation_id || conversation?.group_id;
  const isGroup = String(conversationId || '').startsWith('GROUP#');
  const title = isGroup ? conversation?.group_name : conversation?.other_user_name;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const history = await api(`/chat/messages/${encodeURIComponent(conversationId)}`);
        if (mounted) setMessages(history || []);
      } catch (e) {
        if (mounted) setMessages([]);
      } finally { if (mounted) setLoading(false); }

      const token = await AsyncStorage.getItem('accessToken');
      const socket = io(SOCKET_URL, { transports: ['websocket'], auth: { token } });
      socketRef.current = socket;
      socket.on('connect', () => { setConnected(true); socket.emit('join_conversation', { conversationId }); if (!isGroup) socket.emit('ack_read', { conversationId }); });
      socket.on('disconnect', () => setConnected(false));
      socket.on('new_message', (msg) => {
        if (msg.conversation_id !== conversationId) return;
        setMessages((prev) => prev.some((m) => m.timestamp === msg.timestamp) ? prev : [...prev, msg]);
        if (!isGroup && msg.sender_id !== myId) socket.emit('ack_read', { conversationId });
      });
      socket.on('user_typing', ({ conversationId: cid, isTyping }) => { if (cid === conversationId) setTyping(!!isTyping); });
      socket.on('message_delivered', ({ conversation_id }) => { if (conversation_id === conversationId) setDelivered(true); });
      socket.on('messages_read', ({ conversation_id }) => { if (conversation_id === conversationId) setRead(true); });
    })();
    return () => {
      mounted = false;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (socketRef.current) { socketRef.current.emit('leave_conversation', { conversationId }); socketRef.current.disconnect(); }
    };
  }, [conversationId, myId]);

  function onChangeText(value) {
    setText(value);
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit('typing', { conversationId, isTyping: value.length > 0 });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing', { conversationId, isTyping: false }), 900);
  }

  function send() {
    const messageContent = text.trim();
    if (!messageContent || !socketRef.current?.connected) return;
    setDelivered(false); setRead(false); setText('');
    socketRef.current.emit('typing', { conversationId, isTyping: false });
    socketRef.current.emit('send_message', { conversationId, messageContent });
  }

  const status = read ? '✓✓ lido' : delivered ? '✓✓ entregue' : '✓ enviado';
  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.chatHeader}>
        <Pressable onPress={onBack}><Text style={styles.back}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={styles.chatName}>{title || 'Conversa'}</Text><Text style={styles.chatStatus}>{connected ? (typing ? 'digitando...' : isGroup ? 'grupo online' : 'online') : 'conectando...'}</Text></View>
        <View style={[styles.dot, { backgroundColor: connected ? '#5AC18E' : '#CCC' }]} />
      </View>
      {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : <FlatList style={{ flex: 1 }} contentContainerStyle={styles.messages} data={messages} keyExtractor={(item) => item.timestamp} renderItem={({ item }) => {
        const mine = item.sender_id === myId;
        return <View style={[styles.bubbleRow, mine ? styles.mineRow : styles.theirRow]}><View style={[styles.bubble, mine ? styles.mineBubble : styles.theirBubble]}>
          {isGroup && !mine ? <Text style={styles.senderName}>{item.sender_name}</Text> : null}
          <Text style={styles.bubbleText}>{item.message_content}</Text>
          <View style={styles.metaRow}><Text style={styles.time}>{new Date(item.timestamp.split('#')[0]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>{mine && !isGroup ? <Text style={styles.status}>{status}</Text> : null}</View>
        </View></View>;
      }} ListEmptyComponent={<Text style={styles.noMessages}>Comece a conversa 👋</Text>} />}
      {typing ? <Text style={styles.typing}>Alguém está digitando...</Text> : null}
      <View style={styles.inputBar}><TextInput value={text} onChangeText={onChangeText} placeholder="Escreva uma mensagem..." placeholderTextColor="#999" style={styles.input} multiline /><Pressable style={[styles.send, !text.trim() && styles.sendDisabled]} onPress={send}><Text style={styles.sendText}>➤</Text></Pressable></View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

function Field({ label, ...props }) { return <View style={{ marginBottom: 14 }}><Text style={styles.fieldLabel}>{label}</Text><TextInput style={styles.field} {...props} /></View>; }
function Button({ title, onPress }) { return <Pressable style={styles.button} onPress={onPress}><Text style={styles.buttonText}>{title}</Text></Pressable>; }
function Centered({ children }) { return <View style={styles.centered}>{children}</View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG }, centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  loginCard: { margin: 24, marginTop: 70, padding: 26, backgroundColor: '#FFF', borderRadius: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  logo: { width: 220, height: 56, alignSelf: 'center', marginBottom: 18 }, title: { fontSize: 24, color: DARK, fontWeight: '700', textAlign: 'center' }, subtitle: { fontSize: 14, color: '#7B858B', textAlign: 'center', marginTop: 6, marginBottom: 26 },
  fieldLabel: { color: DARK, fontWeight: '700', fontSize: 13, marginBottom: 6 }, field: { backgroundColor: '#F1F1F1', borderRadius: 14, paddingHorizontal: 15, paddingVertical: 13, color: DARK }, button: { backgroundColor: BLUE, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8 }, buttonText: { color: '#FFF', fontWeight: '800', fontSize: 16 }, hint: { color: '#8B9499', textAlign: 'center', fontSize: 12, marginTop: 14 }, error: { color: '#B33A3A', marginBottom: 10, textAlign: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' }, brand: { color: PINK, fontSize: 24, letterSpacing: 3, fontWeight: '500' }, headerSub: { color: DARK, fontSize: 12, marginTop: 2 }, link: { color: BLUE, fontWeight: '700' }, content: { flex: 1, padding: 20 }, greeting: { color: DARK, fontSize: 22, fontWeight: '800', marginBottom: 18 }, sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }, sectionTitle: { color: DARK, fontSize: 20, fontWeight: '800' }, sectionSub: { color: '#7B858B', marginTop: 4, marginBottom: 12 }, muted: { color: '#8A949A', marginBottom: 8 },
  conversationCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 15, flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#ECECEC' }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, avatarText: { color: DARK, fontWeight: '800', fontSize: 18 }, personName: { color: DARK, fontWeight: '800', fontSize: 16 }, lastMessage: { color: '#7B858B', marginTop: 4 }, badge: { minWidth: 24, height: 24, borderRadius: 12, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }, badgeText: { color: '#FFF', fontWeight: '800' }, empty: { backgroundColor: '#FFF', borderRadius: 18, padding: 20, marginTop: 8, marginBottom: 8 }, emptyTitle: { fontSize: 17, fontWeight: '800', color: DARK }, emptyText: { color: '#7B858B', marginTop: 6, marginBottom: 6 }, smallButton: { backgroundColor: BLUE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }, smallButtonText: { color: '#FFF', fontWeight: '800' }, refreshButton: { alignItems: 'center', padding: 12 },
  userSelect: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: '#ECECEC' }, userSelectChecked: { borderColor: BLUE, backgroundColor: '#EEF6F8' }, checkbox: { fontSize: 26, color: BLUE, marginHorizontal: 8 },
  chatHeader: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE' }, back: { fontSize: 38, color: DARK, width: 40, lineHeight: 38 }, chatName: { color: DARK, fontSize: 17, fontWeight: '800' }, chatStatus: { color: '#7B858B', marginTop: 2, fontSize: 12 }, dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 }, messages: { padding: 16, paddingBottom: 12 }, bubbleRow: { marginBottom: 10, flexDirection: 'row' }, mineRow: { justifyContent: 'flex-end' }, theirRow: { justifyContent: 'flex-start' }, bubble: { maxWidth: '82%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 }, mineBubble: { backgroundColor: PINK, borderBottomRightRadius: 5 }, theirBubble: { backgroundColor: '#FFF', borderBottomLeftRadius: 5, borderWidth: 1, borderColor: '#ECECEC' }, bubbleText: { color: DARK, fontSize: 15, lineHeight: 21 }, senderName: { color: BLUE, fontWeight: '800', fontSize: 11, marginBottom: 4 }, metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 5, gap: 6 }, time: { color: '#778187', fontSize: 10 }, status: { color: '#4F737E', fontSize: 10, fontWeight: '700' }, noMessages: { color: '#8A949A', textAlign: 'center', marginTop: 60 }, typing: { color: '#7B858B', fontStyle: 'italic', paddingHorizontal: 18, paddingBottom: 6, fontSize: 12 }, inputBar: { backgroundColor: '#FFF', padding: 10, borderTopWidth: 1, borderTopColor: '#EEE', flexDirection: 'row', alignItems: 'flex-end' }, input: { flex: 1, maxHeight: 100, backgroundColor: '#F1F1F1', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, color: DARK }, send: { width: 44, height: 44, borderRadius: 22, backgroundColor: BLUE, alignItems: 'center', justifyContent: 'center', marginLeft: 8 }, sendDisabled: { opacity: 0.45 }, sendText: { color: '#FFF', fontSize: 20, marginLeft: 2 }
});