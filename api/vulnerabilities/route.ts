import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI as string;
if (!uri) {
  throw new Error('MONGODB_URI no está definido en .env.local.');
}

export interface Vulnerability {
  _id: string;
  software_id: string;
  cve_id: string;
  severity: string;
  description: string;
  last_modified: string;
  status: string;
}

async function connectMongo() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    return client;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    throw error;
  }
}

function convertToVulnerability(doc: any): Vulnerability {
  return {
    _id: doc._id.toString(),
    software_id: doc.software_id.toString(),
    cve_id: doc.cve_id,
    severity: doc.severity,
    description: doc.description,
    last_modified: doc.last_modified instanceof Date ? doc.last_modified.toISOString() : doc.last_modified,
    status: doc.status,
  };
}

export async function GET(request: NextRequest) {
  const client = await connectMongo();
  try {
    const db = client.db('cve_monitor');
    const vulnerabilities = await db
      .collection('vulnerabilidades')
      .find({ status: 'pending' })
      .toArray();
    return NextResponse.json(vulnerabilities.map(convertToVulnerability));
  } catch (error) {
    console.error('Error en fetchVulnerabilities:', error);
    return NextResponse.json({ error: 'Error al obtener vulnerabilidades' }, { status: 500 });
  } finally {
    await client.close();
  }
}