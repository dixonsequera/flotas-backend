const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Function to make a user an admin by email
async function makeAdmin(email) {
  try {
    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      return;
    }

    // Update the user's role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    console.log(`User ${updatedUser.name} (${updatedUser.email}) is now an admin`);
    return updatedUser;
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  console.log('Usage: node scripts/make-admin.js user@example.com');
  process.exit(1);
}

// Make the user an admin
makeAdmin(email)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  }); 