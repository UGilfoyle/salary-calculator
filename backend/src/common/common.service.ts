import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { Company } from './entities/company.entity';
import { Designation } from './entities/designation.entity';

@Injectable()
export class CommonService {
  constructor(
    @InjectRepository(City)
    private cityRepository: Repository<City>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Designation)
    private designationRepository: Repository<Designation>,
  ) {}

  async getCities(): Promise<City[]> {
    return this.cityRepository.find({
      where: { isActive: true },
      order: { 
        priority: 'ASC', // Top cities first (lower priority number = higher priority)
        usageCount: 'DESC', // Then by usage count
        name: 'ASC', // Finally alphabetically
      },
    });
  }

  async getCompanies(): Promise<Company[]> {
    return this.companyRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getDesignations(): Promise<Designation[]> {
    return this.designationRepository.find({
      where: { isActive: true },
      order: { title: 'ASC' },
    });
  }

  async incrementCityUsage(cityName: string): Promise<void> {
    const city = await this.cityRepository.findOne({ where: { name: cityName } });
    if (city) {
      city.usageCount += 1;
      await this.cityRepository.save(city);
    }
  }

  async incrementCompanyUsage(companyName: string): Promise<void> {
    const company = await this.companyRepository.findOne({ where: { name: companyName } });
    if (company) {
      company.usageCount += 1;
      await this.companyRepository.save(company);
    }
  }

  async incrementDesignationUsage(designationTitle: string): Promise<void> {
    const designation = await this.designationRepository.findOne({ where: { title: designationTitle } });
    if (designation) {
      designation.usageCount += 1;
      await this.designationRepository.save(designation);
    }
  }
}

