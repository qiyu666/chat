import { registerPlugin } from '@capacitor/core'

const CHANNEL_ID = 'chat_messages'
const APP_NAME = '社交聊天'
let notificationEnabled = false

const NativeNotifications = registerPlugin('NativeNotifications', {
  web: () => Promise.resolve({
    async checkPermissions() {
      if (!('Notification' in window)) return { isAuthorized: false }
      return { isAuthorized: Notification.permission === 'granted' }
    },
    async requestPermissions() {
      if (!('Notification' in window)) return { isAuthorized: false }
      const result = await Notification.requestPermission()
      return { isAuthorized: result === 'granted' }
    },
    async schedule({ notifications }) {
      if (!('Notification' in window)) return
      for (const n of notifications || []) {
        try { new Notification(n.title || APP_NAME, { body: n.body || '', icon: '/favicon.ico' }) } catch (_) {}
      }
    }
  })
})

export const NotificationService = {
  async init() {
    if (typeof window === 'undefined') return false
    try {
      await NativeNotifications.requestPermissions()
      const { isAuthorized } = await NativeNotifications.checkPermissions()
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
      await NativeNotifications.schedule({
        notifications: [{
          title: `${APP_NAME} - ${sender || '新消息'}`,
          body: message,
          channelId: CHANNEL_ID,
          sound: 'default',
          largeIcon: 'ic_launcher',
          id: Date.now()
        }]
      })
    } catch (e) {
      console.error('[Notification] schedule error:', e)
    }
  }
}
