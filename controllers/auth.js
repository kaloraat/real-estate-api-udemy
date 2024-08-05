import { sendWelcomeEmail, sendPasswordResetEmail } from "../helpers/email.js";
import validator from "email-validator";
import User from "../models/user.js";
import { hashPassword, comparePassword } from "../helpers/auth.js";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";

export const api = (req, res) => {
  res.send(`The current time is ${new Date().toLocaleDateString()}`);
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!validator.validate(email)) {
    return res.json({ error: "A valid email is required" });
  }

  if (!email?.trim()) {
    return res.json({ error: "Email is required" });
  }

  if (!password?.trim()) {
    return res.json({ error: "Password is required" });
  }

  if (password?.length < 6) {
    return res.json({ error: "Password must be at least 6 characters long" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      try {
        await sendWelcomeEmail(email);
        const createdUser = await User.create({
          email,
          password: await hashPassword(password),
          username: nanoid(6),
        });

        const token = jwt.sign(
          { _id: createdUser._id },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        createdUser.password = undefined;

        res.json({
          token,
          user: createdUser,
        });
      } catch (err) {
        console.log(err);
        return res.json({
          error: "Invalid email. Please use a valid email address",
        });
      }
    } else {
      // compare password then login
      const match = await comparePassword(password, user.password);

      if (!match) {
        return res.json({
          error: "Wrong password",
        });
      } else {
        const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });

        user.password = undefined;

        res.json({
          token,
          user,
        });
      }
    }
  } catch (err) {
    console.log("Login error", err);
    res.json({
      error: "Something went wrong. Try again.",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.json({
        error:
          "If we find your account, you will reveive an email from us shortly",
      });
    } else {
      const password = nanoid(6);
      user.password = await hashPassword(password);
      await user.save();

      // send email
      try {
        await sendPasswordResetEmail(email, password);
        return res.json({
          message: "Password reset link has been sent to your email",
        });
      } catch (err) {
        console.log("Error sending password reset email => ", err);
        return res.json({
          error:
            "If we find your account, you will reveive an email from us shortly",
        });
      }
    }
  } catch (err) {
    console.log("Forgot password error", err);
    res.json({
      error: "Something went wrong. Try again.",
    });
  }
};

export const currentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.password = undefined;
    res.json({ user });
  } catch (err) {
    console.log("Current user error", err);
    res.json({
      error: "Something went wrong. Try again.",
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    let { password } = req.body;

    // trim password
    password = password ? password.trim() : "";

    if (!password) {
      return res.json({ error: "Password is required" });
    }

    if (password.length < 6) {
      return res.json({ error: "Password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user._id);
    const hashedPassword = await hashPassword(password);

    // user.password = hashedPassword;
    // user.save();
    await User.findByIdAndUpdate(req.user._id, { password: hashedPassword });

    res.json({ ok: true });
  } catch (err) {
    console.log("Update password error", err);
    res.json({
      error: "Something went wrong. Try again.",
    });
  }
};

export const updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.json({ error: "Username is required" });
    }

    const trimmedUsername = username.trim();

    // check if the username is already taken by another user
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.json({
        error: "Username is already taken. Try another one",
      });
    }

    // update the username
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        username: trimmedUsername,
      },
      { new: true }
    );

    updatedUser.password = undefined;

    res.json(updatedUser);
  } catch (err) {
    console.log(err);
    res.json({
      error: "Username is already taken. Try another one",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, phone, company, address, about, photo, logo } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (phone) updateFields.phone = phone.trim();
    if (company) updateFields.company = company.trim();
    if (address) updateFields.address = address.trim();
    if (about) updateFields.about = about.trim();
    if (photo) updateFields.photo = photo;
    if (logo) updateFields.logo = logo;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res.json({
        error: "User not found",
      });
    }

    updatedUser.password = undefined;

    res.json(updatedUser);
  } catch (err) {
    console.log("Update profile error", err);
    res.json({
      error: "Something went wrong. Try again",
    });
  }
};
