export type Severity = 'Low' | 'Medium' | 'High';

export interface FlockEvent {
  id: string;
  title: string;
  description: string;
  tags: string[];
  coordinate: { latitude: number; longitude: number };
  votes: number;
  flags: number;
  timestamp: Date;
  isAnonymous: boolean;
  type: 'emergency' | 'weather' | 'hazard' | 'social';
}

export const UNIVERSITY_BOUNDS = {
  latitude: 39.6781,
  longitude: -75.7506,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};