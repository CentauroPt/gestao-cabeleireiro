import type { Salon, User, Service, Client, Appointment } from '../types';

export const mockSalons: Salon[] = [
  {
    id: 'salon-1',
    name: 'Atelier de Beleza & Estilo',
    phone: '+351 912 345 678',
    address: 'Avenida da Liberdade 120, Lisboa',
    nif: '509123456',
    openingTime: '09:00',
    closingTime: '20:00',
    slotIntervalMinutes: 10,
    status: 'ATIVO',
    createdAt: '2026-08-10T10:00:00.000Z',
    primaryColor: '#8B5CF6',
  },
  {
    id: 'salon-2',
    name: 'Glamour & Chic Hair Studio',
    phone: '+351 923 456 789',
    address: 'Rua de Santa Catarina 450, Porto',
    nif: '508234567',
    openingTime: '09:30',
    closingTime: '19:30',
    slotIntervalMinutes: 10,
    status: 'ATIVO',
    createdAt: '2026-09-01T14:30:00.000Z',
    primaryColor: '#059669',
  },
  {
    id: 'salon-3',
    name: 'Visual & Glow Studio (Exemplo Suspenso)',
    phone: '+351 934 111 222',
    address: 'Rua das Flores 12, Coimbra',
    nif: '507111222',
    openingTime: '09:00',
    closingTime: '19:00',
    slotIntervalMinutes: 10,
    status: 'SUSPENSO',
    suspensionReason: 'Mensalidade pendente de regularização',
    createdAt: '2026-09-20T11:00:00.000Z',
    primaryColor: '#D97706',
  },
];

export const mockUsers: User[] = [
  {
    id: 'user-admin',
    salonId: 'salon-1',
    name: 'Helena Costa (Gerente)',
    email: 'helena@atelierbeleza.pt',
    phone: '+351 912 345 678',
    role: 'ADMIN',
    password: 'admin123',
    color: '#8B5CF6', // Roxo
    specialties: ['Gestão', 'Cortes de Alta Precisão', 'Colorimetria Avançada'],
    active: true,
  },
  {
    id: 'user-colab-1',
    salonId: 'salon-1',
    name: 'Tiago Silva',
    email: 'tiago@atelierbeleza.pt',
    phone: '+351 913 222 333',
    role: 'COLABORADOR',
    color: '#3B82F6', // Azul
    specialties: ['Cortes Modernos', 'Barba & Fade', 'Penteados'],
    active: true,
  },
  {
    id: 'user-colab-2',
    salonId: 'salon-1',
    name: 'Rita Ferreira',
    email: 'rita@atelierbeleza.pt',
    phone: '+351 914 555 666',
    role: 'COLABORADOR',
    color: '#EC4899', // Rosa
    specialties: ['Balayage', 'Coloração', 'Tratamentos Reconstrutores'],
    active: true,
  },
  {
    id: 'user-admin-salon2',
    salonId: 'salon-2',
    name: 'Marta Rodrigues (Gerente Porto)',
    email: 'marta@glamourchic.pt',
    phone: '+351 923 456 789',
    role: 'ADMIN',
    password: 'admin',
    color: '#10B981',
    specialties: ['Coordenação Geral'],
    active: true,
  },
  {
    id: 'user-admin-salon3',
    salonId: 'salon-3',
    name: 'Carla Nogueira (Coimbra)',
    email: 'carla@visualglow.pt',
    phone: '+351 934 111 222',
    role: 'ADMIN',
    password: 'admin',
    color: '#F59E0B',
    specialties: ['Estética', 'Cabelo'],
    active: false,
  },
];

export const mockServices: Service[] = [
  {
    id: 'serv-1',
    salonId: 'salon-1',
    name: 'Corte Feminino & Brushing',
    category: 'Cabelo',
    durationMinutes: 45,
    price: 35.0,
    description: 'Diagnóstico capilar, lavagem com massagem, corte personalizado e styling.',
  },
  {
    id: 'serv-2',
    salonId: 'salon-1',
    name: 'Corte Masculino & Lavagem',
    category: 'Cabelo',
    durationMinutes: 30,
    price: 18.0,
    description: 'Corte clássico ou degradé/fade com acabamento à navalha.',
  },
  {
    id: 'serv-3',
    salonId: 'salon-1',
    name: 'Coloração Completa Raiz às Pontas',
    category: 'Cabelo',
    durationMinutes: 90,
    price: 58.0,
    description: 'Aplicação de coloração técnica profissional com proteção capilar.',
  },
  {
    id: 'serv-4',
    salonId: 'salon-1',
    name: 'Balayage / Madeixas Iluminadas',
    category: 'Cabelo',
    durationMinutes: 120,
    price: 85.0,
    description: 'Técnica de iluminação e clareamento suave com tonalização incluída.',
  },
  {
    id: 'serv-5',
    salonId: 'salon-1',
    name: 'Brushing & Penteado Express',
    category: 'Cabelo',
    durationMinutes: 30,
    price: 20.0,
    description: 'Lavagem suave e secagem com volume ou lisura duradoura.',
  },
  {
    id: 'serv-6',
    salonId: 'salon-1',
    name: 'Tratamento de Hidratação Profunda & Botox',
    category: 'Tratamento',
    durationMinutes: 45,
    price: 35.0,
    description: 'Reconstrução lipídica profunda e nutrição de cutículas.',
  },
];

