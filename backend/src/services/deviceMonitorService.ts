import { pool } from '../config/database';
import emailService from './emailService';

interface DeviceStatus {
  userId: number;
  userName: string;
  userEmail: string;
  batteryLevel: number | null;
  lastUpdate: Date;
  minutesSinceUpdate: number;
}

class DeviceMonitorService {
  private monitorInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes
  private readonly NOTIFICATION_COOLDOWN_HOURS = 6; // Don't spam notifications

  async start() {
    console.log('🔍 Starting device monitor service...');

    // Run immediately on start
    await this.checkDeviceStatus();

    // Then run periodically
    this.monitorInterval = setInterval(async () => {
      await this.checkDeviceStatus();
    }, this.CHECK_INTERVAL_MS);

    console.log(`✅ Device monitor service started (checking every ${this.CHECK_INTERVAL_MS / 60000} minutes)`);
  }

  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      console.log('🛑 Device monitor service stopped');
    }
  }

  private async checkDeviceStatus() {
    try {
      // Get SMTP settings to check if monitoring is enabled
      const settingsResult = await pool.query(
        'SELECT notify_low_battery, low_battery_threshold, notify_device_offline, device_offline_minutes FROM smtp_settings ORDER BY id DESC LIMIT 1'
      );

      if (settingsResult.rows.length === 0) {
        return; // No settings configured
      }

      const settings = settingsResult.rows[0];
      const { notify_low_battery, low_battery_threshold, notify_device_offline, device_offline_minutes } = settings;

      if (!notify_low_battery && !notify_device_offline) {
        return; // Monitoring is disabled
      }

      // Get all users with their latest location
      const usersResult = await pool.query(`
        SELECT
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.family_id,
          l.battery,
          l.timestamp as last_update,
          EXTRACT(EPOCH FROM (NOW() - l.timestamp)) / 60 as minutes_since_update
        FROM users u
        LEFT JOIN LATERAL (
          SELECT battery, timestamp
          FROM locations
          WHERE user_id = u.id
          ORDER BY timestamp DESC
          LIMIT 1
        ) l ON true
        WHERE u.family_id IS NOT NULL
      `);

      for (const user of usersResult.rows) {
        const deviceStatus: DeviceStatus = {
          userId: user.user_id,
          userName: user.user_name,
          userEmail: user.user_email,
          batteryLevel: user.battery,
          lastUpdate: user.last_update,
          minutesSinceUpdate: user.minutes_since_update || 0,
        };

        // Check for low battery
        if (notify_low_battery && deviceStatus.batteryLevel !== null && deviceStatus.batteryLevel <= low_battery_threshold) {
          await this.sendLowBatteryNotification(deviceStatus, low_battery_threshold);
        }

        // Check for device offline
        if (notify_device_offline && deviceStatus.minutesSinceUpdate >= device_offline_minutes) {
          await this.sendDeviceOfflineNotification(deviceStatus, device_offline_minutes);
        }
      }
    } catch (error) {
      console.error('Error checking device status:', error);
    }
  }

  private async sendLowBatteryNotification(device: DeviceStatus, threshold: number) {
    try {
      // Check if we've sent a notification recently
      const recentNotification = await pool.query(
        `SELECT id FROM device_status_notifications
         WHERE user_id = $1
         AND notification_type = 'low_battery'
         AND sent_at > NOW() - INTERVAL '${this.NOTIFICATION_COOLDOWN_HOURS} hours'
         ORDER BY sent_at DESC LIMIT 1`,
        [device.userId]
      );

      if (recentNotification.rows.length > 0) {
        return; // Already sent notification recently
      }

      // Send email notification
      await emailService.sendEmail(
        'admin', // Will go to admin email
        `Low Battery Alert: ${device.userName}`,
        `
          <h2>Low Battery Warning</h2>
          <p><strong>${device.userName}</strong> (${device.userEmail}) has a low battery level.</p>
          <ul>
            <li><strong>Current Battery:</strong> ${device.batteryLevel}%</li>
            <li><strong>Threshold:</strong> ${threshold}%</li>
            <li><strong>Last Update:</strong> ${device.lastUpdate?.toLocaleString() || 'Never'}</li>
          </ul>
          <p>The device may go offline soon if not charged.</p>
        `
      );

      // Record the notification
      await pool.query(
        `INSERT INTO device_status_notifications (user_id, notification_type, battery_level)
         VALUES ($1, 'low_battery', $2)`,
        [device.userId, device.batteryLevel]
      );

      console.log(`📧 Sent low battery notification for ${device.userName} (${device.batteryLevel}%)`);
    } catch (error) {
      console.error(`Error sending low battery notification for user ${device.userId}:`, error);
    }
  }

  private async sendDeviceOfflineNotification(device: DeviceStatus, thresholdMinutes: number) {
    try {
      // Check if we've sent a notification recently
      const recentNotification = await pool.query(
        `SELECT id FROM device_status_notifications
         WHERE user_id = $1
         AND notification_type = 'device_offline'
         AND sent_at > NOW() - INTERVAL '${this.NOTIFICATION_COOLDOWN_HOURS} hours'
         ORDER BY sent_at DESC LIMIT 1`,
        [device.userId]
      );

      if (recentNotification.rows.length > 0) {
        return; // Already sent notification recently
      }

      const hoursOffline = Math.floor(device.minutesSinceUpdate / 60);
      const minutesOffline = Math.floor(device.minutesSinceUpdate % 60);

      // Send email notification
      await emailService.sendEmail(
        'admin',
        `Device Offline Alert: ${device.userName}`,
        `
          <h2>Device Offline Warning</h2>
          <p><strong>${device.userName}</strong> (${device.userEmail}) has not updated their location recently.</p>
          <ul>
            <li><strong>Last Update:</strong> ${device.lastUpdate?.toLocaleString() || 'Never'}</li>
            <li><strong>Time Offline:</strong> ${hoursOffline > 0 ? `${hoursOffline}h ` : ''}${minutesOffline}m</li>
            <li><strong>Threshold:</strong> ${thresholdMinutes} minutes</li>
            ${device.batteryLevel !== null ? `<li><strong>Last Known Battery:</strong> ${device.batteryLevel}%</li>` : ''}
          </ul>
          <p>The device may be turned off, out of battery, or experiencing connectivity issues.</p>
        `
      );

      // Record the notification
      await pool.query(
        `INSERT INTO device_status_notifications (user_id, notification_type, minutes_offline)
         VALUES ($1, 'device_offline', $2)`,
        [device.userId, Math.floor(device.minutesSinceUpdate)]
      );

      console.log(`📧 Sent offline notification for ${device.userName} (${Math.floor(device.minutesSinceUpdate)} minutes offline)`);
    } catch (error) {
      console.error(`Error sending offline notification for user ${device.userId}:`, error);
    }
  }
}

export default new DeviceMonitorService();
