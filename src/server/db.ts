import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../../agenda.json');

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
}

const DEFAULT_DB: DBStructure = {
  doctors: [
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
  ],
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
  appointments: [
    {
      id: "app-1",
      paciente: "Bernardo Silva",
      doutor: "Dr. Marcos Paulo",
      especialidade: "Pediatria",
      tipo: "Consulta",
      data: "2026-10-12", // Next Monday
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
      data: "2026-10-12",
      horaInicial: "15:00",
      horaFinal: "16:00",
      status: "confirmado"
    },
    {
      id: "app-3",
      paciente: "Arthur Ramos",
      doutor: "Dr. Vanessa",
      especialidade: "Clínica Geral",
      tipo: "Retorno",
      data: "2026-10-13", // Next Tuesday
      horaInicial: "10:30",
      horaFinal: "11:00",
      status: "agendado"
    },
    {
      id: "app-4",
      paciente: "Carla Albuquerque",
      doutor: null,
      especialidade: null,
      tipo: "Exame",
      data: "2026-10-12",
      horaInicial: "07:30",
      horaFinal: "08:00",
      status: "confirmado"
    }
  ]
};

// Ensure DB file exists
export function initDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
      return DEFAULT_DB;
    }
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading DB file, resetting:", err);
    fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return DEFAULT_DB;
  }
}

export function readDB(): DBStructure {
  return initDB();
}

export function writeDB(data: DBStructure): void {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
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
