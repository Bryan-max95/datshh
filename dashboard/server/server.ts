/* src/app/dashboard/server/server.ts */
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { Device, Camera, Report, Vulnerability } from '../../types';

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cyberdash';
const SECRET_KEY = process.env.SECRET_KEY || 'your-secret-key';

app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar a MongoDB:', err));

// Esquemas de MongoDB
const DeviceSchema = new mongoose.Schema({
  name: String,
  ipAddress: String,
  deviceType: String,
  group: String,
});

const CameraSchema = new mongoose.Schema({
  name: String,
  ipAddress: String,
  manufacturer: String,
  model: String,
});

const ReportSchema = new mongoose.Schema({
  equipo_id: String,
  timestamp: String,
  total_cves: Number,
  critical_cves: Number,
});

const VulnerabilitySchema = new mongoose.Schema({
  cve_id: String,
  software_id: String,
  severity: String,
  description: String,
  status: String,
});

const DeviceModel = mongoose.model<Device>('Device', DeviceSchema);
const CameraModel = mongoose.model<Camera>('Camera', CameraSchema);
const ReportModel = mongoose.model<Report>('Report', ReportSchema);
const VulnerabilityModel = mongoose.model<Vulnerability>('Vulnerability', VulnerabilitySchema);

// Middleware para validar JWT
const validateToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    jwt.verify(token, SECRET_KEY);
    next();
  } catch (error) {
    res.status(403).json({ error: 'Token inválido' });
  }
};

// Endpoints
app.get('/api/equipos', validateToken, async (req, res) => {
  try {
    const devices = await DeviceModel.find();
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener dispositivos' });
  }
});

app.post('/api/equipos', validateToken, async (req, res) => {
  try {
    const device = new DeviceModel(req.body);
    await device.save();
    res.json(device);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar dispositivo' });
  }
});

app.delete('/api/equipos', validateToken, async (req, res) => {
  try {
    const { _id } = req.body;
    await DeviceModel.deleteOne({ _id });
    res.json({ message: 'Dispositivo eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar dispositivo' });
  }
});

app.get('/api/cameras', validateToken, async (req, res) => {
  try {
    const cameras = await CameraModel.find();
    res.json(cameras);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cámaras' });
  }
});

app.post('/api/cameras', validateToken, async (req, res) => {
  try {
    const camera = new CameraModel(req.body);
    await camera.save();
    res.json(camera);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar cámara' });
  }
});

app.delete('/api/cameras', validateToken, async (req, res) => {
  try {
    const { _id } = req.body;
    await CameraModel.deleteOne({ _id });
    res.json({ message: 'Cámara eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cámara' });
  }
});

app.get('/api/summary', validateToken, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const devices = await DeviceModel.countDocuments();
    const cameras = await CameraModel.countDocuments();
    const reports = await ReportModel.find({
      timestamp: {
        $gte: new Date(new Date().setDate(new Date().getDate() - parseInt(timeRange as string || '30'))).toISOString(),
      },
    });
    const totalCves = reports.reduce((sum, report) => sum + report.total_cves, 0);
    const criticalCves = reports.reduce((sum, report) => sum + report.critical_cves, 0);

    res.json({
      monitoredDevices: devices,
      monitoredCameras: cameras,
      totalCves,
      criticalCves,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

app.get('/api/vulnerabilities', validateToken, async (req, res) => {
  try {
    const vulnerabilities = await VulnerabilityModel.find();
    res.json(vulnerabilities);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener vulnerabilidades' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});