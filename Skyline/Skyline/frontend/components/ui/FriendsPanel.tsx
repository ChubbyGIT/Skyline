'use client';
import React, { useState, useEffect } from 'react';
import { useStore, FriendProfile, FriendRequest as FRType } from '@/store/useStore';
import { Users, Search, UserPlus, Mail, X, Check, XCircle, ExternalLink } from 'lucide-react';

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(15px)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
};

/* ── Friend Profile Modal ── */
const FriendModal: React.FC<{ friend: FriendProfile; onClose: () => void }> = ({ friend, onClose }) => {
  const { removeFriend } = useStore();
  const visitCity = () => window.open(`/city/${friend.id}`, '_blank');
  const fmt = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-auto"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', animation: 'fmIn .25s ease-out' }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '380px', maxWidth: '90vw', borderRadius: '24px', padding: '32px',
        background: 'rgba(6,40,30,0.95)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(52,211,153,0.25)',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(16,185,129,0.08)',
        fontFamily: "'Inter', system-ui, sans-serif", color: '#d1fae5', position: 'relative',
        animation: 'fmScale .3s cubic-bezier(.16,1,.3,1)',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, width: 28, height: 28, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#6ee7b7',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}><X size={14} /></button>

        {/* Avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #34d399, #10b981)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 700, color: 'white',
          boxShadow: '0 0 20px rgba(52,211,153,0.4)',
        }}>{(friend.displayName || friend.username || '?')[0].toUpperCase()}</div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#d1fae5' }}>{friend.displayName || friend.username}</div>
          <div style={{ fontSize: 11, color: '#6ee7b780', marginTop: 2 }}>@{friend.username}</div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {[
            ['Joined', fmt(friend.createdAt)],
            ['Last Active', fmt(friend.lastActive)],
            ['Last Entry', fmt(friend.lastEntryAt)],
            ['Buildings', String(friend.buildingCount ?? '—')],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
              <span style={{ fontSize: 13, color: '#d1fae5', fontWeight: 500 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Visit City */}
        <button onClick={visitCity} style={{
          width: '100%', padding: '14px', borderRadius: 999, fontFamily: 'inherit',
          background: 'linear-gradient(135deg, #34d399, #10b981)',
          color: 'white', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
          boxShadow: '0 8px 25px rgba(16,185,129,0.4)', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          letterSpacing: '0.5px', textTransform: 'uppercase',
          marginBottom: 10,
        }}><ExternalLink size={14} /> Visit City</button>

        <button onClick={async () => { await removeFriend(friend.id); onClose(); }} style={{
          width: '100%', padding: '10px', borderRadius: 12, fontFamily: 'inherit',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444', fontWeight: 600, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s',
        }}>Remove Friend</button>
      </div>
      <style>{`
        @keyframes fmIn { from{opacity:0} to{opacity:1} }
        @keyframes fmScale { from{opacity:0;transform:scale(.95) translateY(12px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
};

/* ── Main Friends Panel ── */
export const FriendsPanel: React.FC = () => {
  const {
    friends, friendRequests, friendsLoading, currentUserProfile,
    fetchFriends, fetchFriendRequests, searchUsers,
    sendFriendRequest, acceptFriendRequest, declineFriendRequest,
    sendEmailInvite,
  } = useStore();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSent, setInviteSent] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await searchUsers(query);
      setResults(r); setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const friendIds = new Set((friends || []).map((f: FriendProfile) => f.id));
  const outgoingIds = new Set(
    (friendRequests || [])
      .filter((r: FRType) => r.fromUserId === currentUserProfile?.id)
      .map((r: FRType) => r.toUserId)
  );
  const incoming = (friendRequests || []).filter(
    (r: FRType) => r.toUserId === currentUserProfile?.id && r.status === 'pending'
  );

  const handleSend = async (uid: string) => {
    await sendFriendRequest(uid);
    setSentIds(p => new Set(p).add(uid));
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    await sendEmailInvite(inviteEmail, 'Come check out my Skyline city!');
    setInviteSent(true); setInviteEmail('');
    setTimeout(() => setInviteSent(false), 3000);
  };

  return (
    <>
      {selectedFriend && <FriendModal friend={selectedFriend} onClose={() => setSelectedFriend(null)} />}

      {/* ── Search ── */}
      <div style={{ fontSize: 11, color: '#6ee7b7', marginBottom: 8, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
        Find People
      </div>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <input type="text" placeholder="Search by name or email..." value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#d1fae5', fontSize: 12, outline: 'none', fontFamily: 'inherit', transition: 'all 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(52,211,153,0.4)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
        />
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: '#6ee7b7' }} />
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div style={{ ...glass, padding: 8, marginBottom: 14, maxHeight: 180, overflowY: 'auto' }}>
          {results.map((u: FriendProfile) => {
            const isFr = friendIds.has(u.id);
            const isPending = outgoingIds.has(u.id) || sentIds.has(u.id);
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 10, transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #34d399, #10b981)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                  }}>{(u.displayName || u.username || '?')[0].toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#d1fae5' }}>{u.displayName || u.username}</div>
                    <div style={{ fontSize: 10, color: '#6ee7b780' }}>@{u.username}</div>
                  </div>
                </div>
                {isFr ? (
                  <span style={{ fontSize: 10, color: '#34d399', fontWeight: 600 }}>Friends</span>
                ) : isPending ? (
                  <span style={{ fontSize: 10, color: '#fcd34d', fontWeight: 600 }}>Pending</span>
                ) : (
                  <button onClick={() => handleSend(u.id)} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
                    background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)',
                    color: '#34d399', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}><UserPlus size={10} /> Add</button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {searching && <div style={{ fontSize: 11, color: '#6ee7b760', marginBottom: 12, textAlign: 'center' }}>Searching...</div>}

      {/* No results — copy invite link */}
      {query.length >= 2 && !searching && results.length === 0 && (
        <div style={{ ...glass, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: '#d1fae5cc', marginBottom: 10 }}>No users found. Share Skyline with them!</div>
          <button onClick={async () => {
            const link = window.location.origin;
            await navigator.clipboard.writeText(`Join me on Skyline — build your memory city! ${link}`);
            // Also store in DB if they entered an email-like query
            if (query.includes('@')) {
              await sendEmailInvite(query, 'Come check out my Skyline city!');
            }
            setInviteSent(true);
            setTimeout(() => setInviteSent(false), 3000);
          }} style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)',
            color: '#34d399', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            transition: 'all 0.2s',
          }}>
            {inviteSent ? <><Check size={12} /> Copied!</> : <><ExternalLink size={12} /> Copy Invite Link</>}
          </button>
        </div>
      )}

      {/* ── Incoming Requests ── */}
      {incoming.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: '#fcd34d', marginBottom: 8, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
            Friend Requests ({incoming.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {incoming.map((r: FRType) => (
              <div key={r.id} style={{ ...glass, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #fcd34d, #f59e0b)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white',
                  }}>{(r.fromProfile?.displayName || '?')[0].toUpperCase()}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#d1fae5' }}>{r.fromProfile?.displayName || 'Someone'}</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => acceptFriendRequest(r.id)} style={{
                    width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(52,211,153,0.4)',
                    background: 'rgba(52,211,153,0.12)', color: '#34d399', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><Check size={12} /></button>
                  <button onClick={() => declineFriendRequest(r.id)} style={{
                    width: 26, height: 26, borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}><XCircle size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Friends List ── */}
      <div style={{ fontSize: 11, color: '#6ee7b7', marginBottom: 8, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 600 }}>
        Friends {friends?.length ? `(${friends.length})` : ''}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }} className="scrollbar-hide">
        {(friends || []).map((f: FriendProfile) => (
          <div key={f.id} onClick={() => setSelectedFriend(f)} style={{
            ...glass, display: 'flex', alignItems: 'center', padding: '12px 14px',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateX(0)'; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%', marginRight: 12, flexShrink: 0,
              background: 'linear-gradient(135deg, #34d399, #10b981)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontWeight: 700, color: 'white',
              boxShadow: '0 0 10px rgba(52,211,153,0.3)',
            }}>{(f.displayName || f.username || '?')[0].toUpperCase()}</div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#d1fae5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {f.displayName || f.username}
              </div>
              <div style={{ fontSize: 10, color: '#6ee7b780', marginTop: 2 }}>
                {f.buildingCount ?? 0} buildings
              </div>
            </div>
            {/* Activity dot */}
            <div style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: f.lastActive && (Date.now() - new Date(f.lastActive).getTime() < 86400000) ? '#34d399' : '#6ee7b740',
              boxShadow: f.lastActive && (Date.now() - new Date(f.lastActive).getTime() < 86400000) ? '0 0 6px #34d399' : 'none',
            }} />
          </div>
        ))}
        {(!friends || friends.length === 0) && !friendsLoading && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <Users size={24} style={{ color: '#6ee7b730', marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: '#6ee7b780', fontStyle: 'italic' }}>No friends yet. Search above to connect!</p>
          </div>
        )}
        {friendsLoading && (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 11, color: '#6ee7b760' }}>Loading...</div>
        )}
      </div>
    </>
  );
};
