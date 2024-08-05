import { uploadImageToS3, deleteImageFromS3 } from "../helpers/upload.js";
import { sendContactEmailToAgent } from "../helpers/email.js";
import { geocodeAddress } from "../helpers/google.js";
import { incrementViewCount } from "../helpers/ad.js";
import Ad from "../models/ad.js";
import User from "../models/user.js";
import { nanoid } from "nanoid";
import slugify from "slugify";

export const uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.json({ error: "Image is required" });
    }
    // if only one file is uploaded, multer returns it as a simple object, not array
    const files = Array.isArray(req.files) ? req.files : [req.files];

    // upload image to s3
    const results = await uploadImageToS3(files, req.user._id);
    // console.log("upload results => ", results);
    res.json(results);
  } catch (err) {
    console.log(err);
    res.json({
      error: "Upload image failed",
    });
  }
};

export const removeImage = async (req, res) => {
  try {
    const { Key, uploadedBy } = req.body;

    // check if the current user id matches the uploadedBy id
    if (req.user._id !== uploadedBy) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      await deleteImageFromS3(Key);
      return res.json({ success: true });
    } catch (err) {
      console.log(err);
      res.json({
        error: "Remove image failed",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      error: "Remove image failed",
    });
  }
};

export const createAd = async (req, res) => {
  try {
    const {
      photos,
      description,
      address,
      propertyType,
      price,
      landsize,
      landsizetype,
      action,
    } = req.body;

    // helper function to send error message
    const isRequired = (v) => {
      res.json({ errror: `${v} is required` });
    };

    if (!photos || photos.length === 0) return isRequired("Photos");
    if (!description) return isRequired("Description");
    if (!address.trim()) return isRequired("Address");
    if (!propertyType) return isRequired("Property Type");
    if (!price) return isRequired("Price");
    if (!action) return isRequired("Action");

    if (propertyType === "Land") {
      if (!landsize) return isRequired("Landsize");
      if (!landsizetype) return isRequired("Landsize Type");
    }

    const { location, googleMap } = await geocodeAddress(address);

    try {
      const ad = new Ad({
        ...req.body,
        slug: slugify(
          `${propertyType}-for-${action}-address-${address}-price-${price}-${nanoid(
            6
          )}`
        ),
        postedBy: req.user._id,
        location: {
          type: "Point",
          coordinates: [location.coordinates[0], location.coordinates[1]],
        },
        googleMap,
      });
      await ad.save();

      // update user role to seller
      const user = await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { role: "Seller" },
      });
      user.password = undefined;

      // res.json({ ok: true });
      res.json({ ad, user });
    } catch (err) {
      console.log(err);
      res.json({
        error: "Create ad failed",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      error: "Create ad failed",
    });
  }
};

