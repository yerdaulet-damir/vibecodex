import { Hero } from '../components/Hero'
import { Problem } from '../components/Problem'
import { HowItWorks } from '../components/HowItWorks'
import { Principles } from '../components/Principles'
import { Install } from '../components/Install'
import { Footer } from '../components/Footer'

export default function Home() {
  return (
    <main style={{ background: '#080808', minHeight: '100vh' }}>
      {/* Subtle top border accent */}
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #00d4aa40, transparent)' }} />
      <Hero />
      <div style={{ height: 1, background: '#111' }} />
      <Problem />
      <div style={{ height: 1, background: '#111' }} />
      <HowItWorks />
      <div style={{ height: 1, background: '#111' }} />
      <Principles />
      <div style={{ height: 1, background: '#111' }} />
      <Install />
      <Footer />
    </main>
  )
}
