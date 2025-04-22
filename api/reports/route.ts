// src/app/api/reports/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  equipo_id: String,
  timestamp: String,
  total_cves: Number,
  critical_cves: Number,
});

const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdash', {});

export async function GET() {
  try {
    const reports = await Report.find();
    return NextResponse.json(reports);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 });
  }
}