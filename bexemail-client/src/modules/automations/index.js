/**
 * ==========================================
 * BEXEMAIL: AUTOMATION MODULE EXPORT
 * ==========================================
 * * This module is completely decoupled. To mount this into your main 
 * React application, import these two items into your root App.jsx 
 * without causing any cross-module dependencies:
 * * import { AutomationProvider, AutomationRoutes } from './modules/automations';
 * * <AutomationProvider>
 * <AutomationRoutes />
 * </AutomationProvider>
 * */

export { AutomationProvider } from './context/AutomationContext';
export { default as AutomationRoutes } from './routes';
