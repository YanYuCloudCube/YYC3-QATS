/**
 * @file src/app/components/AuthPanel.tsx
 * @description YYC3 认证面板组件,提供用户登录/登出功能和用户信息展示
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags component,react,typescript,auth,public
 * @depends react,../api/auth
 */

/**
 * YYC-QATS Auth Panel
 * ────────────────────
 * Phase 13: Login/logout UI panel using authManager.
 * Renders in the Navbar or Admin module as a user status widget.
 * Pure function component — no forwardRef, no radix-ui.
 */

import React, { useState, useEffect, useCallback } from 'react';

import {
  authManager,
  type AuthUser,
  type AuthEvent,
} from '../api/auth';

type IconProps = React.SVGProps<SVGSVGElement>;
const UserIcon = (props: IconProps) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const LogOutIcon = (props: IconProps) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const ShieldIcon = (props: IconProps) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  trader: '交易员',
  analyst: '分析师',
  viewer: '观察者',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  trader: 'bg-green-500/20 text-green-400 border-green-500/30',
  analyst: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  viewer: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

/** Compact auth status button for Navbar */
export function AuthStatusButton({ onClick }: { onClick: () => void }) {
  const [user, setUser] = useState<AuthUser | null>(authManager.currentUser);

  useEffect(() => {
    const unsub = authManager.onAuthEvent((event: AuthEvent) => {
      if (event.type === 'login' || event.type === 'logout' || event.type === 'session-expired') {
        setUser(authManager.currentUser);
      }
    });
    return unsub;
  }, []);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[#1A2B47] transition-colors text-xs"
    >
      <UserIcon className="w-4 h-4 text-[#8892B0]" />
      {user ? (
        <span className="text-[#CCD6F6]">{user.displayName}</span>
      ) : (
        <span className="text-[#8892B0]">未登录</span>
      )}
      {user && (
        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}>
          {ROLE_LABELS[user.role] || user.role}
        </span>
      )}
    </button>
  );
}

/** Full auth panel with login form + user info */
export function AuthPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [user, setUser] = useState<AuthUser | null>(authManager.currentUser);
  const [isAuthenticated, setIsAuthenticated] = useState(authManager.isAuthenticated);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = authManager.onAuthEvent(() => {
      setUser(authManager.currentUser);
      setIsAuthenticated(authManager.isAuthenticated);
    });
    return unsub;
  }, []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await authManager.login(username, password);
      if (!resp.success) {
        setError(resp.message || '登录失败');
      } else {
        setUsername('');
        setPassword('');
      }
    } catch (err: any) {
      setError(err.message || '登录异常');
    } finally {
      setLoading(false);
    }
  }, [username, password]);

  const handleLogout = useCallback(() => {
    authManager.logout();
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-16">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-80 max-h-[calc(100vh-5rem)] bg-[#0D1B2A] border border-[#233554] rounded-lg shadow-2xl m-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#233554]">
          <div className="flex items-center gap-2">
            <ShieldIcon className="w-4 h-4 text-[#4299E1]" />
            <span className="text-sm text-[#CCD6F6]">认证管理</span>
          </div>
          <button onClick={onClose} className="text-[#8892B0] hover:text-[#CCD6F6] text-lg">&times;</button>
        </div>

        {isAuthenticated && user ? (
          /* Authenticated View */
          <div className="p-4 space-y-4">
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#4299E1]/20 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-[#4299E1]" />
              </div>
              <div>
                <div className="text-sm text-[#CCD6F6]">{user.displayName}</div>
                <div className="text-xs text-[#8892B0]">{user.email}</div>
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8892B0]">角色:</span>
              <span className={`px-2 py-0.5 rounded text-xs border ${ROLE_COLORS[user.role] || ROLE_COLORS.viewer}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
            </div>

            {/* Accessible Modules */}
            <div>
              <div className="text-xs text-[#8892B0] mb-1.5">可访问模块:</div>
              <div className="flex flex-wrap gap-1">
                {authManager.getAccessibleModules().map(mod => (
                  <span
                    key={mod}
                    className="px-1.5 py-0.5 rounded text-[10px] bg-[#112240] border border-[#233554] text-[#8892B0]"
                  >
                    {mod}
                  </span>
                ))}
              </div>
            </div>

            {/* Session Info */}
            <div className="text-xs text-[#4A5568] space-y-1">
              <div>登录时间: {new Date(user.lastLoginAt).toLocaleString('zh-CN')}</div>
              <div>用户ID: {user.id}</div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#F56565]/10 border border-[#F56565]/30 rounded-md text-[#F56565] text-xs hover:bg-[#F56565]/20 transition-colors"
            >
              <LogOutIcon className="w-3.5 h-3.5" />
              退出登录
            </button>
          </div>
        ) : (
          /* Login Form */
          <form onSubmit={handleLogin} className="p-4 space-y-3">
            <div className="text-xs text-[#8892B0] mb-2">
              使用模拟账号登录 (admin / trader / analyst / viewer)
            </div>

            <div>
              <label className="block text-xs text-[#8892B0] mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-1.5 bg-[#112240] border border-[#233554] rounded text-xs text-[#CCD6F6] placeholder-[#4A5568] focus:border-[#4299E1] focus:outline-none transition-colors"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8892B0] mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="admin123"
                className="w-full px-3 py-1.5 bg-[#112240] border border-[#233554] rounded text-xs text-[#CCD6F6] placeholder-[#4A5568] focus:border-[#4299E1] focus:outline-none transition-colors"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-xs text-[#F56565] bg-[#F56565]/10 border border-[#F56565]/20 rounded px-2 py-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full px-3 py-2 bg-[#4299E1] rounded text-xs text-white font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? '登录中...' : '登录'}
            </button>

            {/* Quick login buttons */}
            <div className="pt-2 border-t border-[#233554]">
              <div className="text-[10px] text-[#4A5568] mb-1.5">快速登录:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['admin', 'trader', 'analyst', 'viewer'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => { setUsername(role); setPassword(`${role}123`); }}
                    className={`px-2 py-1 rounded text-[10px] border ${ROLE_COLORS[role]} hover:brightness-125 transition-colors`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
