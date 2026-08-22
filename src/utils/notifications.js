import { LocalNotifications } from '@capacitor/local-notifications'

const CHANNEL_ID = 'chat_messages'
const APP_NAME = '社交聊天'
let notificationEnabled = false

export const NotificationService = {
  async init() {
    if (typeof window === 'undefined') return false
    try {
      await LocalNotifications.requestPermissions()
      const { isAuthorized } = await LocalNotifications.checkPermissions()
      notificationEnabled = isAuthorized
      if (isAuthorized) {
        console.log('[Notification] Permissions granted')
      }
      return isAuthorized
    } catch (e) {
      console.error('[Notification] init error:', e)
      return false
    }
  },

  async showNotification(message, sender) {
    if (!notificationEnabled) return
    if (typeof window === 'undefined') return
    try {
      await LocalNotifications.schedule({
        notifications: [{
          title: `${APP_NAME} - ${sender || '新消息'}`,
          body: message,
          channelId: CHANNEL_ID,
          sound: 'default',
          largeIcon: 'ic_launcher',
          id: Date.now(),
          extra: { type: 'message', sender: sender }
        }]
      })
    } catch (e) {
      console.error('[Notification] schedule error:', e)
    }
  }
}
