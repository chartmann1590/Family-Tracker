import moment from 'moment-timezone';

class TimezoneUtil {
  private timezone: string | null = null;

  /**
   * Set the timezone for the app
   */
  setTimezone(timezone: string) {
    this.timezone = timezone;
  }

  /**
   * Get the current configured timezone
   */
  getTimezone(): string {
    return this.timezone || 'UTC';
  }

  /**
   * Format a date to the configured timezone
   */
  formatDate(date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    const tz = this.getTimezone();
    return moment(date).tz(tz).format(format);
  }

  /**
   * Format a date to a human-readable string in configured timezone
   */
  formatToLocaleString(date: string | Date): string {
    const tz = this.getTimezone();
    const m = moment(date).tz(tz);
    return m.format('MMMM D, YYYY [at] h:mm A z');
  }

  /**
   * Format a date to short format
   */
  formatShort(date: string | Date): string {
    const tz = this.getTimezone();
    return moment(date).tz(tz).format('MMM D, h:mm A');
  }

  /**
   * Format a date relative to now (e.g., "2 hours ago")
   */
  formatRelative(date: string | Date): string {
    return moment(date).fromNow();
  }

  /**
   * Get all available timezones
   */
  getAllTimezones(): string[] {
    return moment.tz.names();
  }

  /**
   * Get common timezones grouped by region
   */
  getCommonTimezones(): { [key: string]: string[] } {
    const allTimezones = moment.tz.names();
    const grouped: { [key: string]: string[] } = {};

    allTimezones.forEach((tz) => {
      const parts = tz.split('/');
      if (parts.length >= 2) {
        const region = parts[0];
        if (!grouped[region]) {
          grouped[region] = [];
        }
        grouped[region].push(tz);
      }
    });

    return grouped;
  }
}

export default new TimezoneUtil();
