// app/api/send-email/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const encrypt = (text: string, secretKey: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// Archivo para almacenar el contador (en un entorno real, usa una DB)
const counterFile = path.join(process.cwd(), 'cot_counter.txt');

async function getNextQuoteNumber(): Promise<string> {
  try {
    const data = await fs.readFile(counterFile, 'utf-8');
    const counter = parseInt(data, 10) + 1;
    await fs.writeFile(counterFile, counter.toString());
    return `COT24-${String(counter).padStart(6, '0')}`;
  } catch (error) {
    // Si el archivo no existe, empezamos desde 0
    await fs.writeFile(counterFile, '0');
    return 'COT25-000000';
  }
}

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '',
    'Access-Control-Allow-Methods': 'POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const formData = await request.json();

    // Validación de campos requeridos
    if (!formData.name || !formData.email || !formData.planName || !formData.planPrice || !formData.planFeatures || !formData.message) {
      return NextResponse.json(
        { error: 'Todos los campos del formulario son requeridos' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validación de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^@\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Configuración de nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.GMAIL_SMTP_HOST,
      port: parseInt(process.env.GMAIL_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Generar número de cotización y fecha
    const quoteNumber = await getNextQuoteNumber();
    const issueDate = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Cifrado del mensaje (opcional)
    const secretKey = process.env.ENCRYPTION_KEY;
    if (!secretKey || secretKey.length !== 32) {
      throw new Error('Clave de cifrado inválida');
    }
    const encryptedMessage = encrypt(formData.message, secretKey);

    const mailOptions = {
      from: `"BWPentesting" <${process.env.GMAIL_EMAIL}>`,
      to: formData.email,
      subject: `Cotización ${quoteNumber} - BWPentesting`,
      html: `
        <div style="font-family: 'Arial', sans-serif; padding: 20px; background-color: #f5f5f5; color: #333;">
          <div style="max-width: 700px; margin: 0 auto; background-color: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 20px;">
              <img src="https://www.bwpentesting.com/_next/image?url=%2Fimages%2Fbwp1.png&w=640&q=100" alt="BWPentesting Logo" style="max-width: 200px; height: auto;" />
              <h1 style="color: #8B0000; font-size: 28px; margin: 10px 0 0;">BWPentesting</h1>
              <p style="font-size: 14px; color: #666;">www.bwpentesting.com</p>
            </div>
            <h2 style="color: #333; font-size: 22px; margin-bottom: 20px;">Cotización ${quoteNumber}</h2>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Datos del Cliente</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Nombre:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formData.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Email:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formData.email}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Empresa:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formData.company || 'No especificada'}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; background-color: #f9f9f9; font-weight: bold;">Teléfono:</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${formData.phone}</td>
              </tr>
            </table>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Descripción del Producto o Servicio</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr>
                <th style="padding: 10px; border: 1px solid #ddd; background-color: #8B0000; color: #fff; text-align: left;">Referencia</th>
                <th style="padding: 10px; border: 1px solid #ddd; background-color: #8B0000; color: #fff; text-align: left;">Descripción</th>
                <th style="padding: 10px; border: 1px solid #ddd; background-color: #8B0000; color: #fff; text-align: left;">Cantidad/Alcance</th>
              </tr>
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${formData.planName}</td>
                <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${formData.planFeatures.replace(/\n/g, '<br>')}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">1 implementación</td>
              </tr>
            </table>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Precio</h3>
            <p><strong>Precio por unidad:</strong> ${formData.planPrice}</p>
            <p><strong>Total a pagar:</strong> ${formData.planPrice}</p>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Condiciones de Pago</h3>
            <p>- Métodos aceptados: Transferencia bancaria, tarjeta de crédito/débito</p>
            <p>- Plazo de pago: 15 días hábiles tras la aceptación</p>
            <p>- Anticipo: 50% al confirmar la cotización, 50% al finalizar la implementación</p>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Tiempos de Entrega</h3>
            <p>Implementación completa en 5-10 días hábiles tras la confirmación y pago inicial.</p>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Garantías</h3>
            <p>30 días de soporte técnico gratuito post-implementación. Garantía de funcionamiento según especificaciones.</p>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Costos Adicionales</h3>
            <p>No incluidos: tributos locales, costos de transporte (si aplica), pruebas adicionales solicitadas por el cliente.</p>

            <h3 style="color: #8B0000; font-size: 18px; margin-top: 20px;">Detalles Adicionales</h3>
            <p style="white-space: pre-wrap;">${formData.message.replace(/\n/g, '<br>')}</p>

            <div style="margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px;">
              <p><strong>Fecha de Expedición:</strong> ${issueDate}</p>
              <p><strong>Vigencia:</strong> 30 días a partir de la fecha de expedición</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="font-size: 14px; color: #666;">BWPentesting - Soluciones de Ciberseguridad Integral</p>
              <p style="font-size: 12px; color: #999;">www.bwpentesting.com | contacto@bwpentesting.com</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json(
      { success: true, message: 'Cotización enviada al correo del usuario' },
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