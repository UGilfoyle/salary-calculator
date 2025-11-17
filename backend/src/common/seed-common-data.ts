import { DataSource } from 'typeorm';
import { City } from './entities/city.entity';
import { Company } from './entities/company.entity';
import { Designation } from './entities/designation.entity';
import * as dotenv from 'dotenv';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'salary_calculator',
  entities: [City, Company, Designation],
  synchronize: true,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Top cities (Tier 1) - Priority 1-10
const topCities = [
  { name: 'Mumbai', priority: 1 },
  { name: 'Delhi', priority: 2 },
  { name: 'Bangalore', priority: 3 },
  { name: 'Hyderabad', priority: 4 },
  { name: 'Chennai', priority: 5 },
  { name: 'Kolkata', priority: 6 },
  { name: 'Pune', priority: 7 },
  { name: 'Ahmedabad', priority: 8 },
  { name: 'Gurgaon', priority: 9 },
  { name: 'Noida', priority: 10 },
];

// Tier 2 cities - Priority 11-30
const tier2Cities = [
  'Jaipur', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 
  'Bhopal', 'Visakhapatnam', 'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 
  'Agra', 'Nashik', 'Faridabad', 'Meerut', 'Rajkot', 'Varanasi', 'Srinagar',
];

// Other cities - Priority 31+ (excluding cities already in topCities and tier2Cities)
const otherCities = [
  'Amritsar', 'Aurangabad', 'Dhanbad', 'Allahabad', 'Ranchi', 'Howrah', 
  'Coimbatore', 'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 
  'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli', 
  'Tiruchirappalli', 'Bareilly', 'Moradabad', 'Mysore', 'Aligarh', 
  'Jalandhar', 'Tirunelveli', 'Bhubaneswar', 'Salem', 'Warangal', 
  'Mira-Bhayandar', 'Thiruvananthapuram', 'Bhiwandi', 'Saharanpur', 
  'Guntur', 'Amravati', 'Bikaner', 'Jamshedpur', 'Bhilai', 'Cuttack', 
  'Firozabad', 'Kochi', 'Nellore', 'Bhavnagar', 'Dehradun', 'Durgapur', 
  'Asansol', 'Rourkela', 'Nanded', 'Kolhapur', 'Ajmer', 'Akola', 
  'Gulbarga', 'Jamnagar', 'Ujjain', 'Loni', 'Siliguri', 'Jhansi', 
  'Ulhasnagar', 'Jammu', 'Sangli-Miraj', 'Mangalore', 'Erode', 'Belgaum', 
  'Ambattur', 'Tirupati', 'Malegaon', 'Gaya', 'Jalgaon', 'Udaipur', 
  'Maheshtala', 'Tiruppur', 'Davanagere', 'Kozhikode', 'Kurnool', 
  'Rajpur Sonarpur', 'Rajahmundry', 'Bokaro', 'South Dumdum', 'Bellary', 
  'Patiala', 'Gopalpur', 'Agartala', 'Bhagalpur', 'Muzaffarnagar', 
  'Bhatpara', 'Panihati', 'Latur', 'Dhule', 'Rohtak', 'Korba', 'Bhilwara', 
  'Berhampur', 'Muzaffarpur', 'Ahmednagar', 'Mathura', 'Kollam', 'Avadi', 
  'Kadapa', 'Anantapur', 'Kamarhati', 'Sambalpur', 'Bilaspur', 
  'Shahjahanpur', 'Satara', 'Bijapur', 'Rampur', 'Shivamogga', 
  'Chandrapur', 'Junagadh', 'Thrissur', 'Alwar', 'Bardhaman', 'Kulti',
  'Kakinada', 'Nizamabad', 'Parbhani', 'Tumkur', 'Khammam', 'Ozhukarai',
  'Bihar Sharif', 'Panipat', 'Darbhanga', 'Bally', 'Aizawl', 'Dewas',
  'Ichalkaranji', 'Karnal', 'Bathinda', 'Jalna', 'Eluru', 'Barasat',
  'Kirari Suleman Nagar', 'Purnia', 'Satna', 'Mau', 'Sonipat', 
  'Farrukhabad', 'Sagar', 'Rourkela', 'Durg', 'Imphal', 'Ratlam', 'Hapur', 
  'Arrah', 'Karimnagar', 'Etawah', 'Bharatpur', 'Begusarai', 'New Delhi',
  'Chhapra', 'Ramagundam', 'Pali', 'Vizianagaram', 'Katihar', 'Hardwar', 
  'Nagercoil', 'Thanjavur', 'Murwara', 'Naihati', 'Sambhal', 'Nadiad', 
  'Yamunanagar', 'English Bazar', 'Munger', 'Panchkula', 'Raayachuru', 
  'Panvel', 'Deoghar', 'Ongole', 'Nandyal', 'Morena', 'Bhiwani', 
  'Porbandar', 'Palakkad', 'Anand', 'Pundri', 'Baharampur', 'Barmer', 
  'Morvi', 'Orai', 'Bahraich', 'Phagwara', 'Tinsukia', 'Guntakal', 
  'Srikakulam', 'Balasore', 'Ambikapur', 'Rewa', 'Raichur', 'Vrindavan', 
  'Rajpura', 'Bhiwadi', 'Bhusawal', 'Chittoor', 'Bidar', 'Bettiah', 
  'Bhadravati', 'Bhadrak', 'Bharuch', 'Bhandara'
];

