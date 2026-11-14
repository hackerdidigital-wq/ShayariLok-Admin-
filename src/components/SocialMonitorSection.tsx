import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Ban,
  Check,
  Code2,
  Copy,
  Database,
  Flag,
  Heart,
  MapPin,
  MessagesSquare,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  deleteChatMessageInFirestore,
  seedDemoSocialDataToFirestore,
  subscribeChatRoomMessages,
  subscribeSocialMonitorData,
  toggleAppUserBlockInFirestore,
  toggleChatRoomSpamFlagInFirestore,
  toggleMessageFlagInFirestore,
} from '../services/socialFirestore';
import type {
  AppUserProfile,
  ChatMessageItem,
  ChatRoomItem,
  SocialEdgeItem,
} from '../types/config';
import { copyTextWithFeedback } from '../utils/clipboardToast';
import {
  DEMO_APP_USERS,
  DEMO_CHAT_MESSAGES,
  DEMO_CHAT_ROOMS,
  DEMO_SOCIAL_EDGES,
  buildAndroidSocialFirestoreEndpoints,
  computeSocialOverview,
  filterAppUsers,
  filterChatRooms,
  generateAndroidSocialIntegrationCode,
  getUserRelationships,
} from '../utils/socialMonitor';

interface SocialMonitorSectionProps {
  user: User | null;
  onSignIn: () => void;
}

type MonitorTab = 'chats' | 'users' | 'sdk';

