const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

router.post("/login", async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    if (!/^[0-9]{10}$/.test(phone || "")) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid 10-digit phone number"
      });
    }

    if (!password || password.length < 4) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 4 characters"
      });
    }

    let user = await User.findOne({ phone });

    // Matches the current frontend's demo-login behavior:
    // first login creates the account.
    if (!user) {
      const passwordHash = await bcrypt.hash(password, 12);
      user = await User.create({ phone, passwordHash });
    } else {
      const valid = await bcrypt.compare(password, user.passwordHash);

      if (!valid) {
        return res.status(401).json({
          success: false,
          message: "Incorrect phone number or password"
        });
      }
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        phone: user.phone
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