const companies = [
  // Tech Giants
  { name: 'Google', category: 'Tech' },
  { name: 'Microsoft', category: 'Tech' },
  { name: 'Amazon', category: 'Tech' },
  { name: 'Apple', category: 'Tech' },
  { name: 'Meta (Facebook)', category: 'Tech' },
  { name: 'Netflix', category: 'Tech' },
  { name: 'Oracle', category: 'Tech' },
  { name: 'IBM', category: 'Tech' },
  { name: 'Salesforce', category: 'Tech' },
  { name: 'Adobe', category: 'Tech' },
  { name: 'Intel', category: 'Tech' },
  { name: 'NVIDIA', category: 'Tech' },
  // Indian Tech
  { name: 'TCS', category: 'IT Services' },
  { name: 'Infosys', category: 'IT Services' },
  { name: 'Wipro', category: 'IT Services' },
  { name: 'HCL Technologies', category: 'IT Services' },
  { name: 'Tech Mahindra', category: 'IT Services' },
  { name: 'Cognizant', category: 'IT Services' },
  { name: 'Accenture', category: 'IT Services' },
  { name: 'Capgemini', category: 'IT Services' },
  { name: 'LTI (Larsen & Toubro Infotech)', category: 'IT Services' },
  { name: 'Mindtree', category: 'IT Services' },
  { name: 'Mphasis', category: 'IT Services' },
  { name: 'Zensar', category: 'IT Services' },
  { name: 'Persistent Systems', category: 'IT Services' },
  { name: 'Cyient', category: 'IT Services' },
  { name: 'Hexaware', category: 'IT Services' },
  // Product Companies
  { name: 'Flipkart', category: 'E-commerce' },
  { name: 'Amazon India', category: 'E-commerce' },
  { name: 'Myntra', category: 'E-commerce' },
  { name: 'Swiggy', category: 'Food Delivery' },
  { name: 'Zomato', category: 'Food Delivery' },
  { name: 'Ola', category: 'Transportation' },
  { name: 'Uber', category: 'Transportation' },
  { name: 'Paytm', category: 'Fintech' },
  { name: 'PhonePe', category: 'Fintech' },
  { name: 'Razorpay', category: 'Fintech' },
  { name: 'CRED', category: 'Fintech' },
  { name: 'Groww', category: 'Fintech' },
  { name: 'Zerodha', category: 'Fintech' },
  { name: 'BYJU\'S', category: 'EdTech' },
  { name: 'Unacademy', category: 'EdTech' },
  { name: 'Vedantu', category: 'EdTech' },
  { name: 'WhiteHat Jr', category: 'EdTech' },
  { name: 'UpGrad', category: 'EdTech' },
  { name: 'Simplilearn', category: 'EdTech' },
  // Startups & Unicorns
  { name: 'Meesho', category: 'E-commerce' },
  { name: 'ShareChat', category: 'Social Media' },
  { name: 'Dailyhunt', category: 'Media' },
  { name: 'InMobi', category: 'AdTech' },
  { name: 'Freshworks', category: 'SaaS' },
  { name: 'Zoho', category: 'SaaS' },
  { name: 'Chargebee', category: 'SaaS' },
  { name: 'Postman', category: 'Developer Tools' },
  { name: 'BrowserStack', category: 'Developer Tools' },
  { name: 'Hasura', category: 'Developer Tools' },
  // Banking & Finance
  { name: 'HDFC Bank', category: 'Banking' },
  { name: 'ICICI Bank', category: 'Banking' },
  { name: 'Axis Bank', category: 'Banking' },
  { name: 'Kotak Mahindra Bank', category: 'Banking' },
  { name: 'SBI', category: 'Banking' },
  { name: 'Yes Bank', category: 'Banking' },
  { name: 'IndusInd Bank', category: 'Banking' },
  { name: 'Punjab National Bank', category: 'Banking' },
  { name: 'Bank of Baroda', category: 'Banking' },
  { name: 'IDFC First Bank', category: 'Banking' },
  { name: 'RBL Bank', category: 'Banking' },
  { name: 'Federal Bank', category: 'Banking' },
  { name: 'AU Small Finance Bank', category: 'Banking' },
  // Consulting
  { name: 'McKinsey & Company', category: 'Consulting' },
  { name: 'BCG (Boston Consulting Group)', category: 'Consulting' },
  { name: 'Bain & Company', category: 'Consulting' },
  { name: 'Deloitte', category: 'Consulting' },
  { name: 'PwC', category: 'Consulting' },
  { name: 'EY (Ernst & Young)', category: 'Consulting' },
  { name: 'KPMG', category: 'Consulting' },
  { name: 'Accenture Strategy', category: 'Consulting' },
  // Others
  { name: 'Jio', category: 'Telecom' },
  { name: 'Airtel', category: 'Telecom' },
  { name: 'Vodafone Idea', category: 'Telecom' },
  { name: 'Reliance Jio', category: 'Telecom' },
  { name: 'BSNL', category: 'Telecom' },
  { name: 'Tata Communications', category: 'Telecom' },
  { name: 'Quest Global', category: 'Engineering Services' },
  { name: 'GlobalLogic', category: 'IT Services' },
  { name: 'EPAM Systems', category: 'IT Services' },
  { name: 'Publicis Sapient', category: 'IT Services' },
  { name: 'Thoughtworks', category: 'IT Services' },
  { name: 'Atlassian', category: 'Tech' },
];

