'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import BottomSheet from '@/components/BottomSheet'
import Toast from '@/components/Toast'

export default function ProfilePage() {
  const { user, supabase, signOut } = useAuth()
  const router = useRouter()

  // API Key state
  const [apiKeys, setApiKeys] = useState([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [newRawKey, setNewRawKey] = useState('')
  const [keyName, setKeyName] = useState('iPhone Shortcut')
  const [generating, setGenerating] = useState(false)
  const generatingRef = useRef(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  // Fetch existing API keys
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

  // Generate new API key
  async function handleGenerateKey() {
    if (generatingRef.current) return
    generatingRef.current = true
    setGenerating(true)

    try {
      // Generate random key: lt_ + 32 hex chars
      const randomBytes = new Uint8Array(16)
      crypto.getRandomValues(randomBytes)
      const hexStr = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
      const rawKey = `lt_${hexStr}`
      const prefix = rawKey.slice(0, 10) + '...'

      // SHA-256 hash the key
      const encoder = new TextEncoder()
      const data = encoder.encode(rawKey)
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      // Store hashed key in DB
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

  // Copy key to clipboard
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(newRawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for iOS
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

  // Delete an API key
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

  // Format date
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* User info */}
      <div className="glass rounded-2xl p-5 shadow-sm shadow-black/[0.03] mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/90 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-2xl">person</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-slate-900 truncate">{user?.email || 'User'}</p>
          <p className="text-xs text-slate-500">Lifestyle Tracker</p>
        </div>
      </div>

      {/* Settings */}
      <div className="glass rounded-2xl shadow-sm shadow-black/[0.03] overflow-hidden mb-4">
        <div className="divide-y divide-white/30">
          <button
            onClick={() => router.push('/gym')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/40"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px]">fitness_center</span>
            <span className="flex-1 text-sm font-medium text-slate-900 text-left">Gym Workouts</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
          </button>

          <button
            onClick={() => router.push('/finance')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/40"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px]">account_balance_wallet</span>
            <span className="flex-1 text-sm font-medium text-slate-900 text-left">Finance Dashboard</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
          </button>

          <button
            onClick={() => router.push('/gym/stats')}
            className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/40"
          >
            <span className="material-symbols-outlined text-slate-500 text-[20px]">monitoring</span>
            <span className="flex-1 text-sm font-medium text-slate-900 text-left">Stats & Analytics</span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">chevron_right</span>
          </button>
        </div>
      </div>

      {/* API Keys */}
      <div className="glass rounded-2xl shadow-sm shadow-black/[0.03] overflow-hidden mb-4">
        <div className="px-4 py-3.5 flex items-center justify-between border-b border-white/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">key</span>
            <span className="text-sm font-semibold text-slate-900">API Keys</span>
          </div>
          <button
            onClick={() => {
              setNewRawKey('')
              setKeyName('iPhone Shortcut')
              setCopied(false)
              setShowKeyModal(true)
            }}
            className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 active:bg-primary/20"
          >
            + Generate
          </button>
        </div>

        {loadingKeys ? (
          <div className="px-4 py-6 text-center text-xs text-slate-400">Loading...</div>
        ) : apiKeys.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-slate-400">No API keys yet</p>
            <p className="text-[11px] text-slate-300 mt-1">Generate a key to use with iPhone Shortcuts</p>
          </div>
        ) : (
          <div className="divide-y divide-white/30">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{key.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{key.key_prefix}</p>
                  <p className="text-[10px] text-slate-300 mt-0.5">{formatDate(key.created_at)}</p>
                </div>
                <button
                  onClick={() => handleDeleteKey(key.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 active:bg-rose-50 active:text-rose-500"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* About */}
      <div className="glass rounded-2xl shadow-sm shadow-black/[0.03] overflow-hidden mb-6">
        <div className="divide-y divide-white/30">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="material-symbols-outlined text-slate-500 text-[20px]">info</span>
            <span className="flex-1 text-sm font-medium text-slate-900">Version</span>
            <span className="text-xs text-slate-400">1.0.0</span>
          </div>
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="w-full glass rounded-2xl py-3.5 text-rose-500 font-semibold text-sm flex items-center justify-center gap-2 active:bg-rose-50/30 cursor-pointer"
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
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Key Name</label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="iPhone Shortcut"
                className="w-full bg-white/50 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
              />
            </div>

            <button
              onClick={handleGenerateKey}
              disabled={generating}
              className="w-full bg-primary text-white font-semibold text-sm py-3.5 rounded-xl active:scale-[0.98] disabled:opacity-50"
            >
              {generating ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">
                <span className="material-symbols-outlined text-[14px] align-middle mr-1">warning</span>
                Save this key now — you won't see it again!
              </p>
              <p className="text-[11px] text-amber-600">Copy it and paste it into your iPhone Shortcut.</p>
            </div>

            <div className="bg-white/40 backdrop-blur-sm border border-white/30 rounded-xl p-4">
              <p className="text-xs font-mono text-slate-700 break-all select-all leading-relaxed">
                {newRawKey}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full font-semibold text-sm py-3.5 rounded-xl active:scale-[0.98] flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <button
              onClick={() => setShowKeyModal(false)}
              className="w-full bg-white/50 text-slate-700 font-semibold text-sm py-3.5 rounded-xl active:scale-[0.98]"
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
