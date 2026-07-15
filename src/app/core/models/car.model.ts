export interface Car {
  id: string;
  plateNumber: string;
  model: string;
  brand: string;
  type: 'Sedan' | 'SUV' | 'MPV' | 'Elektrik' | 'Sepeda Motor';
  agency: string;
  driverName: string;
  driverPhone: string;
  status: 'Aktif' | 'Digunakan' | 'Service' | 'Rusak';
  fuelLevel: number;
  speed: number;
  x: number;
  y: number;
  routeProgress: number;
  routeId: number;
  acquisitionYear: number;
  lastServiceDate: string;
  nextServiceDate: string;
  stnkActive: boolean;
  price: number;
}
