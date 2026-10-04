const router = require("express").Router();
const mongoose = require("mongoose");

const auth = require("../middleware/auth");
const Booking = require("../models/Booking");
const Hospital = require("../models/Hospital");

router.use(auth);

// GET /api/bookings
router.get("/", async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings
router.post("/", async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const {
      hospitalId,
      department,
      patientName,
      age,
      phone,
      issue,
      date,
      distance
    } = req.body;

    if (
      !hospitalId ||
      !department ||
      !patientName ||
      !age ||
      !phone ||
      !issue ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message: "All patient and appointment fields are required"
      });
    }

    if (!/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Patient phone must contain 10 digits"
      });
    }

    if (Number(age) < 1 || Number(age) > 120) {
      return res.status(400).json({
        success: false,
        message: "Age must be between 1 and 120"
      });
    }

    const appointmentDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment date"
      });
    }

    session.startTransaction();

    // Atomic update prevents two users from receiving the same token.
    const hospital = await Hospital.findOneAndUpdate(
      {
        _id: hospitalId,
        departments: department,
        "tokens.available": { $gt: 0 }
      },
      {
        $inc: {
          "tokens.available": -1,
          "tokens.current": 1
        }
      },
      {
        new: false,
        session
      }
    );

    if (!hospital) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: "No tokens are currently available for this hospital"
      });
    }

    const tokenNumber = hospital.tokens.current + 1;

    const booking = await Booking.create(
      [{
        user: req.userId,
        hospital: hospital._id,
        hospitalName: hospital.name,
        department,
        patientName: patientName.trim(),
        age: Number(age),
        phone,
        issue: issue.trim(),
        date,
        token: tokenNumber,
        wait: hospital.tokens.wait,
        distance: Number.isFinite(Number(distance))
          ? Number(distance)
          : null
      }],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Token booked successfully",
      booking: booking[0]
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    next(error);
  } finally {
    session.endSession();
  }
});

module.exports = router;