const designations = [
  // Software Engineering
  { title: 'Software Engineer', category: 'Engineering' },
  { title: 'Senior Software Engineer', category: 'Engineering' },
  { title: 'Lead Software Engineer', category: 'Engineering' },
  { title: 'Principal Software Engineer', category: 'Engineering' },
  { title: 'Staff Software Engineer', category: 'Engineering' },
  { title: 'Software Engineer I', category: 'Engineering' },
  { title: 'Software Engineer II', category: 'Engineering' },
  { title: 'Software Engineer III', category: 'Engineering' },
  { title: 'Software Development Engineer', category: 'Engineering' },
  { title: 'Senior Software Development Engineer', category: 'Engineering' },
  { title: 'Software Development Engineer II', category: 'Engineering' },
  { title: 'Software Development Engineer III', category: 'Engineering' },
  { title: 'Associate Software Engineer', category: 'Engineering' },
  { title: 'Junior Software Engineer', category: 'Engineering' },
  { title: 'Software Developer', category: 'Engineering' },
  { title: 'Senior Software Developer', category: 'Engineering' },
  { title: 'Lead Software Developer', category: 'Engineering' },
  { title: 'Full Stack Developer', category: 'Engineering' },
  { title: 'Senior Full Stack Developer', category: 'Engineering' },
  { title: 'Frontend Developer', category: 'Engineering' },
  { title: 'Senior Frontend Developer', category: 'Engineering' },
  { title: 'Backend Developer', category: 'Engineering' },
  { title: 'Senior Backend Developer', category: 'Engineering' },
  { title: 'Mobile Developer', category: 'Engineering' },
  { title: 'iOS Developer', category: 'Engineering' },
  { title: 'Android Developer', category: 'Engineering' },
  { title: 'React Developer', category: 'Engineering' },
  { title: 'Node.js Developer', category: 'Engineering' },
  { title: 'Python Developer', category: 'Engineering' },
  { title: 'Java Developer', category: 'Engineering' },
  { title: 'C++ Developer', category: 'Engineering' },
  { title: '.NET Developer', category: 'Engineering' },
  { title: 'DevOps Engineer', category: 'Engineering' },
  { title: 'Senior DevOps Engineer', category: 'Engineering' },
  { title: 'Site Reliability Engineer (SRE)', category: 'Engineering' },
  { title: 'Cloud Engineer', category: 'Engineering' },
  { title: 'Senior Cloud Engineer', category: 'Engineering' },
  // Data & Analytics
  { title: 'Data Engineer', category: 'Data' },
  { title: 'Senior Data Engineer', category: 'Data' },
  { title: 'Data Scientist', category: 'Data' },
  { title: 'Senior Data Scientist', category: 'Data' },
  { title: 'Data Analyst', category: 'Data' },
  { title: 'Senior Data Analyst', category: 'Data' },
  { title: 'Business Analyst', category: 'Data' },
  { title: 'Senior Business Analyst', category: 'Data' },
  { title: 'Machine Learning Engineer', category: 'Data' },
  { title: 'Senior ML Engineer', category: 'Data' },
  { title: 'AI Engineer', category: 'Data' },
  { title: 'MLOps Engineer', category: 'Data' },
  { title: 'Analytics Engineer', category: 'Data' },
  { title: 'Business Intelligence Engineer', category: 'Data' },
  { title: 'Data Architect', category: 'Data' },
  // Product & Design
  { title: 'Product Manager', category: 'Product' },
  { title: 'Senior Product Manager', category: 'Product' },
  { title: 'Principal Product Manager', category: 'Product' },
  { title: 'Associate Product Manager', category: 'Product' },
  { title: 'Product Owner', category: 'Product' },
  { title: 'Senior Product Owner', category: 'Product' },
  { title: 'UX Designer', category: 'Design' },
  { title: 'Senior UX Designer', category: 'Design' },
  { title: 'UI Designer', category: 'Design' },
  { title: 'Senior UI Designer', category: 'Design' },
  { title: 'Product Designer', category: 'Design' },
  { title: 'Senior Product Designer', category: 'Design' },
  { title: 'Design Lead', category: 'Design' },
  { title: 'Creative Director', category: 'Design' },
  // QA & Testing
  { title: 'QA Engineer', category: 'QA' },
  { title: 'Senior QA Engineer', category: 'QA' },
  { title: 'Test Engineer', category: 'QA' },
  { title: 'Senior Test Engineer', category: 'QA' },
  { title: 'QA Lead', category: 'QA' },
  { title: 'Test Lead', category: 'QA' },
  { title: 'Automation Engineer', category: 'QA' },
  { title: 'Senior Automation Engineer', category: 'QA' },
  { title: 'SDET (Software Development Engineer in Test)', category: 'QA' },
  { title: 'Senior SDET', category: 'QA' },
  // Management
  { title: 'Engineering Manager', category: 'Management' },
  { title: 'Senior Engineering Manager', category: 'Management' },
  { title: 'Engineering Director', category: 'Management' },
  { title: 'VP of Engineering', category: 'Management' },
  { title: 'CTO', category: 'Management' },
  { title: 'Technical Lead', category: 'Management' },
  { title: 'Tech Lead', category: 'Management' },
  { title: 'Team Lead', category: 'Management' },
  { title: 'Project Manager', category: 'Management' },
  { title: 'Senior Project Manager', category: 'Management' },
  { title: 'Program Manager', category: 'Management' },
  { title: 'Delivery Manager', category: 'Management' },
  { title: 'Senior Delivery Manager', category: 'Management' },
  { title: 'Account Manager', category: 'Management' },
  // Security
  { title: 'Security Engineer', category: 'Security' },
  { title: 'Senior Security Engineer', category: 'Security' },
  { title: 'Security Architect', category: 'Security' },
  { title: 'Cybersecurity Analyst', category: 'Security' },
  { title: 'Information Security Engineer', category: 'Security' },
  { title: 'Penetration Tester', category: 'Security' },
  // Others
  { title: 'Solution Architect', category: 'Architecture' },
  { title: 'Senior Solution Architect', category: 'Architecture' },
  { title: 'Technical Architect', category: 'Architecture' },
  { title: 'System Architect', category: 'Architecture' },
  { title: 'Enterprise Architect', category: 'Architecture' },
  { title: 'Sales Engineer', category: 'Sales' },
  { title: 'Pre-Sales Engineer', category: 'Sales' },
  { title: 'Customer Success Manager', category: 'Customer Success' },
  { title: 'Technical Writer', category: 'Documentation' },
  { title: 'Technical Program Manager', category: 'Management' },
  { title: 'Scrum Master', category: 'Management' },
  { title: 'Agile Coach', category: 'Management' },
  { title: 'IT Consultant', category: 'Consulting' },
  { title: 'Senior IT Consultant', category: 'Consulting' },
  { title: 'Database Administrator', category: 'IT' },
  { title: 'DBA', category: 'IT' },
  { title: 'Network Engineer', category: 'IT' },
  { title: 'System Administrator', category: 'IT' },
  { title: 'IT Support Engineer', category: 'IT' },
  { title: 'Help Desk Technician', category: 'IT' },
  { title: 'Business Development Manager', category: 'Business' },
  { title: 'Sales Manager', category: 'Sales' },
  { title: 'Marketing Manager', category: 'Marketing' },
  { title: 'Digital Marketing Manager', category: 'Marketing' },
  { title: 'Content Manager', category: 'Marketing' },
  { title: 'Social Media Manager', category: 'Marketing' },
  { title: 'HR Manager', category: 'HR' },
  { title: 'Recruiter', category: 'HR' },
  { title: 'Finance Manager', category: 'Finance' },
  { title: 'Accountant', category: 'Finance' },
  { title: 'Operations Manager', category: 'Operations' },
  { title: 'Supply Chain Manager', category: 'Operations' },
];

