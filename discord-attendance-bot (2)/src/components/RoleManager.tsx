import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Crown, 
  ShieldCheck, 
  Shield, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Search, 
  Gamepad2, 
  Clock, 
  UserCheck, 
  AlertCircle,
  Save,
  Key,
  Lock
} from 'lucide-react';
import { UserAccount, UserPermissions, UserRole, TeamDepartment } from '../types/attendance';
import { formatArabicDate, formatArabicTime } from '../utils/formatters';

interface RoleManagerProps {
  currentUser: UserAccount;
  teams?: TeamDepartment[];
}

export const RoleManager: React.FC<RoleManagerProps> = ({ currentUser, teams = [] }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editRoleTitle, setEditRoleTitle] = useState('');
  const [editPermissions, setEditPermissions] = useState<UserPermissions>({
    manageTeams: false,
    manageBot: false,
    viewHistory: true,
    clearHistory: false,
    manageSettings: false,
    manageUsers: false,
  });
  const [editAllowedTeamsMode, setEditAllowedTeamsMode] = useState<'all' | 'custom'>('all');
  const [editAllowedTeamIds, setEditAllowedTeamIds] = useState<string[]>(['*']);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch users from server
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          setUsers(data.users);
          if (data.users.length > 0 && !selectedUser) {
            handleSelectUser(data.users[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSelectUser = (u: UserAccount) => {
    setSelectedUser(u);
    setEditRole(u.role);
    setEditRoleTitle(u.roleTitle || '');
    setEditPermissions({ ...u.permissions });
    
    // Check if user has all teams or specific teams
    const isAll = !u.allowedTeamIds || u.allowedTeamIds.length === 0 || u.allowedTeamIds.includes('*') || u.allowedTeamIds.includes('all');
    setEditAllowedTeamsMode(isAll ? 'all' : 'custom');
    if (isAll) {
      setEditAllowedTeamIds(teams.map((t) => t.id));
    } else {
      setEditAllowedTeamIds(u.allowedTeamIds ? [...u.allowedTeamIds] : []);
    }
    setSaveStatus(null);
  };

  const handleRolePresetChange = (role: UserRole) => {
    setEditRole(role);
    if (role === 'owner') {
      setEditRoleTitle('👑 القائد / صاحب السيرفر والموقع');
      setEditPermissions({
        manageTeams: true,
        manageBot: true,
        viewHistory: true,
        clearHistory: true,
        manageSettings: true,
        manageUsers: true,
      });
      setEditAllowedTeamsMode('all');
      setEditAllowedTeamIds(teams.map((t) => t.id));
    } else if (role === 'admin') {
      setEditRoleTitle('🛡️ مسؤول رئيسي (Admin)');
      setEditPermissions({
        manageTeams: true,
        manageBot: true,
        viewHistory: true,
        clearHistory: false,
        manageSettings: true,
        manageUsers: false,
      });
    } else if (role === 'supervisor') {
      setEditRoleTitle('⭐ مشرف فريق (Supervisor)');
      setEditPermissions({
        manageTeams: true,
        manageBot: false,
        viewHistory: true,
        clearHistory: false,
        manageSettings: false,
        manageUsers: false,
      });
    } else {
      setEditRoleTitle('👤 عضو مسجل (Member)');
      setEditPermissions({
        manageTeams: false,
        manageBot: false,
        viewHistory: true,
        clearHistory: false,
        manageSettings: false,
        manageUsers: false,
      });
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    if (!isOwner) {
      alert('عذراً، لا تملك رول أو صلاحية لتعديل رولات وصلاحيات الأعضاء.');
      return;
    }
    setIsSaving(true);
    setSaveStatus(null);

    const finalAllowedTeamIds = editAllowedTeamsMode === 'all'
      ? ['*']
      : (editAllowedTeamIds.length > 0 ? editAllowedTeamIds : []);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id,
        },
        body: JSON.stringify({
          role: editRole,
          roleTitle: editRoleTitle.trim(),
          permissions: editPermissions,
          allowedTeamIds: finalAllowedTeamIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث الصلاحيات');
      }

      setSaveStatus('تم حفظ وتحديث رتبة وصلاحيات وتخصيص فرق العضو بنجاح!');
      if (Array.isArray(data.users)) {
        setUsers(data.users);
      }
      setSelectedUser(data.user);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus(`خطأ: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!isOwner) {
      alert('عذراً، لا تملك رول أو صلاحية لحذف الحسابات.');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { 
        method: 'DELETE',
        headers: {
          'x-user-id': currentUser.id,
        }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        if (selectedUser?.id === userId) {
          setSelectedUser(data.users?.[0] || null);
        }
      } else {
        alert(data.error || 'تعذر الحذف');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.discordUsername.toLowerCase().includes(q) ||
      u.gameUsername.toLowerCase().includes(q) ||
      (u.roleTitle && u.roleTitle.toLowerCase().includes(q))
    );
  });

  const isOwner = currentUser.role === 'owner' || currentUser.permissions.manageUsers;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#2b2d31] via-[#1e1f22] to-[#2b2d31] border border-[#383a40] p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">إدارة الحسابات والرولات والصلاحيات</h1>
              <span className="text-xs bg-amber-500/20 text-amber-300 font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
                لوحة الليدر / صاحب الموقع
              </span>
            </div>
            <p className="text-xs text-[#949ba4] mt-1">
              يمكنك هنا رؤية جميع الأعضاء الذين قاموا بإنشاء حسابات وتعيين رتبهم وتحديد صلاحياتهم لكل قسم.
            </p>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          className="px-4 py-2 bg-[#1e1f22] hover:bg-[#35373c] border border-[#383a40] text-xs font-bold text-white rounded-xl transition-colors shrink-0"
        >
          🔄 تحديث القائمة
        </button>
      </div>

      {!isOwner && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>تنبيه: أنت تتصفح هذه اللوحة بوضع المشاهدة فقط؛ صلاحية تعديل الرولات والصلاحيات محصورة على القائد (الليدر / Owner).</span>
        </div>
      )}

      {/* Main Grid: User List & Permission Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Users List */}
        <div className="lg:col-span-5 bg-[#2b2d31] rounded-2xl border border-[#383a40] p-4 flex flex-col h-[650px]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#5865f2]" />
              <span className="text-sm font-bold text-white">قائمة الأعضاء ({users.length})</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث بالاسم، الديسكورد، أو يوزر اللعبة..."
              className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#80848e] outline-hidden pr-9"
            />
            <Search className="w-3.5 h-3.5 text-[#80848e] absolute right-3 top-2.5" />
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#949ba4]">جاري تحميل المستخدمين...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#949ba4]">لا يوجد مستخدمين مطابقين للبحث</div>
            ) : (
              filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#35373c] border-[#5865f2] shadow-sm'
                        : 'bg-[#1e1f22] border-[#383a40] hover:border-[#4e5058]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        u.role === 'owner'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : u.role === 'admin'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : u.role === 'supervisor'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {u.role === 'owner' ? '👑' : u.username.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 text-right">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{u.username}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                            u.role === 'owner'
                              ? 'bg-amber-500/20 text-amber-300'
                              : u.role === 'admin'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : u.role === 'supervisor'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-zinc-700 text-zinc-300'
                          }`}>
                            {u.roleTitle || u.role}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#949ba4] mt-0.5 truncate">
                          <span>💬 {u.discordUsername}</span>
                          <span>•</span>
                          <span>🎮 {u.gameUsername}</span>
                        </div>

                        {/* Allowed Teams Pills */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {(!u.allowedTeamIds || u.allowedTeamIds.length === 0 || u.allowedTeamIds.includes('*') || u.allowedTeamIds.includes('all')) ? (
                            <span className="text-[9px] bg-[#23a55a]/15 text-[#23a55a] px-1.5 py-0.2 rounded-full font-bold">
                              🌐 كافة الفرق
                            </span>
                          ) : (
                            u.allowedTeamIds.map((tid) => {
                              const matchTeam = teams.find((t) => t.id === tid);
                              return (
                                <span
                                  key={tid}
                                  className="text-[9px] px-1.5 py-0.2 rounded-full font-bold truncate max-w-[110px]"
                                  style={{
                                    backgroundColor: `${matchTeam?.color || '#5865f2'}20`,
                                    color: matchTeam?.color || '#5865f2',
                                    border: `1px solid ${matchTeam?.color || '#5865f2'}40`,
                                  }}
                                >
                                  {matchTeam?.name ? matchTeam.name.split('(')[0].trim() : tid}
                                </span>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>

                    {isOwner && u.role !== 'owner' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUser(u.id);
                        }}
                        title="حذف الحساب"
                        className="text-[#80848e] hover:text-[#ed4245] p-1.5 rounded-lg hover:bg-black/20 transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Permission Editor */}
        <div className="lg:col-span-7 bg-[#2b2d31] rounded-2xl border border-[#383a40] p-6 flex flex-col justify-between h-[650px] overflow-y-auto">
          {selectedUser ? (
            <div className="space-y-6">
              {/* Profile Card */}
              <div className="p-4 bg-[#1e1f22] rounded-xl border border-[#383a40] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5865f2] to-[#4752c4] flex items-center justify-center text-white font-black text-lg shadow-md">
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-white">{selectedUser.username}</h2>
                      <span className="text-[11px] font-mono text-[#80848e]">ID: {selectedUser.id}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#dbdee1] mt-1">
                      <span>ديسكورد: <strong className="text-white">{selectedUser.discordUsername}</strong></span>
                      <span>•</span>
                      <span>يوزر اللعبة: <strong className="text-[#57f287]">{selectedUser.gameUsername}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-left text-[11px] text-[#80848e]">
                  <div>تاريخ التسجيل: {formatArabicDate(selectedUser.createdAt)}</div>
                  {selectedUser.lastLogin && <div>آخر ظهور: {formatArabicTime(selectedUser.lastLogin)}</div>}
                </div>
              </div>

              {/* Role Presets */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-2">
                  اختر الرتبة الأساسية (الرول):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['owner', 'admin', 'supervisor', 'member'] as UserRole[]).map((r) => {
                    const isCurrent = editRole === r;
                    const labels: Record<UserRole, { title: string; icon: string }> = {
                      owner: { title: '👑 صاحب الموقع (الليدر)', icon: '👑' },
                      admin: { title: '🛡️ مسؤول (Admin)', icon: '🛡️' },
                      supervisor: { title: '⭐ مشرف (Supervisor)', icon: '⭐' },
                      member: { title: '👤 عضو (Member)', icon: '👤' },
                    };
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={!isOwner}
                        onClick={() => handleRolePresetChange(r)}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-center transition-all flex flex-col items-center gap-1 ${
                          isCurrent
                            ? 'bg-[#5865f2] text-white border-[#5865f2] shadow-sm'
                            : 'bg-[#1e1f22] border-[#383a40] text-[#dbdee1] hover:bg-[#35373c]'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <span className="text-base">{labels[r].icon}</span>
                        <span>{labels[r].title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Role Title */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-1.5">
                  مسمى الرتبة المخصص (يظهر بجانب اسمه):
                </label>
                <input
                  type="text"
                  disabled={!isOwner}
                  value={editRoleTitle}
                  onChange={(e) => setEditRoleTitle(e.target.value)}
                  placeholder="مثال: مسؤول السيرفر / قائد الشرطة / مشرف السيناريو"
                  className="w-full bg-[#1e1f22] border border-[#383a40] focus:border-[#5865f2] rounded-xl px-3.5 py-2 text-xs text-white placeholder-[#80848e] outline-hidden disabled:opacity-60"
                />
              </div>

              {/* Allowed Teams Assignment (تخصيص الفرق المسموح للعضو بالدخول إليها) */}
              <div className="bg-[#1e1f22] p-4 rounded-xl border border-[#383a40] space-y-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <label className="text-xs font-bold text-white">
                      تخصيص الفرق المسموح للعضو بالدخول إليها والاطلاع عليها:
                    </label>
                  </div>
                  <p className="text-[11px] text-[#949ba4] mt-0.5">
                    اختر ما إذا كان هذا العضو مسموحاً له بالوصول لكافة الفرق أو لفرق محددة فقط (مثل فريق الباند، فريق المسؤولين والإدارة، إلخ).
                  </p>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => {
                      setEditAllowedTeamsMode('all');
                      setEditAllowedTeamIds(teams.map((t) => t.id));
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      editAllowedTeamsMode === 'all'
                        ? 'bg-[#5865f2] text-white border-[#5865f2] shadow-xs'
                        : 'bg-[#2b2d31] border-[#383a40] text-[#dbdee1] hover:bg-[#35373c]'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <span>🌐</span>
                    <span>كافة الفرق (الكل)</span>
                  </button>

                  <button
                    type="button"
                    disabled={!isOwner}
                    onClick={() => {
                      setEditAllowedTeamsMode('custom');
                      if (editAllowedTeamIds.length === 0 || editAllowedTeamIds.includes('*')) {
                        setEditAllowedTeamIds([teams[0]?.id || 'team-scenario']);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      editAllowedTeamsMode === 'custom'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-[#2b2d31] border-[#383a40] text-[#dbdee1] hover:bg-[#35373c]'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    <span>🎯</span>
                    <span>تخصيص فرق معينة فقط</span>
                  </button>
                </div>

                {/* Specific Teams Selection */}
                {editAllowedTeamsMode === 'custom' && (
                  <div className="pt-2 border-t border-[#383a40]/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-[#949ba4]">
                      <span className="font-semibold text-white">اختر الفرق المصرح له بدخولها:</span>
                      {isOwner && (
                        <div className="flex items-center gap-2 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setEditAllowedTeamIds(teams.map((t) => t.id))}
                            className="text-[#5865f2] hover:underline font-bold"
                          >
                            تحديد الكل
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setEditAllowedTeamIds([])}
                            className="text-[#ed4245] hover:underline font-bold"
                          >
                            إلغاء التحديد
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {teams.map((t) => {
                        const isSelected = editAllowedTeamIds.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            onClick={() => {
                              if (!isOwner) return;
                              setEditAllowedTeamIds((prev) =>
                                prev.includes(t.id)
                                  ? prev.filter((id) => id !== t.id)
                                  : [...prev, t.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-amber-500/10 border-amber-500/40 text-white'
                                : 'bg-[#2b2d31] border-[#383a40] text-[#949ba4] hover:border-[#4e5058]'
                            } ${!isOwner ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: t.color || '#5865f2' }}
                              />
                              <span className="text-xs font-bold text-white truncate">{t.name}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={!isOwner}
                              onChange={() => {}} // Handled by div click
                              className="w-4 h-4 rounded accent-amber-500 cursor-pointer"
                            />
                          </div>
                        );
                      })}
                    </div>

                    {editAllowedTeamIds.length === 0 && (
                      <div className="text-[11px] text-[#ed4245] bg-[#ed4245]/10 p-2.5 rounded-lg border border-[#ed4245]/20 font-medium">
                        ⚠️ تنبيه: لم تحدد أي فريق لهذا العضو، ولن يظهر له أي فريق في الموقع حتى تحدد له فريقاً واحداً على الأقل.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Granular Permissions Checklist */}
              <div>
                <label className="block text-xs font-bold text-[#dbdee1] mb-2">
                  تحديد الصلاحيات الدقيقة لهذا العضو:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    {
                      key: 'manageTeams',
                      title: '📑 تعديل صفحات الفرق والآيديات',
                      desc: 'تعديل آيدي الشات والفويس والأوامر والألوان لكل فريق',
                    },
                    {
                      key: 'manageBot',
                      title: '🤖 تشغيل وإيقاف البوت والتوكن',
                      desc: 'التحكم في تشغيل بوت الديسكورد وتحديث التوكن',
                    },
                    {
                      key: 'viewHistory',
                      title: '📊 مشاهدة سجل التقارير والالتزام',
                      desc: 'الاطلاع على تقارير الشفتات وساعات تواجد الأعضاء',
                    },
                    {
                      key: 'clearHistory',
                      title: '🗑️ مسح سجل التقارير بالكامل',
                      desc: 'حذف بيانات وسجل التقارير من السيرفر',
                    },
                    {
                      key: 'manageSettings',
                      title: '⚙️ تعديل إعدادات النظام والرسائل',
                      desc: 'تخصيص قوالب رسائل الدخول والخروج والإنذارات',
                    },
                    {
                      key: 'manageUsers',
                      title: '👑 إدارة الأعضاء وتوزيع الرولات',
                      desc: 'صلاحية الليدر لإعطاء الرتب والصلاحيات للآخرين',
                    },
                  ].map((perm) => {
                    const checked = editPermissions[perm.key as keyof UserPermissions];
                    return (
                      <div
                        key={perm.key}
                        onClick={() => {
                          if (!isOwner) return;
                          setEditPermissions((prev) => ({
                            ...prev,
                            [perm.key]: !prev[perm.key as keyof UserPermissions],
                          }));
                        }}
                        className={`p-3 rounded-xl border transition-colors cursor-pointer flex items-start gap-3 ${
                          checked
                            ? 'bg-[#23a55a]/10 border-[#23a55a]/40 text-white'
                            : 'bg-[#1e1f22] border-[#383a40] text-[#949ba4] hover:border-[#4e5058]'
                        } ${!isOwner ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!isOwner}
                          onChange={() => {}} // Handled by div click
                          className="mt-0.5 rounded border-[#383a40] text-[#23a55a] focus:ring-0"
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{perm.title}</div>
                          <div className="text-[10px] text-[#949ba4] mt-0.5">{perm.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Notice */}
              {saveStatus && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
                  saveStatus.startsWith('خطأ')
                    ? 'bg-[#ed4245]/20 text-[#ed4245] border border-[#ed4245]/30'
                    : 'bg-[#23a55a]/20 text-[#23a55a] border border-[#23a55a]/30'
                }`}>
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              {/* Action Save Button */}
              {isOwner && (
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={isSaving}
                  className="w-full py-3 bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>حفظ رتبة وصلاحيات [{selectedUser.username}] الآن</span>
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8 text-[#949ba4] text-xs">
              اختر عضواً من القائمة على اليمين لتعديل رتبته وصلاحياته
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
