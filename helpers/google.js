import NodeGeocoder from "node-geocoder";

const geocoder = NodeGeocoder({
  provider: "google",
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  formatter: null,
});

export const geocodeAddress = async (address) => {
  try {
    const geo = await geocoder.geocode(address);

    if (!geo || !geo[0].longitude || !geo[0].latitude) {
      throw new Error("Please enter a suburb or city name");
    }

    return {
      location: {
        type: "Point",
        coordinates: [geo[0].longitude, geo[0].latitude],
      },
      googleMap: geo,
    };
  } catch (err) {
    console.error(err);
    throw new Error("Error in geocoding address");
  }
};
