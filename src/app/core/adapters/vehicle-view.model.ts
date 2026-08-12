import { VehicleAsset } from '../models/vehicle-asset.model';
import { VehicleOperational } from '../models/vehicle-operational.model';

/** Gabungan data administratif (e-BMD) + operasional untuk keperluan tampilan. */
export interface VehicleView extends VehicleAsset, Omit<VehicleOperational, 'nibar'> {}

export function toVehicleView(asset: VehicleAsset, operational: VehicleOperational): VehicleView {
  const { nibar: _nibar, ...operationalFields } = operational;
  return {
    ...asset,
    ...operationalFields
  };
}