export const read = async (req, res) => {
  try {
    const { slug } = req.params;

    const ad = await Ad.findOne({ slug })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company photo logo");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // related ads
    const related = await Ad.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: ad.location.coordinates,
          },
          distanceField: "dist.calculated",
          maxDistance: 50000, // 50km
          spherical: true,
        },
      },
      {
        $match: {
          _id: { $ne: ad._id },
          action: ad.action,
          propertyType: ad.propertyType,
        },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          googleMap: 0,
        },
      },
    ]);

    // to populate postedBy in related ads
    const relatedWithPopulatedPostedBy = await Ad.populate(related, {
      path: "postedBy",
      select: "name username email phone company photo logo",
    });

    // increment view count
    incrementViewCount(ad._id);

    res.json({ ad, related: relatedWithPopulatedPostedBy });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const adsForSell = async (req, res) => {
  try {
    const page = req.params.page || 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;
    const totalAds = await Ad.countDocuments({ action: "Sell" });

    const ads = await Ad.find({ action: "Sell" })
      .populate("postedBy", "name username email phone company photo logo")
      .select("-googleMap")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.json({ ads, page, totalPages: Math.ceil(totalAds / pageSize) });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const adsForRent = async (req, res) => {
  try {
    const page = req.params.page || 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;
    const totalAds = await Ad.countDocuments({ action: "Rent" });

    const ads = await Ad.find({ action: "Rent" })
      .populate("postedBy", "name username email phone company photo logo")
      .select("-googleMap")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);

    res.json({ ads, page, totalPages: Math.ceil(totalAds / pageSize) });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const updateAd = async (req, res) => {
  try {
    const { slug } = req.params;

    const {
      photos,
      description,
      address,
      propertyType,
      price,
      landsize,
      landsizetype,
      action,
    } = req.body;

    // helper function to send error message
    const isRequired = (v) => {
      res.json({ errror: `${v} is required` });
    };

    if (!photos || photos.length === 0) return isRequired("Photos");
    if (!description) return isRequired("Description");
    if (!address.trim()) return isRequired("Address");
    if (!propertyType) return isRequired("Property Type");
    if (!price) return isRequired("Price");
    if (!action) return isRequired("Action");

    if (propertyType === "Land") {
      if (!landsize) return isRequired("Landsize");
      if (!landsizetype) return isRequired("Landsize Type");
    }

    // find ad by slug
    const ad = await Ad.findOne({ slug }).populate("postedBy", "_id");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // check if the logged in user is the owner of the ad
    if (ad.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { location, googleMap } = await geocodeAddress(address);

    try {
      const updatedAd = await Ad.findOneAndUpdate(
        { slug },
        {
          ...req.body,
          slug: slugify(
            `${propertyType}-for-${action}-address-${address}-price-${price}-${nanoid(
              6
            )}`
          ),
          location: {
            type: "Point",
            coordinates: [location.coordinates[0], location.coordinates[1]],
          },
          googleMap,
        },
        { new: true }
      );

      // res.json({ ok: true });
      res.json(updatedAd);
    } catch (err) {
      console.log(err);
      res.json({
        error: "Update ad failed",
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      error: "Create ad failed",
    });
  }
};

export const deleteAd = async (req, res) => {
  try {
    const { slug } = req.params;

    // find ad by slug
    const ad = await Ad.findOne({ slug }).populate("postedBy", "_id");

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // check if the logged in user is the owner of the ad
    if (ad.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const deletedAd = await Ad.deleteOne({ slug });
    // res.json(deletedAd);
    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Delete ad failed",
    });
  }
};

export const userAds = async (req, res) => {
  try {
    const page = req.params.page ? req.params.page : 1;
    const pageSize = 2;
    const skip = (page - 1) * pageSize;
    const totalAds = await Ad.countDocuments({ postedBy: req.user._id });

    const ads = await Ad.find({ postedBy: req.user._id })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company photo logo")
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    return res.json({
      ads,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const updateAdStatus = async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    const ad = await Ad.findOne({ slug });

    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // check if the logged in user is the owner of the ad
    if (ad.postedBy._id.toString() !== req.user._id.toString()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    ad.status = status;
    await ad.save();

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to update status. Try again.",
    });
  }
};

export const contactAgent = async (req, res) => {
  try {
    const { adId, message } = req.body;

    const ad = await Ad.findById(adId).populate("postedBy");
    if (!ad) {
      return res.status(404).json({ error: "Ad not found" });
    }

    // add ad to user's enquiredProperties list
    const user = await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { enquiredProperties: adId },
    });

    // send contact email to agent with user email name phone message and ad link
    await sendContactEmailToAgent(ad, user, message);

    res.json({ ok: true });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to contact agent. Try again.",
    });
  }
};

export const enquiredAds = async (req, res) => {
  try {
    const page = req.params.page ? parseInt(req.params.page) : 1;
    const pageSize = 2;

    const skip = (page - 1) * pageSize;

    const user = await User.findById(req.user._id); // user.enquiredProperties

    const totalAds = await Ad.countDocuments({
      _id: { $in: user.enquiredProperties },
    });

    const ads = await Ad.find({ _id: { $in: user.enquiredProperties } })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company photo logo")
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    res.json({ ads, page, totalPages: Math.ceil(totalAds / pageSize) });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const toggleWishlist = async (req, res) => {
  try {
    const adId = req.params.adId;
    const userId = req.user._id;

    // find the user
    const user = await User.findById(userId);

    // check if the adId is in the user's wishlist
    const isInWishlist = user.wishlist.includes(adId);

    // toggle wishlist
    const update = isInWishlist
      ? { $pull: { wishlist: adId } }
      : { $addToSet: { wishlist: adId } };

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
    });

    res.json({
      ok: true,
      message: isInWishlist
        ? "Ad removed from wishlist"
        : "Ad added to wishlist",
      wishlist: updatedUser.wishlist,
    });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to toggle wishlist. Try again.",
    });
  }
};

