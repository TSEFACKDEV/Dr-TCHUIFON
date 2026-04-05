import nodemailer from 'nodemailer';
import env from '../config/config.js';

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: parseInt(env.smtpPort.toString()),
  secure: false, // true for 465, false for other ports
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> => {
  try {
    await transporter.sendMail({
      from: `"${env.fromName}" <${env.fromEmail}>`,
      to,
      subject,
      text,
      html: html || text,
    });
    return true;
  } catch (error) {
    return false;
  }
};
