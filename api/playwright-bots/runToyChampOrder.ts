import { chromium } from "playwright";

async function runOrder() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://www.toychamp.be/", {
    waitUntil: "domcontentloaded",
  });

  // Accept cookies if shown
  const accept = page.locator('button:has-text("Accepteren")');
  if (await accept.isVisible()) await accept.click();

  // Search for a product
  await page
    .locator('input[placeholder="Zoeken"]')
    .fill("NERF Super Soaker Splashmouth");
  await page.locator('button:has-text("Zoek")').click();
  await page.waitForLoadState("networkidle");

  // Select first product
  const first = page.locator(".product-list-item a").first();
  await first.click();
  await page.waitForLoadState("domcontentloaded");

  // Add to cart
  const addToCart = page.locator("button[data-submit-button]");
  await addToCart.waitFor({ state: "visible" });
  await addToCart.click();

  // Wait for cart popup to show
  await page.waitForSelector(".cart-popup:visible", { timeout: 5000 });

  // Go to cart
  await page.goto("https://www.toychamp.be/cart");
  await page.waitForSelector('button[name="cart-action"][value="next-step"]');
  await page.click('button[name="cart-action"][value="next-step"]');

  // Fill checkout form
  await page.fill("#billing_first_name", "Jan");
  await page.fill("#billing_last_name", "Jansen");
  await page.fill("#billing_address_1", "Straat 1");
  await page.fill("#billing_postcode", "9300");
  await page.fill("#billing_city", "Aalst");
  await page.fill("#billing_email", "jan.jansen@example.com");
  await page.fill("#billing_phone", "0471123456");

  await page.selectOption("#billing_country", "BE");

  // Agree to terms (if required)
  const terms = page.locator('input[type="checkbox"][name="terms"]');
  if (await terms.count()) await terms.check();

  // Place order
  const placeOrder = page.locator("#place_order");
  await placeOrder.click();

  // Wait for confirmation
  await page.waitForURL(/order-received/, { timeout: 15000 });
  console.log("✅ Order completed.");

  await browser.close();
}

if (require.main === module) {
  runOrder().catch((err) => {
    console.error("❌ Order failed:", err);
    process.exit(1);
  });
}
