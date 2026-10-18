import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(process.cwd(), 'agenda.json');

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  breakTime?: string | null; // "HH:MM"
  breakDuration?: number; // minutes
}

export interface Appointment {
  id: string;
  paciente: string;
  doutor?: string | null; // null for Exams
  especialidade?: string | null; // null for Exams
  tipo: 'Consulta' | 'Exame' | 'Retorno';
  data: string; // YYYY-MM-DD
  horaInicial: string; // HH:MM
  horaFinal: string; // HH:MM
  status: 'agendado' | 'confirmado' | 'cancelado' | 'remarcado' | 'livre';
}

export interface DBStructure {
  doctors: Doctor[];
  specialties: string[];
  exams: string[];
  appointments: Appointment[];
  routeAuthConfig?: Record<string, string>;
  tokenTtlSeconds?: number;
}

export function getRelativeDate(offsetDays: number = 0): string {
  const tz = process.env.TZ || 'America/Sao_Paulo';
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(now);
    const y = parseInt(parts.find(p => p.type === 'year')?.value || `${now.getFullYear()}`, 10);
    const m = parseInt(parts.find(p => p.type === 'month')?.value || `${now.getMonth() + 1}`, 10);
    const day = parseInt(parts.find(p => p.type === 'day')?.value || `${now.getDate()}`, 10);
    const targetDate = new Date(Date.UTC(y, m - 1, day + offsetDays));
    return targetDate.toISOString().slice(0, 10);
  } catch {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export function generateDefaultDB(): DBStructure {
  const todayStr = getRelativeDate(0);
  const tomorrowStr = getRelativeDate(1);

  const doctors: Doctor[] = [
    {
      id: "dr-marcos",
      name: "Dr. Marcos Paulo",
      specialty: "Pediatria",
      startTime: "08:00",
      endTime: "14:00",
      breakTime: null,
      breakDuration: 0
    },
    {
      id: "dra-elena",
      name: "Dra. Elena Souza",
      specialty: "Obstetrícia",
      startTime: "14:00",
      endTime: "20:00",
      breakTime: null,
      breakDuration: 0
    },
    {
      id: "dra-vanessa",
      name: "Dr. Vanessa",
      specialty: "Clínica Geral",
      startTime: "10:00",
      endTime: "16:00",
      breakTime: "12:40",
      breakDuration: 20
    }
  ];

  const initialAppointments: Appointment[] = [
    // Today
    {
      id: "app-1",
      paciente: "Bernardo Silva",
      doutor: "Dr. Marcos Paulo",
      especialidade: "Pediatria",
      tipo: "Consulta",
      data: todayStr,
      horaInicial: "09:00",
      horaFinal: "10:00",
      status: "agendado"
    },
    {
      id: "app-2",
      paciente: "Mariana Lins",
      doutor: "Dra. Elena Souza",
      especialidade: "Obstetrícia",
      tipo: "Consulta",
      data: todayStr,
      horaInicial: "15:00",
      horaFinal: "16:00",
      status: "confirmado"
    },
    {
      id: "app-4",
      paciente: "Carla Albuquerque",
      doutor: null,
      especialidade: null,
      tipo: "Exame",
      data: todayStr,
      horaInicial: "07:30",
      horaFinal: "08:00",
      status: "confirmado"
    },
    // Tomorrow
    {
      id: "app-3",
      paciente: "Arthur Ramos",
      doutor: "Dr. Vanessa",
      especialidade: "Clínica Geral",
      tipo: "Retorno",
      data: tomorrowStr,
      horaInicial: "10:30",
      horaFinal: "11:00",
      status: "agendado"
    },
    {
      id: "app-5",
      paciente: "Beatriz Oliveira",
      doutor: "Dr. Marcos Paulo",
      especialidade: "Pediatria",
      tipo: "Consulta",
      data: tomorrowStr,
      horaInicial: "11:00",
      horaFinal: "12:00",
      status: "agendado"
    },
    {
      id: "app-6",
      paciente: "Daniel Costa",
      doutor: "Dra. Elena Souza",
      especialidade: "Obstetrícia",
      tipo: "Consulta",
      data: tomorrowStr,
      horaInicial: "16:30",
      horaFinal: "17:30",
      status: "agendado"
    },
    {
      id: "app-7",
      paciente: "Fernanda Lima",
      doutor: "Dr. Vanessa",
      especialidade: "Clínica Geral",
      tipo: "Exame",
      data: tomorrowStr,
      horaInicial: "14:00",
      horaFinal: "14:30",
      status: "confirmado"
    }
  ];

  // Generate free slots
  const allAppointments = [...initialAppointments];
  [todayStr, tomorrowStr].forEach(date => {
    doctors.forEach(doctor => {
      const booked = allAppointments.filter(a => a.data === date && a.doutor === doctor.name);
      const freeSlots = generateFreeSlots(doctor, date, booked);
      allAppointments.push(...freeSlots);
    });
  });

  return {
    doctors: doctors,
    specialties: [
      "Pediatria",
      "Obstetrícia",
      "Clínica Geral"
    ],
    exams: [
      "Hemograma",
      "Ultrassonografia",
      "Raio-X",
      "Urina Completa",
      "Eletrocardiograma"
    ],
    appointments: allAppointments
  };
}

export const DEFAULT_DB: DBStructure = generateDefaultDB();

// Ensure DB file exists and contains appointments matching the current date
export function initDB(forceRefresh: boolean = false): DBStructure {
  try {
    const todayStr = getRelativeDate(0);
    const tomorrowStr = getRelativeDate(1);

    if (!fs.existsSync(DB_PATH) || forceRefresh) {
      const defaultDb = generateDefaultDB();
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
      return defaultDb;
    }

    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const data: DBStructure = JSON.parse(content);

    // If appointments is missing, empty, or contains appointments for dates other than today or tomorrow:
    const allAppointmentsValid = Array.isArray(data.appointments) &&
      data.appointments.length > 0 &&
      data.appointments.every(a => a.data === todayStr || a.data === tomorrowStr);

    if (!allAppointmentsValid) {
      console.log(`[DB] Atualizando agenda inicial com base na data de hoje (${todayStr}) e amanhã (${tomorrowStr})...`);
      const freshDb = generateDefaultDB();
      // Retain custom routeAuthConfig and tokenTtlSeconds if configured
      if (data.routeAuthConfig) freshDb.routeAuthConfig = data.routeAuthConfig;
      if (data.tokenTtlSeconds) freshDb.tokenTtlSeconds = data.tokenTtlSeconds;
      fs.writeFileSync(DB_PATH, JSON.stringify(freshDb, null, 2), 'utf-8');
      return freshDb;
    }

    return data;
  } catch (err) {
    console.error(`[DB] Error reading/initializing DB file at ${DB_PATH}:`, err);
    const defaultDb = generateDefaultDB();
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
}

export function readDB(): DBStructure {
  return initDB();
}

export function writeDB(data: DBStructure): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[DB] Data written successfully to ${DB_PATH}`);
  } catch (err) {
    console.error(`[DB] Failed to write to ${DB_PATH}:`, err);
    throw err;
  }
}

// Convert "HH:MM" to minutes from 00:00
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// Check if [start1, end1] overlaps with [start2, end2]
export function isOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && s2 < e1;
}

// Returns 0 (Sunday) to 6 (Saturday) in UTC or Local
// Let's parse strictly YYYY-MM-DD
export function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  // Create date in local timezone context to get accurate day of the week
  const date = new Date(year, month - 1, day);
  return date.getDay();
}

export function generateFreeSlots(doctor: Doctor, dateStr: string, bookedAppointments: Appointment[]): Appointment[] {
  const slots: Appointment[] = [];
  const startMins = timeToMinutes(doctor.startTime);
  const endMins = timeToMinutes(doctor.endTime);
  const slotDuration = 30; // 30 mins

  for (let m = startMins; m + slotDuration <= endMins; m += slotDuration) {
    const start = minutesToTime(m);
    const end = minutesToTime(m + slotDuration);

    // Skip if break time overlaps
    if (doctor.breakTime && doctor.breakDuration) {
      const breakStart = timeToMinutes(doctor.breakTime);
      const breakEnd = breakStart + doctor.breakDuration;
      if (isOverlapping(start, end, minutesToTime(breakStart), minutesToTime(breakEnd))) {
        continue;
      }
    }

    const isBooked = bookedAppointments.some(a => isOverlapping(start, end, a.horaInicial, a.horaFinal));

    if (!isBooked) {
      slots.push({
        id: `slot-${doctor.id}-${dateStr}-${start.replace(':', '')}`,
        paciente: 'Vago',
        doutor: doctor.name,
        tipo: 'Consulta',
        data: dateStr,
        horaInicial: start,
        horaFinal: end,
        status: 'livre'
      });
    }
  }
  return slots;
}
