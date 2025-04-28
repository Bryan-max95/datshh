/* src/app/dashboard/server/server.ts */
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import axios from 'axios';
import dotenv from 'dotenv';
import { Device, Camera, Vulnerability, Policy, Incident, Report, Threat } from '../../types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(helmet());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// MongoDB Connection (mongoose v7+ no necesita opciones extras)
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cybersecurity')
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Schemas
const DeviceSchema = new mongoose.Schema({
  name: String,
  ipAddress: String,
  deviceType: String,
  group: String,
  status: String,
  os: String,
  cpuUsage: Number,
  memoryUsage: Number,
  browsers: [{ name: String, version: String }],
  software: [{ name: String, version: String }],
  cves: [{ cveId: String, severity: String, description: String }],
  shodanData: Object,
  greyNoiseData: Object,
  geo: { lat: Number, lng: Number },
});

const CameraSchema = new mongoose.Schema({
  ipAddress: String,
  name: String,
  manufacturer: String,
  model: String,
  ports: [Number],
  firmware: String,
  vulnerabilities: [{ cveId: String, severity: String, description: String, link: String }],
  shodanData: Object,
  greyNoiseData: Object,
  lastScanned: String,
});

const VulnerabilitySchema = new mongoose.Schema({
  cve_id: String,
  software_id: String,
  severity: String,
  description: String,
  status: String,
});

const PolicySchema = new mongoose.Schema({
  name: String,
  description: String,
  status: String,
});

const IncidentSchema = new mongoose.Schema({
  title: String,
  description: String,
  severity: String,
  status: String,
  createdAt: String,
});

const ReportSchema = new mongoose.Schema({
  equipo_id: String,
  timestamp: String,
  total_cves: { type: Number, required: true, default: 0 },
  critical_cves: { type: Number, required: true, default: 0 },
});

const ThreatSchema = new mongoose.Schema({
  type: String,
  risk: String,
  source: String,
  destination: String,
  timestamp: String,
});

// Models
const DeviceModel = mongoose.model('Device', DeviceSchema);
const CameraModel = mongoose.model('Camera', CameraSchema);
const VulnerabilityModel = mongoose.model('Vulnerability', VulnerabilitySchema);
const PolicyModel = mongoose.model('Policy', PolicySchema);
const IncidentModel = mongoose.model('Incident', IncidentSchema);
const ReportModel = mongoose.model('Report', ReportSchema);
const ThreatModel = mongoose.model('Threat', ThreatSchema);

// Middleware: Token Validation
const validateToken = (req: Request & { user?: any }, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.warn('No token provided in request');
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET environment variable is not set');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      console.error('Token verification error:', err);
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    req.user = decoded;
    next();
  });
};

// Middleware: Sanitization
const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      req.body[key] = sanitizeHtml(req.body[key]);
    }
  }
  next();
};

// Routes
app.get('/api/equipos', validateToken, async (req, res) => {
  try {
    const devices = await DeviceModel.find();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Error fetching devices' });
  }
});

app.post('/api/equipos', validateToken, sanitizeInput, async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      ipAddress: z.string().ip(),
      deviceType: z.string().min(1),
      group: z.string().min(1),
    });
    const data = schema.parse(req.body);
    const device = new DeviceModel(data);
    await device.save();
    res.json(device);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error adding device:', error);
      res.status(500).json({ error: 'Error adding device' });
    }
  }
});

app.delete('/api/equipos', validateToken, async (req, res) => {
  try {
    const { _id } = z.object({ _id: z.string() }).parse(req.body);
    await DeviceModel.deleteOne({ _id });
    res.json({ message: 'Device deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error deleting device:', error);
      res.status(500).json({ error: 'Error deleting device' });
    }
  }
});

app.get('/api/cameras', validateToken, async (req, res) => {
  try {
    const cameras = await CameraModel.find();
    res.json(cameras);
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({ error: 'Error fetching cameras' });
  }
});

