import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The client operates a single jet ski type, rented as identical units.
const jetSkis = [
  {
    name: "Sea-Doo Spark Trixx",
    model: "2023 Sea-Doo Spark Trixx",
    horsepower: 90,
    seats: 2,
    description:
      "Our 2023 Sea-Doo Spark Trixx is light, playful, and easy to ride, powered by a Rotax 900 ACE engine. Reverse and Sport Mode make it a breeze to handle for first-timers, and nimble enough to keep experienced riders grinning. Seats two, with a handy storage compartment for the essentials.",
    imageUrl: "/photos/ride-action.jpg",
    hourlyRate: 12000, // $120 / hour
    halfDayRate: 48000, // $480 / 4 hours
    fullDayRate: 96000, // $960 / 8 hours
    weekendRate: 160000, // $1,600 / 2 days
    depositAmount: 100000, // $1,000 refundable free-range security deposit (in person)
    featured: true,
  },
];

const safetyFaq = {
  title: "Safety & FAQ",
  intro:
    "Everything you need to know before you ride. If your question is not answered here, call or message us and a real person will help.",
  sections: [
    {
      heading: "Licensing and requirements",
      items: [
        {
          q: "Do I need a licence to rent a jet ski in Ottawa?",
          a: "You need proof of competency to operate. A Pleasure Craft Operator Card (PCOC) is ideal. If you do not have one, we complete a Rental Boat Safety Checklist with you before you ride, as permitted by Transport Canada. Allow an extra 15 minutes for this.",
        },
        {
          q: "What is the minimum age?",
          a: "You must be 18 or older to rent and operate. Passengers of any age are welcome with a properly fitted life jacket.",
        },
        {
          q: "What identification do I need?",
          a: "A valid government-issued photo ID for the renter, plus your PCOC if you have one.",
        },
      ],
    },
    {
      heading: "Riding area and deposit",
      items: [
        {
          q: "Do I have to pay a security deposit?",
          a: "It depends on where you ride. If you stay within our designated riding area, there is no security deposit. You simply pay the rental fee, complete the waiver, and receive your safety briefing.",
        },
        {
          q: "What if I want to ride outside the designated area?",
          a: "Free range riding is available with a refundable $1,000 security deposit per jet ski. We collect it in person before you launch and return it in full once the jet ski is back safely.",
        },
        {
          q: "What is included with every rental?",
          a: "Transport Canada approved life jackets, a full safety briefing, and all required equipment. Fuel use is included in the price.",
        },
      ],
    },
    {
      heading: "Cancellation and weather",
      items: [
        {
          q: "What is your cancellation policy?",
          a: "Please cancel at least 12 hours in advance for a full refund.",
        },
        {
          q: "What happens in bad weather?",
          a: "Your safety is our top priority. Rentals proceed in light rain and normal conditions. We may cancel or delay for thunderstorms or lightning, high winds, severe weather warnings, or any conditions our staff consider unsafe. If we cancel due to unsafe weather, you may reschedule at no additional cost or receive a full refund.",
        },
        {
          q: "What if the weather is fine but I choose not to come?",
          a: "If it is safe to ride but you choose not to attend, the booking is treated as a customer cancellation and the standard 12-hour cancellation policy applies. Weather decisions are made by Bros Jetskis Rental based on local conditions at the riding location.",
        },
      ],
    },
    {
      heading: "On the water",
      items: [
        {
          q: "How many people can ride?",
          a: "Each Sea-Doo Spark Trixx seats two. Passengers ride free. Only the operator needs proof of competency.",
        },
        {
          q: "What should I wear?",
          a: "Swimwear or quick-dry clothing, secure footwear or bare feet, and sunscreen. Leave valuables in your car. Each jet ski has a small storage compartment for a phone and keys.",
        },
        {
          q: "When are you open?",
          a: "Monday to Sunday, 9:00 AM to sunset, from May through September.",
        },
      ],
    },
  ],
};

// Starter gallery seeded from the client's real photos and videos. The owner
// can add/remove/reorder these from Admin > Gallery.
const galleryMedia = [
  { url: "/photos/ride-action.jpg", caption: "Out on the Ottawa River", type: "image", sortOrder: 0 },
  { url: "/videos/hero.mp4", caption: "Full throttle on the water", type: "video", sortOrder: 1 },
  { url: "/photos/lineup-sunset.jpg", caption: "Sunset lineup at Blair Boat Launch", type: "image", sortOrder: 2 },
  { url: "/videos/ride-1.mp4", caption: "Cruising at golden hour", type: "video", sortOrder: 3 },
  { url: "/photos/beach-trio.jpg", caption: "Ready to ride", type: "image", sortOrder: 4 },
  { url: "/videos/ride-2.mp4", caption: "Making memories", type: "video", sortOrder: 5 },
  { url: "/photos/spark-duo.jpg", caption: "Sea-Doo Spark, built for two", type: "image", sortOrder: 6 },
];

const contactInfo = {
  name: "Bros Jetskis Rental",
  address: "Blair Boat Launch, Ottawa, Ontario",
  phone: "+1 (343) 324-0433",
  instagram: "Bros_jetskis_rental",
  tiktok: "bros_jetskis_rent",
  hours: [
    { days: "Monday to Sunday", hours: "9:00 AM to sunset" },
    { days: "Season", hours: "May through September" },
  ],
};

async function main() {
  // Idempotent-ish: wipe and re-seed reference data (dev convenience).
  await prisma.waiver.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.blockedDate.deleteMany();
  await prisma.jetSki.deleteMany();
  await prisma.review.deleteMany();
  await prisma.adminUser.deleteMany();
  await prisma.siteContent.deleteMany();
  await prisma.galleryMedia.deleteMany();

  const created = [];
  for (const js of jetSkis) created.push(await prisma.jetSki.create({ data: js }));
  console.log(`Seeded ${created.length} jet ski`);

  // No reviews yet, the business is new. Real reviews arrive through the
  // public review form and admin approval.
  console.log("Seeded 0 reviews (awaiting real customer reviews)");

  // Admin credentials come from the environment so production never ships the
  // dev default. Set ADMIN_EMAIL / ADMIN_PASSWORD before seeding a real deploy.
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@jetski.local").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await prisma.adminUser.create({
    data: { email: adminEmail, passwordHash, name: "Owner" },
  });
  if (!process.env.ADMIN_PASSWORD) {
    console.warn(
      "WARNING: seeded admin with the default password. Set ADMIN_PASSWORD before deploying."
    );
  }
  console.log(`Seeded admin user: ${adminEmail}`);

  await prisma.siteContent.createMany({
    data: [
      { key: "safety-faq", json: JSON.stringify(safetyFaq) },
      { key: "contact-info", json: JSON.stringify(contactInfo) },
    ],
  });
  console.log("Seeded site content (safety-faq, contact-info)");

  await prisma.galleryMedia.createMany({ data: galleryMedia });
  console.log(`Seeded ${galleryMedia.length} gallery media`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
