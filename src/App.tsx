import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Clock, 
  Lock, 
  Shield, 
  Activity, 
  FileCode, 
  Trash2, 
  Plus, 
  RefreshCw, 
  CheckCircle2, 
  CalendarClock, 
  Info, 
  Terminal, 
  ArrowRight, 
  Database, 
  Check, 
  X, 
  Clipboard, 
  Stethoscope, 
  FlaskConical, 
  BookOpen, 
  ChevronRight,
  AlertTriangle,
  Server
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  startTime: string;
  endTime: string;
  breakTime?: string | null;
  breakDuration?: number;
}

interface Appointment {
  id: string;
  paciente: string;
  doutor?: string | null;
  especialidade?: string | null;
  tipo: 'Consulta' | 'Exame' | 'Retorno';
  data: string;
  horaInicial: string;
  horaFinal: string;
  status: 'agendado' | 'confirmado' | 'cancelado' | 'remarcado' | 'livre';
}

interface Credentials {
  apiKey: { header: string; value: string };
  basicAuth: { username: string; password: string; exampleHeader: string };
  bearerToken: { clientId: string; clientSecret: string; tokenRoute: string };
  activeTokens: { token: string; timeLeftSeconds: number }[];
  routeAuthConfig?: Record<string, string>;
  tokenTtlSeconds?: number;
}

