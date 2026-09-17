import { IsNotEmpty, IsString } from 'class-validator';

export class TolakLoanDto {
  @IsString()
  @IsNotEmpty()
  catatanPenolakan!: string;
}
