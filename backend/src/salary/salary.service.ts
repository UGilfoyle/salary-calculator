import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalaryCalculation } from './entities/salary-calculation.entity';
import { CityTaxData } from './entities/city-tax-data.entity';
import { CalculateSalaryDto } from './dto/calculate-salary.dto';
import { CreateCityTaxDto } from './dto/create-city-tax.dto';

export interface SalaryBreakdown {
  ctc: number;
  fixedCtc: number;
  variablePay: number;
  insurance: number;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  pf: number;
  esi: number;
  professionalTax: number;
  incomeTax: number;
  inHandSalary: number;
  monthlyDeductions: number;
  annualDeductions: number;
}

@Injectable()
export class SalaryService {
  constructor(
    @InjectRepository(SalaryCalculation)
    private salaryRepository: Repository<SalaryCalculation>,
    @InjectRepository(CityTaxData)
    private cityTaxRepository: Repository<CityTaxData>,
  ) { }

  async calculateSalary(dto: CalculateSalaryDto, userId: string): Promise<SalaryBreakdown> {
    const breakdown = await this.calculateIndianSalary(
      dto.ctc,
      dto.city,
      dto.variablePay || 0,
      dto.insurance || 0,
    );

    // Save to database
    const calculation = this.salaryRepository.create({
      ...dto,
      ...breakdown,
      userId,
    });
    await this.salaryRepository.save(calculation);

    return breakdown;
  }

  private async calculateIndianSalary(
    ctc: number,
    city: string,
    variablePay: number = 0,
    insurance: number = 0,
  ): Promise<SalaryBreakdown> {
    // Fixed CTC = Total CTC - Variable Pay - Insurance
    // Variable pay and insurance are part of CTC but not part of monthly salary
    const fixedCtc = ctc - variablePay - insurance;

    // Standard salary structure: 50% Basic, 40% HRA, 10% Special Allowance
    // Based on fixed CTC only (excluding variable pay and insurance)
    const basicSalaryAnnual = fixedCtc * 0.5;
    const hraAnnual = fixedCtc * 0.4;
    const specialAllowanceAnnual = fixedCtc * 0.1;
    
    const basicSalary = basicSalaryAnnual / 12;
    const hra = hraAnnual / 12;
    const specialAllowance = specialAllowanceAnnual / 12;
    const grossMonthly = basicSalary + hra + specialAllowance;

    // EPF: 12% of basic (employee contribution), capped at ₹1,800/month (12% of ₹15,000)
    // EPF is calculated on basic salary, but contribution is capped
    const pfContributionRate = 0.12;
    const pfMaxBasic = 15000; // EPF cap basic salary
    const pfApplicableBasic = Math.min(basicSalary, pfMaxBasic);
    const pf = pfApplicableBasic * pfContributionRate;

    // ESI: 0.75% of gross (if applicable, typically for gross salary <= ₹21,000)
    const esiThreshold = 21000;
    const esi = grossMonthly <= esiThreshold ? grossMonthly * 0.0075 : 0;

    // Professional Tax (varies by state) - fetch from database
    const professionalTax = await this.getProfessionalTax(city, grossMonthly);

    // HRA Exemption Calculation (for tax purposes)
    // HRA exemption is minimum of:
    // 1. Actual HRA received
    // 2. Rent paid - 10% of basic salary
    // 3. 50% of basic (metro) or 40% (non-metro)
    // For calculation purposes, we'll assume standard exemption (50% for metro, 40% for non-metro)
    const metroCities = ['Mumbai', 'Delhi', 'Kolkata', 'Chennai'];
    const isMetro = metroCities.includes(city);
    const hraExemptionPercent = isMetro ? 0.5 : 0.4;
    const hraExemptionAnnual = Math.min(
      hraAnnual,
      basicSalaryAnnual * hraExemptionPercent
    );
    const taxableHraAnnual = hraAnnual - hraExemptionAnnual;

    // Annual Taxable Income Calculation (New Tax Regime)
    // Taxable Income = Gross Annual - Standard Deduction - EPF (employee) - ESI (employee) - Professional Tax
    // Standard Deduction: ₹50,000 (for new tax regime)
    const standardDeduction = 50000;
    const pfAnnual = pf * 12;
    const esiAnnual = esi * 12;
    const professionalTaxAnnual = professionalTax * 12;
    
    // Gross Annual = Basic + HRA (taxable portion) + Special Allowance
    const grossAnnual = basicSalaryAnnual + taxableHraAnnual + specialAllowanceAnnual;
    
    // Taxable Income after deductions
    const annualTaxableIncome = Math.max(0, 
      grossAnnual - standardDeduction - pfAnnual - esiAnnual - professionalTaxAnnual
    );
    
    const incomeTaxAnnual = this.calculateIncomeTax(annualTaxableIncome);
    const incomeTax = incomeTaxAnnual / 12;

    // Monthly deductions
    const monthlyDeductions = pf + esi + professionalTax + incomeTax;
    const inHandSalary = grossMonthly - monthlyDeductions;
    const annualDeductions = monthlyDeductions * 12;

    return {
      ctc,
      fixedCtc: Number(fixedCtc.toFixed(2)),
      variablePay: Number(variablePay.toFixed(2)),
      insurance: Number(insurance.toFixed(2)),
      basicSalary: Number(basicSalary.toFixed(2)),
      hra: Number(hra.toFixed(2)),
      specialAllowance: Number(specialAllowance.toFixed(2)),
      pf: Number(pf.toFixed(2)),
      esi: Number(esi.toFixed(2)),
      professionalTax: Number(professionalTax.toFixed(2)),
      incomeTax: Number(incomeTax.toFixed(2)),
      inHandSalary: Number(inHandSalary.toFixed(2)),
      monthlyDeductions: Number(monthlyDeductions.toFixed(2)),
      annualDeductions: Number(annualDeductions.toFixed(2)),
    };
  }