// Função auxiliar para criar datas relativas em ISO
const today = new Date();
const formatDate = (daysAgo: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
};

const dateOnly = (daysAgo: number): string => {
  const d = new Date(today);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

export const mockClients: Client[] = [
  {
    id: 'client-1',
    salonId: 'salon-1',
    name: 'Maria João Pires',
    phone: '+351 919 111 222',
    email: 'maria.pires@gmail.com',
    photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
    preferredUserId: 'user-colab-2', // Rita Ferreira
    technicalNotes: 'Fórmula de Cor: Majirel 7.1 (30g) + 7.31 (15g) com oxidante 20 vol. Cabelo fino, sensível a descoloração direta.',
    createdById: 'user-colab-2',
    createdAt: formatDate(120),
    totalSpent: 260.0,
    lastVisitDate: formatDate(6), // Visitou há 6 dias (Verde)
    visitHistory: [
      {
        id: 'vh-1',
        date: formatDate(6),
        servicesDone: ['Corte Feminino & Brushing'],
        professionalId: 'user-colab-2',
        professionalName: 'Rita Ferreira',
        amountSpent: 35.0,
        notes: 'Ajustou o corte chanel ligeiramente mais curto atrás.',
      },
      {
        id: 'vh-2',
        date: formatDate(45),
        servicesDone: ['Coloração Completa Raiz às Pontas', 'Brushing & Penteado Express'],
        professionalId: 'user-colab-2',
        professionalName: 'Rita Ferreira',
        amountSpent: 78.0,
        notes: 'Cobertura 100% dos brancos na raiz.',
      },
      {
        id: 'vh-3',
        date: formatDate(90),
        servicesDone: ['Balayage / Madeixas Iluminadas'],
        professionalId: 'user-colab-2',
        professionalName: 'Rita Ferreira',
        amountSpent: 85.0,
        notes: 'Iluminação tom mel nas pontas.',
      },
      {
        id: 'vh-4',
        date: formatDate(120),
        servicesDone: ['Tratamento de Hidratação Profunda & Botox', 'Corte Feminino & Brushing'],
        professionalId: 'user-admin',
        professionalName: 'Helena Costa',
        amountSpent: 62.0,
      },
    ],
  },
  {
    id: 'client-2',
    salonId: 'salon-1',
    name: 'Ana Beatriz Santos',
    phone: '+351 961 888 999',
    email: 'ana.santos@outlook.com',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    preferredUserId: 'user-admin', // Helena Costa
    technicalNotes: 'Prefere corte com tesoura de dente largo. Usa sempre spray térmico protetor.',
    createdById: 'user-admin',
    createdAt: formatDate(80),
    totalSpent: 115.0,
    lastVisitDate: formatDate(38), // Ausente há 38 dias (Amarelo - Atenção)
    visitHistory: [
      {
        id: 'vh-5',
        date: formatDate(38),
        servicesDone: ['Corte Feminino & Brushing'],
        professionalId: 'user-admin',
        professionalName: 'Helena Costa',
        amountSpent: 35.0,
      },
      {
        id: 'vh-6',
        date: formatDate(75),
        servicesDone: ['Balayage / Madeixas Iluminadas'],
        professionalId: 'user-colab-2',
        professionalName: 'Rita Ferreira',
        amountSpent: 80.0,
      },
    ],
  },
  {
    id: 'client-3',
    salonId: 'salon-1',
    name: 'Gonçalo Tavares',
    phone: '+351 933 777 444',
    email: 'goncalo.tavares@sapo.pt',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    preferredUserId: 'user-colab-1', // Tiago Silva
    technicalNotes: 'Fade número 1 nas laterais. Barba alinhada com toalha quente.',
    createdById: 'user-colab-1',
    createdAt: formatDate(150),
    totalSpent: 90.0,
    lastVisitDate: formatDate(14), // Visitou há 14 dias (Verde)
    visitHistory: [
      {
        id: 'vh-7',
        date: formatDate(14),
        servicesDone: ['Corte Masculino & Lavagem'],
        professionalId: 'user-colab-1',
        professionalName: 'Tiago Silva',
        amountSpent: 18.0,
      },
      {
        id: 'vh-8',
        date: formatDate(35),
        servicesDone: ['Corte Masculino & Lavagem'],
        professionalId: 'user-colab-1',
        professionalName: 'Tiago Silva',
        amountSpent: 18.0,
      },
    ],
  },
  {
    id: 'client-4',
    salonId: 'salon-1',
    name: 'Sofia Valente',
    phone: '+351 925 333 111',
    email: 'sofia.valente@hotmail.com',
    photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
    preferredUserId: 'user-colab-2', // Rita Ferreira
    technicalNotes: 'Coloração alérgica a PPD! Usar apenas linha orgânica sem amoníaco. Raiz 5.0 pura.',
    createdById: 'user-admin',
    createdAt: formatDate(180),
    totalSpent: 195.0,
    lastVisitDate: formatDate(72), // Não vai há 72 dias! (Vermelho - Alerta Crítico)
    visitHistory: [
      {
        id: 'vh-9',
        date: formatDate(72),
        servicesDone: ['Coloração Completa Raiz às Pontas', 'Corte Feminino & Brushing'],
        professionalId: 'user-colab-2',
        professionalName: 'Rita Ferreira',
        amountSpent: 93.0,
        notes: 'Cliente queixou-se de falta de tempo por viagem.',
      },
      {
        id: 'vh-10',
        date: formatDate(130),
        servicesDone: ['Tratamento de Hidratação Profunda & Botox', 'Brushing & Penteado Express'],
        professionalId: 'user-colab-2',
        professionalName: 'Rita Ferreira',
        amountSpent: 55.0,
      },
      {
        id: 'vh-11',
        date: formatDate(180),
        servicesDone: ['Corte Feminino & Brushing'],
        professionalId: 'user-admin',
        professionalName: 'Helena Costa',
        amountSpent: 47.0,
      },
    ],
  },
  {
    id: 'client-5',
    salonId: 'salon-1',
    name: 'Carla Mendonça',
    phone: '+351 918 444 222',
    photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&q=80',
    preferredUserId: 'user-admin',
    technicalNotes: 'Cliente nova, prefere marcações ao final da tarde.',
    createdById: 'user-colab-1',
    createdAt: formatDate(2),
    totalSpent: 0,
    lastVisitDate: undefined, // Novo cliente sem visitas
    visitHistory: [],
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: 'apt-1',
    salonId: 'salon-1',
    clientId: 'client-1',
    clientName: 'Maria João Pires',
    clientPhone: '+351 919 111 222',
    userId: 'user-colab-2', // Rita Ferreira
    serviceIds: ['serv-1'],
    serviceNames: ['Corte Feminino & Brushing'],
    date: dateOnly(0), // Hoje
    startTime: '10:00',
    endTime: '10:45',
    totalDurationMinutes: 45,
    totalPrice: 35.0,
    status: 'CONFIRMADA',
    notes: 'Manter comprimento das pontas',
    createdById: 'user-colab-1', // Criado por Tiago para Rita (demonstração de colaboração)
    createdAt: formatDate(1),
  },
  {
    id: 'apt-2',
    salonId: 'salon-1',
    clientId: 'client-3',
    clientName: 'Gonçalo Tavares',
    clientPhone: '+351 933 777 444',
    userId: 'user-colab-1', // Tiago Silva
    serviceIds: ['serv-2'],
    serviceNames: ['Corte Masculino & Lavagem'],
    date: dateOnly(0), // Hoje
    startTime: '10:30',
    endTime: '11:00',
    totalDurationMinutes: 30,
    totalPrice: 18.0,
    status: 'CONFIRMADA',
    createdById: 'user-colab-1',
    createdAt: formatDate(2),
  },
  {
    id: 'apt-3',
    salonId: 'salon-1',
    clientId: 'client-2',
    clientName: 'Ana Beatriz Santos',
    clientPhone: '+351 961 888 999',
    userId: 'user-admin', // Helena Costa
    serviceIds: ['serv-3', 'serv-5'],
    serviceNames: ['Coloração Completa Raiz às Pontas', 'Brushing & Penteado Express'],
    date: dateOnly(0), // Hoje
    startTime: '14:30',
    endTime: '16:30',
    totalDurationMinutes: 120,
    totalPrice: 78.0,
    status: 'AGENDADA',
    notes: 'Refazer mechas suaves',
    createdById: 'user-admin',
    createdAt: formatDate(1),
  },
  {
    id: 'apt-4',
    salonId: 'salon-1',
    clientId: 'client-5',
    clientName: 'Carla Mendonça',
    clientPhone: '+351 918 444 222',
    userId: 'user-colab-1', // Tiago Silva
    serviceIds: ['serv-1'],
    serviceNames: ['Corte Feminino & Brushing'],
    date: dateOnly(0), // Hoje
    startTime: '15:00',
    endTime: '15:45',
    totalDurationMinutes: 45,
    totalPrice: 35.0,
    status: 'AGENDADA',
    createdById: 'user-colab-2', // Criado por Rita para Tiago
    createdAt: formatDate(1),
  },
];
