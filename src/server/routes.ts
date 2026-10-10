import { Router, Request, Response, NextFunction } from 'express';
import { 
  readDB, 
  writeDB, 
  Doctor, 
  Appointment, 
  timeToMinutes, 
  minutesToTime, 
  isOverlapping, 
  getDayOfWeek 
} from './db';
import { 
  generateBearerToken, 
  requireApiKey, 
  requireBasicAuth, 
  requireBearerToken, 
  getActiveTokensList,
  API_KEY_VALUE,
  BASIC_USER,
  BASIC_PASS,
  CLIENT_ID,
  CLIENT_SECRET
} from './auth';

export const apiRouter = Router();

// ==========================================
// DYNAMIC ROUTE AUTH CONFIGURATION MATRIX
// ==========================================
export type AuthMode = 'apikey' | 'basic' | 'bearer' | 'any' | 'none';

export const routeAuthConfig: Record<string, AuthMode> = {
  'GET /api/appointments': 'apikey',
  'GET /api/appointments/:id': 'apikey',
  'POST /api/appointments': 'basic',
  'DELETE /api/appointments/:id': 'basic',
  'PUT /api/appointments/:id/confirm': 'bearer',
  'POST /api/appointments/:id/reschedule': 'bearer',
};

export function dynamicAuth(routeKey: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const mode = routeAuthConfig[routeKey] || 'apikey';
    if (mode === 'none') {
      return next();
    }
    if (mode === 'apikey') {
      return requireApiKey(req, res, next);
    }
    if (mode === 'basic') {
      return requireBasicAuth(req, res, next);
    }
    if (mode === 'bearer') {
      return requireBearerToken(req, res, next);
    }
    if (mode === 'any') {
      // Check API Key
      const apiKey = req.header('X-API-Key') || req.header('x-api-key');
      if (apiKey === API_KEY_VALUE) return next();

      // Check Basic Auth
      const authHeader = req.header('Authorization');
      if (authHeader?.startsWith('Basic ')) {
        const creds = Buffer.from(authHeader.substring(6).trim(), 'base64').toString('ascii');
        const [u, p] = creds.split(':');
        if (u === BASIC_USER && p === BASIC_PASS) return next();
      }

      // Check Bearer Token
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7).trim();
        const active = getActiveTokensList();
        if (active.some(t => t.token === token)) return next();
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Esta rota aceita qualquer método de autenticação (API Key, Basic Auth ou Bearer Token), mas nenhuma credencial válida foi enviada.',
        help: 'Envie um cabeçalho X-API-Key, Authorization: Basic ou Authorization: Bearer válido.'
      });
    }
    next();
  };
}

// ==========================================
// PUBLIC DIAGNOSTIC & MANAGEMENT ROUTES
// ==========================================

// GET all credential values (so the client UI can display them for easy copying)
apiRouter.get('/credentials', (req: Request, res: Response) => {
  res.json({
    apiKey: {
      header: 'X-API-Key',
      value: API_KEY_VALUE
    },
    basicAuth: {
      username: BASIC_USER,
      password: BASIC_PASS,
      exampleHeader: 'Authorization: Basic ' + Buffer.from(`${BASIC_USER}:${BASIC_PASS}`).toString('base64')
    },
    bearerToken: {
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      tokenRoute: '/api/auth/token'
    },
    activeTokens: getActiveTokensList(),
    routeAuthConfig
  });
});

// GET current dynamic auth policy matrix
apiRouter.get('/config/auth', (req: Request, res: Response) => {
  res.json(routeAuthConfig);
});

// POST update auth policy for a specific route
apiRouter.post('/config/auth', (req: Request, res: Response) => {
  const { route, mode } = req.body;
  if (!route || !mode || !['apikey', 'basic', 'bearer', 'any', 'none'].includes(mode)) {
    return res.status(400).json({ 
      error: 'Invalid request', 
      message: 'Informe "route" (ex: "GET /api/appointments") e "mode" ("apikey", "basic", "bearer", "any", "none").' 
    });
  }
  routeAuthConfig[route] = mode;
  res.json({ 
    message: `Autenticação para "${route}" atualizada com sucesso para "${mode}".`, 
    routeAuthConfig 
  });
});

