import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  Ban,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Database,
  Eraser,
  Flag,
  Heart,
  MapPin,
  MessagesSquare,
  Pencil,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  cleanupDummySocialDataInFirestore,
  deleteAppUserInFirestore,
  deleteChatMessageInFirestore,
  deleteChatRoomInFirestore,
  deleteSocialEdgeInFirestore,
  seedDemoSocialDataToFirestore,
  subscribeChatRoomMessages,
  subscribeSocialMonitorData,
  toggleAppUserBlockInFirestore,
  toggleChatRoomSpamFlagInFirestore,
  toggleMessageFlagInFirestore,
  updateAppUserProfileInFirestore,
  verifyDirectFirestoreConnection,
  type CollectionConnectionStatus,
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
  buildSocialCleanupPlan,
  computeSocialOverview,
  filterAppUsers,
  filterChatRooms,
  generateAndroidSocialIntegrationCode,
  getUserRelationships,
  isDummyAppUser,
} from '../utils/socialMonitor';

interface SocialMonitorSectionProps {
  user: User | null;
  activeSiteId?: string;
  onSignIn: () => void;
}

type MonitorTab = 'chats' | 'users' | 'sdk';

export const SocialMonitorSection: React.FC<SocialMonitorSectionProps> = ({
  user,
  activeSiteId,
  onSignIn,
}) => {
  const [activeTab, setActiveTab] = useState<MonitorTab>('chats');
  const [dataSource, setDataSource] = useState<'sandbox' | 'firestore'>(() =>
    user ? 'firestore' : 'sandbox'
  );
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'info' | 'error';
    text: string;
  } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  // Direct Firestore 5-collection health state
  const [checkingDb, setCheckingDb] = useState(false);
  const [dbHealth, setDbHealth] = useState<CollectionConnectionStatus[] | null>(
    null
  );
  const [streamStatus, setStreamStatus] = useState<
    Record<'appUsers' | 'socialEdges' | 'chatRooms', { status: 'connecting' | 'live' | 'error'; detail: string }>
  >({
    appUsers: { status: 'connecting', detail: 'Waiting for snapshot...' },
    socialEdges: { status: 'connecting', detail: 'Waiting for snapshot...' },
    chatRooms: { status: 'connecting', detail: 'Waiting for snapshot...' },
  });

  // Cloud state
  const [cloudUsers, setCloudUsers] = useState<AppUserProfile[]>([]);
  const [cloudEdges, setCloudEdges] = useState<SocialEdgeItem[]>([]);
  const [cloudRooms, setCloudRooms] = useState<ChatRoomItem[]>([]);
  const [cloudMessages, setCloudMessages] = useState<ChatMessageItem[]>([]);

  // Sandbox state (deterministic interactive state when unauthenticated)
  const [sandboxUsers, setSandboxUsers] = useState<AppUserProfile[]>(() => [
    ...DEMO_APP_USERS,
  ]);
  const [sandboxEdges, setSandboxEdges] = useState<SocialEdgeItem[]>(() => [
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

  // Modals (Zero window.alert / window.confirm)
  const [blockModalUser, setBlockModalUser] = useState<AppUserProfile | null>(
    null
  );
  const [blockReasonInput, setBlockReasonInput] = useState(
    'Spam / Unauthorized promotional links'
  );

  const [editModalUser, setEditModalUser] = useState<AppUserProfile | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    displayName: '',
    username: '',
    city: '',
    address: '',
    bio: '',
    isOnline: true,
  });

  const [deleteUserTarget, setDeleteUserTarget] =
    useState<AppUserProfile | null>(null);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<ChatRoomItem | null>(
    null
  );
  const [cleanupModalOpen, setCleanupModalOpen] = useState(false);
  const [cleanupIncludeFlagged, setCleanupIncludeFlagged] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const runLiveDbVerification = useCallback(async () => {
    setCheckingDb(true);
    try {
      const results = await verifyDirectFirestoreConnection({
        uid: user?.uid ?? null,
        activeSiteId: activeSiteId ?? null,
      });
      setDbHealth(results);
    } finally {
      setCheckingDb(false);
    }
  }, [user?.uid, activeSiteId]);

  useEffect(() => {
    if (!user) {
      setDataSource('sandbox');
      setDbHealth(null);
      return;
    }
    setDataSource('firestore');
    setCloudError(null);
    setStreamStatus({
      appUsers: { status: 'connecting', detail: 'Subscribing to /appUsers...' },
      socialEdges: { status: 'connecting', detail: 'Subscribing to /socialEdges...' },
      chatRooms: { status: 'connecting', detail: 'Subscribing to /chatRooms...' },
    });

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
      onCollectionStatus: (col, status, detail) => {
        setStreamStatus((prev) => ({
          ...prev,
          [col]: { status, detail },
        }));
      },
      onError: (err) => {
        setCloudError(
          err.message.includes('Missing or insufficient permissions')
            ? 'Firestore permission notice: Only the verified Admin email can read/write live social & chat collections.'
            : err.message
        );
      },
    });
    void runLiveDbVerification();
    return () => unsub();
  }, [user, runLiveDbVerification]);

  const effectiveUsers =
    dataSource === 'firestore' ? cloudUsers : sandboxUsers;
  const effectiveEdges =
    dataSource === 'firestore' ? cloudEdges : sandboxEdges;
  const effectiveRooms =
    dataSource === 'firestore' ? cloudRooms : sandboxRooms;

  useEffect(() => {
    if (effectiveRooms.length > 0) {
      const exists = effectiveRooms.some((r) => r.id === selectedRoomId);
      if (!exists) setSelectedRoomId(effectiveRooms[0].id);
    } else {
      setSelectedRoomId('');
    }
  }, [effectiveRooms, selectedRoomId]);

  useEffect(() => {
    if (effectiveUsers.length > 0) {
      const exists = effectiveUsers.some((u) => u.uid === selectedUserId);
      if (!exists) setSelectedUserId(effectiveUsers[0].uid);
    } else {
      setSelectedUserId('');
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

  const cleanupPlan = useMemo(
    () =>
      buildSocialCleanupPlan(effectiveUsers, effectiveEdges, effectiveRooms, {
        includeBlockedOrFlagged: cleanupIncludeFlagged,
      }),
    [effectiveUsers, effectiveEdges, effectiveRooms, cleanupIncludeFlagged]
  );

  const dummyOnlyPlan = useMemo(
    () =>
      buildSocialCleanupPlan(effectiveUsers, effectiveEdges, effectiveRooms, {
        includeBlockedOrFlagged: false,
      }),
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

  const openEditUserModal = (target: AppUserProfile) => {
    setEditModalUser(target);
    setEditForm({
      displayName: target.displayName,
      username: target.username,
      city: target.city,
      address: target.address,
      bio: target.bio,
      isOnline: target.isOnline,
    });
  };

  const handleSaveEditedProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalUser) return;
    setBusyAction(true);
    setCloudError(null);

    try {
      if (dataSource === 'firestore') {
        await updateAppUserProfileInFirestore(editModalUser.uid, editForm);
        setActionNotice({
          type: 'success',
          text: `${editForm.displayName} की प्रोफ़ाइल सीधे Firestore में अपडेट हो गई (User App पर तुरंत दिखेगी)।`,
        });
      } else {
        const cleanName = editForm.displayName.trim() || editModalUser.displayName;
        const cleanHandle =
          editForm.username.trim().replace(/[^a-zA-Z0-9_.]/g, '') ||
          editModalUser.username;
        setSandboxUsers((prev) =>
          prev.map((u) =>
            u.uid === editModalUser.uid
              ? {
                  ...u,
                  displayName: cleanName,
                  username: cleanHandle,
                  city: editForm.city.trim(),
                  address: editForm.address.trim(),
                  bio: editForm.bio.trim(),
                  isOnline: editForm.isOnline,
                  updatedAt: new Date().toISOString(),
                }
              : u
          )
        );
        setActionNotice({
          type: 'info',
          text: `${cleanName} की प्रोफ़ाइल Sandbox में अपडेट हुई।`,
        });
      }
      setEditModalUser(null);
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Failed to update user profile'
      );
    } finally {
      setBusyAction(false);
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
        setActionNotice({
          type: 'success',
          text: nextBlocked
            ? `${targetUser.displayName} को ब्लॉक किया गया।`
            : `${targetUser.displayName} को अनब्लॉक किया गया।`,
        });
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

  const handleConfirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    const target = deleteUserTarget;
    setBusyAction(true);
    setCloudError(null);
    try {
      if (dataSource === 'firestore') {
        const res = await deleteAppUserInFirestore(target.uid);
        setActionNotice({
          type: 'success',
          text: `यूजर "${target.displayName}" (${target.uid}) हमेशा के लिए डिलीट हो गया (${res.deletedEdges} edges, ${res.deletedRooms} rooms, ${res.deletedMessages} messages cleaned)।`,
        });
      } else {
        setSandboxUsers((prev) => prev.filter((u) => u.uid !== target.uid));
        setSandboxEdges((prev) =>
          prev.filter((e) => e.actorId !== target.uid && e.targetId !== target.uid)
        );
        setSandboxRooms((prev) =>
          prev.filter((r) => !r.participantIds.includes(target.uid))
        );
        setActionNotice({
          type: 'info',
          text: `Sandbox यूजर "${target.displayName}" हटाया गया।`,
        });
      }
      setDeleteUserTarget(null);
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Failed to permanently delete user'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deleteRoomTarget) return;
    const room = deleteRoomTarget;
    setBusyAction(true);
    setCloudError(null);
    try {
      if (dataSource === 'firestore') {
        const res = await deleteChatRoomInFirestore(room.id);
        setActionNotice({
          type: 'success',
          text: `चैट रूम "${room.id}" और उसके ${res.deletedMessages} मैसेज हमेशा के लिए डिलीट हो गए।`,
        });
      } else {
        setSandboxRooms((prev) => prev.filter((r) => r.id !== room.id));
        setSandboxMessages((prev) => {
          const copy = { ...prev };
          delete copy[room.id];
          return copy;
        });
        setActionNotice({
          type: 'info',
          text: `Sandbox चैट रूम "${room.id}" डिलीट हुआ।`,
        });
      }
      setDeleteRoomTarget(null);
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Failed to delete chat room'
      );
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteEdge = async (edge: SocialEdgeItem) => {
    setCloudError(null);
    if (dataSource === 'firestore') {
      try {
        await deleteSocialEdgeInFirestore(edge.id);
        setActionNotice({
          type: 'success',
          text: `Social edge (${edge.type}) हटाया गया।`,
        });
      } catch (err) {
        setCloudError(
          err instanceof Error ? err.message : 'Failed to delete social edge'
        );
      }
    } else {
      setSandboxEdges((prev) => prev.filter((e) => e.id !== edge.id));
    }
  };

  const handleExecuteCleanup = async () => {
    if (cleanupPlan.totalCount === 0) {
      setCleanupModalOpen(false);
      return;
    }
    setBusyAction(true);
    setCloudError(null);
    try {
      if (dataSource === 'firestore') {
        const res = await cleanupDummySocialDataInFirestore({
          userIds: cleanupPlan.userIds,
          edgeIds: cleanupPlan.edgeIds,
          roomIds: cleanupPlan.roomIds,
        });
        await runLiveDbVerification();
        setActionNotice({
          type: 'success',
          text: `Production Clean Complete: ${res.deletedUsers} dummy/spam users, ${res.deletedEdges} edges, ${res.deletedRooms} chat rooms व ${res.deletedMessages} messages स्थायी रूप से डिलीट हो गए!`,
        });
      } else {
        const uSet = new Set(cleanupPlan.userIds);
        const eSet = new Set(cleanupPlan.edgeIds);
        const rSet = new Set(cleanupPlan.roomIds);
        setSandboxUsers((prev) => prev.filter((u) => !uSet.has(u.uid)));
        setSandboxEdges((prev) => prev.filter((e) => !eSet.has(e.id)));
        setSandboxRooms((prev) => prev.filter((r) => !rSet.has(r.id)));
        setActionNotice({
          type: 'info',
          text: `Sandbox से ${cleanupPlan.totalCount} dummy entries साफ़ की गईं।`,
        });
      }
      setCleanupModalOpen(false);
    } catch (err) {
      setCloudError(
        err instanceof Error ? err.message : 'Failed to clean dummy/test data'
      );
    } finally {
      setBusyAction(false);
    }
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
      await runLiveDbVerification();
      setActionNotice({
        type: 'success',
        text: 'टेस्ट/डेमो डेटा क्लाउड में जुड़ गया। टेस्ट के बाद "Cleanup Dummy / Test Data" से हटा सकते हैं।',
      });
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
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
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
                ? 'Live Cloud Firestore Stream (No Delay)'
                : 'Local Sandbox Preview'}
            </span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Users, Profiles &amp; Live Chats Control Center
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            लाइव Firestore से जुड़े यूजर्स की प्रोफ़ाइल एडिट करें, स्पैम/टॉक्सिक अकाउंट को ब्लॉक या स्थायी रूप से डिलीट करें और डमी डेटा साफ़ रखें।
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

          {user && (
            <button
              type="button"
              disabled={checkingDb}
              onClick={() => void runLiveDbVerification()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 disabled:opacity-60 whitespace-nowrap"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-indigo-600 ${checkingDb ? 'animate-spin' : ''}`}
              />
              <span>Verify Live DB</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setCleanupIncludeFlagged(false);
              setCleanupModalOpen(true);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border whitespace-nowrap transition-colors ${
              dummyOnlyPlan.totalCount > 0
                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>
              Cleanup Dummy / Test Data
              {dummyOnlyPlan.totalCount > 0 ? ` (${dummyOnlyPlan.totalCount})` : ''}
            </span>
          </button>

          {!user && (
            <button
              type="button"
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 whitespace-nowrap"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Sign In for Live Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Direct 5-Collection Firestore Connection Diagnostics Bar */}
      {user && dataSource === 'firestore' && (
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Direct Firestore Collection Health (5 Collections)
              </h3>
            </div>
            <span className="font-mono text-[11px] text-slate-500">
              appUsers (canonical for appusers) · users · socialEdges · chatRooms · publicSites
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {(
              dbHealth ?? [
                {
                  collection: 'appUsers',
                  aliasNote: 'canonical for appusers',
                  status: streamStatus.appUsers.status,
                  latencyMs: null,
                  detail: streamStatus.appUsers.detail,
                  checkedAt: '',
                },
                {
                  collection: 'users',
                  aliasNote: 'admin workspace',
                  status: 'live',
                  latencyMs: null,
                  detail: `users/${user.uid.slice(0, 8)}...`,
                  checkedAt: '',
                },
                {
                  collection: 'socialEdges',
                  aliasNote: 'follows & likes',
                  status: streamStatus.socialEdges.status,
                  latencyMs: null,
                  detail: streamStatus.socialEdges.detail,
                  checkedAt: '',
                },
                {
                  collection: 'chatRooms',
                  aliasNote: '1-on-1 chats',
                  status: streamStatus.chatRooms.status,
                  latencyMs: null,
                  detail: streamStatus.chatRooms.detail,
                  checkedAt: '',
                },
                {
                  collection: 'publicSites',
                  aliasNote: 'live app & site mirror',
                  status: 'live',
                  latencyMs: null,
                  detail: `publicSites/${(activeSiteId || user.uid).slice(0, 10)}...`,
                  checkedAt: '',
                },
              ]
            ).map((item) => (
              <div
                key={item.collection}
                className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                  item.status === 'error'
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : item.status === 'live'
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono font-bold truncate">
                    /{item.collection}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : item.status === 'live'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.status === 'error'
                      ? 'BLOCKED'
                      : item.status === 'live'
                        ? item.latencyMs !== null
                          ? `${item.latencyMs}ms OK`
                          : 'LIVE'
                        : 'SYNCING'}
                  </span>
                </div>
                <div className="text-[11px] opacity-85 truncate" title={item.detail}>
                  {item.detail}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {actionNotice && (
        <div
          role="status"
          className={`px-4 py-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-2.5 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : actionNotice.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionNotice.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            aria-label="Dismiss status notice"
            className="p-1 rounded hover:bg-black/5 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {cloudError && (
        <div
          role="alert"
          className="px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-xs sm:text-sm text-red-900 flex flex-wrap items-center justify-between gap-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ShieldAlert className="w-4 h-4 text-red-700 shrink-0" />
            <span className="break-words">{cloudError}</span>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => {
                setCloudError(null);
                void runLiveDbVerification();
              }}
              className="px-3 py-1 text-xs font-semibold bg-white border border-red-200 rounded-lg text-red-700 hover:bg-red-100 shrink-0"
            >
              Retry DB Check
            </button>
          )}
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
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        {user && dataSource === 'firestore' && (
          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeedToFirestore()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-indigo-600" />
            <span>{seeding ? 'Seeding Test Data...' : 'Seed Test Data (QA Only)'}</span>
          </button>
        )}
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
                  <p className="font-semibold text-slate-700">
                    {dataSource === 'firestore'
                      ? 'Production Firestore Clean — 0 Chat Rooms'
                      : 'कोई चैट रूम नहीं मिला।'}
                  </p>
                  <p>
                    जब यूजर ऐप में कोई नई बातचीत शुरू होगी, तो वह बिना किसी देरी के यहाँ लाइव दिखेगी।
                  </p>
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

          {/* Full Transcript Viewer + Instant Block + Delete Room Controls */}
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

                    <button
                      type="button"
                      onClick={() => setDeleteRoomTarget(activeRoom)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Room</span>
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
                {effectiveRooms.length === 0
                  ? 'प्रोडक्शन चैट डेटाबेस साफ़ है। किसी नई चैट के शुरू होने पर यहाँ लाइव लॉग दिखेगा।'
                  : 'किसी चैट रूम पर क्लिक करके लाइव बातचीत और मैसेज इतिहास देखें।'}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USERS DIRECTORY + PROFILE EDIT + PERMANENT DELETE + SOCIAL GRAPH */}
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
                  <p className="font-semibold text-slate-700">
                    {dataSource === 'firestore'
                      ? 'Production Environment Clean — 0 User Accounts'
                      : 'कोई यूजर रिकॉर्ड नहीं मिला।'}
                  </p>
                  <p>
                    यूजर ऐप से साइन-अप होते ही सभी असली यूजर्स यहाँ रीयल-टाइम दिखने लगेंगे।
                  </p>
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = u.uid === selectedUserId;
                  const isDummy = isDummyAppUser(u);
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
                          {isDummy && (
                            <span className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              DUMMY/TEST
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {u.city || 'India'} — {u.address || 'Not provided'}
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

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditUserModal(u)}
                          title="Edit user profile"
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {u.isBlocked ? (
                          <button
                            type="button"
                            onClick={() =>
                              void handleConfirmBlockToggle(u, false, '')
                            }
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 whitespace-nowrap"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Unblock</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setBlockModalUser(u)}
                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 whitespace-nowrap"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Block</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeleteUserTarget(u)}
                          aria-label={`Delete ${u.displayName} permanently`}
                          title="Delete account permanently"
                          className="p-1.5 text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
                <div className="border-b border-slate-200 pb-4 space-y-3">
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
                      <strong>{inspectedUser.city || 'India'}:</strong>{' '}
                      {inspectedUser.address || 'No address added'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditUserModal(inspectedUser)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Live Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteUserTarget(inspectedUser)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Permanently</span>
                    </button>
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
                            <li
                              key={e.id}
                              className="flex items-center justify-between gap-1.5"
                            >
                              <span className="truncate">
                                • {e.actorName}{' '}
                                <span className="font-mono text-[10px] text-slate-400">
                                  ({e.actorId})
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDeleteEdge(e)}
                                aria-label={`Remove follower edge ${e.id}`}
                                className="p-0.5 text-slate-400 hover:text-red-600 shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
                            <li
                              key={e.id}
                              className="flex items-center justify-between gap-1.5"
                            >
                              <span className="truncate">
                                → {e.targetName}{' '}
                                <span className="font-mono text-[10px] text-slate-400">
                                  ({e.targetId})
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => void handleDeleteEdge(e)}
                                aria-label={`Remove following edge ${e.id}`}
                                className="p-0.5 text-slate-400 hover:text-red-600 shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
                            <li
                              key={e.id}
                              className="flex items-center justify-between gap-1.5"
                            >
                              <span className="truncate">♥ {e.actorName}</span>
                              <button
                                type="button"
                                onClick={() => void handleDeleteEdge(e)}
                                aria-label={`Remove like edge ${e.id}`}
                                className="p-0.5 text-slate-400 hover:text-red-600 shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
                            <li
                              key={e.id}
                              className="flex items-center justify-between gap-1.5"
                            >
                              <span className="truncate">→ {e.targetName}</span>
                              <button
                                type="button"
                                onClick={() => void handleDeleteEdge(e)}
                                aria-label={`Remove liked target edge ${e.id}`}
                                className="p-0.5 text-slate-400 hover:text-red-600 shrink-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
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
                किसी यूजर को चुनें ताकि उसकी प्रोफ़ाइल एडिट, लोकेशन और फॉलो/लाइक डिटेल देख सकें।
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
                अपने Android User App में नीचे दिए गए Firestore Database ID और कलेक्शन पाथ का उपयोग करें—प्रोफ़ाइल बदलाव, ब्लॉक/डिलीट एक्शन, मैसेज, फॉलो और लाइक बिना किसी देरी के तुरंत लाइव सिंक होंगे।
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
                  Rule-Safe Profile Sync · Instant Block &amp; Removal Listener · Sorted 1-on-1 Chat Updates
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

      {/* Edit User Profile Modal */}
      {editModalUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <form
            onSubmit={(e) => void handleSaveEditedProfile(e)}
            className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <h3
                id="edit-user-dialog-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Edit Live App User Profile
              </h3>
              <button
                type="button"
                onClick={() => setEditModalUser(null)}
                aria-label="Close edit dialog"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="font-mono text-[11px] text-slate-500">
              UID: {editModalUser.uid}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={editForm.displayName}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username (@handle)
                </label>
                <input
                  type="text"
                  required
                  maxLength={40}
                  value={editForm.username}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  maxLength={80}
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Online Presence
                </label>
                <select
                  value={editForm.isOnline ? 'online' : 'offline'}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      isOnline: e.target.value === 'online',
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address / Location Detail
              </label>
              <input
                type="text"
                maxLength={200}
                value={editForm.address}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, address: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bio
              </label>
              <textarea
                rows={2}
                maxLength={300}
                value={editForm.bio}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setEditModalUser(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyAction}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-60"
              >
                {busyAction ? 'Saving...' : 'Save Profile to Live Firestore'}
              </button>
            </div>
          </form>
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

      {/* Permanent Delete User Modal */}
      {deleteUserTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3
              id="delete-user-dialog-title"
              className="font-display text-base font-bold text-red-700"
            >
              Permanently Delete Account: {deleteUserTarget.displayName}?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              यह एक्शन यूजर <code className="font-mono text-xs">{deleteUserTarget.uid}</code> को <code className="font-mono text-xs">/appUsers</code>, उनके सभी <code className="font-mono text-xs">/socialEdges</code> (follow/like) और उनके सभी <code className="font-mono text-xs">/chatRooms</code> व मैसेज इतिहास को Firestore से हमेशा के लिए हटा देगा।
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void handleConfirmDeleteUser()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {busyAction ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Room Modal */}
      {deleteRoomTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-room-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3
              id="delete-room-dialog-title"
              className="font-display text-base font-bold text-red-700"
            >
              Delete Chat Room Permanently?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              रूम <code className="font-mono text-xs">{deleteRoomTarget.id}</code> (
              {deleteRoomTarget.participantNames.join(' ↔ ')}) और उसके अंदर के सभी चैट मैसेज Firestore से स्थायी रूप से हट जाएंगे।
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteRoomTarget(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyAction}
                onClick={() => void handleConfirmDeleteRoom()}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
              >
                {busyAction ? 'Deleting...' : 'Confirm Delete Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* One-Click Cleanup Dummy / Test Data Modal */}
      {cleanupModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cleanup-dummy-dialog-title"
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2">
              <h3
                id="cleanup-dummy-dialog-title"
                className="font-display text-base font-bold text-slate-900"
              >
                Cleanup Dummy &amp; Test Entries
              </h3>
              <button
                type="button"
                onClick={() => setCleanupModalOpen(false)}
                aria-label="Close cleanup modal"
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs text-slate-700">
              <div className="font-semibold text-slate-900">
                Detected Test / Seeded Entries:
              </div>
              <div className="font-mono tabular-nums">
                • Dummy / Test Users: {cleanupPlan.dummyUserCount}
              </div>
              <div className="font-mono tabular-nums">
                • Test Social Edges: {cleanupPlan.dummyEdgeCount}
              </div>
              <div className="font-mono tabular-nums">
                • Dummy Chat Rooms (+ messages): {cleanupPlan.dummyRoomCount}
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cleanupIncludeFlagged}
                onChange={(e) => setCleanupIncludeFlagged(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-red-600"
              />
              <span>
                Also purge blocked spam accounts ({cleanupPlan.flaggedSpamUserCount}) and spam-flagged rooms ({cleanupPlan.flaggedRoomCount})
              </span>
            </label>

            {cleanupPlan.totalCount === 0 ? (
              <p className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                अभी डेटाबेस में कोई dummy या test एंट्री मौजूद नहीं है। प्रोडक्शन डेटाबेस 100% साफ़ है!
              </p>
            ) : (
              <p className="text-xs text-slate-600">
                कुल <strong>{cleanupPlan.totalCount}</strong> एंट्रीज़ (चैट मैसेज सहित) स्थायी रूप से डिलीट की जाएंगी।
              </p>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setCleanupModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
              {cleanupPlan.totalCount > 0 && (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={() => void handleExecuteCleanup()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {busyAction ? 'Cleaning...' : 'Purge Dummy Data Permanently'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
