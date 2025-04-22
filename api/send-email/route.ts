// app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const encrypt = (text: string, secretKey: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const formData = await request.json();

    // Validación de campos (incluye company si es requerido)
    if (!formData.name || !formData.email || !formData.message) {
      return NextResponse.json(
        { error: 'Nombre, email y mensaje son requeridos' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Configuración de nodemailer (usando variables de entorno)
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Cifrado del mensaje (opcional)
    const secretKey = process.env.ENCRYPTION_KEY;
    if (!secretKey || secretKey.length !== 32) {
      throw new Error('Clave de cifrado inválida');
    }
    const encryptedMessage = encrypt(formData.message, secretKey);

    const mailOptions = {
      from: `"Formulario de Contacto" <${process.env.GMAIL_EMAIL}>`,
      to: process.env.YOUR_EMAIL,
      subject: `Nuevo mensaje de ${formData.name} (${formData.company || 'Sin empresa'})`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background-color: #f4f7f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #b22222; font-size: 24px; margin-bottom: 20px;">Nuevo mensaje de contacto</h2>
    
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #f9f9f9; font-weight: bold; color: #333333;">Nombre:</td>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #ffffff; color: #555555;">${formData.name}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #f9f9f9; font-weight: bold; color: #333333;">Email:</td>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #ffffff; color: #555555;">${formData.email}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #f9f9f9; font-weight: bold; color: #333333;">Empresa:</td>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #ffffff; color: #555555;">${formData.company || 'No especificada'}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #f9f9f9; font-weight: bold; color: #333333; vertical-align: top;">Mensaje:</td>
                <td style="padding: 12px; border: 1px solid #e1e1e1; background-color: #ffffff; color: #555555; white-space: pre-wrap; word-wrap: break-word;">${formData.message.replace(/\n/g, '<br>')}</td>
              </tr>
            </table>
    
            <div style="background-color: #f9f9f9; padding: 10px; border-radius: 6px; font-size: 14px; color: #777777;">
              <p><strong>Mensaje cifrado:</strong><br><code style="word-wrap: break-word; display: block; margin-top: 5px;">${encryptedMessage}</code></p>
              <p><strong>Enviado el:</strong> ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      `,
    };
    

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { success: true, message: 'Mensaje enviado' },
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('Error en API:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500, headers: corsHeaders }
    );
  }
}