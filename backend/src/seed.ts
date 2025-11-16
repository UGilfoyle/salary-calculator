import { DataSource } from 'typeorm';
import { SalaryCalculation } from './salary/entities/salary-calculation.entity';
import { User, UserRole } from './user/entities/user.entity';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'salary_calculator',
  entities: [SalaryCalculation, User],
  synchronize: true, // Sync schema before seeding
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function seed() {
  try {
    console.log('🌱 Starting database seed...');
    
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const salaryRepository = AppDataSource.getRepository(SalaryCalculation);
    const userRepository = AppDataSource.getRepository(User);

    // Clear existing data (optional - comment out if you want to keep existing data)
    // Delete salary_calculations first due to foreign key constraint
    await AppDataSource.createQueryBuilder()
      .delete()
      .from(SalaryCalculation)
      .execute();
    await AppDataSource.createQueryBuilder()
      .delete()
      .from(User)
      .execute();
    console.log('🗑️  Cleared existing data');

    // Create admin user first
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = userRepository.create({
      email: 'admin@salarycalc.com',
      password: adminPassword,
      username: 'admin',
      displayName: 'Admin User',
      avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=667eea&color=fff',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepository.save(adminUser);
    console.log('👑 Created admin user');
    console.log('   Email: admin@salarycalc.com');
    console.log('   Password: admin123');

    // Create a test user for seed data
    const testUser = userRepository.create({
      githubId: 'seed_user_12345',
      username: 'testuser',
      displayName: 'Test User',
      avatarUrl: 'https://github.com/github.png',
      email: 'test@example.com',
      githubProfile: 'https://github.com/testuser',
      role: UserRole.USER,
      isActive: true,
    });
    const savedUser = await userRepository.save(testUser);
    console.log('👤 Created test user');

    // Sample data
    const sampleCalculations = [
      {
        ctc: 1000000,
        city: 'Mumbai',
        githubProfile: 'https://github.com/example1',
        linkedinProfile: 'https://linkedin.com/in/example1',
        offerInHand: null,
        variablePay: 50000,
        insurance: 15000,
        fixedCtc: 935000,
        basicSalary: 38958.33,
        hra: 31166.67,
        specialAllowance: 7791.67,
        pf: 4675.00,
        esi: 0,
        professionalTax: 200,
        incomeTax: 0,
        inHandSalary: 70832.67,
        monthlyDeductions: 4875.00,
        annualDeductions: 58500.00,
        userId: savedUser.id,
      },
      {
        ctc: 1500000,
        city: 'Bangalore',
        githubProfile: 'https://github.com/example2',
        linkedinProfile: 'https://linkedin.com/in/example2',
        offerInHand: null,
        variablePay: 100000,
        insurance: 20000,
        fixedCtc: 1380000,
        basicSalary: 57500.00,
        hra: 46000.00,
        specialAllowance: 11500.00,
        pf: 6900.00,
        esi: 0,
        professionalTax: 200,
        incomeTax: 3166.67,
        inHandSalary: 104733.33,
        monthlyDeductions: 10266.67,
        annualDeductions: 123200.00,
        userId: savedUser.id,
      },
      {
        ctc: 800000,
        city: 'Delhi',
        githubProfile: null,
        linkedinProfile: null,
        offerInHand: null,
        variablePay: 0,
        insurance: 0,
        fixedCtc: 800000,
        basicSalary: 33333.33,
        hra: 26666.67,
        specialAllowance: 6666.67,
        pf: 4000.00,
        esi: 0,
        professionalTax: 0,
        incomeTax: 0,
        inHandSalary: 62666.67,
        monthlyDeductions: 4000.00,
        annualDeductions: 48000.00,
        userId: savedUser.id,
      },
    ];

    // Insert sample data
    const savedCalculations = await salaryRepository.save(sampleCalculations);
    console.log(`✅ Seeded ${savedCalculations.length} salary calculations`);

    // Display summary
    console.log('\n📊 Seeded Data Summary:');
    savedCalculations.forEach((calc, index) => {
      console.log(`\n${index + 1}. CTC: ₹${calc.ctc.toLocaleString('en-IN')}`);
      console.log(`   City: ${calc.city}`);
      console.log(`   Fixed CTC: ₹${calc.fixedCtc.toLocaleString('en-IN')}`);
      console.log(`   Variable Pay: ₹${calc.variablePay.toLocaleString('en-IN')}`);
      console.log(`   Insurance: ₹${calc.insurance.toLocaleString('en-IN')}`);
      console.log(`   In-Hand Salary: ₹${calc.inHandSalary.toLocaleString('en-IN')}`);
    });

    console.log('\n🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

seed();