// Reset database to default
apiRouter.post('/db/reset', (req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve(__dirname, '../../agenda.json');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const db = readDB();
    res.json({ message: 'Database reset to default settings successfully.', data: db });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset database', details: error.message });
  }
});

// GET active tokens (for UI dashboard display)
apiRouter.get('/auth/tokens', (req: Request, res: Response) => {
  res.json(getActiveTokensList());
});

// GET doctors
apiRouter.get('/doctors', (req: Request, res: Response) => {
  const db = readDB();
  res.json(db.doctors);
});

// POST register doctor
apiRouter.post('/doctors', (req: Request, res: Response) => {
  const { name, specialty, startTime, endTime, breakTime, breakDuration } = req.body;
  
  if (!name || !specialty || !startTime || !endTime) {
    return res.status(400).json({ error: 'Missing required fields: name, specialty, startTime, endTime' });
  }
  
  const db = readDB();
  
  const id = `dr-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  
  // Check if doctor already exists
  if (db.doctors.some(d => d.id === id)) {
    return res.status(400).json({ error: 'Doctor with this name already exists' });
  }
  
  const newDoctor: Doctor = {
    id,
    name,
    specialty,
    startTime,
    endTime,
    breakTime: breakTime || null,
    breakDuration: breakDuration ? Number(breakDuration) : 0
  };
  
  db.doctors.push(newDoctor);
  
  // Add specialty if it doesn't exist
  if (!db.specialties.includes(specialty)) {
    db.specialties.push(specialty);
  }
  
  writeDB(db);
  res.status(201).json({ message: 'Doctor registered successfully', doctor: newDoctor });
});

// DELETE doctor
apiRouter.delete('/doctors/:id', (req: Request, res: Response) => {
  const db = readDB();
  const doctorId = req.params.id;
  
  const doctorExists = db.doctors.some(d => d.id === doctorId);
  if (!doctorExists) {
    return res.status(404).json({ error: 'Doctor not found' });
  }
  
  db.doctors = db.doctors.filter(d => d.id !== doctorId);
  writeDB(db);
  res.json({ message: 'Doctor removed successfully' });
});

// GET specialties
apiRouter.get('/specialties', (req: Request, res: Response) => {
  const db = readDB();
  res.json(db.specialties);
});

// POST register specialty
apiRouter.post('/specialties', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Specialty name is required' });
  }
  
  const db = readDB();
  if (db.specialties.includes(name)) {
    return res.status(400).json({ error: 'Specialty already exists' });
  }
  
  db.specialties.push(name);
  writeDB(db);
  res.status(201).json({ message: 'Specialty added successfully', specialty: name });
});

// GET exams
apiRouter.get('/exams', (req: Request, res: Response) => {
  const db = readDB();
  res.json(db.exams);
});

// POST register exam
apiRouter.post('/exams', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Exam name is required' });
  }
  
  const db = readDB();
  if (db.exams.includes(name)) {
    return res.status(400).json({ error: 'Exam already exists' });
  }
  
  db.exams.push(name);
  writeDB(db);
  res.status(201).json({ message: 'Exam added successfully', exam: name });
});


// ==========================================
// AUTHENTICATION PRE-REQUEST ROUTE
// ==========================================

// Client Credentials flow for Bearer Token
apiRouter.post('/auth/token', (req: Request, res: Response) => {
  const { client_id, client_secret } = req.body;
  
  if (!client_id || !client_secret) {
    return res.status(400).json({
      error: 'invalid_request',
      message: 'Missing client_id and/or client_secret in request body.'
    });
  }
  
  const tokenData = generateBearerToken(client_id, client_secret);
  
  if (!tokenData) {
    return res.status(401).json({
      error: 'invalid_client',
      message: 'Invalid client credentials.',
      help: `Try client_id: "${CLIENT_ID}" and client_secret: "${CLIENT_SECRET}"`
    });
  }
  
  res.json({
    access_token: tokenData.accessToken,
    expires_in: tokenData.expiresIn,
    token_type: 'Bearer'
  });
});


// ==========================================
// APPOINTMENTS AGENDA ENDPOINTS (AUTHENTICATED)
// ==========================================

// 1. LIST APPOINTMENTS
apiRouter.get('/appointments', dynamicAuth('GET /api/appointments'), (req: Request, res: Response) => {
  const db = readDB();
  const { date, doctorId } = req.query;
  
  let appointments = db.appointments;
  
  if (date) {
    appointments = appointments.filter(a => a.data === date);
  }
  
  if (doctorId) {
    appointments = appointments.filter(a => {
      // Find doctor matching ID or name
      if (!a.doutor) return false;
      const foundDoc = db.doctors.find(d => d.name === a.doutor || d.id === doctorId);
      return foundDoc ? foundDoc.id === doctorId : false;
    });
  }
  
  res.json(appointments);
});

// 2. GET APPOINTMENT BY ID
apiRouter.get('/appointments/:id', dynamicAuth('GET /api/appointments/:id'), (req: Request, res: Response) => {
  const db = readDB();
  const app = db.appointments.find(a => a.id === req.params.id);
  
  if (!app) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  res.json(app);
});

// Helper function to validate availability
function validateAppointmentSlot(
  tipo: 'Consulta' | 'Exame' | 'Retorno',
  date: string,
  startTime: string,
  endTime: string,
  doctorName?: string | null,
  excludeAppointmentId?: string
): { valid: boolean; error?: string } {
  const db = readDB();
  
  // 1. Verify working days (Monday to Saturday)
  const dayOfWeek = getDayOfWeek(date);
  if (dayOfWeek === 0) { // Sunday
    return { valid: false, error: 'A agenda funciona apenas de segunda a sábado. Domingo é fechado.' };
  }
  
  const startMins = timeToMinutes(startTime);
  const endMins = timeToMinutes(endTime);
  
  if (startMins >= endMins) {
    return { valid: false, error: 'A hora inicial deve ser anterior à hora final.' };
  }
  
  // 2. Duration checking
  const duration = endMins - startMins;
  if (tipo === 'Consulta' && duration !== 60) {
    return { valid: false, error: 'Consultas devem durar exatamente 1 hora (60 minutos).' };
  }
  if (tipo === 'Retorno' && duration !== 30) {
    return { valid: false, error: 'Retornos devem durar exatamente 30 minutos.' };
  }
  
  // 3. Category & Doctor Specific Validation
  if (tipo === 'Consulta' || tipo === 'Retorno') {
    if (!doctorName) {
      return { valid: false, error: 'Doutor é obrigatório para Consultas e Retornos.' };
    }
    
    // Find doctor in DB (by name or ID)
    const doctor = db.doctors.find(d => d.name === doctorName || d.id === doctorName);
    if (!doctor) {
      return { valid: false, error: `Médico "${doctorName}" não cadastrado.` };
    }
    
    const docStart = timeToMinutes(doctor.startTime);
    const docEnd = timeToMinutes(doctor.endTime);
    
    // Verify doctor working hours
    if (startMins < docStart || endMins > docEnd) {
      return { 
        valid: false, 
        error: `O horário solicitado (${startTime} - ${endTime}) está fora do expediente de ${doctor.name} (${doctor.startTime} - ${doctor.endTime}).` 
      };
    }
    
    // Verify break times
    if (doctor.breakTime && doctor.breakDuration) {
      const breakStart = timeToMinutes(doctor.breakTime);
      const breakEnd = breakStart + doctor.breakDuration;
      
      // Check overlap with break
      const breakOverlaps = startMins < breakEnd && breakStart < endMins;
      if (breakOverlaps) {
        return { 
          valid: false, 
          error: `O horário solicitado conflita com o intervalo de descanso de ${doctor.name} (das ${doctor.breakTime} às ${minutesToTime(breakEnd)}).` 
        };
      }
    }
    
    // Check doctor schedule conflict (exclude self if editing/rescheduling)
    const hasConflict = db.appointments.some(a => {
      if (a.id === excludeAppointmentId) return false;
      if (a.status === 'cancelado') return false; // Cancelled slots are open for booking!
      if (a.data !== date) return false;
      if (a.doutor !== doctor.name) return false;
      
      return isOverlapping(startTime, endTime, a.horaInicial, a.horaFinal);
    });
    
    if (hasConflict) {
      return { valid: false, error: `Já existe um compromisso agendado para ${doctor.name} neste horário no dia ${date}.` };
    }
    
  } else if (tipo === 'Exame') {
    // Exams are performed between 05:00 and 09:30
    const examStart = timeToMinutes('05:00');
    const examEnd = timeToMinutes('09:30');
    
    if (startMins < examStart || endMins > examEnd) {
      return { valid: false, error: 'Exames só podem ser realizados no período das 05:00 às 09:30.' };
    }
    
    // Let's ensure exam room capacity or simple duplicate patient schedule checks
    // Check if the same patient already has an exam overlapping on this date
    // (Allowing multiple exams for different patients at the same time is standard clinic behavior, but let's check for conflicts if required)
  }
  
  return { valid: true };
}

// 3. CREATE APPOINTMENT
apiRouter.post('/appointments', dynamicAuth('POST /api/appointments'), (req: Request, res: Response) => {
  const { paciente, doutor, especialidade, tipo, data, horaInicial, horaFinal } = req.body;
  
  if (!paciente || !tipo || !data || !horaInicial) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      message: 'Paciente, tipo, data, and horaInicial are mandatory.' 
    });
  }
  
  // Auto-calculate end time if not specified
  let calculatedHoraFinal = horaFinal;
  if (!calculatedHoraFinal) {
    const mins = timeToMinutes(horaInicial);
    if (tipo === 'Consulta') {
      calculatedHoraFinal = minutesToTime(mins + 60);
    } else if (tipo === 'Retorno') {
      calculatedHoraFinal = minutesToTime(mins + 30);
    } else {
      calculatedHoraFinal = minutesToTime(mins + 30); // Default for exams or others
    }
  }
  
  const db = readDB();
  
  // Resolve doctor full name if ID was passed
  let resolvedDoctorName = doutor || null;
  let resolvedSpecialty = especialidade || null;
  
  if (resolvedDoctorName && (tipo === 'Consulta' || tipo === 'Retorno')) {
    const foundDoc = db.doctors.find(d => d.id === resolvedDoctorName || d.name === resolvedDoctorName);
    if (foundDoc) {
      resolvedDoctorName = foundDoc.name;
      resolvedSpecialty = foundDoc.specialty;
    }
  }
  
  // Validate schedule availability
  const validation = validateAppointmentSlot(tipo, data, horaInicial, calculatedHoraFinal, resolvedDoctorName);
  
  if (!validation.valid) {
    return res.status(400).json({ error: 'Scheduling Conflict', message: validation.error });
  }
  
  const id = `app-${Date.now()}`;
  const newAppointment: Appointment = {
    id,
    paciente,
    doutor: resolvedDoctorName,
    especialidade: resolvedSpecialty,
    tipo,
    data,
    horaInicial,
    horaFinal: calculatedHoraFinal,
    status: 'agendado' // Start as scheduled intention
  };
  
  db.appointments.push(newAppointment);
  writeDB(db);
  
  res.status(201).json({ 
    message: 'Compromisso agendado com sucesso!', 
    appointment: newAppointment 
  });
});

// 4. REMOVE APPOINTMENT
apiRouter.delete('/appointments/:id', dynamicAuth('DELETE /api/appointments/:id'), (req: Request, res: Response) => {
  const db = readDB();
  const appointmentId = req.params.id;
  
  const index = db.appointments.findIndex(a => a.id === appointmentId);
  if (index === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  const removed = db.appointments[index];
  db.appointments.splice(index, 1);
  writeDB(db);
  
  res.json({ 
    message: 'Compromisso removido com sucesso!', 
    removedAppointment: removed 
  });
});

// 5. CONFIRM APPOINTMENT
apiRouter.put('/appointments/:id/confirm', dynamicAuth('PUT /api/appointments/:id/confirm'), (req: Request, res: Response) => {
  const db = readDB();
  const appointmentId = req.params.id;
  
  const app = db.appointments.find(a => a.id === appointmentId);
  if (!app) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  if (app.status === 'cancelado') {
    return res.status(400).json({ error: 'Invalido', message: 'Não é possível confirmar um compromisso cancelado.' });
  }
  
  app.status = 'confirmado';
  writeDB(db);
  
  res.json({
    message: 'Compromisso confirmado com sucesso!',
    appointment: app
  });
});

// 6. RESCHEDULE APPOINTMENT
apiRouter.post('/appointments/:id/reschedule', dynamicAuth('POST /api/appointments/:id/reschedule'), (req: Request, res: Response) => {
  const db = readDB();
  const oldAppointmentId = req.params.id;
  const { data, horaInicial, horaFinal } = req.body;
  
  if (!data || !horaInicial) {
    return res.status(400).json({ 
      error: 'Missing required fields', 
      message: 'New data (date) and horaInicial are required for rescheduling.' 
    });
  }
  
  const oldIndex = db.appointments.findIndex(a => a.id === oldAppointmentId);
  if (oldIndex === -1) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  const oldApp = db.appointments[oldIndex];
  
  // Calculate new end time if not specified
  let calculatedHoraFinal = horaFinal;
  if (!calculatedHoraFinal) {
    const mins = timeToMinutes(horaInicial);
    if (oldApp.tipo === 'Consulta') {
      calculatedHoraFinal = minutesToTime(mins + 60);
    } else if (oldApp.tipo === 'Retorno') {
      calculatedHoraFinal = minutesToTime(mins + 30);
    } else {
      calculatedHoraFinal = minutesToTime(mins + 30);
    }
  }
  
  // Validate schedule availability for the NEW slot
  // We exclude the old appointment from conflict checking, because it will be cancelled/replaced anyway!
  const validation = validateAppointmentSlot(
    oldApp.tipo, 
    data, 
    horaInicial, 
    calculatedHoraFinal, 
    oldApp.doutor,
    oldAppointmentId
  );
  
  if (!validation.valid) {
    return res.status(400).json({ error: 'Scheduling Conflict', message: validation.error });
  }
  
  // Status check for rescheduling
  let newStatus: 'confirmado' | 'remarcado';
  
  if (data === oldApp.data) {
    // Same day reschedule: receives status 'confirmado'
    // "Se precisar remarcar para o mesmo dia, recebe status confirmado e o compromisso anterior como cancelado"
    newStatus = 'confirmado';
  } else {
    // Next day or later reschedule: receives status 'remarcado'
    // "Se o compromisso for remarcado para o dia seguinte em diante, recebe status remarcado e o compromisso anterior recebe o status cancelado"
    newStatus = 'remarcado';
  }
  
  // Cancel previous appointment
  oldApp.status = 'cancelado';
  
  // Create new rescheduled appointment
  const newAppId = `app-${Date.now()}`;
  const newAppointment: Appointment = {
    id: newAppId,
    paciente: oldApp.paciente,
    doutor: oldApp.doutor,
    especialidade: oldApp.especialidade,
    tipo: oldApp.tipo,
    data,
    horaInicial,
    horaFinal: calculatedHoraFinal,
    status: newStatus
  };
  
  db.appointments.push(newAppointment);
  writeDB(db);
  
  res.json({
    message: 'Compromisso remarcado com sucesso!',
    previousAppointment: oldApp,
    newAppointment: newAppointment
  });
});
