import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SalaryService } from './salary.service';
import { SalaryCalculation } from './entities/salary-calculation.entity';
import { CityTaxData } from './entities/city-tax-data.entity';
import { CommonService } from '../common/common.service';

describe('SalaryService', () => {
    let service: SalaryService;
    let mockSalaryRepository: any;
    let mockCityTaxRepository: any;
    let mockCommonService: any;

    beforeEach(async () => {
        mockSalaryRepository = {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
        };

        mockCityTaxRepository = {
            findOne: jest.fn(),
        };

        mockCommonService = {
            incrementCityUsage: jest.fn(),
            incrementCompanyUsage: jest.fn(),
            incrementDesignationUsage: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SalaryService,
                {
                    provide: getRepositoryToken(SalaryCalculation),
                    useValue: mockSalaryRepository,
                },
                {
                    provide: getRepositoryToken(CityTaxData),
                    useValue: mockCityTaxRepository,
                },
                {
                    provide: CommonService,
                    useValue: mockCommonService,
                },
            ],
        }).compile();

        service = module.get<SalaryService>(SalaryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('calculateSalary', () => {
        it('should calculate salary correctly for Mumbai', async () => {
            const mockCityTax = {
                city: 'Mumbai',
                professionalTax: 200,
                state: 'Maharashtra',
            };

            mockCityTaxRepository.findOne.mockResolvedValue(mockCityTax);

            const result = await service.calculateSalary({
                ctc: 1000000,
                city: 'Mumbai',
                userId: 'test-user-id',
            });

            expect(result).toBeDefined();
            expect(result.ctc).toBe(1000000);
            expect(result.basicSalary).toBeGreaterThan(0);
            expect(result.inHandSalary).toBeGreaterThan(0);
            expect(result.professionalTax).toBe(200);
        });

        it('should handle EPF calculation at 12%', async () => {
            const mockCityTax = {
                city: 'Delhi',
                professionalTax: 0,
                state: 'Delhi',
            };

            mockCityTaxRepository.findOne.mockResolvedValue(mockCityTax);

            const result = await service.calculateSalary({
                ctc: 1000000,
                city: 'Delhi',
                userId: 'test-user-id',
            });

            // EPF should be 12% of basic salary
            const expectedEPF = result.basicSalary * 0.12;
            expect(result.pf).toBeCloseTo(expectedEPF, 2);
        });
    });
});