export function getRelativeDateStr(offsetDays: number = 0): string {
  const now = new Date();
  now.setDate(now.getDate() + offsetDays);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatShortDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export interface RouteObjective {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  pathTemplate: string;
  routeKey: string;
  defaultBody?: string;
  requiresId?: boolean;
  expectsBody?: boolean;
}

export const ROUTE_OBJECTIVES: RouteObjective[] = [
  {
    id: 'list_appointments',
    name: 'Listar todos os agendamentos',
    description: 'Retorna a lista de compromissos cadastrados na agenda',
    method: 'GET',
    pathTemplate: '/api/appointments',
    routeKey: 'GET /api/appointments',
    expectsBody: false
  },
  {
    id: 'get_appointment',
    name: 'Consultar agendamento por ID',
    description: 'Busca os detalhes de um compromisso específico',
    method: 'GET',
    pathTemplate: '/api/appointments/:id',
    routeKey: 'GET /api/appointments/:id',
    requiresId: true,
    expectsBody: false
  },
  {
    id: 'create_appointment',
    name: 'Criar novo agendamento',
    description: 'Registra uma nova Consulta, Exame ou Retorno',
    method: 'POST',
    pathTemplate: '/api/appointments',
    routeKey: 'POST /api/appointments',
    expectsBody: true,
    defaultBody: `{\n  "paciente": "Gisela Neves",\n  "tipo": "Consulta",\n  "doutor": "Dr. Marcos Paulo",\n  "data": "${getRelativeDateStr(0)}",\n  "horaInicial": "11:00"\n}`
  },
  {
    id: 'confirm_appointment',
    name: 'Confirmar agendamento (Presença)',
    description: 'Muda o status do compromisso de agendado para confirmado',
    method: 'PUT',
    pathTemplate: '/api/appointments/:id/confirm',
    routeKey: 'PUT /api/appointments/:id/confirm',
    requiresId: true,
    expectsBody: false
  },
  {
    id: 'reschedule_appointment',
    name: 'Remarcar agendamento',
    description: 'Remarca para mesma data (confirmado) ou data futura (remarcado)',
    method: 'POST',
    pathTemplate: '/api/appointments/:id/reschedule',
    routeKey: 'POST /api/appointments/:id/reschedule',
    requiresId: true,
    expectsBody: true,
    defaultBody: `{\n  "data": "${getRelativeDateStr(1)}",\n  "horaInicial": "10:00"\n}`
  },
  {
    id: 'delete_appointment',
    name: 'Remover agendamento',
    description: 'Exclui o registro da agenda abrindo o horário para marcação',
    method: 'DELETE',
    pathTemplate: '/api/appointments/:id',
    routeKey: 'DELETE /api/appointments/:id',
    requiresId: true,
    expectsBody: false
  },
  {
    id: 'get_token',
    name: 'Solicitar Bearer Token (OAuth Pre-request)',
    description: 'Emite token temporário configurável usando client credentials',
    method: 'POST',
    pathTemplate: '/api/auth/token',
    routeKey: 'POST /api/auth/token',
    expectsBody: true,
    defaultBody: '{\n  "client_id": "llm_client_id",\n  "client_secret": "llm_client_secret"\n}'
  },
  {
    id: 'list_doctors',
    name: 'Listar médicos cadastrados',
    description: 'Retorna a lista de médicos, especialidades e expedientes',
    method: 'GET',
    pathTemplate: '/api/doctors',
    routeKey: 'GET /api/doctors',
    expectsBody: false
  },
  {
    id: 'list_specialties',
    name: 'Listar especialidades médicas',
    description: 'Consulta as especialidades ativas no sistema',
    method: 'GET',
    pathTemplate: '/api/specialties',
    routeKey: 'GET /api/specialties',
    expectsBody: false
  },
  {
    id: 'list_exams',
    name: 'Listar exames clínicos',
    description: 'Consulta os exames laboratoriais disponíveis',
    method: 'GET',
    pathTemplate: '/api/exams',
    routeKey: 'GET /api/exams',
    expectsBody: false
  }
];

export default function App() {
  // State variables
  const [activeTab, setActiveTab] = useState<'agenda' | 'painel' | 'playground' | 'database'>('agenda');
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [exams, setExams] = useState<string[]>([]);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [routeAuthConfig, setRouteAuthConfig] = useState<Record<string, string>>({
    'GET /api/appointments': 'apikey',
    'GET /api/appointments/:id': 'apikey',
    'POST /api/appointments': 'basic',
    'DELETE /api/appointments/:id': 'basic',
    'PUT /api/appointments/:id/confirm': 'bearer',
    'POST /api/appointments/:id/reschedule': 'bearer',
  });
  const [dbRaw, setDbRaw] = useState<any>(null);
  
  // Selection states
  const [selectedDate, setSelectedDate] = useState<string>(() => getRelativeDateStr(0));
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states - Appointments
  const [newAppPaciente, setNewAppPaciente] = useState('');
  const [newAppTipo, setNewAppTipo] = useState<'Consulta' | 'Exame' | 'Retorno'>('Consulta');
  const [newAppDoctor, setNewAppDoctor] = useState('');
  const [newAppDate, setNewAppDate] = useState<string>(() => getRelativeDateStr(0));
  const [newAppHora, setNewAppHora] = useState('09:00');
  
  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(() => getRelativeDateStr(1));
  const [rescheduleHora, setRescheduleHora] = useState('09:00');

  // Form states - Doctors
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpecialty, setNewDocSpecialty] = useState('');
  const [newDocStart, setNewDocStart] = useState('08:00');
  const [newDocEnd, setNewDocEnd] = useState('16:00');
  const [newDocBreak, setNewDocBreak] = useState('');
  const [newDocBreakDur, setNewDocBreakDur] = useState('20');
  const [hasBreak, setHasBreak] = useState(false);

  // Form states - Specialties & Exams
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newExamName, setNewExamName] = useState('');

  // API Playground State
  const [pgEndpoint, setPgEndpoint] = useState<string>('/api/appointments');
  const [pgMethod, setPgMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [pgAuthType, setPgAuthType] = useState<'none' | 'apikey' | 'basic' | 'bearer'>('apikey');
  const [pgAuthCreds, setPgAuthCreds] = useState<'valid' | 'invalid' | 'none'>('valid');
  const [pgBody, setPgBody] = useState<string>('');
  const [pgResponse, setPgResponse] = useState<string>('// Clique em "Enviar Requisição" para testar a API.');
  const [pgResponseStatus, setPgResponseStatus] = useState<number | null>(null);
  const [pgCurl, setPgCurl] = useState<string>('');
  
  // External Public URL configured on Render
  const [apiHostUrl, setApiHostUrl] = useState<string>('https://api-agenda-bl43.onrender.com');
  const [curlHostMode, setCurlHostMode] = useState<'render' | 'local'>('render');
  const [simulatorTarget, setSimulatorTarget] = useState<'local' | 'render'>('local');
  
  // Objective-based route selector state
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string>('list_appointments');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('app-1');
  
  // Custom client ID and secret for custom bearer requests in playground
  const [pgClientId, setPgClientId] = useState('llm_client_id');
  const [pgClientSecret, setPgClientSecret] = useState('llm_client_secret');

  // Token TTL (validity duration) in seconds - Default: 30 minutes (1800s)
  const [tokenTtl, setTokenTtl] = useState<number>(1800);

  // Helper to format TTL seconds to human-readable label
  const formatTtlLabel = (seconds: number) => {
    if (seconds === 60) return '1 min';
    if (seconds === 300) return '5 min';
    if (seconds === 600) return '10 min';
    if (seconds === 1800) return '30 min (Padrão)';
    if (seconds === 86400) return '24h';
    return `${seconds}s`;
  };

  // Update token TTL in the backend and sync
  const handleUpdateTokenTtl = async (newTtl: number) => {
    setTokenTtl(newTtl);
    try {
      const res = await fetch('/api/config/token-ttl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ttlSeconds: newTtl })
      });
      if (res.ok) {
        showBanner("success", `Validade dos novos Bearer Tokens configurada para ${formatTtlLabel(newTtl)}.`);

        // Background sync to Render cloud if configured
        if (apiHostUrl && apiHostUrl.startsWith('http')) {
          fetch(`${apiHostUrl.replace(/\/+$/, '')}/api/config/token-ttl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ttlSeconds: newTtl })
          }).catch(() => {});
        }

        fetchData();
      }
    } catch (err: any) {
      console.error('Falha ao atualizar TTL do token:', err);
    }
  };

  // Load baseline data
  const fetchData = async () => {
    setLoading(true);
    try {
      // Load doctors
      const docRes = await fetch('/api/doctors');
      const docData = await docRes.json();
      setDoctors(docData);
      if (docData.length > 0 && !newAppDoctor) {
        setNewAppDoctor(docData[0].name);
      }

      // Load specialties
      const specRes = await fetch('/api/specialties');
      const specData = await specRes.json();
      setSpecialties(specData);

      // Load exams
      const examRes = await fetch('/api/exams');
      const examData = await examRes.json();
      setExams(examData);

      // Load credentials
      const credRes = await fetch('/api/credentials');
      const credData = await credRes.json();
      setCredentials(credData);
      if (credData.routeAuthConfig) {
        setRouteAuthConfig(credData.routeAuthConfig);
      }
      if (credData.tokenTtlSeconds) {
        setTokenTtl(credData.tokenTtlSeconds);
      }

      // Load appointments with internal admin header so background UI never fails regardless of test policies
      const appRes = await fetch('/api/appointments', {
        headers: { 'X-App-Admin': 'agenda_admin_internal' }
      });
      if (appRes.ok) {
        const appData = await appRes.json();
        setAppointments(appData);
      }

      // Fetch live DB State
      setDbRaw({
        doctors: docData,
        specialties: specData,
        exams: examData,
        appointments: await (await fetch('/api/appointments', { headers: { 'X-App-Admin': 'agenda_admin_internal' } })).json()
      });

    } catch (err) {
      console.error("Erro ao buscar dados do servidor:", err);
      showBanner("error", "Não foi possível sincronizar com a API. Verifique se o servidor está rodando.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRouteAuth = async (route: string, mode: string) => {
    try {
      const res = await fetch('/api/config/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route, mode })
      });
      const data = await res.json();
      if (res.ok) {
        setRouteAuthConfig(prev => ({ ...prev, [route]: mode }));
        showBanner("success", `Política da rota "${route}" configurada como "${mode.toUpperCase()}".`);

        // Also attempt background sync with external host (Render)
        if (apiHostUrl && apiHostUrl.startsWith('http')) {
          fetch(`${apiHostUrl.replace(/\/+$/, '')}/api/config/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ route, mode })
          }).catch(() => {});
        }

        // Automatically marry the simulator auth method to match the newly configured policy for this route
        const currentObj = ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId);
        if (currentObj && currentObj.routeKey === route) {
          if (mode === 'any') {
            setPgAuthType('apikey');
          } else {
            setPgAuthType(mode as any);
          }
        }
      } else {
        showBanner("error", data.message || "Erro ao atualizar rota.");
      }
    } catch (err: any) {
      showBanner("error", "Erro ao conectar com o servidor para atualizar política.");
    }
  };

  const handleApplyPreset = async (preset: 'default' | 'all_any' | 'all_apikey' | 'all_bearer' | 'all_basic') => {
    const routes = [
      'GET /api/appointments',
      'GET /api/appointments/:id',
      'POST /api/appointments',
      'DELETE /api/appointments/:id',
      'PUT /api/appointments/:id/confirm',
      'POST /api/appointments/:id/reschedule'
    ];
    const newConfigs: Record<string, string> = {};
    if (preset === 'default') {
      newConfigs['GET /api/appointments'] = 'apikey';
      newConfigs['GET /api/appointments/:id'] = 'apikey';
      newConfigs['POST /api/appointments'] = 'basic';
      newConfigs['DELETE /api/appointments/:id'] = 'basic';
      newConfigs['PUT /api/appointments/:id/confirm'] = 'bearer';
      newConfigs['POST /api/appointments/:id/reschedule'] = 'bearer';
    } else {
      const targetMode = preset === 'all_any' ? 'any' : preset === 'all_apikey' ? 'apikey' : preset === 'all_bearer' ? 'bearer' : 'basic';
      routes.forEach(r => { newConfigs[r] = targetMode; });
    }

    try {
      const res = await fetch('/api/config/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: newConfigs })
      });
      if (res.ok) {
        setRouteAuthConfig(prev => ({ ...prev, ...newConfigs }));
        showBanner("success", `Preset de autenticação aplicado e salvo no servidor!`);

        // Also sync to Render
        if (apiHostUrl && apiHostUrl.startsWith('http')) {
          fetch(`${apiHostUrl.replace(/\/+$/, '')}/api/config/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ configs: newConfigs })
          }).catch(() => {});
        }

        // Auto-update pgAuthType for currently selected objective
        const currentObj = ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId);
        if (currentObj && newConfigs[currentObj.routeKey]) {
          const targetMode = newConfigs[currentObj.routeKey];
          setPgAuthType(targetMode === 'any' ? 'apikey' : targetMode as any);
        }
      } else {
        showBanner("error", "Erro ao salvar preset no servidor.");
      }
    } catch {
      showBanner("error", "Erro ao aplicar preset de autenticação.");
    }
  };

  const handleSelectObjective = (objId: string, customAppId?: string) => {
    setSelectedObjectiveId(objId);
    const obj = ROUTE_OBJECTIVES.find(o => o.id === objId);
    if (!obj) return;

    setPgMethod(obj.method);
    const targetId = customAppId || selectedAppointmentId || appointments[0]?.id || 'app-1';
    const resolvedEndpoint = obj.pathTemplate.replace(':id', targetId);
    setPgEndpoint(resolvedEndpoint);

    // Limpar resposta anterior e status para não haver confusão com testes prévios
    setPgResponse('// Clique em "Enviar Requisição REST" para testar a rota.');
    setPgResponseStatus(null);

    // Configurar o corpo (body) de acordo com a exigência da rota, limpando completamente se não exigir
    if (obj.expectsBody && obj.defaultBody) {
      let bodyContent = obj.defaultBody;
      if (obj.id === 'create_appointment') {
        bodyContent = `{\n  "paciente": "Gisela Neves",\n  "tipo": "Consulta",\n  "doutor": "Dr. Marcos Paulo",\n  "data": "${getRelativeDateStr(0)}",\n  "horaInicial": "11:00"\n}`;
      } else if (obj.id === 'reschedule_appointment') {
        bodyContent = `{\n  "data": "${getRelativeDateStr(1)}",\n  "horaInicial": "10:00"\n}`;
      }
      setPgBody(bodyContent);
    } else {
      setPgBody('');
    }

    // Auto-select auth based on current policy in routeAuthConfig so they always marry by default
    const currentRequiredAuth = routeAuthConfig[obj.routeKey];
    if (currentRequiredAuth && currentRequiredAuth !== 'any') {
      setPgAuthType(currentRequiredAuth as any);
    } else if (currentRequiredAuth === 'any') {
      setPgAuthType('apikey');
    } else if (obj.id === 'get_token' || obj.id.startsWith('list_doc') || obj.id.startsWith('list_spec') || obj.id.startsWith('list_exam')) {
      setPgAuthType('none');
    }
    setPgAuthCreds('valid');
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Periodic live countdown for active tokens so user can watch expiry in real time
  useEffect(() => {
    const timer = setInterval(() => {
      setCredentials(prev => {
        if (!prev || !prev.activeTokens || prev.activeTokens.length === 0) return prev;
        const updated = prev.activeTokens
          .map(t => ({ ...t, timeLeftSeconds: Math.max(0, t.timeLeftSeconds - 1) }))
          .filter(t => t.timeLeftSeconds > 0);
        return { ...prev, activeTokens: updated };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update playground curl preview whenever options change
  useEffect(() => {
    generateCurl();
  }, [pgEndpoint, pgMethod, pgAuthType, pgAuthCreds, pgBody, pgClientId, pgClientSecret, apiHostUrl, curlHostMode, selectedObjectiveId]);

  const showBanner = (type: 'success' | 'error', msg: string) => {
    if (type === 'success') {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 5000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 7000);
    }
  };

  // Helper to generate curl preview
  const generateCurl = () => {
    const baseUrl = curlHostMode === 'render' 
      ? apiHostUrl.replace(/\/+$/, '') 
      : 'http://localhost:3000';
    let curl = `curl -X ${pgMethod} "${baseUrl}${pgEndpoint}"`;
    
    // Auth headers
    if (pgAuthType === 'apikey') {
      const val = pgAuthCreds === 'valid' ? 'agenda_secret_apikey_2026' : 'wrong_apikey';
      if (pgAuthCreds !== 'none') {
        curl += ` \\\n  -H "X-API-Key: ${val}"`;
      }
    } else if (pgAuthType === 'basic') {
      const creds = pgAuthCreds === 'valid' ? 'admin:super_secret_password' : 'admin:wrong_password';
      if (pgAuthCreds !== 'none') {
        curl += ` \\\n  -H "Authorization: Basic ${btoa(creds)}"`;
      }
    } else if (pgAuthType === 'bearer') {
      const tok = pgAuthCreds === 'valid' 
        ? (credentials?.activeTokens?.[0]?.token || 'bearer_token_valido_ou_gerado') 
        : 'bearer_expired_or_invalid_token';
      if (pgAuthCreds !== 'none') {
        curl += ` \\\n  -H "Authorization: Bearer ${tok}"`;
      }
    }
    
    // Anexa corpo JSON apenas se o objetivo realmente esperar body e houver conteúdo
    const currentObj = ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId);
    const hasValidBody = Boolean(currentObj?.expectsBody && pgBody && pgBody.trim().length > 0);
    if (hasValidBody) {
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${pgBody.replace(/'/g, "'\\''")}'`;
    }
    
    setPgCurl(curl);
  };

  // Execute playground API request
  const handlePlaygroundSubmit = async () => {
    setPgResponse('Executando requisição REST...');
    setPgResponseStatus(null);
    
    const headers: Record<string, string> = {};
    
    const currentObj = ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId);
    const hasValidBody = Boolean(currentObj?.expectsBody && pgBody && pgBody.trim().length > 0);

    if (hasValidBody) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (pgAuthType === 'apikey') {
      if (pgAuthCreds === 'valid') {
        headers['X-API-Key'] = 'agenda_secret_apikey_2026';
      } else if (pgAuthCreds === 'invalid') {
        headers['X-API-Key'] = 'invalid_api_key_test';
      }
    } else if (pgAuthType === 'basic') {
      if (pgAuthCreds === 'valid') {
        headers['Authorization'] = 'Basic ' + btoa('admin:super_secret_password');
      } else if (pgAuthCreds === 'invalid') {
        headers['Authorization'] = 'Basic ' + btoa('admin:wrong_password');
      }
    } else if (pgAuthType === 'bearer') {
      if (pgAuthCreds === 'valid') {
        const token = credentials?.activeTokens?.[0]?.token || 'no_active_token';
        headers['Authorization'] = `Bearer ${token}`;
      } else if (pgAuthCreds === 'invalid') {
        headers['Authorization'] = 'Bearer invalid_or_expired_token';
      }
    }

    try {
      const options: RequestInit = {
        method: pgMethod,
        headers
      };

      if (hasValidBody) {
        options.body = pgBody;
      }

      const targetBase = simulatorTarget === 'render' ? apiHostUrl.replace(/\/+$/, '') : '';
      const targetFullUrl = `${targetBase}${pgEndpoint}`;

      const res = await fetch(targetFullUrl, options);
      setPgResponseStatus(res.status);
      const json = await res.json();
      setPgResponse(JSON.stringify(json, null, 2));
      
      if (simulatorTarget === 'local') {
        fetchData();
      }
    } catch (err: any) {
      const currentHost = simulatorTarget === 'render' ? apiHostUrl : 'http://localhost:3000';
      setPgResponse(`Erro ao executar requisição contra ${currentHost}:\n${err.message}\n\n(Dica: se estiver testando contra o Render em nuvem e a instância estiver em hibernação, o cold start leva ~50s. Alterne o alvo da simulação para "💻 Preview Local" para testar com 0ms e resposta determinística).`);
    }
  };

  const handleRequestToken = async () => {
    setPgResponse('Solicitando token...');
    setPgResponseStatus(null);
    try {
      const res = await fetch('/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: pgClientId,
          client_secret: pgClientSecret
        })
      });
      setPgResponseStatus(res.status);
      const data = await res.json();
      setPgResponse(JSON.stringify(data, null, 2));
      
      if (res.ok) {
        showBanner("success", `Novo Bearer Token obtido com sucesso! Válido por ${formatTtlLabel(data.expires_in || tokenTtl)}.`);
        setPgAuthType('bearer');
        setPgAuthCreds('valid');
      }
      fetchData();
    } catch (err: any) {
      setPgResponse(`Erro ao obter token:\n${err.message}`);
    }
  };

  const handleResetDB = async () => {
    if (!window.confirm("Deseja realmente resetar a base de dados para os valores originais de teste?")) return;
    setLoading(true);
    try {
      const res = await fetch('/api/db/reset', { method: 'POST' });
      if (res.ok) {
        showBanner("success", "Banco de dados resetado com sucesso para as configurações padrão.");
        fetchData();
      } else {
        showBanner("error", "Erro ao resetar o banco de dados.");
      }
    } catch (err: any) {
      showBanner("error", "Falha de rede ao tentar resetar.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppPaciente) {
      showBanner("error", "Por favor, digite o nome do paciente.");
      return;
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa('admin:super_secret_password')
        },
        body: JSON.stringify({
          paciente: newAppPaciente,
          tipo: newAppTipo,
          doutor: newAppTipo === 'Exame' ? null : newAppDoctor,
          data: newAppDate,
          horaInicial: newAppHora
        })
      });

      const data = await res.json();
      if (res.ok) {
        showBanner("success", "Compromisso cadastrado com sucesso!");
        setNewAppPaciente('');
        fetchData();
      } else {
        showBanner("error", data.message || data.error || "Erro ao agendar compromisso.");
      }
    } catch (err) {
      showBanner("error", "Erro ao conectar com o servidor.");
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este compromisso?")) return;
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Basic ' + btoa('admin:super_secret_password')
        }
      });
      const data = await res.json();
      if (res.ok) {
        showBanner("success", "Compromisso removido com sucesso!");
        fetchData();
      } else {
        showBanner("error", data.message || "Erro ao remover.");
      }
    } catch (err) {
      showBanner("error", "Erro ao conectar.");
    }
  };

  const handleConfirmAppointment = async (id: string) => {
    try {
      let token = credentials?.activeTokens?.[0]?.token;
      if (!token) {
        const tokRes = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: 'llm_client_id', client_secret: 'llm_client_secret' })
        });
        const tokData = await tokRes.json();
        token = tokData.access_token;
      }

      if (!token) {
        showBanner("error", "Não há Bearer Token ativo para autenticar a confirmação. Gere um na aba de Playground.");
        return;
      }

      const res = await fetch(`/api/appointments/${id}/confirm`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        showBanner("success", "Compromisso CONFIRMADO com sucesso!");
        fetchData();
      } else {
        showBanner("error", data.message || "Erro ao confirmar.");
      }
    } catch (err) {
      showBanner("error", "Falha na conexão.");
    }
  };

  const startReschedule = (app: Appointment) => {
    setRescheduleTarget(app);
    setRescheduleDate(app.data);
    setRescheduleHora(app.horaInicial);
  };

  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget) return;

    try {
      let token = credentials?.activeTokens?.[0]?.token;
      if (!token) {
        const tokRes = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: 'llm_client_id', client_secret: 'llm_client_secret' })
        });
        const tokData = await tokRes.json();
        token = tokData.access_token;
      }

      if (!token) {
        showBanner("error", "Bearer token é requerido para remarcar compromissos.");
        return;
      }

      const res = await fetch(`/api/appointments/${rescheduleTarget.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          data: rescheduleDate,
          horaInicial: rescheduleHora
        })
      });

      const data = await res.json();
      if (res.ok) {
        showBanner("success", `Compromisso remarcado! Antigo cancelado. Status do novo: ${data.newAppointment.status}`);
        setRescheduleTarget(null);
        fetchData();
      } else {
        showBanner("error", data.message || data.error || "Erro ao remarcar compromisso.");
      }
    } catch (err) {
      showBanner("error", "Erro ao processar remarcação.");
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocSpecialty) {
      showBanner("error", "Preencha nome e especialidade do médico.");
      return;
    }

    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDocName,
          specialty: newDocSpecialty,
          startTime: newDocStart,
          endTime: newDocEnd,
          breakTime: hasBreak ? newDocBreak : null,
          breakDuration: hasBreak ? Number(newDocBreakDur) : 0
        })
      });

      const data = await res.json();
      if (res.ok) {
        showBanner("success", "Médico registrado com sucesso!");
        setNewDocName('');
        setNewDocSpecialty('');
        setHasBreak(false);
        fetchData();
      } else {
        showBanner("error", data.error || "Erro ao registrar médico.");
      }
    } catch (err) {
      showBanner("error", "Erro ao registrar.");
    }
  };

  const handleRemoveDoctor = async (id: string) => {
    if (!window.confirm("Deseja mesmo remover este médico? Suas consultas salvas continuarão no banco.")) return;
    try {
      const res = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showBanner("success", "Médico removido do cadastro.");
        fetchData();
      } else {
        const d = await res.json();
        showBanner("error", d.error || "Erro ao remover.");
      }
    } catch (err) {
      showBanner("error", "Erro de rede.");
    }
  };

  const handleAddSpecialty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpecialtyName) return;

    try {
      const res = await fetch('/api/specialties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSpecialtyName })
      });
      if (res.ok) {
        showBanner("success", "Especialidade adicionada.");
        setNewSpecialtyName('');
        fetchData();
      } else {
        const d = await res.json();
        showBanner("error", d.error || "Erro.");
      }
    } catch (err) {
      showBanner("error", "Erro.");
    }
  };

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName) return;

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newExamName })
      });
      if (res.ok) {
        showBanner("success", "Exame adicionado.");
        setNewExamName('');
        fetchData();
      } else {
        const d = await res.json();
        showBanner("error", d.error || "Erro.");
      }
    } catch (err) {
      showBanner("error", "Erro.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showBanner("success", "Copiado para a área de transferência!");
  };

  const filteredApps = appointments.filter(a => a.data === selectedDate);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans tracking-wide antialiased">
      
      {/* 1. Header (Premium Dark Style Navigation Bar Contract) */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-950 p-2 rounded-lg shadow-inner">
            <Server className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white font-mono">api_agenda</h1>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-4xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                RENDER PUBLIC
              </span>
            </div>
            <p className="text-2xs text-slate-400 font-medium">
              API Base: <code className="text-emerald-400 font-mono text-3xs font-bold">{apiHostUrl}</code>
            </p>
          </div>
        </div>

        {/* Global Dark Segmented Tabs (Clean buttons with zero capsules) */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg">
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'agenda' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Agenda Interativa
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('painel')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'painel' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" />
              Médicos & Exames
            </span>
          </button>
          <button 
            onClick={() => { setActiveTab('playground'); generateCurl(); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'playground' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Playground & Autenticação
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'database' ? 'bg-slate-800 text-white border border-slate-700/50' : 'text-slate-400 hover:text-white'}`}
          >
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              Banco Local (JSON)
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-800 text-slate-300 bg-slate-900 hover:bg-slate-800 transition-colors rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sincronizar
          </button>
          <button 
            onClick={handleResetDB}
            className="px-3 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-colors rounded-lg shadow-md"
          >
            Resetar Base
          </button>
        </div>
      </header>

      {/* 2. Global Status Messages */}
      {successMsg && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/60 px-6 py-3 flex items-center gap-3 text-emerald-300 text-sm transition-all animate-fade-in font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="bg-rose-950/80 border-b border-rose-800/60 px-6 py-3 flex items-center gap-3 text-rose-300 text-sm transition-all">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Workspace Canvas */}
      <main className="flex-1 overflow-y-auto p-8 max-w-7xl w-full mx-auto space-y-8">
        
        {/* TAB 1: AGENDA INTERATIVA (DARK MODE) */}
        {activeTab === 'agenda' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* Left Panel: Register Appointments */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Agendar Compromisso</h2>
                  <p className="text-2xs text-slate-400">Inserção rápida no banco local</p>
                </div>

                <form onSubmit={handleCreateAppointment} className="space-y-4">
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Paciente</label>
                    <input 
                      type="text" 
                      placeholder="Nome completo do paciente" 
                      value={newAppPaciente} 
                      onChange={e => setNewAppPaciente(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Tipo</label>
                      <select 
                        value={newAppTipo} 
                        onChange={e => setNewAppTipo(e.target.value as any)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2.5 text-white focus:outline-none"
                      >
                        <option value="Consulta">Consulta (1h)</option>
                        <option value="Retorno">Retorno (30m)</option>
                        <option value="Exame">Exame (05h-09h30)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Data</label>
                      <input 
                        type="date" 
                        value={newAppDate} 
                        onChange={e => setNewAppDate(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white focus:outline-none font-mono"
                      />
                    </div>
                  </div>

                  {newAppTipo !== 'Exame' && (
                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Médico Responsável</label>
                      <select 
                        value={newAppDoctor} 
                        onChange={e => setNewAppDoctor(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2.5 text-white focus:outline-none"
                      >
                        {doctors.map(d => (
                          <option key={d.id} value={d.name}>
                            {d.name} ({d.specialty})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Hora Inicial</label>
                    <input 
                      type="time" 
                      value={newAppHora} 
                      onChange={e => setNewAppHora(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white focus:outline-none font-mono"
                    />
                  </div>

                  <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 text-3xs text-slate-400 space-y-1.5 font-mono">
                    <p className="font-bold text-slate-300">Regras de Expediente:</p>
                    <p>• Dr. Marcos (Ped): 08:00 às 14:00</p>
                    <p>• Dra. Elena (Obs): 14:00 às 20:00</p>
                    <p>• Dr. Vanessa (CG): 10:00 às 16:00 (Break 12:40-13:00)</p>
                    <p>• Exames: 05:00 às 09:30 (Sem profissional)</p>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-slate-800 text-white rounded-lg py-2.5 text-xs font-bold hover:bg-slate-750 transition-colors shadow-md border border-slate-700/50 flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    Agendar (Basic Auth)
                  </button>
                </form>
              </div>

              {/* Reschedule module */}
              {rescheduleTarget && (
                <div className="bg-slate-900 rounded-xl border border-amber-550/30 p-6 shadow-lg space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Remarcar Registro</h2>
                      <p className="text-xs text-slate-300">Paciente: {rescheduleTarget.paciente}</p>
                    </div>
                    <button onClick={() => setRescheduleTarget(null)} className="text-slate-400 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveReschedule} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs font-bold uppercase tracking-widest text-amber-400 mb-1">Nova Data</label>
                        <input 
                          type="date" 
                          value={rescheduleDate} 
                          onChange={e => setRescheduleDate(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-2xs font-bold uppercase tracking-widest text-amber-400 mb-1">Novo Horário</label>
                        <input 
                          type="time" 
                          value={rescheduleHora} 
                          onChange={e => setRescheduleHora(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="text-3xs text-slate-300 space-y-1 bg-slate-950 p-2.5 rounded-lg border border-slate-800 font-mono">
                      <p className="font-bold text-amber-400">Regra de Transição:</p>
                      {rescheduleDate === rescheduleTarget.data ? (
                        <p>✓ Remarcação para o **mesmo dia** ({rescheduleDate}): o novo receberá status <span className="font-bold text-emerald-400">confirmado</span> e o anterior será cancelado.</p>
                      ) : (
                        <p>➔ Remarcação para **outro dia** ({rescheduleDate}): o novo receberá status <span className="font-bold text-orange-400">remarcado</span> e o anterior será cancelado.</p>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg py-2.5 text-xs font-bold transition-all shadow-md"
                    >
                      Remarcar Registro (Bearer Token)
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Right Panel: Daily agenda list */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Date Filter Bar */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Filtro da Agenda</h2>
                  <p className="text-xs text-slate-400">Escolha a data de visualização do prontuário</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-slate-400 font-bold uppercase tracking-widest">Seletor:</span>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-slate-700"
                  />
                  <div className="flex gap-1 border-l border-slate-850 pl-2">
                    <button 
                      onClick={() => setSelectedDate(getRelativeDateStr(0))} 
                      className={`px-2 py-1 text-2xs font-bold rounded ${selectedDate === getRelativeDateStr(0) ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 text-slate-400 hover:bg-slate-850'}`}
                      title={`Hoje (${getRelativeDateStr(0)})`}
                    >
                      Hoje ({formatShortDate(getRelativeDateStr(0))})
                    </button>
                    <button 
                      onClick={() => setSelectedDate(getRelativeDateStr(1))} 
                      className={`px-2 py-1 text-2xs font-bold rounded ${selectedDate === getRelativeDateStr(1) ? 'bg-emerald-400 text-slate-950' : 'bg-slate-950 text-slate-400 hover:bg-slate-850'}`}
                      title={`Amanhã (${getRelativeDateStr(1)})`}
                    >
                      Amanhã ({formatShortDate(getRelativeDateStr(1))})
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid of list */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-widest">Compromissos Agendados ({filteredApps.length})</h3>
                  <div className="flex gap-4 text-3xs text-slate-400 font-mono">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> AGENDADO</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> CONFIRMADO</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400"></span> REMARCADO</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span> CANCELADO</span>
                  </div>
                </div>

                {filteredApps.length === 0 ? (
                  <div className="py-12 text-center space-y-2 border border-dashed border-slate-800 rounded-xl">
                    <CalendarClock className="w-10 h-10 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Nenhum compromisso para este dia.</p>
                    <p className="text-3xs text-slate-500 max-w-sm mx-auto">Adicione um novo agendamento de teste ou use o painel lateral para mudar o dia.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-850">
                    {filteredApps.map((app) => (
                      <div key={app.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-slate-850/30 px-3 rounded-lg transition-colors">
                        
                        <div className="flex items-start gap-4">
                          {/* Timeline initial hours */}
                          <div className="bg-slate-950 p-2.5 rounded-lg text-center font-mono shrink-0 w-16 border border-slate-800">
                            <span className="block text-xs font-bold text-white">{app.horaInicial}</span>
                            <span className="block text-4xs text-slate-500">{app.horaFinal}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-white">{app.paciente}</span>
                              <span className="text-3xs text-slate-600 font-mono">#{app.id}</span>
                            </div>
                            
                            {/* Unboxed Metadata list */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                              <span className="text-slate-300 font-sans font-semibold text-2xs uppercase tracking-wider">{app.tipo}</span>
                              {app.doutor && (
                                <>
                                  <span className="text-slate-700" aria-hidden="true">·</span>
                                  <span>{app.doutor}</span>
                                  <span className="text-slate-700" aria-hidden="true">·</span>
                                  <span className="text-slate-500 text-3xs font-sans">{app.especialidade}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Label & Active interactive commands */}
                        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-2 md:pt-0 border-slate-850">
                          {/* High-fidelity color flags */}
                          <div className="flex items-center gap-1.5 font-mono text-2xs font-bold uppercase tracking-wider">
                            {app.status === 'agendado' && (
                              <span className="text-blue-500">agendado</span>
                            )}
                            {app.status === 'confirmado' && (
                              <span className="text-emerald-400">confirmado</span>
                            )}
                            {app.status === 'remarcado' && (
                              <span className="text-orange-400">remarcado</span>
                            )}
                            {app.status === 'cancelado' && (
                              <span className="text-slate-600 line-through">cancelado</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {app.status === 'agendado' && (
                              <button 
                                onClick={() => handleConfirmAppointment(app.id)}
                                className="px-2.5 py-1 bg-slate-950 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50 transition-all rounded text-3xs font-bold uppercase tracking-widest"
                                title="Mudar status para confirmado (Requer Bearer Token)"
                              >
                                Confirmar
                              </button>
                            )}
                            
                            {app.status !== 'cancelado' && (
                              <button 
                                onClick={() => startReschedule(app)}
                                className="px-2.5 py-1 bg-slate-950 border border-amber-500/30 text-amber-400 hover:bg-amber-950/50 transition-all rounded text-3xs font-bold uppercase tracking-widest"
                                title="Reagendar registro (Requer Bearer Token)"
                              >
                                Remarcar
                              </button>
                            )}

                            <button 
                              onClick={() => handleDeleteAppointment(app.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors rounded"
                              title="Remover permanentemente (Requer Basic Auth)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: MEDICOS E EXAMES (DARK MODE) */}
        {activeTab === 'painel' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
            
            {/* Left Column forms */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Doctor Form */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">Cadastrar Médico</h2>
                  <p className="text-2xs text-slate-400 font-medium">Insira profissionais de saúde</p>
                </div>

                <form onSubmit={handleAddDoctor} className="space-y-4">
                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Dra. Helena" 
                      value={newDocName}
                      onChange={e => setNewDocName(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Especialidade</label>
                    <select 
                      value={newDocSpecialty}
                      onChange={e => setNewDocSpecialty(e.target.value)}
                      className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2.5 text-white focus:outline-none"
                    >
                      <option value="">Selecione uma especialidade...</option>
                      {specialties.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Expediente Inicial</label>
                      <input 
                        type="time" 
                        value={newDocStart}
                        onChange={e => setNewDocStart(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-widest text-slate-400 mb-1">Expediente Final</label>
                      <input 
                        type="time" 
                        value={newDocEnd}
                        onChange={e => setNewDocEnd(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="hasBreak" 
                        checked={hasBreak}
                        onChange={e => setHasBreak(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500"
                      />
                      <label htmlFor="hasBreak" className="text-2xs font-bold uppercase tracking-widest text-slate-400 select-none">Registrar Intervalo</label>
                    </div>

                    {hasBreak && (
                      <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 border border-slate-850 rounded-lg animate-fade-in">
                        <div>
                          <label className="block text-3xs font-bold uppercase tracking-widest text-slate-500 mb-1">Hora Inicial</label>
                          <input 
                            type="time" 
                            value={newDocBreak}
                            onChange={e => setNewDocBreak(e.target.value)}
                            className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-3xs font-bold uppercase tracking-widest text-slate-500 mb-1">Duração (m)</label>
                          <input 
                            type="number" 
                            value={newDocBreakDur}
                            onChange={e => setNewDocBreakDur(e.target.value)}
                            className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2 py-1 text-white font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="w-full bg-slate-800 text-white rounded-lg py-2.5 text-xs font-bold hover:bg-slate-700 transition-colors border border-slate-700/40"
                  >
                    Salvar Médico
                  </button>
                </form>
              </div>

              {/* Specialties & Exams registers */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-6">
                
                <div className="space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Adicionar Especialidade</h3>
                    <p className="text-4xs text-slate-500">Cadastre ramos médicos no sistema</p>
                  </div>
                  <form onSubmit={handleAddSpecialty} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ex: Pediatria" 
                      value={newSpecialtyName}
                      onChange={e => setNewSpecialtyName(e.target.value)}
                      className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-700 text-white"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg text-2xs font-bold">
                      Add
                    </button>
                  </form>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-800">
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Adicionar Exame</h3>
                    <p className="text-4xs text-slate-500">Cadastre novas categorias laboratoriais</p>
                  </div>
                  <form onSubmit={handleAddExam} className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Ex: Hemograma" 
                      value={newExamName}
                      onChange={e => setNewExamName(e.target.value)}
                      className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-slate-700 text-white"
                    />
                    <button type="submit" className="px-3 py-1.5 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-lg text-2xs font-bold">
                      Add
                    </button>
                  </form>
                </div>

              </div>

            </div>

            {/* Right Column roster grid */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">Corpo Médico Ativo</h2>
                  <p className="text-xs text-slate-400">Verifique horários de plantão e intervalos</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {doctors.map(d => (
                    <div key={d.id} className="border border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-700 transition-colors bg-slate-950/40">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-white font-mono">{d.name}</span>
                          <button 
                            onClick={() => handleRemoveDoctor(d.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded"
                            title="Remover médico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                          <p className="text-slate-400 font-sans"><span className="font-semibold text-slate-500 font-mono text-3xs uppercase tracking-widest block">Especialidade:</span> {d.specialty}</p>
                          <p className="text-slate-400 font-sans"><span className="font-semibold text-slate-500 font-mono text-3xs uppercase tracking-widest block">Expediente:</span> {d.startTime} - {d.endTime}</p>
                          {d.breakTime && (
                            <p className="text-slate-400 font-sans"><span className="font-semibold text-amber-500/80 font-mono text-3xs uppercase tracking-widest block text-amber-500">Intervalo:</span> {d.breakTime} (Duração {d.breakDuration}m)</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Specialties and Exams grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">Especialidades</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {specialties.map(s => (
                      <span key={s} className="bg-slate-950 text-slate-300 rounded px-2.5 py-1 text-xs font-medium border border-slate-800 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-850 pb-2">Exames Disponíveis</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {exams.map(e => (
                      <span key={e} className="bg-slate-950 text-slate-300 rounded px-2.5 py-1 text-xs font-medium border border-slate-800 font-mono">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 3: PLAYGROUND & AUTH (DARK MODE) */}
        {activeTab === 'playground' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Credentials Pool display */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">Configuração de Autenticação da API</h2>
                <p className="text-xs text-slate-400">Inspeção de cabeçalhos e credenciais experimentais para homologação de chamadas LLM</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* API Key */}
                <div className="border border-slate-800 bg-slate-950 rounded-xl p-5 space-y-2 shadow-inner">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-2xs text-white uppercase tracking-wider font-mono">1. Header API Key</span>
                  </div>
                  <p className="text-2xs text-slate-400 leading-relaxed">Autenticação simples e rápida de leitura geral.</p>
                  <div className="bg-slate-900 p-3 rounded-lg text-xs space-y-1.5 border border-slate-850 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Header:</span>
                      <span className="font-bold text-white">{credentials?.apiKey.header}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Chave:</span>
                      <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-850 text-emerald-400 font-bold text-3xs select-all">
                        {credentials?.apiKey.value}
                      </code>
                    </div>
                  </div>
                  <div className="text-4xs text-slate-500 font-mono uppercase tracking-widest">Rotas: GET /api/appointments</div>
                </div>

                {/* Basic Auth */}
                <div className="border border-slate-800 bg-slate-950 rounded-xl p-5 space-y-2 shadow-inner">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-2xs text-white uppercase tracking-wider font-mono">2. Basic Auth</span>
                  </div>
                  <p className="text-2xs text-slate-400 leading-relaxed">Autenticação com cabeçalho de usuário e senha.</p>
                  <div className="bg-slate-900 p-3 rounded-lg text-xs space-y-1.5 border border-slate-850 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Usuário:</span>
                      <span className="font-bold text-white">{credentials?.basicAuth.username}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Senha:</span>
                      <code className="bg-slate-950 px-1 py-0.5 rounded border border-slate-850 text-emerald-400 font-bold text-3xs select-all">
                        {credentials?.basicAuth.password}
                      </code>
                    </div>
                  </div>
                  <div className="text-4xs text-slate-500 font-mono uppercase tracking-widest">Rotas: POST /appointments, DELETE /appointments/:id</div>
                </div>

                {/* Bearer credentials */}
                <div className="border border-slate-800 bg-slate-950 rounded-xl p-5 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-2xs text-white uppercase tracking-wider font-mono">3. Token Bearer (OAuth)</span>
                    </div>
                    <span className="text-4xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded">
                      TTL: {formatTtlLabel(tokenTtl)}
                    </span>
                  </div>
                  <p className="text-2xs text-slate-400 leading-relaxed">Emissão de token em 2 etapas com validade configurável.</p>
                  
                  {/* Combobox de tempo no Card de Credenciais */}
                  <div className="space-y-1 pt-1">
                    <label className="text-4xs text-slate-400 font-bold uppercase tracking-wider font-mono block">
                      Validade do Token:
                    </label>
                    <select
                      value={tokenTtl}
                      onChange={e => handleUpdateTokenTtl(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-2xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value={60}>1 min (teste rápido de expiração)</option>
                      <option value={300}>5 min</option>
                      <option value={600}>10 min</option>
                      <option value={1800}>30 min (Padrão de mercado)</option>
                      <option value={86400}>24h (Longa duração / permanente)</option>
                    </select>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg text-xs space-y-1.5 border border-slate-850 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Client ID:</span>
                      <span className="font-bold text-white">{credentials?.bearerToken.clientId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Secret:</span>
                      <span className="font-bold text-white text-3xs">{credentials?.bearerToken.clientSecret}</span>
                    </div>
                  </div>

                  {/* Active Tokens list */}
                  {credentials?.activeTokens && credentials.activeTokens.length > 0 && (
                    <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-lg space-y-1.5 font-mono text-3xs">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Tokens Ativos ({credentials.activeTokens.length}):</span>
                        <span className="text-4xs uppercase">Tempo Restante</span>
                      </div>
                      {credentials.activeTokens.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-slate-300 bg-slate-950 p-1.5 rounded border border-slate-850">
                          <code className="text-emerald-300 font-mono truncate max-w-[130px] select-all">{t.token}</code>
                          <span className="text-emerald-400 font-bold shrink-0">
                            {t.timeLeftSeconds >= 60 
                              ? `${Math.floor(t.timeLeftSeconds / 60)}m ${t.timeLeftSeconds % 60}s`
                              : `${t.timeLeftSeconds}s`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-4xs text-slate-500 font-mono uppercase tracking-widest">Rotas: PUT /confirm, POST /reschedule</div>
                </div>

              </div>
            </div>

            {/* Dynamic Route Auth Matrix Controller */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                      Matriz de Políticas de Autenticação das Rotas
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Você pode alterar qual autenticação o servidor exige em cada rota para simular qualquer cenário na sua LLM.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-3xs text-slate-500 font-mono font-bold uppercase">Presets:</span>
                  <button
                    onClick={() => handleApplyPreset('default')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-3xs font-mono font-bold rounded border border-slate-700 transition-colors"
                    title="API Key para GET, Basic para POST/DELETE, Bearer para PUT/reschedule"
                  >
                    Padrão
                  </button>
                  <button
                    onClick={() => handleApplyPreset('all_any')}
                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-3xs font-mono font-bold rounded border border-emerald-500/40 transition-colors"
                    title="Todas as rotas aceitam qualquer método (API Key, Basic ou Bearer)"
                  >
                    ⚡ Aceitar Qualquer Uma
                  </button>
                  <button
                    onClick={() => handleApplyPreset('all_apikey')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-3xs font-mono font-bold rounded border border-slate-700 transition-colors"
                  >
                    Tudo API Key
                  </button>
                  <button
                    onClick={() => handleApplyPreset('all_basic')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-3xs font-mono font-bold rounded border border-slate-700 transition-colors"
                  >
                    Tudo Basic
                  </button>
                  <button
                    onClick={() => handleApplyPreset('all_bearer')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-3xs font-mono font-bold rounded border border-slate-700 transition-colors"
                  >
                    Tudo Bearer
                  </button>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { route: 'GET /api/appointments', desc: 'Listar todos os agendamentos', objectiveId: 'list_appointments' },
                  { route: 'GET /api/appointments/:id', desc: 'Consultar agendamento por ID', objectiveId: 'get_appointment' },
                  { route: 'POST /api/appointments', desc: 'Criar novo agendamento', objectiveId: 'create_appointment' },
                  { route: 'DELETE /api/appointments/:id', desc: 'Remover agendamento', objectiveId: 'delete_appointment' },
                  { route: 'PUT /api/appointments/:id/confirm', desc: 'Confirmar agendamento (Presença)', objectiveId: 'confirm_appointment' },
                  { route: 'POST /api/appointments/:id/reschedule', desc: 'Remarcar agendamento', objectiveId: 'reschedule_appointment' },
                ].map(({ route, desc, objectiveId }) => {
                  const [method, path] = route.split(' ');
                  const currentMode = routeAuthConfig[route] || 'apikey';
                  return (
                    <div key={route} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between hover:border-slate-700 transition-colors">
                      <div className="space-y-2">
                        {/* Header with method badge, current mode, and copy button */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.5 rounded text-4xs font-mono font-bold tracking-wider ${
                              method === 'GET' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                              method === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              method === 'PUT' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                              'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {method}
                            </span>
                            <span className={`text-4xs font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                              currentMode === 'any' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              currentMode === 'apikey' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                              currentMode === 'basic' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                              currentMode === 'bearer' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                              'bg-slate-900 text-slate-400'
                            }`}>
                              {currentMode === 'any' ? 'Qualquer' : currentMode}
                            </span>
                          </div>

                          {/* Copy route path button */}
                          <button
                            onClick={() => copyToClipboard(path)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-900 transition-colors shrink-0"
                            title="Copiar endpoint da rota"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Full path visible clearly without truncation */}
                        <div>
                          <p className="text-xs font-mono font-bold text-slate-100 break-all leading-snug">
                            {path}
                          </p>
                          <p className="text-3xs text-slate-400 mt-1 font-sans font-medium">
                            {desc}
                          </p>
                        </div>
                      </div>

                      {/* Policy selector and load button */}
                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        <div>
                          <label className="text-4xs text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Exigência da Rota:
                          </label>
                          <select
                            value={currentMode}
                            onChange={(e) => handleUpdateRouteAuth(route, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-2xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="apikey">Header X-API-Key</option>
                            <option value="basic">Basic Auth (user:pass)</option>
                            <option value="bearer">Bearer Token (OAuth)</option>
                            <option value="any">⚡ Qualquer Método (Aceita Todas)</option>
                            <option value="none">🔓 Pública (Sem Auth)</option>
                          </select>
                        </div>

                        <button
                          onClick={() => {
                            handleSelectObjective(objectiveId);
                            const elem = document.getElementById('rest-generator');
                            if (elem) {
                              elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                            showBanner("success", `Rota "${desc}" carregada e limpa no Playground!`);
                          }}
                          className="w-full py-1 text-4xs font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/60 rounded transition-colors flex items-center justify-center gap-1"
                        >
                          <ArrowRight className="w-3 h-3" />
                          Carregar no Playground
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* HTTP Console and cURL terminal emulator */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* HTTP Request Console panel */}
              <div id="rest-generator" className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Gerador de Chamadas REST</h2>
                  <p className="text-xs text-slate-400">Monte e dispare chamadas experimentais</p>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  
                  {/* Step 0 bearer emitter */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white block text-2xs font-mono uppercase tracking-wider">Passo 1: Obter Access Token</span>
                      <span className="text-3xs text-slate-950 font-mono font-bold bg-emerald-400 px-1.5 py-0.5 rounded">POST /api/auth/token</span>
                    </div>
                    <p className="text-slate-400 text-3xs font-mono leading-relaxed">
                      Escolha o tempo de validade do token antes de gerar e informe as credenciais de cliente:
                    </p>

                    {/* Combobox de tempo do token */}
                    <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                      <div className="flex items-center justify-between">
                        <label className="text-4xs text-emerald-400 font-bold block uppercase tracking-wider font-mono">
                          ⏱️ Validade do Bearer Token (Combobox):
                        </label>
                        <span className="text-4xs text-slate-500 font-mono">
                          Padrão: 30 min
                        </span>
                      </div>
                      <select 
                        value={tokenTtl}
                        onChange={e => handleUpdateTokenTtl(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={60}>1 min (teste rápido de expiração)</option>
                        <option value={300}>5 min</option>
                        <option value={600}>10 min</option>
                        <option value={1800}>30 min (Padrão de mercado)</option>
                        <option value={86400}>24h (Longa duração / permanente)</option>
                      </select>
                      <span className="text-4xs text-slate-500 font-mono block">
                        * O tempo é configurado no painel e aplicado pelo servidor sem expor parâmetros na rota /api/auth/token.
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-4xs text-slate-500 font-bold block mb-1">CLIENT ID</label>
                        <input 
                          type="text" 
                          value={pgClientId} 
                          onChange={e => setPgClientId(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-4xs text-slate-500 font-bold block mb-1">CLIENT SECRET</label>
                        <input 
                          type="text" 
                          value={pgClientSecret} 
                          onChange={e => setPgClientSecret(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 font-mono text-xs text-white"
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleRequestToken}
                      className="w-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg py-2 text-2xs font-bold transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      Solicitar Bearer Token (Validade: {formatTtlLabel(tokenTtl)})
                    </button>
                  </div>

                  {/* Main Call builder */}
                  <div className="space-y-3 pt-2">
                    <span className="font-bold text-white text-2xs block border-b border-slate-800 pb-1 uppercase tracking-wider font-mono">Passo 2: Configurar Chamada REST</span>
                    
                    {/* Combobox de Objetivo da Rota */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-4xs text-emerald-400 font-mono font-bold uppercase tracking-wider">
                          🎯 Objetivo da Operação:
                        </label>
                        <span className="text-4xs text-slate-500 font-mono">
                          {ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId)?.routeKey}
                        </span>
                      </div>
                      
                      <select 
                        value={selectedObjectiveId} 
                        onChange={e => handleSelectObjective(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <optgroup label="📋 Agendamentos (Compromissos)">
                          <option value="list_appointments">Listar todos os agendamentos (GET)</option>
                          <option value="get_appointment">Consultar agendamento por ID (GET)</option>
                          <option value="create_appointment">Criar novo agendamento (POST)</option>
                          <option value="confirm_appointment">Confirmar agendamento (PUT)</option>
                          <option value="reschedule_appointment">Remarcar agendamento (POST)</option>
                          <option value="delete_appointment">Remover agendamento (DELETE)</option>
                        </optgroup>
                        <optgroup label="🔐 Autenticação">
                          <option value="get_token">Solicitar Bearer Token (POST /api/auth/token)</option>
                        </optgroup>
                        <optgroup label="🩺 Cadastros da Clínica">
                          <option value="list_doctors">Listar médicos cadastrados (GET)</option>
                          <option value="list_specialties">Listar especialidades (GET)</option>
                          <option value="list_exams">Listar exames laboratoriais (GET)</option>
                        </optgroup>
                      </select>
                    </div>

                    {/* Resolved Route Indicator Bar */}
                    <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-850 flex items-center justify-between gap-2 text-2xs font-mono">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`px-1.5 py-0.5 rounded text-4xs font-bold tracking-wider shrink-0 ${
                          pgMethod === 'GET' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                          pgMethod === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          pgMethod === 'PUT' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                          'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}>
                          {pgMethod}
                        </span>
                        <code className="text-emerald-400 font-bold truncate">{pgEndpoint}</code>
                      </div>

                      {ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId)?.requiresId && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-4xs text-slate-400 uppercase font-bold">Alvo:</span>
                          <select
                            value={selectedAppointmentId}
                            onChange={(e) => {
                              setSelectedAppointmentId(e.target.value);
                              handleSelectObjective(selectedObjectiveId, e.target.value);
                            }}
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-3xs text-white"
                          >
                            {appointments.map(a => (
                              <option key={a.id} value={a.id}>{a.id} ({a.paciente})</option>
                            ))}
                            {appointments.length === 0 && <option value="app-1">app-1</option>}
                          </select>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-4xs text-slate-500 font-bold mb-1">MÉTODO DE AUTENTICAÇÃO</label>
                        <select 
                          value={pgAuthType} 
                          onChange={e => setPgAuthType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="none">Sem Autenticação</option>
                          <option value="apikey">Header API Key</option>
                          <option value="basic">Basic Auth</option>
                          <option value="bearer">Bearer Token</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-4xs text-slate-500 font-bold mb-1">SIMULAR VALIDAÇÃO</label>
                        <select 
                          value={pgAuthCreds} 
                          onChange={e => setPgAuthCreds(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                          <option value="valid">Credenciais Corretas (Validar 200/201)</option>
                          <option value="invalid">Credenciais Incorretas (Validar 401/403)</option>
                          <option value="none">Ausente (Validar 401)</option>
                        </select>
                      </div>
                    </div>

                    {/* Status de Casamento da Autenticação (Card vs Simulador) */}
                    {(() => {
                      const currentObj = ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId);
                      const routeKey = currentObj?.routeKey || '';
                      const requiredMode = routeAuthConfig[routeKey] || 'apikey';
                      const isPublic = ['POST /api/auth/token', 'GET /api/doctors', 'GET /api/specialties', 'GET /api/exams'].includes(routeKey);

                      const modeLabels: Record<string, string> = {
                        apikey: 'Header API Key',
                        basic: 'Basic Auth',
                        bearer: 'Bearer Token',
                        any: 'Qualquer Método',
                        none: 'Sem Autenticação'
                      };

                      if (isPublic) {
                        return (
                          <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/80 text-3xs font-mono text-slate-400 flex items-center justify-between">
                            <span>🔓 Rota pública da API (dispensa autenticação de acesso).</span>
                          </div>
                        );
                      }

                      const isMatched = requiredMode === 'any' ? true : pgAuthType === requiredMode;

                      if (isMatched) {
                        return (
                          <div className="p-2.5 rounded-lg border border-emerald-800/80 bg-emerald-950/40 text-3xs font-mono text-emerald-300 flex items-center justify-between gap-2 shadow-inner">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>
                                <strong>Casamento Perfeito:</strong> O simulador está enviando <strong>{modeLabels[pgAuthType] || pgAuthType}</strong>, que casa exatamente com a exigência configurada no card ({modeLabels[requiredMode] || requiredMode}). Com credenciais válidas, a API retornará dados com sucesso!
                              </span>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-2.5 rounded-lg border border-amber-800/90 bg-amber-950/40 text-3xs font-mono text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-inner">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>
                                <strong>Incompatibilidade Detectada:</strong> O card exige <strong>{modeLabels[requiredMode] || requiredMode}</strong>, mas o simulador está enviando <strong>{modeLabels[pgAuthType] || pgAuthType}</strong>. A API <u>rejeitará com 401 Unauthorized</u> mesmo se simular dados corretos (as 2 configurações precisam casar).
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPgAuthType(requiredMode === 'any' ? 'apikey' : requiredMode as any)}
                              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 rounded text-4xs font-bold uppercase tracking-wider shrink-0 transition-colors"
                            >
                              ⚡ Casar com o Card
                            </button>
                          </div>
                        );
                      }
                    })()}

                    {/* Alvo da execução do simulador */}
                    <div className="bg-slate-950 px-3 py-2 rounded-lg border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-4xs text-slate-400 uppercase font-bold tracking-wider">
                          Executar Simulador contra:
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setSimulatorTarget('local')}
                          className={`px-2 py-0.5 text-4xs rounded font-bold transition-colors ${
                            simulatorTarget === 'local'
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Ambiente local garantido, instantâneo e 100% sincronizado com os cards"
                        >
                          💻 Preview Local (Recomendado)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSimulatorTarget('render')}
                          className={`px-2 py-0.5 text-4xs rounded font-bold transition-colors ${
                            simulatorTarget === 'render'
                              ? 'bg-emerald-500 text-slate-950 shadow-sm'
                              : 'text-slate-400 hover:text-white'
                          }`}
                          title="Instância remota pública do Render"
                        >
                          🌐 Render Cloud
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const currentObj = ROUTE_OBJECTIVES.find(o => o.id === selectedObjectiveId);
                      if (currentObj?.expectsBody) {
                        return (
                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-4xs text-emerald-400 font-mono font-bold uppercase tracking-wider">
                                BODY (JSON)
                              </label>
                              <button 
                                type="button"
                                onClick={() => {
                                  if (currentObj.defaultBody) {
                                    let defaultVal = currentObj.defaultBody;
                                    if (currentObj.id === 'create_appointment') {
                                      defaultVal = `{\n  "paciente": "Gisela Neves",\n  "tipo": "Consulta",\n  "doutor": "Dr. Marcos Paulo",\n  "data": "${getRelativeDateStr(0)}",\n  "horaInicial": "11:00"\n}`;
                                    } else if (currentObj.id === 'reschedule_appointment') {
                                      defaultVal = `{\n  "data": "${getRelativeDateStr(1)}",\n  "horaInicial": "10:00"\n}`;
                                    }
                                    setPgBody(defaultVal);
                                  }
                                }}
                                className="text-emerald-400 hover:text-emerald-300 text-3xs font-semibold font-mono"
                                title="Restaurar JSON original da rota com a data atual"
                              >
                                Restaurar Exemplo Padrão
                              </button>
                            </div>
                            <textarea 
                              rows={6} 
                              value={pgBody} 
                              onChange={e => setPgBody(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-xs text-white focus:outline-none focus:border-emerald-500"
                            ></textarea>
                          </div>
                        );
                      }

                      if (currentObj?.id === 'confirm_appointment') {
                        return (
                          <div className="p-3 rounded-lg border border-slate-850 bg-slate-950/80 text-3xs font-mono text-slate-300 space-y-1">
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Rota PUT sem Body (Path Parameter exclusivo)</span>
                            </div>
                            <p className="text-slate-400 font-sans leading-relaxed">
                              Esta rota opera exclusivamente com o parâmetro <code>:id</code> na URL (<code className="text-emerald-300 font-mono font-bold">{pgEndpoint}</code>). Nenhum corpo JSON (Body) é necessário nem enviado no cURL.
                            </p>
                          </div>
                        );
                      }

                      return null;
                    })()}
                  </div>

                  <button 
                    onClick={handlePlaygroundSubmit}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg py-2.5 text-xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-colors uppercase tracking-wider"
                  >
                    <Terminal className="w-4 h-4" />
                    Enviar Requisição REST
                  </button>

                </div>
              </div>

              {/* cURL & response emulators */}
              <div className="space-y-6">
                
                {/* Active tokens pool */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 shadow-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xs font-bold text-white uppercase tracking-wider block font-mono">Pilha de Bearer Tokens Ativos ({credentials?.activeTokens?.length || 0})</span>
                    <span className="text-4xs text-slate-500 uppercase tracking-widest font-mono">In-Memory Pool</span>
                  </div>
                  {(!credentials?.activeTokens || credentials.activeTokens.length === 0) ? (
                    <p className="text-2xs text-slate-400 font-mono italic">Nenhum Bearer Token gerado ou ativo. Use o painel ao lado.</p>
                  ) : (
                    <div className="space-y-1.5 font-mono">
                      {credentials.activeTokens.map((t, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-slate-950 px-2.5 py-1.5 rounded border border-slate-850 text-2xs">
                          <code className="text-emerald-400 font-bold truncate max-w-[280px]">{t.token}</code>
                          <span className="text-slate-400 shrink-0 text-3xs bg-slate-850 px-1.5 py-0.5 rounded font-bold uppercase">expira {t.timeLeftSeconds}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* cURL preview command */}
                <div className="bg-slate-950 rounded-xl p-5 text-white font-mono text-xs space-y-3 relative shadow-2xl border border-slate-900">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-900 pb-2">
                    <span className="text-4xs text-slate-400 uppercase tracking-widest block font-bold">
                      Comando cURL Externo (Pronto para Uso)
                    </span>
                    
                    {/* Host selector switch */}
                    <div className="flex items-center gap-1.5 bg-slate-900 p-0.5 rounded border border-slate-800">
                      <button
                        onClick={() => setCurlHostMode('render')}
                        className={`px-2 py-0.5 text-3xs rounded font-bold transition-colors ${
                          curlHostMode === 'render' 
                            ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Usar URL pública externa do Render no comando cURL"
                      >
                        🌐 Render (Produção)
                      </button>
                      <button
                        onClick={() => setCurlHostMode('local')}
                        className={`px-2 py-0.5 text-3xs rounded font-bold transition-colors ${
                          curlHostMode === 'local' 
                            ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Usar localhost:3000 no comando cURL"
                      >
                        💻 Localhost
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-3xs text-slate-400 bg-slate-900/60 px-2.5 py-1.5 rounded border border-slate-850">
                    <span className="truncate">
                      Host Base do cURL: <span className="text-emerald-400 font-bold">{curlHostMode === 'render' ? apiHostUrl : 'http://localhost:3000'}</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(curlHostMode === 'render' ? apiHostUrl : 'http://localhost:3000')}
                      className="text-slate-400 hover:text-white ml-2 shrink-0 p-1"
                      title="Copiar URL Base"
                    >
                      <Clipboard className="w-3 h-3" />
                    </button>
                  </div>

                  <pre className="overflow-x-auto text-2xs leading-relaxed text-slate-200 max-h-48 whitespace-pre-wrap">{pgCurl}</pre>
                  
                  <button 
                    onClick={() => copyToClipboard(pgCurl)} 
                    className="absolute top-4 right-4 bg-slate-900 hover:bg-slate-800 text-slate-300 p-1.5 rounded transition-all border border-slate-800"
                    title="Copiar cURL completo"
                  >
                    <Clipboard className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* HTTP Response panel */}
                <div className="bg-slate-950 rounded-xl p-5 text-emerald-400 font-mono text-xs space-y-2 relative shadow-2xl border border-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-1.5">
                    <span className="text-4xs text-slate-500 uppercase tracking-widest block">Response payload (JSON)</span>
                    {pgResponseStatus && (
                      <span className={`text-2xs font-mono font-bold px-2 py-0.5 rounded ${pgResponseStatus >= 200 && pgResponseStatus < 300 ? 'bg-emerald-950/80 text-emerald-400' : 'bg-rose-950/80 text-rose-400'}`}>
                        HTTP {pgResponseStatus}
                      </span>
                    )}
                  </div>
                  <pre className="overflow-auto text-2xs max-h-80 whitespace-pre-wrap text-emerald-300/90 leading-relaxed font-mono">{pgResponse}</pre>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* TAB 4: DATABASE VIEWER (DARK MODE) */}
        {activeTab === 'database' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">Stream do Arquivo Local (agenda.json)</h2>
                <p className="text-xs text-slate-400 font-medium">Persistência local no disco do servidor Express/Node.js</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={fetchData}
                  className="px-3 py-2 text-xs font-bold border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-300 transition-colors bg-slate-950 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Recarregar Arquivo
                </button>
                <button 
                  onClick={handleResetDB}
                  className="px-3 py-2 text-xs font-bold bg-rose-600/90 hover:bg-rose-600 rounded-lg text-white transition-colors"
                >
                  Resetar Dados
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-xl p-6 shadow-2xl border border-slate-900 font-mono text-xs text-slate-300 relative">
              <span className="text-4xs text-slate-500 uppercase tracking-widest block border-b border-slate-900 pb-3 mb-4">agenda.json read stream</span>
              <pre className="overflow-auto max-h-[600px] text-emerald-400/90 whitespace-pre leading-relaxed font-mono">{JSON.stringify(dbRaw, null, 2)}</pre>
              <button 
                onClick={() => copyToClipboard(JSON.stringify(dbRaw, null, 2))}
                className="absolute top-6 right-6 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white p-2 rounded-lg transition-all border border-slate-800"
                title="Copiar JSON completo"
              >
                <Clipboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 4. Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 px-8 mt-auto shadow-inner">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs text-slate-400 font-medium font-mono">
          <div>
            <p className="font-bold text-white tracking-wider">api_agenda v1.0.0 (Homologação LLM)</p>
            <p className="text-slate-500 font-sans mt-0.5">Validação robusta de conectores, cabeçalhos e fluxos OAuth-like.</p>
          </div>
          <div className="text-slate-500 font-sans">
            <p>© 2026 Google AI Studio Build. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
