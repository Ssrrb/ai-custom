import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Pool } from 'pg';
import { z } from 'zod';

// This schema should be consistent with the frontend validation
const assistantSchema = z.object({
  nombre_bot: z.string().min(2, 'El nombre del bot es requerido').max(50),
  nombre_negocio: z
    .string()
    .min(2, 'El nombre del negocio es requerido')
    .max(50),
  descripcion_corta_negocio: z
    .string()
    .min(10, 'La descripción es requerida')
    .max(200),
  objetivo_principal: z.string().min(10, 'El objetivo es requerido').max(500),
  personalidad_adjetivos: z
    .string()
    .min(3, 'La personalidad es requerida')
    .max(100),
});

// Initialize the database connection pool.
// It automatically reads environment variables like PGHOST, PGUSER, etc.
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// GET
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || !token.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.email;

    const query = `
      SELECT *
      FROM template_variables
      WHERE id_user = $1
      LIMIT 1;
    `;
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'No data found for this user.' },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0], { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'An unexpected error occurred.', error: errorMessage },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user using the session token.
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || !token.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.email;

    // 2. Parse and validate the request body.
    const body = await req.json();
    const validation = assistantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: 'Invalid input.',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      nombre_bot,
      nombre_negocio,
      descripcion_corta_negocio,
      objetivo_principal,
      personalidad_adjetivos,
    } = validation.data;

    // 3. Insert data into the database, matching your table schema.
    const query = `
      INSERT INTO template_variables (
        nombre_bot,
        nombre_negocio,
        descripcion_corta_negocio,
        objetivo_principal,
        personalidad_adjetivos,
        id_user
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_template;
    `;

    const values = [
      nombre_bot,
      nombre_negocio,
      descripcion_corta_negocio,
      objetivo_principal,
      personalidad_adjetivos,
      userId,
    ];

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Failed to create assistant.' },
        { status: 500 },
      );
    }

    const newAssistantId = result.rows[0].id_template;

    // 4. Return a success response with the new assistant ID
    return NextResponse.json(
      {
        message: 'Asistente creado exitosamente!',
        id: newAssistantId,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'An unexpected error occurred.', error: errorMessage },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    // 1. Authenticate the user using the session token.
    const token = await getToken({ req, secret: process.env.AUTH_SECRET });
    if (!token || !token.email) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = token.email;

    // 2. Parse and validate the request body.
    const body = await req.json();
    const validation = assistantSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: 'Invalid input.',
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const {
      nombre_bot,
      nombre_negocio,
      descripcion_corta_negocio,
      objetivo_principal,
      personalidad_adjetivos,
    } = validation.data;

    // 3. Update data in the database.
    const query = `
      UPDATE template_variables
      SET
        nombre_bot = $1,
        nombre_negocio = $2,
        descripcion_corta_negocio = $3,
        objetivo_principal = $4,
        personalidad_adjetivos = $5
      WHERE id_user = $6
      RETURNING id_template;
    `;

    const values = [
      nombre_bot,
      nombre_negocio,
      descripcion_corta_negocio,
      objetivo_principal,
      personalidad_adjetivos,
      userId,
    ];

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Failed to update assistant. No record found to update.' },
        { status: 404 },
      );
    }

    const updatedId = result.rows[0].id_template;

    // 4. Return a success response.
    return NextResponse.json(
      {
        message: 'Assistant updated successfully!',
        id: updatedId,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { message: 'An unexpected error occurred.', error: errorMessage },
      { status: 500 },
    );
  }
}
