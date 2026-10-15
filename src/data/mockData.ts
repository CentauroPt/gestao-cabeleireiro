import type { Salon, User, Service, Client, Appointment } from '../types';

/**
 * Coleções limpas sem quaisquer palavras-passe ou utilizadores fictícios no código fonte.
 * Todos os salões, utilizadores, serviços e clientes são criados dinamicamente pelos utilizadores.
 */
export const mockSalons: Salon[] = [];
export const mockUsers: User[] = [];
export const mockServices: Service[] = [];
export const mockClients: Client[] = [];
export const mockAppointments: Appointment[] = [];
