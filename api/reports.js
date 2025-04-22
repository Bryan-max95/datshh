import { MongoClient } from 'mongodb';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('cve_monitor');
    const report = req.body;

    // 1. Actualizar o insertar información del equipo
    await db.collection('equipos').updateOne(
      { equipo_id: report.system.equipo_id },
      { 
        $set: { 
          hostname: report.system.hostname,
          ip: report.system.ip,
          os: report.system.os,
          os_version: report.system.os_version,
          last_seen: new Date(),
          active: true
        } 
      },
      { upsert: true }
    );

    // 2. Obtener ID del equipo
    const equipo = await db.collection('equipos').findOne(
      { equipo_id: report.system.equipo_id }
    );

    // 3. Registrar software encontrado
    for (const software of report.software) {
      await db.collection('software').updateOne(
        { 
          equipo_id: equipo._id,
          name: software.name,
          version: software.version
        },
        {
          $set: {
            install_date: software.install_date ? new Date(software.install_date) : null,
            vendor: software.vendor,
            last_checked: new Date()
          }
        },
        { upsert: true }
      );
    }

    // 4. Registrar vulnerabilidades
    const softwareRecords = await db.collection('software')
      .find({ equipo_id: equipo._id })
      .toArray();

    for (const vuln of report.vulnerabilities) {
      const software = softwareRecords.find(s => 
        s.name === vuln.software && s.version === vuln.version
      );
      if (software) {
        await db.collection('vulnerabilidades').updateOne(
          { 
            software_id: software._id,
            cve_id: vuln.cve_id
          },
          {
            $set: {
              severity: vuln.severity,
              description: vuln.description,
              last_modified: new Date(),
              status: 'pending'
            }
          },
          { upsert: true }
        );
      }
    }

    // 5. Crear registro de reporte
    await db.collection('reportes').insertOne({
      equipo_id: equipo._id,
      timestamp: new Date(),
      total_cves: report.summary.total_cves,
      critical_cves: report.summary.critical_cves,
      software_checked: report.summary.total_software
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await client.close();
  }
}