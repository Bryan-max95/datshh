import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const RegisterSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password } = RegisterSchema.parse(body);

    // Verificar si el email ya existe
    const { rows: existingUsers } = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existingUsers.length > 0) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario
    const { rows: newUser } = await sql`
      INSERT INTO users (name, email, password, created_at)
      VALUES (${name}, ${email}, ${hashedPassword}, NOW())
      RETURNING id, name, email
    `;
    const user = newUser[0];

    // Generar token de prueba de 5 días
    const tokenValue = crypto.randomUUID();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 5);

    await sql`
      INSERT INTO tokens (token, email_cliente, tipo, estado, fecha_creacion, fecha_activacion, fecha_expiracion, user_id)
      VALUES (${tokenValue}, ${email}, 'prueba', 'activado', NOW(), NOW(), ${expirationDate.toISOString()}, ${user.id})
    `;

    return NextResponse.json(
      { message: 'User registered successfully', user: { id: user.id, name: user.name, email: user.email } },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors.map((e) => e.message).join(', ') }, { status: 400 });
    }
    console.error('Error registering user:', error);
    return NextResponse.json({ error: 'Failed to register user' }, { status: 500 });
  }
}