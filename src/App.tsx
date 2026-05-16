import { AnimatePresence, motion } from 'framer-motion';
import LoadingPage from './pages/LoadingPage';
import WelcomePage from './pages/WelcomePage';
import AuthAnimation from './pages/AuthAnimation';
import TerminalCutscene from './pages/TerminalCutscene';
import Dashboard from './pages/Dashboard';
import { SmokeBackground } from './three/background/SmokeBackground';
import { useFlowStore } from './store/useFlowStore';
import { CloseControl } from './components/CloseControl';
import SecurityInjectionPage from './pages/SecurityInjectionPage';

const fade = {
  initial: { opacity: 0, filter: 'blur(10px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(12px)' },
};

export default function App() {
  const phase = useFlowStore((state) => state.phase);
  const setPhase = useFlowStore((state) => state.setPhase);

  return (
    <div className="app-shell">
      {phase !== 'loading' && (
        <>
          <SmokeBackground />
          <div className="grid-bg" />
          <div className="vignette" />
          <div className="scanlines" />
        </>
      )}
      {phase !== 'loading' && <CloseControl />}

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div key="loading" className="screen" {...fade} transition={{ duration: 0.55 }}>
            <LoadingPage onComplete={() => setPhase('welcome')} />
          </motion.div>
        )}
        {phase === 'welcome' && (
          <motion.div key="welcome" className="screen" {...fade} transition={{ duration: 0.55 }}>
            <WelcomePage />
          </motion.div>
        )}
        {phase === 'authAnimation' && (
          <motion.div key="auth" className="screen" {...fade} transition={{ duration: 0.35 }}>
            <AuthAnimation onComplete={() => setPhase('securityInject')} onFailure={() => setPhase('welcome')} />
          </motion.div>
        )}
        {phase === 'securityInject' && (
          <motion.div key="securityInject" className="screen" {...fade} transition={{ duration: 0.35 }}>
            <SecurityInjectionPage onComplete={() => setPhase('tty')} />
          </motion.div>
        )}
        {phase === 'tty' && (
          <motion.div key="tty" className="screen" {...fade} transition={{ duration: 0.45 }}>
            <TerminalCutscene onComplete={() => setPhase('dashboard')} />
          </motion.div>
        )}
        {phase === 'dashboard' && (
          <motion.div key="dashboard" className="screen" {...fade} transition={{ duration: 0.6 }}>
            <Dashboard />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
