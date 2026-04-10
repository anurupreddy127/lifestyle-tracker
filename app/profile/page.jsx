'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/navigation'
import BottomSheet from '@/components/BottomSheet'
import Toast from '@/components/Toast'

export default function ProfilePage() {
  const { user, supabase, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()

  const [apiKeys, setApiKeys] = useState([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newRawKey, setNewRawKey] = useState('')
  const [keyName, setKeyName] = useState('iPhone Shortcut')
  const [generating, setGenerating] = useState(false)
  const generatingRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!user) return
    async function fetchKeys() {
      const { data } = await supabase
        .from('api_keys')
        .select('id, key_prefix, name, created_at')
        .order('created_at', { ascending: false })
      setApiKeys(data || [])
      setLoadingKeys(false)
    }
    fetchKeys()
  }, [user, supabase])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  async function handleGenerateKey() {
    if (generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)

    try {
      const randomBytes = new Uint8Array(16)
      crypto.getRandomValues(randomBytes)
      const hexStr = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const rawKey = `lt_${hexStr}`
      const prefix = rawKey.slice(0, 10) + '...'

      const encoder = new TextEncoder()
      const data = encoder.encode(rawKey)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      const { data: row, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          key_hash: keyHash,
          key_prefix: prefix,
          name: keyName.trim() || 'iPhone Shortcut',
        })
        .select('id, key_prefix, name, created_at')
        .single()

      if (error) throw error

      setApiKeys((prev) => [row, ...prev])
      setNewRawKey(rawKey)
      setToast('API key created!')
    } catch (err) {
      console.error('Generate key error:', err)
      setToast('Failed to generate key')
    } finally {
      setGenerating(false)
      generatingRef.current = false
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(newRawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = newRawKey
      textArea.style.position = 'fixed'
      textArea.style.left = '-9999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleDeleteKey(keyId) {
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)

    if (!error) {
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId))
      setToast('API key deleted')
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const inputClass = "w-full bg-bg-input border border-border rounded-xl px-4 py-3 text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50"

  return (
    <div className="px-4 pt-2 pb-4">
      {/* User info */}
      <div className="bg-bg-card border border-border rounded-2xl p-5 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-2xl">person</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-text-primary truncate">{user?.email || 'User'}</p>
          <p className="text-xs text-text-secondary">Lifestyle Tracker</p>
        </div>
      </div>

      {/* Settings */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="divide-y divide-border">
          <button
            onClick={() => router.push('/gym')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-secondary text-[20px]">fitness_center</span>
            <span className="flex-1 text-sm font-medium text-text-primary text-left">Gym Workouts</span>
            <span className="material-symbols-outlined text-text-secondary text-[18px]">chevron_right</span>
          </button>

          <button
            onClick={() => router.push('/finance')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-secondary text-[20px]">account_balance_wallet</span>
            <span className="flex-1 text-sm font-medium text-text-primary text-left">Finance Dashboard</span>
            <span className="material-symbols-outlined text-text-secondary text-[18px]">chevron_right</span>
          </button>

          <button
            onClick={() => router.push('/gym/stats')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-text-secondary text-[20px]">monitoring</span>
            <span className="flex-1 text-sm font-medium text-text-primary text-left">Stats & Analytics</span>
            <span className="material-symbols-outlined text-text-secondary text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-text-secondary text-[20px]">key</span>
            <span className="text-sm font-semibold text-text-primary">API Keys</span>
          </div>
          <button
            onClick={() => {
              setNewRawKey('')
              setKeyName('iPhone Shortcut')
              setCopied(false)
              setShowKeyModal(true)
            }}
            className="text-xs font-semibold text-accent px-3 py-1.5 rounded-lg bg-accent/15 active:bg-accent/25 cursor-pointer"
          >
            + Generate
          </button>
        </div>

        {loadingKeys ? (
          <div className="px-4 py-6 text-center text-xs text-text-secondary">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-text-secondary">No API keys yet</p>
            <p className="text-[11px] text-text-secondary/60 mt-1">Generate a key to use with iPhone Shortcuts</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{key.name}</p>
                  <p className="text-xs text-text-secondary font-mono">{key.key_prefix}</p>
                  <p className="text-[10px] text-text-secondary/60 mt-0.5">{formatDate(key.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary active:bg-rose-500/10 active:text-rose-400 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Appearance */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-4">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-text-secondary text-[20px]">
            {theme === 'dark' ? 'dark_mode' : 'light_mode'}
          </span>
          <span className="flex-1 text-sm font-medium text-text-primary text-left">Appearance</span>
          <span className="text-xs text-text-secondary font-medium capitalize">{theme}</span>
          <span className="material-symbols-outlined text-text-secondary text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* About */}
      <div className="bg-bg-card border border-border rounded-2xl overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="material-symbols-outlined text-text-secondary text-[20px]">info</span>
          <span className="flex-1 text-sm font-medium text-text-primary">Version</span>
          <span className="text-xs text-text-secondary">1.0.0</span>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full bg-bg-card border border-border rounded-2xl py-3.5 text-rose-400 font-semibold text-sm flex items-center justify-center gap-2 active:bg-rose-500/10 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[18px]">logout</span>
        Sign Out
      </button>

      {/* Generate Key Modal */}
      <BottomSheet
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        title={newRawKey ? 'Your API Key' : 'Generate API Key'}
      >
        {!newRawKey ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary mb-1.5 block">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="iPhone Shortcut"
                className={inputClass}
              />
            </div>

            <button
              onClick={handleGenerateKey}
              disabled={generating}
              className="w-full bg-accent text-white font-semibold text-sm py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {generating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-400 mb-1">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">warning</span>
                Save this key now — you won't see it again!
              </p>
              <p className="text-[11px] text-amber-400/70">Copy it and paste it into your iPhone Shortcut.</p>
            </div>

            <div className="bg-bg-input border border-border rounded-xl p-4">
              <p className="text-xs font-mono text-text-primary break-all select-all leading-relaxed">
                {newRawKey}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full font-semibold text-sm py-3.5 rounded-xl active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-accent text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <button
              onClick={() => setShowKeyModal(false)}
              className="w-full bg-bg-input text-text-primary font-semibold text-sm py-3.5 rounded-xl active:scale-[0.98] cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </BottomSheet>

      {toast && <Toast message={toast} isVisible={!!toast} onDismiss={() => setToast('')} />}
    </div>
  )
}
