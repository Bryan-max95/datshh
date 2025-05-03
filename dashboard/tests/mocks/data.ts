/* tests/mocks/data.ts */
export const mockCameras = [
    {
      _id: '1',
      ipAddress: '192.168.1.100',
      name: 'Camera 1',
      manufacturer: 'Hikvision',
      model: 'DS-2CD2143G0-I',
      ports: [80, 554],
      lastScanned: '2023-10-01T12:00:00Z',
      vulnerabilities: [{ cveId: 'CVE-2021-1234', severity: 'High', description: 'Test CVE' }],
    },
    {
      _id: '2',
      ipAddress: '192.168.1.101',
      name: 'Camera 2',
      manufacturer: 'Dahua',
      model: 'IPC-HDW1230T1-S5',
      ports: [80],
      lastScanned: '2023-10-01T12:00:00Z',
      vulnerabilities: [],
    },
  ];