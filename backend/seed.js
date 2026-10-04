require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("./config/db");
const Hospital = require("./models/Hospital");

const hospitals = [
  {
    name: "CarePlus Multispeciality Hospital",
    address: "Main Road, Eluru, Andhra Pradesh",
    phone: "08812245678",
    timings: "8:00 AM – 10:00 PM",
    openTime: "08:00",
    closeTime: "22:00",
    emergency24x7: true,
    departments: ["General Medicine", "Cardiology", "Orthopedics", "Pediatrics", "Emergency"],
    location: { lat: 16.7107, lng: 81.0952 },
    tokens: { total: 40, current: 12, available: 18, wait: 35 }
  },
  {
    name: "Sri Lakshmi Hospital",
    address: "Power Peta, Eluru, Andhra Pradesh",
    phone: "08812231234",
    timings: "9:00 AM – 9:00 PM",
    openTime: "09:00",
    closeTime: "21:00",
    emergency24x7: false,
    departments: ["General Medicine", "Pediatrics", "Orthopedics"],
    location: { lat: 16.7152, lng: 81.1005 },
    tokens: { total: 30, current: 21, available: 9, wait: 50 }
  },
  {
    name: "LifeLine Emergency Care",
    address: "Santhi Nagar, Eluru, Andhra Pradesh",
    phone: "08812299999",
    timings: "Open 24 hours",
    openTime: "00:00",
    closeTime: "23:59",
    open24Hours: true,
    emergency24x7: true,
    departments: ["Emergency", "General Medicine", "Cardiology"],
    location: { lat: 16.7195, lng: 81.0877 },
    tokens: { total: 50, current: 25, available: 25, wait: 20 }
  },
  {
    name: "Mediview Clinic",
    address: "Ashok Nagar, Eluru, Andhra Pradesh",
    phone: "08812245111",
    timings: "10:00 AM – 7:00 PM",
    openTime: "10:00",
    closeTime: "19:00",
    emergency24x7: false,
    departments: ["General Medicine", "Pediatrics"],
    location: { lat: 16.7035, lng: 81.1088 },
    tokens: { total: 25, current: 25, available: 0, wait: 0 }
  },
  {
    name: "City Heart & Bone Centre",
    address: "R.R. Peta, Eluru, Andhra Pradesh",
    phone: "08812276543",
    timings: "8:30 AM – 8:30 PM",
    openTime: "08:30",
    closeTime: "20:30",
    emergency24x7: false,
    departments: ["Cardiology", "Orthopedics"],
    location: { lat: 16.7271, lng: 81.0934 },
    tokens: { total: 20, current: 14, available: 6, wait: 65 }
  },
  {
    name: "Apollo Community Hospital",
    address: "Tadepalligudem Road, Eluru, Andhra Pradesh",
    phone: "08812288888",
    timings: "Open 24 hours",
    openTime: "00:00",
    closeTime: "23:59",
    open24Hours: true,
    emergency24x7: true,
    departments: ["Emergency", "General Medicine", "Cardiology", "Orthopedics"],
    location: { lat: 16.6954, lng: 81.0741 },
    tokens: { total: 60, current: 29, available: 31, wait: 25 }
  }
];

async function seed() {
  await connectDB();

  await Hospital.deleteMany({});
  await Hospital.insertMany(hospitals);

  console.log(`Inserted ${hospitals.length} hospitals`);
  await mongoose.disconnect();
}

seed().catch(async error => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