export const SocialMonitorSection: React.FC<SocialMonitorSectionProps> = ({
  user,
  onSignIn,
}) => {
  const [activeTab, setActiveTab] = useState<MonitorTab>('chats');
  const [dataSource, setDataSource] = useState<'sandbox' | 'firestore'>(() =>
    user ? 'firestore' : 'sandbox'
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Cloud state
  const [cloudUsers, setCloudUsers] = useState<AppUserProfile[]>([]);
  const [cloudEdges, setCloudEdges] = useState<SocialEdgeItem[]>([]);
  const [cloudRooms, setCloudRooms] = useState<ChatRoomItem[]>([]);
  const [cloudMessages, setCloudMessages] = useState<ChatMessageItem[]>([]);

  // Sandbox state (deterministic interactive state when offline/unauthenticated or empty)
  const [sandboxUsers, setSandboxUsers] = useState<AppUserProfile[]>(() => [
    ...DEMO_APP_USERS,
  ]);
  const [sandboxEdges] = useState<SocialEdgeItem[]>(() => [
    ...DEMO_SOCIAL_EDGES,
  ]);
  const [sandboxRooms, setSandboxRooms] = useState<ChatRoomItem[]>(() => [
    ...DEMO_CHAT_ROOMS,
  ]);
  const [sandboxMessages, setSandboxMessages] = useState<
    Record<string, ChatMessageItem[]>
  >(() => ({ ...DEMO_CHAT_MESSAGES }));

  // Filters & selections
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<
    'all' | 'online' | 'blocked'
  >('all');
  const [selectedUserId, setSelectedUserId] = useState<string>(
    DEMO_APP_USERS[0].uid
  );

  const [roomSearch, setRoomSearch] = useState('');
  const [onlyFlaggedRooms, setOnlyFlaggedRooms] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    DEMO_CHAT_ROOMS[0].id
  );

  const [blockModalUser, setBlockModalUser] = useState<AppUserProfile | null>(
    null
  );
  const [blockReasonInput, setBlockReasonInput] = useState(
    'Spam / Unauthorized promotional links'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setDataSource('sandbox');
      return;
    }
    setDataSource('firestore');
    setCloudError(null);
    const unsub = subscribeSocialMonitorData({
      onUsers: (list) => {
        setCloudUsers(list);
      },
      onEdges: (list) => {
        setCloudEdges(list);
      },
      onRooms: (list) => {
        setCloudRooms(list);
      },
      onError: (err) => {
        setCloudError(
          err.message.includes('Missing or insufficient permissions')
            ? 'Firestore permission notice: Only verified Admin email can read all user chat logs. Showing interactive Sandbox preview.'
            : err.message
        );
        setDataSource('sandbox');
      },
    });
    return () => unsub();
  }, [user]);

  const effectiveUsers =
    dataSource === 'firestore' && cloudUsers.length > 0
      ? cloudUsers
      : dataSource === 'firestore' && cloudUsers.length === 0
        ? []
        : sandboxUsers;

  const effectiveEdges =
    dataSource === 'firestore' ? cloudEdges : sandboxEdges;
  const effectiveRooms =
    dataSource === 'firestore' ? cloudRooms : sandboxRooms;

  useEffect(() => {
    if (effectiveRooms.length > 0) {
      const exists = effectiveRooms.some((r) => r.id === selectedRoomId);
      if (!exists) setSelectedRoomId(effectiveRooms[0].id);
    }
  }, [effectiveRooms, selectedRoomId]);

  useEffect(() => {
    if (effectiveUsers.length > 0) {
      const exists = effectiveUsers.some((u) => u.uid === selectedUserId);
      if (!exists) setSelectedUserId(effectiveUsers[0].uid);
    }
  }, [effectiveUsers, selectedUserId]);

  useEffect(() => {
    if (dataSource !== 'firestore' || !selectedRoomId) {
      setCloudMessages([]);
      return;
    }
    const unsub = subscribeChatRoomMessages(
      selectedRoomId,
      (msgs) => setCloudMessages(msgs),
      (err) => setCloudError(err.message)
    );
    return () => unsub();
  }, [dataSource, selectedRoomId]);

  const overview = useMemo(
    () => computeSocialOverview(effectiveUsers, effectiveEdges, effectiveRooms),
    [effectiveUsers, effectiveEdges, effectiveRooms]
  );

  const filteredUsers = useMemo(
    () => filterAppUsers(effectiveUsers, userSearch, userStatusFilter),
    [effectiveUsers, userSearch, userStatusFilter]
  );

  const filteredRooms = useMemo(
    () => filterChatRooms(effectiveRooms, roomSearch, onlyFlaggedRooms),
    [effectiveRooms, roomSearch, onlyFlaggedRooms]
  );

  const activeRoom = useMemo(
    () => effectiveRooms.find((r) => r.id === selectedRoomId) ?? null,
    [effectiveRooms, selectedRoomId]
  );

  const activeMessages = useMemo(() => {
    if (dataSource === 'firestore') return cloudMessages;
    return sandboxMessages[selectedRoomId] ?? [];
  }, [dataSource, cloudMessages, sandboxMessages, selectedRoomId]);

  const inspectedUser = useMemo(
    () => effectiveUsers.find((u) => u.uid === selectedUserId) ?? null,
    [effectiveUsers, selectedUserId]
  );

  const inspectedRelationships = useMemo(() => {
    if (!inspectedUser) {
      return { followers: [], following: [], likedBy: [], likedTargets: [] };
    }
    return getUserRelationships(inspectedUser.uid, effectiveEdges);
  }, [inspectedUser, effectiveEdges]);

  const endpoints = useMemo(
    () =>
      buildAndroidSocialFirestoreEndpoints({
        projectId: firebaseConfig.projectId,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
      }),
    []
  );

  const kotlinSdkCode = useMemo(
    () =>
      generateAndroidSocialIntegrationCode({
        projectId: firebaseConfig.projectId,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
        apiKey: firebaseConfig.apiKey,
        appId: firebaseConfig.appId,
      }),
    []
  );

  const handleCopy = async (id: string, value: string, label: string) => {
    const ok = await copyTextWithFeedback(value, label);
    if (ok) {
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    }
  };

  const handleConfirmBlockToggle = async (
    targetUser: AppUserProfile,
    nextBlocked: boolean,
    reason: string
  ) => {
    if (dataSource === 'firestore') {
      try {
        await toggleAppUserBlockInFirestore(targetUser.uid, nextBlocked, reason);
      } catch (err) {
        setCloudError(
          err instanceof Error ? err.message : 'Failed to update block status'
        );
      }
    } else {
      setSandboxUsers((prev) =>
        prev.map((u) =>
          u.uid === targetUser.uid
            ? {
                ...u,
                isBlocked: nextBlocked,
                blockReason: nextBlocked ? reason.trim() || 'Blocked by Admin' : '',
              }
            : u
        )
      );
    }
    setBlockModalUser(null);
  };

  const handleToggleRoomSpam = async (room: ChatRoomItem) => {
    const next = !room.flaggedSpam;
    if (dataSource === 'firestore') {
      try {
        await toggleChatRoomSpamFlagInFirestore(room.id, next);
      } catch (err) {
        setCloudError(err instanceof Error ? err.message : 'Failed to flag room');
      }
    } else {
      setSandboxRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, flaggedSpam: next } : r))
      );
    }
  };

  const handleToggleMessageFlag = async (msg: ChatMessageItem) => {
    const next = !msg.isFlagged;
    if (dataSource === 'firestore') {
      try {
        await toggleMessageFlagInFirestore(msg.roomId, msg.id, next);
      } catch (err) {
        setCloudError(
          err instanceof Error ? err.message : 'Failed to update message flag'
        );
      }
    } else {
      setSandboxMessages((prev) => ({
        ...prev,
        [msg.roomId]: (prev[msg.roomId] ?? []).map((m) =>
          m.id === msg.id ? { ...m, isFlagged: next } : m
        ),
      }));
    }
  };

  const handleDeleteMessage = async (msg: ChatMessageItem) => {
    if (dataSource === 'firestore') {
      try {
        await deleteChatMessageInFirestore(msg.roomId, msg.id);
      } catch (err) {
        setCloudError(
          err instanceof Error ? err.message : 'Failed to delete message'
        );
      }
    } else {
      setSandboxMessages((prev) => ({
        ...prev,
        [msg.roomId]: (prev[msg.roomId] ?? []).filter((m) => m.id !== msg.id),
      }));
    }
  };

  const handleSeedToFirestore = async () => {
    if (!user) {
      onSignIn();
      return;
    }
    setSeeding(true);
    setCloudError(null);
    try {
      await seedDemoSocialDataToFirestore();
      setDataSource('firestore');
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Failed to seed demo social data'
      );
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Control */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
            <span>Firestore DB: {firebaseConfig.firestoreDatabaseId}</span>
            <span aria-hidden="true">·</span>
            <span
              className={
                dataSource === 'firestore'
                  ? 'text-emerald-700 font-semibold'
                  : 'text-amber-700 font-semibold'
              }
            >
              {dataSource === 'firestore'
                ? 'Live Cloud Firestore Stream'
                : 'Interactive Demo Sandbox'}
            </span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Users &amp; Live Chats (चैटिंग और यूजर्स कंट्रोल)
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            ऐप के सभी रजिस्टर्ड यूजर्स, शहर/पता, फॉलोअर्स/लाइक्स और 1-on-1 गुप्त चैट लॉग्स को रियल-टाइम मॉनिटर करें और स्पैम यूजर्स को तुरंत ब्लॉक करें।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {user && (
            <div className="flex items-center p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setDataSource('firestore')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  dataSource === 'firestore'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Live Cloud
              </button>
              <button
                type="button"
                onClick={() => setDataSource('sandbox')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  dataSource === 'sandbox'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Demo Sandbox
              </button>
            </div>
          )}

          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeedToFirestore()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            <span>
              {!user
                ? 'Sign In for Live Sync'
                : seeding
                  ? 'Seeding...'
                  : 'Seed Demo Data to Cloud'}
            </span>
          </button>
        </div>
      </div>

      {cloudError && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-xs sm:text-sm text-amber-900 flex items-center gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
          <span>{cloudError}</span>
        </div>
      )}

      {/* 4-Metric KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total App Users</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {overview.totalUsers}
          </div>
          <div className="mt-1 text-xs text-emerald-700 font-medium tabular-nums">
            {overview.onlineUsers} active online
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Follows &amp; Likes</span>
            <Heart className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {overview.totalFollows + overview.totalLikes}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums">
            {overview.totalFollows} follows · {overview.totalLikes} likes
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Live Chat Rooms</span>
            <MessagesSquare className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {overview.activeChatRooms}
          </div>
          <div className="mt-1 text-xs text-slate-600">
            1-on-1 real-time logs
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Blocked &amp; Flagged</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {overview.blockedUsers} / {overview.flaggedRooms}
          </div>
          <div className="mt-1 text-xs text-red-700 font-medium">
            Users blocked · Chats flagged
          </div>
        </div>
      </div>

      {/* Segmented Workspace Switch */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('chats')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'chats'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <MessagesSquare className="w-4 h-4" />
          <span>Live Chat Logs ({effectiveRooms.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users &amp; Social Graph ({effectiveUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sdk')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'sdk'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Android Chat &amp; Social SDK Code</span>
        </button>
      </div>

      {/* TAB 1: LIVE CHAT LOGS (Secret Real-Time Monitor) */}
      {activeTab === 'chats' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Chat Room Selector */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm font-bold text-slate-900">
                  Active Conversations
                </h3>
                <label className="flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyFlaggedRooms}
                    onChange={(e) => setOnlyFlaggedRooms(e.target.checked)}
                    className="rounded border-slate-300 text-red-600"
                  />
                  <span>Spam only</span>
                </label>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={roomSearch}
                  onChange={(e) => setRoomSearch(e.target.value)}
                  placeholder="Search user name, UID or message..."
                  aria-label="Search chat rooms"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto flex-1">
              {filteredRooms.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <p>अभी कोई चैट लॉग नहीं मिला।</p>
                  {user && dataSource === 'firestore' && (
                    <button
                      type="button"
                      onClick={() => void handleSeedToFirestore()}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg"
                    >
                      Seed Demo Conversations
                    </button>
                  )}
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const selected = room.id === selectedRoomId;
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => setSelectedRoomId(room.id)}
                      className={`w-full text-left p-4 transition-colors space-y-1.5 ${
                        selected ? 'bg-indigo-50/75' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {room.participantNames[0]} ↔ {room.participantNames[1]}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0">
                          {room.messageCount} msgs
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {room.lastMessage}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] font-mono">
                        <span className="text-slate-400 truncate">
                          {room.participantIds.join(' · ')}
                        </span>
                        {room.flaggedSpam && (
                          <span className="text-red-700 font-semibold shrink-0">
                            SPAM FLAGGED
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Full Transcript Viewer + Instant Block Controls */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
            {activeRoom ? (
              <>
                <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
                  <div>
                    <div className="text-sm font-bold text-slate-900">
                      {activeRoom.participantNames[0]} ↔{' '}
                      {activeRoom.participantNames[1]}
                    </div>
                    <div className="font-mono text-[11px] text-slate-500">
                      Room ID: {activeRoom.id} · UIDs:{' '}
                      {activeRoom.participantIds[0]} /{' '}
                      {activeRoom.participantIds[1]}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleRoomSpam(activeRoom)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        activeRoom.flaggedSpam
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>
                        {activeRoom.flaggedSpam
                          ? 'Unflag Spam Room'
                          : 'Flag Room as Spam'}
                      </span>
                    </button>

                    {activeRoom.participantIds.map((pid, idx) => {
                      const matchedUser = effectiveUsers.find(
                        (u) => u.uid === pid
                      );
                      const labelName =
                        matchedUser?.displayName ||
                        activeRoom.participantNames[idx] ||
                        pid;
                      const isBlocked = Boolean(matchedUser?.isBlocked);
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => {
                            if (matchedUser) {
                              if (isBlocked) {
                                void handleConfirmBlockToggle(
                                  matchedUser,
                                  false,
                                  ''
                                );
                              } else {
                                setBlockModalUser(matchedUser);
                              }
                            }
                          }}
                          disabled={!matchedUser}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                            isBlocked
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-600 text-white hover:bg-red-700'
                          }`}
                        >
                          {isBlocked ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Unblock {labelName.split(' ')[0]}</span>
                            </>
                          ) : (
                            <>
                              <Ban className="w-3.5 h-3.5" />
                              <span>Block {labelName.split(' ')[0]}</span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 space-y-3 max-h-[460px] overflow-y-auto flex-1 bg-slate-50/40">
                  {activeMessages.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      इस चैट रूम में अभी कोई मैसेज नहीं है।
                    </div>
                  ) : (
                    activeMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl border space-y-2 ${
                          msg.isFlagged
                            ? 'bg-red-50/70 border-red-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-slate-900">
                              {msg.senderName}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">
                              ({msg.senderId} → {msg.receiverId})
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                              {new Date(msg.createdAt).toLocaleTimeString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => void handleToggleMessageFlag(msg)}
                              aria-label={`Flag message ${msg.id}`}
                              className={`p-1 rounded hover:bg-slate-100 ${
                                msg.isFlagged ? 'text-red-600' : 'text-slate-400'
                              }`}
                              title={msg.isFlagged ? 'Remove spam flag' : 'Flag spam message'}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteMessage(msg)}
                              aria-label={`Delete message ${msg.id}`}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                              title="Delete message"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {msg.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-sm text-slate-500">
                किसी चैट रूम पर क्लिक करके लाइव बातचीत और मैसेज इतिहास देखें।
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USERS DIRECTORY + FULL SOCIAL GRAPH + BLOCKING */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Searchable Users List */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search UID, Name, @username, City or Address..."
                  aria-label="Search app users"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center p-1 bg-slate-100 rounded-lg shrink-0">
                {(['all', 'online', 'blocked'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setUserStatusFilter(mode)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      userStatusFilter === mode
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <p>कोई यूजर रिकॉर्ड नहीं मिला।</p>
                  {user && dataSource === 'firestore' && (
                    <button
                      type="button"
                      onClick={() => void handleSeedToFirestore()}
                      className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-lg"
                    >
                      Seed Demo Users to Firestore
                    </button>
                  )}
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = u.uid === selectedUserId;
                  return (
                    <div
                      key={u.uid}
                      className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedUserId(u.uid)}
                        className="text-left min-w-0 flex-1 space-y-1"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">
                            {u.displayName}
                          </span>
                          <span className="font-mono text-xs text-indigo-700">
                            @{u.username}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            ID: {u.uid}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {u.city} — {u.address}
                            </span>
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-slate-500 tabular-nums">
                          <span>{u.followersCount} followers</span>
                          <span>·</span>
                          <span>{u.followingCount} following</span>
                          <span>·</span>
                          <span>{u.likesReceivedCount} likes</span>
                          <span>·</span>
                          <span
                            className={
                              u.isBlocked
                                ? 'text-red-700 font-semibold'
                                : u.isOnline
                                  ? 'text-emerald-700 font-semibold'
                                  : 'text-slate-500'
                            }
                          >
                            {u.isBlocked
                              ? 'BLOCKED'
                              : u.isOnline
                                ? 'ONLINE'
                                : 'OFFLINE'}
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(u.uid)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 whitespace-nowrap"
                        >
                          Social Graph
                        </button>
                        {u.isBlocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleConfirmBlockToggle(u, false, '')
                            }
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Unblock</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBlockModalUser(u)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 whitespace-nowrap"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected User Profile + Followers/Following + Likes Inspector */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            {inspectedUser ? (
              <>
                <div className="border-b border-slate-200 pb-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold text-slate-900">
                        {inspectedUser.displayName}
                      </h3>
                      <div className="font-mono text-xs text-slate-500">
                        @{inspectedUser.username} · UID: {inspectedUser.uid}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        inspectedUser.isBlocked
                          ? 'text-red-700'
                          : inspectedUser.isOnline
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                      }`}
                    >
                      {inspectedUser.isBlocked
                        ? 'Blocked'
                        : inspectedUser.isOnline
                          ? 'Active Online'
                          : 'Offline'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700">
                    {inspectedUser.bio || 'No bio added'}
                  </p>

                  <div className="text-xs text-slate-600 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>{inspectedUser.city}:</strong>{' '}
                      {inspectedUser.address}
                    </span>
                  </div>

                  {inspectedUser.isBlocked && inspectedUser.blockReason && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                      <strong>Block Reason:</strong> {inspectedUser.blockReason}
                    </div>
                  )}
                </div>

                {/* Followers & Following */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <UserPlus className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Follow Activity (किसने किसको फॉलो किया)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Followers ({inspectedRelationships.followers.length})
                      </div>
                      {inspectedRelationships.followers.length === 0 ? (
                        <div className="text-xs text-slate-400">None yet</div>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-800">
                          {inspectedRelationships.followers.map((e) => (
                            <li key={e.id} className="truncate">
                              • {e.actorName}{' '}
                              <span className="font-mono text-[10px] text-slate-400">
                                ({e.actorId})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Following ({inspectedRelationships.following.length})
                      </div>
                      {inspectedRelationships.following.length === 0 ? (
                        <div className="text-xs text-slate-400">None yet</div>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-800">
                          {inspectedRelationships.following.map((e) => (
                            <li key={e.id} className="truncate">
                              → {e.targetName}{' '}
                              <span className="font-mono text-[10px] text-slate-400">
                                ({e.targetId})
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                {/* Likes Graph */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    <span>Like Activity (किसने किसको लाइक किया)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Liked By ({inspectedRelationships.likedBy.length})
                      </div>
                      {inspectedRelationships.likedBy.length === 0 ? (
                        <div className="text-xs text-slate-400">None yet</div>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-800">
                          {inspectedRelationships.likedBy.map((e) => (
                            <li key={e.id} className="truncate">
                              ♥ {e.actorName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                      <div className="text-[11px] font-semibold text-slate-500">
                        Users Liked ({inspectedRelationships.likedTargets.length})
                      </div>
                      {inspectedRelationships.likedTargets.length === 0 ? (
                        <div className="text-xs text-slate-400">None yet</div>
                      ) : (
                        <ul className="space-y-1 text-xs text-slate-800">
                          {inspectedRelationships.likedTargets.map((e) => (
                            <li key={e.id} className="truncate">
                              → {e.targetName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-xs text-slate-500">
                किसी यूजर को चुनें ताकि उसकी पूरी प्रोफ़ाइल, लोकेशन और फॉलो/लाइक डिटेल देख सकें।
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ANDROID CHAT & SOCIAL SDK / ENDPOINTS */}
      {activeTab === 'sdk' && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900">
                Firebase Real-Time Social &amp; Chat Collection Endpoints
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">
                अपने Android User App में नीचे दिए गए Firestore Database ID और कलेक्शन पाथ का उपयोग करें—हर मैसेज, फॉलो और लाइक तुरंत इस एडमिन मॉनिटर में लाइव दिखेगा।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                {
                  id: 'db-id',
                  label: 'Firestore Database ID',
                  val: firebaseConfig.firestoreDatabaseId,
                },
                {
                  id: 'proj-id',
                  label: 'Firebase Project ID',
                  val: firebaseConfig.projectId,
                },
                {
                  id: 'ep-users',
                  label: 'App Users Profile Endpoint (/appUsers)',
                  val: endpoints.appUsersPath,
                },
                {
                  id: 'ep-edges',
                  label: 'Follows & Likes Endpoint (/socialEdges)',
                  val: endpoints.socialEdgesPath,
                },
                {
                  id: 'ep-rooms',
                  label: 'Live Chat Rooms Endpoint (/chatRooms)',
                  val: endpoints.chatRoomsPath,
                },
                {
                  id: 'ep-msgs',
                  label: 'Chat Messages Subcollection',
                  val: endpoints.messagesSubcollectionTemplate,
                },
              ].map((item) => {
                const isCopied = copiedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        {item.label}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopy(item.id, item.val, item.label)
                        }
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white border border-slate-200 rounded-md hover:bg-indigo-50 shrink-0"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700" />
                            <span className="text-emerald-700">
                              Copied Successfully!
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 break-all">
                      {item.val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="font-mono text-xs font-semibold text-slate-100">
                  ShayariSocialRepository.kt
                </div>
                <div className="text-[11px] text-slate-400">
                  User Registration · Follow/Like Edges · 1-on-1 Real-Time Chat · Instant Block Enforcement
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void handleCopy('kotlin-sdk', kotlinSdkCode, 'Kotlin Social SDK Code')
                }
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 shrink-0"
              >
                {copiedId === 'kotlin-sdk' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-700">
                      Copied Successfully!
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Kotlin Code</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-5 overflow-x-auto text-xs font-mono text-slate-100 leading-relaxed max-h-[500px]">
              <code>{kotlinSdkCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Block User Confirmation Dialog */}
      {blockModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="block-user-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3
              id="block-user-dialog-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Block Spam User: {blockModalUser.displayName}
            </h3>
            <p className="text-xs text-slate-600">
              यूज़र को ब्लॉक करने पर वह तुरंत ऐप की रियल-टाइम चैट में कोई भी नया मैसेज नहीं भेज पाएगा।
            </p>
            <div>
              <label
                htmlFor="block-reason-input"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Block Reason (Optional)
              </label>
              <input
                id="block-reason-input"
                type="text"
                value={blockReasonInput}
                onChange={(e) => setBlockReasonInput(e.target.value)}
                maxLength={240}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBlockModalUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleConfirmBlockToggle(
                    blockModalUser,
                    true,
                    blockReasonInput
                  )
                }
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Confirm Block User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
