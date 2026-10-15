import nodemailer from 'nodemailer';
import { pool } from '../config/database';

export interface SMTPSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  from_email: string;
  from_name: string;
  admin_email: string;
  notification_emails: string[];
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter | null = null;
  private settings: SMTPSettings | null = null;

  private constructor() {}

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Load SMTP settings from database
   */
  public async loadSettings(): Promise<SMTPSettings | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM smtp_settings ORDER BY id DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        console.warn('⚠️  No SMTP settings configured');
        return null;
      }

      const settings = result.rows[0];
      this.settings = settings;
      this.transporter = nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: settings.smtp_secure,
        auth: {
          user: settings.smtp_user,
          pass: settings.smtp_password,
        },
      });

      console.log('✅ SMTP settings loaded successfully');
      return this.settings;
    } catch (error) {
      console.error('❌ Error loading SMTP settings:', error);
      return null;
    }
  }

  /**
   * Send geofence violation email notification
   */
  public async sendGeofenceViolation(params: {
    userName: string;
    geofenceName: string;
    violationType: 'enter' | 'exit';
    latitude: number;
    longitude: number;
    timestamp: Date;
  }): Promise<boolean> {
    if (!this.settings || !this.transporter) {
      console.warn('⚠️  Cannot send email: SMTP not configured');
      return false;
    }

    const { userName, geofenceName, violationType, latitude, longitude, timestamp } = params;

    const action = violationType === 'exit' ? 'exited' : 'entered';
    const subject = `Geofence Alert: ${userName} ${action} ${geofenceName}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6366f1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .alert-box { background-color: ${violationType === 'exit' ? '#fef2f2' : '#f0fdf4'};
                         border-left: 4px solid ${violationType === 'exit' ? '#ef4444' : '#22c55e'};
                         padding: 15px; margin: 15px 0; }
            .details { margin: 15px 0; }
            .details-table { width: 100%; border-collapse: collapse; }
            .details-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
            .details-table td:first-child { font-weight: bold; width: 40%; }
            .map-link { display: inline-block; background-color: #6366f1; color: white;
                        padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 Geofence Alert</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <h2 style="margin-top: 0;">${userName} ${action} ${geofenceName}</h2>
                <p><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
              </div>

              <div class="details">
                <h3>Details</h3>
                <table class="details-table">
                  <tr>
                    <td>User</td>
                    <td>${userName}</td>
                  </tr>
                  <tr>
                    <td>Geofence</td>
                    <td>${geofenceName}</td>
                  </tr>
                  <tr>
                    <td>Action</td>
                    <td>${violationType === 'exit' ? 'Exited geofence area' : 'Entered geofence area'}</td>
                  </tr>
                  <tr>
                    <td>Location</td>
                    <td>${latitude.toFixed(6)}, ${longitude.toFixed(6)}</td>
                  </tr>
                  <tr>
                    <td>Timestamp</td>
                    <td>${timestamp.toLocaleString()}</td>
                  </tr>
                </table>

                <a href="https://www.google.com/maps?q=${latitude},${longitude}" class="map-link" target="_blank">
                  📍 View on Google Maps
                </a>
              </div>

              <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
                This is an automated notification from Family Tracker.
                ${violationType === 'exit' ? 'The user has left' : 'The user has entered'} the geofenced area.
              </p>
            </div>
            <div class="footer">
              <p>Family Tracker - Real-time Family Location Tracking</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Geofence Alert: ${userName} ${action} ${geofenceName}

User: ${userName}
Geofence: ${geofenceName}
Action: ${violationType === 'exit' ? 'Exited geofence area' : 'Entered geofence area'}
Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
Timestamp: ${timestamp.toLocaleString()}

View on Google Maps: https://www.google.com/maps?q=${latitude},${longitude}

This is an automated notification from Family Tracker.
    `.trim();

    try {
      // Get all recipients
      const recipients = [this.settings.admin_email];
      if (this.settings.notification_emails && this.settings.notification_emails.length > 0) {
        recipients.push(...this.settings.notification_emails);
      }

      // Send email to all recipients
      await this.transporter.sendMail({
        from: `"${this.settings.from_name}" <${this.settings.from_email}>`,
        to: recipients.join(', '),
        subject,
        text,
        html,
      });

      console.log(`✅ Geofence violation email sent to: ${recipients.join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending geofence violation email:', error);
      return false;
    }
  }

  /**
   * Send a generic email notification
   */
  public async sendEmail(
    recipient: 'admin' | string,
    subject: string,
    html: string
  ): Promise<boolean> {
    if (!this.settings || !this.transporter) {
      console.warn('⚠️  Cannot send email: SMTP not configured');
      return false;
    }

    try {
      const recipients = recipient === 'admin'
        ? [this.settings.admin_email, ...(this.settings.notification_emails || [])]
        : [recipient];

      await this.transporter.sendMail({
        from: `"${this.settings.from_name}" <${this.settings.from_email}>`,
        to: recipients.join(', '),
        subject,
        html,
      });

      console.log(`✅ Email sent to: ${recipients.join(', ')}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return false;
    }
  }

  /**
   * Test SMTP connection
   */
  public async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.warn('⚠️  No transporter configured');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection test successful');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection test failed:', error);
      return false;
    }
  }
}

export default EmailService.getInstance();
