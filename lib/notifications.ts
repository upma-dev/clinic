import type { Routine } from './db/routines';

// Store timeout IDs so we can clear them if routines update
const activeTimeouts: Map<string, NodeJS.Timeout> = new Map();

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function initNotifications(routines: Routine[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Clear existing timeouts
  activeTimeouts.forEach(timeout => clearTimeout(timeout));
  activeTimeouts.clear();

  const now = new Date();

  routines.forEach(routine => {
    if (!routine.reminderEnabled) return;

    const [hours, minutes] = routine.time.split(':').map(Number);
    const routineTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

    // If time has already passed today, don't schedule
    if (routineTime.getTime() <= now.getTime()) return;

    const timeUntil = routineTime.getTime() - now.getTime();

    const timeoutId = setTimeout(() => {
      sendNotification(routine);
    }, timeUntil);

    activeTimeouts.set(routine.id, timeoutId);
  });
}

function sendNotification(routine: Routine) {
  const title = "Time for your routine";
  const body = `Don't forget to complete: ${routine.name}`;
  
  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico', // Replace with a real icon path if available
    requireInteraction: true
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
