require("dotenv").config();

const { PrismaClient } = require("../generated/prisma");
const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
const bcrypt = require("bcrypt");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not set in .env");
}

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data (optional, comment out in production)
  // await prisma.auditLog.deleteMany();
  // await prisma.config.deleteMany();
  // await prisma.wishlist.deleteMany();
  // await prisma.hold.deleteMany();
  // await prisma.rating.deleteMany();
  // await prisma.loan.deleteMany();
  // await prisma.book.deleteMany();
  // await prisma.user.deleteMany();

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const librarianPasswordHash = await bcrypt.hash("lib123", 10);
  const student1PasswordHash = await bcrypt.hash("student123", 10);
  const student2PasswordHash = await bcrypt.hash("student123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@library.com" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@library.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const librarian = await prisma.user.upsert({
    where: { email: "librarian@library.com" },
    update: {},
    create: {
      name: "Librarian User",
      email: "librarian@library.com",
      passwordHash: librarianPasswordHash,
      role: "LIBRARIAN",
    },
  });

  const student1 = await prisma.user.upsert({
    where: { email: "student1@library.com" },
    update: {},
    create: {
      name: "Student One",
      email: "student1@library.com",
      passwordHash: student1PasswordHash,
      role: "STUDENT",
      studentId: "S10001",
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "student2@library.com" },
    update: {},
    create: {
      name: "Student Two",
      email: "student2@library.com",
      passwordHash: student2PasswordHash,
      role: "STUDENT",
      studentId: "S10002",
    },
  });

  console.log("Seeded users:", {
    admin: admin.email,
    librarian: librarian.email,
    student1: student1.email,
    student2: student2.email,
  });

  const booksData = [
    // Technology (4)
    {
      title: "Clean Code",
      author: "Robert C. Martin",
      isbn: "9780132350884",
      genre: "Technology",
      cover: "/covers/clean-code.jpg",
      description: "A handbook of agile software craftsmanship.",
      language: "English",
      shelfLocation: "TECH-001",
      available: true,
      availableCopies: 3,
    },
    {
      title: "Design Patterns: Elements of Reusable Object-Oriented Software",
      author: "Erich Gamma et al.",
      isbn: "9780201633610",
      genre: "Technology",
      cover: "/covers/design-patterns.jpg",
      description: "The classic book on software design patterns.",
      language: "English",
      shelfLocation: "TECH-002",
      available: true,
      availableCopies: 2,
    },
    {
      title: "Refactoring: Improving the Design of Existing Code",
      author: "Martin Fowler",
      isbn: "9780201485677",
      genre: "Technology",
      cover: "/covers/refactoring.jpg",
      description: "Guide to refactoring techniques and patterns.",
      language: "English",
      shelfLocation: "TECH-003",
      available: false,
      availableCopies: 0,
    },
    {
      title: "The Pragmatic Programmer",
      author: "Andrew Hunt, David Thomas",
      isbn: "9780201616224",
      genre: "Technology",
      cover: "/covers/the-pragmatic-programmer.jpg",
      description: "Best practices and practical tips for programmers.",
      language: "English",
      shelfLocation: "TECH-004",
      available: true,
      availableCopies: 4,
    },

    // Fiction (4)
    {
      title: "To Kill a Mockingbird",
      author: "Harper Lee",
      isbn: "9780061120084",
      genre: "Fiction",
      cover: "/covers/to-kill-a-mockingbird.jpg",
      description: "A classic novel about racial injustice in the Deep South.",
      language: "English",
      shelfLocation: "FIC-001",
      available: true,
      availableCopies: 2,
    },
    {
      title: "1984",
      author: "George Orwell",
      isbn: "9780451524935",
      genre: "Fiction",
      cover: "/covers/1984.jpg",
      description: "Dystopian novel about surveillance and totalitarianism.",
      language: "English",
      shelfLocation: "FIC-002",
      available: false,
      availableCopies: 0,
    },
    {
      title: "The Great Gatsby",
      author: "F. Scott Fitzgerald",
      isbn: "9780743273565",
      genre: "Fiction",
      cover: "/covers/the-great-gatsby.jpg",
      description: "A story of wealth, love, and the American Dream.",
      language: "English",
      shelfLocation: "FIC-003",
      available: true,
      availableCopies: 3,
    },
    {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      isbn: "9780141439518",
      genre: "Fiction",
      cover: "/covers/pride-and-prejudice.jpg",
      description: "A romantic novel about manners and marriage.",
      language: "English",
      shelfLocation: "FIC-004",
      available: true,
      availableCopies: 2,
    },

    // Science (4)
    {
      title: "A Brief History of Time",
      author: "Stephen Hawking",
      isbn: "9780553380163",
      genre: "Science",
      cover: "/covers/a-brief-history-of-time.jpg",
      description: "An overview of cosmology and the universe.",
      language: "English",
      shelfLocation: "SCI-001",
      available: true,
      availableCopies: 2,
    },
    {
      title: "The Selfish Gene",
      author: "Richard Dawkins",
      isbn: "9780198788607",
      genre: "Science",
      cover: "/covers/the-selfish-gene.jpg",
      description: "Evolutionary biology and the gene-centered view of evolution.",
      language: "English",
      shelfLocation: "SCI-002",
      available: false,
      availableCopies: 0,
    },
    {
      title: "The Origin of Species",
      author: "Charles Darwin",
      isbn: "9781509827695",
      genre: "Science",
      cover: "/covers/the-origin-of-species.jpg",
      description: "Darwin's foundational work on evolution.",
      language: "English",
      shelfLocation: "SCI-003",
      available: true,
      availableCopies: 2,
    },
    {
      title: "Cosmos",
      author: "Carl Sagan",
      isbn: "9780345539434",
      genre: "Science",
      cover: "/covers/cosmos.jpg",
      description: "A journey through the universe and humanity's place in it.",
      language: "English",
      shelfLocation: "SCI-004",
      available: true,
      availableCopies: 3,
    },

    // History (4)
    {
      title: "Guns, Germs, and Steel",
      author: "Jared Diamond",
      isbn: "9780393354324",
      genre: "History",
      cover: "/covers/guns-germs-and-steel.jpg",
      description: "Explores factors that shaped human societies.",
      language: "English",
      shelfLocation: "HIS-001",
      available: true,
      availableCopies: 2,
    },
    {
      title: "The History of the Ancient World",
      author: "Susan Wise Bauer",
      isbn: "9780393059748",
      genre: "History",
      cover: "/covers/the-history-of-the-ancient-world.jpg",
      description: "A narrative history from the earliest accounts to the fall of Rome.",
      language: "English",
      shelfLocation: "HIS-002",
      available: true,
      availableCopies: 2,
    },
    {
      title: "The Second World War",
      author: "Antony Beevor",
      isbn: "9780316023740",
      genre: "History",
      cover: "/covers/the-second-world-war.jpg",
      description: "Comprehensive history of World War II.",
      language: "English",
      shelfLocation: "HIS-003",
      available: false,
      availableCopies: 0,
    },
    {
      title: "Sapiens: A Brief History of Humankind",
      author: "Yuval Noah Harari",
      isbn: "9780062316097",
      genre: "History",
      cover: "/covers/sapiens.jpg",
      description: "Explores the history and impact of Homo sapiens.",
      language: "English",
      shelfLocation: "HIS-004",
      available: true,
      availableCopies: 4,
    },

    // Management (4)
    {
      title: "The Lean Startup",
      author: "Eric Ries",
      isbn: "9780307887894",
      genre: "Management",
      cover: "/covers/the-lean-startup.jpg",
      description: "How today's entrepreneurs use continuous innovation.",
      language: "English",
      shelfLocation: "MGT-001",
      available: true,
      availableCopies: 3,
    },
    {
      title: "Good to Great",
      author: "Jim Collins",
      isbn: "9780066620992",
      genre: "Management",
      cover: "/covers/good-to-great.jpg",
      description: "Why some companies make the leap and others don't.",
      language: "English",
      shelfLocation: "MGT-002",
      available: false,
      availableCopies: 0,
    },
    {
      title: "Leaders Eat Last",
      author: "Simon Sinek",
      isbn: "9781591848011",
      genre: "Management",
      cover: "/covers/leaders-eat-last.jpg",
      description: "Why some teams pull together and others don't.",
      language: "English",
      shelfLocation: "MGT-003",
      available: true,
      availableCopies: 2,
    },
    {
      title: "Thinking, Fast and Slow",
      author: "Daniel Kahneman",
      isbn: "9780374533557",
      genre: "Management",
      cover: "/covers/thinking-fast-and-slow.jpg",
      description: "Explores the two systems that drive the way we think.",
      language: "English",
      shelfLocation: "MGT-004",
      available: true,
      availableCopies: 3,
    },
  ];

  if (booksData.length !== 20) {
    throw new Error(`Expected 20 books, got ${booksData.length}`);
  }

  const books = await prisma.book.createMany({
    data: booksData,
  });

  console.log(`Seeded books: ${books.count}`);

  const config = await prisma.config.upsert({
    where: { key: "FINE_DAILY_RATE" },
    update: {
      value: "1.00",
    },
    create: {
      key: "FINE_DAILY_RATE",
      value: "1.00",
    },
  });

  console.log("Seeded config:", config);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
