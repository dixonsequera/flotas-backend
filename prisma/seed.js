const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

function generateSpanishCarRegistration() {
    // Generate 4 random digits (0000–9999)
    const digits = Math.floor(1000 + Math.random() * 9000); // Ensures 4 digits
    
    // Generate 3 random uppercase letters (excluding vowels)
    const letters = Array(3)
      .fill(null)
      .map(() => {
        const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'; // No vowels
        return consonants.charAt(Math.floor(Math.random() * consonants.length));
      })
      .join('');
    
    return `${digits} ${letters}`;
  }
  

  

async function main() {
  console.log('Seeding database with random users...');
  
  for (let i = 0; i < 30; i++) {
    const name = faker.person.fullName();
    const email = faker.internet.email();
    const password = await bcrypt.hash('password123', 10);
    const registrationNumber = generateSpanishCarRegistration();
    const carBrand = faker.vehicle.manufacturer();
    const carModel = faker.vehicle.model();
    const deliveryDate = faker.date.future();
    const role = "USER";

    await prisma.user.create({
      data: {
        name,
        email,
        password,
        registrationNumber,
        carBrand,
        carModel,
        deliveryDate,
        role,
      },
    });

    console.log(`User ${i + 1} created: ${name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
