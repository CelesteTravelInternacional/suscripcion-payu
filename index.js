import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.API_KEY;
const API_LOGIN = process.env.API_LOGIN;
const ACCOUNT_ID = process.env.ACCOUNT_ID;

app.post("/api/crear-suscripcion", async (req, res) => {
  const { fullName, email, cardNumber, expMonth, expYear } = req.body;

  try {
    const tokenResponse = await fetch("https://api.payulatam.com/payments-api/4.0/service.cgi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: "es",
        command: "CREATE_TOKEN",
        merchant: { apiKey: API_KEY, apiLogin: API_LOGIN },
        creditCardToken: {
          payerId: email,
          name: fullName,
          identificationNumber: "0000000000",
          paymentMethod: "VISA",
          number: cardNumber,
          expirationDate: `${expYear}/${expMonth}`
        }
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.creditCardToken) {
      return res.status(400).json({ error: "Error creando token" });
    }

    const tokenId = tokenData.creditCardToken.creditCardTokenId;

    const subscriptionResponse = await fetch("https://api.payulatam.com/payments-api/rest/v4.9/subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + Buffer.from(`${API_LOGIN}:${API_KEY}`).toString("base64")
      },
      body: JSON.stringify({
        plan: {
          planCode: "CLUB_VIAJEROS_GOLD_SILVER_CTI",
          description: "Suscripción mensual CLUB VIAJEROS GOLD SILVER CTI",
          accountId: ACCOUNT_ID,
          interval: "MONTH",
          intervalCount: 1,
          paymentAttemptsDelay: 1,
          maxPaymentAttempts: 3,
          maxPendingPayments: 1,
          trialDays: 0,
          additionalValues: [
            { name: "PLAN_VALUE", value: "17850", currency: "COP" }
          ]
        },
        customer: {
          fullName,
          email,
          creditCards: [{ token: tokenId, paymentMethod: "VISA" }]
        }
      })
    });

    const subscriptionData = await subscriptionResponse.json();
    res.json(subscriptionData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
