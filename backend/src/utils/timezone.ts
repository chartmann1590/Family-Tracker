import moment from 'moment-timezone';
import { pool } from '../config/database';

class TimezoneService {
  private cachedTimezone: string | null = null;

  /**
   * Load timezone from settings
   */
  async loadTimezone(): Promise<string> {
    try {
      const result = await pool.query(
        'SELECT timezone FROM smtp_settings ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length > 0 && result.rows[0].timezone) {
        this.cachedTimezone = result.rows[0].timezone;
        return this.cachedTimezone as string;
      }

      this.cachedTimezone = 'UTC';
      return 'UTC';
    } catch (error) {
      console.error('Error loading timezone:', error);
      this.cachedTimezone = 'UTC';
      return 'UTC';
    }
  }

  /**
   * Get current configured timezone
   */
  getTimezone(): string {
    return this.cachedTimezone || 'UTC';
  }

  /**
   * Format a date to the configured timezone
   */
  async formatDate(date: Date | string, format: string = 'YYYY-MM-DD HH:mm:ss'): Promise<string> {
    const timezone = this.cachedTimezone || await this.loadTimezone();
    return moment(date).tz(timezone).format(format);
  }

  /**
   * Format a date to locale string in configured timezone
   */
  async formatToLocaleString(date: Date | string): Promise<string> {
    const timezone = this.cachedTimezone || await this.loadTimezone();
    const m = moment(date).tz(timezone);
    return m.format('MMMM D, YYYY [at] h:mm A z');
  }

  /**
   * Get all available timezones
   */
  getAllTimezones(): string[] {
    return moment.tz.names();
  }

  /**
   * Validate if a timezone is valid
   */
  isValidTimezone(timezone: string): boolean {
    return moment.tz.names().includes(timezone);
  }
}

export default new TimezoneService();
