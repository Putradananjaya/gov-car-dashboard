export interface TravelLog {
  id: string;
  carId: string;
  plateNumber: string;
  driverName: string;
  timestamp: string;
  activity: string;
  type: 'info' | 'warning' | 'success';
}
