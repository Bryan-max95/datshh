// src/app/api/summary/route.ts
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
  cves: [{ cveId: String, severity: String, description: String }],
  shodanData: { ports: [Number], cpes: [String], vulns: [String], tags: [String] },
  greyNoiseData: { noise: Boolean, classification: String },
});

const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdash', {});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '30d';
    
    const devices = await Device.find();
    const totalCves = devices.reduce((sum, d) => sum + (d.cves?.length || 0), 0);
    const criticalCves = devices.reduce(
      (sum, d) => sum + (d.cves?.filter((c: { severity: string; }) => c.severity === 'CRITICAL').length || 0),
      0
    );
    const openPorts = devices.reduce((sum, d) => sum + (d.shodanData?.ports?.length || 0), 0);
    const noisyIPs = devices.reduce((sum, d) => sum + (d.greyNoiseData?.noise ? 1 : 0), 0);

    return NextResponse.json({
      monitoredDevices: devices.length,
      totalCves,
      criticalCves,
      openPorts,
      noisyIPs,
      vulnerabilityPercentage: totalCves ? ((criticalCves / totalCves) * 100).toFixed(1) : '0.0',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener resumen' }, { status: 500 });
  }
}