import { useEffect, useRef, useState, type MouseEvent } from 'react'
import Lenis from 'lenis'
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import logoFull from './assets/logo-full.svg'
import logoIcon from './assets/logo-icon.svg'
import './App.css'

type DemoMessage = {
  role: 'Examiner' | 'Candidate' | 'Bandnine AI'
  text: string
  tag: string
}

type ExaminerTurn = {
  role: 'Examiner' | 'Candidate'
  tone: 'probe' | 'response' | 'challenge' | 'defense' | 'followup'
  marker: string
  text: string
}

const navItems = [
  { href: '#hero', label: 'Product' },
  { href: '#experience', label: 'Experience' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#demo', label: 'Demo' },
  { href: '#why-bandnine', label: 'Why Bandnine' },
]

const pressureFragments = [
  'Opening answer breaks after 7 seconds.',
  'Filler words spike when the follow-up hits.',
  'Logic drifts under interruption pressure.',
  'Vocabulary narrows when timing compresses.',
  'Confidence drops before closure.',
]

const fluentFragments = [
  'Clear thesis delivered under timing.',
  'Evidence and example stay connected.',
  'Follow-up handled with precision.',
  'Lexical range remains stable at speed.',
  'Closure lands with exam-level confidence.',
]

const whyCards = [
  {
    title: 'Examiner behavior, not scripts',
    description:
      'Bandnine shifts questioning logic in real time based on your spoken intent and weak points.',
    stat: 'Live examiner engine',
  },
  {
    title: 'Pressure with purpose',
    description:
      'Timing windows, interruption rhythm, and silence tolerance are tuned to realistic exam tension.',
    stat: 'Performance stress model',
  },
  {
    title: 'Speaking intelligence in-session',
    description:
      'Transcript signals are evaluated while you speak, not after the momentum is gone.',
    stat: 'Real-time insight layer',
  },
  {
    title: 'Band-oriented progression',
    description:
      'Every session outputs exact upgrades needed for the next score jump, not generic feedback.',
    stat: 'Targeted band trajectory',
  },
]

const examinerConversation: ExaminerTurn[] = [
  {
    role: 'Examiner',
    tone: 'probe',
    marker: 'Primary prompt',
    text: 'Describe a decision that changed your direction this year.',
  },
  {
    role: 'Candidate',
    tone: 'response',
    marker: 'Initial response',
    text: 'I left a stable role to build a product where outcomes depended on my own execution.',
  },
  {
    role: 'Examiner',
    tone: 'challenge',
    marker: 'Precision challenge',
    text: 'What specific risk did you underestimate, and what evidence shows that?',
  },
  {
    role: 'Candidate',
    tone: 'defense',
    marker: 'Pressure recovery',
    text: 'I underestimated delivery speed. Weekly milestones showed that my planning depth was weak.',
  },
  {
    role: 'Examiner',
    tone: 'followup',
    marker: 'Adaptive follow-up',
    text: 'How did that mistake change the way you evaluate decisions now?',
  },
]

const demoFlow: DemoMessage[] = [
  {
    role: 'Examiner',
    text: 'Do you think technology improves productivity for everyone?',
    tag: 'Prompt',
  },
  {
    role: 'Candidate',
    text: 'It improves output only when people apply it with clear structure and constraints.',
    tag: 'Response',
  },
  {
    role: 'Examiner',
    text: 'Give a case where technology reduced performance instead of improving it.',
    tag: 'Follow-up',
  },
  {
    role: 'Bandnine AI',
    text: 'Band signal: 7.5. Add sharper lexical contrast and one precise real-world example.',
    tag: 'Insight',
  },
]

const waveformBars = Array.from({ length: 26 }, (_, index) => index)
const finalPulseBars = Array.from({ length: 24 }, (_, index) => index)

function TiltFeatureCard({
  title,
  description,
  stat,
  index,
}: {
  title: string
  description: string
  stat: string
  index: number
}) {
  const shineX = useMotionValue(50)
  const shineY = useMotionValue(50)
  const rotateX = useSpring(0, { stiffness: 180, damping: 22, mass: 0.6 })
  const rotateY = useSpring(0, { stiffness: 180, damping: 22, mass: 0.6 })

  const cardGlow = useMotionTemplate`radial-gradient(260px circle at ${shineX}% ${shineY}%, rgba(248, 66, 56, 0.24), rgba(248, 66, 56, 0) 62%)`
  const cardTransform = useMotionTemplate`perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = ((event.clientX - bounds.left) / bounds.width) * 100
    const relativeY = ((event.clientY - bounds.top) / bounds.height) * 100

    shineX.set(relativeX)
    shineY.set(relativeY)

    rotateX.set(((relativeY - 50) / 50) * -5.5)
    rotateY.set(((relativeX - 50) / 50) * 7)
  }

  const handleLeave = () => {
    shineX.set(50)
    shineY.set(50)
    rotateX.set(0)
    rotateY.set(0)
  }

  return (
    <motion.article
      className="why-card"
      style={{ transform: cardTransform }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      initial={{ opacity: 0, y: 56, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.82,
        delay: 0.08 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
      viewport={{ once: true, amount: 0.35 }}
    >
      <motion.div className="why-card-glow" style={{ backgroundImage: cardGlow }} />
      <span className="why-card-stat">{stat}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </motion.article>
  )
}

function App() {
  const shouldReduceMotion = useReducedMotion()
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('#hero')
  const [introDone, setIntroDone] = useState(Boolean(shouldReduceMotion))
  const [bandScore, setBandScore] = useState(5.1)
  const [confidence, setConfidence] = useState(18)
  const [examinerStep, setExaminerStep] = useState(0)
  const [targetBand, setTargetBand] = useState(7.5)
  const [demoIndex, setDemoIndex] = useState(0)
  const [demoRunning, setDemoRunning] = useState(false)

  const lenisRef = useRef<Lenis | null>(null)
  const pressureSectionRef = useRef<HTMLElement>(null)
  const examinerSectionRef = useRef<HTMLElement>(null)

  const pointerX = useMotionValue(50)
  const pointerY = useMotionValue(24)
  const ambientLayer = useMotionTemplate`radial-gradient(1040px circle at ${pointerX}% ${pointerY}%, rgba(248, 66, 56, 0.19), transparent 57%)`

  const logoRotateX = useSpring(0, { stiffness: 180, damping: 24, mass: 0.7 })
  const logoRotateY = useSpring(0, { stiffness: 180, damping: 24, mass: 0.7 })
  const logoTransform = useMotionTemplate`perspective(1200px) rotateX(${logoRotateX}deg) rotateY(${logoRotateY}deg)`

  const { scrollYProgress: pressureProgress } = useScroll({
    target: pressureSectionRef,
    offset: ['start start', 'end end'],
  })

  const pressureProgressSmooth = useSpring(pressureProgress, {
    stiffness: shouldReduceMotion ? 220 : 58,
    damping: shouldReduceMotion ? 48 : 22,
    mass: 0.86,
  })

  const chaosOpacity = useTransform(pressureProgressSmooth, [0, 0.42, 0.62], [1, 0.78, 0])
  const fluentOpacity = useTransform(pressureProgressSmooth, [0.34, 0.62, 1], [0, 0.74, 1])
  const pressureEngineScaleRaw = useTransform(pressureProgressSmooth, [0, 0.44, 1], [0.9, 1, 1.03])
  const pressureEngineRotateRaw = useTransform(pressureProgressSmooth, [0, 1], [5.6, -1.8])
  const pressureEngineLiftRaw = useTransform(pressureProgressSmooth, [0, 0.5, 1], [34, 0, -12])
  const pressureEngineTiltXRaw = useTransform(pressureProgressSmooth, [0, 0.5, 1], [2.8, 0.2, -0.9])
  const pressureEngineTiltYRaw = useTransform(pressureProgressSmooth, [0, 0.5, 1], [-5.4, -1.2, 2.1])
  const pressureEngineScale = useSpring(pressureEngineScaleRaw, { stiffness: 84, damping: 24, mass: 0.78 })
  const pressureEngineRotate = useSpring(pressureEngineRotateRaw, {
    stiffness: 84,
    damping: 24,
    mass: 0.78,
  })
  const pressureEngineLift = useSpring(pressureEngineLiftRaw, { stiffness: 84, damping: 24, mass: 0.82 })
  const pressureEngineTiltX = useSpring(pressureEngineTiltXRaw, { stiffness: 84, damping: 24, mass: 0.82 })
  const pressureEngineTiltY = useSpring(pressureEngineTiltYRaw, { stiffness: 84, damping: 24, mass: 0.82 })
  const pressureAuraOpacity = useTransform(
    pressureProgressSmooth,
    [0, 0.26, 0.6, 1],
    [0.1, 0.35, 0.5, 0.24],
  )
  const pressureAuraY = useTransform(pressureProgressSmooth, [0, 1], [28, -20])
  const pressureRingRotate = useTransform(pressureProgressSmooth, [0, 1], [-10, 12])
  const pressureRingScale = useTransform(pressureProgressSmooth, [0, 1], [0.92, 1.06])
  const pressureGlassOpacity = useTransform(
    pressureProgressSmooth,
    [0, 0.5, 1],
    [0.18, 0.42, 0.3],
  )
  const trajectoryLength = useTransform(pressureProgressSmooth, [0, 1], [0.05, 1])
  const signalX = useTransform(pressureProgressSmooth, [0, 1], ['12%', '84%'])
  const signalY = useTransform(pressureProgressSmooth, [0, 1], ['74%', '18%'])
  const liveBand = useTransform(pressureProgressSmooth, [0, 1], [5.1, 8.95])
  const liveConfidence = useTransform(pressureProgressSmooth, [0, 1], [18, 97])

  const { scrollYProgress: examinerProgress } = useScroll({
    target: examinerSectionRef,
    offset: ['start start', 'end end'],
  })

  const examinerProgressSmooth = useSpring(examinerProgress, {
    stiffness: shouldReduceMotion ? 220 : 64,
    damping: shouldReduceMotion ? 48 : 24,
    mass: 0.9,
  })

  const examinerYRaw = useTransform(examinerProgressSmooth, [0, 1], [76, -14])
  const examinerRotateXRaw = useTransform(examinerProgressSmooth, [0, 1], [4.2, -1.1])
  const examinerRotateYRaw = useTransform(examinerProgressSmooth, [0, 1], [-5.2, 2.3])
  const examinerScaleRaw = useTransform(examinerProgressSmooth, [0, 1], [0.965, 1.012])
  const chamberGridY = useTransform(examinerProgressSmooth, [0, 1], [24, -18])
  const chamberGridOpacity = useTransform(examinerProgressSmooth, [0, 0.36, 1], [0.2, 0.34, 0.28])
  const chamberOrbitRotate = useTransform(examinerProgressSmooth, [0, 1], [-9, 12])
  const chamberOrbitOpacity = useTransform(examinerProgressSmooth, [0, 0.4, 1], [0.1, 0.28, 0.2])
  const chamberSheenX = useTransform(examinerProgressSmooth, [0, 1], ['-26%', '78%'])
  const chamberSheenY = useTransform(examinerProgressSmooth, [0, 1], ['-18%', '8%'])
  const chamberSheenOpacity = useTransform(examinerProgressSmooth, [0, 0.46, 1], [0.08, 0.26, 0.18])
  const examinerY = useSpring(examinerYRaw, { stiffness: 96, damping: 28, mass: 0.72 })
  const examinerRotateX = useSpring(examinerRotateXRaw, {
    stiffness: 96,
    damping: 28,
    mass: 0.72,
  })
  const examinerRotateY = useSpring(examinerRotateYRaw, {
    stiffness: 96,
    damping: 28,
    mass: 0.72,
  })
  const examinerScale = useSpring(examinerScaleRaw, {
    stiffness: 96,
    damping: 28,
    mass: 0.72,
  })
  const examinerGlow = useTransform(examinerProgressSmooth, [0, 1], [0.22, 0.86])
  const stepSignal = useTransform(
    examinerProgressSmooth,
    [0, 0.22, 0.42, 0.64, 0.82, 1],
    [0, 1, 2, 3, 4, 4],
  )
  const interruptionMeter = useTransform(examinerProgressSmooth, [0, 1], ['24%', '94%'])
  const interruptionNeedle = useTransform(examinerProgressSmooth, [0, 1], ['15%', '87%'])
  const followupOpacity = useTransform(examinerProgressSmooth, [0.38, 0.68, 1], [0, 0.92, 1])
  const followupY = useTransform(examinerProgressSmooth, [0.38, 0.68, 1], [16, 0, -2])

  useMotionValueEvent(liveBand, 'change', (latest) => {
    const normalized = Number(latest.toFixed(1))
    setBandScore((previous) => (previous === normalized ? previous : normalized))
  })

  useMotionValueEvent(liveConfidence, 'change', (latest) => {
    const normalized = Math.round(latest)
    setConfidence((previous) => (previous === normalized ? previous : normalized))
  })

  useMotionValueEvent(stepSignal, 'change', (latest) => {
    const normalized = Math.max(
      0,
      Math.min(examinerConversation.length - 1, Math.floor(latest)),
    )
    setExaminerStep((previous) => (previous === normalized ? previous : normalized))
  })

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.28,
      smoothWheel: true,
      syncTouch: false,
      easing: (time) => 1 - Math.pow(1 - time, 3.2),
    })

    lenisRef.current = lenis
    let rafId = 0

    const animate = (time: number) => {
      lenis.raf(time)
      rafId = window.requestAnimationFrame(animate)
    }

    rafId = window.requestAnimationFrame(animate)

    return () => {
      window.cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.href.slice(1))

    const detectActiveSection = () => {
      const triggerLine = window.innerHeight * 0.34
      let currentSection = sectionIds[0]

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId)
        if (!section) {
          continue
        }

        const rect = section.getBoundingClientRect()
        if (rect.top <= triggerLine) {
          currentSection = sectionId
        }
      }

      setActiveSection(`#${currentSection}`)
    }

    detectActiveSection()
    window.addEventListener('scroll', detectActiveSection, { passive: true })
    window.addEventListener('resize', detectActiveSection)

    return () => {
      window.removeEventListener('scroll', detectActiveSection)
      window.removeEventListener('resize', detectActiveSection)
    }
  }, [])

  useEffect(() => {
    if (shouldReduceMotion) {
      setIntroDone(true)
      return
    }

    const timer = window.setTimeout(() => {
      setIntroDone(true)
    }, 3550)

    return () => window.clearTimeout(timer)
  }, [shouldReduceMotion])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const normalizedX = (event.clientX / window.innerWidth) * 100
      const normalizedY = (event.clientY / window.innerHeight) * 100
      pointerX.set(normalizedX)
      pointerY.set(normalizedY)
    }

    window.addEventListener('pointermove', onPointerMove)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [pointerX, pointerY])

  useEffect(() => {
    if (!demoRunning) {
      return
    }

    if (demoIndex >= demoFlow.length - 1) {
      const coolDown = window.setTimeout(() => {
        setDemoRunning(false)
      }, 950)

      return () => window.clearTimeout(coolDown)
    }

    const timer = window.setTimeout(() => {
      setDemoIndex((value) => value + 1)
    }, 1140)

    return () => window.clearTimeout(timer)
  }, [demoIndex, demoRunning])

  const handleHeroMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = (event.clientX - bounds.left) / bounds.width
    const relativeY = (event.clientY - bounds.top) / bounds.height

    logoRotateX.set((relativeY - 0.5) * -10)
    logoRotateY.set((relativeX - 0.5) * 14)
  }

  const handleHeroLeave = () => {
    logoRotateX.set(0)
    logoRotateY.set(0)
  }

  const handleDemoStart = () => {
    setDemoIndex(0)
    setDemoRunning(true)
  }

  const handleAnchorClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault()
    setActiveSection(href)

    const targetElement = document.querySelector(href)
    const targetY =
      targetElement instanceof HTMLElement
        ? targetElement.getBoundingClientRect().top + window.scrollY - 104
        : null

    if (lenisRef.current) {
      const distance = targetY === null ? window.innerHeight : Math.abs(targetY - window.scrollY)
      const adaptiveDuration = Math.min(3.35, Math.max(1.3, (distance / window.innerHeight) * 0.5))

      lenisRef.current.scrollTo(href, {
        duration: adaptiveDuration,
        offset: -104,
        easing: (time) => 1 - Math.pow(1 - time, 3.2),
      })
      return
    }

    if (targetElement instanceof HTMLElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const currentSprint = Math.max(3, Math.round((9.2 - targetBand) * 4))
  const readiness = Math.round(((targetBand - 6) / 3) * 100)
  const readinessStroke = Math.round((Math.max(0, readiness) / 100) * 360)
  const pressureIndex = Math.max(3, 100 - confidence)
  return (
    <div className="landing-root" id="product">
      <motion.div className="ambient-layer" style={{ backgroundImage: ambientLayer }} />
      <div className="noise-layer" aria-hidden="true" />

      <header className={`top-nav ${isScrolled ? 'is-scrolled' : ''}`}>
        <a
          className="brand-mark"
          href="#hero"
          aria-label="Bandnine home"
          onClick={(event) => handleAnchorClick(event, '#hero')}
        >
          <img src={logoIcon} alt="Bandnine mark" />
          <span>Bandnine</span>
        </a>
        <nav>
          {navItems.map((item) => (
            <motion.a
              key={item.href}
              href={item.href}
              className={activeSection === item.href ? 'is-active' : ''}
              onClick={(event) => handleAnchorClick(event, item.href)}
              whileHover={{ y: -1.5 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeSection === item.href && (
                <motion.span
                  layoutId="nav-active-indicator"
                  className="nav-active-indicator"
                  transition={{ type: 'spring', stiffness: 280, damping: 32, mass: 0.62 }}
                />
              )}
              <span>{item.label}</span>
            </motion.a>
          ))}
        </nav>
        <a
          className="nav-cta"
          href="#demo"
          onClick={(event) => handleAnchorClick(event, '#demo')}
        >
          Start speaking
        </a>
      </header>

      <main>
        <motion.section
          layout
          className="hero"
          id="hero"
          transition={{
            layout: {
              duration: shouldReduceMotion ? 0.01 : 1.18,
              ease: 'easeOut',
            },
          }}
        >
          <div className="hero-backdrop" />
          <motion.div
            layout
            className="hero-reveal"
            onMouseMove={handleHeroMove}
            onMouseLeave={handleHeroLeave}
            transition={{
              layout: {
                duration: shouldReduceMotion ? 0.01 : 1.18,
                ease: 'easeOut',
              },
            }}
          >
            <motion.div
              className="intro-piece intro-note"
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, x: -260, rotate: -24, scale: 0.76 }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 1, 1, 0],
                      x: [-260, -42, -8, 16],
                      rotate: [-24, -8, -1, 8],
                      scale: [0.76, 0.96, 1.02, 0.42],
                    }
              }
              transition={{
                duration: 2.8,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.34, 0.66, 1],
              }}
            >
              <img src={logoIcon} alt="" aria-hidden="true" />
            </motion.div>

            <motion.div
              className="intro-piece intro-nine"
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, x: 300, rotate: 14, scale: 0.74 }
              }
              animate={
                shouldReduceMotion
                  ? { opacity: 0 }
                  : {
                      opacity: [0, 1, 1, 0],
                      x: [300, 74, 10, -6],
                      rotate: [14, 5, 1, -7],
                      scale: [0.74, 0.95, 1.03, 0.42],
                    }
              }
              transition={{
                duration: 2.8,
                delay: 0.18,
                ease: [0.22, 1, 0.36, 1],
                times: [0, 0.34, 0.66, 1],
              }}
            >
              9
            </motion.div>

            <motion.div
              className="hero-logo-core"
              style={{ transform: logoTransform }}
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, scale: 0.62, rotate: -7, x: 0, y: 0 }
              }
              animate={{ opacity: 1, scale: 1, rotate: 0, x: 0, y: 0 }}
              transition={{
                duration: 1.1,
                delay: shouldReduceMotion ? 0 : 1.65,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <img src={logoIcon} alt="Bandnine logo" />
            </motion.div>

            <motion.h1
              className="hero-brand-title"
              initial={
                shouldReduceMotion
                  ? false
                  : { opacity: 0, y: 34, letterSpacing: '0.6em' }
              }
              animate={{ opacity: 1, y: 0, letterSpacing: '0.08em' }}
              transition={{
                duration: 1,
                delay: shouldReduceMotion ? 0 : 2.12,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              Bandnine
            </motion.h1>
          </motion.div>

          <AnimatePresence initial={false}>
            {introDone && (
              <motion.div
                key="hero-content"
                layout
                className="hero-content"
                initial={
                  shouldReduceMotion
                    ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                    : { opacity: 0, y: 32, filter: 'blur(12px)' }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  transition: {
                    duration: shouldReduceMotion ? 0.01 : 1.24,
                    delay: shouldReduceMotion ? 0 : 0.18,
                    ease: 'easeOut',
                  },
                }}
                exit={
                  shouldReduceMotion
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        y: 12,
                        filter: 'blur(6px)',
                        transition: { duration: 0.38, ease: 'easeIn' },
                      }
                }
              >
                <motion.p
                  className="eyebrow"
                  initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: shouldReduceMotion ? 0.01 : 0.9,
                      delay: shouldReduceMotion ? 0 : 0.24,
                      ease: 'easeOut',
                    },
                  }}
                >
                  AI-Powered IELTS Speaking Intelligence
                </motion.p>
                <motion.h2
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                      : { opacity: 0, y: 16, filter: 'blur(6px)' }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: shouldReduceMotion ? 0.01 : 0.98,
                      delay: shouldReduceMotion ? 0 : 0.3,
                      ease: 'easeOut',
                    },
                  }}
                >
                  Built for speaking under real examiner pressure.
                </motion.h2>
                <motion.p
                  className="hero-subtext"
                  initial={
                    shouldReduceMotion
                      ? { opacity: 1, y: 0, filter: 'blur(0px)' }
                      : { opacity: 0, y: 16, filter: 'blur(5px)' }
                  }
                  animate={{
                    opacity: 1,
                    y: 0,
                    filter: 'blur(0px)',
                    transition: {
                      duration: shouldReduceMotion ? 0.01 : 1.02,
                      delay: shouldReduceMotion ? 0 : 0.36,
                      ease: 'easeOut',
                    },
                  }}
                >
                  Bandnine simulates live examiner behavior, pushes adaptive follow-ups, and trains
                  you where hesitation breaks scores.
                </motion.p>
                <motion.div
                  className="hero-actions"
                  initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: shouldReduceMotion ? 0.01 : 0.9,
                      delay: shouldReduceMotion ? 0 : 0.42,
                      ease: 'easeOut',
                    },
                  }}
                >
                  <a
                    href="#demo"
                    className="btn btn-primary"
                    onClick={(event) => handleAnchorClick(event, '#demo')}
                  >
                    Try demo
                  </a>
                  <a
                    href="#how-it-works"
                    className="btn btn-ghost"
                    onClick={(event) => handleAnchorClick(event, '#how-it-works')}
                  >
                    See pressure engine
                  </a>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        <section className="story scene-pressure" id="experience" ref={pressureSectionRef}>
          <div className="story-sticky">
            <div className="scene-shell pressure-shell">
              <div className="scene-copy">
                <p className="scene-index">Scene 02</p>
                <h2>From unstable speech to controlled Band 9 flow.</h2>
                <p>
                  Pressure fragments weak responses first. Then structure, tempo control, and lexical
                  precision lock in. The score climbs as delivery stabilizes under scrutiny.
                </p>

                <div className="performance-readouts">
                  <div className="signal-chip">
                    <span>Band signal</span>
                    <strong>{bandScore.toFixed(1)}</strong>
                  </div>
                  <div className="signal-chip">
                    <span>Stability</span>
                    <strong>{confidence}%</strong>
                  </div>
                  <div className="signal-chip danger">
                    <span>Pressure load</span>
                    <strong>{pressureIndex}%</strong>
                  </div>
                </div>
              </div>

              <motion.div
                className="trajectory-engine"
                style={{
                  y: pressureEngineLift,
                  scale: pressureEngineScale,
                  rotate: pressureEngineRotate,
                  rotateX: pressureEngineTiltX,
                  rotateY: pressureEngineTiltY,
                }}
              >
                <motion.div className="trajectory-aurora" style={{ opacity: pressureAuraOpacity, y: pressureAuraY }} />
                <motion.div className="trajectory-rings" style={{ rotate: pressureRingRotate, scale: pressureRingScale }} />
                <motion.div className="trajectory-glass-plane" style={{ opacity: pressureGlassOpacity }} />
                <div className="trajectory-grid" />
                <svg
                  className="trajectory-svg"
                  viewBox="0 0 620 420"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    className="trajectory-base"
                    d="M28 372 C 92 334, 180 320, 248 272 C 312 228, 358 164, 420 126 C 482 88, 544 72, 594 52"
                  />
                  <motion.path
                    className="trajectory-live"
                    d="M28 372 C 92 334, 180 320, 248 272 C 312 228, 358 164, 420 126 C 482 88, 544 72, 594 52"
                    style={{ pathLength: trajectoryLength }}
                  />
                </svg>

                <motion.div
                  className="trajectory-node unstable"
                  style={{ opacity: chaosOpacity }}
                />
                <motion.div className="trajectory-node stable" style={{ opacity: fluentOpacity }} />

                <motion.div className="trajectory-signal" style={{ left: signalX, top: signalY }}>
                  <span>{bandScore.toFixed(1)}</span>
                  <small>Trajectory</small>
                </motion.div>

                <motion.div className="trajectory-fragments chaos" style={{ opacity: chaosOpacity }}>
                  {pressureFragments.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </motion.div>

                <motion.div className="trajectory-fragments fluent" style={{ opacity: fluentOpacity }}>
                  {fluentFragments.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="story scene-examiner" id="how-it-works" ref={examinerSectionRef}>
          <div className="story-sticky">
            <div className="scene-shell examiner-shell-layout">
              <div className="scene-copy">
                <p className="scene-index">Scene 03</p>
                <h2>Real-time examiner, engineered pressure.</h2>
                <p>
                  This is not a chat assistant. Bandnine listens to your last sentence, detects weak
                  reasoning, and inserts targeted follow-ups in live speaking rhythm.
                </p>
                <ul className="scene-list">
                  <li>Adaptive probing instead of scripted turn-taking</li>
                  <li>Interruption cadence modeled after real exam pacing</li>
                  <li>Dynamic follow-ups triggered by your spoken weaknesses</li>
                </ul>
              </div>

              <motion.div
                className="exam-chamber"
                style={{
                  y: examinerY,
                  rotateX: examinerRotateX,
                  rotateY: examinerRotateY,
                  scale: examinerScale,
                }}
              >
                <motion.div className="exam-chamber-glow" style={{ opacity: examinerGlow }} />
                <motion.div className="exam-depth-grid" style={{ y: chamberGridY, opacity: chamberGridOpacity }} />
                <motion.div className="exam-orbit" style={{ rotate: chamberOrbitRotate, opacity: chamberOrbitOpacity }} />
                <motion.div
                  className="exam-sheen"
                  style={{ x: chamberSheenX, y: chamberSheenY, opacity: chamberSheenOpacity }}
                />

                <div className="exam-header">
                  <p className="exam-mode-pill">
                    <span className="status-dot" />
                    Speaking module / live
                  </p>
                  <span className="exam-latency">RTT 58ms</span>
                </div>

                <div className="exam-spectrum" aria-hidden="true">
                  {waveformBars.map((bar) => (
                    <span key={bar} style={{ animationDelay: `${bar * 0.055}s` }} />
                  ))}
                </div>

                <div className="exam-pressure-bar">
                  <span>Interruption rhythm</span>
                  <div className="exam-pressure-track">
                    <motion.div className="exam-pressure-fill" style={{ width: interruptionMeter }} />
                  </div>
                </div>

                <div className="exam-body">
                  <div className="interruption-rail">
                    <p>Pressure line</p>
                    <div className="rail-track">
                      <span />
                      <span />
                      <span />
                      <span />
                      <motion.i style={{ top: interruptionNeedle }} />
                    </div>
                  </div>

                  <div className="transcript-stack">
                    {examinerConversation.map((item, index) => {
                      const isVisible = index <= examinerStep

                      return (
                      <motion.article
                        key={`${item.role}-${item.marker}-${item.text}`}
                        className={`transcript-slab ${item.tone} ${isVisible ? 'is-active' : 'is-muted'}`}
                        initial={false}
                        animate={
                          isVisible
                            ? { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }
                            : { opacity: 0.24, y: 12, scale: 0.985, filter: 'blur(1.6px)' }
                        }
                        transition={{
                          duration: shouldReduceMotion ? 0.01 : 0.56,
                          delay: shouldReduceMotion ? 0 : 0.045 * index,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        <header>
                          <span>{item.role}</span>
                          <em>{item.marker}</em>
                        </header>
                        <p>{item.text}</p>
                      </motion.article>
                      )
                    })}
                  </div>
                </div>

                <motion.p className="followup-insert" style={{ opacity: followupOpacity, y: followupY }}>
                  Adaptive follow-up inserted in 240ms after lexical precision drop.
                </motion.p>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="scene scene-why" id="why-bandnine">
          <div className="section-headline">
            <p className="scene-index">Scene 04</p>
            <h2>Why Bandnine feels different.</h2>
            <p>
              Built as a speaking performance system, not a content catalog. Every module is tuned for
              exam pressure, not passive learning.
            </p>
          </div>
          <div className="why-grid">
            {whyCards.map((card, index) => (
              <TiltFeatureCard
                key={card.title}
                title={card.title}
                description={card.description}
                stat={card.stat}
                index={index}
              />
            ))}
          </div>
        </section>

        <section className="scene scene-demo" id="demo">
          <div className="section-headline">
            <p className="scene-index">Scene 05</p>
            <h2>Operate the performance model.</h2>
            <p>
              Move your target band, run a live response sequence, and watch Bandnine convert speaking
              practice into score-focused execution.
            </p>
          </div>

          <div className="demo-grid">
            <div className="demo-panel score-panel">
              <label htmlFor="target-band">Target band: {targetBand.toFixed(1)}</label>
              <input
                id="target-band"
                type="range"
                min={6}
                max={9}
                step={0.5}
                value={targetBand}
                onChange={(event) => setTargetBand(Number(event.target.value))}
              />
              <div className="score-visual">
                <div
                  className="dial"
                  style={{
                    background: `conic-gradient(var(--accent-red) 0deg ${readinessStroke}deg, rgba(255, 255, 255, 0.12) ${readinessStroke}deg 360deg)`,
                  }}
                >
                  <div className="dial-core">
                    <span>Readiness</span>
                    <strong>{Math.max(0, readiness)}%</strong>
                  </div>
                </div>
                <div className="score-insight">
                  <p>
                    Focus sprint: <strong>{currentSprint} weeks</strong>
                  </p>
                  <p>
                    Priority: <strong>Follow-up depth + lexical precision</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="demo-panel interaction-panel">
              <div className="interaction-head">
                <h3>Trigger examiner reaction</h3>
                <button type="button" onClick={handleDemoStart}>
                  {demoRunning ? 'Running...' : 'Run sequence'}
                </button>
              </div>

              <div className="interaction-stream">
                <AnimatePresence mode="popLayout">
                  {demoFlow.slice(0, demoIndex + 1).map((item) => (
                    <motion.div
                      key={`${item.role}-${item.tag}-${item.text}`}
                      className={`stream-item ${item.role === 'Examiner' ? 'from-examiner' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div>
                        <span>{item.role}</span>
                        <p>{item.text}</p>
                      </div>
                      <em>{item.tag}</em>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <section className="scene scene-final">
          <div className="final-stage">
            <div className="final-halo" aria-hidden="true" />
            <img src={logoFull} alt="Bandnine" className="final-wordmark" />

            <motion.div
              className="final-core"
              initial={{ opacity: 0, y: 44, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true, amount: 0.4 }}
            >
              <div className="final-mark">
                <img src={logoIcon} alt="Bandnine symbol" />
                <span>Bandnine Performance Protocol</span>
              </div>

              <h2>Band 9 is not luck. It is rehearsal under pressure.</h2>
              <p>
                Train against real examiner behavior, build speaking control under tension, and walk into
                exam day with performance that holds.
              </p>

              <div className="final-pulse-line" aria-hidden="true">
                {finalPulseBars.map((bar) => (
                  <span key={bar} style={{ animationDelay: `${bar * 0.08}s` }} />
                ))}
              </div>

              <a
                className="btn btn-primary final-cta"
                href="#demo"
                onClick={(event) => handleAnchorClick(event, '#demo')}
              >
                Start speaking under real pressure
              </a>
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
