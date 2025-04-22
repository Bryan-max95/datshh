import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json();

    if (!email || !token) {
      return NextResponse.json({ error: 'Email y token son obligatorios' }, { status: 400 });
    }

    // Configurar nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Enviar correo de verificación
    const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verifica tu correo electrónico - BW Pentesting',
      html: `
        <h1>Verifica tu correo</h1>
        <p>Haz clic en el siguiente enlace para verificar tu correo electrónico:</p>
        <a href="${verificationUrl}" style="color: #8B0000; font-weight: bold;">Verificar correo</a>
        <p>Este enlace expira en 24 horas.</p>
      `,
    });

    return NextResponse.json({ message: 'Correo de verificación enviado' });
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return NextResponse.json({ error: 'Error al enviar el correo' }, { status: 500 });
  }
}