async function seedCommonData() {
  try {
    console.log('🌱 Starting common data seed...');
    
    await AppDataSource.initialize();
    console.log('✅ Database connection established');

    const cityRepository = AppDataSource.getRepository(City);
    const companyRepository = AppDataSource.getRepository(Company);
    const designationRepository = AppDataSource.getRepository(Designation);

    // Seed Cities with priority
    console.log('🏙️  Seeding cities...');
    const cityEntities = [];
    
    // Add top cities first
    topCities.forEach(city => {
      cityEntities.push(
        cityRepository.create({ 
          name: city.name, 
          priority: city.priority,
          isActive: true 
        })
      );
    });
    
    // Add tier 2 cities
    tier2Cities.forEach((cityName, index) => {
      cityEntities.push(
        cityRepository.create({ 
          name: cityName, 
          priority: 11 + index,
          isActive: true 
        })
      );
    });
    
    // Add other cities
    otherCities.forEach((cityName, index) => {
      cityEntities.push(
        cityRepository.create({ 
          name: cityName, 
          priority: 31 + index,
          isActive: true 
        })
      );
    });
    
    await cityRepository.save(cityEntities);
    console.log(`✅ Seeded ${cityEntities.length} cities (${topCities.length} top cities, ${tier2Cities.length} tier 2, ${otherCities.length} others)`);

    // Seed Companies
    console.log('🏢 Seeding companies...');
    const companyEntities = companies.map(company => 
      companyRepository.create({ 
        name: company.name, 
        category: company.category,
        isActive: true 
      })
    );
    await companyRepository.save(companyEntities);
    console.log(`✅ Seeded ${companyEntities.length} companies`);

    // Seed Designations
    console.log('💼 Seeding designations...');
    const designationEntities = designations.map(designation => 
      designationRepository.create({ 
        title: designation.title, 
        category: designation.category,
        isActive: true 
      })
    );
    await designationRepository.save(designationEntities);
    console.log(`✅ Seeded ${designationEntities.length} designations`);

    console.log('\n🎉 Common data seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding common data:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

seedCommonData();

