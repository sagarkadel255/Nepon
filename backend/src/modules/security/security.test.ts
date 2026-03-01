import request from "supertest";
import app from "../../server";
import { User } from "../../models/User";
import { generateAccessToken } from "../../modules/auth/auth.service";
import { SecurityEvent } from "../../models/SecurityEvent";
import { LoginHistory } from "../../models/LoginHistory";

// Mongoose connection handled by src/test/setup.ts (in-memory Mongo)

beforeAll(async () => {
  await User.deleteMany({});
  await SecurityEvent.deleteMany({});
  await LoginHistory.deleteMany({});
});

// CSP Violation Report
describe("CSP Violation Reporting", () => {
  it("accepts a CSP violation report and returns 204", async () => {
    const res = await request(app)
      .post("/api/security/csp-report")
      .send({
        "csp-report": {
          "document-uri": "https://nepon.com/",
          "violated-directive": "script-src-elem",
          "blocked-uri": "https://evil.com/hack.js",
          "source-file": "https://nepon.com/page",
          "line-number": 42,
        },
      })
      .expect(204);

    const events = await SecurityEvent.find({ "metadata.type": "csp_violation" });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].metadata.directive).toBe("script-src-elem");
  });
});

// XSS Prevention
describe("XSS Prevention", () => {
  let sellerToken: string;

  beforeAll(async () => {
    const seller = await User.create({
      email: "seller-xss@example.com",
      passwordHash: "$2a$12$abcdefghijklmnopqrstuvwx",
      displayName: "XSS Seller",
      role: "seller",
      status: "active",
      isEmailVerified: true,
      authProviders: ["password"],
    });
    sellerToken = generateAccessToken(seller);
  });

  it("rejects <script> tags in product title", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        title: '<script>alert("xss")</script>Product',
        description: "Test product",
        category: "Clothing",
        price: 1000,
        variants: [{ size: "M", color: "Red", price: 1000, stock: 10 }],
        images: [],
      })
      .expect(201);

    expect(res.body.data.title).not.toContain("<script>");
    expect(res.body.data.title).toBe("Product");
  });

  it("rejects event handler injections in description", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${sellerToken}`)
      .send({
        title: "Safe Product",
        description: 'Click here <img src=x onerror=alert("xss")>',
        category: "Clothing",
        price: 1000,
        variants: [{ size: "M", color: "Red", price: 1000, stock: 10 }],
        images: [],
      })
      .expect(201);

    expect(res.body.data.description).not.toContain("onerror");
  });
});

// CSRF Protection
describe("CSRF Protection", () => {
  let buyerToken: string;

  beforeAll(async () => {
    const buyer = await User.create({
      email: "csrf-buyer@example.com",
      passwordHash: "$2a$12$abcdefghijklmnopqrstuvwx",
      displayName: "CSRF Buyer",
      role: "buyer",
      status: "active",
      isEmailVerified: true,
      authProviders: ["password"],
    });
    buyerToken = generateAccessToken(buyer);
  });

  it("rejects state-changing requests without CSRF token", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ productId: "507f1f77bcf86cd799439011", quantity: 1 })
      .expect(403);

    expect(res.body.message).toMatch(/csrf/i);
  });
});

// IDOR (Insecure Direct Object Reference)
describe("IDOR Prevention", () => {
  let buyer1Token: string;
  let buyer1Id: string;
  let buyer2Token: string;

  beforeAll(async () => {
    const b1 = await User.create({
      email: "idor-buyer1@example.com",
      passwordHash: "$2a$12$abcdefghijklmnopqrstuvwx",
      displayName: "IDOR Buyer 1",
      role: "buyer",
      status: "active",
      isEmailVerified: true,
      authProviders: ["password"],
    });
    buyer1Token = generateAccessToken(b1);
    buyer1Id = b1._id.toString();

    const b2 = await User.create({
      email: "idor-buyer2@example.com",
      passwordHash: "$2a$12$abcdefghijklmnopqrstuvwx",
      displayName: "IDOR Buyer 2",
      role: "buyer",
      status: "active",
      isEmailVerified: true,
      authProviders: ["password"],
    });
    buyer2Token = generateAccessToken(b2);
  });

  it("denies buyer access to admin user list", async () => {
    const res = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${buyer1Token}`)
      .expect(403);
    expect(res.body.message).toMatch(/permissions/i);
  });

  it("denies buyer access to another buyer orders", async () => {
    const res = await request(app)
      .get(`/api/orders?buyerId=${buyer1Id}`)
      .set("Authorization", `Bearer ${buyer2Token}`);
    expect(res.status).toBeGreaterThanOrEqual(403);
  });
});

// NoSQL Injection
describe("NoSQL Injection Prevention", () => {
  it("rejects $gt injection in login email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: { $gt: "" },
        password: "anything",
        captchaAnswer: "ABC12",
      })
      .expect(400);
  });

  it("rejects object-type injection in product title", async () => {
    const admin = await User.create({
      email: "admin-nosql@example.com",
      passwordHash: "$2a$12$abcdefghijklmnopqrstuvwx",
      displayName: "NoSQL Admin",
      role: "admin",
      status: "active",
      isEmailVerified: true,
      authProviders: ["password"],
      mfaEnabled: true,
    });
    const token = generateAccessToken(admin);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: { $where: "return true" },
        description: "Hack attempt",
        category: "Clothing",
        price: 1000,
        variants: [],
        images: [],
      })
      .expect(400);
    expect(res.body.message).toMatch(/title/i);
  });
});

// Rate Limiting
describe("Rate Limiting", () => {
  it("triggers account lockout after 5 failed login attempts", async () => {
    const email = `ratelimit-${Date.now()}@example.com`;

    await request(app)
      .post("/api/auth/register")
      .send({
        email,
        password: "Str0ng!Passw0rd",
        displayName: "Rate Limit User",
        captchaAnswer: "ABC12",
      });

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email,
          password: "WRONG_PASSWORD",
          captchaAnswer: "ABC12",
        });
      if (i < 4) {
        expect(res.status).toBe(401);
      } else {
        expect(res.status).toBe(429);
        expect(res.body.message).toMatch(/locked/i);
      }
    }
  });
});