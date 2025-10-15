const { runToyChampBot } = require("./bots/toychamp");

runToyChampBot({
  productUrl:
    "https://www.toychamp.be/producten/nerf-super-soaker-splashmouth/01300543", // example
  shippingDetails: {
    firstName: "Ash",
    lastName: "Ketchum",
    address: "Pallet Town 1",
    postalCode: "1234",
    city: "Viridian",
    email: "ash@example.com",
    phone: "+32471234567",
  },
});