app.post('/api/cameras', validateToken, sanitizeInput, async (req, res) => {
  try {
    const schema = z.object({
      ipAddress: z.string().ip(),
      name: z.string().min(1),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      lastScanned: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const camera = new CameraModel(data);
    await camera.save();
    res.json(camera);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error adding camera:', error);
      res.status(500).json({ error: 'Error adding camera' });
    }
  }
});

app.delete('/api/cameras', validateToken, async (req, res) => {
  try {
    const { _id } = z.object({ _id: z.string() }).parse(req.body);
    await CameraModel.deleteOne({ _id });
    res.json({ message: 'Camera deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error deleting camera:', error);
      res.status(500).json({ error: 'Error deleting camera' });
    }
  }
});

app.post('/api/cameras/scan', validateToken, async (req, res) => {
  try {
    // Mock scan (integrate with agent.py in production)
    const scannedCameras = [
      {
        ipAddress: '_+',
        name: 'Camera 1',
        manufacturer: 'Hikvision',
        model: 'DS-2CD2143G0-I',
        ports: [80, 554],
        lastScanned: new Date().toISOString(),
      },
    ];
    res.json(scannedCameras);
  } catch (error) {
    console.error('Error scanning cameras:', error);
    res.status(500).json({ error: 'Error scanning cameras' });
  }
});

app.get('/api/vulnerabilities', validateToken, async (req, res) => {
  try {
    const vulnerabilities = await VulnerabilityModel.find();
    res.json(vulnerabilities);
  } catch (error) {
    console.error('Error fetching vulnerabilities:', error);
    res.status(500).json({ error: 'Error fetching vulnerabilities' });
  }
});

app.delete('/api/vulnerabilities', validateToken, async (req, res) => {
  try {
    const { cve_id } = z.object({ cve_id: z.string() }).parse(req.body);
    await VulnerabilityModel.deleteOne({ cve_id });
    res.json({ message: 'Vulnerability deleted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors });
    } else {
      console.error('Error deleting vulnerability:', error);
      res.status(500).json({ error: 'Error deleting vulnerability' });
    }
  }
});

app.get('/api/shodan', validateToken, async (req, res) => {
  try {
    const { ip } = z.object({ ip: z.string().ip() }).parse(req.query);
    const response = await axios.get(`https://api.shodan.io/shodan/host/${ip}`, {
      params: { key: process.env.SHODAN_API_KEY },
    });
    res.json({
      ip,
      ports: response.data.ports || [],
      cpes: response.data.cpes || [],
      vulns: response.data.vulns || [],
      tags: response.data.tags || [],
      product: response.data.product || '',
      version: response.data.version || '',
      hostnames: response.data.hostnames || [],
      os: response.data.os || 'N/A',
      org: response.data.org || 'N/A',
    });
  } catch (error) {
    console.error('Error fetching Shodan data:', error);
    res.status(500).json({ error: 'Error fetching Shodan data' });
  }
});

app.get('/api/greynoise', validateToken, async (req, res) => {
  try {
    const { ip } = z.object({ ip: z.string().ip() }).parse(req.query);
    const response = await axios.get(`https://api.greynoise.io/v3/community/${ip}`, {
      headers: { Accept: 'application/json', key: process.env.GREYNOISE_API_KEY },
    });
    res.json({
      ip,
      noise: response.data.noise || false,
      riot: response.data.riot || false,
      classification: response.data.classification || 'unknown',
      name: response.data.name || '',
      lastSeen: response.data.last_seen || '',
    });
  } catch (error) {
    console.error('Error fetching GreyNoise data:', error);
    res.status(500).json({ error: 'Error fetching GreyNoise data' });
  }
});

app.get('/api/vulners', validateToken, async (req, res) => {
  try {
    const { product } = z.object({ product: z.string().min(1) }).parse(req.query);
    const response = await axios.get('https://vulners.com/api/v3/search/lucene/', {
      params: { query: product, apiKey: process.env.VULNERS_API_KEY },
    });
    if (response.data.result === 'OK') {
      res.json(
        response.data.data.search.map((item: any) => ({
          cveId: item.id,
          severity: item.cvss?.score || 'UNKNOWN',
          description: item.title || '',
          link: item.href || '',
        }))
      );
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching Vulners data:', error);
    res.status(500).json({ error: 'Error fetching Vulners data' });
  }
});

app.get('/api/policies', validateToken, async (req, res) => {
  try {
    const policies = await PolicyModel.find();
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Error fetching policies' });
  }
});

app.get('/api/incidents', validateToken, async (req, res) => {
  try {
    const incidents = await IncidentModel.find();
    res.json(incidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Error fetching incidents' });
  }
});

app.get('/api/reports', validateToken, async (req, res) => {
  try {
    const reports = await ReportModel.find();
    res.json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Error fetching reports' });
  }
});

app.get('/api/threats', validateToken, async (req, res) => {
  try {
    const threats = await ThreatModel.find();
    res.json(threats);
  } catch (error) {
    console.error('Error fetching threats:', error);
    res.status(500).json({ error: 'Error fetching threats' });
  }
});

app.get('/api/summary', validateToken, async (req, res) => {
  try {
    const { timeRange } = z.object({ timeRange: z.string() }).parse(req.query);
    const reports = await ReportModel.find();
    const devices = await DeviceModel.countDocuments();
    const cameras = await CameraModel.countDocuments();
    const summary = {
      monitoredDevices: devices,
      monitoredCameras: cameras,
      totalCves: reports.reduce((sum, r) => sum + r.total_cves, 0),
      criticalCves: reports.reduce((sum, r) => sum + r.critical_cves, 0),
      reports,
    };
    res.json(summary);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Error fetching summary' });
  }
});

app.post('/api/validate-token', async (req, res) => {
  try {
    const { token } = z.object({ token: z.string() }).parse(req.body);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET environment variable is not set');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }
    jwt.verify(token, secret);
    res.json({ valid: true });
  } catch (error) {
    console.error('Token validation error:', error);
    res.json({ valid: false });
  }
});

app.get('/api/investigate', validateToken, async (req, res) => {
  try {
    const { domain } = z.object({ domain: z.string().min(1) }).parse(req.query);
    // Mock implementation
    res.json({ status: 'Safe', categories: ['Business'] });
  } catch (error) {
    console.error('Error investigating domain:', error);
    res.status(500).json({ error: 'Error investigating domain' });
  }
});

// Puerto y arranque del servidor
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});