  private async getProfessionalTax(city: string, grossMonthly: number): Promise<number> {
    // Try to get from database first
    const cityTaxData = await this.cityTaxRepository.findOne({
      where: { city },
    });

    if (cityTaxData) {
      return Number(cityTaxData.professionalTax);
    }

    // Fallback to hardcoded values if not in database
    const stateTaxMap: { [key: string]: number } = {
      Mumbai: 200,
      Pune: 200,
      Delhi: 0,
      Bangalore: 200,
      Hyderabad: 200,
      Chennai: 200,
      Kolkata: 110,
      Ahmedabad: 200,
      Jaipur: 200,
      Surat: 200,
      Lucknow: 200,
      Kanpur: 200,
      Nagpur: 200,
      Indore: 200,
      Thane: 200,
      Bhopal: 200,
      Visakhapatnam: 200,
      Patna: 200,
      Vadodara: 200,
      Ghaziabad: 200,
      Ludhiana: 200,
      Agra: 200,
      Nashik: 200,
      Faridabad: 200,
    };
    return stateTaxMap[city] || 200;
  }

  private calculateIncomeTax(annualIncome: number): number {
    // New tax regime 2024-25 (simplified)
    if (annualIncome <= 300000) return 0;
    if (annualIncome <= 700000)
      return (annualIncome - 300000) * 0.05;
    if (annualIncome <= 1000000)
      return 20000 + (annualIncome - 700000) * 0.1;
    if (annualIncome <= 1200000)
      return 50000 + (annualIncome - 1000000) * 0.15;
    if (annualIncome <= 1500000)
      return 80000 + (annualIncome - 1200000) * 0.2;
    return 140000 + (annualIncome - 1500000) * 0.3;
  }

  async getAllCalculations(): Promise<SalaryCalculation[]> {
    return this.salaryRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getUserCalculations(userId: string): Promise<SalaryCalculation[]> {
    return this.salaryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  // City Tax Data Management Methods
  async getAllCityTaxData() {
    return this.cityTaxRepository.find({
      order: { city: 'ASC' },
    });
  }

  async getCityTaxData(city: string) {
    return this.cityTaxRepository.findOne({
      where: { city },
    });
  }

  async createCityTaxData(dto: CreateCityTaxDto) {
    const cityTax = this.cityTaxRepository.create({
      ...dto,
      hraExemptionPercent: dto.hraExemptionPercent || 50,
      defaultTaxRegime: dto.defaultTaxRegime || 'new',
    });
    return this.cityTaxRepository.save(cityTax);
  }

  async updateCityTaxData(city: string, dto: Partial<CreateCityTaxDto>) {
    const cityTax = await this.cityTaxRepository.findOne({
      where: { city },
    });
    if (!cityTax) {
      throw new Error(`City tax data for ${city} not found`);
    }
    Object.assign(cityTax, dto);
    return this.cityTaxRepository.save(cityTax);
  }

  async deleteCityTaxData(city: string) {
    const result = await this.cityTaxRepository.delete({ city });
    return { success: result.affected > 0 };
  }
}

