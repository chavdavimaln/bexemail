import { useContext } from 'react';
import AutomationContext from './automationContextStore';

export default function useAutomation() {
  const context = useContext(AutomationContext);
  if (!context) throw new Error('useAutomation must be used inside AutomationProvider');
  return context;
}
