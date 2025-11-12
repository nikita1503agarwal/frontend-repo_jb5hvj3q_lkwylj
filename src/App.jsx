import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import './index.css'

const colors = {
  bg: '#0D0D0D',
  purple: '#5A00FF',
  purpleDeep: '#3B0A45',
  blue: '#00CFFF',
  silver: '#C0C0C0',
  crimson: '#D32F2F'
}

function GlowPanel({ children, className = '' }) {
  return (
    <div className={`relative rounded-xl border border-[#3B0A45]/40 bg-[#0D0D0D]/70 backdrop-blur-md ${className}`}
         style={{ boxShadow: `0 0 24px ${colors.purple}33, inset 0 0 24px ${colors.blue}22` }}>
      <div className="absolute inset-0 rounded-xl" style={{
        background: `radial-gradient(120% 120% at 0% 0%, ${colors.purple}11, transparent 40%), radial-gradient(120% 120% at 100% 100%, ${colors.blue}11, transparent 40%)`
      }} />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

function EnergyBar({ value = 70, color = colors.blue, label = 'ENERGY' }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs tracking-widest uppercase text-[#C0C0C0]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded bg-white/10 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${colors.blue}, ${colors.purple})`, boxShadow: `0 0 12px ${colors.blue}` }} />
      </div>
    </div>
  )
}

function ExpBar({ value = 30, label = 'EXP' }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs tracking-widest uppercase text-[#C0C0C0]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 rounded bg-white/10 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${value}%`, background: `linear-gradient(90deg, ${colors.purple}, ${colors.blue})`, boxShadow: `0 0 12px ${colors.purple}` }} />
      </div>
    </div>
  )
}

function TopBar({ hunter }) {
  return (
    <GlowPanel className="p-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3B0A45] to-[#5A00FF] shadow-lg flex items-center justify-center text-white font-bold">
          {hunter.rank}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-white text-lg font-semibold tracking-widest" style={{ fontFamily: 'Orbitron, system-ui' }}>{hunter.display_name}</h1>
            <span className="text-[#C0C0C0] text-xs">Lv.{hunter.level}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <EnergyBar value={hunter.energy} />
            <ExpBar value={Math.min(100, Math.round((hunter.exp/100)*100))} />
          </div>
        </div>
      </div>
    </GlowPanel>
  )
}

function QuestCard({ quest, onComplete, onClaim }) {
  const statusColor = {
    pending: 'text-[#C0C0C0]',
    in_progress: 'text-blue-300',
    completed: 'text-green-300',
    claimed: 'text-purple-300'
  }[quest.status]

  return (
    <GlowPanel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold" style={{ fontFamily: 'Poppins, system-ui' }}>{quest.title}</h3>
          {quest.description && <p className="text-[#C0C0C0] text-sm mt-1">{quest.description}</p>}
          <div className="mt-2 text-xs text-[#C0C0C0]">Reward: +{quest.exp_reward} EXP{quest.stat_reward && Object.keys(quest.stat_reward).length>0 ? `, +${Object.entries(quest.stat_reward).map(([k,v])=>`${v} ${k}`).join(', ')}`: ''}</div>
        </div>
        <div className="flex gap-2">
          {quest.status === 'pending' && (
            <button onClick={()=>onComplete(quest.id)} className="px-3 py-1 rounded bg-[#00CFFF]/20 text-[#00CFFF] hover:bg-[#00CFFF]/30 transition">Complete</button>
          )}
          {quest.status === 'completed' && (
            <button onClick={()=>onClaim(quest.id)} className="px-3 py-1 rounded bg-[#5A00FF]/20 text-white hover:bg-[#5A00FF]/40 transition" style={{boxShadow:`0 0 12px ${colors.purple}55`}}>Claim</button>
          )}
          {['in_progress','claimed'].includes(quest.status) && (
            <span className={`px-3 py-1 rounded border border-white/10 ${statusColor}`}>{quest.status.replace('_',' ')}</span>
          )}
        </div>
      </div>
    </GlowPanel>
  )
}

function LogPanel({ logs }){
  return (
    <GlowPanel className="p-3 h-full">
      <div className="text-[#C0C0C0] text-xs tracking-widest uppercase mb-2">System Log</div>
      <div className="space-y-2 max-h-72 overflow-auto pr-1">
        {logs.map((l)=> (
          <div key={l.id} className="text-sm text-white/90">
            <span className="text-[#C0C0C0] mr-2">[{new Date(l.created_at).toLocaleTimeString()}]</span>
            {l.message}
          </div>
        ))}
      </div>
    </GlowPanel>
  )
}

function Dashboard(){
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [hunter, setHunter] = useState(null)
  const [quests, setQuests] = useState([])
  const [logs, setLogs] = useState([])

  useEffect(()=>{ init() },[])

  async function init(){
    // auto create/get hunter for demo
    const hunterRes = await fetch(`${baseUrl}/api/hunter`, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({display_name:'Shadow Initiate'})})
    const h = await hunterRes.json()
    setHunter(h)

    // seed dailies if none
    const qRes = await fetch(`${baseUrl}/api/quests?hunter_id=${h.id}`)
    let q = await qRes.json()
    if(q.length === 0){
      await fetch(`${baseUrl}/api/seed/dailies?hunter_id=${h.id}`, {method:'POST'})
      q = await (await fetch(`${baseUrl}/api/quests?hunter_id=${h.id}`)).json()
    }
    setQuests(q)

    const logsRes = await fetch(`${baseUrl}/api/logs?hunter_id=${h.id}&limit=20`)
    setLogs(await logsRes.json())
  }

  async function completeQuest(id){
    await fetch(`${baseUrl}/api/quests/${id}/complete`, {method:'POST'})
    await refresh()
  }
  async function claimQuest(id){
    await fetch(`${baseUrl}/api/quests/${id}/claim`, {method:'POST'})
    await refresh()
  }
  async function refresh(){
    if(!hunter) return
    const q = await (await fetch(`${baseUrl}/api/quests?hunter_id=${hunter.id}`)).json()
    setQuests(q)
    const h = await (await fetch(`${baseUrl}/api/hunter/${hunter.id}`)).json()
    setHunter(h)
    const logsRes = await fetch(`${baseUrl}/api/logs?hunter_id=${hunter.id}&limit=20`)
    setLogs(await logsRes.json())
  }

  if(!hunter){
    return (
      <div className="min-h-screen" style={{background: `radial-gradient(80% 80% at 50% 0%, ${colors.purple}22, transparent), #0D0D0D`}}>
        <div className="h-screen w-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-[#5A00FF] border-t-transparent animate-spin mx-auto mb-6" />
            <div className="text-[#C0C0C0]">Initializing Hunter System...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white" style={{background: `radial-gradient(80% 80% at 50% 0%, ${colors.purple}22, transparent), #0D0D0D`}}>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <TopBar hunter={hunter} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <GlowPanel className="p-4">
              <div className="text-[#C0C0C0] text-xs tracking-widest uppercase mb-3">Daily Quests</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quests.filter(q=>q.type==='daily').map(q=> (
                  <QuestCard key={q.id} quest={q} onComplete={completeQuest} onClaim={claimQuest} />
                ))}
              </div>
            </GlowPanel>

            <GlowPanel className="p-4">
              <div className="text-[#C0C0C0] text-xs tracking-widest uppercase mb-3">Main Quest</div>
              <div className="text-[#C0C0C0]">Forge your path. Main quests coming soon.</div>
            </GlowPanel>
          </div>

          <div className="space-y-4">
            <LogPanel logs={logs} />
            <GlowPanel className="p-4">
              <div className="text-[#C0C0C0] text-xs tracking-widest uppercase mb-2">Tabs</div>
              <div className="flex gap-2 flex-wrap">
                {['Home','Quests','Stats','Inventory','Dungeon'].map(t => (
                  <button key={t} className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-[#C0C0C0] border border-white/10">{t}</button>
                ))}
              </div>
            </GlowPanel>
          </div>
        </div>
      </div>
    </div>
  )
}

function GateOnboarding(){
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(()=>{
    const t = setTimeout(()=> setOpen(true), 800)
    const n = setTimeout(()=> navigate('/'), 2500)
    return ()=>{ clearTimeout(t); clearTimeout(n) }
  },[])

  return (
    <div className="relative min-h-screen flex items-center justify-center" style={{background:'#0D0D0D'}}>
      <div className="absolute inset-0" style={{
        background: `radial-gradient(60% 60% at 50% 50%, ${colors.purple}22, transparent 60%)`
      }}/>
      <div className={`transition-all duration-1000 ease-out w-1/2 h-3/4 bg-[#3B0A45] ${open? 'opacity-0 scale-110': 'opacity-100'} blur-xl rounded-full`}/>
      <div className="relative z-10 text-center">
        <h1 className="text-2xl md:text-4xl font-bold text-white tracking-widest" style={{fontFamily:'Orbitron, system-ui'}}>
          You have awakened as a Hunter
        </h1>
        <p className="text-[#C0C0C0] mt-3">Begin your path.</p>
        <div className="mt-6">
          <Link to="/" className="px-5 py-2 rounded bg-[#5A00FF]/40 hover:bg-[#5A00FF]/60 text-white border border-[#5A00FF]/40" style={{boxShadow:`0 0 24px ${colors.purple}55`}}>Enter Gate</Link>
        </div>
      </div>
    </div>
  )
}

export default function App(){
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard/>} />
        <Route path="/gate" element={<GateOnboarding/>} />
      </Routes>
    </BrowserRouter>
  )
}