export const wishlist = async (req, res) => {
  try {
    const page = req.params.page ? parseInt(req.params.page) : 1;
    const pageSize = 2;

    const skip = (page - 1) * pageSize;

    const user = await User.findById(req.user._id); // user.wishlist[1,2,3]

    const totalAds = await Ad.countDocuments({ _id: { $in: user.wishlist } });

    const ads = await Ad.find({ _id: { $in: user.wishlist } })
      .select("-googleMap")
      .populate("postedBy", "name username email phone company photo logo")
      .skip(skip)
      .limit(pageSize)
      .sort({ createdAt: -1 });

    res.json({ ads, page, totalPages: Math.ceil(totalAds / pageSize) });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to fetch. Try again.",
    });
  }
};

export const searchAds = async (req, res) => {
  try {
    const {
      address,
      price,
      page = 1,
      action,
      propertyType,
      bedrooms,
      bathrooms,
    } = req.body;

    const pageSize = 2;

    if (!address) {
      return res.json({ error: "Address is required" });
    }

    // geocode the address to get coordinates
    let geo = await geocodeAddress(address);

    // function to check if a value is a numeric
    const isNumeric = (value) => {
      return !isNaN(value) && !isNaN(parseFloat(value));
    };

    // construct query object with all search parameters
    let query = {
      location: {
        $geoWithin: {
          $centerSphere: [
            [geo.location.coordinates[0], geo.location.coordinates[1]],
            10 / 6378,
          ], // 10km radius, converted to radius
        },
      },
    };

    if (action) {
      query.action = action;
    }
    if (propertyType && propertyType !== "All") {
      query.propertyType = propertyType;
    }
    if (bedrooms && bedrooms !== "All") {
      query.bedrooms = bedrooms;
    }
    if (bathrooms && bathrooms !== "All") {
      query.bathrooms = bathrooms;
    }

    // add price range filter to the query only if its a valid number
    if (isNumeric(price)) {
      const numericPrice = parseFloat(price);
      const minPrice = numericPrice * 0.8;
      const maxPrice = numericPrice * 1.2;

      query.price = {
        $regex: new RegExp(`^(${minPrice.toFixed(0)}|${maxPrice.toFixed(0)})$`),
      };
    }

    const ads = await Ad.find(query)
      .limit(pageSize)
      .skip((page - 1) * pageSize)
      .sort({ createdAt: -1 })
      .select("-googleMap");

    // count total matching ads for pagination
    const totalAds = await Ad.countDocuments(query);

    return res.json({
      ads,
      total: totalAds,
      page,
      totalPages: Math.ceil(totalAds / pageSize),
    });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to search. Try again.",
    });
  }
};

// admin function
export const togglePublished = async (req, res) => {
  try {
    const { adId } = req.params;
    const ad = await Ad.findById(adId);

    // update the published status
    const updatedAd = await Ad.findByIdAndUpdate(
      adId,
      {
        published: ad.published ? false : true,
      },
      { new: true }
    );

    res.json({
      ok: true,
      message: ad.published ? "Ad upublished" : "Ad published",
      ad: updatedAd,
    });
  } catch (err) {
    console.log(err);
    res.json({
      error: "Failed to toggle published. Try again.",
    });
  }
};
